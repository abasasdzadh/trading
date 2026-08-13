/**
 * Reusable UI Components — Vanilla JS DOM helpers
 * All components return HTMLElements (not strings) and use CSS classes from styles.css.
 */

/* ================================================================== */
/*  Low-level DOM helpers                                             */
/* ================================================================== */

/**
 * Create an HTMLElement with optional attributes and children.
 * @param {string} tag
 * @param {object|undefined} attrs  — DOM attributes + event listeners (onclick, onchange, etc.)
 * @param {...(HTMLElement|string)} children
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);

  for (const [key, val] of Object.entries(attrs)) {
    if (key.startsWith('on') && typeof val === 'function') {
      // Event listener — e.g. onclick → click
      el.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (key === 'className' || key === 'class') {
      el.className = val;
    } else if (key === 'style' && typeof val === 'object') {
      Object.assign(el.style, val);
    } else if (key === 'dataset' && typeof val === 'object') {
      Object.assign(el.dataset, val);
    } else if (key === 'html') {
      el.innerHTML = val;
    } else if (key === 'text') {
      el.textContent = val;
    } else {
      el.setAttribute(key, val);
    }
  }

  for (const child of children) {
    if (child == null) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof HTMLElement) {
      el.appendChild(child);
    } else if (Array.isArray(child)) {
      child.forEach(c => {
        if (typeof c === 'string' || typeof c === 'number') {
          el.appendChild(document.createTextNode(String(c)));
        } else if (c instanceof HTMLElement) {
          el.appendChild(c);
        }
      });
    }
  }

  return el;
}

/** Shorthand alias */
export const el = createElement;

/**
 * Create a text node wrapped in a span (useful for inline labels).
 * @param {string} text
 * @param {string} [className]
 * @returns {HTMLSpanElement}
 */
export function txt(text, className) {
  const span = document.createElement('span');
  span.textContent = text;
  if (className) span.className = className;
  return span;
}

/* ================================================================== */
/*  a. Button                                                          */
/* ================================================================== */

/**
 * @param {string} label
 * @param {object} opts
 * @param {'primary'|'success'|'danger'|'ghost'|'outline'} [opts.variant='primary']
 * @param {'sm'|'md'|'lg'} [opts.size]
 * @param {string} [opts.icon] — emoji icon
 * @param {function} [opts.onClick]
 * @param {boolean} [opts.disabled]
 * @param {string} [opts.className]
 * @param {string} [opts.id]
 * @param {string} [opts.type='button']
 * @returns {HTMLButtonElement}
 */
export function createButton(label, opts = {}) {
  const {
    variant = 'primary',
    size,
    icon,
    onClick,
    disabled = false,
    className = '',
    id,
    type = 'button',
  } = opts;

  const classes = ['btn'];
  if (variant) classes.push(`btn-${variant}`);
  if (size) classes.push(`btn-${size}`);
  if (className) classes.push(className);

  const attrs = {
    className: classes.join(' '),
    type,
    disabled,
  };
  if (id) attrs.id = id;
  if (onClick) attrs.onclick = onClick;

  const children = [];
  if (icon) children.push(document.createTextNode(icon + ' '));
  children.push(document.createTextNode(label));

  const btn = createElement('button', attrs, ...children);
  return btn;
}

/* ================================================================== */
/*  b. Input (with label)                                              */
/* ================================================================== */

/**
 * @param {object} opts
 * @param {string} [opts.label]
 * @param {string} [opts.type='text']
 * @param {string} [opts.placeholder]
 * @param {string} [opts.value]
 * @param {function} [opts.onChange]
 * @param {string} [opts.id]
 * @param {string} [opts.className]
 * @param {string} [opts.error]
 * @param {string} [opts.hint]
 * @param {string} [opts.inputClassName]
 * @returns {HTMLDivElement}
 */
