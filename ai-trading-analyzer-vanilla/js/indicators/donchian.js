/*
 * Donchian Channel
 * Upper = highest high over period
 * Lower = lowest low over period
 * Middle = (Upper + Lower) / 2
 */
export default function donchian(candles, config = {}) {
  const period = config.period ?? 20;
  const n = candles.length;

  const upper = new Array(n).fill(null);
  const middle = new Array(n).fill(null);
  const lower = new Array(n).fill(null);

  if (n < period) {
    return {
      values: { upper, middle, lower },
      metadata: { period },
    };
  }

  // Sliding window max/min
  const highDeque = []; // stores indices of decreasing highs
  const lowDeque = [];  // stores indices of increasing lows

  for (let i = 0; i < n; i++) {
    // Maintain high deque (decreasing)
    while (highDeque.length > 0 && candles[highDeque[highDeque.length - 1]].high <= candles[i].high) {
      highDeque.pop();
    }
    highDeque.push(i);

    // Remove indices outside window
    while (highDeque[0] <= i - period) {
      highDeque.shift();
    }

    // Maintain low deque (increasing)
    while (lowDeque.length > 0 && candles[lowDeque[lowDeque.length - 1]].low >= candles[i].low) {
      lowDeque.pop();
    }
    lowDeque.push(i);

    while (lowDeque[0] <= i - period) {
      lowDeque.shift();
    }

    if (i >= period - 1) {
      const h = candles[highDeque[0]].high;
      const l = candles[lowDeque[0]].low;
      upper[i] = h;
      lower[i] = l;
      middle[i] = (h + l) / 2;
    }
  }

  return {
    values: { upper, middle, lower },
    metadata: { period },
  };
}
