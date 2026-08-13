/**
 * chart.js — Chart Page  (Task ID: 2-h2)
 *
 * Full-screen trading chart with signal analysis panel, indicator toggles,
 * AI analysis, and quick paper-trade entry.
 */

import { TradingChart } from '../charts.js';
import { generateDemoCandles } from '../../core/demo-data.js';
import { formatPrice, colorForScore, calculateATRSimple, generateId } from '../../core/utils.js';
import { SIGNAL_DIRECTIONS } from '../../core/types.js';
import ema from '../../indicators/ema.js';
import sma from '../../indicators/sma.js';
import bollinger from '../../indicators/bollinger.js';
import rsi from '../../indicators/rsi.js';
import macd from '../../indicators/macd.js';
import adx from '../../indicators/adx.js';
import obv from '../../indicators/obv.js';

/* ── constants ───────────────────────────────────────────────────── */

const TF_LIST = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
const CATS = ['Trend', 'Momentum', 'Volume', 'Structure', 'Price Action', 'Volatility'];
const OVERLAYS = [
  { id: 'ind-ema20', label: 'EMA(20)', key: 'ema20' },
  { id: 'ind-ema50', label: 'EMA(50)', key: 'ema50' },
  { id: 'ind-sma200', label: 'SMA(200)', key: 'sma200' },
  { id: 'ind-bb', label: 'BB', key: 'bb' },
  { id: 'ind-volume', label: 'Volume', key: 'volume' },
];

/* ── helpers ─────────────────────────────────────────────────────── */

function _barHTML(score, label) {
  const c = colorForScore(score);
  return `<div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2)">
    <span style="width:90px;font-size:var(--text-xs);color:var(--text-muted);flex-shrink:0">${label}</span>
    <div style="flex:1;height:6px;background:var(--bg-secondary);border-radius:3px;overflow:hidden">
      <div style="width:${score}%;height:100%;background:${c};border-radius:3px;transition:width .3s"></div>
    </div>
    <span class="mono" style="width:32px;text-align:right;font-size:var(--text-xs);color:${c}">${score}</span>
  </div>`;
}

function _lineData(candles, values) {
  return candles.map((c, i) => values[i] != null ? { time: c.time, value: values[i] } : null).filter(Boolean);
}

function _computeSignal(candles) {
  if (!candles || candles.length < 50) {
    return { direction: SIGNAL_DIRECTIONS.NO_TRADE, score: 0, breakdown: CATS.map(() => 0) };
  }
  const close = candles[candles.length - 1].close;

  // Trend — EMA-20 vs EMA-50 alignment
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

  // Momentum — RSI + MACD histogram
  const rsiVals = rsi(candles, { period: 14 }).values;
  const lastRsi = rsiVals[rsiVals.length - 1] ?? 50;
  let mom = Math.round(Math.max(0, Math.min(100, 100 - Math.abs(lastRsi - 50) * 1.2)));
  const macdH = macd(candles).values?.histogram;
  if (macdH?.length) {
    const h = macdH[macdH.length - 1];
    if (h != null) mom = Math.round((mom + (h > 0 ? 70 : 30)) / 2);
  }

  // Volume — OBV 20-bar trend
  const obvV = obv(candles).values;
  const vol = (obvV && obvV.length >= 20)
    ? (obvV[obvV.length - 1] > obvV[obvV.length - 20] ? 65 : 35) : 50;

  // Structure — ADX
  const adxV = adx(candles, { period: 14 }).values;
  const str = adxV[adxV.length - 1] != null ? Math.round(Math.min(100, adxV[adxV.length - 1] * 2.5)) : 40;

  // Price Action — body/range ratio
  const last = candles[candles.length - 1];
  const rng = last.high - last.low || 1;
  const pa = Math.round((Math.abs(last.close - last.open) / rng) * 60 + (last.close > last.open ? 20 : 10));

  // Volatility — ATR relative
  const atr = calculateATRSimple(candles, 14);
  const vlt = atr ? Math.round(Math.min(100, (atr / close) * 500)) : 50;

  const breakdown = [trend, mom, vol, str, pa, vlt];
  const score = Math.round(breakdown.reduce((a, b) => a + b, 0) / breakdown.length);
  let direction = SIGNAL_DIRECTIONS.NO_TRADE;
  if (score >= 60 && trend > 50) direction = SIGNAL_DIRECTIONS.LONG;
  else if (score >= 60 && trend < 50) direction = SIGNAL_DIRECTIONS.SHORT;
  return { direction, score, breakdown };
}

