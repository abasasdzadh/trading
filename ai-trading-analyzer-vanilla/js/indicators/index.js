/**
 * Indicator Registry
 * Central registry for all technical indicators.
 * Provides:
 *   INDICATOR_REGISTRY — map of name → {name, label, category, defaultConfig, compute}
 *   CATEGORY_MAP — grouped indicator names by category
 *   computeIndicator(kind, candles, config) — compute a single indicator
 *   computeAllIndicators(candles, configs?) — compute all registered indicators
 */

import ema from './ema.js';
import sma from './sma.js';
import rsi from './rsi.js';
import macd from './macd.js';
import atr from './atr.js';
import bollinger from './bollinger.js';
import stochastic from './stochastic.js';
import cci from './cci.js';
import adx from './adx.js';
import vwap from './vwap.js';
import obv from './obv.js';
import mfi from './mfi.js';
import ichimoku from './ichimoku.js';
import pivotPoints from './pivot-points.js';
import fibonacci from './fibonacci.js';
import williamsR from './williams-r.js';
import supertrend from './supertrend.js';
import keltner from './keltner.js';
import donchian from './donchian.js';
import parabolicSar from './parabolic-sar.js';
import marketStructure from './market-structure.js';
import patterns from './patterns.js';
import supportResistance from './support-resistance.js';

/**
 * @typedef {Object} IndicatorDef
 * @property {string} name
 * @property {string} label
 * @property {string} category
 * @property {Record<string, any>} defaultConfig
 * @property {function} compute
 */

/**
 * Full registry of every indicator. Each entry maps a canonical name
 * to its definition (label, category, default config, compute fn).
 * @type {Record<string, IndicatorDef>}
 */
export const INDICATOR_REGISTRY = {
  ema: {
    name: 'ema',
    label: 'EMA',
    category: 'trend',
    defaultConfig: { period: 20 },
    compute: ema,
  },
  sma: {
    name: 'sma',
    label: 'SMA',
    category: 'trend',
    defaultConfig: { period: 20 },
    compute: sma,
  },
  rsi: {
    name: 'rsi',
    label: 'RSI',
    category: 'momentum',
    defaultConfig: { period: 14 },
    compute: rsi,
  },
  macd: {
    name: 'macd',
    label: 'MACD',
    category: 'momentum',
    defaultConfig: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    compute: macd,
  },
  atr: {
    name: 'atr',
    label: 'ATR',
    category: 'volatility',
    defaultConfig: { period: 14 },
    compute: atr,
  },
  bollinger: {
    name: 'bollinger',
    label: 'Bollinger Bands',
    category: 'volatility',
    defaultConfig: { period: 20, stdDev: 2 },
    compute: bollinger,
  },
  stochastic: {
    name: 'stochastic',
    label: 'Stochastic',
    category: 'momentum',
    defaultConfig: { kPeriod: 14, dPeriod: 3, smooth: 3 },
    compute: stochastic,
  },
  cci: {
    name: 'cci',
    label: 'CCI',
    category: 'momentum',
    defaultConfig: { period: 20 },
    compute: cci,
  },
  adx: {
    name: 'adx',
    label: 'ADX',
    category: 'trend',
    defaultConfig: { period: 14 },
    compute: adx,
  },
  vwap: {
    name: 'vwap',
    label: 'VWAP',
    category: 'volume',
    defaultConfig: {},
    compute: vwap,
  },
  obv: {
    name: 'obv',
    label: 'OBV',
    category: 'volume',
    defaultConfig: {},
    compute: obv,
  },
  mfi: {
    name: 'mfi',
    label: 'MFI',
    category: 'volume',
    defaultConfig: { period: 14 },
    compute: mfi,
  },
  ichimoku: {
    name: 'ichimoku',
    label: 'Ichimoku Cloud',
    category: 'trend',
    defaultConfig: { tenkanPeriod: 9, kijunPeriod: 26, senkouBPeriod: 52, displacement: 26 },
    compute: ichimoku,
  },
  pivotPoints: {
    name: 'pivotPoints',
    label: 'Pivot Points',
    category: 'structure',
    defaultConfig: {},
    compute: pivotPoints,
  },
  fibonacci: {
    name: 'fibonacci',
    label: 'Fibonacci Retracement',
    category: 'structure',
    defaultConfig: {},
    compute: fibonacci,
  },
  williamsR: {
    name: 'williamsR',
    label: 'Williams %R',
    category: 'momentum',
    defaultConfig: { period: 14 },
    compute: williamsR,
  },
  supertrend: {
    name: 'supertrend',
    label: 'SuperTrend',
    category: 'trend',
    defaultConfig: { period: 10, multiplier: 3 },
    compute: supertrend,
  },
  keltner: {
    name: 'keltner',
    label: 'Keltner Channel',
    category: 'volatility',
    defaultConfig: { emaPeriod: 20, atrPeriod: 10, multiplier: 1.5 },
    compute: keltner,
  },
  donchian: {
    name: 'donchian',
    label: 'Donchian Channel',
    category: 'volatility',
    defaultConfig: { period: 20 },
    compute: donchian,
  },
  parabolicSar: {
    name: 'parabolicSar',
    label: 'Parabolic SAR',
    category: 'trend',
    defaultConfig: { step: 0.02, maxStep: 0.2 },
    compute: parabolicSar,
  },
  marketStructure: {
    name: 'marketStructure',
    label: 'Market Structure',
    category: 'structure',
    defaultConfig: { swingLookback: 5, minSwingSize: 0.001 },
    compute: marketStructure,
  },
  patterns: {
    name: 'patterns',
    label: 'Candlestick & Chart Patterns',
    category: 'structure',
    defaultConfig: {},
    compute: patterns,
  },
  supportResistance: {
    name: 'supportResistance',
    label: 'Support / Resistance',
    category: 'structure',
    defaultConfig: { lookback: 100, touchThreshold: 0.001, minTouches: 2 },
    compute: supportResistance,
  },
};

