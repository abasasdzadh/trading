/**
 * Alerts Engine
 * ============
 * Manages price, signal, and indicator-based alerts.
 * Emits 'alert:triggered' events via EventBus when alerts fire.
 *
 * Alert types:
 *   - price:     Triggered when a symbol's price meets a condition
 *   - signal:    Triggered when a signal meets minimum score and direction
 *   - indicator: Triggered when an indicator value meets a condition
 *
 * Conditions:
 *   - gt (greater than), lt (less than)
 *   - crosses_above, crosses_below (previous bar → current bar crossover)
 *
 * Task ID: 2-e
 */

import { generateId } from '../core/utils.js';

// ---------------------------------------------------------------------------
// AlertsEngine
// ---------------------------------------------------------------------------

export class AlertsEngine {
  /**
   * @param {import('../core/storage.js').StorageService} storage
   * @param {import('../core/event-bus.js').EventBus} eventBus
   */
  constructor(storage, eventBus) {
    this.storage  = storage;
    this.eventBus = eventBus;
    this._alerts  = [];
    this._initialised = false;
  }

  // -----------------------------------------------------------------------
  // Initialisation
  // -----------------------------------------------------------------------

  async _ensureInit() {
    if (this._initialised) return;
    this._alerts = (await this.storage.getAlerts()) ?? [];
    this._initialised = true;
  }

  async _persist() {
    await this.storage.setAlerts(this._alerts);
  }

  // -----------------------------------------------------------------------
  // CRUD
  // -----------------------------------------------------------------------

  /**
   * Create a new alert.
   *
   * @param {{
   *   id?: string,
   *   type: 'price'|'signal'|'indicator',
   *   symbol: string,
   *   condition: {
   *     operator: 'gt'|'lt'|'crosses_above'|'crosses_below',
   *     value: number,
   *     direction?: 'long'|'short',
   *     minScore?: number
   *   },
   *   active?: boolean,
   *   notified?: boolean,
   *   createdAt?: number
   * }} alert
   * @returns {Promise<Object>} The created alert
   */
  async createAlert(alert) {
    await this._ensureInit();

    const newAlert = {
      id:        alert.id ?? generateId(),
      type:      alert.type,
      symbol:    alert.symbol,
      condition: alert.condition,
      active:    alert.active !== undefined ? alert.active : true,
      notified:  alert.notified ?? false,
      createdAt: alert.createdAt ?? Date.now(),
      triggeredAt: null,
      message:   '',
    };

    this._alerts.push(newAlert);
    await this._persist();
    return { ...newAlert };
  }

  /**
   * Dismiss (deactivate) an alert.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async dismissAlert(id) {
    await this._ensureInit();

    const alert = this._alerts.find((a) => a.id === id);
    if (!alert) return false;

    alert.active = false;
    await this._persist();
    return true;
  }

  /** @returns {Promise<Object[]>} All active alerts */
  async getActiveAlerts() {
    await this._ensureInit();
    return this._alerts.filter((a) => a.active).map((a) => ({ ...a }));
  }

  /** @returns {Promise<Object[]>} All alerts (active and inactive) */
  async getAllAlerts() {
    await this._ensureInit();
    return this._alerts.map((a) => ({ ...a }));
  }

  // -----------------------------------------------------------------------
  // Alert checking
  // -----------------------------------------------------------------------

  /**
   * Check all active alerts against current market data.
   * Returns an array of triggered alerts and emits 'alert:triggered' for each.
   *
   * @param {{
   *   candles: Record<string, Array>,
   *   signals: Record<string, Object>,
   *   indicators: Record<string, Record<string, {values:any}>>,
   *   prices: Record<string, number>
   * }} currentData
   * @returns {Promise<Object[]>} Triggered alerts
   */
  async checkAlerts(currentData) {
    await this._ensureInit();

    const { candles, signals, indicators, prices } = currentData;
    const triggered = [];

    for (const alert of this._alerts) {
      if (!alert.active || alert.notified) continue;

      let isTriggered = false;
      let message = '';

      switch (alert.type) {
        case 'price':
          ({ isTriggered, message } = this._checkPriceAlert(alert, prices));
          break;
        case 'signal':
          ({ isTriggered, message } = this._checkSignalAlert(alert, signals));
          break;
        case 'indicator':
          ({ isTriggered, message } = this._checkIndicatorAlert(alert, indicators, candles));
          break;
      }

      if (isTriggered) {
        alert.notified    = true;
        alert.triggeredAt = Date.now();
        alert.message     = message;

        const triggeredAlert = { ...alert };
        triggered.push(triggeredAlert);

        // Emit event
        if (this.eventBus) {
          this.eventBus.emit('alert:triggered', triggeredAlert);
        }
      }
    }

    if (triggered.length > 0) {
      await this._persist();
    }

    return triggered;
  }

