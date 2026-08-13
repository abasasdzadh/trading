/**
 * settings.js — Settings Page
 * Task ID: 2-h4
 */

import { INDICATOR_TYPES, INDICATOR_CATEGORIES, STRATEGY_TYPES, STRATEGY_LABELS, TIMEFRAMES, PROVIDER_TYPES, AI_PROVIDER_TYPES } from '../../core/types.js';
import { showToast } from '../components.js';

/* ── Indicator & Strategy metadata ────────────────────────────────── */

const INDICATOR_META = {
  ema:             { label: 'EMA',              params: [{ key: 'period', label: 'Period', default: 20 }] },
  sma:             { label: 'SMA',              params: [{ key: 'period', label: 'Period', default: 20 }] },
  ichimoku:        { label: 'Ichimoku Cloud',   params: [] },
  vwap:            { label: 'VWAP',             params: [] },
  supertrend:      { label: 'SuperTrend',       params: [{ key: 'period', label: 'Period', default: 10 }, { key: 'multiplier', label: 'Multiplier', default: 3 }] },
  rsi:             { label: 'RSI',              params: [{ key: 'period', label: 'Period', default: 14 }] },
  macd:            { label: 'MACD',             params: [{ key: 'fast', label: 'Fast Period', default: 12 }, { key: 'slow', label: 'Slow Period', default: 26 }, { key: 'signal', label: 'Signal Period', default: 9 }] },
  stochastic:      { label: 'Stochastic',       params: [{ key: 'kPeriod', label: '%K Period', default: 14 }, { key: 'dPeriod', label: '%D Period', default: 3 }] },
  cci:             { label: 'CCI',              params: [{ key: 'period', label: 'Period', default: 20 }] },
  williams_r:      { label: 'Williams %R',      params: [{ key: 'period', label: 'Period', default: 14 }] },
  mfi:             { label: 'MFI',              params: [{ key: 'period', label: 'Period', default: 14 }] },
  atr:             { label: 'ATR',              params: [{ key: 'period', label: 'Period', default: 14 }] },
  bollinger:       { label: 'Bollinger Bands',  params: [{ key: 'period', label: 'Period', default: 20 }, { key: 'stdDev', label: 'Std Dev', default: 2 }] },
  keltner:         { label: 'Keltner Channel',  params: [{ key: 'period', label: 'Period', default: 20 }, { key: 'mult', label: 'Multiplier', default: 1.5 }] },
  donchian:        { label: 'Donchian Channel', params: [{ key: 'period', label: 'Period', default: 20 }] },
  obv:             { label: 'OBV',              params: [] },
  adx:             { label: 'ADX',              params: [{ key: 'period', label: 'Period', default: 14 }] },
  pivot_points:    { label: 'Pivot Points',     params: [] },
  fibonacci:       { label: 'Fibonacci',        params: [] },
  parabolic_sar:   { label: 'Parabolic SAR',    params: [{ key: 'step', label: 'Step', default: 0.02 }, { key: 'max', label: 'Max Step', default: 0.2 }] },
  volume_profile:  { label: 'Volume Profile',   params: [] },
};

const STRATEGY_META = {
  ema_trend:         { desc: 'Trend following using EMA crossovers and alignment.', params: [{ key: 'fastPeriod', label: 'Fast EMA', default: 9 }, { key: 'slowPeriod', label: 'Slow EMA', default: 21 }, { key: 'trendFilter', label: 'Trend Filter EMA', default: 200 }] },
  rsi_pullback:      { desc: 'Identifies oversold/overbought pullback entries using RSI divergence.', params: [{ key: 'period', label: 'RSI Period', default: 14 }, { key: 'oversold', label: 'Oversold Level', default: 30 }, { key: 'overbought', label: 'Overbought Level', default: 70 }] },
  macd_momentum:     { desc: 'Momentum-based entries on MACD signal line crossovers.', params: [{ key: 'fast', label: 'Fast', default: 12 }, { key: 'slow', label: 'Slow', default: 26 }, { key: 'signal', label: 'Signal', default: 9 }] },
  breakout_retest:   { desc: 'Breakout detection with retest confirmation.', params: [{ key: 'lookback', label: 'Lookback Period', default: 20 }, { key: 'retestTolerance', label: 'Retest Tolerance %', default: 0.5 }] },
  vwap_volume:       { desc: 'VWAP-based analysis with volume profile confirmation.', params: [{ key: 'volumeThreshold', label: 'Volume Multiplier', default: 1.5 }] },
  market_structure:  { desc: 'Higher-highs / higher-lows structure analysis.', params: [{ key: 'swingLookback', label: 'Swing Lookback', default: 5 }] },
  bollinger_squeeze: { desc: 'Identifies low-volatility squeeze patterns in Bollinger Bands.', params: [{ key: 'period', label: 'BB Period', default: 20 }, { key: 'stdDev', label: 'BB Std Dev', default: 2 }, { key: 'squeezeThreshold', label: 'Squeeze Bandwidth', default: 0.05 }] },
};

