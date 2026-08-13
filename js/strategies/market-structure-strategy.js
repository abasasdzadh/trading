/**
 * Market Structure Strategy
 * ==========================
 * Uses HH/HL/LH/LL swing analysis + BOS/CHoCH detection.
 *
 * Config:
 *   swingLookback:  5  — Bars on each side to confirm a swing point
 *   requireCHoCH:   true — Only signal on CHoCH (stricter), or also BOS
 *
 * Long  on BOS/CHoCH in bullish structure (HH/HL pattern).
 * Short on BOS/CHoCH in bearish structure (LH/LL pattern).
 *
 * Task ID: 2-c
 */

/** Detect swing highs and lows. */
function detectSwings(candles, swingLookback) {
  const n = candles.length;
  const swings = [];

  for (let i = swingLookback; i < n - swingLookback; i++) {
    let isHigh = true;
    let isLow = true;

    for (let j = 1; j <= swingLookback; j++) {
      if (candles[i].high <= candles[i - j].high || candles[i].high <= candles[i + j].high) isHigh = false;
      if (candles[i].low >= candles[i - j].low || candles[i].low >= candles[i + j].low) isLow = false;
    }

    if (isHigh) swings.push({ index: i, type: 'high', price: candles[i].high });
    if (isLow) swings.push({ index: i, type: 'low', price: candles[i].low });
  }

  swings.sort((a, b) => a.index - b.index);
  return swings;
}

/** Classify structure and detect BOS/CHoCH from swings. */
function classifyStructure(swings, candles) {
  const n = candles.length;
  const bos = new Array(n).fill(null);
  const choch = new Array(n).fill(null);
  const structure = new Array(n).fill(null);

  // Track HH/HL/LH/LL
  let lastHigh = null;
  let lastLow = null;
  let currentTrend = null;

  for (const sw of swings) {
    if (sw.type === 'high') {
      if (lastHigh !== null) {
        if (sw.price > lastHigh.price) {
          structure[sw.index] = 1; // HH
        } else {
          structure[sw.index] = -1; // LH
        }
      }
      lastHigh = sw;
    } else {
      if (lastLow !== null) {
        if (sw.price > lastLow.price) {
          structure[sw.index] = 2; // HL
        } else {
          structure[sw.index] = -2; // LL
        }
      }
      lastLow = sw;
    }
  }

  // Detect BOS and CHoCH
  let lastSwingForBreak = null;
  lastHigh = null;
  lastLow = null;

  for (const sw of swings) {
    if (currentTrend === null) {
      const idx = swings.indexOf(sw);
      if (idx < swings.length - 1) {
        const next = swings[idx + 1];
        if (sw.type === 'high' && next.type === 'low' && next.price > sw.price) {
          currentTrend = 1;
        } else if (sw.type === 'low' && next.type === 'high' && next.price < sw.price) {
          currentTrend = -1;
        }
        lastSwingForBreak = sw;
      }
      continue;
    }

    if (sw.type === 'high') {
      if (currentTrend === 1) {
        if (lastSwingForBreak && sw.price > lastSwingForBreak.price) {
          bos[sw.index] = 1;
          lastSwingForBreak = sw;
        }
      } else {
        if (lastSwingForBreak && lastSwingForBreak.type === 'high' && sw.price > lastSwingForBreak.price) {
          choch[sw.index] = 1;
          currentTrend = 1;
          lastSwingForBreak = sw;
        } else if (lastSwingForBreak && lastSwingForBreak.type === 'low') {
          lastSwingForBreak = sw;
        }
      }
    } else {
      if (currentTrend === -1) {
        if (lastSwingForBreak && sw.price < lastSwingForBreak.price) {
          bos[sw.index] = -1;
          lastSwingForBreak = sw;
        }
      } else {
        if (lastSwingForBreak && lastSwingForBreak.type === 'low' && sw.price < lastSwingForBreak.price) {
          choch[sw.index] = -1;
          currentTrend = -1;
          lastSwingForBreak = sw;
        } else if (lastSwingForBreak && lastSwingForBreak.type === 'high') {
          lastSwingForBreak = sw;
        }
      }
    }
  }

  return { bos, choch, structure };
}

/**
 * @param {Array} candles
 * @param {Record<string,any>} indicators
 * @param {Record<string,any>} config
 * @returns {{direction:string, strength:number, reasoning:string}}
 */
