/**
 * Volume Weighted Average Price (VWAP)
 * VWAP = cumulative(TP * volume) / cumulative(volume)
 * TP = (High + Low + Close) / 3
 * Resets on new day (detected by time field).
 */
export default function vwap(candles, config = {}) {
  const n = candles.length;
  const values = new Array(n).fill(null);

  if (n === 0) {
    return { values, metadata: {} };
  }

  let cumTPVol = 0;
  let cumVol = 0;

  function getDayKey(time) {
    const d = new Date(time);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  let currentDay = getDayKey(candles[0].time);

  for (let i = 0; i < n; i++) {
    const dayKey = getDayKey(candles[i].time);

    if (dayKey !== currentDay) {
      // Reset on new day
      cumTPVol = 0;
      cumVol = 0;
      currentDay = dayKey;
    }

    const tp = (candles[i].high + candles[i].low + candles[i].close) / 3;
    cumTPVol += tp * candles[i].volume;
    cumVol += candles[i].volume;

    values[i] = cumVol === 0 ? null : cumTPVol / cumVol;
  }

  return { values, metadata: {} };
}