/* ── helpers ──────────────────────────────────────────────────────── */

function _toggleRow(name, enabled, extra = '') {
  return `<div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) 0;border-bottom:1px solid var(--border-color)">
    <label class="toggle-switch" style="flex-shrink:0"><input type="checkbox" data-setting="${name}" ${enabled ? 'checked' : ''}><span class="toggle-slider"></span></label>
    <div style="flex:1"><span style="font-weight:500">${name}</span>${extra}</div>
  </div>`;
}

function _paramInputs(params, prefix) {
  return params.map(p =>
    `<div class="form-group"><label class="form-label">${p.label}</label>
      <input class="input" type="number" data-param="${prefix}_${p.key}" value="${p.default}" step="any"></div>`
  ).join('');
}

function _settingsTabs() {
  const tabItems = ['General', 'Providers', 'Indicators', 'Strategies', 'Risk', 'Data'];
  return `<div class="tabs-container" id="settings-tabs">
    <div class="tabs-nav">${tabItems.map((t, i) =>
      `<button class="tab-item${i === 0 ? ' active' : ''}" data-tab="${t.toLowerCase()}">${t}</button>`).join('')}</div>
    <div class="tab-panel active" data-tab-panel="general">${_generalPanel()}</div>
    <div class="tab-panel" data-tab-panel="providers">${_providersPanel()}</div>
    <div class="tab-panel" data-tab-panel="indicators">${_indicatorsPanel()}</div>
    <div class="tab-panel" data-tab-panel="strategies">${_strategiesPanel()}</div>
    <div class="tab-panel" data-tab-panel="risk">${_riskPanel()}</div>
    <div class="tab-panel" data-tab-panel="data">${_dataPanel()}</div>
  </div>`;
}

function _generalPanel() {
  const tfOpts = TIMEFRAMES.map(t => `<option value="${t}">${t}</option>`).join('');
  return `<div class="card"><div class="card-body">
    <div class="form-row">
      <div class="form-group"><label class="form-label">Theme</label>
        <select class="select" data-setting="theme"><option value="dark">Dark</option><option value="light">Light (Coming Soon)</option></select></div>
      <div class="form-group"><label class="form-label">Language</label>
        <select class="select" data-setting="language"><option value="en">English</option><option value="fa">Persian</option></select></div>
      <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:0">
        <label class="toggle-switch"><input type="checkbox" data-setting="demoMode" checked><span class="toggle-slider"></span></label>
        <label class="form-label" style="margin:0 0 0 8px;cursor:pointer">Demo Mode</label></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Default Symbol</label>
        <input class="input" data-setting="defaultSymbol" value="BTCUSDT" placeholder="BTCUSDT"></div>
      <div class="form-group"><label class="form-label">Default Timeframe</label>
        <select class="select" data-setting="defaultTimeframe">${tfOpts}</select></div>
    </div>
    <div class="form-row">
      <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:0">
        <label class="toggle-switch"><input type="checkbox" data-setting="autoRefresh" checked><span class="toggle-slider"></span></label>
        <label class="form-label" style="margin:0 0 0 8px;cursor:pointer">Auto Refresh</label></div>
      <div class="form-group"><label class="form-label">Refresh Interval (seconds)</label>
        <input class="input" type="number" data-setting="refreshInterval" value="30" min="5"></div>
    </div>
    <div style="margin-top:var(--space-4)"><button class="btn btn-primary" id="save-general">Save General Settings</button></div>
  </div></div>`;
}

