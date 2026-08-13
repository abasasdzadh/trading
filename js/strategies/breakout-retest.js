/**
 * Breakout Retest Strategy
 * =========================
 * Uses Bollinger Bands + Donchian Channel for breakout detection,
 * then waits for a retest of the breakout level before entry.
 *
 * Config:
 *   bbPeriod:         20 — Bollinger Bands SMA period
 *   bbStdDev:         2  — Bollinger Bands standard deviation multiplier
 *   donchianPeriod:   20 — Donchian Channel lookback period
 *   retestThreshold:  0.005 — Price proximity to breakout level as fraction (0.5%)
 *
 * Long  on breakout above upper band then retest (price comes back near upper band)
 * Short on breakout below lower band then retest
 *
 * Task ID: 2-c
 */

/** Compute SMA. */
function computeSMA(values, period) {
  const n = values.length;
  const result = new Array(n).fill(null);
  if (n < period) return result;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  result[period - 1] = sum / period;
  for (let i = period; i < n; i++) {
    sum += values[i] - values[i - period];
    result[i] = sum / period;
  }
  return result;
}

/** Compute standard deviation over a window. */
function computeStdDev(values, period, idx) {
  const mean = values.slice(idx - period + 1, idx + 1).reduce((a, b) => a + b, 0) / period;
  const variance = values.slice(idx - period + 1, idx + 1).reduce((a, b) => a + (b - mean) ** 2, 0) / period;
  return Math.sqrt(variance);
}

/** Compute Bollinger Bands. */
function computeBollinger(closes, period, stdDev) {
  const n = closes.length;
  const middle = computeSMA(closes, period);
  const upper = new Array(n).fill(null);
  const lower = new Array(n).fill(null);
  const bandwidth = new Array(n).fill(null);

  for (let i = period - 1; i < n; i++) {
    if (middle[i] === null) continue;
    const sd = computeStdDev(closes, period, i);
    upper[i] = middle[i] + stdDev * sd;
    lower[i] = middle[i] - stdDev * sd;
    bandwidth[i] = middle[i] === 0 ? null : (upper[i] - lower[i]) / middle[i];
  }
  return { middle, upper, lower, bandwidth };
}

/** Compute Donchian Channel (O(n) sliding window max/min). */
function computeDonchian(candles, period) {
  const n = candles.length;
  const highest = new Array(n).fill(null);
  const lowest = new Array(n).fill(null);

  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - period + 1);
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = start; j <= i; j++) {
      if (candles[j].high > hi) hi = candles[j].high;
      if (candles[j].low < lo) lo = candles[j].low;
    }
    highest[i] = hi;
    lowest[i] = lo;
  }
  return { highest, lowest };
}

/**
 * @param {Array} candles
 * @param {Record<string,any>} indicators
 * @param {Record<string,any>} config
 * @returns {{direction:string, strength:number, reasoning:string}}
 */
