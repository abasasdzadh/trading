/**
 * Signal Engine
 * =============
 * Multi-factor signal generation engine that aggregates scores from
 * trend, momentum, volume, structure, price-action, and volatility
 * categories into a weighted composite signal (0–100).
 *
 * Exports:
 *   SCORING_WEIGHTS — weight configuration for each scoring category
 *   generateSignal(candles, indicators, strategies, config) → Signal
 *   analyzeTrendScore(indicators, candles) → {score, direction, details}
 *   analyzeMomentumScore(indicators) → {score, direction, details}
 *   analyzeVolumeScore(indicators, candles) → {score, direction, details}
 *   analyzeStructureScore(indicators, candles) → {score, direction, details}
 *   analyzePriceActionScore(indicators, candles) → {score, direction, details}
 *   analyzeVolatilityScore(indicators) → {score, direction, details}
 *
 * Task ID: 2-c
 */

import { STRATEGY_REGISTRY, analyzeStrategy } from '../strategies/engine.js';

// ---------------------------------------------------------------------------
// Scoring weights — must sum to 100
// ---------------------------------------------------------------------------
export const SCORING_WEIGHTS = Object.freeze({
  trend:        25,
  momentum:     20,
  volume:       15,
  structure:    15,
  priceAction:  15,
  volatility:   10,
});

const WEIGHT_TOTAL = Object.values(SCORING_WEIGHTS).reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safely get last non-null value from an array. */
function lastValue(arr) {
  if (!arr || arr.length === 0) return null;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== null && arr[i] !== undefined) return arr[i];
  }
  return null;
}

/** Convert a raw directional score (-100..100) to {score: 0..100, direction: 'long'|'short'|'neutral'}. */
function normalizeDirection(raw) {
  if (raw > 0) return { score: raw, direction: 'long' };
  if (raw < 0) return { score: -raw, direction: 'short' };
  return { score: 0, direction: 'neutral' };
}

/** Clamp a value between min and max. */
function clamp(val, min = 0, max = 100) {
  return Math.max(min, Math.min(max, val));
}

// ---------------------------------------------------------------------------
// Category scorers — each returns {score:0-100, direction:'long'|'short', details:string[]}
// ---------------------------------------------------------------------------

/**
 * Trend Score (weight: 25)
 * Uses: EMA position, ADX, SuperTrend direction.
 */
export function analyzeTrendScore(indicators, candles) {
  const details = [];
  let raw = 0; // Positive = bullish, Negative = bearish
  let factors = 0;

  // --- EMA position ---
  const ema = indicators.ema?.values;
  if (ema && candles && candles.length > 0 && typeof lastValue(ema) === 'number') {
    const price = candles[candles.length - 1].close;
    const emaVal = lastValue(ema);
    if (emaVal !== null && emaVal > 0) {
      const dist = (price - emaVal) / emaVal;
      raw += clamp(dist * 500, -30, 30);
      factors++;
      if (dist > 0) details.push(`Price ${(dist * 100).toFixed(2)}% above EMA`);
      else details.push(`Price ${(Math.abs(dist) * 100).toFixed(2)}% below EMA`);
    }
  }

  // --- ADX (trend strength) ---
  const adxData = indicators.adx?.values;
  if (adxData) {
    const adxVal = lastValue(adxData.adx);
    const plusDi = lastValue(adxData.plusDi);
    const minusDi = lastValue(adxData.minusDi);

    if (adxVal !== null && adxVal !== undefined) {
      // ADX measures strength, not direction. We add strength to the raw score.
      const adxScore = clamp(adxVal, 0, 100);
      // If ADX > 25, trend is strong — amplify the directional component
      if (adxVal > 25) {
        raw *= 1 + (adxVal - 25) / 100; // Amplify up to 75% stronger
        details.push(`Strong trend (ADX ${adxVal.toFixed(1)})`);
      } else if (adxVal > 15) {
        details.push(`Moderate trend (ADX ${adxVal.toFixed(1)})`);
      } else {
        raw *= 0.5; // Weaken in ranging market
        details.push(`Weak/ranging (ADX ${adxVal.toFixed(1)})`);
      }
      factors++;

      // DI direction
      if (plusDi !== null && minusDi !== null) {
        const diDiff = plusDi - minusDi;
        raw += clamp(diDiff * 0.5, -20, 20);
        if (diDiff > 0) details.push(`+DI (${plusDi.toFixed(1)}) > -DI (${minusDi.toFixed(1)})`);
        else details.push(`-DI (${minusDi.toFixed(1)}) > +DI (${plusDi.toFixed(1)})`);
      }
    }
  }

  // --- SuperTrend direction ---
  const stData = indicators.supertrend?.values;
  if (stData) {
    const stDir = lastValue(stData.direction);
    if (stDir !== null && stDir !== undefined) {
      if (stDir === 1) {
        raw += 20;
        details.push('SuperTrend bullish');
      } else if (stDir === -1) {
        raw -= 20;
        details.push('SuperTrend bearish');
      }
      factors++;
    }
  }

  if (factors === 0) {
    return { score: 0, direction: 'neutral', details: ['No trend indicators available'] };
  }

  const { score, direction } = normalizeDirection(raw);
  return { score: clamp(score), direction, details };
}