function _providersPanel() {
  return `<div style="display:flex;flex-direction:column;gap:var(--space-4)">
  <div class="card"><div class="card-header"><div class="card-header-title">Market Provider</div></div><div class="card-body">
    <div class="form-row">
      <div class="form-group"><label class="form-label">Provider</label>
        <select class="select" id="s-market-provider">
          <option value="binance">Binance</option><option value="bybit">Bybit</option>
          <option value="okx">OKX</option><option value="coingecko">CoinGecko</option>
          <option value="custom">Custom</option></select></div>
      <div class="form-group"><label class="form-label">API Key</label>
        <input class="input" type="password" id="s-market-key" placeholder="Optional (session only)"></div>
    </div>
    <div class="form-group" id="s-market-base-wrap" style="display:none"><label class="form-label">Base URL</label>
      <input class="input" id="s-market-base" placeholder="https://api.example.com"></div>
    <button class="btn btn-primary" id="save-market" style="margin-top:var(--space-3)">Save Market Provider</button>
  </div></div>
  <div class="card"><div class="card-header"><div class="card-header-title">AI Provider</div></div><div class="card-body">
    <div class="form-row">
      <div class="form-group"><label class="form-label">Provider</label>
        <select class="select" id="s-ai-provider">
          <option value="gemini">Gemini</option><option value="openai">OpenAI</option>
          <option value="openrouter">OpenRouter</option><option value="anthropic">Anthropic</option>
          <option value="openai_compatible">Compatible</option></select></div>
      <div class="form-group"><label class="form-label">API Key</label>
        <input class="input" type="password" id="s-ai-key" placeholder="Required for AI features"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Model</label>
        <input class="input" id="s-ai-model" placeholder="gemini-pro"></div>
      <div class="form-group" id="s-ai-base-wrap" style="display:none"><label class="form-label">Base URL</label>
        <input class="input" id="s-ai-base" placeholder="https://api.example.com/v1"></div>
    </div>
    <button class="btn btn-primary" id="save-ai" style="margin-top:var(--space-3)">Save AI Provider</button>
  </div></div></div>`;
}

function _indicatorsPanel() {
  const rows = Object.entries(INDICATOR_META).map(([key, meta]) =>
    `<div style="padding:var(--space-2) 0;border-bottom:1px solid var(--border-color)">
      <div style="display:flex;align-items:center;gap:var(--space-3)">
        <label class="toggle-switch" style="flex-shrink:0"><input type="checkbox" data-indicator="${key}" checked><span class="toggle-slider"></span></label>
        <span style="font-weight:500">${meta.label}</span></div>
      <div class="form-row" style="margin-top:var(--space-2);padding-left:42px">${_paramInputs(meta.params, 'ind_' + key)}</div>
    </div>`
  ).join('');
  return `<div class="card"><div class="card-header"><div class="card-header-title">Indicators Configuration</div></div>
    <div class="card-body">${rows}
      <button class="btn btn-primary" id="save-indicators" style="margin-top:var(--space-4)">Save Indicators</button>
    </div></div>`;
}

function _strategiesPanel() {
  const rows = Object.entries(STRATEGY_META).map(([key, meta]) =>
    `<div style="padding:var(--space-3) 0;border-bottom:1px solid var(--border-color)">
      <div style="display:flex;align-items:center;gap:var(--space-3)">
        <label class="toggle-switch" style="flex-shrink:0"><input type="checkbox" data-strategy="${key}" checked><span class="toggle-slider"></span></label>
        <div><span style="font-weight:500">${STRATEGY_LABELS[key] || key}</span>
          <p style="font-size:var(--text-xs);color:var(--text-muted);margin:2px 0 0">${meta.desc}</p></div></div>
      <div class="form-row" style="margin-top:var(--space-2);padding-left:42px">${_paramInputs(meta.params, 'strat_' + key)}</div>
    </div>`
  ).join('');
  return `<div class="card"><div class="card-header"><div class="card-header-title">Strategies Configuration</div></div>
    <div class="card-body">${rows}
      <button class="btn btn-primary" id="save-strategies" style="margin-top:var(--space-4)">Save Strategies</button>
    </div></div>`;
}

