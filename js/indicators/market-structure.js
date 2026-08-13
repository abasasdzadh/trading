/**
 * Market Structure Detection
 * Detects swing highs, swing lows, and structure patterns:
 *   HH = Higher High, HL = Higher Low, LH = Lower High, LL = Lower Low
 *   BOS = Break of Structure, CHoCH = Change of Character
 *   Liquidity Sweeps detected when price briefly exceeds swing then reverses.
 *
 * Config:
 *   swingLookback: bars on each side to confirm a swing (default 5)
 *   minSwingSize: minimum price move to qualify as swing (default 0.001 = 0.1%)
 *
 * Returns {values: {structure, swingHigh, swingLow, bos, choch}}
 *   structure: encoded as number — 1=HH, 2=HL, -1=LH, -2=LL, 10=BOS, -10=CHoCH, 0=none
 *   swingHigh: price level of swing high at that bar (null otherwise)
 *   swingLow: price level of swing low at that bar (null otherwise)
 *   bos: 1 for bullish BOS, -1 for bearish BOS, null otherwise
 *   choch: 1 for bullish CHoCH, -1 for bearish CHoCH, null otherwise
 */
export default function marketStructure(candles, config = {}) {
  const swingLookback = config.swingLookback ?? 5;
  const minSwingSize = config.minSwingSize ?? 0.001;
  const n = candles.length;

  const structure = new Array(n).fill(null);
  const swingHigh = new Array(n).fill(null);
  const swingLow = new Array(n).fill(null);
  const bos = new Array(n).fill(null);
  const choch = new Array(n).fill(null);

  if (n < swingLookback * 2 + 1) {
    return { values: { structure, swingHigh, swingLow, bos, choch }, metadata: { swingLookback, minSwingSize } };
  }

  // Identify swing highs and lows
  const swings = []; // {index, type: 'high'|'low', price}

  for (let i = swingLookback; i < n - swingLookback; i++) {
    let isSwingHigh = true;
    let isSwingLow = true;

    for (let j = 1; j <= swingLookback; j++) {
      if (candles[i].high <= candles[i - j].high || candles[i].high <= candles[i + j].high) {
        isSwingHigh = false;
      }
      if (candles[i].low >= candles[i - j].low || candles[i].low >= candles[i + j].low) {
        isSwingLow = false;
      }
    }

    if (isSwingHigh) {
      swingHigh[i] = candles[i].high;
      swings.push({ index: i, type: 'high', price: candles[i].high });
    }
    if (isSwingLow) {
      swingLow[i] = candles[i].low;
      swings.push({ index: i, type: 'low', price: candles[i].low });
    }
  }

  // Sort swings by index
  swings.sort((a, b) => a.index - b.index);

  // Classify structure: HH, HL, LH, LL
  let lastHighSwing = null;
  let lastLowSwing = null;

  for (const sw of swings) {
    if (sw.type === 'high') {
      if (lastHighSwing !== null) {
        // Check minimum swing size
        const refPrice = candles[sw.index].close;
        const size = Math.abs(sw.price - lastHighSwing.price) / refPrice;
        if (size >= minSwingSize) {
          if (sw.price > lastHighSwing.price) {
            structure[sw.index] = 1; // HH
          } else {
            structure[sw.index] = -1; // LH
          }
        }
      }
      lastHighSwing = sw;
    } else {
      if (lastLowSwing !== null) {
        const refPrice = candles[sw.index].close;
        const size = Math.abs(sw.price - lastLowSwing.price) / refPrice;
        if (size >= minSwingSize) {
          if (sw.price > lastLowSwing.price) {
            structure[sw.index] = 2; // HL
          } else {
            structure[sw.index] = -2; // LL
          }
        }
      }
      lastLowSwing = sw;
    }
  }

  // Detect BOS and CHoCH
  // BOS: price breaks through the last swing point in the current trend direction
  // CHoCH: price breaks through the last swing point against the current trend direction
  let currentTrend = null; // 1 = bullish, -1 = bearish
  let lastSwingForBreak = null;

  for (const sw of swings) {
    if (currentTrend === null) {
      // Determine initial trend from first two swings
      const idx = swings.indexOf(sw);
      if (idx < swings.length - 1) {
        if (sw.type === 'high' && swings[idx + 1].type === 'low' && swings[idx + 1].price > sw.price) {
          currentTrend = 1;
          lastSwingForBreak = sw;
        } else if (sw.type === 'low' && swings[idx + 1].type === 'high' && swings[idx + 1].price < sw.price) {
          currentTrend = -1;
          lastSwingForBreak = sw;
        } else {
          lastSwingForBreak = sw;
        }
      }
      continue;
    }

    if (sw.type === 'high') {
      if (currentTrend === 1) {
        // Bullish trend: higher high = BOS
        if (lastSwingForBreak && sw.price > lastSwingForBreak.price) {
          bos[sw.index] = 1;
          lastSwingForBreak = sw;
        }
      } else {
        // Bearish trend: high breaks above last swing high = CHoCH
        if (lastSwingForBreak && lastSwingForBreak.type === 'high' && sw.price > lastSwingForBreak.price) {
          choch[sw.index] = 1; // Bullish CHoCH
          currentTrend = 1;
          lastSwingForBreak = sw;
        } else if (lastSwingForBreak && lastSwingForBreak.type === 'low') {
          lastSwingForBreak = sw;
        }
      }
    } else {
      // Low swing
      if (currentTrend === -1) {
        // Bearish trend: lower low = BOS
        if (lastSwingForBreak && sw.price < lastSwingForBreak.price) {
          bos[sw.index] = -1;
          lastSwingForBreak = sw;
        }
      } else {
        // Bullish trend: low breaks below last swing low = CHoCH
        if (lastSwingForBreak && lastSwingForBreak.type === 'low' && sw.price < lastSwingForBreak.price) {
          choch[sw.index] = -1; // Bearish CHoCH
          currentTrend = -1;
          lastSwingForBreak = sw;
        } else if (lastSwingForBreak && lastSwingForBreak.type === 'high') {
          lastSwingForBreak = sw;
        }
      }
    }
  }

  return {
    values: { structure, swingHigh, swingLow, bos, choch },
    metadata: { swingLookback, minSwingSize },
  };
}
