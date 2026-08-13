/**
 * types.js — Core Type Constants, Enums, and Validation Functions
 * ================================================================
 * Central type registry for the Trading Analyzer application.
 * All domain constants, enum-like objects, and data validation
 * utilities live here. No runtime dependencies.
 *
 * Task ID: 2-a
 */

// ---------------------------------------------------------------------------
// 1. Candle Timeframes
// ---------------------------------------------------------------------------
export const TIMEFRAMES = Object.freeze([
  '1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w',
]);

/** Map from timeframe string to canonical label used in UI. */
export const TIMEFRAME_LABELS = Object.freeze({
  '1m':  '1 Minute',
  '5m':  '5 Minutes',
  '15m': '15 Minutes',
  '30m': '30 Minutes',
  '1h':  '1 Hour',
  '4h':  '4 Hours',
  '1d':  '1 Day',
  '1w':  '1 Week',
});

/** Map from timeframe to approximate milliseconds. Used for relative-time calculations. */
export const TIMEFRAME_MS = Object.freeze({
  '1m':  60_000,
  '5m':  300_000,
  '15m': 900_000,
  '30m': 1_800_000,
  '1h':  3_600_000,
  '4h':  14_400_000,
  '1d':  86_400_000,
  '1w':  604_800_000,
});

// ---------------------------------------------------------------------------
// 2. Signal Directions
// ---------------------------------------------------------------------------
export const SIGNAL_DIRECTIONS = Object.freeze({
  LONG:     'long',
  SHORT:    'short',
  NO_TRADE: 'no_trade',
});

/** Human-readable labels for signal directions. */
export const SIGNAL_DIRECTION_LABELS = Object.freeze({
  long:     'Long',
  short:    'Short',
  no_trade: 'No Trade',
});

// ---------------------------------------------------------------------------
// 3. Market Data Provider Types
// ---------------------------------------------------------------------------
export const PROVIDER_TYPES = Object.freeze({
  BINANCE:   'binance',
  BYBIT:     'bybit',
  OKX:       'okx',
  COINGECKO: 'coingecko',
  CUSTOM:    'custom',
});

// ---------------------------------------------------------------------------
// 4. AI Provider Types
// ---------------------------------------------------------------------------
export const AI_PROVIDER_TYPES = Object.freeze({
  GEMINI:            'gemini',
  OPENAI:            'openai',
  OPENROUTER:        'openrouter',
  ANTHROPIC:         'anthropic',
  OPENAI_COMPATIBLE: 'openai_compatible',
});

// ---------------------------------------------------------------------------
// 5. Technical Indicator Types (22+)
// ---------------------------------------------------------------------------
export const INDICATOR_TYPES = Object.freeze({
  // Trend
  EMA:             'ema',
  SMA:             'sma',
  ICHIMOKU:        'ichimoku',
  VWAP:            'vwap',
  SUPER_TREND:     'supertrend',
  // Momentum / Oscillator
  RSI:             'rsi',
  MACD:            'macd',
  STOCHASTIC:      'stochastic',
  CCI:             'cci',
  WILLIAMS_R:      'williams_r',
  MFI:             'mfi',
  // Volatility
  ATR:             'atr',
  BOLLINGER:       'bollinger',
  KELTNER:         'keltner',
  DONCHIAN:        'donchian',
  // Volume
  OBV:             'obv',
  // Trend Strength
  ADX:             'adx',
  // Support / Resistance
  PIVOT_POINTS:    'pivot_points',
  FIBONACCI:       'fibonacci',
  // Other
  PARABOLIC_SAR:   'parabolic_sar',
  VOLUME_PROFILE:  'volume_profile',
});

/** All indicator keys as a flat array for iteration. */
export const INDICATOR_LIST = Object.freeze(Object.values(INDICATOR_TYPES));