function _riskPanel() {
  return `<div class="card"><div class="card-body">
    <div class="form-row">
      <div class="form-group"><label class="form-label">Risk Per Trade (%)</label>
        <input class="input" type="number" data-risk="riskPercent" value="2" min="0.1" max="100" step="0.1"></div>
      <div class="form-group"><label class="form-label">Default SL Method</label>
        <select class="select" data-risk="slMethod"><option value="atr">ATR</option><option value="fixed">Fixed</option><option value="swing">Swing</option><option value="sr">Support/Resistance</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">ATR Period</label>
        <input class="input" type="number" data-risk="atrPeriod" value="14" min="1"></div>
      <div class="form-group"><label class="form-label">ATR Multiplier</label>
        <input class="input" type="number" data-risk="atrMultiplier" value="1.5" step="0.1" min="0.1"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">TP Ratio 1:1</label>
        <input class="input" type="number" data-risk="tpRatio1" value="1" step="0.1" min="0.1"></div>
      <div class="form-group"><label class="form-label">TP Ratio 1:2</label>
        <input class="input" type="number" data-risk="tpRatio2" value="2" step="0.1" min="0.1"></div>
      <div class="form-group"><label class="form-label">TP Ratio 1:3</label>
        <input class="input" type="number" data-risk="tpRatio3" value="3" step="0.1" min="0.1"></div>
    </div>
    <button class="btn btn-primary" id="save-risk" style="margin-top:var(--space-4)">Save Risk Settings</button>
  </div></div>`;
}

function _dataPanel() {
  return `<div class="card"><div class="card-body">
    <p style="color:var(--text-muted);margin-bottom:var(--space-4)">Export or import all your application data. Credentials are excluded from exports for security.</p>
    <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
      <button class="btn btn-primary" id="data-export">📤 Export Data</button>
      <button class="btn btn-outline" id="data-import-trigger">📥 Import Data</button>
      <input type="file" id="data-import-file" accept=".json" style="display:none">
      <button class="btn btn-danger" id="data-clear">🗑️ Clear All Data</button>
    </div>
  </div></div>`;
}

/* ── page ─────────────────────────────────────────────────────────── */

