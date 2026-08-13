/**
 * Simple Moving Average (SMA)
 * Average of the last `period` close prices.
 */
export default function sma(candles, config = {}) {
  const period = config.period ?? 20;
  const values = new Array(candles.length).fill(null);

  if (candles.length < period) {
    return { values, metadata: { period } };
  }

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  values[period - 1] = sum / period;

  for (let i = period; i < candles.length; i++) {
    sum += candles[i].close - candles[i - period].close;
    values[i] = sum / period;
  }

  return { values, metadata: { period } };
}
