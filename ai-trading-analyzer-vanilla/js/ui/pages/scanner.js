/**
 * scanner.js — Market Scanner Page
 * Task ID: 2-h3
 *
 * Scans multiple symbols across timeframes and strategies using demo data.
 * Computes indicators and generates signals, then displays sorted results.
 */

import { generateDemoCandles, DEMO_SYMBOLS, DEMO_SYMBOL_LIST } from '../../core/demo-data.js';
import { formatPrice, formatPercent, formatVolume, colorForSignal, calculateATRSimple, getSymbolInfo } from '../../core/utils.js';
import { SIGNAL_DIRECTIONS, STRATEGY_TYPES, STRATEGY_LABELS, TIMEFRAMES, TIMEFRAME_LABELS } from '../../core/types.js';
import ema from '../../indicators/ema.js';
import rsi from '../../indicators/rsi.js';
import macd from '../../indicators/macd.js';

/* ── helpers ─────────────────────────────────────────────────────── */

function _quickSignal(candles) {
  if (!candles || candles.length < 50) return { direction: 'no_trade', score: 0 };
  const close = candles[candles.length - 1].close;
  const e20 = ema(candles, { period: 20 }).values;
  const e50 = ema(candles, { period: 50 }).values;
  const le20 = e20[e20.length - 1], le50 = e50[e50.length - 1];
  let trend = 50;
  if (le20 && le50) {
    trend = le20 > le50
      ? 50 + Math.min(40, ((le20 - le50) / le50) * 1000)
      : 50 - Math.min(40, ((le50 - le20) / le20) * 1000);
    trend = Math.round(Math.max(0, Math.min(100, trend)));
  }
  const rsiVals = rsi(candles, { period: 14 }).values;
  const lastRsi = rsiVals[rsiVals.length - 1] ?? 50;
  let mom = Math.round(Math.max(0, Math.min(100, 100 - Math.abs(lastRsi - 50) * 1.2)));
  const macdH = macd(candles).values?.histogram;
  if (macdH?.length) {
    const h = macdH[macdH.length - 1];
    if (h != null) mom = Math.round((mom + (h > 0 ? 70 : 30)) / 2);
  }
  const atr = calculateATRSimple(candles, 14);
  const vlt = atr ? Math.round(Math.min(100, (atr / close) * 500)) : 50;
  const score = Math.round((trend + mom + vlt) / 3);
  let direction = SIGNAL_DIRECTIONS.NO_TRADE;
  if (score >= 60 && trend > 50) direction = SIGNAL_DIRECTIONS.LONG;
  else if (score >= 60 && trend < 50) direction = SIGNAL_DIRECTIONS.SHORT;
  return { direction, score };
}

function _dirBadge(dir) {
  const c = colorForSignal(dir);
  const lbl = dir === 'long' ? 'LONG' : dir === 'short' ? 'SHORT' : 'NO TRADE';
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:var(--text-xs);font-weight:600;color:${c};background:${c}18">${lbl}</span>`;
}

function _resultRow(r, idx) {
  const price = r.price;
  const prev = r.prevClose || price;
  const chg = ((price - prev) / prev) * 100;
  const chgCls = chg >= 0 ? 'positive' : 'negative';
  const scoreColor = r.score >= 75 ? 'var(--success)' : r.score >= 50 ? 'var(--warning)' : 'var(--danger)';
  return `<tr style="cursor:pointer" data-navigate="#/chart/${r.symbol}">
    <td class="font-medium">${getSymbolInfo(r.symbol).label || r.symbol}</td>
    <td>${_dirBadge(r.direction)}</td>
    <td class="mono" style="color:${scoreColor}">${r.score}</td>
    <td class="mono">${formatPrice(price)}</td>
    <td class="mono ${chgCls}">${formatPercent(chg)}</td>
    <td class="mono">${formatVolume(r.volume)}</td>
    <td><button class="btn btn-ghost btn-sm" data-navigate="#/chart/${r.symbol}">View</button></td>
  </tr>`;
}

/* ── page object ─────────────────────────────────────────────────── */