/* ── page object ─────────────────────────────────────────────────── */

const ChartPage = {
  render(ctx) {
    const symbol = ctx.params?.symbol || 'BTCUSDT';
    const tfs = TF_LIST.map((tf, i) =>
      `<button class="btn ${i === 4 ? 'btn-primary' : 'btn-ghost'}" data-tf="${tf}">${tf}</button>`
    ).join('');
    const inds = OVERLAYS.map((o, i) =>
      `<label style="display:flex;align-items:center;gap:4px;font-size:var(--text-xs);color:var(--text-secondary);cursor:pointer">
        <input type="checkbox" id="${o.id}" data-ind="${o.key}" ${i < 3 ? 'checked' : ''}> ${o.label}</label>`
    ).join('');
    const bd = CATS.map((c, i) => `<div id="bd-${i}">${_barHTML(0, c)}</div>`).join('');

    return `
<div class="page-header"><div class="page-header-left">
  <h1 class="page-header-title">Chart — ${symbol}</h1>
  <p class="page-header-subtitle">Candlestick chart with technical analysis</p>
</div><div class="page-header-actions" id="chart-tf-bar" style="display:flex;gap:4px;flex-wrap:wrap">${tfs}</div></div>

<div style="display:flex;gap:var(--space-4);align-items:flex-start;margin-bottom:var(--space-6)" class="chart-layout">
  <div style="flex:1;min-width:0">
    <div class="card" style="padding:0;overflow:hidden"><div id="main-chart" style="width:100%;height:520px"></div></div>
    <div id="ind-toolbar" style="display:flex;gap:var(--space-3);flex-wrap:wrap;margin-top:var(--space-3);padding:var(--space-3);background:var(--bg-secondary);border-radius:var(--radius-lg)">
      <span style="font-size:var(--text-xs);color:var(--text-muted);line-height:20px">Overlays:</span>${inds}
    </div>
  </div>

  <div style="width:320px;flex-shrink:0" class="chart-side-panel">
    <div class="card" style="margin-bottom:var(--space-4)"><div class="card-header"><div>
      <div class="card-header-title">Signal Analysis</div></div></div><div class="card-body">
      <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-3)">
        <span style="font-size:var(--text-xs);color:var(--text-muted)">Direction:</span>
        <span id="sig-dir" class="badge badge-gray">NO TRADE</span></div>
      <div style="margin-bottom:var(--space-4)"><div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:var(--text-xs);color:var(--text-muted)">Score</span>
        <span id="sig-lbl" class="mono" style="font-size:var(--text-xs)">0 / 100</span></div>
        <div style="height:10px;background:var(--bg-secondary);border-radius:5px;overflow:hidden">
          <div id="sig-bar" style="width:0%;height:100%;background:var(--text-muted);border-radius:5px;transition:width .4s"></div>
      </div></div>
      <div style="margin-bottom:var(--space-4)"><span style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:var(--space-2)">Score Breakdown</span>${bd}</div>
    </div></div>

    <div class="card" style="margin-bottom:var(--space-4)"><div class="card-header"><div>
      <div class="card-header-title">AI Analysis</div></div></div><div class="card-body">
      <button id="ai-btn" class="btn btn-primary" style="width:100%;margin-bottom:var(--space-3)">Analyze with AI</button>
      <div id="ai-result" style="font-size:var(--text-sm);color:var(--text-secondary);min-height:40px;line-height:1.5">
        Click the button above to get AI-powered market analysis.</div>
    </div></div>

    <div class="card"><div class="card-header"><div>
      <div class="card-header-title">Quick Trade</div></div></div><div class="card-body">
      <div style="margin-bottom:var(--space-3)"><label style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:4px">Quantity</label>
        <input id="trade-qty" type="number" value="0.01" step="0.001" min="0.001" class="input" style="width:100%"></div>
      <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-3);display:flex;gap:var(--space-3)">
        <span>SL: <span id="sl-val" class="mono">—</span></span>
        <span>TP: <span id="tp-val" class="mono">—</span></span></div>
      <div style="display:flex;gap:var(--space-2)">
        <button id="buy-btn" class="btn btn-success" style="flex:1">Buy / Long</button>
        <button id="sell-btn" class="btn btn-danger" style="flex:1">Sell / Short</button></div>
    </div></div>
  </div>
</div>
<style>@media(max-width:1023px){.chart-layout{flex-direction:column!important}.chart-side-panel{width:100%!important}}</style>`;
  },

  /* ──────────────────────────────────────────────────────────────── */

  init(ctx) {
    const { app, eventBus, storage } = ctx;
    const symbol = ctx.params?.symbol || 'BTCUSDT';
    let tf = '1h', chart = null, candles = [], signal = null;
    const active = { ema20: true, ema50: true, sma200: true, bb: false, volume: false };
    const cleanups = [];

    function load(timeframe) {
      tf = timeframe;
      const provider = app?.getProvider?.('market');
      candles = (provider?.getCandles?.(symbol, timeframe)) || generateDemoCandles(symbol, timeframe, 500);
      signal = _computeSignal(candles);
      const el = document.getElementById('main-chart');
      if (!el) return;
      if (chart) { chart.destroy(); chart = null; }
      chart = new TradingChart(el, { withVolume: active.volume, height: '520px' });
      chart.createChart(); chart.setCandles(candles); chart.fitContent();
      for (const [k, on] of Object.entries(active)) { if (k !== 'volume' && on) addOvl(k); }
      populatePanel(); updateSlTp();
    }

    function addOvl(k) {
      if (!chart || !candles.length) return;
      if (k === 'ema20') {
        chart.addLine(_lineData(candles, ema(candles, { period: 20 }).values), { color: '#f59e0b', lineWidth: 1, title: 'EMA 20', id: 'ov-ema20' });
      } else if (k === 'ema50') {
        chart.addLine(_lineData(candles, ema(candles, { period: 50 }).values), { color: '#a78bfa', lineWidth: 1, title: 'EMA 50', id: 'ov-ema50' });
      } else if (k === 'sma200') {
        chart.addLine(_lineData(candles, sma(candles, { period: 200 }).values), { color: '#38bdf8', lineWidth: 1, title: 'SMA 200', id: 'ov-sma200' });
      } else if (k === 'bb') {
        const { values } = bollinger(candles, { period: 20, stdDev: 2 });
        chart.addLine(_lineData(candles, values.upper), { color: '#6366f1', lineWidth: 1, title: 'BB Upper', id: 'ov-bb-u' });
        chart.addLine(_lineData(candles, values.lower), { color: '#6366f1', lineWidth: 1, title: 'BB Lower', id: 'ov-bb-l' });
      }
    }

    function rmOvl(k) {
      if (!chart) return;
      if (k === 'bb') { chart.removeLineSeries('ov-bb-u'); chart.removeLineSeries('ov-bb-l'); }
      else chart.removeLineSeries('ov-' + k);
    }

    function toggleVol(on) {
      if (!chart) return;
      if (on) { chart.addVolume(candles); return; }
      const vs = chart.volumeSeries;
      if (vs) { try { chart.chart.removeSeries(vs); } catch (_) {} }
    }

    function populatePanel() {
      if (!signal) return;
      const dirEl = document.getElementById('sig-dir');
      if (dirEl) {
        const lbl = signal.direction === 'long' ? 'LONG' : signal.direction === 'short' ? 'SHORT' : 'NO TRADE';
        const cls = signal.direction === 'long' ? 'badge-success' : signal.direction === 'short' ? 'badge-danger' : 'badge-gray';
        dirEl.textContent = lbl; dirEl.className = 'badge ' + cls;
      }
      const bar = document.getElementById('sig-bar'); const lblEl = document.getElementById('sig-lbl');
      if (bar) { bar.style.width = signal.score + '%'; bar.style.background = colorForScore(signal.score); }
      if (lblEl) lblEl.textContent = signal.score + ' / 100';
      signal.breakdown.forEach((s, i) => {
        const el = document.getElementById('bd-' + i);
        if (el) el.innerHTML = _barHTML(s, CATS[i]);
      });
    }

    function updateSlTp() {
      if (!candles.length) return;
      const last = candles[candles.length - 1];
      const a = calculateATRSimple(candles, 14) || (last.close * 0.015);
      const sl = document.getElementById('sl-val'), tp = document.getElementById('tp-val');
      if (sl) sl.textContent = formatPrice(last.close - a * 1.5);
      if (tp) tp.textContent = formatPrice(last.close + a * 3);
    }

    function placeTrade(dir) {
      if (!candles.length) return;
      const last = candles[candles.length - 1];
      const qty = parseFloat(document.getElementById('trade-qty')?.value) || 0.01;
      const a = calculateATRSimple(candles, 14) || (last.close * 0.015);
      const isLong = dir === SIGNAL_DIRECTIONS.LONG;
      const trade = {
        id: generateId(), symbol, direction: dir, entryPrice: last.close, quantity: qty,
        stopLoss: isLong ? last.close - a * 1.5 : last.close + a * 1.5,
        takeProfit: isLong ? last.close + a * 3 : last.close - a * 3,
        status: 'open', entryTime: Date.now(),
        exitPrice: null, exitTime: null, pnl: null, pnlPercent: null, exitReason: null,
      };
      storage?.set?.('trades', [trade, ...(storage?.get?.('trades') || [])]);
      eventBus?.emit?.('trade:opened', trade);
    }

    /* ── event wiring ─────────────────────────────────────────────── */

    const tfBar = document.getElementById('chart-tf-bar');
    if (tfBar) {
      const h = (e) => {
        const btn = e.target.closest('[data-tf]'); if (!btn) return;
        tfBar.querySelectorAll('button').forEach(b => { b.className = 'btn btn-ghost'; });
        btn.className = 'btn btn-primary'; load(btn.dataset.tf);
      };
      tfBar.addEventListener('click', h); cleanups.push(() => tfBar.removeEventListener('click', h));
    }

    const toolbar = document.getElementById('ind-toolbar');
    if (toolbar) {
      const h = (e) => {
        const cb = e.target.closest('[data-ind]'); if (!cb) return;
        const k = cb.dataset.ind; active[k] = cb.checked;
        if (k === 'volume') { toggleVol(cb.checked); return; }
        cb.checked ? addOvl(k) : rmOvl(k);
      };
      toolbar.addEventListener('change', h); cleanups.push(() => toolbar.removeEventListener('change', h));
    }

    const aiBtn = document.getElementById('ai-btn');
    if (aiBtn) {
      const h = async () => {
        const res = document.getElementById('ai-result'); if (!res) return;
        aiBtn.disabled = true; aiBtn.textContent = 'Analyzing...'; res.textContent = 'Generating analysis...';
        try {
          const ai = app?.getProvider?.('ai');
          if (ai?.analyze) {
            res.textContent = await ai.analyze({ symbol, timeframe: tf, candles: candles.slice(-50), signal });
          } else {
            const d = signal?.direction === 'long' ? 'bullish' : signal?.direction === 'short' ? 'bearish' : 'neutral';
            res.textContent = `[Demo AI] ${symbol} on ${tf} shows ${d} tendencies. Score: ${signal?.score ?? 0}/100. Consider waiting for confirmation on higher timeframes.`;
          }
        } catch (err) { res.textContent = 'AI analysis failed: ' + (err.message || 'Unknown error'); }
        aiBtn.disabled = false; aiBtn.textContent = 'Analyze with AI';
      };
      aiBtn.addEventListener('click', h); cleanups.push(() => aiBtn.removeEventListener('click', h));
    }

    const buyBtn = document.getElementById('buy-btn');
    const sellBtn = document.getElementById('sell-btn');
    if (buyBtn) { const h = () => placeTrade(SIGNAL_DIRECTIONS.LONG); buyBtn.addEventListener('click', h); cleanups.push(() => buyBtn.removeEventListener('click', h)); }
    if (sellBtn) { const h = () => placeTrade(SIGNAL_DIRECTIONS.SHORT); sellBtn.addEventListener('click', h); cleanups.push(() => sellBtn.removeEventListener('click', h)); }

    const onUpd = () => load(tf);
    eventBus?.on?.('data:update', onUpd);
    cleanups.push(() => eventBus?.off?.('data:update', onUpd));

    load('1h');

    ctx._cleanup = () => {
      cleanups.forEach(fn => fn()); cleanups.length = 0;
      chart?.destroy(); chart = null;
    };
  },

  destroy(ctx) {
    if (ctx._cleanup) { ctx._cleanup(); ctx._cleanup = null; }
  },
};

export default ChartPage;
