/**
 * Commodity Channel Index (CCI)
 * Typical Price (TP) = (High + Low + Close) / 3
 * CCI = (TP - SMA(TP, period)) / (0.015 * Mean Deviation)
 * Mean Deviation = average of |TP - SMA(TP)| over period
 */
export default function cci(candles, config = {}) {
  const period = config.period ?? 20;
  const n = candles.length;
  const values = new Array(n).fill(null);

  if (n < period) {
    return { values, metadata: { period } };
  }

  // Typical prices
  const tp = candles.map((c) => (c.high + c.low + c.close) / 3);

  // Rolling SMA and mean deviation
  let sum = 0;
  let absSum = 0;
  for (let i = 0; i < period; i++) {
    sum += tp[i];
  }
  let sma = sum / period;

  for (let i = 0; i < period; i++) {
    absSum += Math.abs(tp[i] - sma);
  }
  let meanDev = absSum / period;

  values[period - 1] = meanDev === 0 ? 0 : (tp[period - 1] - sma) / (0.015 * meanDev);

  for (let i = period; i < n; i++) {
    const oldTP = tp[i - period];
    const newTP = tp[i];
    sum += newTP - oldTP;
    sma = sum / period;

    // Recompute mean deviation
    absSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      absSum += Math.abs(tp[j] - sma);
    }
    meanDev = absSum / period;

    values[i] = meanDev === 0 ? 0 : (tp[i] - sma) / (0.015 * meanDev);
  }

  return { values, metadata: { period } };
}
