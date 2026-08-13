/**
 * SuperTrend
 * Basic Bands:
 *   Upper Band = (H + L) / 2 + multiplier * ATR
 *   Lower Band = (H + L) / 2 - multiplier * ATR
 * ATR uses Wilder's smoothing.
 * Direction: 1 (uptrend, price above supertrend), -1 (downtrend, price below supertrend)
 */
export default function supertrend(candles, config = {}) {
  const period = config.period ?? 10;
  const multiplier = config.multiplier ?? 3;
  const n = candles.length;

  const supertrendLine = new Array(n).fill(null);
  const direction = new Array(n).fill(null);

  if (n < 2) {
    return {
      values: { supertrend: supertrendLine, direction },
      metadata: { period, multiplier },
    };
  }

  // Calculate True Range
  const tr = new Array(n).fill(0);
  tr[0] = candles[0].high - candles[0].low;
  for (let i = 1; i < n; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    tr[i] = Math.max(hl, hc, lc);
  }

  if (n < period) {
    return {
      values: { supertrend: supertrendLine, direction },
      metadata: { period, multiplier },
    };
  }

  // ATR with Wilder's smoothing
  let atrSum = 0;
  for (let i = 0; i < period; i++) atrSum += tr[i];
  let atrVal = atrSum / period;

  // Basic upper and lower bands
  function basicBands(i, atr) {
    const mid = (candles[i].high + candles[i].low) / 2;
    return {
      upper: mid + multiplier * atr,
      lower: mid - multiplier * atr,
    };
  }

  let { upper: prevUpper, lower: prevLower } = basicBands(period - 1, atrVal);
  let prevSt = prevLower; // initial supertrend
  let prevDir = 1; // start assuming uptrend

  supertrendLine[period - 1] = prevSt;
  direction[period - 1] = prevDir;

  for (let i = period; i < n; i++) {
    // Wilder's ATR smoothing
    atrVal = (atrVal * (period - 1) + tr[i]) / period;

    let { upper: currUpper, lower: currLower } = basicBands(i, atrVal);

    // Adjust bands: upper band can only decrease, lower band can only increase
    currLower = currLower > prevLower || candles[i - 1].close < prevLower ? currLower : prevLower;
    currUpper = currUpper < prevUpper || candles[i - 1].close > prevUpper ? currUpper : prevUpper;

    // Determine direction
    let dir;
    if (prevSt === prevUpper) {
      dir = candles[i].close > currUpper ? 1 : -1;
    } else {
      dir = candles[i].close < currLower ? -1 : 1;
    }

    let st;
    if (dir === 1) {
      st = currLower;
    } else {
      st = currUpper;
    }

    supertrendLine[i] = st;
    direction[i] = dir;

    prevUpper = currUpper;
    prevLower = currLower;
    prevSt = st;
    prevDir = dir;
  }

  return {
    values: { supertrend: supertrendLine, direction },
    metadata: { period, multiplier },
  };
}
