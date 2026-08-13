/**
 * Default Strategy Configurations
 * ===============================
 * Default configs for all 7 built-in strategies.
 * Each entry has `enabled` flag plus strategy-specific parameters.
 *
 * Task ID: 2-e
 */

export const DEFAULT_STRATEGY_CONFIGS = Object.freeze({
  ema_trend: {
    enabled: true,
    config: {
      fastPeriod:    20,
      mediumPeriod:  50,
      slowPeriod:    200,
      minScore:      30,
    },
  },

  rsi_pullback: {
    enabled: true,
    config: {
      rsiPeriod:          14,
      oversoldThreshold:  30,
      overboughtThreshold: 70,
      trendEmaPeriod:     200,
      minScore:           30,
    },
  },

  macd_momentum: {
    enabled: true,
    config: {
      fastPeriod:    12,
      slowPeriod:    26,
      signalPeriod:  9,
      histExpansion: 3,
      minScore:      30,
    },
  },

  breakout_retest: {
    enabled: true,
    config: {
      bbPeriod:       20,
      bbStdDev:       2,
      donchianPeriod: 20,
      lookback:       50,
      retestThreshold: 0.5,
      minScore:       30,
    },
  },

  vwap_volume: {
    enabled: false,
    config: {
      obvSmaPeriod:      20,
      volumeSpikeMult:   2,
      volumeLowMult:     0.5,
      vwapslopePeriods:   5,
      minScore:          30,
    },
  },

  market_structure: {
    enabled: true,
    config: {
      swingLookback:  5,
      minSwingSize:   0.001,
      requireCHoCH:   false,
      minScore:       30,
    },
  },

  bollinger_squeeze: {
    enabled: true,
    config: {
      bbPeriod:       20,
      bbStdDev:       2,
      keltnerEma:     20,
      keltnerAtr:     10,
      keltnerMult:    1.5,
      minSqueezeBars: 5,
      minScore:       30,
    },
  },
});

export default DEFAULT_STRATEGY_CONFIGS;
