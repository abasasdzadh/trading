/**
 * MACD Momentum Strategy
 * ========================
 * Uses MACD histogram, signal crossovers, and zero line position.
 *
 * Config:
 *   fastPeriod:   12 — MACD fast EMA period
 *   slowPeriod:   26 — MACD slow EMA period
 *   signalPeriod: 9  — MACD signal EMA period
 *
 * Long  on bullish MACD/Signal crossover above the zero line.
 * Short on bearish MACD/Signal crossover below the zero line.
 *
 * Task ID: 2-c
 */

/** Compute EMA inline. */
function computeEMA(values, period) {
  const n = values.length;
  const result = new Array(n).fill(null);
  if (n < period) return result;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  let prev = sum / period;
  result[period - 1] = prev;
  for (let i = period; i < n; i++) {
    const cur = values[i] * k + prev * (1 - k);
    result[i] = cur;
    prev = cur;
  }
  return result;
}

/** Compute full MACD inline. */
function computeMACD(closes, fastPeriod, slowPeriod, signalPeriod) {
  const n = closes.length;
  const macdLine = new Array(n).fill(null);
  const signalLine = new Array(n).fill(null);
  const histogram = new Array(n).fill(null);

  if (n < slowPeriod) return { macdLine, signalLine, histogram };

  const fastEMA = computeEMA(closes, fastPeriod);
  const slowEMA = computeEMA(closes, slowPeriod);

  const macdValues = [];
  for (let i = 0; i < n; i++) {
    if (fastEMA[i] !== null && slowEMA[i] !== null) {
      macdLine[i] = fastEMA[i] - slowEMA[i];
      macdValues.push(fastEMA[i] - slowEMA[i]);
    }
  }

  if (macdValues.length >= signalPeriod) {
    const k = 2 / (signalPeriod + 1);
    let sum = 0;
    for (let i = 0; i < signalPeriod; i++) sum += macdValues[i];
    let prevSignal = sum / signalPeriod;

    let macdStartIdx = 0;
    for (let i = 0; i < n; i++) {
      if (macdLine[i] !== null) { macdStartIdx = i; break; }
    }

    signalLine[macdStartIdx + signalPeriod - 1] = prevSignal;
    for (let i = signalPeriod; i < macdValues.length; i++) {
      const cur = macdValues[i] * k + prevSignal * (1 - k);
      signalLine[macdStartIdx + i] = cur;
      prevSignal = cur;
    }
  }

  for (let i = 0; i < n; i++) {
    if (macdLine[i] !== null && signalLine[i] !== null) {
      histogram[i] = macdLine[i] - signalLine[i];
    }
  }

  return { macdLine, signalLine, histogram };
}

/**
 * @param {Array} candles
 * @param {Record<string,any>} indicators
 * @param {Record<string,any>} config
 * @returns {{direction:string, strength:number, reasoning:string}}
 */
function analyze(candles, indicators, config) {
  const { fastPeriod = 12, slowPeriod = 26, signalPeriod = 9 } = config;
  const n = candles.length;

  if (n < slowPeriod + signalPeriod) {
    return {
      direction: 'no_trade',
      strength: 0,
      reasoning: `Not enough data for MACD. Need ${slowPeriod + signalPeriod} candles, have ${n}.`,
    };
  }

  const closes = candles.map((c) => c.close);
  const { macdLine, signalLine, histogram } = computeMACD(closes, fastPeriod, slowPeriod, signalPeriod);

  const i = n - 1;
  const curMACD = macdLine[i];
  const curSignal = signalLine[i];
  const curHist = histogram[i];
  const prevMACD = macdLine[i - 1];
  const prevSignal = signalLine[i - 1];
  const prevHist = histogram[i - 1];

  if (curMACD === null || curSignal === null || curHist === null ||
      prevMACD === null || prevSignal === null || prevHist === null) {
    return { direction: 'no_trade', strength: 0, reasoning: 'MACD values not yet available.' };
  }

  // Detect crossovers
  const bullishCross = prevMACD <= prevSignal && curMACD > curSignal;
  const bearishCross = prevMACD >= prevSignal && curMACD < curSignal;

  // Zero line position
  const aboveZero = curMACD > 0;
  const belowZero = curMACD < 0;

  // Histogram momentum (expanding vs contracting)
  const histExpanding = Math.abs(curHist) > Math.abs(prevHist);
  const histContracting = Math.abs(curHist) < Math.abs(prevHist);

  // Score components
  let bullScore = 0;
  let bearScore = 0;
  const reasons = [];

  // Crossover detection (strongest signal)
  if (bullishCross && aboveZero) {
    bullScore += 40;
    reasons.push('Bullish MACD/Signal crossover ABOVE zero line');
  } else if (bullishCross) {
    bullScore += 25;
    reasons.push('Bullish MACD/Signal crossover below zero line');
  }

  if (bearishCross && belowZero) {
    bearScore += 40;
    reasons.push('Bearish MACD/Signal crossover BELOW zero line');
  } else if (bearishCross) {
    bearScore += 25;
    reasons.push('Bearish MACD/Signal crossover above zero line');
  }

  // MACD line position relative to zero
  if (aboveZero) {
    bullScore += 15;
  } else if (belowZero) {
    bearScore += 15;
  }

  // Histogram direction
  if (curHist > 0 && histExpanding) {
    bullScore += 20;
    reasons.push('Positive histogram expanding');
  } else if (curHist > 0 && histContracting) {
    bullScore += 10;
    reasons.push('Positive histogram contracting (weakening)');
  } else if (curHist < 0 && histExpanding) {
    bearScore += 20;
    reasons.push('Negative histogram expanding');
  } else if (curHist < 0 && histContracting) {
    bearScore += 10;
    reasons.push('Negative histogram contracting (weakening)');
  }

  // Signal line trend (signal line itself trending up/down)
  if (curSignal > signalLine[i - 2] && signalLine[i - 2] !== null) {
    bullScore += 10;
  }
  if (curSignal < signalLine[i - 2] && signalLine[i - 2] !== null) {
    bearScore += 10;
  }

  const totalScore = bullScore + bearScore;
  if (totalScore === 0) {
    return {
      direction: 'no_trade',
      strength: 0,
      reasoning: `MACD neutral. MACD=${curMACD.toFixed(4)}, Signal=${curSignal.toFixed(4)}, Hist=${curHist.toFixed(4)}.`,
    };
  }

  if (bullScore > bearScore && bullScore >= 30) {
    return {
      direction: 'long',
      strength: Math.min(100, bullScore),
      reasoning: `MACD Momentum BULLISH: ${reasons.join('; ')}.`,
    };
  }

  if (bearScore > bullScore && bearScore >= 30) {
    return {
      direction: 'short',
      strength: Math.min(100, bearScore),
      reasoning: `MACD Momentum BEARISH: ${reasons.join('; ')}.`,
    };
  }

  return {
    direction: 'no_trade',
    strength: 0,
    reasoning: `MACD shows no decisive momentum. Bull=${bullScore}, Bear=${bearScore}.`,
  };
}

export default {
  name: 'macd_momentum',
  label: 'MACD Momentum',
  description: 'Uses MACD histogram, signal line crossovers, and zero line position to identify momentum shifts.',
  defaultConfig: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  analyze,
};
