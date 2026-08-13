/**
 * Strategies Index
 * ================
 * Imports all 7 strategy plugins, registers them into the STRATEGY_REGISTRY,
 * and re-exports the engine helpers.
 *
 * Task ID: 2-c
 */

import { STRATEGY_REGISTRY, registerStrategy, analyzeStrategy, listStrategies, getStrategy } from './engine.js';

import emaTrend from './ema-trend.js';
import rsiPullback from './rsi-pullback.js';
import macdMomentum from './macd-momentum.js';
import breakoutRetest from './breakout-retest.js';
import vwapVolume from './vwap-volume.js';
import marketStructure from './market-structure-strategy.js';
import bollingerSqueeze from './bollinger-squeeze.js';

// Register all strategies
registerStrategy(emaTrend);
registerStrategy(rsiPullback);
registerStrategy(macdMomentum);
registerStrategy(breakoutRetest);
registerStrategy(vwapVolume);
registerStrategy(marketStructure);
registerStrategy(bollingerSqueeze);

export { STRATEGY_REGISTRY, registerStrategy, analyzeStrategy, listStrategies, getStrategy };

export default { STRATEGY_REGISTRY, registerStrategy, analyzeStrategy, listStrategies, getStrategy };
