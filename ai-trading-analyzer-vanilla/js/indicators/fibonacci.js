/**
 * Fibonacci Retracement Levels
 * Identifies the last swing high and swing low in the data.
 * Computes retracement levels: 0, 0.236, 0.382, 0.5, 0.618, 0.786, 1
 * All candles get the same levels (based on the most recent swing).
 */
export default function fibonacci(candles, config = {}) {
  const n = candles.length;

  const levels = {
    '0': new Array(n).fill(null),
    '0.236': new Array(n).fill(null),
    '0.382': new Array(n).fill(null),
    '0.5': new Array(n).fill(null),
    '0.618': new Array(n).fill(null),
    '0.786': new Array(n).fill(null),
    '1': new Array(n).fill(null),
  };

  if (n < 2) {
    return { values: levels, metadata: {} };
  }

  // Find last swing high and swing low
  // Simple approach: highest high and lowest low in the dataset
  let swingHigh = -Infinity;
  let swingLow = Infinity;
  let swingHighIdx = 0;
  let swingLowIdx = 0;

  for (let i = 0; i < n; i++) {
    if (candles[i].high > swingHigh) {
      swingHigh = candles[i].high;
      swingHighIdx = i;
    }
    if (candles[i].low < swingLow) {
      swingLow = candles[i].low;
      swingLowIdx = i;
    }
  }

  // Determine if uptrend or downtrend based on which came first
  const isUptrend = swingLowIdx < swingHighIdx;
  const startPrice = isUptrend ? swingLow : swingHigh;
  const endPrice = isUptrend ? swingHigh : swingLow;
  const diff = endPrice - startPrice;

  const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

  // Fill all candles from the later swing point onward
  const startFillIdx = Math.max(swingHighIdx, swingLowIdx);
  for (let i = startFillIdx; i < n; i++) {
    for (const ratio of ratios) {
      const key = String(ratio);
      levels[key][i] = isUptrend
        ? endPrice - diff * ratio
        : startPrice + diff * ratio;
    }
  }

  return {
    values: levels,
    metadata: { swingHigh, swingLow, isUptrend, swingHighIdx, swingLowIdx },
  };
}
