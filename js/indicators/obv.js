/**
 * On Balance Volume (OBV)
 * Cumulative indicator:
 *   If close > prevClose: OBV += volume
 *   If close < prevClose: OBV -= volume
 *   If close == prevClose: OBV unchanged
 * First value is 0.
 */
export default function obv(candles, config = {}) {
  const n = candles.length;
  const values = new Array(n).fill(null);

  if (n === 0) {
    return { values, metadata: {} };
  }

  values[0] = 0;
  let cumulative = 0;

  for (let i = 1; i < n; i++) {
    if (candles[i].close > candles[i - 1].close) {
      cumulative += candles[i].volume;
    } else if (candles[i].close < candles[i - 1].close) {
      cumulative -= candles[i].volume;
    }
    values[i] = cumulative;
  }

  return { values, metadata: {} };
}
