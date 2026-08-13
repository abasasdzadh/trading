/**
 * EMA Trend Strategy
 * ==================
 * Uses EMA 20/50/200 crossovers and price position relative to EMAs.
 *
 * Config:
 *   fastPeriod:   20  — Fast EMA period
 *   mediumPeriod: 50  — Medium EMA period
 *   slowPeriod:   200 — Slow EMA period
 *
 * Long  when price > EMA20 > EMA50 > EMA200 (perfect bullish alignment)
 * Short when price < EMA20 < EMA50 < EMA200 (perfect bearish alignment)
 *
 * Task ID: 2-c
 */

/** Compute EMA inline so the strategy is self-contained. */
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

/**
 * @param {Array} candles
 * @param {Record<string,any>} indicators
 * @param {Record<string,any>} config
 * @returns {{direction:string, strength:number, reasoning:string}}
 */
function analyze(candles, indicators, config) {
  const { fastPeriod = 20, mediumPeriod = 50, slowPeriod = 200 } = config;
  const n = candles.length;

  if (n < slowPeriod) {
    return {
      direction: 'no_trade',
      strength: 0,
      reasoning: `Not enough data for EMA ${slowPeriod}. Need ${slowPeriod} candles, have ${n}.`,
    };
  }

  const closes = candles.map((c) => c.close);
  const emaFast = computeEMA(closes, fastPeriod);
  const emaMed = computeEMA(closes, mediumPeriod);
  const emaSlow = computeEMA(closes, slowPeriod);

  const i = n - 1; // Current bar
  const price = closes[i];
  const fast = emaFast[i];
  const med = emaMed[i];
  const slow = emaSlow[i];

  if (fast === null || med === null || slow === null) {
    return { direction: 'no_trade', strength: 0, reasoning: 'EMA values not yet available.' };
  }

  // Previous bar for crossover detection
  const prevFast = emaFast[i - 1];
  const prevMed = emaMed[i - 1];
  const prevPrice = closes[i - 1];

  let bullPoints = 0;
  let bearPoints = 0;
  const reasons = [];

  // 1. Price vs fast EMA
  if (price > fast) { bullPoints++; reasons.push('Price above EMA' + fastPeriod); }
  else { bearPoints++; reasons.push('Price below EMA' + fastPeriod); }

  // 2. Fast vs Medium EMA
  if (fast > med) { bullPoints++; reasons.push('EMA' + fastPeriod + ' > EMA' + mediumPeriod); }
  else { bearPoints++; reasons.push('EMA' + fastPeriod + ' < EMA' + mediumPeriod); }

  // 3. Medium vs Slow EMA
  if (med > slow) { bullPoints++; reasons.push('EMA' + mediumPeriod + ' > EMA' + slowPeriod); }
  else { bearPoints++; reasons.push('EMA' + mediumPeriod + ' < EMA' + slowPeriod); }

  // 4. Price vs slow EMA (trend filter)
  if (price > slow) { bullPoints++; }
  else { bearPoints++; }

  // 5. Crossovers (bonus signals)
  // Fast/medium crossover
  if (prevFast !== null && prevMed !== null) {
    if (prevFast <= prevMed && fast > med) {
      bullPoints += 2;
      reasons.push(`Bullish crossover: EMA${fastPeriod} crossed above EMA${mediumPeriod}`);
    } else if (prevFast >= prevMed && fast < med) {
      bearPoints += 2;
      reasons.push(`Bearish crossover: EMA${fastPeriod} crossed below EMA${mediumPeriod}`);
    }
  }

  // Price/EMA crossover
  if (prevPrice !== null && prevFast !== null) {
    if (prevPrice <= prevFast && price > fast) {
      bullPoints++;
      reasons.push(`Price crossed above EMA${fastPeriod}`);
    } else if (prevPrice >= prevFast && price < fast) {
      bearPoints++;
      reasons.push(`Price crossed below EMA${fastPeriod}`);
    }
  }

  const totalPoints = bullPoints + bearPoints;
  if (totalPoints === 0) {
    return { direction: 'no_trade', strength: 0, reasoning: 'No clear EMA trend signals.' };
  }

  const bullRatio = bullPoints / totalPoints;
  const bearRatio = bearPoints / totalPoints;

  if (bullRatio > 0.6) {
    const strength = Math.min(100, Math.round(bullRatio * 100));
    return {
      direction: 'long',
      strength,
      reasoning: `EMA Trend BULLISH: ${reasons.filter((_, idx) => idx < 4).join('; ')}.`,
    };
  }

  if (bearRatio > 0.6) {
    const strength = Math.min(100, Math.round(bearRatio * 100));
    return {
      direction: 'short',
      strength,
      reasoning: `EMA Trend BEARISH: ${reasons.filter((_, idx) => idx >= 4 || idx < 4).filter((_, idx) => idx < 4).join('; ')}.`,
    };
  }

  return {
    direction: 'no_trade',
    strength: 0,
    reasoning: 'EMA trend is mixed — no clear directional alignment.',
  };
}

export default {
  name: 'ema_trend',
  label: 'EMA Trend',
  description: 'Uses EMA 20/50/200 crossovers and price position relative to EMAs for trend identification.',
  defaultConfig: { fastPeriod: 20, mediumPeriod: 50, slowPeriod: 200 },
  analyze,
};
