/**
 * Pivot Points (Standard / Classic)
 * Uses the previous day's High, Low, Close to compute:
 *   PP = (H + L + C) / 3
 *   R1 = 2*PP - L,  S1 = 2*PP - H
 *   R2 = PP + (H - L),  S2 = PP - (H - L)
 *   R3 = H + 2*(PP - L),  S3 = L - 2*(H - PP)
 * Fills all candles of the same day with the same pivot values.
 */
export default function pivotPoints(candles, config = {}) {
  const n = candles.length;

  const pp = new Array(n).fill(null);
  const r1 = new Array(n).fill(null);
  const r2 = new Array(n).fill(null);
  const r3 = new Array(n).fill(null);
  const s1 = new Array(n).fill(null);
  const s2 = new Array(n).fill(null);
  const s3 = new Array(n).fill(null);

  if (n === 0) {
    return {
      values: { pp, r1, r2, r3, s1, s2, s3 },
      metadata: {},
    };
  }

  function getDayKey(time) {
    const d = new Date(time);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  // Group candles by day
  const dayGroups = {};
  for (let i = 0; i < n; i++) {
    const key = getDayKey(candles[i].time);
    if (!dayGroups[key]) dayGroups[key] = [];
    dayGroups[key].push(i);
  }

  const sortedDays = Object.keys(dayGroups).sort();

  for (let d = 1; d < sortedDays.length; d++) {
    const prevDayIndices = dayGroups[sortedDays[d - 1]];
    const currDayIndices = dayGroups[sortedDays[d]];

    // Get previous day's H, L, C
    const prevLastCandle = candles[prevDayIndices[prevDayIndices.length - 1]];
    let prevHigh = -Infinity;
    let prevLow = Infinity;
    for (const idx of prevDayIndices) {
      if (candles[idx].high > prevHigh) prevHigh = candles[idx].high;
      if (candles[idx].low < prevLow) prevLow = candles[idx].low;
    }
    const prevClose = prevLastCandle.close;

    const pivotPP = (prevHigh + prevLow + prevClose) / 3;
    const pivotR1 = 2 * pivotPP - prevLow;
    const pivotS1 = 2 * pivotPP - prevHigh;
    const pivotR2 = pivotPP + (prevHigh - prevLow);
    const pivotS2 = pivotPP - (prevHigh - prevLow);
    const pivotR3 = prevHigh + 2 * (pivotPP - prevLow);
    const pivotS3 = prevLow - 2 * (prevHigh - pivotPP);

    for (const idx of currDayIndices) {
      pp[idx] = pivotPP;
      r1[idx] = pivotR1;
      r2[idx] = pivotR2;
      r3[idx] = pivotR3;
      s1[idx] = pivotS1;
      s2[idx] = pivotS2;
      s3[idx] = pivotS3;
    }
  }

  return {
    values: { pp, r1, r2, r3, s1, s2, s3 },
    metadata: {},
  };
}
