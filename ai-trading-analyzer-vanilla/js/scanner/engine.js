/**
 * Scanner Engine
 * =============
 * Multi-symbol market scanner that fetches candles, computes indicators,
 * generates signals, applies filters, and returns a sorted results array.
 *
 * Features:
 *   - Concurrent scanning with configurable max concurrency
 *   - Progress callbacks for UI updates
 *   - Cancellation support
 *   - Configurable filters (score, volume, price range, direction, change)
 *
 * Task ID: 2-e
 */

import { computeAllIndicators } from '../indicators/index.js';
import { generateSignal } from '../signals/signal-engine.js';

// ---------------------------------------------------------------------------
// ScannerEngine
// ---------------------------------------------------------------------------

export class ScannerEngine {
  /**
   * @param {{maxConcurrent?: number}} [options]
   */
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent ?? 5;
    this._cancelled = false;
    this._running = false;
  }

  /**
   * Scan multiple symbols and return sorted results.
   *
   * @param {{
   *   symbols: string[],
   *   timeframe: string,
   *   indicators: Record<string, any>,
   *   strategies: Record<string, any>,
   *   filters: {
   *     minScore?: number,
   *     minVolume?: number,
   *     priceRange?: {min?: number, max?: number},
   *     changePercent?: {min?: number, max?: number},
   *     signalDirection?: 'long'|'short'|'any'
   *   },
   *   provider: { fetchCandles(symbol, timeframe, start, end, limit): Promise<Array> },
   *   onProgress?: (current: number, total: number, symbol: string) => void
   * }} config
   * @returns {Promise<Array<{symbol:string, signal:Object, score:number, price:number, change24h:number, volume:number, reasoning:string}>>}
   */
  async scan(config) {
    const {
      symbols,
      timeframe,
      indicators = {},
      strategies = {},
      filters = {},
      provider,
      onProgress,
    } = config;

    this._cancelled = false;
    this._running = true;

    const results = [];
    const total = symbols.length;
    let completed = 0;

    // Process symbols in batches of maxConcurrent
    for (let batchStart = 0; batchStart < symbols.length; batchStart += this.maxConcurrent) {
      if (this._cancelled) break;

      const batch = symbols.slice(batchStart, batchStart + this.maxConcurrent);
      const batchPromises = batch.map(async (symbol) => {
        if (this._cancelled) return null;

        try {
          const result = await this._scanSymbol(
            symbol, timeframe, indicators, strategies, filters, provider
          );
          completed++;
          if (onProgress) onProgress(completed, total, symbol);
          return result;
        } catch (err) {
          completed++;
          if (onProgress) onProgress(completed, total, symbol);
          // Return null for failed symbols — filtered out later
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      for (const r of batchResults) {
        if (r !== null) results.push(r);
      }
    }

    this._running = false;

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  /** Cancel an in-progress scan. */
  cancel() {
    this._cancelled = true;
  }

  /** @returns {boolean} Whether a scan is currently running. */
  get isRunning() {
    return this._running;
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  /**
   * Scan a single symbol: fetch → indicators → signal → filter.
   * @private
   */
  async _scanSymbol(symbol, timeframe, indicatorConfigs, strategyConfigs, filters, provider) {
    // Fetch candles — enough for indicator warmup (~300 bars)
    const endMs   = Date.now();
    const startMs = endMs - 30 * 24 * 3600000; // last 30 days

    const candles = await provider.fetchCandles(symbol, timeframe, startMs, endMs, 500);

    if (!candles || candles.length < 30) {
      return null;
    }

    const lastCandle  = candles[candles.length - 1];
    const firstCandle = candles[0];

    // Compute indicators
    let computedIndicators;
    try {
      computedIndicators = computeAllIndicators(candles, indicatorConfigs);
    } catch {
      return null;
    }

    // Generate signal
    const signal = generateSignal(candles, computedIndicators, strategyConfigs, {
      minScore: filters.minScore ?? 30,
    });

    // Only include symbols with a trade signal
    if (signal.direction === 'no_trade') {
      return null;
    }

    // Calculate 24h change
    const change24h = firstCandle.close > 0
      ? ((lastCandle.close - firstCandle.close) / firstCandle.close) * 100
      : 0;

    // Build result
    const result = {
      symbol,
      signal: {
        direction:  signal.direction,
        confidence: signal.confidence,
        breakdown:  signal.breakdown,
        conflicts:  signal.conflicts,
      },
      score:     signal.score,
      price:     lastCandle.close,
      change24h: Math.round(change24h * 100) / 100,
      volume:    lastCandle.volume,
      reasoning: signal.reasoning,
    };

    // Apply filters
    if (!this._passesFilters(result, filters, candles)) {
      return null;
    }

    return result;
  }

  /**
   * Check if a scan result passes all configured filters.
   * @private
   */
  _passesFilters(result, filters, candles) {
    // Min score filter
    if (filters.minScore !== undefined && result.score < filters.minScore) {
      return false;
    }

    // Min volume filter
    if (filters.minVolume !== undefined && result.volume < filters.minVolume) {
      return false;
    }

    // Price range filter
    if (filters.priceRange) {
      const { min, max } = filters.priceRange;
      if (min !== undefined && result.price < min) return false;
      if (max !== undefined && result.price > max) return false;
    }

    // Change percent filter
    if (filters.changePercent) {
      const { min, max } = filters.changePercent;
      if (min !== undefined && result.change24h < min) return false;
      if (max !== undefined && result.change24h > max) return false;
    }

    // Signal direction filter
    if (filters.signalDirection && filters.signalDirection !== 'any') {
      if (result.signal.direction !== filters.signalDirection) {
        return false;
      }
    }

    return true;
  }
}

export default ScannerEngine;
