/**
 * Relative Strength Index (RSI)
 * Uses Wilder's smoothing method.
 * Range: 0-100
 */
export default function rsi(candles, config = {}) {
  const period = config.period ?? 14;
  const values = new Array(candles.length).fill(null);

  if (candles.length < period + 1) {
    return { values, metadata: { period } };
  }

  // Calculate price changes
  const gains = [];
  const losses = [];
  for (let i = 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  // First average: SMA of first `period` gains/losses
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;

  const rsiValue = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  values[period] = rsiValue;

  // Wilder's smoothing
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    values[i + 1] = rsi;
  }

  return { values, metadata: { period } };
}
