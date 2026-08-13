/**
 * BinanceMarketProvider — fetches market data from the Binance Spot API.
 *
 * Config options:
 *   baseUrl  {string} — override default API base URL (useful for testnet)
 */

import { BaseMarketProvider } from './base.js';

/** Mapping from app timeframes → Binance interval strings (identity). */
const TIMEFRAME_MAP = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1w',
};

export class BinanceMarketProvider extends BaseMarketProvider {
  /** @param {{baseUrl?:string}} [config] */
  constructor(config = {}) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.binance.com';
  }

  getName() { return 'Binance'; }
  getDescription() { return 'Binance Spot market data (api.binance.com)'; }
  getSupportedTimeframes() { return Object.keys(TIMEFRAME_MAP); }

  // ----------------------------------------------------------------

  /**
   * GET /api/v3/klines
   * Raw format: [openTime, open, high, low, close, volume, closeTime, ...]  (12 elements)
   */
  async fetchCandles(symbol, timeframe, limit = 500) {
    if (!this.validateSymbol(symbol)) throw new Error(`Invalid symbol: ${symbol}`);

    const interval = TIMEFRAME_MAP[timeframe];
    if (!interval) throw new Error(`Unsupported timeframe: ${timeframe}. Supported: ${this.getSupportedTimeframes().join(', ')}`);

    const url = this._buildUrl(`${this.baseUrl}/api/v3/klines`, {
      symbol: symbol.toUpperCase(),
      interval,
      limit,
    });

    const raw = await this._fetchJson(url);

    return raw.map((k) => this.normalizeCandle({
      time: k[0],
      open: k[1],
      high: k[2],
      low: k[3],
      close: k[4],
      volume: k[5],
    }));
  }

  /**
   * GET /api/v3/ticker/24hr
   */
  async fetchTicker(symbol) {
    if (!this.validateSymbol(symbol)) throw new Error(`Invalid symbol: ${symbol}`);

    const url = this._buildUrl(`${this.baseUrl}/api/v3/ticker/24hr`, {
      symbol: symbol.toUpperCase(),
    });

    const t = await this._fetchJson(url);

    return {
      symbol: t.symbol,
      price: Number(t.lastPrice),
      priceChange: Number(t.priceChange),
      priceChangePercent: Number(t.priceChangePercent),
      high: Number(t.highPrice),
      low: Number(t.lowPrice),
      volume: Number(t.volume),
      quoteVolume: Number(t.quoteAssetVolume),
      trades: Number(t.count),
    };
  }

  /**
   * GET /api/v3/exchangeInfo — filter to USDT spot pairs.
   */
  async fetchSymbols() {
    const url = `${this.baseUrl}/api/v3/exchangeInfo`;
    const data = await this._fetchJson(url);

    return data.symbols
      .filter((s) => s.status === 'TRADING' && s.quoteAsset === 'USDT')
      .map((s) => s.symbol);
  }
}
