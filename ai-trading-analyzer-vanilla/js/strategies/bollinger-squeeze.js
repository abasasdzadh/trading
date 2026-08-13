/**
 * Bollinger Squeeze Strategy
 * ===========================
 * Detects low volatility squeeze (Bollinger inside Keltner) then expansion.
 *
 * Config:
 *   bbPeriod:          20   — Bollinger Bands period
 *   bbStdDev:          2    — Bollinger Bands std dev multiplier
 *   keltnerMultiplier: 1.5  — Keltner Channel ATR multiplier
 *   squeezeThreshold:  0.05 — Squeeze duration threshold (fraction of lookback)
 *
 * Long  on upward breakout from squeeze.
 * Short on downward breakout from squeeze.
 *
 * Task ID: 2-c
 */

/** Compute EMA. */
function computeEMA(values, period) {
  const n = values.length;
  const result = new Array(n).fill(null);
  if (n < period) return result;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  let prev = sum / period;
  result[period - 1] = prev;
  for (let i = period; i < n; i++) {
    const cur = values[i] * k + prev * (1 - k);
    result[i] = cur;
    prev = cur;
  }
  return result;
}

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

/** Compute standard deviation. */
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

  for (let i = period - 1; i < n; i++) {
    if (middle[i] === null) continue;
    const sd = computeStdDev(closes, period, i);
    upper[i] = middle[i] + stdDev * sd;
    lower[i] = middle[i] - stdDev * sd;
  }
  return { middle, upper, lower };
}

/** Compute ATR (simple, Wilder's smoothing). */
function computeATR(candles, period) {
  const n = candles.length;
  const result = new Array(n).fill(null);
  if (n < 2) return result;

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

  if (n < period + 1) return result;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += tr[i];
  let prev = sum / period;
  result[period] = prev;

  for (let i = period + 1; i < n; i++) {
    prev = (prev * (period - 1) + tr[i]) / period;
    result[i] = prev;
  }
  return result;
}

/** Compute Keltner Channel. */
function computeKeltner(closes, candles, emaPeriod, atrPeriod, multiplier) {
  const n = closes.length;
  const middle = computeEMA(closes, emaPeriod);
  const atr = computeATR(candles, atrPeriod);
  const upper = new Array(n).fill(null);
  const lower = new Array(n).fill(null);

  for (let i = 0; i < n; i++) {
    if (middle[i] !== null && atr[i] !== null) {
      upper[i] = middle[i] + multiplier * atr[i];
      lower[i] = middle[i] - multiplier * atr[i];
    }
  }
  return { middle, upper, lower };
}

/**
 * @param {Array} candles
 * @param {Record<string,any>} indicators
 * @param {Record<string,any>} config
 * @returns {{direction:string, strength:number, reasoning:string}}
 */
function analyze(candles, indicators, config) {
  const { bbPeriod = 20, bbStdDev = 2, keltnerMultiplier = 1.5, squeezeThreshold = 0.05 } = config;
  const n = candles.length;

  const minData = Math.max(bbPeriod + 10, 30);
  if (n < minData) {
    return {
      direction: 'no_trade',
      strength: 0,
      reasoning: `Not enough data. Need ${minData} candles.`,
    };
  }

  const closes = candles.map((c) => c.close);
  const bb = computeBollinger(closes, bbPeriod, bbStdDev);
  const keltner = computeKeltner(closes, candles, bbPeriod, bbPeriod, keltnerMultiplier);

  // Detect squeeze: BB lower band inside Keltner lower band AND
  //                 BB upper band inside Keltner upper band
  const squeeze = new Array(n).fill(false);
  let squeezeCount = 0;
  const lookbackWindow = Math.min(50, n - bbPeriod);

  for (let i = bbPeriod; i < n; i++) {
    if (
      bb.upper[i] !== null && bb.lower[i] !== null &&
      keltner.upper[i] !== null && keltner.lower[i] !== null
    ) {
      squeeze[i] = bb.upper[i] < keltner.upper[i] && bb.lower[i] > keltner.lower[i];
    }
  }

  // Count recent squeeze bars
  for (let j = n - lookbackWindow; j < n; j++) {
    if (squeeze[j]) squeezeCount++;
  }

  const i = n - 1;
  const price = closes[i];

  // Check if we just exited a squeeze (current bar NOT in squeeze, previous bar WAS)
  const wasSqueezed = i >= 1 && squeeze[i - 1];
  const nowExpanded = !squeeze[i];

  // Also check: was there a significant squeeze period?
  const significantSqueeze = squeezeCount / lookbackWindow >= squeezeThreshold;

  // Detect breakout direction
  if (wasSqueezed && nowExpanded) {
    const bbUpper = bb.upper[i];
    const bbLower = bb.lower[i];
    const bbMiddle = bb.middle[i];

    if (bbUpper === null || bbLower === null || bbMiddle === null) {
      return { direction: 'no_trade', strength: 0, reasoning: 'BB values not available at squeeze breakout.' };
    }

    // Upward breakout: price closes above upper BB with expansion
    if (price > bbUpper) {
      const strength = significantSqueeze ? 85 : 60;
      return {
        direction: 'long',
        strength,
        reasoning: `Bollinger Squeeze breakout UPWARD. Price ${price.toFixed(2)} above BB upper ${bbUpper.toFixed(2)}. Squeeze persisted for ${squeezeCount} of ${lookbackWindow} bars.`,
      };
    }

    // Downward breakout: price closes below lower BB with expansion
    if (price < bbLower) {
      const strength = significantSqueeze ? 85 : 60;
      return {
        direction: 'short',
        strength,
        reasoning: `Bollinger Squeeze breakout DOWNWARD. Price ${price.toFixed(2)} below BB lower ${bbLower.toFixed(2)}. Squeeze persisted for ${squeezeCount} of ${lookbackWindow} bars.`,
      };
    }

    // Expansion but no decisive break yet
    return {
      direction: 'no_trade',
      strength: 30,
      reasoning: `Squeeze ended but no decisive breakout. Price ${price.toFixed(2)} within BB [${bbLower.toFixed(2)}, ${bbUpper.toFixed(2)}].`,
    };
  }

  // Currently in a squeeze — no trade yet, warn about upcoming potential
  if (squeeze[i]) {
    const barsInCurrentSqueeze = (() => {
      let count = 0;
      for (let j = i; j >= 0; j--) {
        if (squeeze[j]) count++;
        else break;
      }
      return count;
    })();

    return {
      direction: 'no_trade',
      strength: 0,
      reasoning: `In Bollinger Squeeze for ${barsInCurrentSqueeze} bars. Volatility contracting — watch for breakout.`,
    };
  }

  return {
    direction: 'no_trade',
    strength: 0,
    reasoning: `No squeeze detected. BB/Keltner bands are in normal configuration.`,
  };
}

export default {
  name: 'bollinger_squeeze',
  label: 'Bollinger Squeeze',
  description: 'Detects low volatility Bollinger-Keltner squeeze conditions and signals on the subsequent expansion breakout.',
  defaultConfig: { bbPeriod: 20, bbStdDev: 2, keltnerMultiplier: 1.5, squeezeThreshold: 0.05 },
  analyze,
};
