/**
 * Keltner Channel
 * Middle = EMA(close, emaPeriod)
 * Upper = Middle + multiplier * ATR(atrPeriod)
 * Lower = Middle - multiplier * ATR(atrPeriod)
 * ATR uses Wilder's smoothing.
 */
export default function keltner(candles, config = {}) {
  const emaPeriod = config.emaPeriod ?? 20;
  const atrPeriod = config.atrPeriod ?? 10;
  const multiplier = config.multiplier ?? 1.5;
  const n = candles.length;

  const upper = new Array(n).fill(null);
  const middle = new Array(n).fill(null);
  const lower = new Array(n).fill(null);

  if (n < Math.max(emaPeriod, atrPeriod)) {
    return {
      values: { upper, middle, lower },
      metadata: { emaPeriod, atrPeriod, multiplier },
    };
  }

  // EMA for middle band
  const k = 2 / (emaPeriod + 1);
  let emaSum = 0;
  for (let i = 0; i < emaPeriod; i++) emaSum += candles[i].close;
  let emaVal = emaSum / emaPeriod;
  middle[emaPeriod - 1] = emaVal;

  for (let i = emaPeriod; i < n; i++) {
    emaVal = candles[i].close * k + emaVal * (1 - k);
    middle[i] = emaVal;
  }

  // ATR with Wilder's smoothing
  const tr = new Array(n).fill(0);
  tr[0] = candles[0].high - candles[0].low;
  for (let i = 1; i < n; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    tr[i] = Math.max(hl, hc, lc);
  }

  let atrSum = 0;
  for (let i = 0; i < atrPeriod; i++) atrSum += tr[i];
  let atrVal = atrSum / atrPeriod;

  const atrValues = new Array(n).fill(null);
  atrValues[atrPeriod - 1] = atrVal;

  for (let i = atrPeriod; i < n; i++) {
    atrVal = (atrVal * (atrPeriod - 1) + tr[i]) / atrPeriod;
    atrValues[i] = atrVal;
  }

  // Combine
  for (let i = 0; i < n; i++) {
    if (middle[i] !== null && atrValues[i] !== null) {
      upper[i] = middle[i] + multiplier * atrValues[i];
      lower[i] = middle[i] - multiplier * atrValues[i];
    }
  }

  return {
    values: { upper, middle, lower },
    metadata: { emaPeriod, atrPeriod, multiplier },
  };
}
