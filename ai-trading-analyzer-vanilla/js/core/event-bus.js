/**
 * event-bus.js — Pub/Sub Event Bus
 * =================================
 * Lightweight, dependency-free event emitter for decoupled communication
 * across the Trading Analyzer application.
 *
 * Features:
 *  - Named event channels
 *  - Wildcard listeners (`'*'`) receive every event
 *  - `once()` for one-time subscriptions
 *  - Configurable max-listener warning (prevents memory leaks)
 *  - Context binding for callbacks
 *
 * Task ID: 2-a
 */

// ---------------------------------------------------------------------------
// Pre-defined event names used throughout the application.
// Keeping these as constants avoids typos and aids greppability.
// ---------------------------------------------------------------------------
export const BuiltInEvents = Object.freeze({
  /** New or updated candle data arrived. Payload: { symbol, timeframe, candles }. */
  CANDLES_UPDATED:      'candles:updated',
  /** A trading signal was generated. Payload: { signal }. */
  SIGNAL_GENERATED:     'signal:generated',
  /** A trade was executed (live or paper). Payload: { trade }. */
  TRADE_EXECUTED:       'trade:executed',
  /** Application settings changed. Payload: { key, value, old }. */
  SETTINGS_CHANGED:     'settings:changed',
  /** Active market data provider changed. Payload: { providerId, providerType }. */
  PROVIDER_CHANGED:     'provider:changed',
  /** AI provider changed. Payload: { providerId }. */
  AI_PROVIDER_CHANGED:  'ai_provider:changed',
  /** A price alert was triggered. Payload: { alert }. */
  ALERT_TRIGGERED:      'alert:triggered',
  /** Backtest completed. Payload: { results }. */
  BACKTEST_COMPLETED:   'backtest:completed',
  /** Network connection status changed. Payload: { online: boolean }. */
  CONNECTION_CHANGED:   'connection:changed',
  /** Error occurred in a subsystem. Payload: { source, error }. */
  ERROR:                'error',
});

// ---------------------------------------------------------------------------
// EventBus class
// ---------------------------------------------------------------------------
const WILDCARD = '*';

/**
 * Maximum number of listeners per event before a warning is logged.
 * Set to 0 to disable warnings.
 */
const DEFAULT_MAX_LISTENERS = 20;

export class EventBus {
  /**
   * @param {object}  [options]
   * @param {number}  [options.maxListeners=20] — Warn if listeners exceed this count.
   */
  constructor(options = {}) {
    this._listeners = new Map();   // event → Set<{ callback, context, once }>
    this._maxListeners = options.maxListeners ?? DEFAULT_MAX_LISTENERS;
  }

  // -------------------------------------------------------------------------
  // Subscribe
  // -------------------------------------------------------------------------

  /**
   * Register a listener for a named event (or wildcard `'*'`).
   *
   * @param {string}   event    — Event name or `'*'` for all events.
   * @param {Function} callback — `(payload, eventName, ...args) => void`
   * @param {object}   [context] — Optional `this` context for the callback.
   * @returns {Function} Unsubscribe function (convenience).
   */
  on(event, callback, context) {
    if (typeof callback !== 'function') {
      throw new TypeError('EventBus.on() expects a function as the callback.');
    }

    const entry = { callback, context: context ?? null, once: false };
    let set = this._listeners.get(event);
    if (!set) {
      set = new Set();
      this._listeners.set(event, set);
    }
    set.add(entry);

    this._checkMaxListeners(event);
    return () => this.off(event, callback, context);
  }

  /**
   * Register a one-time listener. Automatically removed after first invocation.
   *
   * @param {string}   event
   * @param {Function} callback
   * @param {object}   [context]
   * @returns {Function} Unsubscribe function.
   */
  once(event, callback, context) {
    if (typeof callback !== 'function') {
      throw new TypeError('EventBus.once() expects a function as the callback.');
    }

    const entry = { callback, context: context ?? null, once: true };
    let set = this._listeners.get(event);
    if (!set) {
      set = new Set();
      this._listeners.set(event, set);
    }
    set.add(entry);

    this._checkMaxListeners(event);
    return () => this.off(event, callback, context);
  }

