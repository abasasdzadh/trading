/**
 * Candlestick + Chart Pattern Detection
 * Detects single-candle and multi-candle patterns.
 *
 * Candlestick patterns:
 *   Doji, Hammer, Shooting Star, Pin Bar,
 *   Bullish Engulfing, Bearish Engulfing,
 *   Bullish Harami, Bearish Harami,
 *   Morning Star, Evening Star,
 *   Three White Soldiers, Three Black Crows
 *
 * Chart patterns:
 *   Double Top, Double Bottom,
 *   Head & Shoulders (inverse too),
 *   Ascending Triangle, Descending Triangle,
 *   Rising Wedge, Falling Wedge
 *
 * Returns {values: {pattern: (string|null)[], bullish: (boolean|null)[]}}
 */
export default function patterns(candles, config = {}) {
  const n = candles.length;
  const pattern = new Array(n).fill(null);
  const bullish = new Array(n).fill(null);

  if (n < 3) {
    return { values: { pattern, bullish }, metadata: {} };
  }

  // --- Helper functions ---
  const bodySize = (c) => Math.abs(c.close - c.open);
  const upperWick = (c) => c.high - Math.max(c.open, c.close);
  const lowerWick = (c) => Math.min(c.open, c.close) - c.low;
  const fullRange = (c) => c.high - c.low;
  const isBullish = (c) => c.close > c.open;
  const isBearish = (c) => c.close < c.open;
  const avgBody = (count) => {
    let sum = 0;
    const start = Math.max(0, n - count);
    for (let i = start; i < n; i++) sum += bodySize(candles[i]);
    return sum / (n - start);
  };
  const avgRange = (count) => {
    let sum = 0;
    const start = Math.max(0, n - count);
    for (let i = start; i < n; i++) sum += fullRange(candles[i]);
    return sum / (n - start);
  };

  const avgBod = avgBody(Math.min(20, n));
  const avgRng = avgRange(Math.min(20, n));

  function setPattern(i, name, isBull) {
    pattern[i] = name;
    bullish[i] = isBull;
  }

  // --- Single candle patterns ---
  for (let i = 0; i < n; i++) {
    const c = candles[i];
    const bSize = bodySize(c);
    const uWick = upperWick(c);
    const lWick = lowerWick(c);
    const range = fullRange(c);

    if (range === 0) continue;

    // Doji: body is very small relative to range
    if (bSize / range < 0.1 && range > avgRng * 0.1) {
      setPattern(i, 'Doji', null);
      continue;
    }

    // Hammer: small body at top, long lower shadow (at least 2x body), very short upper shadow
    if (lWick >= bSize * 2 && uWick < bSize * 0.5 && bSize > 0) {
      setPattern(i, 'Hammer', true);
      continue;
    }

    // Shooting Star: small body at bottom, long upper shadow (at least 2x body), very short lower shadow
    if (uWick >= bSize * 2 && lWick < bSize * 0.5 && bSize > 0) {
      setPattern(i, 'Shooting Star', false);
      continue;
    }

    // Pin Bar (Bullish): long lower wick, small body, small upper wick
    if (lWick > range * 0.6 && uWick < range * 0.1 && bSize < range * 0.3) {
      setPattern(i, 'Pin Bar', true);
      continue;
    }

    // Pin Bar (Bearish): long upper wick, small body, small lower wick
    if (uWick > range * 0.6 && lWick < range * 0.1 && bSize < range * 0.3) {
      setPattern(i, 'Pin Bar', false);
      continue;
    }
  }

  // --- Multi-candle patterns ---
  for (let i = 1; i < n; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const prevBSize = bodySize(prev);
    const currBSize = bodySize(curr);

    // Bullish Engulfing: prev bearish, curr bullish, curr body engulfs prev body
    if (isBearish(prev) && isBullish(curr) &&
        curr.open <= prev.close && curr.close >= prev.open &&
        currBSize > prevBSize) {
      setPattern(i, 'Bullish Engulfing', true);
      continue;
    }

    // Bearish Engulfing: prev bullish, curr bearish, curr body engulfs prev body
    if (isBullish(prev) && isBearish(curr) &&
        curr.open >= prev.close && curr.close <= prev.open &&
        currBSize > prevBSize) {
      setPattern(i, 'Bearish Engulfing', false);
      continue;
    }

    // Bullish Harami: prev bearish (large), curr bullish (small), curr body inside prev body
    if (isBearish(prev) && isBullish(curr) &&
        curr.open > prev.close && curr.close < prev.open &&
        currBSize < prevBSize * 0.6) {
      setPattern(i, 'Bullish Harami', true);
      continue;
    }

    // Bearish Harami: prev bullish (large), curr bearish (small), curr body inside prev body
    if (isBullish(prev) && isBearish(curr) &&
        curr.open < prev.close && curr.close > prev.open &&
        currBSize < prevBSize * 0.6) {
      setPattern(i, 'Bearish Harami', false);
      continue;
    }
  }

  // --- Three-candle patterns ---
  for (let i = 2; i < n; i++) {
    const c0 = candles[i - 2];
    const c1 = candles[i - 1];
    const c2 = candles[i];

    // Morning Star: bearish, small body, bullish — reversal up
    if (isBearish(c0) && bodySize(c1) < bodySize(c0) * 0.3 && isBullish(c2) &&
        c2.close > (c0.open + c0.close) / 2 &&
        bodySize(c2) > bodySize(c0) * 0.5) {
      setPattern(i, 'Morning Star', true);
      continue;
    }

    // Evening Star: bullish, small body, bearish — reversal down
    if (isBullish(c0) && bodySize(c1) < bodySize(c0) * 0.3 && isBearish(c2) &&
        c2.close < (c0.open + c0.close) / 2 &&
        bodySize(c2) > bodySize(c0) * 0.5) {
      setPattern(i, 'Evening Star', false);
      continue;
    }

    // Three White Soldiers: three consecutive bullish candles, each opening within prev body
    if (isBullish(c0) && isBullish(c1) && isBullish(c2) &&
        c1.open > c0.open && c1.open < c0.close &&
        c2.open > c1.open && c2.open < c1.close &&
        c2.close > c1.close) {
      setPattern(i, 'Three White Soldiers', true);
      continue;
    }

    // Three Black Crows: three consecutive bearish candles, each opening within prev body
    if (isBearish(c0) && isBearish(c1) && isBearish(c2) &&
        c1.open < c0.open && c1.open > c0.close &&
        c2.open < c1.open && c2.open > c1.close &&
        c2.close < c1.close) {
      setPattern(i, 'Three Black Crows', false);
      continue;
    }
  }

  // --- Chart patterns (require more data) ---
  if (n >= 20) {
    const recent = candles.slice(-20);
    const recentN = recent.length;

    // Find local highs and lows in the recent window
    const localHighs = [];
    const localLows = [];

    for (let i = 2; i < recentN - 2; i++) {
      if (recent[i].high > recent[i - 1].high && recent[i].high > recent[i - 2].high &&
          recent[i].high > recent[i + 1].high && recent[i].high > recent[i + 2].high) {
        localHighs.push({ index: n - 20 + i, price: recent[i].high });
      }
      if (recent[i].low < recent[i - 1].low && recent[i].low < recent[i - 2].low &&
          recent[i].low < recent[i + 1].low && recent[i].low < recent[i + 2].low) {
        localLows.push({ index: n - 20 + i, price: recent[i].low });
      }
    }

    // Double Top: two highs at similar level with a trough between
    if (localHighs.length >= 2) {
      const h1 = localHighs[localHighs.length - 2];
      const h2 = localHighs[localHighs.length - 1];
      const threshold = avgRng * 0.5;
      if (Math.abs(h1.price - h2.price) < threshold && h2.index - h1.index >= 3) {
        setPattern(h2.index, 'Double Top', false);
      }
    }

    // Double Bottom: two lows at similar level with a peak between
    if (localLows.length >= 2) {
      const l1 = localLows[localLows.length - 2];
      const l2 = localLows[localLows.length - 1];
      const threshold = avgRng * 0.5;
      if (Math.abs(l1.price - l2.price) < threshold && l2.index - l1.index >= 3) {
        setPattern(l2.index, 'Double Bottom', true);
      }
    }

    // Head & Shoulders: three highs, middle one highest, two shoulders similar
    if (localHighs.length >= 3) {
      const h = localHighs.slice(-3);
      const threshold = avgRng * 0.5;
      if (h[1].price > h[0].price && h[1].price > h[2].price &&
          Math.abs(h[0].price - h[2].price) < threshold &&
          h[1].price - h[0].price > threshold) {
        setPattern(h[2].index, 'Head & Shoulders', false);
      }
      // Inverse Head & Shoulders
      if (h[1].price < h[0].price && h[1].price < h[2].price &&
          Math.abs(h[0].price - h[2].price) < threshold &&
          h[0].price - h[1].price > threshold) {
        setPattern(h[2].index, 'Inverse Head & Shoulders', true);
      }
    }

    // Ascending Triangle: flat top (similar highs) with rising lows
    if (localHighs.length >= 2 && localLows.length >= 2) {
      const highs = localHighs.slice(-3);
      const lows = localLows.slice(-3);
      const highThreshold = avgRng * 0.5;
      const highsFlat = highs.length >= 2 &&
        Math.abs(highs[highs.length - 1].price - highs[highs.length - 2].price) < highThreshold;
      const lowsRising = lows.length >= 2 &&
        lows[lows.length - 1].price > lows[lows.length - 2].price;
      if (highsFlat && lowsRising) {
        const lastIdx = Math.max(highs[highs.length - 1].index, lows[lows.length - 1].index);
        setPattern(lastIdx, 'Ascending Triangle', true);
      }

      // Descending Triangle: flat bottom (similar lows) with falling highs
      const lowsFlat = lows.length >= 2 &&
        Math.abs(lows[lows.length - 1].price - lows[lows.length - 2].price) < highThreshold;
      const highsFalling = highs.length >= 2 &&
        highs[highs.length - 1].price < highs[highs.length - 2].price;
      if (lowsFlat && highsFalling) {
        const lastIdx = Math.max(highs[highs.length - 1].index, lows[lows.length - 1].index);
        setPattern(lastIdx, 'Descending Triangle', false);
      }
    }

    // Rising Wedge: both highs and lows rising, converging
    if (localHighs.length >= 2 && localLows.length >= 2) {
      const hLast = localHighs[localHighs.length - 1];
      const hPrev = localHighs[localHighs.length - 2];
      const lLast = localLows[localLows.length - 1];
      const lPrev = localLows[localLows.length - 2];

      const highsRising = hLast.price > hPrev.price;
      const lowsRising = lLast.price > lPrev.price;
      // Converging: the range between high and low is narrowing
      const rangePrev = hPrev.price - lPrev.price;
      const rangeLast = hLast.price - lLast.price;
      const converging = rangeLast < rangePrev * 0.85;

      if (highsRising && lowsRising && converging) {
        const lastIdx = Math.max(hLast.index, lLast.index);
        setPattern(lastIdx, 'Rising Wedge', false);
      }

      // Falling Wedge: both highs and lows falling, converging
      const highsFalling = hLast.price < hPrev.price;
      const lowsFalling = lLast.price < lPrev.price;
      if (highsFalling && lowsFalling && converging) {
        const lastIdx = Math.max(hLast.index, lLast.index);
        setPattern(lastIdx, 'Falling Wedge', true);
      }
    }
  }

  return { values: { pattern, bullish }, metadata: {} };
}
