/**
 * strategies.js — Strategies Page
 * Task ID: 2-h4
 */

import { STRATEGY_TYPES, STRATEGY_LABELS } from '../../core/types.js';
import { showToast } from '../components.js';

/* ── Strategy metadata ───────────────────────────────────────────── */

const STRATEGY_INFO = {
  ema_trend: {
    name: 'EMA Trend',
    description: 'Identifies trend direction using multiple EMA crossovers. When faster EMAs align above slower EMAs, it signals an uptrend; the reverse signals a downtrend. Pullbacks to key EMA levels provide entry opportunities.',
    params: [
      { key: 'fastPeriod', label: 'Fast EMA', default: 9, desc: 'Period for the fast EMA line' },
      { key: 'slowPeriod', label: 'Slow EMA', default: 21, desc: 'Period for the slow EMA line' },
      { key: 'trendFilter', label: 'Trend Filter EMA', default: 200, desc: 'Long-term EMA used as trend direction filter' },
    ],
    exampleSignals: ['BTCUSDT Long at $68,200 — 9/21 EMA bullish crossover above 200 EMA', 'ETHUSDT Short at $3,620 — Death cross with bearish volume'],
  },
  rsi_pullback: {
    name: 'RSI Pullback',
    description: 'Uses RSI oscillator to identify overbought/oversold pullback entries. Combines RSI levels with divergence detection and trend context for higher-probability setups.',
    params: [
      { key: 'period', label: 'RSI Period', default: 14, desc: 'Lookback period for RSI calculation' },
      { key: 'oversold', label: 'Oversold Level', default: 30, desc: 'RSI level considered oversold' },
      { key: 'overbought', label: 'Overbought Level', default: 70, desc: 'RSI level considered overbought' },
    ],
    exampleSignals: ['SOLUSDT Long — RSI bounced from 28 with bullish divergence', 'BNBUSDT Short — RSI at 78 with bearish divergence'],
  },
  macd_momentum: {
    name: 'MACD Momentum',
    description: 'Captures momentum shifts using MACD crossovers and histogram expansion/contraction. Histogram turning positive from negative signals bullish momentum reversal.',
    params: [
      { key: 'fast', label: 'Fast EMA', default: 12, desc: 'Fast period for MACD line' },
      { key: 'slow', label: 'Slow EMA', default: 26, desc: 'Slow period for MACD line' },
      { key: 'signal', label: 'Signal Line', default: 9, desc: 'Signal line smoothing period' },
    ],
    exampleSignals: ['XRPUSDT Long — MACD histogram turning positive above zero line', 'ADAUSDT Short — Bearish MACD crossover with declining histogram'],
  },
  breakout_retest: {
    name: 'Breakout Retest',
    description: 'Detects price breakouts above resistance or below support levels, then waits for a retest of the breakout level before entering. Volume confirmation is key.',
    params: [
      { key: 'lookback', label: 'Lookback Period', default: 20, desc: 'Candles to look back for support/resistance' },
      { key: 'retestTolerance', label: 'Retest Tolerance %', default: 0.5, desc: 'How close price must come to breakout level' },
    ],
    exampleSignals: ['DOGEUSDT Long — Broke above $0.18 resistance, retested successfully', 'AVAXUSDT Short — Broke below $35 support with volume, retest rejected'],
  },
  vwap_volume: {
    name: 'VWAP Volume',
    description: 'Uses Volume Weighted Average Price as a dynamic support/resistance level. Combines VWAP position with volume analysis to identify institutional buying/selling.',
    params: [
      { key: 'volumeThreshold', label: 'Volume Multiplier', default: 1.5, desc: 'Volume must exceed this multiple of average' },
    ],
    exampleSignals: ['BTCUSDT Long — Price above VWAP with 2x average volume', 'ETHUSDT Short — Price below VWAP with declining volume'],
  },
  market_structure: {
    name: 'Market Structure',
    description: 'Analyzes swing highs and swing lows to determine market structure. Bullish structure = higher highs + higher lows. Break of structure indicates potential reversal.',
    params: [
      { key: 'swingLookback', label: 'Swing Lookback', default: 5, desc: 'Bars on each side to confirm a swing point' },
    ],
    exampleSignals: ['SOLUSDT Long — Bullish market structure with HL/HH pattern intact', 'BNBUSDT Short — Break of structure forming lower low'],
  },
  bollinger_squeeze: {
    name: 'Bollinger Squeeze',
    description: 'Identifies periods of low volatility (squeeze) where Bollinger Bands narrow significantly. These conditions often precede explosive price moves.',
    params: [
      { key: 'period', label: 'BB Period', default: 20, desc: 'Period for Bollinger Bands' },
      { key: 'stdDev', label: 'Standard Deviation', default: 2, desc: 'Number of standard deviations' },
      { key: 'squeezeThreshold', label: 'Squeeze Threshold', default: 0.05, desc: 'Bandwidth below this indicates squeeze' },
    ],
    exampleSignals: ['XRPUSDT — Bollinger Bands squeezing tightly, breakout imminent', 'ADAUSDT — Post-squeeze expansion detected, continuation expected'],
  },
};

