/**
 * Strategy Engine
 * ==============
 * Central registry and execution hub for trading strategies.
 * Each strategy is a plugin that defines {name, label, description, defaultConfig, analyze}.
 *
 * Usage:
 *   import { STRATEGY_REGISTRY, registerStrategy, analyzeStrategy } from './engine.js';
 *   // Or import the pre-populated index:
 *   import { STRATEGY_REGISTRY, analyzeStrategy, listStrategies, getStrategy } from './index.js';
 *
 * Task ID: 2-c
 */

/**
 * @typedef {Object} StrategyDefinition
 * @property {string} name — Unique machine name (e.g. 'ema_trend')
 * @property {string} label — Human-readable label (e.g. 'EMA Trend')
 * @property {string} description — One-line description of the strategy
 * @property {Record<string, any>} defaultConfig — Default configuration for the analyze function
 * @property {function} analyze — (candles, indicators, config) => {direction, strength, reasoning}
 */

/**
 * @typedef {Object} StrategySignal
 * @property {'long'|'short'|'no_trade'} direction
 * @property {number} strength — 0-100 signal strength
 * @property {string} reasoning — Human-readable explanation
 */

/**
 * Strategy registry: Map of name → StrategyDefinition.
 * @type {Map<string, StrategyDefinition>}
 */
export const STRATEGY_REGISTRY = new Map();

/**
 * Register a strategy definition into the registry.
 * If a strategy with the same name already exists, it is overwritten.
 *
 * @param {StrategyDefinition} definition
 * @throws {Error} if definition is missing required fields
 */
export function registerStrategy(definition) {
  if (!definition || typeof definition !== 'object') {
    throw new Error('Strategy definition must be a non-null object.');
  }
  const { name, label, description, defaultConfig, analyze } = definition;

  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('Strategy definition must have a non-empty string "name".');
  }
  if (typeof label !== 'string' || label.trim().length === 0) {
    throw new Error('Strategy definition must have a non-empty string "label".');
  }
  if (typeof description !== 'string' || description.trim().length === 0) {
    throw new Error('Strategy definition must have a non-empty string "description".');
  }
  if (typeof analyze !== 'function') {
    throw new Error(`Strategy "${name}" must have a function "analyze".`);
  }

  const entry = {
    name,
    label,
    description,
    defaultConfig: defaultConfig || {},
    analyze,
  };

  STRATEGY_REGISTRY.set(name, entry);
}

/**
 * Run a named strategy's analyze function.
 *
 * @param {string} name — Strategy name (key in STRATEGY_REGISTRY)
 * @param {Array<{time:number,open:number,high:number,low:number,close:number,volume:number}>} candles
 * @param {Record<string, {values: any, metadata: any}>} indicators — Pre-computed indicators from computeAllIndicators()
 * @param {Record<string, any>} [config] — Overrides for the strategy's defaultConfig
 * @returns {StrategySignal}
 * @throws {Error} if strategy name is not found
 */
export function analyzeStrategy(name, candles, indicators, config = {}) {
  const strategy = STRATEGY_REGISTRY.get(name);
  if (!strategy) {
    throw new Error(
      `Unknown strategy: "${name}". Available: ${[...STRATEGY_REGISTRY.keys()].join(', ')}`
    );
  }

  const mergedConfig = { ...strategy.defaultConfig, ...config };

  try {
    const result = strategy.analyze(candles, indicators, mergedConfig);

    // Validate and normalise the result
    return {
      direction: result.direction || 'no_trade',
      strength: typeof result.strength === 'number' ? Math.max(0, Math.min(100, result.strength)) : 0,
      reasoning: result.reasoning || '',
    };
  } catch (err) {
    return {
      direction: 'no_trade',
      strength: 0,
      reasoning: `Strategy "${name}" error: ${err.message}`,
    };
  }
}

/**
 * List all registered strategies.
 *
 * @returns {Array<{name:string, label:string, description:string, defaultConfig:Record<string,any>}>}
 */
export function listStrategies() {
  return [...STRATEGY_REGISTRY.values()].map(({ name, label, description, defaultConfig }) => ({
    name,
    label,
    description,
    defaultConfig: { ...defaultConfig },
  }));
}

/**
 * Get a single strategy definition by name.
 *
 * @param {string} name
 * @returns {StrategyDefinition|undefined}
 */
export function getStrategy(name) {
  return STRATEGY_REGISTRY.get(name);
}

export default {
  STRATEGY_REGISTRY,
  registerStrategy,
  analyzeStrategy,
  listStrategies,
  getStrategy,
};
