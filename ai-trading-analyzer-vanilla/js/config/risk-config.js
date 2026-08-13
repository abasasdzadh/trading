/**
 * Default Risk Management Configuration
 * ======================================
 * Controls position sizing, stop-loss placement, and take-profit levels.
 *
 * Task ID: 2-e
 */

export const RISK_CONFIG = Object.freeze({
  /** Default percent of account to risk per trade. */
  defaultRiskPercent: 1,

  /** Default stop-loss method: 'atr' | 'fixed' | 'swing' | 'support_resistance'. */
  defaultSLMethod: 'atr',

  /** ATR period for stop-loss calculation. */
  defaultATRPeriod: 14,

  /** ATR multiplier for stop-loss distance. */
  defaultATRMultiplier: 1.5,

  /** Fixed stop-loss percent (used when defaultSLMethod = 'fixed'). */
  fixedStopPercent: 2,

  /** Risk:Reward ratios for 3 take-profit tiers. */
  rr1: 1,
  rr2: 2,
  rr3: 3,

  /** Maximum position size as fraction of account (0.1 = 10%). */
  maxPositionSize: 0.1,

  /** Minimum R:R ratio to accept a trade. */
  minRiskReward: 1,

  /** Maximum stop distance as percent of price. */
  maxStopPercent: 10,

  /** Minimum stop distance as percent of price. */
  minStopPercent: 0.1,
});

export default RISK_CONFIG;
