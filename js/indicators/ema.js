/**
 * Exponential Moving Average (EMA)
 * Multiplier: k = 2 / (period + 1)
 * First EMA value is the SMA of the first `period` closes.
 * EMA[i] = close[i] * k + EMA[i-1] * (1 - k)
 */
export default function ema(candles, config = {}) {
  const period = config.period ?? 20;
  const values = new Array(candles.length).fill(null);

  if (candles.length < period) {
    return { values, metadata: { period } };
  }

  const k = 2 / (period + 1);

  // Seed: SMA of first `period` closes
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let prevEma = sum / period;
  values[period - 1] = prevEma;

  for (let i = period; i < candles.length; i++) {
    const current = candles[i].close * k + prevEma * (1 - k);
    values[i] = current;
    prevEma = current;
  }

  return { values, metadata: { period } };
}