/**
 * Momentum Score (weight: 20)
 * Uses: RSI, MACD, Stochastic, CCI, Williams%R.
 */
export function analyzeMomentumScore(indicators) {
  const details = [];
  let raw = 0;
  let factors = 0;

  // --- RSI ---
  const rsi = indicators.rsi?.values;
  if (rsi) {
    const val = lastValue(rsi);
    if (val !== null && val !== undefined) {
      // RSI: 50 = neutral, > 70 = overbought, < 30 = oversold
      // Map: 0-30 → strong buy, 30-50 → mild buy, 50-70 → mild sell, 70-100 → strong sell
      if (val < 30) {
        raw += 30;
        details.push(`RSI oversold (${val.toFixed(1)})`);
      } else if (val < 45) {
        raw += 15;
        details.push(`RSI bullish-bias (${val.toFixed(1)})`);
      } else if (val > 70) {
        raw -= 30;
        details.push(`RSI overbought (${val.toFixed(1)})`);
      } else if (val > 55) {
        raw -= 15;
        details.push(`RSI bearish-bias (${val.toFixed(1)})`);
      } else {
        details.push(`RSI neutral (${val.toFixed(1)})`);
      }
      factors++;
    }
  }

  // --- MACD ---
  const macd = indicators.macd?.values;
  if (macd) {
    const hist = lastValue(macd.histogram);
    const macdLine = lastValue(macd.macd);
    const signal = lastValue(macd.signal);

    if (hist !== null && hist !== undefined) {
      // Histogram direction and magnitude
      const absHist = Math.abs(hist);
      if (hist > 0) {
        raw += clamp(absHist * 20, 0, 25);
        details.push(`MACD histogram positive (${hist.toFixed(4)})`);
      } else {
        raw -= clamp(absHist * 20, 0, 25);
        details.push(`MACD histogram negative (${hist.toFixed(4)})`);
      }

      // MACD vs signal crossover
      if (macdLine !== null && signal !== null) {
        const prevMacd = macd.macd[macd.macd.length - 2];
        const prevSignal = macd.signal[macd.signal.length - 2];
        if (prevMacd !== null && prevSignal !== null) {
          if (prevMacd <= prevSignal && macdLine > signal) {
            raw += 15;
            details.push('MACD bullish crossover');
          } else if (prevMacd >= prevSignal && macdLine < signal) {
            raw -= 15;
            details.push('MACD bearish crossover');
          }
        }
      }
      factors++;
    }
  }

  // --- Stochastic ---
  const stoch = indicators.stochastic?.values;
  if (stoch) {
    const k = lastValue(stoch.k);
    const d = lastValue(stoch.d);
    if (k !== null && k !== undefined) {
      if (k < 20) {
        raw += 20;
        details.push(`Stochastic oversold (%K=${k.toFixed(1)})`);
      } else if (k > 80) {
        raw -= 20;
        details.push(`Stochastic overbought (%K=${k.toFixed(1)})`);
      } else if (k < 40) {
        raw += 10;
      } else if (k > 60) {
        raw -= 10;
      }

      // %K / %D crossover
      if (d !== null && d !== undefined) {
        const prevK = stoch.k[stoch.k.length - 2];
        const prevD = stoch.d[stoch.d.length - 2];
        if (prevK !== null && prevD !== null) {
          if (prevK <= prevD && k > d) {
            raw += 10;
            details.push('Stochastic bullish crossover');
          } else if (prevK >= prevD && k < d) {
            raw -= 10;
            details.push('Stochastic bearish crossover');
          }
        }
      }
      factors++;
    }
  }

  // --- CCI ---
  const cci = indicators.cci?.values;
  if (cci) {
    const val = lastValue(cci);
    if (val !== null && val !== undefined) {
      if (val < -100) {
        raw += 15;
        details.push(`CCI oversold (${val.toFixed(1)})`);
      } else if (val > 100) {
        raw -= 15;
        details.push(`CCI overbought (${val.toFixed(1)})`);
      } else if (val < 0) {
        raw += 5;
      } else if (val > 0) {
        raw -= 5;
      }
      factors++;
    }
  }

  // --- Williams %R ---
  const wr = indicators.williamsR?.values;
  if (wr) {
    const val = lastValue(wr);
    if (val !== null && val !== undefined) {
      if (val > -20) {
        raw -= 15;
        details.push(`Williams %R overbought (${val.toFixed(1)})`);
      } else if (val < -80) {
        raw += 15;
        details.push(`Williams %R oversold (${val.toFixed(1)})`);
      }
      factors++;
    }
  }

  if (factors === 0) {
    return { score: 0, direction: 'neutral', details: ['No momentum indicators available'] };
  }

  const { score, direction } = normalizeDirection(raw);
  return { score: clamp(score), direction, details };
}