export function createInput(opts = {}) {
  const {
    label,
    type = 'text',
    placeholder,
    value,
    onChange,
    id,
    className = '',
    error,
    hint,
    inputClassName = '',
  } = opts;

  const wrapper = createElement('div', { className: `form-group ${className}`.trim() });

  if (label) {
    const lbl = createElement('label', { className: 'form-label', ...(id ? { for: id } : {}) }, label);
    wrapper.appendChild(lbl);
  }

  const inputClasses = ['input'];
  if (inputClassName) inputClasses.push(inputClassName);
  if (error) inputClasses.push('error');

  const inputAttrs = {
    className: inputClasses.join(' '),
    type,
    placeholder: placeholder || '',
  };
  if (id) inputAttrs.id = id;
  if (value !== undefined) inputAttrs.value = value;
  if (onChange) inputAttrs.oninput = (e) => onChange(e.target.value, e);

  const input = createElement('input', inputAttrs);
  wrapper.appendChild(input);

  if (error) {
    wrapper.appendChild(createElement('div', { className: 'form-error-text' }, error));
  } else if (hint) {
    wrapper.appendChild(createElement('div', { className: 'form-hint' }, hint));
  }

  wrapper._input = input;
  return wrapper;
}

/* ================================================================== */
/*  c. Select (with label)                                             */
/* ================================================================== */

/**
 * @param {object} opts
 * @param {string} [opts.label]
 * @param {Array<{value:string, label:string}>} opts.options
 * @param {string} [opts.value]
 * @param {function} [opts.onChange]
 * @param {string} [opts.id]
 * @param {string} [opts.className]
 * @returns {HTMLDivElement}
 */
export function createSelect(opts = {}) {
  const { label, options = [], value, onChange, id, className = '' } = opts;

  const wrapper = createElement('div', { className: `form-group ${className}`.trim() });

  if (label) {
    const lbl = createElement('label', { className: 'form-label', ...(id ? { for: id } : {}) }, label);
    wrapper.appendChild(lbl);
  }

  const selectChildren = options.map(o =>
    createElement('option', { value: o.value, ...(o.value === value ? { selected: '' } : {}) }, o.label)
  );

  const selectAttrs = { className: 'select' };
  if (id) selectAttrs.id = id;
  if (onChange) selectAttrs.onchange = (e) => onChange(e.target.value, e);

  const select = createElement('select', selectAttrs, ...selectChildren);
  wrapper.appendChild(select);

  wrapper._select = select;
  return wrapper;
}

/* ================================================================== */
/*  d. Toggle Switch                                                   */
/* ================================================================== */

/**
 * @param {object} opts
 * @param {string} [opts.label]
 * @param {boolean} [opts.checked=false]
 * @param {function} [opts.onChange]
 * @param {string} [opts.id]
 * @returns {HTMLDivElement}
 */
export function createToggle(opts = {}) {
  const { label, checked = false, onChange, id } = opts;

  const wrapper = createElement('div', {
    className: 'form-group',
    style: { flexDirection: 'row', alignItems: 'center' },
  });

  const switchId = id || `toggle-${Math.random().toString(36).slice(2, 8)}`;

  const toggleWrapper = createElement('label', { className: 'toggle-switch' });
  const input = createElement('input', {
    type: 'checkbox',
    id: switchId,
    checked,
  });
  if (onChange) input.onchange = (e) => onChange(e.target.checked, e);
  const slider = createElement('span', { className: 'toggle-slider' });
  toggleWrapper.appendChild(input);
  toggleWrapper.appendChild(slider);
  wrapper.appendChild(toggleWrapper);

  if (label) {
    const lbl = createElement('label', {
      className: 'form-label',
      for: switchId,
      style: { marginBottom: '0', cursor: 'pointer', marginLeft: '8px' },
    }, label);
    wrapper.appendChild(lbl);
  }

  wrapper._input = input;
  return wrapper;
}

/* ================================================================== */
/*  e. Card                                                            */
/* ================================================================== */

/**
 * @param {object} opts
 * @param {string} [opts.title]
 * @param {string} [opts.subtitle]
 * @param {string} [opts.className]
 * @param {Array<HTMLElement>} [opts.headerActions]
 * @param {HTMLElement|string} [opts.body]
 * @param {HTMLElement} [opts.footer]
 * @returns {HTMLDivElement}
 */
