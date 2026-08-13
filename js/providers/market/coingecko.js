/**
 * CoinGeckoMarketProvider — fetches market data from the free CoinGecko API.
 *
 * Important limitations:
 *   - OHLC endpoint does NOT return volume (set to 0).
 *   - Rate-limited heavily on the free tier (~10-30 req/min).
 *   - Symbols must be mapped: BTCUSDT → bitcoin, ETHUSDT → ethereum, etc.
 *
 * Config options:
 *   baseUrl     {string} — override default API base URL
 *   demoApiKey  {string} — optional CoinGecko demo API key (adds header)
 */

import { BaseMarketProvider } from './base.js';

/** Common crypto → CoinGecko slug mapping. */
const SYMBOL_TO_ID = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  POL: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  LTC: 'litecoin',
  NEAR: 'near',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
  FIL: 'filecoin',
  TRX: 'tron',
  SHIB: 'shiba-inu',
  PEPE: 'pepe',
  SUI: 'sui',
  SEI: 'sei-network',
  TIA: 'celestia',
  INJ: 'injective-protocol',
  FTM: 'fantom',
  AAVE: 'aave',
  MKR: 'maker',
  SNX: 'havven',
  CRV: 'curve-dao-token',
  DYDX: 'dydx',
  GALA: 'gala',
  MANA: 'decentraland',
  SAND: 'the-sandbox',
  AXS: 'axie-infinity',
  APE: 'apecoin',
  LDO: 'lido-dao',
  RPL: 'rocket-pool',
  IMX: 'immutable-x',
  GRT: 'the-graph',
  ENS: 'ethereum-name-service',
  WLD: 'worldcoin-wld',
  STRK: 'starknet',
  JUP: 'jupiter-exchange-solana',
  WIF: 'dogwifcoin',
  BOME: 'book-of-meme',
  PEPE: 'pepe',
  FLOKI: 'floki',
  BLUR: 'blur',
};

/** Reverse mapping: CoinGecko id → base symbol. */
const ID_TO_SYMBOL = {};
for (const [sym, id] of Object.entries(SYMBOL_TO_ID)) {
  ID_TO_SYMBOL[id] = sym;
}

/** Map app timeframe → number of days for CoinGecko OHLC. */
const TIMEFRAME_DAYS = {
  '1m': 1,
  '5m': 1,
  '15m': 1,
  '30m': 1,
  '1h': 1,
  '4h': 7,
  '1d': 30,
  '1w': 90,
};

export class CoinGeckoMarketProvider extends BaseMarketProvider {
  constructor(config = {}) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.coingecko.com/api/v3';
    this.demoApiKey = config.demoApiKey || null;
    this._idToSymbol = { ...ID_TO_SYMBOL };
  }

  getName() { return 'CoinGecko'; }
  getDescription() { return 'CoinGecko market data (free tier, no volume in OHLC)'; }
  getSupportedTimeframes() { return Object.keys(TIMEFRAME_DAYS); }

  // ----------------------------------------------------------------

  /** Build headers with optional API key. */
  _getHeaders() {
    const headers = { Accept: 'application/json' };
    if (this.demoApiKey) {
      headers['x-cg-demo-api-key'] = this.demoApiKey;
    }
    return headers;
  }

  /**
   * Convert internal symbol (BTCUSDT) → CoinGecko coin id (bitcoin).
   * Falls back to lowercased base if not in map.
   */
  _toCoinId(symbol) {
    const upper = symbol.toUpperCase();
    // Try with common quote suffixes
    const quotes = ['USDT', 'USDC', 'USD', 'BTC', 'ETH', 'EUR'];
    let base = upper;
    for (const q of quotes) {
      if (upper.endsWith(q)) {
        base = upper.slice(0, -q.length);
        break;
      }
    }
    return SYMBOL_TO_ID[base] || base.toLowerCase();
  }

  /**
   * GET /coins/{id}/ohlc
   * Raw format: [[timestamp, open, high, low, close], ...]
   * No volume available — set to 0.
   */
  async fetchCandles(symbol, timeframe, limit = 500) {
    if (!this.validateSymbol(symbol)) throw new Error(`Invalid symbol: ${symbol}`);

    const days = TIMEFRAME_DAYS[timeframe];
    if (!days) throw new Error(`Unsupported timeframe: ${timeframe}. Supported: ${this.getSupportedTimeframes().join(', ')}`);

    const coinId = this._toCoinId(symbol);
    const url = this._buildUrl(`${this.baseUrl}/coins/${coinId}/ohlc`, {
      vs_currency: 'usd',
      days,
    });

    const raw = await this._fetchJson(url, { headers: this._getHeaders() });

    // Take the last `limit` candles
    const sliced = raw.length > limit ? raw.slice(raw.length - limit) : raw;

    return sliced.map((c) =>
      this.normalizeCandle({
        time: c[0],
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        volume: 0, // CoinGecko OHLC does not provide volume
      })
    );
  }

  /**
   * GET /coins/markets
   */
  async fetchTicker(symbol) {
    if (!this.validateSymbol(symbol)) throw new Error(`Invalid symbol: ${symbol}`);

    const coinId = this._toCoinId(symbol);
    const url = this._buildUrl(`${this.baseUrl}/coins/markets`, {
      vs_currency: 'usd',
      ids: coinId,
    });

    const data = await this._fetchJson(url, { headers: this._getHeaders() });

    if (!data || data.length === 0) {
      throw new Error(`CoinGecko: no ticker data found for ${symbol} (id: ${coinId})`);
    }

    const t = data[0];
    return {
      symbol: `${(this._idToSymbol[t.id] || t.symbol || '').toUpperCase()}USDT`,
      price: t.current_price,
      priceChange: t.price_change_24h,
      priceChangePercent: t.price_change_percentage_24h,
      high: t.high_24h,
      low: t.low_24h,
      volume: t.total_volume,
      quoteVolume: t.total_volume,
      trades: 0,
    };
  }

  /**
   * GET /coins/markets — fetch first 250 coins and build symbol list.
   */
  async fetchSymbols() {
    const url = this._buildUrl(`${this.baseUrl}/coins/markets`, {
      vs_currency: 'usd',
      per_page: 250,
      page: 1,
    });

    const data = await this._fetchJson(url, { headers: this._getHeaders() });

    return data
      .filter((c) => c.symbol)
      .map((c) => {
        const base = (this._idToSymbol[c.id] || c.symbol || '').toUpperCase();
        return `${base}USDT`;
      });
  }
}