/** Categorised indicators for UI grouping. */
export const INDICATOR_CATEGORIES = Object.freeze({
  trend:     ['ema', 'sma', 'ichimoku', 'vwap', 'supertrend'],
  momentum:  ['rsi', 'macd', 'stochastic', 'cci', 'williams_r', 'mfi'],
  volatility: ['atr', 'bollinger', 'keltner', 'donchian'],
  volume:    ['obv', 'volume_profile'],
  strength:  ['adx'],
  sr:        ['pivot_points', 'fibonacci'],
  other:     ['parabolic_sar'],
});

// ---------------------------------------------------------------------------
// 6. Strategy Types (7)
// ---------------------------------------------------------------------------
export const STRATEGY_TYPES = Object.freeze({
  EMA_TREND:        'ema_trend',
  RSI_PULLBACK:     'rsi_pullback',
  MACD_MOMENTUM:    'macd_momentum',
  BREAKOUT_RETEST:  'breakout_retest',
  VWAP_VOLUME:      'vwap_volume',
  MARKET_STRUCTURE: 'market_structure',
  BOLLINGER_SQUEEZE: 'bollinger_squeeze',
});

export const STRATEGY_LIST = Object.freeze(Object.values(STRATEGY_TYPES));

/** Human-readable strategy labels. */
export const STRATEGY_LABELS = Object.freeze({
  ema_trend:        'EMA Trend',
  rsi_pullback:     'RSI Pullback',
  macd_momentum:    'MACD Momentum',
  breakout_retest:  'Breakout Retest',
  vwap_volume:      'VWAP Volume',
  market_structure: 'Market Structure',
  bollinger_squeeze: 'Bollinger Squeeze',
});

// ---------------------------------------------------------------------------
// 7. Capability Levels
// ---------------------------------------------------------------------------
/**
 * Capability levels control which features are available.
 * Higher levels unlock more functionality.
 */
export const CAPABILITY_LEVELS = Object.freeze({
  /** Level 0 — Demo mode with generated data only. */
  DEMO:          0,
  /** Level 1 — Live market data feeds. */
  LIVE_DATA:     1,
  /** Level 2 — Technical analysis indicators. */
  TA:            2,
  /** Level 3 — AI-powered analysis. */
  AI:            3,
  /** Level 4 — Backtesting engine. */
  BACKTEST:      4,
  /** Level 5 — Paper trading execution. */
  PAPER_TRADING: 5,
});

export const CAPABILITY_LABELS = Object.freeze({
  0: 'Demo',
  1: 'Live Data',
  2: 'Technical Analysis',
  3: 'AI Analysis',
  4: 'Backtest',
  5: 'Paper Trading',
});

// ---------------------------------------------------------------------------
// 8. Trade Result Type Constants
// ---------------------------------------------------------------------------
export const TRADE_STATUS = Object.freeze({
  OPEN:   'open',
  CLOSED: 'closed',
});

export const TRADE_EXIT_REASON = Object.freeze({
  TAKE_PROFIT:  'take_profit',
  STOP_LOSS:    'stop_loss',
  SIGNAL:       'signal_reversal',
  MANUAL:       'manual',
  TIMEOUT:      'timeout',
});

// ---------------------------------------------------------------------------
// 9. Validation Functions
// ---------------------------------------------------------------------------

