/**
 * storage.js — IndexedDB + localStorage Wrapper
 * ===============================================
 * Persistent storage layer for the Trading Analyzer.
 *
 * Storage strategy:
 *  - IndexedDB:   settings, watchlist, alerts, paperTrades, signals
 *  - sessionStorage: credentials (never persisted across sessions)
 *  - localStorage: lightweight flags / version tracking
 *
 * Features:
 *  - Versioned schema for future migration support.
 *  - Export / import of all data (with optional credential exclusion).
 *  - Convenience methods for each domain store.
 *
 * Task ID: 2-a
 */

import { generateId, parseJSONSafe, isBrowser } from './utils.js';
import { eventBus, BuiltInEvents } from './event-bus.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_NAME = 'TradingAnalyzer';
const DB_VERSION = 1;

/** All IndexedDB object-store names. */
const STORE_NAMES = Object.freeze([
  'settings',
  'watchlist',
  'alerts',
  'paperTrades',
  'signals',
  // NOTE: credentials is intentionally NOT an IndexedDB store.
]);

/** Application-level version for migration logic. Stored in localStorage. */
const APP_VERSION_KEY = 'ta_app_version';
const CURRENT_APP_VERSION = 1;

// ---------------------------------------------------------------------------
// StorageService
// ---------------------------------------------------------------------------

export class StorageService {
  constructor() {
    /** @type {IDBDatabase|null} */
    this._db = null;
    /** @type {boolean} */
    this._ready = false;
  }

  // -------------------------------------------------------------------------
  // Initialisation
  // -------------------------------------------------------------------------