function analyze(candles, indicators, config) {
  const { bbPeriod = 20, bbStdDev = 2, donchianPeriod = 20, retestThreshold = 0.005 } = config;
  const n = candles.length;

  if (n < Math.max(bbPeriod, donchianPeriod) + 5) {
    return {
      direction: 'no_trade',
      strength: 0,
      reasoning: `Not enough data. Need ${Math.max(bbPeriod, donchianPeriod) + 5} candles.`,
    };
  }

  const closes = candles.map((c) => c.close);
  const bb = computeBollinger(closes, bbPeriod, bbStdDev);
  const dc = computeDonchian(candles, donchianPeriod);

  const i = n - 1;
  const price = closes[i];
  const bbUpper = bb.upper[i];
  const bbLower = bb.lower[i];
  const bbMiddle = bb.middle[i];
  const dcHigh = dc.highest[i];
  const dcLow = dc.lowest[i];

  if (bbUpper === null || bbLower === null || dcHigh === null || dcLow === null) {
    return { direction: 'no_trade', strength: 0, reasoning: 'Bollinger/Donchian values not available.' };
  }

  // Look back for a breakout (candle high above upper band or low below lower band)
  // in the last few bars, then check if current bar is retesting
  const lookback = Math.min(10, n - bbPeriod);
  let bullishBreakout = false;
  let bearishBreakout = false;
  let breakoutHigh = 0;
  let breakoutLow = Infinity;

  for (let j = i - lookback; j < i; j++) {
    if (j < bbPeriod) continue;
    const h = candles[j].high;
    const l = candles[j].low;
    const u = bb.upper[j];
    const lo = bb.lower[j];

    if (u !== null && h > u) {
      bullishBreakout = true;
      if (h > breakoutHigh) breakoutHigh = h;
    }
    if (lo !== null && l < lo) {
      bearishBreakout = true;
      if (l < breakoutLow) breakoutLow = l;
    }
  }

  // Check Donchian channel breakout as well
  const dcBreakoutHigh = candles[i - 1] ? dc.highest[i - 1] : dcHigh;
  if (dcBreakoutHigh !== null && candles[i - 1] && candles[i - 1].high > dcBreakoutHigh) {
    bullishBreakout = true;
    breakoutHigh = Math.max(breakoutHigh, candles[i - 1].high);
  }
  const dcBreakoutLow = candles[i - 1] ? dc.lowest[i - 1] : dcLow;
  if (dcBreakoutLow !== null && candles[i - 1] && candles[i - 1].low < dcBreakoutLow) {
    bearishBreakout = true;
    breakoutLow = Math.min(breakoutLow, candles[i - 1].low);
  }

  // Retest check: current price near the breakout level
  const threshold = price * retestThreshold;

  // Long: bullish breakout occurred, now price retests upper band / breakout level from above
  if (bullishBreakout) {
    const nearUpperBand = Math.abs(price - bbUpper) < threshold * 2;
    const nearBreakout = Math.abs(price - breakoutHigh) < threshold * 3;
    const holdingAbove = price > bbMiddle;

    if (nearUpperBand || nearBreakout) {
      const strength = holdingAbove ? 75 : 50;
      return {
        direction: 'long',
        strength,
        reasoning: `Bullish breakout detected (high ${breakoutHigh.toFixed(2)}), price retesting at ${price.toFixed(2)} near BB upper (${bbUpper.toFixed(2)}). ${holdingAbove ? 'Holding above middle band.' : ''}`,
      };
    }
  }

  // Short: bearish breakout occurred, now price retests lower band / breakout level from below
  if (bearishBreakout) {
    const nearLowerBand = Math.abs(price - bbLower) < threshold * 2;
    const nearBreakout = Math.abs(price - breakoutLow) < threshold * 3;
    const holdingBelow = price < bbMiddle;

    if (nearLowerBand || nearBreakout) {
      const strength = holdingBelow ? 75 : 50;
      return {
        direction: 'short',
        strength,
        reasoning: `Bearish breakout detected (low ${breakoutLow.toFixed(2)}), price retesting at ${price.toFixed(2)} near BB lower (${bbLower.toFixed(2)}). ${holdingBelow ? 'Holding below middle band.' : ''}`,
      };
    }
  }

  // Check for fresh breakout (current bar breaking out)
  const freshBullBreak = candles[i].high > bbUpper;
  const freshBearBreak = candles[i].low < bbLower;

  if (freshBullBreak) {
    return {
      direction: 'no_trade',
      strength: 30,
      reasoning: `Fresh bullish breakout above BB upper (${bbUpper.toFixed(2)}). Wait for retest before entry.`,
    };
  }

  if (freshBearBreak) {
    return {
      direction: 'no_trade',
      strength: 30,
      reasoning: `Fresh bearish breakout below BB lower (${bbLower.toFixed(2)}). Wait for retest before entry.`,
    };
  }

  return {
    direction: 'no_trade',
    strength: 0,
    reasoning: `No breakout/retest pattern detected. Price=${price.toFixed(2)}, BB=[${bbLower.toFixed(2)}, ${bbUpper.toFixed(2)}], DC=[${dcLow.toFixed(2)}, ${dcHigh.toFixed(2)}].`,
  };
}

export default {
  name: 'breakout_retest',
  label: 'Breakout Retest',
  description: 'Detects Bollinger Band / Donchian Channel breakouts and waits for a retest of the breakout level before signaling entry.',
  defaultConfig: { bbPeriod: 20, bbStdDev: 2, donchianPeriod: 20, retestThreshold: 0.005 },
  analyze,
};
