/**
 * markets.js — Markets Page
 * Task ID: 2-h4
 */

import { DEMO_SYMBOLS, DEMO_SYMBOL_LIST, generateDemoCandles } from '../../core/demo-data.js';
import { formatPrice, formatPercent, formatVolume, getSymbolInfo } from '../../core/utils.js';

/* ── helpers ──────────────────────────────────────────────────────── */

function _marketRow(symbol, isDemo) {
  let price, chg, vol;
  if (isDemo) {
    const candles = generateDemoCandles(symbol, '1h', 2);
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    price = last.close;
    chg = prev ? ((last.close - prev.close) / prev.close) * 100 : 0;
    vol = last.volume;
  } else {
    price = 0; chg = 0; vol = 0;
  }
  const color = chg >= 0 ? 'var(--success)' : 'var(--danger)';
  const info = getSymbolInfo(symbol);
  return `<tr data-symbol="${symbol}">
    <td class="font-medium">${info.label || symbol}</td>
    <td class="mono">${formatPrice(price)}</td>
    <td class="mono" style="color:${color}">${formatPercent(chg)}</td>
    <td class="mono">${formatVolume(vol)}</td>
    <td><button class="btn btn-sm btn-outline" data-view-chart="${symbol}">View Chart</button></td>
  </tr>`;
}

/* ── page ─────────────────────────────────────────────────────────── */

const MarketsPage = {
  render(ctx) {
    const isDemo = ctx.app?.isDemoMode?.() ?? true;
    ctx._isDemo = isDemo;
    const providerTabs = ['Binance', 'Bybit', 'OKX', 'CoinGecko'];
    const rows = isDemo
      ? DEMO_SYMBOL_LIST.map(s => _marketRow(s, true)).join('')
      : '<tr><td colspan="5" style="text-align:center;padding:var(--space-6);color:var(--text-muted)">Connect a provider to see live data</td></tr>';

    return `
<div class="page-header"><div class="page-header-left">
  <h1 class="page-header-title">Markets</h1>
  <p class="page-header-subtitle">Browse and search trading pairs</p>
</div></div>

${isDemo ? '<div class="demo-banner" style="margin-bottom:var(--space-4)"><span class="demo-banner-icon">⚡</span><span class="demo-banner-text">Demo Mode — Showing generated market data</span></div>' : ''}

<div style="margin-bottom:var(--space-4)">
  <input class="input" id="market-search" placeholder="Search symbols..." style="max-width:320px">
</div>

<div class="tabs-container" id="market-tabs">
  <div class="tabs-nav">
    ${providerTabs.map((p, i) => `<button class="tab-item${i === 0 ? ' active' : ''}" data-tab="${p.toLowerCase()}">${p}</button>`).join('')}
  </div>
  <div class="tab-panel active" data-tab-panel="binance">
    <div class="card"><div class="card-body" style="padding:0;overflow-x:auto"><div class="table-wrapper">
      <table class="data-table striped"><thead><tr>
        <th>Symbol</th><th>Price</th><th>24h Change</th><th>24h Volume</th><th>Actions</th>
      </tr></thead><tbody id="market-tbody">
        ${rows}
      </tbody></table>
    </div></div></div>
  </div>
  <div class="tab-panel" data-tab-panel="bybit">
    <div class="card"><div class="card-body" style="padding:var(--space-8);text-align:center;color:var(--text-muted)">
      Connect Bybit API in Settings to view live markets</div></div>
  </div>
  <div class="tab-panel" data-tab-panel="okx">
    <div class="card"><div class="card-body" style="padding:var(--space-8);text-align:center;color:var(--text-muted)">
      Connect OKX API in Settings to view live markets</div></div>
  </div>
  <div class="tab-panel" data-tab-panel="coingecko">
    <div class="card"><div class="card-body" style="padding:var(--space-8);text-align:center;color:var(--text-muted)">
      Connect CoinGecko API in Settings to view live markets</div></div>
  </div>
</div>`;
  },

  init(ctx) {
    const $ = id => document.getElementById(id);

    // Tab switching
    const tabs = $('market-tabs');
    tabs?.querySelectorAll('.tab-item').forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        tabs.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        tabs.querySelector(`[data-tab-panel="${btn.dataset.tab}"]`)?.classList.add('active');
      });
    });

    // Search filter
    $('market-search')?.addEventListener('input', e => {
      const q = e.target.value.toUpperCase();
      document.querySelectorAll('#market-tbody tr[data-symbol]').forEach(row => {
        row.style.display = row.dataset.symbol.toUpperCase().includes(q) ? '' : 'none';
      });
    });

    // View chart button — navigate to #/chart/SYMBOL
    document.querySelectorAll('[data-view-chart]').forEach(btn => {
      btn.addEventListener('click', () => {
        const symbol = btn.dataset.viewChart;
        window.location.hash = `#/chart/${symbol}`;
      });
    });

    ctx._cleanup = () => {};
  },
};

export default MarketsPage;