/* ── helpers ──────────────────────────────────────────────────────── */

function _strategyCard(key, info, enabled) {
  const paramStr = info.params.map(p => `<span class="badge badge-neutral">${p.label}: ${p.default}</span>`).join(' ');
  return `<div class="card strategy-card" data-strategy-key="${key}" style="cursor:pointer">
    <div class="card-body">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2)">
        <h3 style="font-size:var(--text-base);margin:0">${info.name}</h3>
        <label class="toggle-switch" style="flex-shrink:0" onclick="event.stopPropagation()">
          <input type="checkbox" data-strategy-toggle="${key}" ${enabled ? 'checked' : ''}>
          <span class="toggle-slider"></span></label>
      </div>
      <p style="color:var(--text-muted);font-size:var(--text-sm);margin:0 0 var(--space-3) 0;max-height:60px;overflow:hidden">${info.description}</p>
      <div style="display:flex;flex-wrap:wrap;gap:var(--space-1)">${paramStr}</div>
    </div>
  </div>`;
}

function _detailModal(key, info, enabled) {
  const paramsHTML = info.params.map(p =>
    `<div class="form-group"><label class="form-label">${p.label}</label>
      <input class="input" type="number" value="${p.default}" step="any" disabled>
      <div class="form-hint">${p.desc}</div></div>`
  ).join('');

  const examplesHTML = info.exampleSignals.map(s => `<li style="margin-bottom:var(--space-1)">${s}</li>`).join('');

  return `<div class="modal-overlay" id="strat-detail-modal" style="display:flex">
    <div class="modal modal-lg">
      <div class="modal-header">
        <div class="modal-title">${info.name}</div>
        <button class="modal-close" id="strat-detail-close">×</button></div>
      <div class="modal-body">
        <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
          <label class="toggle-switch"><input type="checkbox" id="strat-detail-toggle" ${enabled ? 'checked' : ''}><span class="toggle-slider"></span></label>
          <span style="font-weight:500">${enabled ? 'Enabled' : 'Disabled'}</span></div>
        <p style="margin-bottom:var(--space-4);line-height:1.6">${info.description}</p>
        <h4 style="margin:var(--space-3) 0 var(--space-2)">Parameters</h4>
        <div class="form-row">${paramsHTML}</div>
        <h4 style="margin:var(--space-4) 0 var(--space-2)">Example Signals</h4>
        <ul style="padding-left:var(--space-5);color:var(--text-muted)">${examplesHTML}</ul>
      </div>
    </div>
  </div>`;
}

/* ── page ─────────────────────────────────────────────────────────── */

const StrategiesPage = {
  render(ctx) {
    const cards = Object.entries(STRATEGY_INFO).map(([key, info]) =>
      _strategyCard(key, info, true)
    ).join('');

    return `
<div class="page-header"><div class="page-header-left">
  <h1 class="page-header-title">Strategies</h1>
  <p class="page-header-subtitle">Configure and manage trading strategies</p>
</div></div>

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:var(--space-4)" id="strategies-grid">
  ${cards}
</div>

<div id="strat-detail-container"></div>`;
  },

  init(ctx) {
    const enabledMap = {};
    Object.keys(STRATEGY_INFO).forEach(k => { enabledMap[k] = true; });

    // Card click → show detail modal
    document.querySelectorAll('.strategy-card').forEach(card => {
      card.addEventListener('click', () => {
        const key = card.dataset.strategyKey;
        const info = STRATEGY_INFO[key];
        if (!info) return;
        const container = document.getElementById('strat-detail-container');
        container.innerHTML = _detailModal(key, info, enabledMap[key]);

        // Close button
        document.getElementById('strat-detail-close')?.addEventListener('click', () => {
          container.innerHTML = '';
        });

        // Toggle in detail modal
        document.getElementById('strat-detail-toggle')?.addEventListener('change', e => {
          enabledMap[key] = e.target.checked;
          // Sync the card toggle
          const cardToggle = document.querySelector(`[data-strategy-toggle="${key}"]`);
          if (cardToggle) cardToggle.checked = e.target.checked;
          ctx.storage?.setSetting?.('strategies', enabledMap);
          ctx.eventBus?.emit?.('strategy:changed', { key, enabled: e.target.checked });
          showToast(`${info.name} ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
        });

        // Click overlay to close
        container.querySelector('.modal-overlay')?.addEventListener('click', e => {
          if (e.target.classList.contains('modal-overlay')) container.innerHTML = '';
        });
      });
    });

    // Card toggle (prevent card click)
    document.querySelectorAll('[data-strategy-toggle]').forEach(toggle => {
      toggle.addEventListener('change', e => {
        const key = e.target.dataset.strategyToggle;
        enabledMap[key] = e.target.checked;
        ctx.storage?.setSetting?.('strategies', enabledMap);
        ctx.eventBus?.emit?.('strategy:changed', { key, enabled: e.target.checked });
        showToast(`${STRATEGY_INFO[key]?.name || key} ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
      });
    });

    ctx._cleanup = () => {};
  },
};

export default StrategiesPage;
