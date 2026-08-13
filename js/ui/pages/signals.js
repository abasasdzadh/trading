/*
 * signals.js — Signals Page
 * Task ID: 2-h3
 *
 * Displays generated trading signals as cards with filtering by direction,
 * minimum score, and symbol. Supports clearing all signals.
 */

import { generateDemoSignals } from '../../core/demo-data.js';
import { formatDate, colorForSignal, colorForScore } from '../../core/utils.js';
import { SIGNAL_DIRECTIONS, SIGNAL_DIRECTION_LABELS, STRATEGY_LABELS } from '../../core/types.js';

/* ── helpers ─────────────────────────────────────────────────────── */

function _dirBadge(dir) {
  const c = colorForSignal(dir);
  const lbl = SIGNAL_DIRECTION_LABELS[dir] || dir.toUpperCase();
  return `<span style="display:inline-block;padding:3px 10px;border-radius:6px;font-size:var(--text-xs);font-weight:700;letter-spacing:.5px;color:${c};background:${c}18">${lbl}</span>`;
}

function _scoreBar(score) {
  const c = colorForScore(score);
  return `<div style="display:flex;align-items:center;gap:8px">
    <div style="flex:1;height:6px;background:var(--bg-secondary);border-radius:3px;overflow:hidden">
      <div style="width:${score}%;height:100%;background:${c};border-radius:3px;transition:width .3s"></div>
    </div>
    <span class="mono" style="font-size:var(--text-sm);font-weight:600;color:${c};min-width:36px;text-align:right">${score}</span>
  </div>`;
}

function _signalCardHTML(s) {
  const confidence = Math.max(0, Math.min(100, s.score + Math.floor(Math.random() * 15 - 5)));
  const timeAgo = _timeAgo(s.timestamp);
  return `<div class="card" style="margin-bottom:var(--space-3)">
  <div class="card-body" style="padding:var(--space-4)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
      <div style="display:flex;align-items:center;gap:var(--space-3)">
        ${_dirBadge(s.direction)}
        <span class="font-medium" style="font-size:var(--text-base)">${s.symbol}</span>
      </div>
      <span style="font-size:var(--text-xs);color:var(--text-muted)">${timeAgo}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);margin-bottom:var(--space-3);font-size:var(--text-xs)">
      <div><span style="color:var(--text-muted)">Timeframe:</span> <span class="mono">${s.timeframe || '—'}</span></div>
      <div><span style="color:var(--text-muted)">Strategy:</span> <span>${STRATEGY_LABELS[s.strategy] || s.strategy || '—'}</span></div>
      <div><span style="color:var(--text-muted)">Confidence:</span> <span class="mono">${confidence}%</span></div>
      <div><span style="color:var(--text-muted)">Price:</span> <span class="mono">${s.price != null ? s.price.toLocaleString('en-US', { maximumFractionDigits: 4 }) : '—'}</span></div>
    </div>
    <div style="margin-bottom:var(--space-3)"><span style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:4px">Score</span>${_scoreBar(s.score)}</div>
    ${s.reasoning ? `<p style="font-size:var(--text-xs);color:var(--text-secondary);line-height:1.5;margin:0">${s.reasoning}</p>` : ''}
  </div></div>`;
}

function _timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function _emptyHTML() {
  return `<div style="text-align:center;padding:var(--space-12);color:var(--text-muted)">
    <div style="font-size:var(--text-3xl);margin-bottom:var(--space-3);opacity:.4">📡</div>
    <div style="font-size:var(--text-sm)">No signals match the current filters</div></div>`;
}

/* ── page object ─────────────────────────────────────────────────── */

const SignalsPage = {
  render(ctx) {
    return `
<div class="page-header"><div class="page-header-left">
  <h1 class="page-header-title">Signals</h1>
  <p class="page-header-subtitle">Trading signals from all strategies</p>
</div><div class="page-header-actions">
  <button id="signals-clear-all" class="btn btn-danger btn-sm">Clear All</button>
</div></div>

<div class="card" style="margin-bottom:var(--space-6)"><div class="card-header"><div>
  <div class="card-header-title">Filters</div>
</div></div><div class="card-body">
  <div style="display:flex;gap:var(--space-4);flex-wrap:wrap;align-items:end">
    <div><label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">Direction</label>
      <select id="sig-filter-dir" style="padding:8px 12px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:var(--text-sm)">
        <option value="">All</option>
        <option value="long">Long</option>
        <option value="short">Short</option>
        <option value="no_trade">No Trade</option>
      </select>
    </div>
    <div><label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">Min Score</label>
      <input id="sig-filter-score" type="number" min="0" max="100" value="0" style="width:100px;padding:8px 12px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:var(--text-sm)">
    </div>
    <div style="flex:1;min-width:160px"><label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">Symbol</label>
      <input id="sig-filter-symbol" type="text" placeholder="Filter by symbol…" style="width:100%;padding:8px 12px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:var(--text-sm)">
    </div>
  </div>
</div></div>

<div id="signals-list"></div>`;
  },

  init(ctx) {
    let _signals = generateDemoSignals(25);
    const $ = (id) => document.getElementById(id);

    function getFilters() {
      return {
        direction: $('sig-filter-dir')?.value || '',
        minScore: parseInt($('sig-filter-score')?.value, 10) || 0,
        symbol: ($('sig-filter-symbol')?.value || '').trim().toUpperCase(),
      };
    }

    function renderList() {
      const f = getFilters();
      const list = $('signals-list');
      if (!list) return;

      const filtered = _signals.filter(s => {
        if (f.direction && s.direction !== f.direction) return false;
        if (s.score < f.minScore) return false;
        if (f.symbol && !s.symbol.toUpperCase().includes(f.symbol)) return false;
        return true;
      });

      if (!filtered.length) {
        list.innerHTML = _emptyHTML();
        return;
      }

      list.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:var(--space-4)">
        ${filtered.map(_signalCardHTML).join('')}
      </div>`;
    }

    // Filter listeners with debounce
    let _filterTimer = null;
    function onFilterChange() {
      clearTimeout(_filterTimer);
      _filterTimer = setTimeout(renderList, 200);
    }

    $('sig-filter-dir')?.addEventListener('change', onFilterChange);
    $('sig-filter-score')?.addEventListener('input', onFilterChange);
    $('sig-filter-symbol')?.addEventListener('input', onFilterChange);

    // Clear all
    $('signals-clear-all')?.addEventListener('click', () => {
      _signals = [];
      renderList();
    });

    // Initial render
    renderList();

    ctx._cleanup = () => { clearTimeout(_filterTimer); };
  },
};

export default SignalsPage;
