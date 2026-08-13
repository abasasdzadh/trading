/**
 * Parabolic SAR
 * Uses acceleration factor starting at `step`, increasing by `step` each time
 * a new extreme is reached, capped at `maxStep`.
 * Returns {values: (number|null)[], metadata: {isLong: boolean}}
 * where isLong indicates the final trend direction.
 */
export default function parabolicSAR(candles, config = {}) {
  const step = config.step ?? 0.02;
  const maxStep = config.maxStep ?? 0.2;
  const n = candles.length;
  const values = new Array(n).fill(null);

  if (n < 2) {
    return { values, metadata: { isLong: true } };
  }

  // Determine initial trend: uptrend if close[1] > close[0], else downtrend
  let isLong = candles[1].close > candles[0].close;

  let af = step;
  let ep = isLong ? candles[0].high : candles[0].low; // extreme point
  let sar = isLong ? candles[0].low : candles[0].high; // initial SAR

  values[0] = sar;

  for (let i = 1; i < n; i++) {
    // Calculate preliminary SAR
    let prevSar = sar;

    if (isLong) {
      sar = prevSar + af * (ep - prevSar);

      // SAR must not be above prior two lows
      if (i >= 2) {
        sar = Math.min(sar, candles[i - 1].low, candles[i - 2].low);
      } else {
        sar = Math.min(sar, candles[i - 1].low);
      }

      // Check for reversal
      if (candles[i].low < sar) {
        // Switch to short
        isLong = false;
        sar = ep; // SAR starts at the extreme point (highest high)
        ep = candles[i].low;
        af = step;
        // Ensure SAR is above the current and prior highs
        if (i >= 2) {
          sar = Math.max(sar, candles[i - 1].high, candles[i - 2].high);
        } else {
          sar = Math.max(sar, candles[i - 1].high);
        }
      } else {
        // Update extreme point
        if (candles[i].high > ep) {
          ep = candles[i].high;
          af = Math.min(af + step, maxStep);
        }
      }
    } else {
      sar = prevSar + af * (ep - prevSar);

      // SAR must not be below prior two highs
      if (i >= 2) {
        sar = Math.max(sar, candles[i - 1].high, candles[i - 2].high);
      } else {
        sar = Math.max(sar, candles[i - 1].high);
      }

      // Check for reversal
      if (candles[i].high > sar) {
        // Switch to long
        isLong = true;
        sar = ep; // SAR starts at the extreme point (lowest low)
        ep = candles[i].high;
        af = step;
        // Ensure SAR is below the current and prior lows
        if (i >= 2) {
          sar = Math.min(sar, candles[i - 1].low, candles[i - 2].low);
        } else {
          sar = Math.min(sar, candles[i - 1].low);
        }
      } else {
        // Update extreme point
        if (candles[i].low < ep) {
          ep = candles[i].low;
          af = Math.min(af + step, maxStep);
        }
      }
    }

    values[i] = sar;
  }

  return { values, metadata: { isLong } };
}
