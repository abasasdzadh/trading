/**
 * Average True Range (ATR)
 * Uses Wilder's smoothing method.
 * True Range = max(high-low, |high-prevClose|, |low-prevClose|)
 */
export default function atr(candles, config = {}) {
  const period = config.period ?? 14;
  const n = candles.length;
  const values = new Array(n).fill(null);

  if (n < 2) {
    return { values, metadata: { period } };
  }

  // Calculate True Range values
  const tr = new Array(n).fill(0);
  tr[0] = candles[0].high - candles[0].low;
  for (let i = 1; i < n; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    tr[i] = Math.max(hl, hc, lc);
  }

  if (n < period) {
    return { values, metadata: { period } };
  }

  // First ATR = SMA of first `period` TRs
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += tr[i];
  }
  let prevAtr = sum / period;
  values[period - 1] = prevAtr;

  // Wilder's smoothing
  for (let i = period; i < n; i++) {
    prevAtr = (prevAtr * (period - 1) + tr[i]) / period;
    values[i] = prevAtr;
  }

  return { values, metadata: { period } };
}
