/**
 * utils.js — Core Utility Functions
 * ===================================
 * Pure, stateless helper functions used across the Trading Analyzer.
 * No side-effects; every function is a pure transform or accessor.
 *
 * Task ID: 2-a
 */

import { SIGNAL_DIRECTIONS, TIMEFRAME_MS, TIMEFRAMES } from './types.js';

// ---------------------------------------------------------------------------
// 1. Number Formatting
// ---------------------------------------------------------------------------

/**
 * Format a price with the appropriate number of decimal places.
 * Auto-adjusts decimals for very small prices (< 0.01 → up to 8 decimals).
 *
 * @param {number} price  — The numeric price.
 * @param {number} decimals — Explicit decimal count (default: auto-detect).
 * @returns {string}
 */
export function formatPrice(price, decimals) {
  if (typeof price !== 'number' || !Number.isFinite(price)) return '—';

  if (decimals !== undefined) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  // Auto-detect decimals based on magnitude
  const abs = Math.abs(price);
  if (abs >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (abs >= 1)    return price.toLocaleString('en-US', { maximumFractionDigits: 4 });
  if (abs >= 0.01) return price.toLocaleString('en-US', { maximumFractionDigits: 6 });
  return price.toLocaleString('en-US', { maximumFractionDigits: 8 });
}

/**
 * Format a percentage value with sign and one decimal.
 *
 * @param {number} value — e.g. 5.4321 or -2.1
 * @param {number} [fractionDigits=1]
 * @returns {string} e.g. "+5.43%" or "-2.10%"
 */
export function formatPercent(value, fractionDigits = 1) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—%';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(fractionDigits)}%`;
}

/**
 * Format a large volume number into a human-readable string.
 *
 * @param {number} volume
 * @returns {string} e.g. "1.23M" or "456.78K"
 */
