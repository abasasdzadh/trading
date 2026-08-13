/**
 * journal.js — Trade Journal Page
 * Task ID: 2-h4
 */

import { generateId, formatDate, formatPrice, formatPercent } from '../../core/utils.js';
import { STRATEGY_LABELS } from '../../core/types.js';
import { showToast } from '../components.js';

/* ── Emotions ────────────────────────────────────────────────────── */

const EMOTIONS = ['Calm', 'Confident', 'Anxious', 'FOMO', 'Fear', 'Greedy', 'Revenge', 'Neutral'];

/* ── Demo entries ────────────────────────────────────────────────── */

function _generateDemoEntries() {
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];
  const dirs = ['Long', 'Short'];
  const now = Date.now();
  return [
    { id: generateId(), date: now - 86400000, symbol: 'BTCUSDT', direction: 'Long', entryPrice: 66800, exitPrice: 68200, pnl: 210, emotion: 'Confident', marketCondition: 'Bullish trend with strong volume. EMA alignment confirmed.', strategy: 'ema_trend', lessons: 'Trust the EMA alignment. Don\'t overthink the entry.', tags: ['trend', 'ema', 'win'] },
    { id: generateId(), date: now - 172800000, symbol: 'ETHUSDT', direction: 'Short', entryPrice: 3650, exitPrice: 3580, pnl: 70, emotion: 'Calm', marketCondition: 'Overbought on RSI with bearish divergence.', strategy: 'rsi_pullback', lessons: 'Divergence confirmation is key. Wait for the candle close.', tags: ['rsi', 'divergence'] },
    { id: generateId(), date: now - 259200000, symbol: 'SOLUSDT', direction: 'Long', entryPrice: 175, exitPrice: 168, pnl: -105, emotion: 'FOMO', marketCondition: 'Pump and dump. Entered late after seeing green candles.', strategy: 'breakout_retest', lessons: 'Never chase pumps. Wait for retest confirmation.', tags: ['fomo', 'loss', 'lesson'] },
    { id: generateId(), date: now - 345600000, symbol: 'BNBUSDT', direction: 'Long', entryPrice: 590, exitPrice: 610, pnl: 200, emotion: 'Neutral', marketCondition: 'Bollinger squeeze breakout with volume confirmation.', strategy: 'bollinger_squeeze', lessons: 'Squeeze breakouts are high probability when volume confirms.', tags: ['bollinger', 'squeeze', 'win'] },
    { id: generateId(), date: now - 432000000, symbol: 'XRPUSDT', direction: 'Short', entryPrice: 0.64, exitPrice: 0.67, pnl: -30, emotion: 'Revenge', marketCondition: 'Counter-trend trade trying to catch a reversal.', strategy: 'market_structure', lessons: 'Don\'t revenge trade. Structure was still bullish.', tags: ['revenge', 'loss'] },
  ];
}

/* ── helpers ──────────────────────────────────────────────────────── */

function _pnlColor(v) { return v >= 0 ? 'var(--success)' : 'var(--danger)'; }

function _emotionBadge(e) {
  const colors = { Calm: 'info', Confident: 'success', Anxious: 'warning', FOMO: 'danger', Fear: 'danger', Greedy: 'warning', Revenge: 'danger', Neutral: 'neutral' };
  return `<span class="badge badge-${colors[e] || 'neutral'}">${e}</span>`;
}

function _entryCard(e) {
  const pnlStr = (e.pnl >= 0 ? '+$' : '-$') + Math.abs(e.pnl).toFixed(2);
  const tags = (e.tags || []).map(t => `<span class="badge badge-neutral">${t}</span>`).join(' ');
  return `<div class="card journal-entry-card" data-entry-id="${e.id}">
    <div class="card-body">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-2)">
        <div><span class="font-medium">${e.symbol}</span>
          <span class="badge badge-${e.direction.toLowerCase()}" style="margin-left:var(--space-1)">${e.direction}</span>
          ${_emotionBadge(e.emotion)}</div>
        <div class="mono" style="font-weight:600;color:${_pnlColor(e.pnl)}">${pnlStr}</div></div>
      <div style="display:flex;gap:var(--space-4);font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-2)">
        <span>📅 ${formatDate(e.date)}</span>
        <span>Entry: ${formatPrice(e.entryPrice)}</span>
        <span>Exit: ${formatPrice(e.exitPrice)}</span>
        <span>Strategy: ${STRATEGY_LABELS[e.strategy] || e.strategy}</span></div>
      <p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-2)"><strong>Market:</strong> ${e.marketCondition}</p>
      <p style="font-size:var(--text-sm)"><strong>Lessons:</strong> ${e.lessons}</p>
      ${tags ? `<div style="margin-top:var(--space-2)">${tags}</div>` : ''}
    </div>
  </div>`;
}

