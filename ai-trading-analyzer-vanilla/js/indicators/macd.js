/**
 * MACD (Moving Average Convergence Divergence)
 * MACD line = EMA(fast) - EMA(slow)
 * Signal line = EMA(MACD, signalPeriod)
 * Histogram = MACD - Signal
 * Uses EMA for all smoothing (not SMA).
 */
export default function macd(candles, config = {}) {
  const fastPeriod = config.fastPeriod ?? 12;
  const slowPeriod = config.slowPeriod ?? 26;
  const signalPeriod = config.signalPeriod ?? 9;
  const n = candles.length;

  const macdLine = new Array(n).fill(null);
  const signalLine = new Array(n).fill(null);
  const histogram = new Array(n).fill(null);

  if (n < slowPeriod) {
    return {
      values: { macd: macdLine, signal: signalLine, histogram },
      metadata: { fastPeriod, slowPeriod, signalPeriod },
    };
  }

  // Helper: compute EMA values, returns array with nulls for insufficient data
  function computeEMA(closes, period) {
    const result = new Array(closes.length).fill(null);
    if (closes.length < period) return result;
    const k = 2 / (period + 1);
    let sum = 0;
    for (let i = 0; i < period; i++) sum += closes[i];
    let prev = sum / period;
    result[period - 1] = prev;
    for (let i = period; i < closes.length; i++) {
      const cur = closes[i] * k + prev * (1 - k);
      result[i] = cur;
      prev = cur;
    }
    return result;
  }

  const closes = candles.map((c) => c.close);
  const fastEMA = computeEMA(closes, fastPeriod);
  const slowEMA = computeEMA(closes, slowPeriod);

  // MACD line: first valid index is slowPeriod - 1
  const macdValues = [];
  for (let i = 0; i < n; i++) {
    if (fastEMA[i] !== null && slowEMA[i] !== null) {
      macdLine[i] = fastEMA[i] - slowEMA[i];
      macdValues.push(fastEMA[i] - slowEMA[i]);
    }
  }

  // Signal line: EMA of MACD values
  if (macdValues.length >= signalPeriod) {
    const k = 2 / (signalPeriod + 1);
    let sum = 0;
    for (let i = 0; i < signalPeriod; i++) sum += macdValues[i];
    let prevSignal = sum / signalPeriod;

    // Find the index in the original array where macdValues starts
    let macdStartIdx = 0;
    for (let i = 0; i < n; i++) {
      if (macdLine[i] !== null) {
        macdStartIdx = i;
        break;
      }
    }

    signalLine[macdStartIdx + signalPeriod - 1] = prevSignal;

    for (let i = signalPeriod; i < macdValues.length; i++) {
      const cur = macdValues[i] * k + prevSignal * (1 - k);
      signalLine[macdStartIdx + i] = cur;
      prevSignal = cur;
    }
  }

  // Histogram
  for (let i = 0; i < n; i++) {
    if (macdLine[i] !== null && signalLine[i] !== null) {
      histogram[i] = macdLine[i] - signalLine[i];
    }
  }

  return {
    values: { macd: macdLine, signal: signalLine, histogram },
    metadata: { fastPeriod, slowPeriod, signalPeriod },
  };
}
