/**
 * paper-trading.js — Paper Trading Page
 * Task ID: 2-h4
 */

import { generateDemoTrades, DEMO_SYMBOLS } from '../../core/demo-data.js';
import { formatPrice, formatPercent, formatDate, generateId } from '../../core/utils.js';
import { TRADE_STATUS, SIGNAL_DIRECTIONS } from '../../core/types.js';

/* ── helpers ──────────────────────────────────────────────────────── */

function _pnlColor(v) { return v == null ? 'var(--text-muted)' : v >= 0 ? 'var(--success)' : 'var(--danger)'; }
function _pnlSign(v) { return v == null ? '' : v >= 0 ? '+' : ''; }

function _statsHTML(trades) {
  const closed = trades.filter(t => t.status === TRADE_STATUS.CLOSED);
  const open = trades.filter(t => t.status === TRADE_STATUS.OPEN);
  const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const wins = closed.filter(t => (t.pnl ?? 0) > 0).length;
  const wr = closed.length ? ((wins / closed.length) * 100).toFixed(1) + '%' : '0%';
  const pnlStr = (totalPnl >= 0 ? '+$' : '-$') + Math.abs(totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2 });
  return `
    <div class="stat-card"><span class="stat-card-label">Total PnL</span>
      <div class="stat-card-value" style="color:${_pnlColor(totalPnl)}">${pnlStr}</div></div>
    <div class="stat-card"><span class="stat-card-label">Win Rate</span>
      <div class="stat-card-value">${wr}</div></div>
    <div class="stat-card"><span class="stat-card-label">Open Positions</span>
      <div class="stat-card-value">${open.length}</div></div>
    <div class="stat-card"><span class="stat-card-label">Total Trades</span>
      <div class="stat-card-value">${trades.length}</div></div>`;
}

function _openRow(t, i) {
  const dir = t.direction === 'long' ? 'Long' : 'Short';
  const pnlPct = t.pnlPercent != null ? formatPercent(t.pnlPct) : '—';
  const pnl = t.pnl != null ? `${_pnlSign(t.pnl)}$${Math.abs(t.pnl).toFixed(2)}` : '—';
  return `<tr>
    <td class="font-medium">${t.symbol}</td>
    <td><span class="badge badge-${t.direction}">${dir}</span></td>
    <td class="mono">${formatPrice(t.entryPrice)}</td>
    <td class="mono">—</td>
    <td class="mono">${formatPrice(t.stopLoss)}</td>
    <td class="mono">${formatPrice(t.takeProfit)}</td>
    <td class="mono" style="color:${_pnlColor(t.pnl)}">${pnl}</td>
    <td class="mono" style="color:${_pnlColor(t.pnlPercent)}">${pnlPct}</td>
    <td><button class="btn btn-sm btn-danger" data-close-trade="${i}">Close</button></td>
  </tr>`;
}

function _historyRow(t) {
  const dir = t.direction === 'long' ? 'Long' : 'Short';
  const pnlPct = formatPercent(t.pnlPercent ?? 0);
  const pnl = `${_pnlSign(t.pnl)}$${Math.abs(t.pnl).toFixed(2)}`;
  const reason = (t.exitReason || '—').replace(/_/g, ' ');
  return `<tr>
    <td class="font-medium">${t.symbol}</td>
    <td><span class="badge badge-${t.direction}">${dir}</span></td>
    <td>${formatDate(t.entryTime)}</td>
    <td class="mono">${formatPrice(t.entryPrice)}</td>
    <td>${t.exitTime ? formatDate(t.exitTime) : '—'}</td>
    <td class="mono">${formatPrice(t.exitPrice)}</td>
    <td class="mono" style="color:${_pnlColor(t.pnl)}">${pnl}</td>
    <td class="mono" style="color:${_pnlColor(t.pnlPercent)}">${pnlPct}</td>
    <td>${reason}</td>
  </tr>`;
}