export function createCard(opts = {}) {
  const { title, subtitle, className = '', headerActions, body, footer } = opts;

  const card = createElement('div', { className: `card ${className}`.trim() });

  if (title || headerActions) {
    const header = createElement('div', { className: 'card-header' });
    const left = createElement('div');
    if (title) left.appendChild(createElement('div', { className: 'card-header-title' }, title));
    if (subtitle) left.appendChild(createElement('div', { className: 'card-header-subtitle', style: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' } }, subtitle));
    header.appendChild(left);

    if (headerActions && headerActions.length) {
      const actions = createElement('div', { className: 'card-header-actions' }, ...headerActions);
      header.appendChild(actions);
    }
    card.appendChild(header);
  }

  if (body != null) {
    const bodyEl = createElement('div', { className: 'card-body' });
    if (typeof body === 'string') {
      bodyEl.innerHTML = body;
    } else if (body instanceof HTMLElement) {
      bodyEl.appendChild(body);
    }
    card.appendChild(bodyEl);
  }

  if (footer) {
    const footerEl = createElement('div', { className: 'card-footer' });
    if (typeof footer === 'string') {
      footerEl.innerHTML = footer;
    } else if (footer instanceof HTMLElement) {
      footerEl.appendChild(footer);
    }
    card.appendChild(footerEl);
  }

  return card;
}

/* ================================================================== */
/*  f. Modal                                                           */
/* ================================================================== */

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {HTMLElement|string} opts.content
 * @param {function} [opts.onConfirm]
 * @param {function} [opts.onCancel]
 * @param {string} [opts.confirmText='Confirm']
 * @param {string} [opts.cancelText='Cancel']
 * @param {'sm'|'md'|'lg'|'xl'} [opts.size='md']
 * @returns {{show: function, hide: function, getElement: function}}
 */
export function createModal(opts = {}) {
  const {
    title = '',
    content,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    size = 'md',
  } = opts;

  const sizeClass = size !== 'md' ? `modal-${size}` : '';

  // Overlay
  const overlay = createElement('div', { className: 'modal-overlay', style: { display: 'none' } });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) hide(); });

  // Modal box
  const modal = createElement('div', { className: `modal ${sizeClass}`.trim() });

  // Header
  const header = createElement('div', { className: 'modal-header' });
  header.appendChild(createElement('div', { className: 'modal-title' }, title));
  const closeBtn = createElement('button', { className: 'modal-close', onclick: hide }, '×');
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // Body
  const body = createElement('div', { className: 'modal-body' });
  if (typeof content === 'string') {
    body.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    body.appendChild(content);
  }
  modal.appendChild(body);

  // Footer
  if (onConfirm || onCancel) {
    const footer = createElement('div', { className: 'modal-footer' });
    if (onCancel !== false) {
      footer.appendChild(createButton(cancelText, { variant: 'ghost', onClick: () => { if (onCancel) onCancel(); hide(); } }));
    }
    if (onConfirm) {
      footer.appendChild(createButton(confirmText, { variant: 'primary', onClick: () => { onConfirm(); hide(); } }));
    }
    modal.appendChild(footer);
  }

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  function show() {
    overlay.style.display = 'flex';
    overlay.classList.remove('closing');
    // Trap focus
    const firstBtn = modal.querySelector('button');
    if (firstBtn) firstBtn.focus();
  }

  function hide() {
    overlay.classList.add('closing');
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.classList.remove('closing');
    }, 150);
  }

  function getElement() {
    return overlay;
  }

  return { show, hide, getElement };
}

/* ================================================================== */
/*  g. Tabs                                                            */
/* ================================================================== */

/**
 * @param {object} opts
 * @param {Array<{id: string, label: string}>} opts.tabs
 * @param {string} opts.activeTab
 * @param {function} [opts.onTabChange]
 * @returns {HTMLDivElement}
 */
export function createTabs(opts = {}) {
  const { tabs = [], activeTab, onTabChange } = opts;

  const container = createElement('div', { className: 'tabs-container' });
  const nav = createElement('div', { className: 'tabs-nav' });
  const panels = [];

  tabs.forEach((tab, i) => {
    const isActive = tab.id === activeTab;

    const tabBtn = createElement('button', {
      className: `tab-item${isActive ? ' active' : ''}`,
      dataset: { tab: tab.id },
      onclick: () => {
        nav.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        tabBtn.classList.add('active');
        panels.forEach(p => p.classList.remove('active'));
        panels[i].classList.add('active');
        if (onTabChange) onTabChange(tab.id);
      },
    }, tab.label);
    nav.appendChild(tabBtn);

    const panel = createElement('div', { className: `tab-panel${isActive ? ' active' : ''}`, dataset: { tabPanel: tab.id } });
    panels.push(panel);
  });

  container.appendChild(nav);
  panels.forEach(p => container.appendChild(p));

  /**
   * Set content for a tab panel.
   * @param {string} tabId
   * @param {HTMLElement|string} content
   */
  container.setTabContent = (tabId, content) => {
    const idx = tabs.findIndex(t => t.id === tabId);
    if (idx === -1) return;
    const panel = panels[idx];
    panel.innerHTML = '';
    if (typeof content === 'string') {
      panel.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      panel.appendChild(content);
    }
  };

  container.setActiveTab = (tabId) => {
    const idx = tabs.findIndex(t => t.id === tabId);
    if (idx === -1) return;
    nav.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    nav.querySelectorAll('.tab-item')[idx]?.classList.add('active');
    panels.forEach(p => p.classList.remove('active'));
    panels[idx]?.classList.add('active');
  };

  return container;
}