const SettingsPage = {
  render(ctx) {
    return `<div class="page-header"><div class="page-header-left">
      <h1 class="page-header-title">Settings</h1>
      <p class="page-header-subtitle">Configure your trading analyzer</p>
    </div></div>
    ${_settingsTabs()}`;
  },

  init(ctx) {
    const { storage, eventBus } = ctx;
    const $ = id => document.getElementById(id);

    // Tab switching
    const tabs = $('settings-tabs');
    tabs?.querySelectorAll('.tab-item').forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        tabs.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        tabs.querySelector(`[data-tab-panel="${btn.dataset.tab}"]`)?.classList.add('active');
      });
    });

    // Provider toggle: show/hide base URL
    $('s-market-provider')?.addEventListener('change', e => {
      $('s-market-base-wrap').style.display = e.target.value === 'custom' ? '' : 'none';
    });
    $('s-ai-provider')?.addEventListener('change', e => {
      $('s-ai-base-wrap').style.display = e.target.value === 'openai_compatible' ? '' : 'none';
    });

    // Save helpers
    async function saveGeneral() {
      const inputs = document.querySelectorAll('[data-setting]');
      for (const el of inputs) {
        const key = el.dataset.setting;
        const val = el.type === 'checkbox' ? el.checked : el.value;
        await storage?.setSetting?.(key, val);
      }
      showToast('General settings saved', 'success');
      eventBus?.emit?.('settings:changed', { section: 'general' });
    }

    async function saveMarket() {
      const provider = $('s-market-provider').value;
      const apiKey = $('s-market-key').value;
      const baseUrl = $('s-market-base').value;
      await storage?.setSetting?.('marketProvider', provider);
      storage?.setCredentials?.(provider, { apiKey, baseUrl });
      showToast('Market provider saved', 'success');
      eventBus?.emit?.('settings:changed', { section: 'market' });
    }

    async function saveAI() {
      const provider = $('s-ai-provider').value;
      const apiKey = $('s-ai-key').value;
      const model = $('s-ai-model').value;
      const baseUrl = $('s-ai-base').value;
      await storage?.setSetting?.('aiProvider', { provider, model });
      storage?.setCredentials?.(provider, { apiKey, baseUrl });
      showToast('AI provider saved', 'success');
      eventBus?.emit?.('settings:changed', { section: 'ai' });
    }

    async function saveIndicators() {
      const config = {};
      document.querySelectorAll('[data-indicator]').forEach(el => {
        config[el.dataset.indicator] = { enabled: el.checked };
      });
      document.querySelectorAll('[data-param^="ind_"]').forEach(el => {
        const [, indKey, paramKey] = el.dataset.param.split('_');
        if (!config[indKey]) config[indKey] = {};
        config[indKey][paramKey] = parseFloat(el.value);
      });
      await storage?.setSetting?.('indicators', config);
      showToast('Indicators saved', 'success');
      eventBus?.emit?.('settings:changed', { section: 'indicators' });
    }

    async function saveStrategies() {
      const config = {};
      document.querySelectorAll('[data-strategy]').forEach(el => {
        config[el.dataset.strategy] = { enabled: el.checked };
      });
      document.querySelectorAll('[data-param^="strat_"]').forEach(el => {
        const parts = el.dataset.param.split('_');
        const stratKey = parts.slice(1, -1).join('_');
        const paramKey = parts[parts.length - 1];
        if (!config[stratKey]) config[stratKey] = {};
        config[stratKey][paramKey] = parseFloat(el.value);
      });
      await storage?.setSetting?.('strategies', config);
      showToast('Strategies saved', 'success');
      eventBus?.emit?.('settings:changed', { section: 'strategies' });
    }

    async function saveRisk() {
      const risk = {};
      document.querySelectorAll('[data-risk]').forEach(el => {
        risk[el.dataset.risk] = parseFloat(el.value);
      });
      await storage?.setSetting?.('risk', risk);
      showToast('Risk settings saved', 'success');
      eventBus?.emit?.('settings:changed', { section: 'risk' });
    }

    $('save-general')?.addEventListener('click', saveGeneral);
    $('save-market')?.addEventListener('click', saveMarket);
    $('save-ai')?.addEventListener('click', saveAI);
    $('save-indicators')?.addEventListener('click', saveIndicators);
    $('save-strategies')?.addEventListener('click', saveStrategies);
    $('save-risk')?.addEventListener('click', saveRisk);

    // Data export
    $('data-export')?.addEventListener('click', async () => {
      const data = await storage?.exportData?.() ?? {};
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `trading-analyzer-export-${Date.now()}.json`; a.click();
      URL.revokeObjectURL(a.href);
      showToast('Data exported successfully', 'success');
    });

    // Data import
    const importInput = $('data-import-file');
    $('data-import-trigger')?.addEventListener('click', () => importInput?.click());
    importInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const result = await storage?.importData?.(data);
        showToast(`Imported ${result?.imported ?? 0} items, skipped ${result?.skipped ?? 0}`, 'success');
        eventBus?.emit?.('data:imported', result);
      } catch (err) {
        showToast('Failed to import data: ' + err.message, 'error');
      }
      e.target.value = '';
    });

    // Clear all data
    $('data-clear')?.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to clear ALL data? This cannot be undone.')) return;
      const stores = ['settings', 'watchlist', 'alerts', 'paperTrades', 'signals'];
      for (const store of stores) await storage?.clearStore?.(store);
      storage?.clearAllCredentials?.();
      showToast('All data cleared', 'warning');
      eventBus?.emit?.('data:cleared');
    });

    ctx._cleanup = () => {};
  },
};

export default SettingsPage;
