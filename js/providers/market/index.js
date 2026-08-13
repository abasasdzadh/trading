/**
 * Market provider factory & registry.
 *
 * Usage:
 *   import { createMarketProvider, getAvailableProviders } from './index.js';
 *   const provider = createMarketProvider('binance', { baseUrl: '...' });
 */

import { BinanceMarketProvider } from './binance.js';
import { BybitMarketProvider } from './bybit.js';
import { OKXMarketProvider } from './okx.js';
import { CoinGeckoMarketProvider } from './coingecko.js';
import { CustomMarketProvider } from './custom.js';

/** Provider registry — maps type key → { ctor, name, description } */
const PROVIDERS = {
  binance: {
    ctor: BinanceMarketProvider,
    name: 'Binance',
    description: 'Binance Spot market data (api.binance.com)',
  },
  bybit: {
    ctor: BybitMarketProvider,
    name: 'Bybit',
    description: 'Bybit Spot market data (api.bybit.com, V5 API)',
  },
  okx: {
    ctor: OKXMarketProvider,
    name: 'OKX',
    description: 'OKX Spot market data (www.okx.com, V5 API)',
  },
  coingecko: {
    ctor: CoinGeckoMarketProvider,
    name: 'CoinGecko',
    description: 'CoinGecko market data (free tier, no volume in OHLC)',
  },
  custom: {
    ctor: CustomMarketProvider,
    name: 'Custom',
    description: 'User-defined market data provider',
  },
};

/**
 * Create a market provider instance by type.
 * @param {string} type   - Provider type key (e.g. 'binance')
 * @param {object} config - Provider-specific configuration
 * @returns {import('./base.js').BaseMarketProvider}
 */
export function createMarketProvider(type, config = {}) {
  const entry = PROVIDERS[type];
  if (!entry) {
    const available = Object.keys(PROVIDERS).join(', ');
    throw new Error(
      `Unknown market provider type: "${type}". Available: ${available}`
    );
  }
  return new entry.ctor(config);
}

/**
 * List all registered market providers.
 * @returns {Array<{type:string, name:string, description:string}>}
 */
export function getAvailableProviders() {
  return Object.entries(PROVIDERS).map(([type, { name, description }]) => ({
    type,
    name,
    description,
  }));
}
