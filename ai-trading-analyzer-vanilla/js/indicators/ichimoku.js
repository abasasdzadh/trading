/**
 * Ichimoku Cloud
 * Tenkan-sen (Conversion Line): (highest high + lowest low) / 2 over tenkanPeriod
 * Kijun-sen (Base Line): (highest high + lowest low) / 2 over kijunPeriod
 * Senkou Span A (Leading Span A): (tenkan + kijun) / 2, displaced forward by displacement
 * Senkou Span B (Leading Span B): (highest high + lowest low) / 2 over senkouBPeriod, displaced forward
 * Chikou Span (Lagging Span): close displaced backward by displacement
 */
export default function ichimoku(candles, config = {}) {
  const tenkanPeriod = config.tenkanPeriod ?? 9;
  const kijunPeriod = config.kijunPeriod ?? 26;
  const senkouBPeriod = config.senkouBPeriod ?? 52;
  const displacement = config.displacement ?? 26;
  const n = candles.length;

  const tenkan = new Array(n).fill(null);
  const kijun = new Array(n).fill(null);
  const senkouA = new Array(n).fill(null);
  const senkouB = new Array(n).fill(null);
  const chikou = new Array(n).fill(null);

  function midPoint(start, end) {
    let high = -Infinity;
    let low = Infinity;
    for (let i = start; i <= end; i++) {
      if (candles[i].high > high) high = candles[i].high;
      if (candles[i].low < low) low = candles[i].low;
    }
    return (high + low) / 2;
  }

  // Tenkan-sen
  for (let i = tenkanPeriod - 1; i < n; i++) {
    tenkan[i] = midPoint(i - tenkanPeriod + 1, i);
  }

  // Kijun-sen
  for (let i = kijunPeriod - 1; i < n; i++) {
    kijun[i] = midPoint(i - kijunPeriod + 1, i);
  }

  // Senkou Span A = (tenkan + kijun) / 2, displaced forward
  for (let i = 0; i < n; i++) {
    if (tenkan[i] !== null && kijun[i] !== null) {
      const displacedIdx = i + displacement;
      if (displacedIdx < n) {
        senkouA[displacedIdx] = (tenkan[i] + kijun[i]) / 2;
      }
    }
  }

  // Senkou Span B = midPoint over senkouBPeriod, displaced forward
  for (let i = senkouBPeriod - 1; i < n; i++) {
    const displacedIdx = i + displacement;
    if (displacedIdx < n) {
      senkouB[displacedIdx] = midPoint(i - senkouBPeriod + 1, i);
    }
  }

  // Chikou Span = close displaced backward by displacement
  for (let i = 0; i < n; i++) {
    const backIdx = i - displacement;
    if (backIdx >= 0) {
      chikou[backIdx] = candles[i].close;
    }
  }

  return {
    values: { tenkan, kijun, senkouA, senkouB, chikou },
    metadata: { tenkanPeriod, kijunPeriod, senkouBPeriod, displacement },
  };
}