/**
 * Volume Score (weight: 15)
 * Uses: OBV, MFI, VWAP, volume trend.
 */
export function analyzeVolumeScore(indicators, candles) {
  const details = [];
  let raw = 0;
  let factors = 0;

  // --- OBV trend ---
  const obv = indicators.obv?.values;
  if (obv && obv.length >= 20) {
    const current = obv[obv.length - 1];
    const prev = obv[obv.length - 20];
    if (current !== null && prev !== null) {
      const trend = current - prev;
      if (trend > 0) {
        raw += 25;
        details.push('OBV trending up (accumulation)');
      } else {
        raw -= 25;
        details.push('OBV trending down (distribution)');
      }
      factors++;
    }
  }

  // --- MFI ---
  const mfi = indicators.mfi?.values;
  if (mfi) {
    const val = lastValue(mfi);
    if (val !== null && val !== undefined) {
      if (val < 20) {
        raw += 20;
        details.push(`MFI oversold (${val.toFixed(1)})`);
      } else if (val > 80) {
        raw -= 20;
        details.push(`MFI overbought (${val.toFixed(1)})`);
      } else if (val < 40) {
        raw += 10;
      } else if (val > 60) {
        raw -= 10;
      }
      factors++;
    }
  }

  // --- VWAP position ---
  const vwap = indicators.vwap?.values;
  if (vwap && candles.length > 0) {
    const vwapVal = lastValue(vwap);
    const price = candles[candles.length - 1].close;
    if (vwapVal !== null && vwapVal > 0) {
      if (price > vwapVal) {
        raw += 20;
        details.push(`Price above VWAP (${((price - vwapVal) / vwapVal * 100).toFixed(2)}%)`);
      } else {
        raw -= 20;
        details.push(`Price below VWAP (${((vwapVal - price) / vwapVal * 100).toFixed(2)}%)`);
      }
      factors++;
    }
  }

  // --- Volume trend (current vs 20-bar average) ---
  if (candles.length >= 20) {
    const recentVol = candles.slice(-20).map((c) => c.volume);
    const avgVol = recentVol.reduce((a, b) => a + b, 0) / 20;
    const currentVol = candles[candles.length - 1].volume;
    const ratio = currentVol / avgVol;

    if (ratio > 1.5) {
      details.push(`High volume (${ratio.toFixed(1)}x avg)`);
      // Volume confirms the prevailing direction — we'll just note it
    } else if (ratio < 0.5) {
      details.push('Low volume (reduced conviction)');
      raw *= 0.7; // Reduce confidence on low volume
    } else {
      details.push(`Normal volume (${ratio.toFixed(1)}x avg)`);
    }
    factors++;
  }

  if (factors === 0) {
    return { score: 0, direction: 'neutral', details: ['No volume indicators available'] };
  }

  const { score, direction } = normalizeDirection(raw);
  return { score: clamp(score), direction, details };
}

/**
 * Structure Score (weight: 15)
 * Uses: market structure (BOS/CHoCH), patterns, S/R levels.
 */