/* ================================================================== */
/*  h. Badge                                                           */
/* ================================================================== */

/**
 * @param {string} text
 * @param {'success'|'danger'|'warning'|'info'|'neutral'|'long'|'short'|object} variantOrOpts — variant string or options object
 * @returns {HTMLSpanElement}
 */
export function createBadge(text, variantOrOpts = {}) {
  const variant = typeof variantOrOpts === 'string' ? variantOrOpts : (variantOrOpts.variant || 'neutral');
  return createElement('span', { className: `badge badge-${variant}` }, text);
}

/* ================================================================== */
/*  i. Toast (individual)                                              */
/* ================================================================== */

/**
 * @param {string} message
 * @param {object} opts
 * @param {'success'|'error'|'warning'|'info'} [opts.type='info']
 * @param {number} [opts.duration=4000]
 * @param {string} [opts.title]
 * @returns {{show: function, hide: function}}
 */
export function createToast(message, opts = {}) {
  const { type = 'info', duration = 4000, title } = opts;

  const iconMap = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  const toast = createElement('div', { className: `toast toast-${type}` });

  const icon = createElement('span', { className: 'toast-icon' }, iconMap[type] || 'ℹ️');
  toast.appendChild(icon);

  const content = createElement('div', { className: 'toast-content' });
  if (title) {
    content.appendChild(createElement('div', { className: 'toast-title' }, title));
  }
  content.appendChild(createElement('div', { className: 'toast-message' }, message));
  toast.appendChild(content);

  const closeBtn = createElement('button', {
    className: 'toast-close',
    onclick: hide,
  }, '×');
  toast.appendChild(closeBtn);

  // Progress bar
  const progress = createElement('div', {
    className: 'toast-progress',
    style: { animationDuration: `${duration}ms` },
  });
  toast.appendChild(progress);

  let timer = null;

  function show() {
    const container = document.getElementById('toast-container') || ensureToastContainer();
    container.appendChild(toast);
    timer = setTimeout(hide, duration);
  }

  function hide() {
    if (timer) { clearTimeout(timer); timer = null; }
    toast.classList.add('dismissing');
    setTimeout(() => {
      toast.remove();
    }, 250);
  }

  return { show, hide };
}

/* ================================================================== */
/*  j. Global Toast Manager                                            */
/* ================================================================== */

function ensureToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = createElement('div', { id: 'toast-container', className: 'toast-container' });
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Show a toast notification (global convenience function).
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} [type='info']
 * @param {number} [duration=4000]
 */
export function showToast(message, type = 'info', duration = 4000) {
  const t = createToast(message, { type, duration });
  t.show();
  return t;
}

/* ================================================================== */
/*  k. Table                                                           */
/* ================================================================== */

/**
 * @param {object} opts
 * @param {Array<{key:string, label:string, render?:function, className?:string, mono?:boolean}>} opts.columns
 * @param {Array<object>} opts.data
 * @param {boolean} [opts.sortable=false]
 * @param {string} [opts.emptyMessage='No data available']
 * @param {string} [opts.className]
 * @param {boolean} [opts.striped=true]
 * @returns {HTMLDivElement}
 */
