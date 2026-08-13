/**
 * Risk Engine
 * ===========
 * Position sizing, stop-loss placement, take-profit calculation,
 * and trade validation utilities.
 *
 * Exports:
 *   calculatePositionSize(accountSize, riskPercent, entryPrice, stopLossPrice)
 *   calculateStopLoss(method, candles, side, config)
 *   calculateTakeProfits(entryPrice, stopLossPrice, side, config)
 *   calculateRiskRewardRatio(entryPrice, stopLoss, takeProfit)
 *   validateTrade(entryPrice, stopLoss, takeProfit, direction)
 *
 * Task ID: 2-c
 */

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------

export const DEFAULT_RISK_CONFIG = Object.freeze({
  atrPeriod:        14,
  atrMultiplier:    1.5,
  fixedStopPercent: 2,
  rr1:              1,
  rr2:              2,
  rr3:              3,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute ATR (Wilder's smoothing). */
function computeATR(candles, period) {
  const n = candles.length;
  if (n < 2) return null;

  const tr = [candles[0].high - candles[0].low];
  for (let i = 1; i < n; i++) {
    tr.push(
      Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      )
    );
  }

  if (n < period + 1) return null;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += tr[i];
  let prev = sum / period;

  for (let i = period + 1; i < n; i++) {
    prev = (prev * (period - 1) + tr[i]) / period;
  }

  return prev;
}

// ---------------------------------------------------------------------------
// Position sizing
// ---------------------------------------------------------------------------

/**
 * Calculate position size based on account risk parameters.
 *
 * @param {number} accountSize — Total account equity (e.g. 10000)
 * @param {number} riskPercent — Max risk per trade as percentage (e.g. 1 = 1%)
 * @param {number} entryPrice — Entry price per unit
 * @param {number} stopLossPrice — Stop loss price per unit
 * @returns {{quantity:number, riskAmount:number, positionValue:number}}
 */
export function calculatePositionSize(accountSize, riskPercent, entryPrice, stopLossPrice) {
  if (accountSize <= 0) throw new Error('accountSize must be positive.');
  if (riskPercent <= 0 || riskPercent > 100) throw new Error('riskPercent must be between 0 and 100.');
  if (entryPrice <= 0) throw new Error('entryPrice must be positive.');
  if (stopLossPrice <= 0) throw new Error('stopLossPrice must be positive.');

  const riskAmount = accountSize * (riskPercent / 100);
  const riskPerUnit = Math.abs(entryPrice - stopLossPrice);

  if (riskPerUnit === 0) {
    return { quantity: 0, riskAmount: 0, positionValue: 0 };
  }

  const quantity = riskAmount / riskPerUnit;
  const positionValue = quantity * entryPrice;

  return {
    quantity: Math.floor(quantity * 1e8) / 1e8, // 8 decimal precision
    riskAmount: Math.floor(riskAmount * 1e8) / 1e8,
    positionValue: Math.floor(positionValue * 1e8) / 1e8,
  };
}

// ---------------------------------------------------------------------------
// Stop-loss calculation
// ---------------------------------------------------------------------------

/**
 * Calculate stop-loss price using the specified method.
 *
 * @param {'atr'|'fixed'|'swing'|'support_resistance'} method
 * @param {Array} candles — OHLCV candles
 * @param {'long'|'short'} side
 * @param {Record<string,any>} [config] — Overrides for DEFAULT_RISK_CONFIG
 * @returns {{price:number, method:string, reason:string}}
 */
export function calculateStopLoss(method, candles, side, config = {}) {
  const cfg = { ...DEFAULT_RISK_CONFIG, ...config };
  const n = candles.length;

  if (n < 2) {
    throw new Error('Need at least 2 candles to calculate stop loss.');
  }

  const lastCandle = candles[n - 1];

  switch (method) {
    case 'atr':
      return calculateATRStopLoss(candles, side, cfg);
    case 'fixed':
      return calculateFixedStopLoss(lastCandle, side, cfg);
    case 'swing':
      return calculateSwingStopLoss(candles, side);
    case 'support_resistance':
      return calculateSRStopLoss(candles, side);
    default:
      throw new Error(`Unknown stop-loss method: "${method}". Use 'atr', 'fixed', 'swing', or 'support_resistance'.`);
  }
}

/** ATR-based stop loss. */
function calculateATRStopLoss(candles, side, cfg) {
  const atr = computeATR(candles, cfg.atrPeriod);
  if (atr === null) {
    throw new Error(`Not enough data for ATR(${cfg.atrPeriod}).`);
  }

  const last = candles[candles.length - 1];
  const offset = atr * cfg.atrMultiplier;

  if (side === 'long') {
    return {
      price: Math.floor((last.close - offset) * 1e8) / 1e8,
      method: 'atr',
      reason: `ATR(${cfg.atrPeriod})=${atr.toFixed(4)}, ${cfg.atrMultiplier}x below close = ${offset.toFixed(4)}`,
    };
  } else {
    return {
      price: Math.floor((last.close + offset) * 1e8) / 1e8,
      method: 'atr',
      reason: `ATR(${cfg.atrPeriod})=${atr.toFixed(4)}, ${cfg.atrMultiplier}x above close = ${offset.toFixed(4)}`,
    };
  }
}

/** Fixed percentage stop loss. */
function calculateFixedStopLoss(lastCandle, side, cfg) {
  const offset = lastCandle.close * (cfg.fixedStopPercent / 100);

  if (side === 'long') {
    return {
      price: Math.floor((lastCandle.close - offset) * 1e8) / 1e8,
      method: 'fixed',
      reason: `${cfg.fixedStopPercent}% below close`,
    };
  } else {
    return {
      price: Math.floor((lastCandle.close + offset) * 1e8) / 1e8,
      method: 'fixed',
      reason: `${cfg.fixedStopPercent}% above close`,
    };
  }
}

/** Swing-based stop loss (below recent swing low for long, above swing high for short). */
function calculateSwingStopLoss(candles, side) {
  const lookback = Math.min(20, candles.length - 1);
  const recent = candles.slice(-lookback);

  if (side === 'long') {
    // Stop below the lowest low in the lookback window
    const swingLow = Math.min(...recent.map((c) => c.low));
    return {
      price: swingLow,
      method: 'swing',
      reason: `Below swing low (${swingLow.toFixed(2)}) in last ${lookback} bars`,
    };
  } else {
    // Stop above the highest high in the lookback window
    const swingHigh = Math.max(...recent.map((c) => c.high));
    return {
      price: swingHigh,
      method: 'swing',
      reason: `Above swing high (${swingHigh.toFixed(2)}) in last ${lookback} bars`,
    };
  }
}

/** Support/Resistance-based stop loss.
 * For longs: stop below nearest support zone.
 * For shorts: stop above nearest resistance zone.
 * Uses a simplified zone detection (price clustering).
 */
function calculateSRStopLoss(candles, side) {
  const lookback = Math.min(100, candles.length);
  const recent = candles.slice(-lookback);
  const price = recent[recent.length - 1].close;
  const threshold = price * 0.002; // 0.2% clustering threshold

  // Collect all high and low levels
  const levels = [];
  for (const c of recent) {
    levels.push(c.high);
    levels.push(c.low);
  }
  levels.sort((a, b) => a - b);

  // Cluster levels into zones
  const zones = [];
  for (const level of levels) {
    let merged = false;
    for (const zone of zones) {
      if (Math.abs(level - zone.level) <= threshold) {
        zone.level = (zone.level * zone.touches + level) / (zone.touches + 1);
        zone.touches++;
        merged = true;
        break;
      }
    }
    if (!merged) {
      zones.push({ level, touches: 1 });
    }
  }

  // Filter zones with at least 2 touches
  const validZones = zones.filter((z) => z.touches >= 2);

  if (validZones.length === 0) {
    // Fallback to swing method
    return calculateSwingStopLoss(candles, side);
  }

  if (side === 'long') {
    // Find nearest support (zone below current price with most touches)
    const supports = validZones.filter((z) => z.level < price);
    if (supports.length > 0) {
      const best = supports.reduce((a, b) => a.level > b.level ? a : b);
      return {
        price: best.level,
        method: 'support_resistance',
        reason: `Below support zone at ${best.level.toFixed(2)} (${best.touches} touches)`,
      };
    }
  } else {
    // Find nearest resistance (zone above current price with most touches)
    const resistances = validZones.filter((z) => z.level > price);
    if (resistances.length > 0) {
      const best = resistances.reduce((a, b) => a.level < b.level ? a : b);
      return {
        price: best.level,
        method: 'support_resistance',
        reason: `Above resistance zone at ${best.level.toFixed(2)} (${best.touches} touches)`,
      };
    }
  }

  // Fallback
  return calculateSwingStopLoss(candles, side);
}

// ---------------------------------------------------------------------------
// Take-profit calculation
// ---------------------------------------------------------------------------

/**
 * Calculate three take-profit levels based on risk:reward ratios.
 *
 * @param {number} entryPrice
 * @param {number} stopLossPrice
 * @param {'long'|'short'} side
 * @param {Record<string,any>} [config] — {rr1, rr2, rr3} risk:reward ratios
 * @returns {{tp1:number, tp2:number, tp3:number, rr1:number, rr2:number, rr3:number}}
 */
export function calculateTakeProfits(entryPrice, stopLossPrice, side, config = {}) {
  const cfg = { ...DEFAULT_RISK_CONFIG, ...config };
  const risk = Math.abs(entryPrice - stopLossPrice);

  if (risk === 0) {
    return { tp1: entryPrice, tp2: entryPrice, tp3: entryPrice, rr1: cfg.rr1, rr2: cfg.rr2, rr3: cfg.rr3 };
  }

  let tp1, tp2, tp3;

  if (side === 'long') {
    tp1 = entryPrice + risk * cfg.rr1;
    tp2 = entryPrice + risk * cfg.rr2;
    tp3 = entryPrice + risk * cfg.rr3;
  } else {
    tp1 = entryPrice - risk * cfg.rr1;
    tp2 = entryPrice - risk * cfg.rr2;
    tp3 = entryPrice - risk * cfg.rr3;
  }

  return {
    tp1: Math.floor(tp1 * 1e8) / 1e8,
    tp2: Math.floor(tp2 * 1e8) / 1e8,
    tp3: Math.floor(tp3 * 1e8) / 1e8,
    rr1: cfg.rr1,
    rr2: cfg.rr2,
    rr3: cfg.rr3,
  };
}

// ---------------------------------------------------------------------------
// Risk:Reward ratio
// ---------------------------------------------------------------------------

/**
 * Calculate the risk:reward ratio for a trade.
 *
 * @param {number} entryPrice
 * @param {number} stopLoss
 * @param {number} takeProfit
 * @returns {{ratio:number, label:string}}
 */
export function calculateRiskRewardRatio(entryPrice, stopLoss, takeProfit) {
  if (entryPrice <= 0) throw new Error('entryPrice must be positive.');
  if (stopLoss <= 0) throw new Error('stopLoss must be positive.');
  if (takeProfit <= 0) throw new Error('takeProfit must be positive.');

  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);

  if (risk === 0) {
    return { ratio: Infinity, label: '∞:1' };
  }

  const ratio = reward / risk;
  const label = `${ratio.toFixed(2)}:1`;

  return { ratio, label };
}

// ---------------------------------------------------------------------------
// Trade validation
// ---------------------------------------------------------------------------

/**
 * Validate a trade setup and return any issues found.
 *
 * @param {number} entryPrice
 * @param {number} stopLoss
 * @param {number} takeProfit
 * @param {'long'|'short'} direction
 * @returns {{valid:boolean, errors:string[]}}
 */
export function validateTrade(entryPrice, stopLoss, takeProfit, direction) {
  const errors = [];

  // Price positivity
  if (typeof entryPrice !== 'number' || !Number.isFinite(entryPrice) || entryPrice <= 0) {
    errors.push('Entry price must be a positive finite number.');
  }
  if (typeof stopLoss !== 'number' || !Number.isFinite(stopLoss) || stopLoss <= 0) {
    errors.push('Stop loss must be a positive finite number.');
  }
  if (typeof takeProfit !== 'number' || !Number.isFinite(takeProfit) || takeProfit <= 0) {
    errors.push('Take profit must be a positive finite number.');
  }

  // Direction validation
  if (direction !== 'long' && direction !== 'short') {
    errors.push('Direction must be "long" or "short".');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Stop loss / take profit order relative to entry
  if (direction === 'long') {
    if (stopLoss >= entryPrice) {
      errors.push('For LONG trades, stop loss must be below entry price.');
    }
    if (takeProfit <= entryPrice) {
      errors.push('For LONG trades, take profit must be above entry price.');
    }
  } else {
    if (stopLoss <= entryPrice) {
      errors.push('For SHORT trades, stop loss must be above entry price.');
    }
    if (takeProfit >= entryPrice) {
      errors.push('For SHORT trades, take profit must be below entry price.');
    }
  }

  // Minimum R:R check (at least 1:1)
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);
  if (risk > 0 && reward < risk) {
    errors.push(`Risk:Reward is less than 1:1 (${(reward / risk).toFixed(2)}:1). Consider adjusting take profit.`);
  }

  // Stop loss distance check (not too tight or too wide)
  const stopDistance = risk / entryPrice;
  if (stopDistance < 0.001) {
    errors.push(`Stop loss too tight (${(stopDistance * 100).toFixed(3)}% from entry). Risk of being stopped out by noise.`);
  }
  if (stopDistance > 0.10) {
    errors.push(`Stop loss too wide (${(stopDistance * 100).toFixed(2)}% from entry). Consider reducing position size or tightening stop.`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  DEFAULT_RISK_CONFIG,
  calculatePositionSize,
  calculateStopLoss,
  calculateTakeProfits,
  calculateRiskRewardRatio,
  validateTrade,
};
