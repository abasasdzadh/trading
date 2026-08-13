/**
 * alerts.js — Alerts Page
 * Task ID: 2-h4
 */

import { generateId, formatDate, generateId as uuid } from '../../core/utils.js';
import { DEMO_SYMBOLS, DEMO_SYMBOL_LIST } from '../../core/demo-data.js';
import { showToast } from '../components.js';

/* ── demo alerts ──────────────────────────────────────────────────── */

const ALERT_TYPES = [
  { value: 'price_above', label: 'Price Above' },
  { value: 'price_below', label: 'Price Below' },
  { value: 'price_crosses_above', label: 'Price Crosses Above' },
  { value: 'price_crosses_below', label: 'Price Crosses Below' },
  { value: 'signal_score', label: 'Signal Score' },
];

function _generateDemoAlerts() {
  const symbols = DEMO_SYMBOL_LIST;
  const now = Date.now();
  return [
    { id: uuid(), type: 'price_above', symbol: 'BTCUSDT', value: 70000, status: 'active', createdAt: now - 3600000, triggered: false },
    { id: uuid(), type: 'price_below', symbol: 'ETHUSDT', value: 3200, status: 'active', createdAt: now - 7200000, triggered: false },
    { id: uuid(), type: 'signal_score', symbol: 'SOLUSDT', value: 80, status: 'active', createdAt: now - 1800000, triggered: false },
    { id: uuid(), type: 'price_crosses_above', symbol: 'BNBUSDT', value: 650, status: 'dismissed', createdAt: now - 86400000, triggered: true, triggeredAt: now - 43200000 },
    { id: uuid(), type: 'price_below', symbol: 'XRPUSDT', value: 0.55, status: 'triggered', createdAt: now - 172800000, triggered: true, triggeredAt: now - 86400000 },
  ];
}

function _alertRow(a, i) {
  const typeLabel = ALERT_TYPES.find(t => t.value === a.type)?.label || a.type;
  const statusBadge = a.status === 'active'
    ? '<span class="badge badge-success">Active</span>'
    : a.status === 'triggered'
      ? '<span class="badge badge-warning">Triggered</span>'
      : '<span class="badge badge-neutral">Dismissed</span>';
  const actions = a.status === 'active'
    ? `<button class="btn btn-sm btn-danger" data-delete-alert="${i}">Delete</button>
       <button class="btn btn-sm btn-ghost" data-dismiss-alert="${i}">Dismiss</button>`
    : `<button class="btn btn-sm btn-danger" data-delete-alert="${i}">Delete</button>`;
  return `<tr>
    <td>${typeLabel}</td>
    <td class="font-medium">${a.symbol}</td>
    <td class="mono">${a.type === 'signal_score' ? 'Score ≥ ' : ''}${a.value}</td>
    <td>${statusBadge}</td>
    <td>${formatDate(a.createdAt)}</td>
    <td style="white-space:nowrap">${actions}</td>
  </tr>`;
}

function _triggeredRow(a) {
  const typeLabel = ALERT_TYPES.find(t => t.value === a.type)?.label || a.type;
  return `<tr>
    <td>${typeLabel}</td><td class="font-medium">${a.symbol}</td>
    <td class="mono">${a.value}</td><td>${formatDate(a.triggeredAt)}</td>
  </tr>`;
}

/* ── page ─────────────────────────────────────────────────────────── */

