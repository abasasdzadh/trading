/**
 * Signal Scoring Configuration
 * =============================
 * Weights for each scoring category, thresholds, and conflict settings.
 * Weights must sum to 100.
 *
 * Task ID: 2-e
 */

export const SIGNAL_CONFIG = Object.freeze({
  /** Scoring weights per category. Must sum to 100. */
  weights: {
    trend:        25,
    momentum:     20,
    volume:       15,
    structure:    15,
    priceAction:  15,
    volatility:   10,
  },

  /** Minimum composite score to generate a signal. */
  minScoreForSignal: 40,

  /** Score thresholds for signal quality labels. */
  thresholds: {
    weak:    40,
    moderate: 60,
    strong:  75,
    veryStrong: 90,
  },

  /** Points deducted per detected conflict between categories. */
  conflictPenalty: 5,

  /** Maximum conflicts allowed before signal is suppressed. */
  maxConflicts: 3,

  /** Minimum number of categories agreeing on direction for high confidence. */
  minAgreement: 4,
});

export default SIGNAL_CONFIG;
