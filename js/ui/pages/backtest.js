/**
 * backtest.js — Backtest Page
 * Task ID: 2-h3
 *
 * Runs a simple demo backtest engine with configurable parameters.
 * Generates equity curve chart (SVG), metrics grid, and trades table
 * with filtering tabs.
 */

import { generateDemoCandles } from '../../core/demo-data.js';
import { formatPrice, formatPercent, formatDate, colorForSignal } from '../../core/utils.js';
import { SIGNAL_DIRECTIONS, STRATEGY_TYPES, STRATEGY_LABELS, TIMEFRAMES, TIMEFRAME_LABELS } from '../../core/types.js';
import ema from '../../indicators/ema.js';
import rsi from '../../indicators/rsi.js';
import macd from '../../indicators/macd.js';
import atr from '../../indicators/atr.js';

/* ── helpers ─────────────────────────────────────────────────────── */

function _computeSignal(candles, endIdx) {
  const slice = candles.slice(0, endIdx + 1);
  if (slice.length < 60) return { direction: 'no_trade', score: 0 };
  const close = slice[slice.length - 1].close;
  const e20 = ema(slice, { period: 20 }).values;
  const e50 = ema(slice, { period: 50 }).values;
  const le20 = e20[e20.length - 1], le50 = e50[e50.length - 1];
  let trend = 50;
  if (le20 && le50) {
    trend = le20 > le50
      ? 50 + Math.min(40, ((le20 - le50) / le50) * 1000)
      : 50 - Math.min(40, ((le50 - le20) / le20) * 1000);
    trend = Math.round(Math.max(0, Math.min(100, trend)));
  }
  const rsiVals = rsi(slice, { period: 14 }).values;
  const lastRsi = rsiVals[rsiVals.length - 1] ?? 50;
  let mom = Math.round(Math.max(0, Math.min(100, 100 - Math.abs(lastRsi - 50) * 1.2)));
  const macdH = macd(slice).values?.histogram;
  if (macdH?.length) {
    const h = macdH[macdH.length - 1];
    if (h != null) mom = Math.round((mom + (h > 0 ? 70 : 30)) / 2);
  }
  const score = Math.round((trend + mom) / 2);
  let direction = SIGNAL_DIRECTIONS.NO_TRADE;
  if (score >= 60 && trend > 50) direction = SIGNAL_DIRECTIONS.LONG;
  else if (score >= 60 && trend < 50) direction = SIGNAL_DIRECTIONS.SHORT;
  return { direction, score };
}

function _runBacktest(candles, config) {
  const { initialCapital, riskPct, commissionPct } = config;
  const trades = [];
  const equity = [initialCapital];
  let capital = initialCapital;
  let position = null; // { dir, entryPrice, entryIdx, qty }

  for (let i = 100; i < candles.length; i++) {
    const c = candles[i];

    // Check exit if in position
    if (position) {
      const sl = position.dir === 'long'
        ? position.entryPrice * (1 - 0.02)
        : position.entryPrice * (1 + 0.02);
      const tp = position.dir === 'long'
        ? position.entryPrice * (1 + 0.04)
        : position.entryPrice * (1 - 0.04);
      let exited = false;
      if (position.dir === 'long' && (c.low <= sl || c.high >= tp)) {
        const exitPrice = c.low <= sl ? sl : tp;
        const pnl = (exitPrice - position.entryPrice) * position.qty;
        const comm = exitPrice * position.qty * (commissionPct / 100) * 2;
        capital += pnl - comm;
        trades.push({
          dir: position.dir, entryIdx: position.entryIdx, exitIdx: i,
          entryPrice: position.entryPrice, exitPrice,
          pnl: pnl - comm, pnlPct: ((exitPrice - position.entryPrice) / position.entryPrice) * 100 * (position.dir === 'long' ? 1 : -1),
          status: c.low <= sl ? 'stopped' : 'tp_hit',
        });
        position = null; exited = true;
      } else if (position.dir === 'short' && (c.high >= sl || c.low <= tp)) {
        const exitPrice = c.high >= sl ? sl : tp;
        const pnl = (position.entryPrice - exitPrice) * position.qty;
        const comm = exitPrice * position.qty * (commissionPct / 100) * 2;
        capital += pnl - comm;
        trades.push({
          dir: position.dir, entryIdx: position.entryIdx, exitIdx: i,
          entryPrice: position.entryPrice, exitPrice,
          pnl: pnl - comm, pnlPct: ((position.entryPrice - exitPrice) / position.entryPrice) * 100,
          status: c.high >= sl ? 'stopped' : 'tp_hit',
        });
        position = null; exited = true;
      }
      if (!exited) {
        const unrealized = position.dir === 'long'
          ? (c.close - position.entryPrice) * position.qty
          : (position.entryPrice - c.close) * position.qty;
        equity.push(capital + unrealized);
        continue;
      }
    }

    // No position — check for entry signal
    if (!position) {
      const sig = _computeSignal(candles, i);
      if (sig.score >= 60 && sig.direction !== 'no_trade') {
        const atrVal = atr(candles.slice(0, i + 1), { period: 14 }).values;
        const lastAtr = atrVal[atrVal.length - 1];
        if (!lastAtr || lastAtr <= 0) { equity.push(capital); continue; }
        const riskAmt = capital * (riskPct / 100);
        const qty = riskAmt / lastAtr;
        position = { dir: sig.direction, entryPrice: c.close, entryIdx: i, qty };
      }
    }
    equity.push(capital);
  }

  // Close open position at end
  if (position) {
    const lastC = candles[candles.length - 1];
    const pnl = position.dir === 'long'
      ? (lastC.close - position.entryPrice) * position.qty
      : (position.entryPrice - lastC.close) * position.qty;
    capital += pnl;
    trades.push({
      dir: position.dir, entryIdx: position.entryIdx, exitIdx: candles.length - 1,
      entryPrice: position.entryPrice, exitPrice: lastC.close,
      pnl, pnlPct: position.dir === 'long'
        ? ((lastC.close - position.entryPrice) / position.entryPrice) * 100
        : ((position.entryPrice - lastC.close) / position.entryPrice) * 100,
      status: 'closed',
    });
  }

  return { trades, equity };
}

