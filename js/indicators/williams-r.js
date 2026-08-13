/**
 * Williams %R
 * %R = (Highest High - Close) / (Highest High - Lowest Low) * -100
 * Range: -100 to 0
 */
export default function williamsR(candles, config = {}) {
  const period = config.period ?? 14;
  const n = candles.length;
  const values = new Array(n).fill(null);

  if (n < period) {
    return { values, metadata: { period } };
  }

  for (let i = period - 1; i < n; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (candles[j].high > highestHigh) highestHigh = candles[j].high;
      if (candles[j].low < lowestLow) lowestLow = candles[j].low;
    }

    const range = highestHigh - lowestLow;
    values[i] = range === 0 ? -50 : ((highestHigh - candles[i].close) / range) * -100;
  }

  return { values, metadata: { period } };
}