function _statsHTML(entries) {
  const total = entries.length;
  const wins = entries.filter(e => e.pnl > 0).length;
  const avgPnl = total ? (entries.reduce((s, e) => s + e.pnl, 0) / total).toFixed(2) : '0.00';
  const best = total ? Math.max(...entries.map(e => e.pnl)).toFixed(2) : '0.00';
  const worst = total ? Math.min(...entries.map(e => e.pnl)).toFixed(2) : '0.00';
  return `<div class="stat-card"><span class="stat-card-label">Total Entries</span><div class="stat-card-value">${total}</div></div>
    <div class="stat-card"><span class="stat-card-label">Avg PnL</span><div class="stat-card-value" style="color:${parseFloat(avgPnl) >= 0 ? 'var(--success)' : 'var(--danger)'}">$${avgPnl}</div></div>
    <div class="stat-card"><span class="stat-card-label">Win Rate</span><div class="stat-card-value">${total ? ((wins / total) * 100).toFixed(1) : '0'}%</div></div>
    <div class="stat-card"><span class="stat-card-label">Best Trade</span><div class="stat-card-value" style="color:var(--success)">+$${best}</div></div>
    <div class="stat-card"><span class="stat-card-label">Worst Trade</span><div class="stat-card-value" style="color:var(--danger)">$${worst}</div></div>`;
}

/* ── page ─────────────────────────────────────────────────────────── */

