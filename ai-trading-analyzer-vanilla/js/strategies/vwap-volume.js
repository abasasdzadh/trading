/**
 * VWAP Volume Strategy
 * =====================
 * Uses VWAP + OBV + volume analysis for trade signals.
 *
 * Config:
 *   vwapReset:         true  — Reset VWAP each day
 *   obvSmaPeriod:      20    — SMA period for OBV smoothing
 *   volumeMultiplier:  1.5   — Volume spike threshold (vs. average)
 *
 * Long  when price above VWAP with increasing OBV and volume confirmation.
 * Short when price below VWAP with decreasing OBV and volume confirmation.
 *
 * Task ID: 2-c
 */

/** Compute SMA. */
function computeSMA(values, period) {
  const n = values.length;
  const result = new Array(n).fill(null);
  if (n < period) return result;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  result[period - 1] = sum / period;
  for (let i = period; i < n; i++) {
    sum += values[i] - values[i - period];
    result[i] = sum / period;
  }
  return result;
}

/** Compute VWAP (cumulative, optionally resets daily). */
function computeVWAP(candles, resetDaily) {
  const n = candles.length;
  const vwap = new Array(n).fill(null);

  let cumTPVol = 0;
  let cumVol = 0;
  let lastDay = null;

  for (let i = 0; i < n; i++) {
    const c = candles[i];
    const tp = (c.high + c.low + c.close) / 3;
    const day = new Date(c.time).toDateString();

    if (resetDaily && lastDay !== null && day !== lastDay) {
      cumTPVol = 0;
      cumVol = 0;
    }

    cumTPVol += tp * c.volume;
    cumVol += c.volume;
    lastDay = day;

    vwap[i] = cumVol > 0 ? cumTPVol / cumVol : null;
  }
  return vwap;
}

/** Compute OBV. */
function computeOBV(candles) {
  const n = candles.length;
  const obv = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    if (candles[i].close > candles[i - 1].close) {
      obv[i] = obv[i - 1] + candles[i].volume;
    } else if (candles[i].close < candles[i - 1].close) {
      obv[i] = obv[i - 1] - candles[i].volume;
    } else {
      obv[i] = obv[i - 1];
    }
  }
  return obv;
}

/**
 * @param {Array} candles
 * @param {Record<string,any>} indicators
 * @param {Record<string,any>} config
 * @returns {{direction:string, strength:number, reasoning:string}}
 */
function analyze(candles, indicators, config) {
  const { vwapReset = true, obvSmaPeriod = 20, volumeMultiplier = 1.5 } = config;
  const n = candles.length;

  if (n < obvSmaPeriod + 5) {
    return {
      direction: 'no_trade',
      strength: 0,
      reasoning: `Not enough data. Need ${obvSmaPeriod + 5} candles.`,
    };
  }

  const closes = candles.map((c) => c.close);
  const vwap = computeVWAP(candles, vwapReset);
  const obv = computeOBV(candles);
  const obvSma = computeSMA(obv, obvSmaPeriod);

  const i = n - 1;
  const price = closes[i];
  const vwapVal = vwap[i];
  const obvVal = obv[i];
  const obvSmaVal = obvSma[i];

  if (vwapVal === null || obvSmaVal === null) {
    return { direction: 'no_trade', strength: 0, reasoning: 'VWAP or OBV SMA not available.' };
  }

  // Previous values for trend detection
  const prevVwap = vwap[i - 1];
  const prevOBVSma = obvSma[i - 1];

  // 1. VWAP position
  const aboveVWAP = price > vwapVal;
  const belowVWAP = price < vwapVal;
  const vwapDist = (price - vwapVal) / vwapVal; // Fractional distance

  // 2. OBV trend
  const obvRising = obvVal > obvSmaVal;
  const obvFalling = obvVal < obvSmaVal;
  const obvCrossUp = prevOBVSma !== null && obvVal > obvSmaVal && obv[i - 1] <= prevOBVSma;
  const obvCrossDown = prevOBVSma !== null && obvVal < obvSmaVal && obv[i - 1] >= prevOBVSma;

  // 3. Volume analysis
  const volumes = candles.slice(-20).map((c) => c.volume);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const currentVolume = candles[i].volume;
  const volumeSpike = currentVolume > avgVolume * volumeMultiplier;
  const volumeLow = currentVolume < avgVolume * 0.5;

  // Scoring
  let bullScore = 0;
  let bearScore = 0;
  const reasons = [];

  // VWAP position
  if (aboveVWAP) {
    bullScore += 25;
    reasons.push(`Price ${(vwapDist * 100).toFixed(2)}% above VWAP`);
  } else if (belowVWAP) {
    bearScore += 25;
    reasons.push(`Price ${(Math.abs(vwapDist) * 100).toFixed(2)}% below VWAP`);
  }

  // OBV trend
  if (obvRising) {
    bullScore += 25;
    reasons.push('OBV above SMA (accumulation)');
  } else if (obvFalling) {
    bearScore += 25;
    reasons.push('OBV below SMA (distribution)');
  }

  // OBV crossover
  if (obvCrossUp) {
    bullScore += 20;
    reasons.push('OBV crossed above SMA');
  }
  if (obvCrossDown) {
    bearScore += 20;
    reasons.push('OBV crossed below SMA');
  }

  // Volume confirmation
  if (volumeSpike) {
    // High volume confirms the current direction
    if (bullScore > bearScore) {
      bullScore += 15;
      reasons.push(`Volume spike (${(currentVolume / avgVolume).toFixed(1)}x avg) confirms buying`);
    } else {
      bearScore += 15;
      reasons.push(`Volume spike (${(currentVolume / avgVolume).toFixed(1)}x avg) confirms selling`);
    }
  } else if (volumeLow) {
    // Low volume reduces confidence
    reasons.push('Low volume — reduced confidence');
  } else {
    // Normal volume — small confirmation
    if (bullScore > bearScore) bullScore += 5;
    else if (bearScore > bullScore) bearScore += 5;
  }

  // VWAP slope (rising/falling)
  if (prevVwap !== null) {
    const vwapSlope = vwapVal - prevVwap;
    if (vwapSlope > 0 && aboveVWAP) {
      bullScore += 10;
    } else if (vwapSlope < 0 && belowVWAP) {
      bearScore += 10;
    }
  }

  const threshold = 35;

  if (bullScore >= threshold && bullScore > bearScore) {
    return {
      direction: 'long',
      strength: Math.min(100, bullScore),
      reasoning: `VWAP Volume BULLISH: ${reasons.filter((_, idx) => idx < 4).join('; ')}.`,
    };
  }

  if (bearScore >= threshold && bearScore > bullScore) {
    // Filter to bearish reasons
    const bearReasons = reasons.filter(r => 
      r.includes('below VWAP') || r.includes('distribution') || r.includes('crossed below') || r.includes('confirms selling')
    );
    return {
      direction: 'short',
      strength: Math.min(100, bearScore),
      reasoning: `VWAP Volume BEARISH: ${bearReasons.length > 0 ? bearReasons.join('; ') : reasons.slice(0, 3).join('; ')}.`,
    };
  }

  return {
    direction: 'no_trade',
    strength: 0,
    reasoning: `VWAP volume analysis inconclusive. Bull=${bullScore}, Bear=${bearScore}.`,
  };
}

export default {
  name: 'vwap_volume',
  label: 'VWAP Volume',
  description: 'Combines VWAP position, OBV trend, and volume analysis to confirm directional moves with institutional flow.',
  defaultConfig: { vwapReset: true, obvSmaPeriod: 20, volumeMultiplier: 1.5 },
  analyze,
};