/**
 * Validate a single candle object.
 * A valid candle must have numeric o/h/l/c/v and time (number or Date string).
 *
 * @param {any} c — The value to validate.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCandle(c) {
  const errors = [];

  if (!c || typeof c !== 'object') {
    return { valid: false, errors: ['Candle must be a non-null object.'] };
  }

  // Time — allow number (epoch ms) or string parseable to number
  const time = typeof c.time === 'number' ? c.time : Number(c.time);
  if (!Number.isFinite(time)) {
    errors.push('Candle.time must be a finite number (epoch ms).');
  }

  // OHLCV fields
  const fields = ['open', 'high', 'low', 'close', 'volume'];
  for (const field of fields) {
    const val = c[field];
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      errors.push(`Candle.${field} must be a finite number, got ${typeof val}.`);
    }
  }

  // Structural sanity: high >= max(open, close), low <= min(open, close), high > low
  if (errors.length === 0) {
    const { open, high, low, close } = c;
    if (high < low) errors.push('Candle.high must be >= Candle.low.');
    if (high < Math.max(open, close)) errors.push('Candle.high must be >= max(open, close).');
    if (low > Math.min(open, close)) errors.push('Candle.low must be <= min(open, close).');
    if (close < 0 || open < 0) errors.push('Candle prices must be non-negative.');
    if (c.volume < 0) errors.push('Candle.volume must be non-negative.');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a signal object.
 *
 * @param {any} signal
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSignal(signal) {
  const errors = [];

  if (!signal || typeof signal !== 'object') {
    return { valid: false, errors: ['Signal must be a non-null object.'] };
  }

  // direction
  const validDirs = Object.values(SIGNAL_DIRECTIONS);
  if (!validDirs.includes(signal.direction)) {
    errors.push(`Signal.direction must be one of [${validDirs.join(', ')}], got "${signal.direction}".`);
  }

  // symbol
  if (typeof signal.symbol !== 'string' || signal.symbol.trim().length === 0) {
    errors.push('Signal.symbol must be a non-empty string.');
  }

  // timeframe (optional but must be valid if present)
  if (signal.timeframe !== undefined) {
    if (!TIMEFRAMES.includes(signal.timeframe)) {
      errors.push(`Signal.timeframe must be one of [${TIMEFRAMES.join(', ')}], got "${signal.timeframe}".`);
    }
  }

  // score (0–100, optional)
  if (signal.score !== undefined) {
    if (typeof signal.score !== 'number' || signal.score < 0 || signal.score > 100) {
      errors.push('Signal.score must be a number between 0 and 100.');
    }
  }

  // price (optional, must be finite)
  if (signal.price !== undefined) {
    if (typeof signal.price !== 'number' || !Number.isFinite(signal.price)) {
      errors.push('Signal.price must be a finite number.');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a provider configuration object.
 *
 * @param {any} config
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateProviderConfig(config) {
  const errors = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Provider config must be a non-null object.'] };
  }

  // type
  const validTypes = [...Object.values(PROVIDER_TYPES), ...Object.values(AI_PROVIDER_TYPES)];
  if (typeof config.type !== 'string' || !validTypes.includes(config.type)) {
    errors.push(`Config.type must be a valid provider type, got "${config.type}".`);
  }

  // name
  if (typeof config.name !== 'string' || config.name.trim().length === 0) {
    errors.push('Config.name must be a non-empty string.');
  }

  // enabled (optional, boolean)
  if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
    errors.push('Config.enabled must be a boolean if provided.');
  }

  // apiKey (optional for market providers, may be required for AI)
  if (config.apiKey !== undefined) {
    if (typeof config.apiKey !== 'string') {
      errors.push('Config.apiKey must be a string.');
    }
  }

  // baseUrl (optional)
  if (config.baseUrl !== undefined) {
    if (typeof config.baseUrl !== 'string') {
      errors.push('Config.baseUrl must be a string.');
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// 10. Convenience Type Factories
// ---------------------------------------------------------------------------

/**
 * Factory for a minimal Candle object.
 * @param {object} overrides
 * @returns {import('./types.js').Candle}
 */
export function createCandle(overrides = {}) {
  return {
    time:   Date.now(),
    open:   0,
    high:   0,
    low:    0,
    close:  0,
    volume: 0,
    ...overrides,
  };
}

/**
 * Factory for a minimal TradeResult object.
 * @param {object} overrides
 * @returns {import('./types.js').TradeResult}
 */
export function createTradeResult(overrides = {}) {
  return {
    id:            '',
    symbol:        '',
    direction:     SIGNAL_DIRECTIONS.LONG,
    entryPrice:    0,
    exitPrice:     null,
    quantity:      0,
    stopLoss:      null,
    takeProfit:    null,
    status:        TRADE_STATUS.OPEN,
    entryTime:     Date.now(),
    exitTime:      null,
    pnl:           null,
    pnlPercent:    null,
    exitReason:    null,
    strategy:      null,
    indicatorData: null,
    ...overrides,
  };
}
