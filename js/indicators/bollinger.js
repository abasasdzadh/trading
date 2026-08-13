/**
 * Bollinger Bands
 * Middle = SMA(period)
 * Upper = Middle + stdDev * stddev(close, period)
 * Lower = Middle - stdDev * stddev(close, period)
 */
export default function bollinger(candles, config = {}) {
  const period = config.period ?? 20;
  const stdDevMult = config.stdDev ?? 2;
  const n = candles.length;

  const upper = new Array(n).fill(null);
  const middle = new Array(n).fill(null);
  const lower = new Array(n).fill(null);

  if (n < period) {
    return { values: { upper, middle, lower }, metadata: { period, stdDev: stdDevMult } };
  }

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let sma = sum / period;
  middle[period - 1] = sma;

  // Compute stddev for first window
  let sqSum = 0;
  for (let i = 0; i < period; i++) {
    sqSum += (candles[i].close - sma) ** 2;
  }
  let std = Math.sqrt(sqSum / period);

  upper[period - 1] = sma + stdDevMult * std;
  lower[period - 1] = sma - stdDevMult * std;

  for (let i = period; i < n; i++) {
    const oldClose = candles[i - period].close;
    const newClose = candles[i].close;

    // Update SMA
    sma += (newClose - oldClose) / period;
    middle[i] = sma;

    // Update stddev using Welford-like incremental approach
    // Recompute from scratch for correctness
    let windowSqSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      windowSqSum += (candles[j].close - sma) ** 2;
    }
    std = Math.sqrt(windowSqSum / period);

    upper[i] = sma + stdDevMult * std;
    lower[i] = sma - stdDevMult * std;
  }

  return { values: { upper, middle, lower }, metadata: { period, stdDev: stdDevMult } };
}
