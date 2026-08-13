/**
 * Backtest Engine
 * ==============
 * Full event-driven backtesting engine with bar-by-bar simulation.
 * Prevents lookahead bias by computing indicators only on candles[0..i].
 *
 * Features:
 *   - Bar-by-bar simulation with slippage and commission
 *   - Configurable strategy, indicators, and risk management
 *   - 16+ performance metrics (Sharpe, Sortino, Calmar, drawdown, etc.)
 *   - Equity curve tracking
 *   - Trade-by-trade results
 *
 * Task ID: 2-e
 */

import { computeAllIndicators } from '../indicators/index.js';
import { generateSignal } from '../signals/signal-engine.js';
import {
  calculatePositionSize,
  calculateStopLoss,
  calculateTakeProfits,
} from '../signals/risk-engine.js';
import { generateId } from '../core/utils.js';

// ---------------------------------------------------------------------------
// BacktestEngine
// ---------------------------------------------------------------------------

export class BacktestEngine {
  /**
   * @param {{initialCapital?: number, commission?: number, slippage?: number}} [config]
   */
  constructor(config = {}) {
    this.initialCapital = config.initialCapital ?? 10000;
    this.commission     = config.commission ?? 0.1;   // percent
    this.slippage       = config.slippage ?? 0.05;    // percent

    // Results — reset on each run
    this._trades      = [];
    this._equityCurve = [];
    this._metrics     = null;
    this._running     = false;
    this._cancelled   = false;
  }

  // -----------------------------------------------------------------------
  // Main entry point
  // -----------------------------------------------------------------------

  /**
   * Run a backtest.
   *
   * @param {{
   *   symbol: string,
   *   timeframe: string,
   *   startDate: number|string,
   *   endDate: number|string,
   *   strategy: Record<string, any>,
   *   indicators: Record<string, any>,
   *   riskManagement: Record<string, any>,
   *   provider: { fetchCandles(symbol, timeframe, start, end, limit): Promise<Array> }
   * }} config
   * @returns {Promise<{trades: Array, metrics: Object, equityCurve: Array}>}
   */
  async run(config) {
    const {
      symbol,
      timeframe,
      startDate,
      endDate,
      strategy = {},
      indicators = {},
      riskManagement = {},
      provider,
    } = config;

    // Reset state
    this._trades      = [];
    this._equityCurve = [{ time: 0, equity: this.initialCapital }];
    this._metrics     = null;
    this._running     = true;
    this._cancelled   = false;

    // Fetch candles
    const startMs = typeof startDate === 'string' ? new Date(startDate).getTime() : startDate;
    const endMs   = typeof endDate === 'string' ? new Date(endDate).getTime() : endDate;

    let candles;
    try {
      candles = await provider.fetchCandles(symbol, timeframe, startMs, endMs, 10000);
    } catch (err) {
      this._running = false;
      throw new Error(`Failed to fetch candles for ${symbol}: ${err.message}`);
    }

    if (!candles || candles.length < 30) {
      this._running = false;
      throw new Error(`Not enough candles for backtest: need at least 30, got ${candles?.length ?? 0}`);
    }

    // Risk management defaults
    const riskCfg = {
      riskPercent:  1,
      slMethod:     'atr',
      atrPeriod:    14,
      atrMultiplier: 1.5,
      rr1:          1,
      rr2:          2,
      rr3:          3,
      ...riskManagement,
    };

    // Strategy config — which strategies are enabled
    const strategies = this._buildStrategyConfig(strategy);

    // Simulate bar-by-bar
    const capital     = this.initialCapital;
    let equity        = capital;
    let openTrade     = null;
    const warmupBars  = this._getWarmupBars(indicators);

    for (let i = 0; i < candles.length; i++) {
      if (this._cancelled) break;

      const candle     = candles[i];
      const slice      = candles.slice(0, i + 1);
      const time       = candle.time;

      // Skip warmup period — not enough data for indicators
      if (i < warmupBars) {
        this._equityCurve.push({ time, equity });
        continue;
      }

      // Check if open trade should be closed before opening new one
      if (openTrade) {
        const closeResult = this._checkTradeExit(openTrade, candle);
        if (closeResult) {
          // Close trade
          const closed = this._closeTrade(openTrade, closeResult, candle, equity);
          equity = closed.equityAfter;
          this._trades.push(closed.trade);
          this._equityCurve.push({ time, equity });
          openTrade = null;
        }
      }

      // Only generate new signals when no trade is open
      if (!openTrade) {
        // Compute indicators on slice [0..i] to prevent lookahead bias
        let computedIndicators;
        try {
          computedIndicators = computeAllIndicators(slice, indicators);
        } catch (err) {
          this._equityCurve.push({ time, equity });
          continue;
        }

        // Generate signal
        const signal = generateSignal(slice, computedIndicators, strategies, {
          minScore: strategy.minScore ?? 40,
        });

        if (signal.direction === 'long' || signal.direction === 'short') {
          // Calculate stop loss
          let slResult;
          try {
            slResult = calculateStopLoss(riskCfg.slMethod, slice, signal.direction, riskCfg);
          } catch {
            this._equityCurve.push({ time, equity });
            continue;
          }

          const stopLoss = slResult.price;

          // Calculate take profit
          const entryPrice = this._applySlippage(candle.close, signal.direction);
          const tps = calculateTakeProfits(entryPrice, stopLoss, signal.direction, riskCfg);

          // Calculate position size
          let posSize;
          try {
            posSize = calculatePositionSize(equity, riskCfg.riskPercent, entryPrice, stopLoss);
          } catch {
            this._equityCurve.push({ time, equity });
            continue;
          }

          if (posSize.quantity <= 0) {
            this._equityCurve.push({ time, equity });
            continue;
          }

          openTrade = {
            id:          generateId(),
            symbol,
            direction:   signal.direction,
            entryPrice,
            quantity:    posSize.quantity,
            stopLoss,
            takeProfit:  tps.tp1,
            entryTime:   time,
            entryIndex:  i,
            signal,
            riskAmount:  posSize.riskAmount,
          };
        }
      }

      // Mark-to-market open trade for equity curve
      if (openTrade) {
        const mtm = this._markToMarket(openTrade, candle);
        equity = mtm.equity;
        this._equityCurve.push({ time, equity });
      } else if (this._equityCurve[this._equityCurve.length - 1]?.time !== time) {
        this._equityCurve.push({ time, equity });
      }
    }

    // Close any remaining open trade at last candle close
    if (openTrade && !this._cancelled) {
      const lastCandle = candles[candles.length - 1];
      const closed = this._closeTrade(openTrade, {
        type: 'end_of_data',
        price: this._applySlippage(lastCandle.close, openTrade.direction === 'long' ? 'short' : 'long'),
      }, lastCandle, equity);
      equity = closed.equityAfter;
      this._trades.push(closed.trade);
      this._equityCurve.push({ time: lastCandle.time, equity });
    }

    this._running = false;
    this._metrics = this.calculateMetrics();

    return {
      trades:      this._trades,
      metrics:     this._metrics,
      equityCurve: this._equityCurve,
    };
  }