const AlertsPage = {
  render(ctx) {
    const alerts = _generateDemoAlerts();
    ctx._alerts = alerts;
    const active = alerts.filter(a => a.status === 'active');
    const triggered = alerts.filter(a => a.triggered);
    const typeOpts = ALERT_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('');
    const symbolOpts = DEMO_SYMBOL_LIST.map(s => `<option value="${s}">${s}</option>`).join('');

    return `
<div class="page-header"><div class="page-header-left">
  <h1 class="page-header-title">Alerts</h1>
  <p class="page-header-subtitle">Price and signal alerts</p>
</div><div class="page-header-actions">
  <button class="btn btn-primary" id="alert-create-btn">+ Create Alert</button>
</div></div>

<div class="card" style="margin-bottom:var(--space-6)"><div class="card-header">
  <div class="card-header-title">Active Alerts (${active.length})</div>
</div><div class="card-body" style="padding:0;overflow-x:auto"><div class="table-wrapper">
  <table class="data-table striped"><thead><tr>
    <th>Type</th><th>Symbol</th><th>Condition</th><th>Status</th><th>Created</th><th>Actions</th>
  </tr></thead><tbody id="alerts-active-tbody">
    ${active.length ? active.map((a, i) => _alertRow(a, alerts.indexOf(a))).join('') : '<tr><td colspan="6" style="text-align:center;padding:var(--space-6);color:var(--text-muted)">No active alerts</td></tr>'}
  </tbody></table>
</div></div></div>

<div class="card" style="margin-bottom:var(--space-6)"><div class="card-header">
  <div class="card-header-title">Create Alert</div>
</div><div class="card-body">
  <div class="form-row">
    <div class="form-group"><label class="form-label">Type</label>
      <select class="select" id="alert-f-type">${typeOpts}</select></div>
    <div class="form-group"><label class="form-label">Symbol</label>
      <select class="select" id="alert-f-symbol">${symbolOpts}</select></div>
    <div class="form-group"><label class="form-label">Value</label>
      <input class="input" type="number" id="alert-f-value" placeholder="0.00" step="any"></div>
    <div class="form-group" id="alert-f-dir-wrap" style="display:none"><label class="form-label">Direction</label>
      <select class="select" id="alert-f-dir"><option value="above">Above</option><option value="below">Below</option></select></div>
  </div>
  <button class="btn btn-primary" id="alert-f-submit" style="margin-top:var(--space-3)">Create Alert</button>
</div></div>

<div class="card"><div class="card-header">
  <div class="card-header-title">Alert History</div>
</div><div class="card-body" style="padding:0;overflow-x:auto"><div class="table-wrapper">
  <table class="data-table striped"><thead><tr>
    <th>Type</th><th>Symbol</th><th>Triggered Value</th><th>Triggered At</th>
  </tr></thead><tbody>
    ${triggered.length ? triggered.map(_triggeredRow).join('') : '<tr><td colspan="4" style="text-align:center;padding:var(--space-6);color:var(--text-muted)">No triggered alerts</td></tr>'}
  </tbody></table>
</div></div></div>`;
  },

  init(ctx) {
    const alerts = ctx._alerts;
    const $ = id => document.getElementById(id);

    // Show/hide direction select for signal_score type
    $('alert-f-type')?.addEventListener('change', e => {
      $('alert-f-dir-wrap').style.display = e.target.value === 'signal_score' ? '' : 'none';
    });

    // Create alert
    $('alert-f-submit')?.addEventListener('click', () => {
      const type = $('alert-f-type').value;
      const symbol = $('alert-f-symbol').value;
      const value = parseFloat($('alert-f-value').value);
      if (!value && value !== 0) { showToast('Please enter a value', 'warning'); return; }
      const newAlert = { id: generateId(), type, symbol, value, status: 'active', createdAt: Date.now(), triggered: false };
      alerts.unshift(newAlert);
      ctx.storage?.saveAlert?.(newAlert);
      ctx.eventBus?.emit?.('alert:created', newAlert);
      showToast(`Alert created for ${symbol}`, 'success');
      location.reload();
    });

    // Delete alert
    document.querySelectorAll('[data-delete-alert]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.deleteAlert, 10);
        const alert = alerts[idx];
        if (alert) {
          ctx.storage?.deleteAlert?.(alert.id);
          alerts.splice(idx, 1);
          ctx.eventBus?.emit?.('alert:deleted', { id: alert.id });
          showToast('Alert deleted', 'info');
          location.reload();
        }
      });
    });

    // Dismiss alert
    document.querySelectorAll('[data-dismiss-alert]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.dismissAlert, 10);
        const alert = alerts[idx];
        if (alert) {
          alert.status = 'dismissed';
          ctx.storage?.saveAlert?.(alert);
          ctx.eventBus?.emit?.('alert:dismissed', { id: alert.id });
          showToast('Alert dismissed', 'info');
          location.reload();
        }
      });
    });

    // Show toast for previously triggered alerts
    const triggered = alerts.filter(a => a.triggered);
    if (triggered.length) {
      setTimeout(() => {
        showToast(`${triggered.length} alert(s) were triggered`, 'warning');
      }, 500);
    }

    ctx._cleanup = () => {};
  },
};

export default AlertsPage;
