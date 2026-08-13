/**
 * Stochastic Oscillator
 * Raw %K = (Close - Lowest Low) / (Highest High - Lowest Low) * 100
 * %K = SMA(Raw %K, smooth)
 * %D = SMA(%K, dPeriod)
 */
export default function stochastic(candles, config = {}) {
  const kPeriod = config.kPeriod ?? 14;
  const dPeriod = config.dPeriod ?? 3;
  const smooth = config.smooth ?? 3;
  const n = candles.length;

  const k = new Array(n).fill(null);
  const d = new Array(n).fill(null);

  if (n < kPeriod) {
    return { values: { k, d }, metadata: { kPeriod, dPeriod, smooth } };
  }

  // Raw %K values
  const rawK = [];
  for (let i = kPeriod - 1; i < n; i++) {
    let lowestLow = Infinity;
    let highestHigh = -Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (candles[j].low < lowestLow) lowestLow = candles[j].low;
      if (candles[j].high > highestHigh) highestHigh = candles[j].high;
    }
    const range = highestHigh - lowestLow;
    const raw = range === 0 ? 50 : ((candles[i].close - lowestLow) / range) * 100;
    rawK.push(raw);
  }

  // Smooth %K with SMA(smooth)
  const smoothedK = [];
  if (rawK.length >= smooth) {
    let sum = 0;
    for (let i = 0; i < smooth; i++) sum += rawK[i];
    smoothedK.push(sum / smooth);

    for (let i = smooth; i < rawK.length; i++) {
      sum += rawK[i] - rawK[i - smooth];
      smoothedK.push(sum / smooth);
    }
  }

  // %D = SMA of smoothed K over dPeriod
  const smoothedD = [];
  if (smoothedK.length >= dPeriod) {
    let sum = 0;
    for (let i = 0; i < dPeriod; i++) sum += smoothedK[i];
    smoothedD.push(sum / dPeriod);

    for (let i = dPeriod; i < smoothedK.length; i++) {
      sum += smoothedK[i] - smoothedK[i - dPeriod];
      smoothedD.push(sum / dPeriod);
    }
  }

  // Map back to original indices
  const kStart = kPeriod - 1 + (smooth - 1);
  for (let i = 0; i < smoothedK.length; i++) {
    k[kStart + i] = smoothedK[i];
  }

  const dStart = kStart + (dPeriod - 1);
  for (let i = 0; i < smoothedD.length; i++) {
    d[dStart + i] = smoothedD[i];
  }

  return { values: { k, d }, metadata: { kPeriod, dPeriod, smooth } };
}
