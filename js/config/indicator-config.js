/**
 * Default Indicator Configurations
 * ================================
 * Canonical default config for all 22+ indicators.
 * Each entry has `enabled: true` plus the indicator's parameters.
 *
 * Task ID: 2-e
 */

export const DEFAULT_INDICATOR_CONFIGS = Object.freeze({
  // -- Trend --
  ema: {
    enabled: true,
    period: 20,
  },
  sma: {
    enabled: true,
    period: 20,
  },
  adx: {
    enabled: true,
    period: 14,
  },
  ichimoku: {
    enabled: false,
    tenkanPeriod: 9,
    kijunPeriod: 26,
    senkouBPeriod: 52,
    displacement: 26,
  },
  supertrend: {
    enabled: true,
    period: 10,
    multiplier: 3,
  },
  parabolicSar: {
    enabled: false,
    step: 0.02,
    maxStep: 0.2,
  },

  // -- Momentum --
  rsi: {
    enabled: true,
    period: 14,
  },
  macd: {
    enabled: true,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
  },
  stochastic: {
    enabled: true,
    kPeriod: 14,
    dPeriod: 3,
    smooth: 3,
  },
  cci: {
    enabled: false,
    period: 20,
  },
  williamsR: {
    enabled: false,
    period: 14,
  },
  mfi: {
    enabled: false,
    period: 14,
  },

  // -- Volatility --
  atr: {
    enabled: true,
    period: 14,
  },
  bollinger: {
    enabled: true,
    period: 20,
    stdDev: 2,
  },
  keltner: {
    enabled: false,
    emaPeriod: 20,
    atrPeriod: 10,
    multiplier: 1.5,
  },
  donchian: {
    enabled: false,
    period: 20,
  },

  // -- Volume --
  vwap: {
    enabled: true,
  },
  obv: {
    enabled: true,
  },

  // -- Structure --
  pivotPoints: {
    enabled: false,
  },
  fibonacci: {
    enabled: false,
  },
  marketStructure: {
    enabled: true,
    swingLookback: 5,
    minSwingSize: 0.001,
  },
  patterns: {
    enabled: true,
  },
  supportResistance: {
    enabled: false,
    lookback: 100,
    touchThreshold: 0.001,
    minTouches: 2,
  },
});

export default DEFAULT_INDICATOR_CONFIGS;
