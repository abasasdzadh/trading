/**
 * Paper Trading Engine
 * ====================
 * Simulates live trading with persistent trade state.
 * Uses StorageService to persist open/closed trades.
 *
 * Features:
 *   - Open/close trades with PnL tracking
 *   - Mark-to-market price updates for open trades
 *   - Comprehensive stats (PnL, win rate, avg win/loss)
 *   - Full persistence via StorageService
 *
 * Task ID: 2-e
 */

import { generateId } from '../core/utils.js';

// ---------------------------------------------------------------------------
// PaperTradingEngine
// ---------------------------------------------------------------------------

export class PaperTradingEngine {
  /**
   * @param {import('../core/storage.js').StorageService} storage
   */
  constructor(storage) {
    this.storage = storage;
    this._openTrades   = [];
    this._closedTrades = [];
    this._initialised  = false;
  }

  // -----------------------------------------------------------------------
  // Initialisation (lazy-load from storage)
  // -----------------------------------------------------------------------

  async _ensureInit() {
    if (this._initialised) return;
    this._openTrades   = (await this.storage.getPaperTrades('open')) ?? [];
    this._closedTrades = (await this.storage.getPaperTrades('closed')) ?? [];
    this._initialised  = true;
  }

  async _persist() {
    await this.storage.setPaperTrades('open', this._openTrades);
    await this.storage.setPaperTrades('closed', this._closedTrades);
  }

  // -----------------------------------------------------------------------
  // Trade management
  // -----------------------------------------------------------------------

  /**
   * Open a new paper trade.
   *
   * @param {{
   *   symbol: string,
   *   direction: 'long'|'short',
   *   entryPrice: number,
   *   quantity: number,
   *   stopLoss?: number,
   *   takeProfits?: {tp1?:number, tp2?:number, tp3?:number},
   *   reasoning?: string
   * }} trade
   * @returns {Promise<Object>} The created trade object
   */
  async openTrade(trade) {
    await this._ensureInit();

    const newTrade = {
      id:            generateId(),
      symbol:        trade.symbol,
      direction:     trade.direction,
      entryPrice:    trade.entryPrice,
      currentPrice:  trade.entryPrice,
      quantity:      trade.quantity,
      stopLoss:      trade.stopLoss ?? null,
      takeProfits:   trade.takeProfits ?? { tp1: null, tp2: null, tp3: null },
      entryTime:     Date.now(),
      exitTime:      null,
      exitPrice:     null,
      exitReason:    null,
      pnl:           null,
      pnlPercent:    null,
      reasoning:     trade.reasoning ?? '',
      status:        'open',
    };

    this._openTrades.push(newTrade);
    await this._persist();
    return { ...newTrade };
  }

  /**
   * Close an existing trade.
   *
   * @param {string} tradeId
   * @param {number} exitPrice
   * @param {string} [reason]
   * @returns {Promise<Object|null>} The closed trade, or null if not found
   */
  async closeTrade(tradeId, exitPrice, reason = 'manual') {
    await this._ensureInit();

    const idx = this._openTrades.findIndex((t) => t.id === tradeId);
    if (idx === -1) return null;

    const trade = this._openTrades.splice(idx, 1)[0];

    // Calculate PnL
    let pnl;
    if (trade.direction === 'long') {
      pnl = (exitPrice - trade.entryPrice) * trade.quantity;
    } else {
      pnl = (trade.entryPrice - exitPrice) * trade.quantity;
    }

    const pnlPercent = trade.entryPrice > 0
      ? (pnl / (trade.entryPrice * trade.quantity)) * 100
      : 0;

    trade.exitPrice  = exitPrice;
    trade.currentPrice = exitPrice;
    trade.exitTime   = Date.now();
    trade.exitReason = reason;
    trade.pnl        = Math.round(pnl * 100) / 100;
    trade.pnlPercent = Math.round(pnlPercent * 100) / 100;
    trade.status     = 'closed';

    this._closedTrades.push(trade);
    await this._persist();

    return { ...trade };
  }

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

  /** @returns {Promise<Object[]>} All currently open trades */
  async getOpenTrades() {
    await this._ensureInit();
    return this._openTrades.map((t) => ({ ...t }));
  }

  /** @returns {Promise<Object[]>} All closed trades (most recent first) */
  async getClosedTrades() {
    await this._ensureInit();
    return [...this._closedTrades].reverse().map((t) => ({ ...t }));
  }

  /**
   * Get aggregate trading statistics.
   * @returns {Promise<Object>}
   */
  async getStats() {
    await this._ensureInit();

    const closed = this._closedTrades;
    const wins   = closed.filter((t) => (t.pnl ?? 0) > 0);
    const losses = closed.filter((t) => (t.pnl ?? 0) <= 0);
    const totalPnL = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);

    return {
      totalPnL:      Math.round(totalPnL * 100) / 100,
      winRate:       closed.length > 0 ? Math.round((wins.length / closed.length) * 100 * 100) / 100 : 0,
      avgWin:        wins.length > 0 ? Math.round(wins.reduce((s, t) => s + t.pnl, 0) / wins.length * 100) / 100 : 0,
      avgLoss:       losses.length > 0 ? Math.round(losses.reduce((s, t) => s + t.pnl, 0) / losses.length * 100) / 100 : 0,
      totalTrades:   closed.length,
      openPositions: this._openTrades.length,
      bestTrade:     closed.length > 0 ? Math.max(...closed.map((t) => t.pnl ?? 0)) : 0,
      worstTrade:    closed.length > 0 ? Math.min(...closed.map((t) => t.pnl ?? 0)) : 0,
      profitFactor:  this._calcProfitFactor(wins, losses),
    };
  }

  // -----------------------------------------------------------------------
  // Mark-to-market
  // -----------------------------------------------------------------------

  /**
   * Update current prices on all open trades (mark-to-market).
   * Useful for showing unrealised PnL in the UI.
   *
   * @param {Record<string, number>} currentPrices — {BTCUSDT: 65000, ETHUSDT: 3500, ...}
   * @returns {Promise<Object[]>} Updated open trades with unrealised PnL
   */
  async updateTradePrices(currentPrices) {
    await this._ensureInit();

    const updated = [];
    for (const trade of this._openTrades) {
      const price = currentPrices[trade.symbol];
      if (price === undefined) {
        updated.push({ ...trade, unrealisedPnl: null, unrealisedPnlPercent: null });
        continue;
      }

      trade.currentPrice = price;

      let unrealisedPnl;
      if (trade.direction === 'long') {
        unrealisedPnl = (price - trade.entryPrice) * trade.quantity;
      } else {
        unrealisedPnl = (trade.entryPrice - price) * trade.quantity;
      }

      const unrealisedPnlPercent = trade.entryPrice > 0
        ? (unrealisedPnl / (trade.entryPrice * trade.quantity)) * 100
        : 0;

      updated.push({
        ...trade,
        unrealisedPnl:        Math.round(unrealisedPnl * 100) / 100,
        unrealisedPnlPercent: Math.round(unrealisedPnlPercent * 100) / 100,
      });
    }

    await this._persist();
    return updated;
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  /** Calculate profit factor from wins/losses arrays. */
  _calcProfitFactor(wins, losses) {
    const grossProfit = wins.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const grossLoss   = Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0));
    if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;
    return Math.round((grossProfit / grossLoss) * 100) / 100;
  }
}

export default PaperTradingEngine;