export function analyzeStructureScore(indicators, candles) {
  const details = [];
  let raw = 0;
  let factors = 0;

  // --- Market Structure: BOS / CHoCH ---
  const ms = indicators.marketStructure?.values;
  if (ms) {
    // Look at recent bars (last 10)
    const lookback = 10;
    const start = Math.max(0, ms.bos.length - lookback);
    let recentBosBull = 0, recentBosBear = 0;
    let recentChochBull = 0, recentChochBear = 0;

    for (let i = start; i < ms.bos.length; i++) {
      if (ms.bos[i] === 1) recentBosBull++;
      if (ms.bos[i] === -1) recentBosBear++;
      if (ms.choch[i] === 1) recentChochBull++;
      if (ms.choch[i] === -1) recentChochBear++;
    }

    // CHoCH is the strongest signal
    if (recentChochBull > 0) {
      raw += 30;
      details.push('Bullish CHoCH detected');
    } else if (recentChochBear > 0) {
      raw -= 30;
      details.push('Bearish CHoCH detected');
    }

    // BOS
    if (recentBosBull > recentBosBear) {
      raw += 15;
      details.push(`${recentBosBull} bullish BOS`);
    } else if (recentBosBear > recentBosBull) {
      raw -= 15;
      details.push(`${recentBosBear} bearish BOS`);
    }

    // HH/HL/LH/LL count
    const structureArr = ms.structure;
    if (structureArr) {
      const sStart = Math.max(0, structureArr.length - 20);
      let hh = 0, hl = 0, lh = 0, ll = 0;
      for (let i = sStart; i < structureArr.length; i++) {
        if (structureArr[i] === 1) hh++;
        if (structureArr[i] === 2) hl++;
        if (structureArr[i] === -1) lh++;
        if (structureArr[i] === -2) ll++;
      }
      if (hh + hl > lh + ll) {
        raw += 10;
        details.push(`Bullish structure (${hh}HH ${hl}HL)`);
      } else if (lh + ll > hh + hl) {
        raw -= 10;
        details.push(`Bearish structure (${lh}LH ${ll}LL)`);
      }
    }
    factors++;
  }

  // --- Candlestick / Chart patterns ---
  const patterns = indicators.patterns?.values;
  if (patterns) {
    const lookback = 5;
    const start = Math.max(0, patterns.pattern.length - lookback);
    let bullishPatterns = 0;
    let bearishPatterns = 0;
    const patternNames = [];

    for (let i = start; i < patterns.pattern.length; i++) {
      if (patterns.bullish[i] === true) {
        bullishPatterns++;
        if (patterns.pattern[i]) patternNames.push(patterns.pattern[i]);
      } else if (patterns.bullish[i] === false) {
        bearishPatterns++;
        if (patterns.pattern[i]) patternNames.push(patterns.pattern[i]);
      }
    }

    if (bullishPatterns > 0) {
      raw += 15 * Math.min(bullishPatterns, 3);
      details.push(`Bullish patterns: ${patternNames.filter((_, idx) => idx % 2 === 0).slice(0, 2).join(', ')}`);
    }
    if (bearishPatterns > 0) {
      raw -= 15 * Math.min(bearishPatterns, 3);
      details.push(`Bearish patterns: ${patternNames.filter((_, idx) => idx % 2 === 1).slice(0, 2).join(', ')}`);
    }
    factors++;
  }

  // --- Support / Resistance proximity ---
  const sr = indicators.supportResistance?.values;
  if (sr && candles && candles.length > 0) {
    const lastPrice = candles[candles.length - 1].close;
    const support = lastValue(sr.nearestSupport);
    const resistance = lastValue(sr.nearestResistance);

    if (support !== null && resistance !== null) {
      const srRange = resistance - support;
      if (srRange > 0) {
        const position = (lastPrice - support) / srRange; // 0 = at support, 1 = at resistance
        if (position < 0.15) {
          raw += 15;
          details.push(`Price near support (${support.toFixed(2)})`);
        } else if (position > 0.85) {
          raw -= 15;
          details.push(`Price near resistance (${resistance.toFixed(2)})`);
        }
      }
    }
    factors++;
  }

  if (factors === 0) {
    return { score: 0, direction: 'neutral', details: ['No structure indicators available'] };
  }

  const { score, direction } = normalizeDirection(raw);
  return { score: clamp(score), direction, details };
}

/**
 * Price Action Score (weight: 15)
 * Uses: candlestick patterns (pin bars, engulfing), body/wick analysis.
 */
