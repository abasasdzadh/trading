/**
 * Application-Wide Configuration
 * ===============================
 * Global settings that control app behaviour, UI, and feature gating.
 *
 * Task ID: 2-e
 */

export const APP_CONFIG = Object.freeze({
  /** Application name displayed in UI. */
  appName: 'Trading Analyzer',

  /** Semantic version. */
  version: '1.0.0',

  /** Whether the app runs in demo mode (generated data only, no API calls). */
  demoMode: true,

  /** Maximum number of candles to fetch/store per request. */
  maxCandles: 1000,

  /** Cache time-to-live in milliseconds for market data. */
  cacheTTL: 30_000, // 30 seconds

  /** Refresh intervals (ms) for various data streams. */
  refreshIntervals: {
    prices:      10_000,   // 10s — price ticker updates
    candles:     60_000,   // 1m — candle data refresh
    signals:     60_000,   // 1m — signal recomputation
    alerts:      5_000,    // 5s — alert checks
    paperTrade:  10_000,   // 10s — paper trade mark-to-market
  },

  /** Default UI theme. */
  theme: 'dark',

  /** Default language. */
  language: 'en',

  /** Capability level (0=demo, 1=live data, 2=TA, 3=AI, 4=backtest, 5=paper trading). */
  capabilityLevel: 0,

  /** Number of decimal places for price display. */
  priceDecimals: 2,

  /** Number of decimal places for volume display. */
  volumeDecimals: 2,

  /** Default chart timeframe. */
  defaultTimeframe: '1h',

  /** Symbols shown in the watchlist by default. */
  defaultWatchlist: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],

  /** Toast notification duration (ms). */
  toastDuration: 4_000,
});

export default APP_CONFIG;
