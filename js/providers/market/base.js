/**
 * BaseMarketProvider — Abstract base class for all market data providers.
 *
 * Subclasses must override fetchCandles, fetchTicker, and fetchSymbols.
 * Provides shared utilities: normalizeCandle (template method),
 * validateSymbol, and metadata getters.
 */

export class BaseMarketProvider {
  /**
   * @param {object} config - Provider-specific configuration
   */
  constructor(config = {}) {
    this.config = config;
  }

  // ------------------------------------------------------------------
  // Abstract methods — every subclass MUST implement these
  // ------------------------------------------------------------------

  /**
   * Fetch historical candle/OHLCV data.
   * @param {string} symbol   - Trading pair (e.g. 'BTCUSDT')
   * @param {string} timeframe - Chart timeframe (e.g. '1h', '4h', '1d')
   * @param {number} limit    - Max number of candles (default 500)
   * @returns {Promise<Array<{time:number,open:number,high:number,low:number,close:number,volume:number}>>}
   */
  async fetchCandles(symbol, timeframe, limit = 500) {
    throw new Error(
      `fetchCandles() is not implemented in ${this.constructor.name}`
    );
  }

  /**
   * Fetch current 24h ticker for a symbol.
   * @param {string} symbol
   * @returns {Promise<object>} Normalised ticker object
   */
  async fetchTicker(symbol) {
    throw new Error(
      `fetchTicker() is not implemented in ${this.constructor.name}`
    );
  }

  /**
   * Fetch all available trading symbols from this provider.
   * @returns {Promise<Array<string>>} List of symbol strings
   */
  async fetchSymbols() {
    throw new Error(
      `fetchSymbols() is not implemented in ${this.constructor.name}`
    );
  }

  // ------------------------------------------------------------------
  // Metadata getters — override in subclass for provider-specific info
  // ------------------------------------------------------------------

  /** Human-readable provider name */
  getName() {
    return 'Base Market Provider';
  }

  /** Short description of the provider */
  getDescription() {
    return 'Base class for market data providers';
  }

  /** List of timeframes the provider supports */
  getSupportedTimeframes() {
    return ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
  }

  // ------------------------------------------------------------------
  // Shared utilities
  // ------------------------------------------------------------------

  /**
   * Template method — converts a raw provider candle into the canonical
   * {time, open, high, low, close, volume} format.
   *
   * Default implementation assumes the raw candle already follows the
   * canonical shape.  Subclasses may override for custom mapping.
   *
   * @param {object} rawCandle
   * @returns {{time:number,open:number,high:number,low:number,close:number,volume:number}}
   */
  normalizeCandle(rawCandle) {
    return {
      time: Number(rawCandle.time),
      open: Number(rawCandle.open),
      high: Number(rawCandle.high),
      low: Number(rawCandle.low),
      close: Number(rawCandle.close),
      volume: Number(rawCandle.volume ?? 0),
    };
  }

  /**
   * Validate that a symbol string looks reasonable (non-empty, no spaces).
   * @param {string} symbol
   * @returns {boolean}
   */
  validateSymbol(symbol) {
    return (
      typeof symbol === 'string' &&
      symbol.length > 0 &&
      /^[A-Za-z0-9_-]+$/.test(symbol)
    );
  }

  /**
   * Helper — build a URL with query-string params.
   * @param {string} baseUrl
   * @param {Record<string,string|number|undefined>} params
   * @returns {string}
   */
  _buildUrl(baseUrl, params) {
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  /**
   * Helper — perform a fetch call with basic error handling.
   * @param {string}   url
   * @param {RequestInit} [init]
   * @returns {Promise<any>} Parsed JSON body
   */
  async _fetchJson(url, init = {}) {
    let response;
    try {
      response = await fetch(url, init);
    } catch (err) {
      if (
        err instanceof TypeError &&
        err.message.toLowerCase().includes('failed to fetch')
      ) {
        throw new Error(
          `CORS or network error when connecting to ${this.getName()}. ` +
            `Ensure the server allows cross-origin requests from this origin.`
        );
      }
      throw err;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `${this.getName()} API error ${response.status}: ${text || response.statusText}`
      );
    }

    return response.json();
  }
}
