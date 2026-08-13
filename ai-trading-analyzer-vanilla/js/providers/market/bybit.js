/**
 * BybitMarketProvider — fetches market data from the Bybit V5 API.
 *
 * Config options:
 *   baseUrl  {string} — override default API base URL
 */

import { BaseMarketProvider } from './base.js';

/** Mapping from Bybit V5 interval strings → app timeframes. */
const BYBIT_INTERVAL_MAP = {
  '1': '1m',
  '3': '3m',
  '5': '5m',
  '15': '15m',
  '30': '30m',
  '60': '1h',
  '120': '2h',
  '240': '4h',
  '360': '6h',
  '720': '12h',
  D: '1d',
  W: '1w',
  M: '1M',
};

/** Reverse mapping: app timeframe → Bybit interval. */
const APP_TO_BYBIT = {};
for (const [bybit, app] of Object.entries(BYBIT_INTERVAL_MAP)) {
  if (!APP_TO_BYBIT[app]) APP_TO_BYBIT[app] = bybit;
}

export class BybitMarketProvider extends BaseMarketProvider {
  constructor(config = {}) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.bybit.com';
  }

  getName() { return 'Bybit'; }
  getDescription() { return 'Bybit Spot market data (api.bybit.com, V5 API)'; }
  getSupportedTimeframes() { return Object.keys(APP_TO_BYBIT); }

  // ----------------------------------------------------------------

  /**
   * GET /v5/market/kline
   * Raw format: [ [startTime, open, high, low, close, volume, turnover], ... ]
   */
  async fetchCandles(symbol, timeframe, limit = 500) {
    if (!this.validateSymbol(symbol)) throw new Error(`Invalid symbol: ${symbol}`);

    const interval = APP_TO_BYBIT[timeframe];
    if (!interval) throw new Error(`Unsupported timeframe: ${timeframe}. Supported: ${this.getSupportedTimeframes().join(', ')}`);

    const url = this._buildUrl(`${this.baseUrl}/v5/market/kline`, {
      category: 'spot',
      symbol,
      interval,
      limit,
    });

    const data = await this._fetchJson(url);

    if (data.retCode !== 0) {
      throw new Error(`Bybit API error ${data.retCode}: ${data.retMsg}`);
    }

    return data.result.list.map((k) =>
      this.normalizeCandle({
        time: Number(k[0]),
        open: k[1],
        high: k[2],
        low: k[3],
        close: k[4],
        volume: k[5],
      })
    ).reverse(); // Bybit returns newest-first
  }

  /**
   * GET /v5/market/tickers
   */
  async fetchTicker(symbol) {
    if (!this.validateSymbol(symbol)) throw new Error(`Invalid symbol: ${symbol}`);

    const url = this._buildUrl(`${this.baseUrl}/v5/market/tickers`, {
      category: 'spot',
      symbol,
    });

    const data = await this._fetchJson(url);

    if (data.retCode !== 0) {
      throw new Error(`Bybit API error ${data.retCode}: ${data.retMsg}`);
    }

    const t = data.result.list[0];
    return {
      symbol: t.symbol,
      price: Number(t.lastPrice),
      priceChange: Number(t.price24hPcnt) * Number(t.lastPrice),
      priceChangePercent: Number(t.price24hPcnt) * 100,
      high: Number(t.highPrice24h),
      low: Number(t.lowPrice24h),
      volume: Number(t.volume24h),
      quoteVolume: Number(t.turnover24h),
      trades: Number(t.turnover24h), // Bybit doesn't expose trade count directly
    };
  }

  /**
   * GET /v5/market/instruments-info  (category=spot)
   */
  async fetchSymbols() {
    const url = this._buildUrl(`${this.baseUrl}/v5/market/instruments-info`, {
      category: 'spot',
    });

    const data = await this._fetchJson(url);

    if (data.retCode !== 0) {
      throw new Error(`Bybit API error ${data.retCode}: ${data.retMsg}`);
    }

    return data.result.list
      .filter((s) => s.status === 'Trading')
      .map((s) => s.symbol);
  }
}
