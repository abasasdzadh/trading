/**
 * Money Flow Index (MFI)
 * Raw Money Flow = TP * Volume
 * TP = (High + Low + Close) / 3
 * Positive flow if TP > prevTP, negative otherwise.
 * MFI = 100 - 100 / (1 + positiveFlow / negativeFlow)
 * Range: 0-100
 */
export default function mfi(candles, config = {}) {
  const period = config.period ?? 14;
  const n = candles.length;
  const values = new Array(n).fill(null);

  if (n < period + 1) {
    return { values, metadata: { period } };
  }

  const tp = candles.map((c) => (c.high + c.low + c.close) / 3);
  const rawMF = candles.map((c, i) => tp[i] * c.volume);

  const positiveFlow = [];
  const negativeFlow = [];

  for (let i = 1; i < n; i++) {
    if (tp[i] > tp[i - 1]) {
      positiveFlow.push(rawMF[i]);
      negativeFlow.push(0);
    } else if (tp[i] < tp[i - 1]) {
      positiveFlow.push(0);
      negativeFlow.push(rawMF[i]);
    } else {
      positiveFlow.push(0);
      negativeFlow.push(0);
    }
  }

  // positiveFlow and negativeFlow have n-1 elements, indexed 0..n-2
  // They correspond to candles[1]..candles[n-1]
  // We need rolling sum over `period` elements

  if (positiveFlow.length < period) {
    return { values, metadata: { period } };
  }

  let posSum = 0;
  let negSum = 0;
  for (let i = 0; i < period; i++) {
    posSum += positiveFlow[i];
    negSum += negativeFlow[i];
  }

  const mfiVal = negSum === 0 ? 100 : 100 - 100 / (1 + posSum / negSum);
  // positiveFlow[period-1] corresponds to candles[period] (since positiveFlow[0] = candles[1])
  values[period] = mfiVal;

  for (let i = period; i < positiveFlow.length; i++) {
    posSum += positiveFlow[i] - positiveFlow[i - period];
    negSum += negativeFlow[i] - negativeFlow[i - period];

    const val = negSum === 0 ? 100 : 100 - 100 / (1 + posSum / negSum);
    // positiveFlow[i] corresponds to candles[i+1]
    values[i + 1] = val;
  }

  return { values, metadata: { period } };
}
