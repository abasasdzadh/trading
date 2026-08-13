/**
 * Average Directional Index (ADX)
 * +DM = high - prevHigh (if positive and > |low - prevLow|, else 0)
 * -DM = prevLow - low (if positive and > |high - prevHigh|, else 0)
 * TR = max(high-low, |high-prevClose|, |low-prevClose|)
 * Smoothed with Wilder's method (period).
 * +DI = 100 * smoothed(+DM) / smoothed(TR)
 * -DI = 100 * smoothed(-DM) / smoothed(TR)
 * DX = 100 * |+DI - -DI| / (+DI + -DI)
 * ADX = Wilder-smoothed DX
 */
export default function adx(candles, config = {}) {
  const period = config.period ?? 14;
  const n = candles.length;

  const adxLine = new Array(n).fill(null);
  const plusDi = new Array(n).fill(null);
  const minusDi = new Array(n).fill(null);

  if (n < period + 1) {
    return {
      values: { adx: adxLine, plusDi, minusDi },
      metadata: { period },
    };
  }

  // Calculate TR, +DM, -DM
  const tr = new Array(n).fill(0);
  const plusDM = new Array(n).fill(0);
  const minusDM = new Array(n).fill(0);

  tr[0] = candles[0].high - candles[0].low;

  for (let i = 1; i < n; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    tr[i] = Math.max(hl, hc, lc);

    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;

    if (upMove > downMove && upMove > 0) {
      plusDM[i] = upMove;
    }
    if (downMove > upMove && downMove > 0) {
      minusDM[i] = downMove;
    }
  }

  // Wilder's smoothing for TR, +DM, -DM
  // First period values: sum of first `period` values
  let sumTR = 0, sumPDM = 0, sumMDM = 0;
  for (let i = 1; i <= period; i++) {
    sumTR += tr[i];
    sumPDM += plusDM[i];
    sumMDM += minusDM[i];
  }

  let smoothTR = sumTR;
  let smoothPDM = sumPDM;
  let smoothMDM = sumMDM;

  const dxValues = [];

  // First DX at index `period`
  const pdi1 = smoothTR === 0 ? 0 : (100 * smoothPDM) / smoothTR;
  const mdi1 = smoothTR === 0 ? 0 : (100 * smoothMDM) / smoothTR;
  plusDi[period] = pdi1;
  minusDi[period] = mdi1;
  const diSum = pdi1 + mdi1;
  const dx1 = diSum === 0 ? 0 : (100 * Math.abs(pdi1 - mdi1)) / diSum;
  dxValues.push(dx1);

  for (let i = period + 1; i < n; i++) {
    smoothTR = smoothTR - smoothTR / period + tr[i];
    smoothPDM = smoothPDM - smoothPDM / period + plusDM[i];
    smoothMDM = smoothMDM - smoothMDM / period + minusDM[i];

    const pdi = smoothTR === 0 ? 0 : (100 * smoothPDM) / smoothTR;
    const mdi = smoothTR === 0 ? 0 : (100 * smoothMDM) / smoothTR;
    plusDi[i] = pdi;
    minusDi[i] = mdi;

    const ds = pdi + mdi;
    const dx = ds === 0 ? 0 : (100 * Math.abs(pdi - mdi)) / ds;
    dxValues.push(dx);
  }

  // ADX = Wilder's smoothed DX
  if (dxValues.length >= period) {
    let adxSum = 0;
    for (let i = 0; i < period; i++) adxSum += dxValues[i];
    let prevAdx = adxSum / period;
    adxLine[period + (period - 1)] = prevAdx;

    for (let i = period; i < dxValues.length; i++) {
      prevAdx = (prevAdx * (period - 1) + dxValues[i]) / period;
      adxLine[period + i] = prevAdx;
    }
  }

  return {
    values: { adx: adxLine, plusDi, minusDi },
    metadata: { period },
  };
}