  /**
   * Open the IndexedDB database and ensure all stores exist.
   * Must be called once before any other operations.
   *
   * @returns {Promise<void>}
   */
  async init() {
    if (this._ready) return;

    if (!isBrowser()) {
      console.warn('[StorageService] IndexedDB is not available outside the browser.');
      this._ready = true; // graceful degrade — fallback methods use localStorage
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        for (const name of STORE_NAMES) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id' });
          }
        }
      };

      request.onsuccess = (event) => {
        this._db = event.target.result;
        this._ready = true;
        this._performMigrations();
        resolve();
      };

      request.onerror = (event) => {
        console.error('[StorageService] Failed to open IndexedDB:', event.target.error);
        // Degrade to localStorage only
        this._ready = true;
        resolve();
      };

      request.onblocked = () => {
        console.warn('[StorageService] IndexedDB upgrade blocked — close other tabs.');
        resolve();
      };
    });
  }

  // -------------------------------------------------------------------------
  // Generic IndexedDB CRUD
  // -------------------------------------------------------------------------

  /**
   * Get an object store wrapped in a transaction.
   * @param {string}  name
   * @param {'readonly'|'readwrite'} [mode='readonly']
   * @returns {IDBObjectStore}
   * @private
   */
  _getStore(name, mode = 'readonly') {
    if (!this._db) {
      throw new Error('[StorageService] Database not initialised. Call init() first.');
    }
    const tx = this._db.transaction(name, mode);
    return tx.objectStore(name);
  }

  /**
   * Get a single record by ID from an IndexedDB store.
   *
   * @param {string} storeName
   * @param {string} id
   * @returns {Promise<*>}
   */
  async get(storeName, id) {
    return new Promise((resolve, reject) => {
      try {
        const store = this._getStore(storeName);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      } catch {
        // Fallback to localStorage
        resolve(this._localStorageGet(storeName, id));
      }
    });
  }

  /**
   * Get ALL records from an IndexedDB store.
   *
   * @param {string} storeName
   * @returns {Promise<Array>}
   */
  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      try {
        const store = this._getStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result ?? []);
        request.onerror = () => reject(request.error);
      } catch {
        resolve(this._localStorageGetAll(storeName));
      }
    });
  }

  /**
   * Put (upsert) a record into an IndexedDB store.
   *
   * @param {string} storeName
   * @param {object} record — Must have an `id` property.
   * @returns {Promise<void>}
   */
  async set(storeName, record) {
    return new Promise((resolve, reject) => {
      try {
        const store = this._getStore(storeName, 'readwrite');
        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch {
        this._localStorageSet(storeName, record);
        resolve();
      }
    });
  }

  /**
   * Delete a record by ID from an IndexedDB store.
   *
   * @param {string} storeName
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(storeName, id) {
    return new Promise((resolve, reject) => {
      try {
        const store = this._getStore(storeName, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch {
        this._localStorageDelete(storeName, id);
        resolve();
      }
    });
  }

  /**
   * Clear all records from an IndexedDB store.
   *
   * @param {string} storeName
   * @returns {Promise<void>}
   */
  async clearStore(storeName) {
    return new Promise((resolve, reject) => {
      try {
        const store = this._getStore(storeName, 'readwrite');
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch {
        this._localStorageClear(storeName);
        resolve();
      }
    });
  }

  // -------------------------------------------------------------------------
  // Settings (key-value convenience)
  // -------------------------------------------------------------------------

  /**
   * Get a single settings value.
   *
   * @param {string} key
   * @param {*}      [defaultValue=null]
   * @returns {Promise<*>}
   */
  async getSetting(key, defaultValue = null) {
    const record = await this.get('settings', key);
    return record !== null ? record.value : defaultValue;
  }

  /**
   * Set a single settings value and emit a settings:changed event.
   *
   * @param {string} key
   * @param {*}      value
   * @returns {Promise<void>}
   */
  async setSetting(key, value) {
    const old = await this.getSetting(key);
    await this.set('settings', { id: key, value });
    eventBus.emit(BuiltInEvents.SETTINGS_CHANGED, { key, value, old });
  }

  /**
   * Get all settings as a plain object.
   *
   * @returns {Promise<Object>}
   */
  async getAllSettings() {
    const records = await this.getAll('settings');
    /** @type {Object} */
    const settings = {};
    for (const r of records) {
      settings[r.id] = r.value;
    }
    return settings;
  }

  // -------------------------------------------------------------------------
  // Watchlist
  // -------------------------------------------------------------------------

  /**
   * @returns {Promise<string[]>} Array of symbols.
   */
  async getWatchlist() {
    const records = await this.getAll('watchlist');
    return records.map((r) => r.symbol);
  }

  /**
   * Add a symbol to the watchlist (idempotent).
   *
   * @param {string} symbol
   * @returns {Promise<void>}
   */
  async addToWatchlist(symbol) {
    const id = `watch_${symbol.toUpperCase()}`;
    await this.set('watchlist', { id, symbol: symbol.toUpperCase() });
    eventBus.emit('watchlist:changed', { symbol, action: 'add' });
  }

  /**
   * Remove a symbol from the watchlist.
   *
   * @param {string} symbol
   * @returns {Promise<void>}
   */
  async removeFromWatchlist(symbol) {
    const id = `watch_${symbol.toUpperCase()}`;
    await this.delete('watchlist', id);
    eventBus.emit('watchlist:changed', { symbol, action: 'remove' });
  }

  // -------------------------------------------------------------------------
  // Alerts
  // -------------------------------------------------------------------------

  /**
   * @returns {Promise<Array>} Array of alert objects.
   */
  async getAlerts() {
    return this.getAll('alerts');
  }

  /**
   * Save an alert (insert or update).
   * Ensures the alert has an `id`.
   *
   * @param {object} alert
   * @returns {Promise<string>} The alert ID.
   */
  async saveAlert(alert) {
    const id = alert.id || generateId();
    const record = { ...alert, id };
    await this.set('alerts', record);
    return id;
  }

  /**
   * Delete an alert by ID.
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  async deleteAlert(id) {
    await this.delete('alerts', id);
  }

  // -------------------------------------------------------------------------
  // Paper Trades
  // -------------------------------------------------------------------------

  /**
   * @returns {Promise<Array>}
   */
  async getPaperTrades() {
    return this.getAll('paperTrades');
  }

  /**
   * Save a paper trade (insert or update).
   *
   * @param {object} trade
   * @returns {Promise<string>} The trade ID.
   */
  async savePaperTrade(trade) {
    const id = trade.id || generateId();
    const record = { ...trade, id, updatedAt: Date.now() };
    await this.set('paperTrades', record);
    return id;
  }

  /**
   * Delete a paper trade by ID.
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  async deletePaperTrade(id) {
    await this.delete('paperTrades', id);
  }

  // -------------------------------------------------------------------------
  // Saved Signals
  // -------------------------------------------------------------------------

  /**
   * @returns {Promise<Array>}
   */
  async getSavedSignals() {
    return this.getAll('signals');
  }

  /**
   * Save a signal (insert or update).
   *
   * @param {object} signal
   * @returns {Promise<string>} The signal ID.
   */
  async saveSignal(signal) {
    const id = signal.id || generateId();
    const record = { ...signal, id };
    await this.set('signals', record);
    return id;
  }

  /**
   * Delete a saved signal by ID.
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  async deleteSignal(id) {
    await this.delete('signals', id);
  }

  /**
   * Clear all saved signals.
   *
   * @returns {Promise<void>}
   */
  async clearSignals() {
    await this.clearStore('signals');
  }

  // -------------------------------------------------------------------------
  // Credentials (sessionStorage only — never persisted)
  // -------------------------------------------------------------------------

  /**
   * Get a stored credential value.
   * Credentials live in sessionStorage so they are discarded when the tab closes.
   *
   * @param {string} providerId — e.g. "binance", "gemini"
   * @returns {{ apiKey: string, apiSecret?: string, baseUrl?: string }|null}
   */
  getCredentials(providerId) {
    if (!isBrowser()) return null;
    const raw = sessionStorage.getItem(`ta_cred_${providerId}`);
    return parseJSONSafe(raw, null);
  }

  /**
   * Store credentials in sessionStorage.
   *
   * @param {string} providerId
   * @param {{ apiKey: string, apiSecret?: string, baseUrl?: string }} data
   */
  setCredentials(providerId, data) {
    if (!isBrowser()) return;
    sessionStorage.setItem(`ta_cred_${providerId}`, JSON.stringify(data));
  }

  /**
   * Remove credentials for a provider from sessionStorage.
   *
   * @param {string} providerId
   */
  removeCredentials(providerId) {
    if (!isBrowser()) return;
    sessionStorage.removeItem(`ta_cred_${providerId}`);
  }

  /**
   * Clear ALL stored credentials.
   */
  clearAllCredentials() {
    if (!isBrowser()) return;
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('ta_cred_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k));
  }

  // -------------------------------------------------------------------------
  // Export / Import
  // -------------------------------------------------------------------------

  /**
   * Export all persisted data as a JSON-serialisable object.
   * Credentials are always excluded for security.
   *
   * @param {boolean} [excludeCredentials=true]
   * @returns {Promise<object>}
   */
  async exportData(excludeCredentials = true) {
    const data = {
      _version: CURRENT_APP_VERSION,
      _exportedAt: new Date().toISOString(),
      settings: await this.getAllSettings(),
      watchlist: await this.getWatchlist(),
      alerts: await this.getAlerts(),
      paperTrades: await this.getPaperTrades(),
      signals: await this.getSavedSignals(),
    };

    // Credentials are stored in sessionStorage and never exported
    if (!excludeCredentials && isBrowser()) {
      const credentials = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('ta_cred_')) {
          const providerId = key.replace('ta_cred_', '');
          credentials[providerId] = parseJSONSafe(sessionStorage.getItem(key));
        }
      }
      data.credentials = credentials;
    }

    return data;
  }

  /**
   * Import data from a JSON object (e.g. from exportData).
   * Existing data is merged; duplicate IDs are overwritten.
   *
   * @param {object} data — The exported data object.
   * @returns {Promise<{ imported: number, skipped: number }>}
   */
  async importData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('[StorageService] importData() requires a valid data object.');
    }

    let imported = 0;
    let skipped = 0;

    // Settings
    if (data.settings && typeof data.settings === 'object') {
      for (const [key, value] of Object.entries(data.settings)) {
        try {
          await this.setSetting(key, value);
          imported++;
        } catch { skipped++; }
      }
    }

    // Watchlist
    if (Array.isArray(data.watchlist)) {
      for (const symbol of data.watchlist) {
        try {
          await this.addToWatchlist(String(symbol));
          imported++;
        } catch { skipped++; }
      }
    }

    // Alerts
    if (Array.isArray(data.alerts)) {
      for (const alert of data.alerts) {
        try {
          await this.saveAlert(alert);
          imported++;
        } catch { skipped++; }
      }
    }

    // Paper Trades
    if (Array.isArray(data.paperTrades)) {
      for (const trade of data.paperTrades) {
        try {
          await this.savePaperTrade(trade);
          imported++;
        } catch { skipped++; }
      }
    }

    // Signals
    if (Array.isArray(data.signals)) {
      for (const signal of data.signals) {
        try {
          await this.saveSignal(signal);
          imported++;
        } catch { skipped++; }
      }
    }

    // Credentials — import into sessionStorage only
    if (data.credentials && typeof data.credentials === 'object') {
      for (const [providerId, cred] of Object.entries(data.credentials)) {
        try {
          this.setCredentials(providerId, cred);
          imported++;
        } catch { skipped++; }
      }
    }

    // Update version
    localStorage.setItem(APP_VERSION_KEY, String(CURRENT_APP_VERSION));

    return { imported, skipped };
  }

  // -------------------------------------------------------------------------
  // Migration
  // -------------------------------------------------------------------------

  /**
   * Perform any data migrations based on the stored version.
   * Called once during init().
   * @private
   */
  _performMigrations() {
    const storedVersion = parseInt(localStorage.getItem(APP_VERSION_KEY) || '0', 10);
    if (storedVersion < CURRENT_APP_VERSION) {
      // Future migration logic goes here:
      // if (storedVersion < 2) { migrateV1toV2(); }
      localStorage.setItem(APP_VERSION_KEY, String(CURRENT_APP_VERSION));
    }
  }

  // -------------------------------------------------------------------------
  // localStorage Fallbacks (used when IndexedDB is unavailable)
  // -------------------------------------------------------------------------

  /** @private */
  _localStorageGet(storeName, id) {
    if (!isBrowser()) return null;
    const key = `ta_${storeName}_${id}`;
    return parseJSONSafe(localStorage.getItem(key), null);
  }

  /** @private */
  _localStorageGetAll(storeName) {
    if (!isBrowser()) return [];
    const results = [];
    const prefix = `ta_${storeName}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const parsed = parseJSONSafe(localStorage.getItem(key));
        if (parsed) results.push(parsed);
      }
    }
    return results;
  }

  /** @private */
  _localStorageSet(storeName, record) {
    if (!isBrowser()) return;
    const key = `ta_${storeName}_${record.id}`;
    localStorage.setItem(key, JSON.stringify(record));
  }

  /** @private */
  _localStorageDelete(storeName, id) {
    if (!isBrowser()) return;
    localStorage.removeItem(`ta_${storeName}_${id}`);
  }

  /** @private */
  _localStorageClear(storeName) {
    if (!isBrowser()) return;
    const prefix = `ta_${storeName}_`;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) keysToRemove.push(key);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------
export const storageService = new StorageService();