const ScannerPage = {
  render(ctx) {
    const tfOpts = TIMEFRAMES.map(tf =>
      `<option value="${tf}">${TIMEFRAME_LABELS[tf] || tf}</option>`
    ).join('');
    const stratOpts = ['all', ...Object.values(STRATEGY_TYPES)].map(s => {
      const label = s === 'all' ? 'All Strategies' : (STRATEGY_LABELS[s] || s);
      return `<option value="${s}">${label}</option>`;
    }).join('');

    return `
<div class="page-header"><div class="page-header-left">
  <h1 class="page-header-title">Market Scanner</h1>
  <p class="page-header-subtitle">Scan multiple symbols for trading opportunities</p>
</div><div class="page-header-actions">
  <button id="scan-btn" class="btn btn-primary">Scan</button>
</div></div>

<div class="card" style="margin-bottom:var(--space-6)"><div class="card-header"><div>
  <div class="card-header-title">Scan Configuration</div>
</div></div><div class="card-body">
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 120px;gap:var(--space-4);align-items:end">
    <div><label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">Symbols</label>
      <textarea id="scan-symbols" rows="3" placeholder="BTCUSDT, ETHUSDT, SOLUSDT..." style="width:100%;padding:8px 12px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:var(--text-sm);resize:vertical">${DEMO_SYMBOL_LIST.join(', ')}</textarea>
    </div>
    <div><label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">Timeframe</label>
      <select id="scan-timeframe" style="width:100%;padding:8px 12px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:var(--text-sm)">${tfOpts}</select>
    </div>
    <div><label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">Strategy</label>
      <select id="scan-strategy" style="width:100%;padding:8px 12px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:var(--text-sm)">${stratOpts}</select>
    </div>
    <div><label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">Min Score</label>
      <input id="scan-min-score" type="number" min="0" max="100" value="60" style="width:100%;padding:8px 12px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:var(--text-sm)">
    </div>
  </div>
</div></div>

<div id="scan-progress" style="display:none;margin-bottom:var(--space-6)"><div class="card"><div class="card-body">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
    <span style="font-size:var(--text-sm);color:var(--text-secondary)">Scanning…</span>
    <span id="scan-progress-text" style="font-size:var(--text-sm);color:var(--text-muted)">0%</span>
  </div>
  <div style="height:8px;background:var(--bg-secondary);border-radius:4px;overflow:hidden">
    <div id="scan-progress-bar" style="width:0%;height:100%;background:var(--primary);border-radius:4px;transition:width .2s"></div>
  </div>
</div></div></div>

<div class="card"><div class="card-header"><div>
  <div class="card-header-title">Scan Results</div>
</div><div class="card-header-actions">
  <button id="scan-export-csv" class="btn btn-ghost btn-sm">Export CSV</button>
</div></div><div class="card-body" style="padding:0;overflow-x:auto"><div class="table-wrapper">
  <table class="data-table striped"><thead><tr>
    <th>Symbol</th><th>Signal</th><th>Score</th><th>Price</th><th>24h Change</th><th>Volume</th><th>Actions</th>
  </tr></thead><tbody id="scan-results">
    <tr><td colspan="7" style="text-align:center;padding:var(--space-8);color:var(--text-muted)">Configure symbols and click Scan to begin</td></tr>
  </tbody></table>
</div></div></div>`;
  },

  init(ctx) {
    let _results = [];
    const $ = (id) => document.getElementById(id);
    const btn = $('scan-btn');
    const exportBtn = $('scan-export-csv');

    function runScan() {
      const rawSymbols = $('scan-symbols').value;
      const symbols = rawSymbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      const timeframe = $('scan-timeframe').value;
      const strategy = $('scan-strategy').value;
      const minScore = parseInt($('scan-min-score').value, 10) || 0;

      if (!symbols.length) return;
      btn.disabled = true;
      btn.textContent = 'Scanning…';
      $('scan-progress').style.display = 'block';
      _results = [];
      let i = 0;

      function processNext() {
        if (i >= symbols.length) {
          // Done — filter, sort, render
          _results = _results.filter(r => r.score >= minScore).sort((a, b) => b.score - a.score);
          renderResults();
          btn.disabled = false;
          btn.textContent = 'Scan';
          $('scan-progress-text').textContent = 'Done';
          setTimeout(() => { $('scan-progress').style.display = 'none'; }, 1200);
          return;
        }
        const sym = symbols[i];
        const pct = Math.round(((i + 1) / symbols.length) * 100);
        $('scan-progress-bar').style.width = pct + '%';
        $('scan-progress-text').textContent = `${pct}% — ${sym}`;

        try {
          const candles = generateDemoCandles(sym, timeframe, 500);
          const { direction, score } = _quickSignal(candles);
          const last = candles[candles.length - 1];
          const prev = candles.length >= 2 ? candles[candles.length - 2] : last;
          _results.push({
            symbol: sym, direction, score, strategy,
            price: last.close,
            prevClose: prev.close,
            volume: last.volume,
            timeframe,
          });
        } catch (e) {
          console.warn(`[Scanner] Error scanning ${sym}:`, e);
        }
        i++;
        setTimeout(processNext, 80);
      }
      processNext();
    }

    function renderResults() {
      const tbody = $('scan-results');
      if (!_results.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:var(--space-8);color:var(--text-muted)">No signals above minimum score</td></tr>';
        return;
      }
      tbody.innerHTML = _results.map((r, idx) => _resultRow(r, idx)).join('');
      // Row click navigation
      tbody.querySelectorAll('tr[data-navigate]').forEach(row => {
        row.addEventListener('click', (e) => {
          if (e.target.tagName !== 'BUTTON') {
            window.location.hash = row.dataset.navigate;
          }
        });
      });
      // Button clicks
      tbody.querySelectorAll('button[data-navigate]').forEach(b => {
        b.addEventListener('click', () => { window.location.hash = b.dataset.navigate; });
      });
    }

    function exportCSV() {
      if (!_results.length) return;
      const header = 'Symbol,Signal,Score,Price,24h Change,Volume,Timeframe\n';
      const rows = _results.map(r => {
        const chg = r.prevClose ? ((r.price - r.prevClose) / r.prevClose * 100).toFixed(2) : '0';
        return `${r.symbol},${r.direction},${r.score},${r.price},${chg}%,${r.volume.toFixed(2)},${r.timeframe}`;
      }).join('\n');
      const blob = new Blob([header + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `scanner-results-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
    }

    if (btn) btn.addEventListener('click', runScan);
    if (exportBtn) exportBtn.addEventListener('click', exportCSV);
    ctx._cleanup = () => {};
  },
};

export default ScannerPage;