  // -------------------------------------------------------------------------
  // Unsubscribe
  // -------------------------------------------------------------------------

  /**
   * Remove a specific listener.
   *
   * - If `callback` is omitted, ALL listeners for that event are removed.
   * - If both `event` and `callback` are omitted, ALL listeners for ALL events are removed.
   *
   * @param {string}   [event]
   * @param {Function} [callback]
   * @param {object}   [context]
   */
  off(event, callback, context) {
    // Clear everything
    if (event === undefined) {
      this._listeners.clear();
      return;
    }

    const set = this._listeners.get(event);
    if (!set) return;

    // Remove all listeners for this event
    if (callback === undefined) {
      this._listeners.delete(event);
      return;
    }

    // Remove specific listener(s) matching callback (and optionally context)
    for (const entry of set) {
      if (entry.callback === callback) {
        // If context was provided, only remove when context matches too
        if (context !== undefined && entry.context !== context) continue;
        set.delete(entry);
      }
    }

    // Clean up empty set
    if (set.size === 0) {
      this._listeners.delete(event);
    }
  }

  // -------------------------------------------------------------------------
  // Emit
  // -------------------------------------------------------------------------

  /**
   * Emit an event. All matching listeners are invoked synchronously
   * in registration order. Wildcard listeners always run last.
   *
   * @param {string} event — Event name.
   * @param {...*}   args  — Payload forwarded to listeners.
   */
  emit(event, ...args) {
    // 1. Named listeners
    const namedSet = this._listeners.get(event);
    if (namedSet) {
      // Clone to allow mutations during iteration (e.g. `once` removal)
      const entries = [...namedSet];
      for (const entry of entries) {
        if (entry.once) {
          namedSet.delete(entry);
          if (namedSet.size === 0) this._listeners.delete(event);
        }
        try {
          entry.callback.call(entry.context, ...args, event);
        } catch (err) {
          console.error(`[EventBus] Error in listener for "${event}":`, err);
        }
      }
    }

    // 2. Wildcard listeners (only if event is not already wildcard)
    if (event !== WILDCARD) {
      const wildcardSet = this._listeners.get(WILDCARD);
      if (wildcardSet) {
        const entries = [...wildcardSet];
        for (const entry of entries) {
          if (entry.once) {
            wildcardSet.delete(entry);
            if (wildcardSet.size === 0) this._listeners.delete(WILDCARD);
          }
          try {
            entry.callback.call(entry.context, ...args, event);
          } catch (err) {
            console.error(`[EventBus] Error in wildcard listener for "${event}":`, err);
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------

  /**
   * Remove all listeners for all events.
   */
  clear() {
    this._listeners.clear();
  }

  /**
   * Return the number of listeners for a given event (or total).
   *
   * @param {string} [event]
   * @returns {number}
   */
  listenerCount(event) {
    if (event !== undefined) {
      return this._listeners.get(event)?.size ?? 0;
    }
    let total = 0;
    for (const set of this._listeners.values()) {
      total += set.size;
    }
    return total;
  }

  /**
   * Return the list of event names that have at least one listener.
   *
   * @returns {string[]}
   */
  eventNames() {
    return [...this._listeners.keys()];
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  /**
   * Warn if the number of listeners for an event exceeds the configured max.
   *
   * @param {string} event
   * @private
   */
  _checkMaxListeners(event) {
    if (this._maxListeners <= 0) return;
    const count = this._listeners.get(event)?.size ?? 0;
    if (count === this._maxListeners + 1) {
      console.warn(
        `[EventBus] Possible memory leak detected: ${count} listeners registered for "${event}". ` +
        `Max listeners is ${this._maxListeners}. Use eventBus.off() to clean up unused listeners.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton instance for convenience.
// Most modules should import and use this shared instance rather than
// creating their own.  Tests or isolated contexts can create fresh ones.
// ---------------------------------------------------------------------------
export const eventBus = new EventBus();