  // -----------------------------------------------------------------------
  // Private checkers
  // -----------------------------------------------------------------------

  /** @private */
  _checkPriceAlert(alert, prices) {
    const currentPrice = prices?.[alert.symbol];
    if (currentPrice === undefined) return { isTriggered: false, message: '' };

    const { operator, value } = alert.condition;
    let isTriggered = false;
    let message = '';

    if (operator === 'gt' && currentPrice > value) {
      isTriggered = true;
      message = `${alert.symbol} price ($${currentPrice.toFixed(2)}) is above $${value.toFixed(2)}`;
    } else if (operator === 'lt' && currentPrice < value) {
      isTriggered = true;
      message = `${alert.symbol} price ($${currentPrice.toFixed(2)}) is below $${value.toFixed(2)}`;
    } else if (operator === 'crosses_above' && currentPrice > value) {
      isTriggered = true;
      message = `${alert.symbol} price crossed above $${value.toFixed(2)} (now $${currentPrice.toFixed(2)})`;
    } else if (operator === 'crosses_below' && currentPrice < value) {
      isTriggered = true;
      message = `${alert.symbol} price crossed below $${value.toFixed(2)} (now $${currentPrice.toFixed(2)})`;
    }

    return { isTriggered, message };
  }

  /** @private */
  _checkSignalAlert(alert, signals) {
    const signal = signals?.[alert.symbol];
    if (!signal) return { isTriggered: false, message: '' };

    const { direction, minScore } = alert.condition;
    let isTriggered = false;
    let message = '';

    if (direction && signal.direction !== direction) {
      return { isTriggered: false, message: '' };
    }

    const score = signal.score ?? 0;
    const threshold = minScore ?? 0;

    if (score >= threshold && signal.direction !== 'no_trade') {
      isTriggered = true;
      message = `${alert.symbol} ${signal.direction.toUpperCase()} signal (score: ${score}, confidence: ${signal.confidence ?? 'N/A'})`;
    }

    return { isTriggered, message };
  }

  /** @private */
  _checkIndicatorAlert(alert, indicators, candles) {
    // alert.condition should have: {operator, value, indicatorName}
    const { operator, value, indicatorName } = alert.condition;
    if (!indicatorName) return { isTriggered: false, message: '' };

    const symbolIndicators = indicators?.[alert.symbol];
    if (!symbolIndicators) return { isTriggered: false, message: '' };

    const indicatorData = symbolIndicators[indicatorName];
    if (!indicatorData?.values) return { isTriggered: false, message: '' };

    // Get current and previous value
    const vals = indicatorData.values;
    const currentVal = this._lastNonNull(vals);
    const prevVal = this._secondLastNonNull(vals);

    if (currentVal === null) return { isTriggered: false, message: '' };

    let isTriggered = false;
    let message = '';

    if (operator === 'gt' && currentVal > value) {
      isTriggered = true;
      message = `${alert.symbol} ${indicatorName} (${currentVal.toFixed(2)}) is above ${value}`;
    } else if (operator === 'lt' && currentVal < value) {
      isTriggered = true;
      message = `${alert.symbol} ${indicatorName} (${currentVal.toFixed(2)}) is below ${value}`;
    } else if (operator === 'crosses_above' && prevVal !== null && prevVal <= value && currentVal > value) {
      isTriggered = true;
      message = `${alert.symbol} ${indicatorName} crossed above ${value} (${prevVal.toFixed(2)} → ${currentVal.toFixed(2)})`;
    } else if (operator === 'crosses_below' && prevVal !== null && prevVal >= value && currentVal < value) {
      isTriggered = true;
      message = `${alert.symbol} ${indicatorName} crossed below ${value} (${prevVal.toFixed(2)} → ${currentVal.toFixed(2)})`;
    }

    return { isTriggered, message };
  }

  /** Get last non-null value from an array. */
  _lastNonNull(arr) {
    if (!Array.isArray(arr)) return null;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i] !== null && arr[i] !== undefined && Number.isFinite(arr[i])) return arr[i];
    }
    return null;
  }

  /** Get second-to-last non-null value. */
  _secondLastNonNull(arr) {
    if (!Array.isArray(arr)) return null;
    let found = 0;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i] !== null && arr[i] !== undefined && Number.isFinite(arr[i])) {
        found++;
        if (found === 2) return arr[i];
      }
    }
    return null;
  }
}

export default AlertsEngine;