export function createTable(opts = {}) {
  const {
    columns = [],
    data = [],
    sortable = false,
    emptyMessage = 'No data available',
    className = '',
    striped = true,
  } = opts;

  const wrapper = createElement('div', { className: `table-wrapper ${className}`.trim() });

  if (data.length === 0) {
    wrapper.appendChild(createElement('div', {
      className: 'empty-state',
      style: { padding: 'var(--space-8)' },
    },
      createElement('div', { className: 'empty-state-icon' }, '📭'),
      createElement('div', { className: 'empty-state-description' }, emptyMessage),
    ));
    return wrapper;
  }

  const table = createElement('table', { className: `data-table${striped ? ' striped' : ''}` });

  // Header
  const thead = createElement('thead');
  const headerRow = createElement('tr');
  columns.forEach(col => {
    const thAttrs = { className: col.className || '' };
    if (sortable) thAttrs.className += ' sortable';
    const th = createElement('th', thAttrs, col.label);

    if (sortable) {
      th.addEventListener('click', () => {
        const currentSort = th.dataset.sort || 'none';
        thead.querySelectorAll('th').forEach(h => {
          h.classList.remove('sort-asc', 'sort-desc');
          h.dataset.sort = 'none';
        });
        if (currentSort === 'asc') {
          th.classList.add('sort-desc');
          th.dataset.sort = 'desc';
        } else {
          th.classList.add('sort-asc');
          th.dataset.sort = 'asc';
        }
      });
    }

    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = createElement('tbody');
  data.forEach(row => {
    const tr = createElement('tr');
    columns.forEach(col => {
      const tdAttrs = { className: col.mono ? 'mono' : '' };
      let cellContent;

      if (col.render && typeof col.render === 'function') {
        const rendered = col.render(row[col.key], row);
        if (rendered instanceof HTMLElement) {
          const td = createElement('td', tdAttrs);
          td.appendChild(rendered);
          tr.appendChild(td);
          return;
        }
        cellContent = String(rendered ?? '');
      } else {
        cellContent = row[col.key] != null ? String(row[col.key]) : '';
      }

      tr.appendChild(createElement('td', tdAttrs, cellContent));
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrapper.appendChild(table);

  return wrapper;
}

/* ================================================================== */
/*  l. Score Bar                                                       */
/* ================================================================== */

/**
 * @param {number} score  — 0–100
 * @param {object} opts
 * @param {string} [opts.label]
 * @param {boolean} [opts.showValue=true]
 * @returns {HTMLDivElement}
 */
export function createScoreBar(score, opts = {}) {
  const { label, showValue = true } = opts;
  const clamped = Math.max(0, Math.min(100, score));

  let colorClass;
  if (clamped < 20) colorClass = 'score-very-weak';
  else if (clamped < 40) colorClass = 'score-weak';
  else if (clamped < 60) colorClass = 'score-moderate';
  else if (clamped < 80) colorClass = 'score-strong';
  else colorClass = 'score-very-strong';

  const wrapper = createElement('div', { className: 'score-bar-wrapper' });

  if (label || showValue) {
    const labelRow = createElement('div', { className: 'score-label' });
    if (label) labelRow.appendChild(createElement('span', {}, label));
    if (showValue) {
      labelRow.appendChild(createElement('span', { className: 'score-label-value' }, String(Math.round(clamped))));
    }
    wrapper.appendChild(labelRow);
  }

  const bar = createElement('div', { className: 'score-bar' });
  const fill = createElement('div', {
    className: `score-bar-fill ${colorClass}`,
    style: { width: `${clamped}%` },
  });
  bar.appendChild(fill);
  wrapper.appendChild(bar);

  return wrapper;
}

/* ================================================================== */
/*  m. Signal Card                                                     */
/* ================================================================== */

/**
 * @param {object} signal
 * @param {string} signal.symbol
 * @param {'long'|'short'} signal.direction
 * @param {number} signal.score
 * @param {number} signal.confidence
 * @param {string} signal.timeframe
 * @param {string} signal.strategy
 * @param {Array<{label:string, score:number}>} [signal.breakdown]
 * @param {number} [signal.entry]
 * @param {number} [signal.tp]
 * @param {number} [signal.sl]
 * @returns {HTMLDivElement}
 */
export function createSignalCard(signal) {
  const {
    symbol = '—',
    direction = 'long',
    score = 50,
    confidence = 50,
    timeframe = '',
    strategy = '',
    breakdown = [],
    entry,
    tp,
    sl,
  } = signal;

  const card = createElement('div', { className: 'signal-card' });

  // Direction header
  const dirRow = createElement('div', { className: 'signal-direction' });
  const arrow = createElement('span', {
    className: `signal-direction-arrow ${direction}`,
  }, direction === 'long' ? '▲' : '▼');
  const dirLabel = createElement('span', {
    className: `signal-direction-label ${direction}`,
  }, direction.toUpperCase());
  const symbolEl = createElement('span', {
    className: 'card-header-title',
    style: { marginLeft: 'auto', fontSize: 'var(--text-sm)' },
  }, symbol);
  dirRow.append(arrow, dirLabel, symbolEl);
  card.appendChild(dirRow);

  // Meta
  const meta = createElement('div', { className: 'signal-meta' });
  const metaItems = [
    { label: 'TF', value: timeframe },
    { label: 'Strategy', value: strategy },
    { label: 'Score', value: `${score}/100` },
  ];
  metaItems.forEach(item => {
    if (!item.value) return;
    const mi = createElement('span', { className: 'signal-meta-item' });
    mi.appendChild(createElement('span', {}, `${item.label}: `));
    mi.appendChild(createElement('span', { className: 'signal-meta-value' }, item.value));
    meta.appendChild(mi);
  });
  card.appendChild(meta);

  // Price levels
  if (entry != null || tp != null || sl != null) {
    const levels = createElement('div', { className: 'signal-meta' });
    if (entry != null) levels.appendChild(createElement('span', { className: 'signal-meta-item' }, 'Entry: ', createElement('span', { className: 'signal-meta-value' }, String(entry))));
    if (tp != null) levels.appendChild(createElement('span', { className: 'signal-meta-item' }, 'TP: ', createElement('span', { className: 'signal-meta-value', style: { color: 'var(--success)' } }, String(tp))));
    if (sl != null) levels.appendChild(createElement('span', { className: 'signal-meta-item' }, 'SL: ', createElement('span', { className: 'signal-meta-value', style: { color: 'var(--danger)' } }, String(sl))));
    card.appendChild(levels);
  }

  // Score breakdown
  if (breakdown.length > 0) {
    const breakdownEl = createElement('div', { className: 'signal-score-breakdown' });
    breakdown.forEach(item => {
      const row = createElement('div', { className: 'signal-breakdown-row' });
      row.appendChild(createElement('span', { className: 'signal-breakdown-label' }, item.label));

      const bar = createElement('div', { className: 'signal-breakdown-bar' });
      const fill = createElement('div', {
        className: 'signal-breakdown-fill',
        style: {
          width: `${Math.max(0, Math.min(100, item.score))}%`,
          background: item.score >= 60 ? 'var(--success)' : item.score >= 30 ? 'var(--warning)' : 'var(--danger)',
        },
      });
      bar.appendChild(fill);
      row.appendChild(bar);

      row.appendChild(createElement('span', { className: 'signal-breakdown-value' }, String(item.score)));
      breakdownEl.appendChild(row);
    });
    card.appendChild(breakdownEl);
  }

  // Confidence meter
  const confRow = createElement('div', { className: 'signal-confidence' });
  confRow.appendChild(createElement('span', { className: 'signal-confidence-label' }, 'Confidence'));
  const confBar = createElement('div', { className: 'signal-confidence-meter' });
  const confFill = createElement('div', {
    className: 'signal-confidence-fill',
    style: { width: `${Math.max(0, Math.min(100, confidence))}%` },
  });
  confBar.appendChild(confFill);
  confRow.appendChild(confBar);
  confRow.appendChild(createElement('span', { className: 'signal-confidence-value' }, `${confidence}%`));
  card.appendChild(confRow);

  return card;
}

/* ================================================================== */
/*  n. Loading Spinner                                                 */
/* ================================================================== */

/**
 * Simple loading spinner (alias for createLoadingSpinner).
 * @param {object} [opts]
 * @returns {HTMLDivElement}
 */
export function createLoading(opts = {}) {
  return createLoadingSpinner(opts);
}

/**
 * @param {object} opts
 * @param {'sm'|'md'|'lg'} [opts.size='md']
 * @param {string} [opts.label]
 * @param {boolean} [opts.centered=false]
 * @returns {HTMLDivElement}
 */
export function createLoadingSpinner(opts = {}) {
  const { size = 'md', label, centered = true } = opts;

  const sizeClass = size !== 'md' ? `spinner-${size}` : '';
  const spinner = createElement('div', { className: `spinner ${sizeClass}`.trim() });

  const wrapper = createElement('div', { className: centered ? 'spinner-wrapper' : '' });
  wrapper.appendChild(spinner);

  if (label) {
    const labelEl = createElement('div', {
      className: 'loading-overlay-text',
      style: { marginTop: 'var(--space-2)' },
    }, label);
    wrapper.appendChild(labelEl);
  }

  return wrapper;
}

/* ================================================================== */
/*  o. Empty State                                                     */
/* ================================================================== */

/**
 * @param {object} opts
 * @param {string} [opts.icon='📭']
 * @param {string} [opts.title]
 * @param {string} [opts.description]
 * @param {string} [opts.actionLabel]
 * @param {function} [opts.onAction]
 * @returns {HTMLDivElement}
 */
export function createEmptyState(opts = {}) {
  const {
    icon = '📭',
    title = 'No data',
    description = '',
    actionLabel,
    onAction,
  } = opts;

  const wrapper = createElement('div', { className: 'empty-state' });
  wrapper.appendChild(createElement('div', { className: 'empty-state-icon' }, icon));
  wrapper.appendChild(createElement('div', { className: 'empty-state-title' }, title));

  if (description) {
    wrapper.appendChild(createElement('div', { className: 'empty-state-description' }, description));
  }

  if (actionLabel && onAction) {
    const action = createElement('div', { className: 'empty-state-action' });
    action.appendChild(createButton(actionLabel, { onClick: onAction }));
    wrapper.appendChild(action);
  }

  return wrapper;
}

/* ================================================================== */
/*  p. Demo Banner                                                     */
/* ================================================================== */

/**
 * @param {object} opts
 * @param {function} [opts.onDismiss]
 * @returns {HTMLDivElement}
 */
export function createDemoBanner(opts = {}) {
  const { onDismiss } = opts;

  const banner = createElement('div', { className: 'demo-banner' });
  banner.appendChild(createElement('span', { className: 'demo-banner-icon' }, '⚡'));
  banner.appendChild(createElement('span', { className: 'demo-banner-text' }, 'Demo Mode — Some features require API keys'));

  if (onDismiss) {
    const dismiss = createElement('button', {
      className: 'demo-banner-dismiss',
      onclick: () => {
        banner.style.display = 'none';
        onDismiss();
      },
    }, '×');
    banner.appendChild(dismiss);
  }

  return banner;
}

/* ================================================================== */
/*  q. Risk Warning                                                    */
/* ================================================================== */

/**
 * @param {string} text
 * @returns {HTMLDivElement}
 */
export function createRiskWarning(text) {
  const warning = createElement('div', { className: 'risk-warning' });
  warning.appendChild(createElement('span', { className: 'risk-warning-icon' }, '⚠️'));
  const textEl = createElement('div', { className: 'risk-warning-text' });
  textEl.innerHTML = text;
  warning.appendChild(textEl);
  return warning;
}

/* ================================================================== */
/*  r. Stat Card                                                       */
/* ================================================================== */

/**
 * @param {object} opts
 * @param {string} opts.label
 * @param {string|number} opts.value
 * @param {number} [opts.change]
 * @param {number} [opts.changePercent]
 * @param {string} [opts.icon]
 * @param {string} [opts.className]
 * @returns {HTMLDivElement}
 */
export function createStatCard(opts = {}) {
  const { label, value, change, changePercent, icon, className = '' } = opts;

  const card = createElement('div', { className: `stat-card ${className}`.trim() });

  const topRow = createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } });
  topRow.appendChild(createElement('div', { className: 'stat-card-label' }, label));
  if (icon) {
    topRow.appendChild(createElement('span', { style: { fontSize: 'var(--text-lg)', opacity: 0.5 } }, icon));
  }
  card.appendChild(topRow);

  card.appendChild(createElement('div', { className: 'stat-card-value' }, String(value ?? '—')));

  if (change != null || changePercent != null) {
    const isPositive = (change ?? 0) >= 0 && (changePercent ?? 0) >= 0;
    const changeEl = createElement('span', { className: `stat-card-change ${isPositive ? 'positive' : 'negative'}` });
    changeEl.appendChild(createElement('span', { className: 'stat-card-change-arrow' }, isPositive ? '↑' : '↓'));

    const parts = [];
    if (change != null) parts.push(String(change));
    if (changePercent != null) parts.push(`(${changePercent >= 0 ? '+' : ''}${changePercent}%)`);
    changeEl.appendChild(document.createTextNode(parts.join(' ')));
    card.appendChild(changeEl);
  }

  return card;
}

/* ================================================================== */
/*  s. Progress Bar                                                    */
/* ================================================================== */

/**
 * @param {number} value
 * @param {object} opts
 * @param {number} [opts.max=100]
 * @param {string} [opts.color] — CSS color
 * @param {'success'|'danger'|'warning'} [opts.variant] — semantic color
 * @param {boolean} [opts.showLabel=false]
 * @param {'sm'|'md'|'lg'} [opts.size='md']
 * @returns {HTMLDivElement}
 */
export function createProgressBar(value, opts = {}) {
  const { max = 100, color, variant, showLabel = false, size = 'md' } = opts;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  const wrapper = createElement('div');

  if (showLabel) {
    const labelRow = createElement('div', {
      className: 'score-label',
      style: { marginBottom: 'var(--space-1)' },
    });
    labelRow.appendChild(createElement('span', { className: 'score-label-value' }, `${Math.round(pct)}%`));
    wrapper.appendChild(labelRow);
  }

  const sizeClass = size !== 'md' ? `progress-bar-${size}` : '';
  const bar = createElement('div', { className: `progress-bar ${sizeClass}`.trim() });

  const fillClasses = ['progress-fill'];
  if (variant) fillClasses.push(`progress-${variant}`);

  const fillStyle = { width: `${pct}%` };
  if (color) fillStyle.background = color;

  const fill = createElement('div', {
    className: fillClasses.join(' '),
    style: fillStyle,
  });
  bar.appendChild(fill);
  wrapper.appendChild(bar);

  return wrapper;
}

/* ================================================================== */
/*  t. Accordion                                                       */
/* ================================================================== */

/**
 * @param {object} opts
 * @param {Array<{title:string, content:HTMLElement|string}>} opts.items
 * @returns {HTMLDivElement}
 */
export function createAccordion(opts = {}) {
  const { items = [] } = opts;

  const accordion = createElement('div', { className: 'accordion' });

  items.forEach((item, idx) => {
    const accordionItem = createElement('div', { className: 'accordion-item' });

    const header = createElement('button', {
      className: 'accordion-header',
      onclick: () => {
        const isOpen = accordionItem.classList.contains('open');
        // Close all siblings
        accordion.querySelectorAll('.accordion-item').forEach(ai => ai.classList.remove('open'));
        if (!isOpen) accordionItem.classList.add('open');
      },
    },
      createElement('span', {}, item.title),
      createElement('span', { className: 'accordion-chevron' }, '▼'),
    );

    accordionItem.appendChild(header);

    const body = createElement('div', { className: 'accordion-body' });
    const inner = createElement('div', { className: 'accordion-body-inner' });
    if (typeof item.content === 'string') {
      inner.innerHTML = item.content;
    } else if (item.content instanceof HTMLElement) {
      inner.appendChild(item.content);
    }
    body.appendChild(inner);
    accordionItem.appendChild(body);

    accordion.appendChild(accordionItem);
  });

  return accordion;
}

/* ================================================================== */
/*  Utility: Page Header                                               */
/* ================================================================== */

/**
 * @param {string} title
 * @param {object} opts
 * @param {string} [opts.subtitle]
 * @param {Array<HTMLElement>} [opts.actions]
 * @returns {HTMLDivElement}
 */
export function createPageHeader(title, opts = {}) {
  const { subtitle, actions = [] } = opts;

  const header = createElement('div', { className: 'page-header' });
  const left = createElement('div', { className: 'page-header-left' });
  left.appendChild(createElement('h1', { className: 'page-header-title' }, title));
  if (subtitle) {
    left.appendChild(createElement('p', { className: 'page-header-subtitle' }, subtitle));
  }
  header.appendChild(left);

  if (actions.length) {
    const actionsEl = createElement('div', { className: 'page-header-actions' }, ...actions);
    header.appendChild(actionsEl);
  }

  return header;
}

/* ================================================================== */
/*  Utility: Grid Helper                                               */
/* ================================================================== */

/**
 * @param {'2'|'3'|'4'} cols
 * @param {Array<HTMLElement>} children
 * @returns {HTMLDivElement}
 */
export function createGrid(cols, children = []) {
  return createElement('div', { className: `grid-${cols}` }, ...children);
}

/* ================================================================== */
/*  Utility: Fragment (returns a document fragment for efficient DOM ops) */
/* ================================================================== */

/**
 * @param {...(HTMLElement|string)} children
 * @returns {DocumentFragment}
 */
export function createFragment(...children) {
  const frag = document.createDocumentFragment();
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      frag.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof HTMLElement) {
      frag.appendChild(child);
    } else if (Array.isArray(child)) {
      child.forEach(c => {
        if (typeof c === 'string' || typeof c === 'number') {
          frag.appendChild(document.createTextNode(String(c)));
        } else if (c instanceof HTMLElement) {
          frag.appendChild(c);
        }
      });
    }
  }
  return frag;
}