const JournalPage = {
  render(ctx) {
    const entries = _generateDemoEntries();
    ctx._journalEntries = entries;
    const emotionOpts = EMOTIONS.map(e => `<option value="${e}">${e}</option>`).join('');
    const stratOpts = Object.entries(STRATEGY_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');

    return `
<div class="page-header"><div class="page-header-left">
  <h1 class="page-header-title">Trade Journal</h1>
  <p class="page-header-subtitle">Track your trades and improve your edge</p>
</div><div class="page-header-actions">
  <button class="btn btn-ghost" id="journal-export">📥 Export</button>
  <button class="btn btn-primary" id="journal-new-btn">+ New Entry</button>
</div></div>

<div class="grid-4" style="margin-bottom:var(--space-4)" id="journal-stats">${_statsHTML(entries)}</div>

<div class="card" style="margin-bottom:var(--space-4)"><div class="card-body">
  <div class="form-row">
    <div class="form-group"><label class="form-label">Date From</label>
      <input class="input" type="date" id="journal-filter-from"></div>
    <div class="form-group"><label class="form-label">Date To</label>
      <input class="input" type="date" id="journal-filter-to"></div>
    <div class="form-group"><label class="form-label">Symbol</label>
      <input class="input" id="journal-filter-symbol" placeholder="e.g. BTCUSDT"></div>
    <div class="form-group"><label class="form-label">Emotion</label>
      <select class="select" id="journal-filter-emotion"><option value="">All</option>${emotionOpts}</select></div>
    <div class="form-group"><label class="form-label">Strategy</label>
      <select class="select" id="journal-filter-strategy"><option value="">All</option>${stratOpts}</select></div>
  </div>
</div></div>

<div id="journal-entries" style="display:flex;flex-direction:column;gap:var(--space-4)">
  ${entries.map(_entryCard).join('')}
</div>

<!-- New Entry Modal -->
<div class="modal-overlay" id="journal-modal" style="display:none">
  <div class="modal modal-lg">
    <div class="modal-header"><div class="modal-title">New Journal Entry</div>
      <button class="modal-close" id="journal-modal-close">×</button></div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Date</label>
          <input class="input" type="date" id="je-date"></div>
        <div class="form-group"><label class="form-label">Symbol</label>
          <input class="input" id="je-symbol" placeholder="BTCUSDT"></div>
        <div class="form-group"><label class="form-label">Direction</label>
          <select class="select" id="je-dir"><option value="Long">Long</option><option value="Short">Short</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Entry Price</label>
          <input class="input" type="number" id="je-entry" step="any" placeholder="0.00"></div>
        <div class="form-group"><label class="form-label">Exit Price</label>
          <input class="input" type="number" id="je-exit" step="any" placeholder="0.00"></div>
        <div class="form-group"><label class="form-label">PnL ($)</label>
          <input class="input" type="number" id="je-pnl" step="any" placeholder="0.00"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Emotion</label>
          <select class="select" id="je-emotion">${emotionOpts}</select></div>
        <div class="form-group"><label class="form-label">Strategy</label>
          <select class="select" id="je-strategy"><option value="">None</option>${stratOpts}</select></div>
      </div>
      <div class="form-group"><label class="form-label">Market Condition</label>
        <textarea class="input" id="je-market" rows="2" placeholder="Describe the market conditions..." style="resize:vertical"></textarea></div>
      <div class="form-group"><label class="form-label">Lessons Learned</label>
        <textarea class="input" id="je-lessons" rows="2" placeholder="What did you learn?" style="resize:vertical"></textarea></div>
      <div class="form-group"><label class="form-label">Tags (comma-separated)</label>
        <input class="input" id="je-tags" placeholder="trend, win, lesson"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="journal-modal-cancel">Cancel</button>
      <button class="btn btn-primary" id="journal-modal-submit">Save Entry</button>
    </div>
  </div>
</div>`;
  },

  init(ctx) {
    const entries = ctx._journalEntries;
    const $ = id => document.getElementById(id);
    const modal = $('journal-modal');

    // Modal
    $('journal-new-btn')?.addEventListener('click', () => {
 $('je-date').value = new Date().toISOString().split('T')[0];
      modal.style.display = 'flex';
    });
    const closeModal = () => { modal.style.display = 'none'; };
    $('journal-modal-close')?.addEventListener('click', closeModal);
    $('journal-modal-cancel')?.addEventListener('click', closeModal);
    modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });

    // Submit new entry
    $('journal-modal-submit')?.addEventListener('click', () => {
      const entry = {
        id: generateId(),
        date: new Date($('je-date').value).getTime(),
        symbol: $('je-symbol').value.toUpperCase(),
        direction: $('je-dir').value,
        entryPrice: parseFloat($('je-entry').value) || 0,
        exitPrice: parseFloat($('je-exit').value) || 0,
        pnl: parseFloat($('je-pnl').value) || 0,
        emotion: $('je-emotion').value,
        strategy: $('je-strategy').value,
        marketCondition: $('je-market').value,
        lessons: $('je-lessons').value,
        tags: $('je-tags').value.split(',').map(t => t.trim()).filter(Boolean),
      };
      entries.unshift(entry);
      ctx.storage?.setSetting?.('journal', entries);
      ctx.eventBus?.emit?.('journal:entry-added', entry);
      showToast('Journal entry saved', 'success');
      closeModal();
      location.reload();
    });

    // Filters
    function applyFilters() {
      const from = $('journal-filter-from').value ? new Date($('journal-filter-from').value).getTime() : 0;
      const to = $('journal-filter-to').value ? new Date($('journal-filter-to').value).getTime() + 86400000 : Infinity;
      const symbol = ($('journal-filter-symbol').value || '').toUpperCase();
      const emotion = $('journal-filter-emotion').value;
      const strategy = $('journal-filter-strategy').value;

      const filtered = entries.filter(e => {
        if (e.date < from || e.date > to) return false;
        if (symbol && !e.symbol.includes(symbol)) return false;
        if (emotion && e.emotion !== emotion) return false;
        if (strategy && e.strategy !== strategy) return false;
        return true;
      });

      const container = $('journal-entries');
      container.innerHTML = filtered.length ? filtered.map(_entryCard).join('')
        : '<div style="text-align:center;padding:var(--space-8);color:var(--text-muted)">No entries match the filters</div>';
      $('journal-stats').innerHTML = _statsHTML(filtered);
    }

    ['journal-filter-from', 'journal-filter-to', 'journal-filter-symbol', 'journal-filter-emotion', 'journal-filter-strategy'].forEach(id => {
      $(id)?.addEventListener('input', applyFilters);
      $(id)?.addEventListener('change', applyFilters);
    });

    // Export
    $('journal-export')?.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `journal-${Date.now()}.json`; a.click();
      URL.revokeObjectURL(a.href);
      showToast('Journal exported', 'success');
    });

    ctx._cleanup = () => {};
  },
};

export default JournalPage;