export function formatVolume(volume) {
  if (typeof volume !== 'number' || !Number.isFinite(volume)) return '—';

  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(2)}B`;
  if (volume >= 1_000_000)     return `${(volume / 1_000_000).toFixed(2)}M`;
  if (volume >= 1_000)         return `${(volume / 1_000).toFixed(2)}K`;
  return volume.toFixed(2);
}

// ---------------------------------------------------------------------------
// 2. Date / Time
// ---------------------------------------------------------------------------

/**
 * Format a timestamp (ms) or Date into a locale string.
 *
 * @param {number|Date} timestamp
 * @param {object} [options] — Intl.DateTimeFormat options overrides.
 * @returns {string}
 */
export function formatDate(timestamp, options) {
  const date = timestamp instanceof Date ? timestamp : new Date(Number(timestamp));
  if (isNaN(date.getTime())) return '—';

  const defaults = {
    year:   'numeric',
    month:  'short',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    ...options,
  };

  return date.toLocaleString('en-US', defaults);
}

/**
 * Format only the time portion of a timestamp.
 *
 * @param {number|Date} timestamp
 * @returns {string} e.g. "14:30"
 */
export function formatTime(timestamp) {
  const date = timestamp instanceof Date ? timestamp : new Date(Number(timestamp));
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ---------------------------------------------------------------------------
// 3. ID Generation
// ---------------------------------------------------------------------------

/**
 * Generate a UUID v4 string using crypto.randomUUID (modern browsers)
 * with a Math.random fallback for older environments.
 *
 * @returns {string}
 */
export function generateId() {
  // Modern path — crypto.randomUUID is available in all modern browsers and Node 19+
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback — RFC 4122 v4 compliant UUID from Math.random
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// 4. Function Decorators
// ---------------------------------------------------------------------------

/**
 * Debounce — delay invocation until `ms` milliseconds have elapsed
 * since the last call.
 *
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
export function debounce(fn, ms) {
  let timer = null;
  const debounced = function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

/**
 * Throttle — invoke at most once per `ms` milliseconds.
 * Leading + trailing edge by default.
 *
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
export function throttle(fn, ms) {
  let last = 0;
  let timer = null;

  const throttled = function (...args) {
    const now = Date.now();
    const remaining = ms - (now - last);

    if (remaining <= 0) {
      // Leading edge — call immediately
      last = now;
      fn.apply(this, args);
    } else if (!timer) {
      // Schedule trailing call
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };

  throttled.cancel = () => {
    clearTimeout(timer);
    timer = null;
  };

  return throttled;
}

// ---------------------------------------------------------------------------
// 5. Math Helpers
// ---------------------------------------------------------------------------

/**
 * Clamp a number between min and max (inclusive).
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation.
 * @param {number} a — Start value.
 * @param {number} b — End value.
 * @param {number} t — Factor (0–1).
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

// ---------------------------------------------------------------------------
// 6. Object Helpers
// ---------------------------------------------------------------------------

/**
 * Deep clone via structuredClone when available, else JSON round-trip.
 * Note: JSON round-trip drops functions, Dates, RegExp, etc.
 *
 * @param {*} obj
 * @returns {*}
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;

  // Modern path
  if (typeof structuredClone === 'function') {
    try { return structuredClone(obj); } catch { /* fallthrough */ }
  }

  // Fallback — JSON round-trip (lossy for non-JSON types)
  try { return JSON.parse(JSON.stringify(obj)); } catch { return obj; }
}

/**
 * Deep merge two plain objects. Source properties override target.
 * Arrays are replaced (not concatenated) to keep behaviour predictable.
 *
 * @param {object} target
 * @param {object} source
 * @returns {object} — New object (target is not mutated).
 */
export function deepMerge(target, source) {
  const result = deepClone(target);

  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = result[key];

    if (
      srcVal !== null &&
      typeof srcVal === 'object' &&
      !Array.isArray(srcVal) &&
      tgtVal !== null &&
      typeof tgtVal === 'object' &&
      !Array.isArray(tgtVal)
    ) {
      result[key] = deepMerge(tgtVal, srcVal);
    } else {
      result[key] = deepClone(srcVal);
    }
  }

  return result;
}

/**
 * Safely parse a JSON string, returning the fallback on failure.
 *
 * @param {string} str
 * @param {*} [fallback=null]
 * @returns {*}
 */
export function parseJSONSafe(str, fallback = null) {
  if (typeof str !== 'string') return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// 7. Technical Analysis Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate a simple ATR (Average True Range) from a candle array.
 *
 * @param {Array<{high:number, low:number, close:number}>} candles
 * @param {number} [period=14]
 * @returns {number|null} — ATR value or null if insufficient data.
 */
export function calculateATRSimple(candles, period = 14) {
  if (!Array.isArray(candles) || candles.length < period + 1) return null;

  let atrSum = 0;

  for (let i = period; i < candles.length; i++) {
    const curr = candles[i];
    const prev = candles[i - 1];

    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close),
    );

    atrSum += tr;
  }

  // Average over the last `period` true ranges
  return atrSum / (candles.length - period);
}

// ---------------------------------------------------------------------------
// 8. Symbol & Timeframe Helpers
// ---------------------------------------------------------------------------

/**
 * Derive basic symbol metadata.
 *
 * @param {string} symbol — e.g. "BTCUSDT"
 * @returns {{ base: string, quote: string, type: 'spot'|'perp'|'unknown', label: string }}
 */
export function getSymbolInfo(symbol) {
  if (typeof symbol !== 'string' || symbol.length === 0) {
    return { base: '', quote: '', type: 'unknown', label: '—' };
  }

  const upper = symbol.toUpperCase();
  const isPerp = upper.endsWith('PERP') || upper.endsWith('USDT_PERP');

  let base = '';
  let quote = '';

  if (upper.endsWith('USDT_PERP')) {
    base = upper.replace('USDT_PERP', '');
    quote = 'USDT';
  } else if (upper.endsWith('PERP')) {
    base = upper.replace('PERP', '');
    quote = 'USDT';
  } else if (upper.endsWith('USDT')) {
    base = upper.replace('USDT', '');
    quote = 'USDT';
  } else if (upper.endsWith('BUSD')) {
    base = upper.replace('BUSD', '');
    quote = 'BUSD';
  } else if (upper.endsWith('BTC')) {
    base = upper.replace('BTC', '');
    quote = 'BTC';
  } else if (upper.endsWith('ETH')) {
    base = upper.replace('ETH', '');
    quote = 'ETH';
  } else {
    base = upper;
    quote = '';
  }

  const label = quote ? `${base}/${quote}` : base;

  return {
    base,
    quote,
    type: isPerp ? 'perp' : quote ? 'spot' : 'unknown',
    label,
  };
}

/**
 * Parse a timeframe string into its numeric value and unit.
 *
 * @param {string} tf — e.g. "1h", "4h", "1d"
 * @returns {{ value: number, unit: string, ms: number }|null}
 */
export function parseTimeframe(tf) {
  if (typeof tf !== 'string' || tf.length === 0) return null;

  const match = tf.match(/^(\d+)([mhdw])$/);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const ms = TIMEFRAME_MS[tf] ?? (value * { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 }[unit]);

  return { value, unit, ms };
}

/**
 * Get all timeframes sorted from shortest to longest.
 * @returns {string[]}
 */
export function getTimeframesSorted() {
  return [...TIMEFRAMES].sort((a, b) => (TIMEFRAME_MS[a] ?? 0) - (TIMEFRAME_MS[b] ?? 0));
}

// ---------------------------------------------------------------------------
// 9. UI / Display Helpers
// ---------------------------------------------------------------------------

/**
 * Return a CSS-friendly color string for a signal direction.
 *
 * @param {string} direction — One of SIGNAL_DIRECTIONS values.
 * @returns {string} CSS color value.
 */
export function colorForSignal(direction) {
  switch (direction) {
    case SIGNAL_DIRECTIONS.LONG:     return '#22c55e'; // green-500
    case SIGNAL_DIRECTIONS.SHORT:    return '#ef4444'; // red-500
    case SIGNAL_DIRECTIONS.NO_TRADE: return '#6b7280'; // gray-500
    default:                         return '#6b7280';
  }
}

/**
 * Map a numeric score (0–100) to a human-readable label.
 *
 * @param {number} score
 * @returns {string}
 */
export function scoreToLabel(score) {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'Unknown';

  if (score >= 90) return 'Very Strong';
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Moderate';
  if (score >= 40) return 'Weak';
  if (score >= 20) return 'Very Weak';
  return 'Neutral';
}

/**
 * Map a numeric score (0–100) to a CSS color.
 *
 * @param {number} score
 * @returns {string}
 */
export function colorForScore(score) {
  if (typeof score !== 'number' || !Number.isFinite(score)) return '#6b7280';

  if (score >= 75) return '#22c55e'; // green
  if (score >= 50) return '#eab308'; // yellow
  if (score >= 25) return '#f97316'; // orange
  return '#ef4444'; // red
}

// ---------------------------------------------------------------------------
// 10. Misc Helpers
// ---------------------------------------------------------------------------

/**
 * Capitalise the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
export function capitalize(str) {
  if (typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Check if the runtime is a browser (vs Node/Deno/Worker).
 * @returns {boolean}
 */
export function isBrowser() {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

/**
 * Sleep for a given number of milliseconds (async).
 * Useful for rate-limiting or testing.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
