/**
 * CustomMarketProvider — user-defined market data provider.
 *
 * The caller supplies endpoint paths and mapper functions via config.
 * This allows connecting to any REST API that returns OHLCV / ticker data.
 *
 * Config shape:
 *   {
 *     name:            {string}   — display name
 *     description:     {string}   — short description
 *     baseUrl:         {string}   — required, base URL of the API
 *     timeframes:      {string[]} — list of supported timeframe strings
 *     candlesEndpoint: {string}   — path appended to baseUrl (e.g. '/klines')
 *     tickerEndpoint:  {string}   — path for ticker
 *     symbolsEndpoint: {string}   — path for symbol list
 *     headers:         {object}   — additional HTTP headers
 *     candlesParams:   {function(symbol, timeframe, limit) => object} — query params builder
 *     tickerParams:    {function(symbol) => object}
 *     symbolsParams:   {function() => object}
 *     candleMapper:    {function(rawItem) => {time,open,high,low,close,volume}}
 *     tickerMapper:    {function(rawItem) => tickerObject}
 *     symbolsMapper:   {function(rawData) => string[]}
 *   }
 */

import { BaseMarketProvider } from './base.js';

export class CustomMarketProvider extends BaseMarketProvider {
  /** @param {object} config — see class JSDoc */
  constructor(config = {}) {
    super(config);
    if (!config.baseUrl) throw new Error('CustomMarketProvider requires config.baseUrl');
    this._name = config.name || 'Custom';
    this._description = config.description || 'User-defined market data provider';
    this._timeframes = Array.isArray(config.timeframes)
      ? config.timeframes
      : ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
    this._headers = config.headers || {};
    this._candlesEndpoint = config.candlesEndpoint;
    this._tickerEndpoint = config.tickerEndpoint;
    this._symbolsEndpoint = config.symbolsEndpoint;
    this._candlesParams = config.candlesParams;
    this._tickerParams = config.tickerParams;
    this._symbolsParams = config.symbolsParams;
    this._candleMapper = config.candleMapper;
    this._tickerMapper = config.tickerMapper;
    this._symbolsMapper = config.symbolsMapper;
  }

  getName() { return this._name; }
  getDescription() { return this._description; }
  getSupportedTimeframes() { return [...this._timeframes]; }

  // ----------------------------------------------------------------

  async fetchCandles(symbol, timeframe, limit = 500) {
    if (!this._candlesEndpoint) throw new Error('CustomMarketProvider: candlesEndpoint not configured');
    if (!this._candleMapper) throw new Error('CustomMarketProvider: candleMapper not configured');

    const params = this._candlesParams
      ? this._candlesParams(symbol, timeframe, limit)
      : { symbol, interval: timeframe, limit };

    const url = this._buildUrl(`${this.baseUrl}${this._candlesEndpoint}`, params);
    const data = await this._fetchJson(url, { headers: this._headers });

    // Accept single object or array
    const items = Array.isArray(data) ? data : [data];
    return items.map((item) => this.normalizeCandle(this._candleMapper(item)));
  }

  async fetchTicker(symbol) {
    if (!this._tickerEndpoint) throw new Error('CustomMarketProvider: tickerEndpoint not configured');
    if (!this._tickerMapper) throw new Error('CustomMarketProvider: tickerMapper not configured');

    const params = this._tickerParams
      ? this._tickerParams(symbol)
      : { symbol };

    const url = this._buildUrl(`${this.baseUrl}${this._tickerEndpoint}`, params);
    const data = await this._fetchJson(url, { headers: this._headers });
    return this._tickerMapper(data);
  }

  async fetchSymbols() {
    if (!this._symbolsEndpoint) throw new Error('CustomMarketProvider: symbolsEndpoint not configured');
    if (!this._symbolsMapper) throw new Error('CustomMarketProvider: symbolsMapper not configured');

    const params = this._symbolsParams
      ? this._symbolsParams()
      : {};

    const url = this._buildUrl(`${this.baseUrl}${this._symbolsEndpoint}`, params);
    const data = await this._fetchJson(url, { headers: this._headers });
    return this._symbolsMapper(data);
  }
}