export function analyzePriceActionScore(indicators, candles) {
  const details = [];
  let raw = 0;
  let factors = 0;

  if (candles.length < 3) {
    return { score: 0, direction: 'neutral', details: ['Insufficient candles for price action analysis'] };
  }

  // --- Candlestick patterns from patterns indicator ---
  const patterns = indicators.patterns?.values;
  if (patterns) {
    const i = patterns.pattern.length - 1;
    if (patterns.pattern[i]) {
      if (patterns.bullish[i] === true) {
        raw += 25;
        details.push(`Bullish pattern: ${patterns.pattern[i]}`);
      } else if (patterns.bullish[i] === false) {
        raw -= 25;
        details.push(`Bearish pattern: ${patterns.pattern[i]}`);
      }
      factors++;
    }
  }

  // --- Direct candlestick analysis (last 3 candles) ---
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const prev2 = candles[candles.length - 3];

  // Body analysis
  const bodySize = Math.abs(last.close - last.open);
  const range = last.high - last.low;
  const bodyRatio = range > 0 ? bodySize / range : 0;
  const isBullish = last.close > last.open;
  const isBearish = last.close < last.open;

  // Pin bar detection
  const upperWick = last.high - Math.max(last.open, last.close);
  const lowerWick = Math.min(last.open, last.close) - last.low;

  if (lowerWick > range * 0.6 && upperWick < range * 0.1) {
    raw += 20;
    details.push('Bullish pin bar (long lower wick)');
    factors++;
  } else if (upperWick > range * 0.6 && lowerWick < range * 0.1) {
    raw -= 20;
    details.push('Bearish pin bar (long upper wick)');
    factors++;
  }

  // Engulfing
  if (prev) {
    const prevBody = Math.abs(prev.close - prev.open);
    const prevBullish = prev.close > prev.open;

    if (prevBearish !== undefined && isBullish && last.open <= prev.close && last.close >= prev.open && bodySize > prevBody) {
      raw += 20;
      details.push('Bullish engulfing');
      factors++;
    } else if (prevBullish && isBearish && last.open >= prev.close && last.close <= prev.open && bodySize > prevBody) {
      raw -= 20;
      details.push('Bearish engulfing');
      factors++;
    }
  }

  // Consecutive candles direction
  if (prev && prev2) {
    const allBull = isBullish && prev.close > prev.open && prev2.close > prev2.open;
    const allBear = isBearish && prev.close < prev.open && prev2.close < prev2.open;
    if (allBull) {
      raw += 10;
      details.push('3 consecutive bullish candles');
    } else if (allBear) {
      raw -= 10;
      details.push('3 consecutive bearish candles');
    }
    factors++;
  }

  // Doji (indecision)
  if (bodyRatio < 0.1 && range > 0) {
    raw *= 0.5;
    details.push('Doji (indecision) — reducing confidence');
    factors++;
  }

  if (factors === 0) {
    return { score: 0, direction: 'neutral', details: ['No price action signals'] };
  }

  const { score, direction } = normalizeDirection(raw);
  return { score: clamp(score), direction, details };
}

/**
 * Volatility Score (weight: 10)
 * Uses: ATR, Bollinger Band width, Keltner Channel width.
 *
 * Higher ATR relative to price = more volatile = bigger moves possible.
 * Bollinger Band width expansion = increasing volatility (confirms moves).
 * Keltner contraction/expansion relative to Bollinger = squeeze/expansion.
 */
