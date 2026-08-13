/**
 * OKXMarketProvider — fetches market data from the OKX V5 API.
 *
 * Config options:
 *   baseUrl  {string} — override default API base URL
 */

import { BaseMarketProvider } from './base.js';

/** App timeframes → OKX bar strings (identity for most). */
const TIMEFRAME_MAP = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1H',
  '4h': '4H',
  '1d': '1D',
  '1w': '1W',
};

/** Convert internal symbol (BTCUSDT) → OKX instId (BTC-USDT). */
function toInstId(symbol) {
  // If already contains '-', assume OKX format
  if (symbol.includes('-')) return symbol;
  // Try to split at common quote assets
  const quotes = ['USDT', 'USDC', 'BTC', 'ETH', 'EUR', 'USD'];
  for (const q of quotes) {
    if (symbol.endsWith(q)) {
      return symbol.slice(0, -q.length) + '-' + q;
    }
  }
  return symbol;
}

/** Convert OKX instId back to internal format. */
function fromInstId(instId) {
  return instId.replace('-', '');
}

export class OKXMarketProvider extends BaseMarketProvider {
  constructor(config = {}) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://www.okx.com';
  }

  getName() { return 'OKX'; }
  getDescription() { return 'OKX Spot market data (www.okx.com, V5 API)'; }
  getSupportedTimeframes() { return Object.keys(TIMEFRAME_MAP); }

  // ----------------------------------------------------------------

  /**
   * GET /api/v5/market/candles
   * Raw format: [ts, o, h, l, c, vol, volCcy, volCcyQuote, confirm]
   * Note: OKX returns newest-first, so we reverse.
   */
  async fetchCandles(symbol, timeframe, limit = 500) {
    if (!this.validateSymbol(symbol)) throw new Error(`Invalid symbol: ${symbol}`);

    const bar = TIMEFRAME_MAP[timeframe];
    if (!bar) throw new Error(`Unsupported timeframe: ${timeframe}. Supported: ${this.getSupportedTimeframes().join(', ')}`);

    const instId = toInstId(symbol);

    const url = this._buildUrl(`${this.baseUrl}/api/v5/market/candles`, {
      instId,
      bar,
      limit: Math.min(limit, 300), // OKX max is 300 per request
    });

    const data = await this._fetchJson(url);

    if (data.code !== '0') {
      throw new Error(`OKX API error ${data.code}: ${data.msg}`);
    }

    return data.data.map((k) =>
      this.normalizeCandle({
        time: Number(k[0]),
        open: k[1],
        high: k[2],
        low: k[3],
        close: k[4],
        volume: k[5],
      })
    ).reverse();
  }

  /**
   * GET /api/v5/market/ticker
   */
  async fetchTicker(symbol) {
    if (!this.validateSymbol(symbol)) throw new Error(`Invalid symbol: ${symbol}`);

    const instId = toInstId(symbol);
    const url = this._buildUrl(`${this.baseUrl}/api/v5/market/ticker`, {
      instId,
    });

    const data = await this._fetchJson(url);

    if (data.code !== '0') {
      throw new Error(`OKX API error ${data.code}: ${data.msg}`);
    }

    const t = data.data[0];
    const price = Number(t.last);
    const open24h = Number(t.open24h);
    return {
      symbol: fromInstId(t.instId),
      price,
      priceChange: price - open24h,
      priceChangePercent: open24h ? ((price - open24h) / open24h) * 100 : 0,
      high: Number(t.high24h),
      low: Number(t.low24h),
      volume: Number(t.vol24h),
      quoteVolume: Number(t.volCcy24h),
      trades: 0, // OKX doesn't provide trade count in this endpoint
    };
  }

  /**
   * GET /api/v5/public/instruments  (instType=SPOT)
   */
  async fetchSymbols() {
    const url = this._buildUrl(`${this.baseUrl}/api/v5/public/instruments`, {
      instType: 'SPOT',
    });

    const data = await this._fetchJson(url);

    if (data.code !== '0') {
      throw new Error(`OKX API error ${data.code}: ${data.msg}`);
    }

    return data.data
      .filter((s) => s.state === 'live')
      .map((s) => fromInstId(s.instId));
  }
}
