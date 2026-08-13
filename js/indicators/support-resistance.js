/**
 * Support/Resistance Zone Detection
 *
 * Algorithm:
 * 1. Identify potential zones by clustering price levels where touches occur.
 * 2. A "touch" is when high or low is within touchThreshold of a zone.
 * 3. Zones with >= minTouches are valid.
 * 4. For each candle, support = nearest valid zone below current close.
 * 5. For each candle, resistance = nearest valid zone above current close.
 * 6. Also returns raw support/resistance arrays (zone level if price is near it).
 *
 * Config:
 *   lookback: number of recent candles to analyze (default 100)
 *   touchThreshold: price proximity to count as a touch, as fraction of price (default 0.001)
 *   minTouches: minimum number of touches to confirm a zone (default 2)
 */
export default function supportResistance(candles, config = {}) {
  const lookback = config.lookback ?? 100;
  const touchThreshold = config.touchThreshold ?? 0.001;
  const minTouches = config.minTouches ?? 2;
  const n = candles.length;

  const support = new Array(n).fill(null);
  const resistance = new Array(n).fill(null);
  const nearestSupport = new Array(n).fill(null);
  const nearestResistance = new Array(n).fill(null);

  if (n < 5) {
    return { values: { support, resistance, nearestSupport, nearestResistance }, metadata: {} };
  }

  // For each candle, compute zones from the lookback window ending at that candle
  // For performance, only compute for the last portion and fill forward
  const computeStart = Math.max(0, n - lookback);

  for (let i = computeStart; i < n; i++) {
    const windowStart = Math.max(0, i - lookback + 1);
    const window = candles.slice(windowStart, i + 1);
    const refPrice = candles[i].close;
    const threshold = refPrice * touchThreshold;

    // Collect all potential zone levels from highs and lows
    const levels = [];
    for (const c of window) {
      levels.push(c.high);
      levels.push(c.low);
    }

    // Cluster levels into zones
    // Sort levels
    levels.sort((a, b) => a - b);

    // Merge close levels into zones
    const zones = []; // {level, touches}
    for (const level of levels) {
      let merged = false;
      for (const zone of zones) {
        if (Math.abs(level - zone.level) <= threshold) {
          // Merge: update zone level to average and increment touches
          zone.level = (zone.level * zone.touches + level) / (zone.touches + 1);
          zone.touches++;
          merged = true;
          break;
        }
      }
      if (!merged) {
        zones.push({ level, touches: 1 });
      }
    }

    // Filter valid zones
    const validZones = zones.filter((z) => z.touches >= minTouches);

    // Find nearest support (below close) and resistance (above close)
 let bestSupport = null;
    let bestResistance = null;

    for (const zone of validZones) {
      if (zone.level < refPrice) {
        if (bestSupport === null || zone.level > bestSupport) {
          bestSupport = zone.level;
        }
      } else if (zone.level > refPrice) {
        if (bestResistance === null || zone.level < bestResistance) {
          bestResistance = zone.level;
        }
      }
    }

    nearestSupport[i] = bestSupport;
    nearestResistance[i] = bestResistance;

    // Mark support/resistance if price is near a zone
    for (const zone of validZones) {
      if (Math.abs(refPrice - zone.level) <= threshold) {
        if (zone.level < refPrice) {
          support[i] = zone.level;
        } else if (zone.level > refPrice) {
          resistance[i] = zone.level;
        }
      }
    }
  }

  return {
    values: { support, resistance, nearestSupport, nearestResistance },
    metadata: { lookback, touchThreshold, minTouches },
  };
}