export function analyzeVolatilityScore(indicators) {
  const details = [];
  let score = 50; // Base neutral score
  let factors = 0;

  // --- ATR ---
  const atr = indicators.atr?.values;
  if (atr) {
    const atrVal = lastValue(atr);
    if (atrVal !== null && atrVal !== undefined && atr.length >= 20) {
      // Compare current ATR to 20-bar average ATR
      const atrSlice = atr.slice(-20).filter((v) => v !== null);
      if (atrSlice.length >= 10) {
        const avgATR = atrSlice.reduce((a, b) => a + b, 0) / atrSlice.length;
        const atrRatio = atrVal / avgATR;

        if (atrRatio > 1.3) {
          details.push(`ATR expanding (${atrRatio.toFixed(2)}x avg) — high volatility`);
          score = 70; // Higher volatility = stronger moves
        } else if (atrRatio < 0.7) {
          details.push(`ATR contracting (${atrRatio.toFixed(2)}x avg) — low volatility`);
          score = 30; // Low volatility = weaker moves expected
        } else {
          details.push(`ATR normal (${atrRatio.toFixed(2)}x avg)`);
          score = 50;
        }
        factors++;
      }
    }
  }

  // --- Bollinger Band width ---
  const bb = indicators.bollinger?.values;
  if (bb) {
    const upper = lastValue(bb.upper);
    const lower = lastValue(bb.lower);
    const middle = lastValue(bb.middle);

    if (upper !== null && lower !== null && middle !== null && middle > 0) {
      const bbWidth = (upper - lower) / middle;

      // Check BB width trend (compare to 10 bars ago)
      const prevIdx = bb.upper.length - 11;
      if (prevIdx >= 0 && bb.upper[prevIdx] !== null && bb.lower[prevIdx] !== null && bb.middle[prevIdx] !== null && bb.middle[prevIdx] > 0) {
        const prevWidth = (bb.upper[prevIdx] - bb.lower[prevIdx]) / bb.middle[prevIdx];
        if (bbWidth > prevWidth * 1.1) {
          details.push('Bollinger Bands expanding');
          score = Math.min(100, score + 10);
        } else if (bbWidth < prevWidth * 0.9) {
          details.push('Bollinger Bands contracting (squeeze)');
          score = Math.max(0, score - 10);
        }
      }

      details.push(`BB width ${(bbWidth * 100).toFixed(2)}%`);
      factors++;
    }
  }

  // --- Keltner vs Bollinger (squeeze detection) ---
  const keltner = indicators.keltner?.values;
  if (bb && keltner) {
    const i = bb.upper.length - 1;
    if (
      bb.upper[i] !== null && bb.lower[i] !== null &&
      keltner.upper[i] !== null && keltner.lower[i] !== null
    ) {
      const inSqueeze = bb.upper[i] < keltner.upper[i] && bb.lower[i] > keltner.lower[i];
      if (inSqueeze) {
        details.push('Bollinger inside Keltner (squeeze) — potential breakout ahead');
        score = 60; // Squeeze = potential energy
      }
      factors++;
    }
  }

  if (factors === 0) {
    return { score: 50, direction: 'neutral', details: ['No volatility indicators available'] };
  }

  return { score: clamp(score), direction: 'neutral', details };
}

// ---------------------------------------------------------------------------
// Conflict detection
// ---------------------------------------------------------------------------

/**
 * Detect conflicts between scoring categories.
 * Returns an array of conflict description strings.
 */
function detectConflicts(scores) {
  const conflicts = [];
  const categories = Object.keys(scores);

  for (let a = 0; a < categories.length; a++) {
    for (let b = a + 1; b < categories.length; b++) {
      const catA = scores[categories[a]];
      const catB = scores[categories[b]];

      if (catA.direction === 'long' && catB.direction === 'short' && catA.score > 40 && catB.score > 40) {
        conflicts.push(
          `${categories[a]} says LONG (${catA.score}) but ${categories[b]} says SHORT (${catB.score})`
        );
      }
    }
  }

  return conflicts;
}

// ---------------------------------------------------------------------------
// Main signal generation
// ---------------------------------------------------------------------------

/**
 * Generate a composite trading signal from multi-factor analysis.
 *
 * @param {Array} candles — Array of OHLCV candles
 * @param {Record<string, {values: any, metadata: any}>} indicators — Pre-computed indicators
 * @param {Record<string, any>} [strategies] — Optional strategy configs to also run
 * @param {Record<string, any>} [config] — Optional config overrides
 * @returns {{
 *   direction: 'long'|'short'|'no_trade',
 *   score: number,
 *   breakdown: {trend:number, momentum:number, volume:number, structure:number, priceAction:number, volatility:number},
 *   conflicts: string[],
 *   confidence: number,
 *   reasoning: string,
 *   timestamp: number
 * }}
 */