/**
 * Indicator names grouped by category.
 * @type {Record<string, string[]>}
 */
export const CATEGORY_MAP = {
  trend: ['ema', 'sma', 'adx', 'ichimoku', 'supertrend', 'parabolicSar'],
  momentum: ['rsi', 'macd', 'stochastic', 'cci', 'williamsR'],
  volatility: ['atr', 'bollinger', 'keltner', 'donchian'],
  volume: ['vwap', 'obv', 'mfi'],
  structure: ['pivotPoints', 'fibonacci', 'marketStructure', 'patterns', 'supportResistance'],
};

/**
 * Compute a single indicator by name.
 *
 * @param {string} kind — indicator name (key in INDICATOR_REGISTRY)
 * @param {Array<{time:number,open:number,high:number,low:number,close:number,volume:number}>} candles
 * @param {Record<string,any>} [config] — overrides for default config
 * @returns {{values: any, metadata: any}}
 * @throws {Error} if indicator name is not found
 */
export function computeIndicator(kind, candles, config = {}) {
  const def = INDICATOR_REGISTRY[kind];
  if (!def) {
    throw new Error(`Unknown indicator: "${kind}". Available: ${Object.keys(INDICATOR_REGISTRY).join(', ')}`);
  }
  const mergedConfig = { ...def.defaultConfig, ...config };
  return def.compute(candles, mergedConfig);
}

/**
 * Compute all registered indicators.
 *
 * @param {Array<{time:number,open:number,high:number,low:number,close:number,volume:number}>} candles
 * @param {Record<string, Record<string,any>>} [configs] — optional per-indicator config overrides
 * @returns {Record<string, {values: any, metadata: any}>}
 */
export function computeAllIndicators(candles, configs = {}) {
  const results = {};
  for (const name of Object.keys(INDICATOR_REGISTRY)) {
    const indicatorConfig = configs[name] || {};
    try {
      results[name] = computeIndicator(name, candles, indicatorConfig);
    } catch (err) {
      // If computation fails, store the error for debugging
      results[name] = { values: null, metadata: { error: err.message } };
    }
  }
  return results;
}

export default {
  INDICATOR_REGISTRY,
  CATEGORY_MAP,
  computeIndicator,
  computeAllIndicators,
};
