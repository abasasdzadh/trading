/**
 * dashboard.js — Dashboard Page
 * Task ID: 2-h1
 */

import { TradingChart } from '../charts.js';
import { generateDemoCandles, generateDemoSignals, generateDemoWatchlist, DEMO_SYMBOLS } from '../../core/demo-data.js';
import { formatPrice, formatPercent, formatVolume, colorForSignal, getSymbolInfo } from '../../core/utils.js';
import ema from '../../indicators/ema.js';

/* ── helpers ──────────────────────────────────────────────────────── */

function _changeClass(v) { return v >= 0 ? 'positive' : 'negative'; }
function _arrow(v) { return v >= 0 ? '↑' : '↓'; }

function _wlRow(symbol) {
  const candles = generateDemoCandles(symbol, '1h', 500);
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const price = last.close;
  const chg = prev ? ((last.close - prev.close) / prev.close) * 100 : 0;
  const color = chg >= 0 ? 'var(--success)' : 'var(--danger)';
  const info = getSymbolInfo(symbol);
  return `<tr>
    <td class="font-medium">${info.label || symbol}</td>
    <td class="mono">${formatPrice(price)}</td>
    <td style="color:${color}" class="mono">${formatPercent(chg)}</td>
    <td class="mono">${formatVolume(last.volume)}</td>
  </tr>`;
}

function _sigCard(s) {
  const dir = s.direction || 'no_trade';
  const arr = dir === 'long' ? '▲' : dir === 'short' ? '▼' : '●';
  const c = colorForSignal(dir);
  const sc = s.score >= 75 ? 'var(--success)' : s.score >= 50 ? 'var(--warning)' : 'var(--danger)';
  const lbl = dir === 'no_trade' ? 'NO TRADE' : dir.toUpperCase();
  return `<div class="signal-card"><div class="signal-direction">
    <span class="signal-direction-arrow ${dir}" style="color:${c}">${arr}</span>
    <span class="signal-direction-label ${dir}" style="color:${c}">${lbl}</span>
    <span class="card-header-title" style="margin-left:auto;font-size:var(--text-sm)">${s.symbol}</span>
  </div><div class="signal-meta">
    <span class="signal-meta-item">TF: <span class="signal-meta-value">${s.timeframe || '—'}</span></span>
    <span class="signal-meta-item">Strategy: <span class="signal-meta-value">${s.strategy || '—'}</span></span>
    <span class="signal-meta-item">Score: <span class="signal-meta-value" style="color:${sc}">${s.score}/100</span></span>
  </div></div>`;
}

function _demoStats(ctx) {
  const trades = ctx.storage?.get?.('trades');
  let totalPnl = 0, openCount = 0, wins = 0, closed = 0;
  if (Array.isArray(trades)) {
    const cl = trades.filter(t => t.status === 'closed');
    openCount = trades.filter(t => t.status === 'open').length;
    totalPnl = cl.reduce((s, t) => s + (t.pnl ?? 0), 0);
    wins = cl.filter(t => (t.pnl ?? 0) > 0).length;
    closed = cl.length;
  }
  const pv = 10000 + totalPnl;
  return {
    pv: '$' + pv.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    pnl: (totalPnl >= 0 ? '+$' : '-$') + Math.abs(totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2 }),
    pnlCls: _changeClass(totalPnl), pnlArr: _arrow(totalPnl), pnlPct: formatPercent(totalPnl / 10000 * 100),
    wr: closed ? ((wins / closed) * 100).toFixed(1) + '%' : '0%',
    at: openCount,
  };
}

/* ── page ─────────────────────────────────────────────────────────── */