export function generateSignal(candles, indicators, strategies = {}, config = {}) {
  const minScore = config.minScore ?? 40;
  const weights = { ...SCORING_WEIGHTS, ...config.weights };

  // Run each category scorer
  const trendResult = analyzeTrendScore(indicators, candles);
  const momentumResult = analyzeMomentumScore(indicators);
  const volumeResult = analyzeVolumeScore(indicators, candles);
  const structureResult = analyzeStructureScore(indicators, candles);
  const priceActionResult = analyzePriceActionScore(indicators, candles);
  const volatilityResult = analyzeVolatilityScore(indicators);

  const scores = {
    trend: trendResult,
    momentum: momentumResult,
    volume: volumeResult,
    structure: structureResult,
  priceAction: priceActionResult,
    volatility: volatilityResult,
  };

  // Detect conflicts
  const conflicts = detectConflicts(scores);

  // Weighted composite calculation
  // For direction: sum weighted directional scores (positive = long, negative = short)
  let compositeRaw = 0;
  const breakdown = {};

  for (const [category, result] of Object.entries(scores)) {
    const weight = weights[category] ?? 0;
    const weightedScore = (result.score / 100) * weight;
    breakdown[category] = Math.round(result.score);

    if (result.direction === 'long') {
      compositeRaw += weightedScore;
    } else if (result.direction === 'short') {
      compositeRaw -= weightedScore;
    }
    // neutral categories add 0
  }

  // Also run strategies if provided and add their influence
  let strategyInfluence = { long: 0, short: 0, count: 0 };
  if (strategies && typeof strategies === 'object') {
    for (const [name, strategyConfig] of Object.entries(strategies)) {
      if (strategyConfig && strategyConfig.enabled !== false) {
        try {
          const result = analyzeStrategy(name, candles, indicators, strategyConfig.config);
          if (result.direction === 'long') {
            strategyInfluence.long += result.strength;
          } else if (result.direction === 'short') {
            strategyInfluence.short += result.strength;
          }
          strategyInfluence.count++;
        } catch (e) {
          // Strategy not found or error — skip
        }
      }
    }
  }

  // Add strategy consensus as a modifier
  if (strategyInfluence.count > 0) {
    const netStrategy = strategyInfluence.long - strategyInfluence.short;
    const strategyMax = Math.max(strategyInfluence.long + strategyInfluence.short, 1);
    const strategyBias = (netStrategy / strategyMax) * 15; // Up to ±15 points
    compositeRaw += strategyBias;
  }

  // Conflict penalty: reduce score by 5 points per conflict
  const conflictPenalty = conflicts.length * 5;
  compositeRaw = compositeRaw > 0
    ? Math.max(0, compositeRaw - conflictPenalty)
    : Math.min(0, compositeRaw + conflictPenalty);

  // Final score and direction
  const absScore = Math.abs(compositeRaw);
  const normalizedScore = Math.round(clamp(absScore * (100 / WEIGHT_TOTAL), 0, 100));

  let direction = 'no_trade';
  if (compositeRaw > 0 && normalizedScore >= minScore) direction = 'long';
  else if (compositeRaw < 0 && normalizedScore >= minScore) direction = 'short';

  // Confidence: based on agreement between categories and strategy consensus
  const directions = Object.values(scores).map((s) => s.direction);
  const longCount = directions.filter((d) => d === 'long').length;
  const shortCount = directions.filter((d) => d === 'short').length;
  const neutralCount = directions.filter((d) => d === 'neutral').length;
  const maxDirCount = Math.max(longCount, shortCount);
  const confidence = Math.round((maxDirCount / directions.length) * 100 * (normalizedScore / 100));

  // Build reasoning
  const allDetails = [];
  for (const [cat, result] of Object.entries(scores)) {
    if (result.details.length > 0) {
      const dirLabel = result.direction === 'long' ? '↑' : result.direction === 'short' ? '↓' : '→';
      allDetails.push(`[${cat}${dirLabel} ${breakdown[cat]}] ${result.details[0]}`);
    }
  }

  if (conflicts.length > 0) {
    allDetails.push(`⚠ Conflicts: ${conflicts.length}`);
  }

  if (strategyInfluence.count > 0) {
    allDetails.push(
      `Strategies: ${strategyInfluence.long}L / ${strategyInfluence.short}S (${strategyInfluence.count} total)`
    );
  }

  return {
    direction,
    score: normalizedScore,
    breakdown,
    conflicts,
    confidence: clamp(confidence),
    reasoning: allDetails.join(' | '),
    timestamp: Date.now(),
  };
}

export default {
  SCORING_WEIGHTS,
  generateSignal,
  analyzeTrendScore,
  analyzeMomentumScore,
  analyzeVolumeScore,
  analyzeStructureScore,
  analyzePriceActionScore,
  analyzeVolatilityScore,
};