/* ── page ─────────────────────────────────────────────────────────── */

const PaperTradingPage = {
  render(ctx) {
    const isDemo = ctx.app?.isDemoMode?.() ?? true;
    let trades = isDemo ? generateDemoTrades(15) : (ctx._trades || []);
    ctx._trades = trades;
    const openTrades = trades.filter(t => t.status === TRADE_STATUS.OPEN);
    const closedTrades = trades.filter(t => t.status === TRADE_STATUS.CLOSED);
    const symbols = Object.keys(DEMO_SYMBOLS).map(s => `<option value="${s}">${s}</option>`).join('');

    return `
<div class="page-header"><div class="page-header-left">
  <h1 class="page-header-title">Paper Trading</h1>
  <p class="page-header-subtitle">Practice trades without risk</p>
</div><div class="page-header-actions">
  <button id="pt-export-btn" class="btn btn-ghost">📥 Export Trades</button>
  <button id="pt-new-btn" class="btn btn-primary">+ New Trade</button>
</div></div>

<div class="grid-4" style="margin-bottom:var(--space-6)" id="pt-stats">${_statsHTML(trades)}</div>

<div class="tabs-container" id="pt-tabs">
  <div class="tabs-nav">
    <button class="tab-item active" data-tab="open">Open Positions</button>
    <button class="tab-item" data-tab="history">Trade History</button>
  </div>
  <div class="tab-panel active" data-tab-panel="open">
    <div class="card"><div class="card-body" style="padding:0;overflow-x:auto"><div class="table-wrapper">
      <table class="data-table striped"><thead><tr>
        <th>Symbol</th><th>Direction</th><th>Entry Price</th><th>Current Price</th>
        <th>SL</th><th>TP</th><th>PnL</th><th>PnL%</th><th>Actions</th>
      </tr></thead><tbody id="pt-open-tbody">
        ${openTrades.length ? openTrades.map((t, i) => _openRow(t, i)).join('') : '<tr><td colspan="9" style="text-align:center;padding:var(--space-6);color:var(--text-muted)">No open positions</td></tr>'}
      </tbody></table>
    </div></div></div>
  </div>
  <div class="tab-panel" data-tab-panel="history">
    <div class="card"><div class="card-body" style="padding:0;overflow-x:auto"><div class="table-wrapper">
      <table class="data-table striped"><thead><tr>
        <th>Symbol</th><th>Direction</th><th>Entry Time</th><th>Entry Price</th>
        <th>Exit Time</th><th>Exit Price</th><th>PnL</th><th>PnL%</th><th>Reason</th>
      </tr></thead><tbody id="pt-history-tbody">
        ${closedTrades.length ? closedTrades.map(_historyRow).join('') : '<tr><td colspan="9" style="text-align:center;padding:var(--space-6);color:var(--text-muted)">No trade history</td></tr>'}
      </tbody></table>
    </div></div></div>
  </div>
</div>

<!-- New Trade Modal -->
<div class="modal-overlay" id="pt-modal" style="display:none">
  <div class="modal modal-lg">
    <div class="modal-header"><div class="modal-title">New Trade</div>
      <button class="modal-close" id="pt-modal-close">×</button></div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Symbol</label>
          <select class="select" id="pt-f-symbol">${symbols}</select></div>
        <div class="form-group"><label class="form-label">Direction</label>
          <select class="select" id="pt-f-dir"><option value="long">Long</option><option value="short">Short</option></select></div>
        <div class="form-group"><label class="form-label">Quantity</label>
          <input class="input" type="number" id="pt-f-qty" placeholder="0.00" step="any" min="0"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Entry Price</label>
          <input class="input" type="number" id="pt-f-entry" placeholder="0.00" step="any"></div>
        <div class="form-group"><label class="form-label">Stop Loss</label>
          <input class="input" type="number" id="pt-f-sl" placeholder="0.00" step="any"></div>
        <div class="form-group"><label class="form-label">TP1</label>
          <input class="input" type="number" id="pt-f-tp1" placeholder="0.00" step="any"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">TP2</label>
          <input class="input" type="number" id="pt-f-tp2" placeholder="0.00" step="any"></div>
        <div class="form-group"><label class="form-label">TP3</label>
          <input class="input" type="number" id="pt-f-tp3" placeholder="0.00" step="any"></div>
      </div>
      <div class="form-group"><label class="form-label">Reasoning</label>
        <textarea class="input" id="pt-f-reason" rows="3" placeholder="Why are you taking this trade?" style="resize:vertical"></textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="pt-modal-cancel">Cancel</button>
      <button class="btn btn-primary" id="pt-modal-submit">Submit Trade</button>
    </div>
  </div>
</div>`;
  },

  init(ctx) {
    const trades = ctx._trades;
    const $ = id => document.getElementById(id);
    const modal = $('pt-modal');

    // Tab switching
    const tabContainer = $('pt-tabs');
    tabContainer?.querySelectorAll('.tab-item').forEach(btn => {
      btn.addEventListener('click', () => {
        tabContainer.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        tabContainer.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        tabContainer.querySelector(`[data-tab-panel="${btn.dataset.tab}"]`)?.classList.add('active');
      });
    });

    // Modal open/close
    $('pt-new-btn')?.addEventListener('click', () => { modal.style.display = 'flex'; });
    const closeModal = () => { modal.style.display = 'none'; };
    $('pt-modal-close')?.addEventListener('click', closeModal);
    $('pt-modal-cancel')?.addEventListener('click', closeModal);
    modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });

    // Close trade button
    document.querySelectorAll('[data-close-trade]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.closeTrade, 10);
        const trade = trades.find((t, ti) => ti === idx && t.status === TRADE_STATUS.OPEN);
        if (!trade) return;
        trade.status = TRADE_STATUS.CLOSED;
        trade.exitPrice = trade.entryPrice * (1 + (Math.random() - 0.4) * 0.06);
        trade.exitTime = Date.now();
        const mult = trade.direction === 'long' ? 1 : -1;
        trade.pnl = parseFloat(((trade.exitPrice - trade.entryPrice) * trade.quantity * mult).toFixed(2));
        trade.pnlPercent = parseFloat(((trade.exitPrice - trade.entryPrice) / trade.entryPrice * 100 * mult).toFixed(2));
        trade.exitReason = 'manual';
        ctx.eventBus?.emit?.('trade:closed', trade);
        location.reload();
      });
    });

    // Submit new trade
    $('pt-modal-submit')?.addEventListener('click', () => {
      const entry = parseFloat($('pt-f-entry').value);
      const qty = parseFloat($('pt-f-qty').value);
      if (!entry || !qty) { alert('Please fill in Entry Price and Quantity.'); return; }
      const newTrade = {
        id: generateId(),
        symbol: $('pt-f-symbol').value,
        direction: $('pt-f-dir').value,
        entryPrice: entry,
        quantity: qty,
        stopLoss: parseFloat($('pt-f-sl').value) || null,
        takeProfit: parseFloat($('pt-f-tp1').value) || null,
        status: TRADE_STATUS.OPEN,
        entryTime: Date.now(),
        exitPrice: null, exitTime: null, pnl: null, pnlPercent: null,
        exitReason: null, strategy: 'manual',
      };
      trades.unshift(newTrade);
      ctx.storage?.savePaperTrade?.(newTrade);
      ctx.eventBus?.emit?.('trade:opened', newTrade);
      closeModal();
      location.reload();
    });

    // Export trades
    $('pt-export-btn')?.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(trades, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `paper-trades-${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url);
      ctx.eventBus?.emit?.('trade:exported', { count: trades.length });
    });

    ctx._cleanup = () => {};
  },
};

export default PaperTradingPage;