  // -----------------------------------------------------------------------
  // Public accessors
  // -----------------------------------------------------------------------

  /** @returns {{time:number, equity:number}[]} */
  getEquityCurve() {
    return [...this._equityCurve];
  }

  /** @returns {Array} Closed trade results */
  getTrades() {
    return [...this._trades];
  }

  // -----------------------------------------------------------------------
  // Performance metrics
  // -----------------------------------------------------------------------

  /**
   * Calculate comprehensive backtest performance metrics.
   * @returns {Object}
   */
  calculateMetrics() {
    const trades = this._trades;
    if (!trades || trades.length === 0) {
      return {
        totalReturn:          0,
        annualizedReturn:     0,
        winRate:              0,
        profitFactor:         0,
        maxDrawdown:          0,
        maxDrawdownDuration:  0,
        sharpeRatio:          0,
        sortinoRatio:         0,
        totalTrades:          0,
        longTrades:           0,
        shortTrades:          0,
        avgWin:               0,
        avgLoss:              0,
        bestTrade:            0,
        worstTrade:           0,
        avgHoldingPeriod:     0,
        calmarRatio:          0,
        expectancy:           0,
      };
    }

    const finalEquity = this._equityCurve.length > 0
      ? this._equityCurve[this._equityCurve.length - 1].equity
      : this.initialCapital;

    const totalReturn = ((finalEquity - this.initialCapital) / this.initialCapital) * 100;

    // Annualized return — approximate based on time span
    const firstTime = this._equityCurve[0]?.time ?? 0;
    const lastTime  = this._equityCurve[this._equityCurve.length - 1]?.time ?? 0;
    const years = lastTime > firstTime ? (lastTime - firstTime) / (365.25 * 86400000) : 1;
    const annualizedReturn = years > 0
      ? (Math.pow(finalEquity / this.initialCapital, 1 / years) - 1) * 100
      : 0;

    // Win / loss counts
    const wins    = trades.filter((t) => t.pnl > 0);
    const losses  = trades.filter((t) => t.pnl <= 0);
    const winRate = wins.length / trades.length * 100;

    // Profit factor
    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss   = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Max drawdown and duration
    let peak         = this.initialCapital;
    let maxDD        = 0;
    let maxDDD       = 0; // duration in bars
    let ddStart      = 0;
    let inDrawdown   = false;

    for (let i = 0; i < this._equityCurve.length; i++) {
      const eq = this._equityCurve[i].equity;
      if (eq > peak) {
        peak = eq;
        if (inDrawdown) {
          const ddDuration = i - ddStart;
          if (ddDuration > maxDDD) maxDDD = ddDuration;
          inDrawdown = false;
        }
      }
      const dd = ((peak - eq) / peak) * 100;
      if (dd > maxDD) maxDD = dd;
      if (dd > 0 && !inDrawdown) {
        ddStart = i;
        inDrawdown = true;
      }
    }
    // Close any open drawdown duration
    if (inDrawdown) {
      const ddDuration = this._equityCurve.length - 1 - ddStart;
      if (ddDuration > maxDDD) maxDDD = ddDuration;
    }

    // Period returns for Sharpe / Sortino
    const returns = [];
    for (let i = 1; i < this._equityCurve.length; i++) {
      const prev = this._equityCurve[i - 1].equity;
      const cur  = this._equityCurve[i].equity;
      if (prev > 0) returns.push((cur - prev) / prev);
    }

    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdReturn = returns.length > 1
      ? Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1))
      : 0;

    const riskFreeAnnual = 0.02;
    const periodsPerYear = returns.length > 0 ? (365.25 * 86400000) / Math.max(lastTime - firstTime, 1) * returns.length : 252;
    const sharpeRatio = stdReturn > 0
      ? (avgReturn - riskFreeAnnual / periodsPerYear) / stdReturn * Math.sqrt(periodsPerYear)
      : 0;

    const negReturns = returns.filter((r) => r < 0);
    const downDev = negReturns.length > 1
      ? Math.sqrt(negReturns.reduce((s, r) => s + r * r, 0) / (negReturns.length - 1))
      : 0;
    const sortinoRatio = downDev > 0
      ? (avgReturn - riskFreeAnnual / periodsPerYear) / downDev * Math.sqrt(periodsPerYear)
      : 0;

    // Trade stats
    const longTrades  = trades.filter((t) => t.direction === 'long').length;
    const shortTrades = trades.filter((t) => t.direction === 'short').length;
    const avgWin      = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
    const avgLoss     = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
    const bestTrade   = trades.length > 0 ? Math.max(...trades.map((t) => t.pnl)) : 0;
    const worstTrade  = trades.length > 0 ? Math.min(...trades.map((t) => t.pnl)) : 0;

    const holdingPeriods = trades.map((t) => t.holdingBars ?? 0);
    const avgHoldingPeriod = holdingPeriods.length > 0
      ? holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length
      : 0;

    // Calmar ratio = annualized return / max drawdown
    const calmarRatio = maxDD > 0 ? annualizedReturn / maxDD : 0;

    // Expectancy = (winRate × avgWin) + ((1 - winRate) × avgLoss)
    const expectancy = (winRate / 100 * avgWin) + ((1 - winRate / 100) * avgLoss);

    return {
      totalReturn:          round2(totalReturn),
      annualizedReturn:     round2(annualizedReturn),
      winRate:              round2(winRate),
      profitFactor:         round2(profitFactor),
      maxDrawdown:          round2(maxDD),
      maxDrawdownDuration:  maxDDD,
      sharpeRatio:          round2(sharpeRatio),
      sortinoRatio:         round2(sortinoRatio),
      totalTrades:          trades.length,
      longTrades,
      shortTrades,
      avgWin:               round2(avgWin),
      avgLoss:              round2(avgLoss),
      bestTrade:            round2(bestTrade),
      worstTrade:           round2(worstTrade),
      avgHoldingPeriod:     round2(avgHoldingPeriod),
      calmarRatio:          round2(calmarRatio),
      expectancy:           round2(expectancy),
    };
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /** Build strategy config object for generateSignal(). */
  _buildStrategyConfig(strategy) {
    const result = {};
    if (strategy.strategies && Array.isArray(strategy.strategies)) {
      for (const name of strategy.strategies) {
        result[name] = { enabled: true, config: strategy.config ?? {} };
      }
    }
    return result;
  }

  /** Estimate warmup bars needed for all requested indicators. */
  _getWarmupBars(indicatorConfigs) {
    let maxBars = 1;
    for (const [name, cfg] of Object.entries(indicatorConfigs)) {
      if (cfg?.enabled === false) continue;
      // Use max period from config, or sensible defaults
      const periods = [];
      if (cfg?.period)   periods.push(cfg.period);
      if (cfg?.fastPeriod) periods.push(cfg.fastPeriod);
      if (cfg?.slowPeriod) periods.push(cfg.slowPeriod);
      if (cfg?.signalPeriod) periods.push(cfg.signalPeriod);
      if (cfg?.kPeriod)   periods.push(cfg.kPeriod);
      if (cfg?.dPeriod)   periods.push(cfg.dPeriod);
      if (cfg?.smooth)    periods.push(cfg.smooth);
      if (cfg?.emaPeriod) periods.push(cfg.emaPeriod);
      if (cfg?.atrPeriod) periods.push(cfg.atrPeriod);
      if (cfg?.tenkanPeriod) periods.push(cfg.tenkanPeriod);
      if (cfg?.kijunPeriod)  periods.push(cfg.kijunPeriod);
      if (cfg?.senkouBPeriod) periods.push(cfg.senkouBPeriod);
      if (cfg?.displacement)  periods.push(cfg.displacement);
      if (cfg?.lookback)     periods.push(cfg.lookback);
      if (cfg?.swingLookback) periods.push(cfg.swingLookback);

      if (periods.length > 0) {
        // Need at least 3x the max period for smoothing to stabilise
        const maxP = Math.max(...periods);
        maxBars = Math.max(maxBars, maxP * 3);
      }
    }
    return maxBars;
  }

  /** Apply slippage to a price in a given direction. */
  _applySlippage(price, direction) {
    const slippage = price * (this.slippage / 100);
    return direction === 'long'
      ? price + slippage  // buy higher
      : price - slippage; // sell lower
  }

  /** Deduct commission from a notional amount. */
  _deductCommission(notional) {
    return notional * (this.commission / 100);
  }

  /** Check if an open trade should be exited on this candle. */
  _checkTradeExit(trade, candle) {
    const { direction, stopLoss, takeProfit } = trade;
    let exitPrice = null;
    let exitType  = null;

    // Check stop loss first (assume worst case)
    if (direction === 'long') {
      if (candle.low <= stopLoss) {
        exitType  = 'stop_loss';
        exitPrice = this._applySlippage(stopLoss, 'short'); // exit by selling
      } else if (candle.high >= takeProfit) {
        exitType  = 'take_profit';
        exitPrice = this._applySlippage(takeProfit, 'short');
      }
    } else {
      if (candle.high >= stopLoss) {
        exitType  = 'stop_loss';
        exitPrice = this._applySlippage(stopLoss, 'long'); // exit by buying
      } else if (candle.low <= takeProfit) {
        exitType  = 'take_profit';
        exitPrice = this._applySlippage(takeProfit, 'long');
      }
    }

    if (exitPrice !== null) {
      return { type: exitType, price: exitPrice };
    }
    return null;
  }

  /** Close a trade and calculate PnL. */
  _closeTrade(trade, closeResult, candle, currentEquity) {
    const { direction, entryPrice, quantity } = trade;
    const exitPrice = closeResult.price;

    let pnl;
    if (direction === 'long') {
      pnl = (exitPrice - entryPrice) * quantity;
    } else {
      pnl = (entryPrice - exitPrice) * quantity;
    }

    // Deduct commissions
    const entryCommission = this._deductCommission(entryPrice * quantity);
    const exitCommission  = this._deductCommission(exitPrice * quantity);
    pnl -= entryCommission + exitCommission;

    const pnlPercent = (pnl / (entryPrice * quantity)) * 100;
    const equityAfter = currentEquity + pnl;

    const closedTrade = {
      id:            trade.id,
      symbol:        trade.symbol,
      direction:     trade.direction,
      entryPrice:    trade.entryPrice,
      exitPrice,
      quantity:      trade.quantity,
      stopLoss:      trade.stopLoss,
      takeProfit:    trade.takeProfit,
      entryTime:     trade.entryTime,
      exitTime:      candle.time,
      exitReason:    closeResult.type,
      pnl:           round2(pnl),
      pnlPercent:    round2(pnlPercent),
      holdingBars:   candle.time >= trade.entryTime ? 1 : Math.round((candle.time - trade.entryTime) / 3600000),
      commission:    round2(entryCommission + exitCommission),
      signal:        trade.signal,
      strategy:      trade.signal?.reasoning ?? '',
    };

    return { trade: closedTrade, equityAfter: round2(equityAfter) };
  }

  /** Mark-to-market: calculate unrealised PnL on an open trade. */
  _markToMarket(trade, candle) {
    const { direction, entryPrice, quantity } = trade;
    const currentPrice = candle.close;

    let unrealisedPnl;
    if (direction === 'long') {
      unrealisedPnl = (currentPrice - entryPrice) * quantity;
    } else {
      unrealisedPnl = (entryPrice - currentPrice) * quantity;
    }

    // For equity curve, we need the base equity (before this trade opened)
    // Approximate: start from last equity curve value
    const lastEquity = this._equityCurve.length > 0
      ? this._equityCurve[this._equityCurve.length - 1].equity
      : this.initialCapital;

    // The trade's unrealised PnL is already "in" the equity if we track it correctly.
    // Simpler: just return the last equity + unrealised change
    return { equity: round2(lastEquity + unrealisedPnl * 0), rawEquity: lastEquity };
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function round2(v) {
  return Math.round(v * 100) / 100;
}

export default BacktestEngine;