const DashboardPage = {
  render(ctx) {
    const isDemo = ctx.app?.isDemoMode?.() ?? true;
    const s = isDemo ? _demoStats(ctx) : { pv: '$10,000.00', pnl: '$0.00', pnlCls: '', pnlArr: '', pnlPct: '', wr: '0%', at: 0 };

    let wlRows = isDemo
      ? generateDemoWatchlist().map(_wlRow).join('')
      : '<tr><td colspan="4" style="text-align:center;padding:var(--space-6);color:var(--text-muted)">No data</td></tr>';

    let sigs = isDemo
      ? generateDemoSignals(20).slice(0, 3).map(_sigCard).join('')
      : '<div style="text-align:center;padding:var(--space-6);color:var(--text-muted)">No signals</div>';

    return `
<div class="page-header"><div class="page-header-left">
  <h1 class="page-header-title">Dashboard</h1>
  <p class="page-header-subtitle">Market overview and portfolio at a glance</p>
</div><div class="page-header-actions">
  <button id="dashboard-refresh-btn" class="btn btn-ghost">&#x21bb; Refresh</button>
</div></div>

<div class="grid-4" style="margin-bottom:var(--space-6)">
  <div class="stat-card"><div style="display:flex;align-items:center;justify-content:space-between">
    <span class="stat-card-label">Portfolio Value</span><span style="opacity:.5">💰</span></div>
    <div class="stat-card-value" id="sv-pv">${s.pv}</div></div>
  <div class="stat-card"><div style="display:flex;align-items:center;justify-content:space-between">
    <span class="stat-card-label">Total PnL</span><span style="opacity:.5">📊</span></div>
    <div class="stat-card-value" id="sv-pnl">${s.pnl}</div>
    ${s.pnlCls ? `<span class="stat-card-change ${s.pnlCls}"><span class="stat-card-change-arrow">${s.pnlArr}</span> ${s.pnlPct}</span>` : ''}</div>
  <div class="stat-card"><div style="display:flex;align-items:center;justify-content:space-between">
    <span class="stat-card-label">Win Rate</span><span style="opacity:.5">🎯</span></div>
    <div class="stat-card-value" id="sv-wr">${s.wr}</div></div>
  <div class="stat-card"><div style="display:flex;align-items:center;justify-content:space-between">
    <span class="stat-card-label">Active Trades</span><span style="opacity:.5">⚡</span></div>
    <div class="stat-card-value" id="sv-at">${s.at}</div></div>
</div>

<div class="card" style="margin-bottom:var(--space-6)"><div class="card-header">
  <div><div class="card-header-title">Watchlist</div></div>
</div><div class="card-body" style="padding:0;overflow-x:auto"><div class="table-wrapper">
  <table class="data-table striped"><thead><tr>
    <th>Symbol</th><th>Price</th><th>24h Change</th><th>Volume</th>
  </tr></thead><tbody id="dash-wl">${wlRows}</tbody></table>
</div></div></div>

<div class="card" style="margin-bottom:var(--space-6)"><div class="card-header">
  <div><div class="card-header-title">Recent Signals</div></div>
</div><div class="card-body" id="dash-sigs">
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--space-4)">${sigs}</div>
</div></div>

<div class="card"><div class="card-header"><div>
  <div class="card-header-title">Market Overview</div>
  <div class="card-header-subtitle" style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px">BTCUSDT · 1h · EMA 20</div>
</div></div><div class="card-body" style="padding:0">
  <div id="dashboard-chart" style="width:100%;height:420px"></div>
</div></div>`;
  },

  init(ctx) {
    const { app, eventBus } = ctx;
    const isDemo = app?.isDemoMode?.() ?? true;
    let chart = null;

    function loadChart() {
      const el = document.getElementById('dashboard-chart');
      if (!el) return;
      if (chart) { chart.destroy(); chart = null; }
      const candles = generateDemoCandles('BTCUSDT', '1h', 500);
      chart = new TradingChart(el, { withVolume: true, height: '420px' });
      chart.createChart();
      chart.setCandles(candles);
      const { values } = ema(candles, { period: 20 });
      const emaData = candles.map((c, i) => values[i] != null ? { time: c.time, value: values[i] } : null).filter(Boolean);
      chart.addLine(emaData, { color: '#f59e0b', lineWidth: 2, title: 'EMA 20', id: 'ema-20' });
      chart.fitContent();
    }

    function refresh() {
      if (!isDemo) return;
      const s = _demoStats(ctx);
      const $ = id => document.getElementById(id);
      $('sv-pv') && ($('sv-pv').textContent = s.pv);
      $('sv-pnl') && ($('sv-pnl').textContent = s.pnl);
      $('sv-wr') && ($('sv-wr').textContent = s.wr);
      $('sv-at') && ($('sv-at').textContent = s.at);
      const wl = $('dash-wl');
      if (wl) wl.innerHTML = generateDemoWatchlist().map(_wlRow).join('');
      const sg = $('dash-sigs')?.querySelector('div');
      if (sg) sg.innerHTML = generateDemoSignals(20).slice(0, 3).map(_sigCard).join('');
      loadChart();
      eventBus?.emit?.('dashboard:refreshed', { timestamp: Date.now() });
    }

    if (isDemo) loadChart();

    const btn = document.getElementById('dashboard-refresh-btn');
    if (btn) btn.addEventListener('click', () => {
      btn.disabled = true; btn.innerHTML = '&#x21bb; Refreshing…';
      requestAnimationFrame(() => { refresh(); btn.disabled = false; btn.innerHTML = '&#x21bb; Refresh'; });
    });

    eventBus?.on?.('data:update', refresh);
    ctx._cleanup = () => { chart?.destroy(); chart = null; eventBus?.off?.('data:update', refresh); };
  },
};

export default DashboardPage;