function analyze(candles, indicators, config) {
  const { swingLookback = 5, requireCHoCH = true } = config;
  const n = candles.length;

  if (n < swingLookback * 2 + 10) {
    return {
      direction: 'no_trade',
      strength: 0,
      reasoning: `Not enough data. Need at least ${swingLookback * 2 + 10} candles for swing detection.`,
    };
  }

  const swings = detectSwings(candles, swingLookback);
  const { bos, choch, structure } = classifyStructure(swings, candles);

  if (swings.length < 4) {
    return {
      direction: 'no_trade',
      strength: 0,
      reasoning: `Only ${swings.length} swing points detected — insufficient for structure analysis.`,
    };
  }

  // Look at recent structure events (last 20 bars)
  const recentStart = Math.max(0, n - 20);
  let recentBOS = 0;
  let recentCHoCH = 0;
  let lastBOSDir = 0;
  let lastCHoCHDir = 0;
  let lastCHoCHIdx = -1;
  let lastBOSIdx = -1;

  // Count recent HH/HL/LH/LL
  let hh = 0, hl = 0, lh = 0, ll = 0;

  for (let j = recentStart; j < n; j++) {
    if (bos[j] === 1) { recentBOS++; lastBOSDir = 1; lastBOSIdx = j; }
    if (bos[j] === -1) { recentBOS++; lastBOSDir = -1; lastBOSIdx = j; }
    if (choch[j] === 1) { recentCHoCH++; lastCHoCHDir = 1; lastCHoCHIdx = j; }
    if (choch[j] === -1) { recentCHoCH++; lastCHoCHDir = -1; lastCHoCHIdx = j; }
    if (structure[j] === 1) hh++;
    if (structure[j] === 2) hl++;
    if (structure[j] === -1) lh++;
    if (structure[j] === -2) ll++;
  }

  // Determine the prevailing structure
  const bullishStructure = (hh + hl) > (lh + ll);
  const bearishStructure = (lh + ll) > (hh + hl);

  const reasons = [];

  // CHoCH is the primary signal
  if (lastCHoCHIdx >= recentStart && lastCHoCHIdx >= n - 5) {
    // Recent CHoCH (within last 5 bars)
    if (lastCHoCHDir === 1) {
      const strength = bullishStructure ? 85 : 70;
      reasons.push(`Bullish CHoCH at bar ${lastCHoCHIdx}`);
      reasons.push(`Structure: ${hh}HH ${hl}HL ${lh}LH ${ll}LL`);
      return {
        direction: 'long',
        strength,
        reasoning: `Market Structure BULLISH: ${reasons.join('; ')}.`,
      };
    }
    if (lastCHoCHDir === -1) {
      const strength = bearishStructure ? 85 : 70;
      reasons.push(`Bearish CHoCH at bar ${lastCHoCHIdx}`);
      reasons.push(`Structure: ${hh}HH ${hl}HL ${lh}LH ${ll}LL`);
      return {
        direction: 'short',
        strength,
        reasoning: `Market Structure BEARISH: ${reasons.join('; ')}.`,
      };
    }
  }

  // If requireCHoCH is false, also consider BOS
  if (!requireCHoCH && lastBOSIdx >= recentStart && lastBOSIdx >= n - 5) {
    if (lastBOSDir === 1 && bullishStructure) {
      return {
        direction: 'long',
        strength: 60,
        reasoning: `Bullish BOS in bullish structure (HH/HL). ${hh}HH ${hl}HL.`,
      };
    }
    if (lastBOSDir === -1 && bearishStructure) {
      return {
        direction: 'short',
        strength: 60,
        reasoning: `Bearish BOS in bearish structure (LH/LL). ${lh}LH ${ll}LL.`,
      };
    }
  }

  // No recent BOS/CHoCH — report structure context
  return {
    direction: 'no_trade',
    strength: 0,
    reasoning: `No recent BOS/CHoCH. Prevailing structure: ${bullishStructure ? 'BULLISH' : bearishStructure ? 'BEARISH' : 'NEUTRAL'} (${hh}HH ${hl}HL ${lh}LH ${ll}LL).`,
  };
}

export default {
  name: 'market_structure',
  label: 'Market Structure',
  description: 'Uses Higher High/Low, Lower High/Low pattern analysis with Break of Structure (BOS) and Change of Character (CHoCH) detection.',
  defaultConfig: { swingLookback: 5, requireCHoCH: true },
  analyze,
};
