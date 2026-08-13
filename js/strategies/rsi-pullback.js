/**
 * RSI Pullback Strategy
 * ======================
 * Uses RSI oversold/overbought in trend context.
 *
 * Config:
 *   period:     14   — RSI period
 *   oversold:   30   — Oversold threshold
 *   overbought: 70   — Overbought threshold
 *   trendEMA:   200  — EMA period for trend context
 *
 * Long  when RSI pulls back to oversold in an uptrend (price > EMA200)
 * Short when RSI pushes to overbought in a downtrend (price < EMA200)
 *
 * Task ID: 2-c
 */

/** Compute EMA inline. */
function computeEMA(closes, period) {
  const n = closes.length;
  const result = new Array(n).fill(null);
  if (n < period) return result;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += closes[i];
  let prev = sum / period;
  result[period - 1] = prev;
  for (let i = period; i < n; i++) {
    const cur = closes[i] * k + prev * (1 - k);
    result[i] = cur;
    prev = cur;
  }
  return result;
}

/** Compute RSI (Wilder's smoothing). */
function computeRSI(closes, period) {
  const n = closes.length;
  const result = new Array(n).fill(null);
  if (n < period + 1) return result;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < n; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

/**
 * @param {Array} candles
 * @param {Record<string,any>} indicators
 * @param {Record<string,any>} config
 * @returns {{direction:string, strength:number, reasoning:string}}
 */
function analyze(candles, indicators, config) {
  const { period = 14, oversold = 30, overbought = 70, trendEMA = 200 } = config;
  const n = candles.length;

  if (n < Math.max(period + 1, trendEMA)) {
    return {
      direction: 'no_trade',
      strength: 0,
      reasoning: `Not enough data. Need at least ${Math.max(period + 1, trendEMA)} candles.`,
    };
  }

  const closes = candles.map((c) => c.close);
  const rsi = computeRSI(closes, period);
  const ema = computeEMA(closes, trendEMA);

  const i = n - 1;
  const currentRSI = rsi[i];
  const prevRSI = rsi[i - 1];
  const price = closes[i];
  const emaVal = ema[i];

  if (currentRSI === null || prevRSI === null || emaVal === null) {
    return { direction: 'no_trade', strength: 0, reasoning: 'RSI or EMA not yet available.' };
  }

  const isUptrend = price > emaVal;
  const isDowntrend = price < emaVal;

  // Check for RSI just exiting oversold zone (crossed above oversold threshold)
  const rsiCrossedAboveOversold = prevRSI <= oversold && currentRSI > oversold;
  const rsiCrossedBelowOverbought = prevRSI >= overbought && currentRSI < overbought;

  // Also consider RSI near oversold/overbought as potential setup
  const rsiNearOversold = currentRSI < oversold + 5 && currentRSI >= oversold;
  const rsiNearOverbought = currentRSI > overbought - 5 && currentRSI <= overbought;

  // Long signal: RSI pullback in uptrend
  if (isUptrend && (rsiCrossedAboveOversold || rsiNearOversold)) {
    // Strength increases as RSI was deeper in oversold
    const depth = Math.max(0, oversold - prevRSI) / oversold;
    const strength = Math.min(100, Math.round(50 + depth * 50));
    const reason = rsiCrossedAboveOversold
      ? `RSI bounced from ${prevRSI.toFixed(1)} to ${currentRSI.toFixed(1)}, exiting oversold zone in uptrend (price > EMA${trendEMA})`
      : `RSI at ${currentRSI.toFixed(1)} near oversold zone in uptrend (price > EMA${trendEMA}), potential pullback entry`;
    return { direction: 'long', strength, reasoning: reason };
  }

  // Short signal: RSI pushback in downtrend
  if (isDowntrend && (rsiCrossedBelowOverbought || rsiNearOverbought)) {
    const depth = Math.max(0, prevRSI - overbought) / (100 - overbought);
    const strength = Math.min(100, Math.round(50 + depth * 50));
    const reason = rsiCrossedBelowOverbought
      ? `RSI fell from ${prevRSI.toFixed(1)} to ${currentRSI.toFixed(1)}, exiting overbought zone in downtrend (price < EMA${trendEMA})`
      : `RSI at ${currentRSI.toFixed(1)} near overbought zone in downtrend (price < EMA${trendEMA}), potential rejection entry`;
    return { direction: 'short', strength, reasoning: reason };
  }

  // RSI at extreme levels without trend confirmation — weaker signal
  if (currentRSI <= oversold) {
    return {
      direction: 'no_trade',
      strength: Math.round(20),
      reasoning: `RSI at ${currentRSI.toFixed(1)} (oversold) but ${isUptrend ? 'trend is up — wait for bounce' : 'trend is down — no reversal confirmation'}.`,
    };
  }

  if (currentRSI >= overbought) {
    return {
      direction: 'no_trade',
      strength: Math.round(20),
      reasoning: `RSI at ${currentRSI.toFixed(1)} (overbought) but ${isDowntrend ? 'trend is down — wait for rejection' : 'trend is up — no reversal confirmation'}.`,
    };
  }

  return {
    direction: 'no_trade',
    strength: 0,
    reasoning: `RSI at ${currentRSI.toFixed(1)} — no pullback signal. Trend is ${isUptrend ? 'up' : isDowntrend ? 'down' : 'neutral'}.`,
  };
}

export default {
  name: 'rsi_pullback',
  label: 'RSI Pullback',
  description: 'Uses RSI oversold/overbought pullbacks within the context of the broader trend identified by EMA 200.',
  defaultConfig: { period: 14, oversold: 30, overbought: 70, trendEMA: 200 },
  analyze,
};