function _calcMetrics(trades, equity, initialCapital) {
  const finalEquity = equity[equity.length - 1] || initialCapital;
  const totalReturn = ((finalEquity - initialCapital) / initialCapital) * 100;
  const closed = trades.filter(t => t.pnl != null);
  const wins = closed.filter(t => t.pnl > 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(closed.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Max drawdown
  let peak = initialCapital, maxDD = 0;
  for (const e of equity) {
    if (e > peak) peak = e;
    const dd = ((peak - e) / peak) * 100;
    if (dd > maxDD) maxDD = dd;
  }

  // Sharpe ratio (simplified — daily returns)
  const returns = [];
  for (let i = 1; i < equity.length; i++) returns.push((equity[i] - equity[i - 1]) / equity[i - 1]);
  const avgR = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdR = returns.length ? Math.sqrt(returns.reduce((s, r) => s + (r - avgR) ** 2, 0) / returns.length) : 1;
  const sharpe = stdR > 0 ? (avgR / stdR) * Math.sqrt(252) : 0;

  return {
    totalReturn: totalReturn.toFixed(2),
    winRate: winRate.toFixed(1),
    profitFactor: profitFactor === Infinity ? '∞' : profitFactor.toFixed(2),
    maxDrawdown: maxDD.toFixed(2),
    sharpeRatio: sharpe.toFixed(2),
    totalTrades: trades.length,
  };
}

function _equitySVG(equity, w = 800, h = 300) {
  if (!equity.length) return '<div style="text-align:center;color:var(--text-muted);padding:40px">No data</div>';
  const pad = { t: 20, r: 20, b: 30, l: 60 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  const minV = Math.min(...equity), maxV = Math.max(...equity);
  const rangeV = maxV - minV || 1;
  const step = Math.max(1, Math.floor(equity.length / pw));

  const points = equity.map((v, i) => {
    const x = pad.l + (i / (equity.length - 1)) * pw;
    const y = pad.t + (1 - (v - minV) / rangeV) * ph;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  // Starting capital line
  const startY = pad.t + (1 - (equity[0] - minV) / rangeV) * ph;

  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (i / 4) * ph;
    const val = maxV - (i / 4) * rangeV;
    grid += `<line x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}" stroke="var(--border)" stroke-dasharray="4,4"/>`;
    grid += `<text x="${pad.l - 8}" y="${y + 4}" text-anchor="end" fill="var(--text-muted)" font-size="10">$${val.toFixed(0)}</text>`;
  }

  const areaPath = `M${points[0]} ${points.map(p => `L${p}`).join(' ')} L${(pad.l + pw).toFixed(1)},${(pad.t + ph).toFixed(1)} L${pad.l},${(pad.t + ph).toFixed(1)} Z`;
  const lineColor = equity[equity.length - 1] >= equity[0] ? 'var(--success)' : 'var(--danger)';

  return `<svg width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
  ${grid}
  <line x1="${pad.l}" y1="${startY}" x2="${w - pad.r}" y2="${startY}" stroke="var(--text-muted)" stroke-width="1" stroke-dasharray="6,3" opacity=".4"/>
  <defs><linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${lineColor}" stop-opacity="0.3"/>
    <stop offset="100%" stop-color="${lineColor}" stop-opacity="0.02"/>
  </linearGradient></defs>
  <path d="${areaPath}" fill="url(#eqGrad)"/>
  <polyline points="${points.join(' ')}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linejoin="round"/>
</svg>`;
}

function _statCard(label, value, opts = {}) {
  const color = opts.color || 'var(--text-primary)';
  const prefix = opts.prefix || '';
  const suffix = opts.suffix || '';
  const positive = opts.positive;
  const negative = opts.negative;
  let valColor = color;
  if (positive) valColor = 'var(--success)';
  if (negative) valColor = 'var(--danger)';
  return `<div class="stat-card"><div style="display:flex;align-items:center;justify-content:space-between">
    <span class="stat-card-label">${label}</span>
  </div><div class="stat-card-value" style="color:${valColor}">${prefix}${value}${suffix}</div></div>`;
}

function _tradeRow(t, idx, candles) {
  const dirColor = t.dir === 'long' ? 'var(--success)' : 'var(--danger)';
  const dirLbl = t.dir.toUpperCase();
  const pnlColor = t.pnl >= 0 ? 'var(--success)' : 'var(--danger)';
  const entryTime = candles[t.entryIdx] ? new Date(candles[t.entryIdx].time).toLocaleString() : '—';
  const exitTime = candles[t.exitIdx] ? new Date(candles[t.exitIdx].time).toLocaleString() : '—';
  const statusLbl = t.status === 'tp_hit' ? 'TP Hit' : t.status === 'stopped' ? 'Stopped' : 'Closed';
  return `<tr>
    <td class="mono" style="color:var(--text-muted)">${idx + 1}</td>
    <td style="color:${dirColor};font-weight:600">${dirLbl}</td>
    <td style="font-size:var(--text-xs)">${entryTime}</td>
    <td class="mono">${formatPrice(t.entryPrice)}</td>
    <td style="font-size:var(--text-xs)">${exitTime}</td>
    <td class="mono">${formatPrice(t.exitPrice)}</td>
    <td class="mono" style="color:${pnlColor}">$${t.pnl.toFixed(2)}</td>
    <td class="mono" style="color:${pnlColor}">${formatPercent(t.pnlPct)}</td>
    <td><span style="font-size:var(--text-xs);padding:2px 8px;border-radius:4px;background:var(--bg-secondary)">${statusLbl}</span></td>
  </tr>`;
}

/* ── page object ─────────────────────────────────────────────────── */

const BacktestPage = {
  render(ctx) {
    const tfOpts = TIMEFRAMES.map(tf =>
      `<option value="${tf}">${TIMEFRAME_LABELS[tf] || tf}</option>`
    ).join('');
    const stratOpts = Object.values(STRATEGY_TYPES).map(s =>
      `<option value="${s}">${STRATEGY_LABELS[s] || s}</option>`
    ).join('');

    const today = new Date().toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    return `
<div class="page-header"><div class="page-header-left">
  <h1 class="page-header-title">Backtest</h1>
  <p class="page-header-subtitle">Test strategies against historical data</p>
</div></div>

<div class="card" style="margin-bottom:var(--space-6)"><div class="card-header"><div>
  <div class="card-header-title">Configuration</div>
</div></div><div class="card-body">
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:var(--space-4);align-items:end">
    <div><label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">Symbol</label>
      <input id="bt-symbol" type="text" value="BTCUSDT" style="width:100%;padding:8px 12px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:var(--text-sm)">
    </div>
    <div><label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">Timeframe</label>
      <select id="bt-timeframe" style="width:100%;padding:8px 12px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:var(--text-sm)"><option value="1h" selected>1 Hour</option>${tfOpts}</select>
    </div>
    <div><label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">Strategy</label>
      <select id="bt-strategy" style="width:100%;padding:8px 12px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:var(--text-sm)">${stratOpts}</select>
    </div>
    <div><label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">Start Date</label>
      <input id="bt-start" type="date" value="${monthAgo}" style="width:100%;padding:8px 12px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:var(--text-sm)">
    </div>
    <div><label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">End Date</label>
      <input id="bt-end" type="date" value="${today}" style="width:100%;padding:8px 12px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:var(--text-sm)">
    </div>
    <div><label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">Initial Capital ($)</label>
      <input id="bt-capital" type="number" min="100" value="10000" style="width:100%;padding:8px 12px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:var(--text-sm)">
    </div>
    <div><label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">Risk %</label>
      <input id="bt-risk" type="number" min="0.1" max="10" step="0.1" value="1" style="width:100%;padding:8px 12px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:var(--text-sm)">
    </div>
    <div><label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">Commission %</label>
      <input id="bt-commission" type="number" min="0" max="1" step="0.01" value="0.1" style="width:100%;padding:8px 12px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:var(--text-sm)">
    </div>
  </div>
  <div style="margin-top:var(--space-4)"><button id="bt-run" class="btn btn-primary">Run Backtest</button></div>
</div></div>

<div id="backtest-loading" style="display:none;text-align:center;padding:var(--space-12)">
  <div style="display:inline-block;width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin .8s linear infinite"></div>
  <p style="margin-top:var(--space-3);color:var(--text-muted);font-size:var(--text-sm)">Running backtest…</p>
</div>

<div id="backtest-results" style="display:none">
  <div class="grid-3" style="margin-bottom:var(--space-6)" id="bt-metrics"></div>
  <div class="card" style="margin-bottom:var(--space-6)"><div class="card-header"><div>
    <div class="card-header-title">Equity Curve</div>
  </div></div><div class="card-body" style="padding:var(--space-4)" id="equity-chart"></div></div>
  <div class="card"><div class="card-header"><div>
    <div class="card-header-title">Trades</div>
  </div><div class="card-header-actions">
    <div style="display:flex;gap:4px" id="bt-trade-tabs">
      <button class="btn btn-primary btn-sm" data-filter="all">All</button>
      <button class="btn btn-ghost btn-sm" data-filter="winning">Winning</button>
      <button class="btn btn-ghost btn-sm" data-filter="losing">Losing</button>
    </div>
  </div></div><div class="card-body" style="padding:0;overflow-x:auto"><div class="table-wrapper">
    <table class="data-table striped"><thead><tr>
      <th>#</th><th>Direction</th><th>Entry Time</th><th>Entry Price</th><th>Exit Time</th><th>Exit Price</th><th>PnL</th><th>PnL %</th><th>Status</th>
    </tr></thead><tbody id="trades-table"></tbody></table>
  </div></div></div>
</div>`;
  },

  init(ctx) {
    const $ = (id) => document.getElementById(id);
    let _trades = [];
    let _candles = [];
    let _activeFilter = 'all';

    function runBacktest() {
      const symbol = ($('bt-symbol')?.value || 'BTCUSDT').trim().toUpperCase();
      const timeframe = $('bt-timeframe')?.value || '1h';
      const initialCapital = parseFloat($('bt-capital')?.value) || 10000;
      const riskPct = parseFloat($('bt-risk')?.value) || 1;
      const commissionPct = parseFloat($('bt-commission')?.value) || 0.1;

      // Show loading, hide results
      $('backtest-loading').style.display = 'block';
      $('backtest-results').style.display = 'none';

      setTimeout(() => {
        _candles = generateDemoCandles(symbol, timeframe, 1000);
        const { trades, equity } = _runBacktest(_candles, { initialCapital, riskPct, commissionPct });
        _trades = trades;
        const m = _calcMetrics(trades, equity, initialCapital);

        // Populate metrics
        const ret = parseFloat(m.totalReturn);
        $('bt-metrics').innerHTML =
          _statCard('Total Return', m.totalReturn, { suffix: '%', positive: ret >= 0, negative: ret < 0 }) +
          _statCard('Win Rate', m.winRate, { suffix: '%' }) +
          _statCard('Profit Factor', m.profitFactor) +
          _statCard('Max Drawdown', m.maxDrawdown, { suffix: '%', negative: true }) +
          _statCard('Sharpe Ratio', m.sharpeRatio) +
          _statCard('Total Trades', m.totalTrades);

        // Equity chart
        $('equity-chart').innerHTML = _equitySVG(equity);

        // Trades table
        _activeFilter = 'all';
        renderTrades('all');
        _setActiveTab('all');

        $('backtest-loading').style.display = 'none';
        $('backtest-results').style.display = 'block';
      }, 400);
    }

    function renderTrades(filter) {
      const tbody = $('trades-table');
      if (!tbody) return;
      let filtered = _trades;
      if (filter === 'winning') filtered = _trades.filter(t => t.pnl > 0);
      else if (filter === 'losing') filtered = _trades.filter(t => t.pnl <= 0);

      if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:var(--space-6);color:var(--text-muted)">No trades</td></tr>`;
        return;
      }
      tbody.innerHTML = filtered.map((t, i) => _tradeRow(t, i, _candles)).join('');
    }

    function _setActiveTab(filter) {
      const tabs = $('bt-trade-tabs');
      if (!tabs) return;
      tabs.querySelectorAll('button').forEach(btn => {
        const isActive = btn.dataset.filter === filter;
        btn.className = isActive ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm';
      });
    }

    // Run button
    $('bt-run')?.addEventListener('click', runBacktest);

    // Tab buttons
    $('bt-trade-tabs')?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      _activeFilter = btn.dataset.filter;
      _setActiveTab(_activeFilter);
      renderTrades(_activeFilter);
    });

    ctx._cleanup = () => {};
  },
};

export default BacktestPage;
