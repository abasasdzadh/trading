/**
 * SPA Router — Hash-based client-side routing
 * Routes: dashboard, chart, chart/:symbol, scanner, signals, backtest,
 *         paper-trading, settings, alerts, about, markets, strategies, journal
 */

export class Router {
  /**
   * @param {Array<{path: string, title: string, handler: function(RouteContext): (HTMLElement|string|void)}>} routes
   */
  constructor(routes = []) {
    this.routes = routes;
    this._listeners = [];
    this._currentRoute = null;
    this._notFoundHandler = null;
    this._beforeEachHooks = [];
    this._afterEachHooks = [];
  }

  /* ------------------------------------------------------------------ */
  /*  Configuration                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Set a custom 404 handler.
   * @param {function(RouteContext): (HTMLElement|string|void)} handler
   */
  setNotFound(handler) {
    this._notFoundHandler = handler;
    return this;
  }

  /**
   * Register a beforeEach guard. Return false to cancel navigation.
   * @param {function(from: RouteContext|null, to: RouteContext): boolean|void} hook
   */
  beforeEach(hook) {
    this._beforeEachHooks.push(hook);
    return this;
  }

  /**
   * Register an afterEach hook.
   * @param {function(RouteContext)} hook
   */
  afterEach(hook) {
    this._afterEachHooks.push(hook);
    return this;
  }

  /* ------------------------------------------------------------------ */
  /*  Route matching                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Match a hash path against registered routes.
   * Supports static paths and `:param` segments (e.g. chart/:symbol).
   * @param {string} path
   * @returns {{ route: object, params: object }|null}
   */
  _match(path) {
    for (const route of this.routes) {
      const params = this._matchRoute(route.path, path);
      if (params !== null) {
        return { route, params };
      }
    }
    return null;
  }

  /**
   * Test a single route pattern against a path.
   * @param {string} pattern — e.g. "chart/:symbol"
   * @param {string} path   — e.g. "chart/BTCUSDT"
   * @returns {object|null} extracted params, or null if no match
   */
  _matchRoute(pattern, path) {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);

    if (patternParts.length !== pathParts.length) return null;

    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        const paramName = patternParts[i].slice(1);
        params[paramName] = decodeURIComponent(pathParts[i]);
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }
    return params;
  }

  /* ------------------------------------------------------------------ */
  /*  Navigation                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Navigate to a route path.
   * @param {string} path — e.g. "chart/BTCUSDT" (without leading #/)
   */
  navigate(path) {
    // Strip leading # or / if present
    const cleaned = path.replace(/^#?\/?/, '');
    window.location.hash = `#/${cleaned}`;
  }

  /**
   * Replace the current hash without pushing history.
   * @param {string} path
   */
  replace(path) {
    const cleaned = path.replace(/^(#/?|/)/, '');
    const url = new URL(window.location);
    url.hash = `#/${cleaned}`;
    window.history.replaceState(null, '', url);
    this._resolve(cleaned);
  }

  /**
   * Go back in browser history.
   */
  back() {
    window.history.back();
  }

  /* ------------------------------------------------------------------ */
  /*  Resolving / rendering                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Resolve a path to a matched route and render it.
   * @param {string} path
   */
  _resolve(path) {
    const previousRoute = this._currentRoute;
    const match = this._match(path);

    let ctx;

    if (match) {
      ctx = {
        path,
        fullPath: `#/${path}`,
        route: match.route,
        params: match.params,
        query: this._parseQuery(),
      };
    } else {
      ctx = {
        path,
        fullPath: `#/${path}`,
        route: { path: '__404__', title: 'Not Found', handler: this._notFoundHandler },
        params: {},
        query: this._parseQuery(),
      };
    }

    // Run beforeEach guards
    for (const hook of this._beforeEachHooks) {
      const result = hook(previousRoute, ctx);
      if (result === false) return;
    }

    this._currentRoute = ctx;

    // Render into #app-content
    const container = document.getElementById('app-content');
    if (container) {
      container.innerHTML = '';

      const handler = ctx.route.handler;
      if (typeof handler === 'function') {
        const result = handler(ctx);
        if (result instanceof HTMLElement) {
          container.appendChild(result);
        } else if (typeof result === 'string') {
          container.innerHTML = result;
        }
        // void return → page manages its own rendering
      } else if (ctx.route.path === '__404__') {
        // Default 404 content
        container.innerHTML = this._default404(path);
      }
    }

    // Update document title
    const title = ctx.route.title || 'Trading Analyzer';
    document.title = `${title} — Trading Analyzer`;

    // Update active sidebar item
    this._updateActiveSidebar(ctx.path);

    // Notify listeners
    this._fireRouteChange(ctx);

    // Run afterEach hooks
    for (const hook of this._afterEachHooks) {
      hook(ctx);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Start listening to hash changes and render the initial route.
   */
  start() {
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1); // remove #
      const path = hash.replace(/^\//, '');
      this._resolve(path);
    });

    // Render initial route
    const hash = window.location.hash.slice(1);
    const path = hash.replace(/^\//, '') || 'dashboard';
    if (!hash) {
      this.navigate('dashboard');
    } else {
      this._resolve(path);
    }
  }

  /**
   * Stop listening to hash changes.
   */
  stop() {
    window.removeEventListener('hashchange', this._boundHandler);
  }

  /**
   * Get the current route context.
   * @returns {RouteContext|null}
   */
  getCurrentRoute() {
    return this._currentRoute;
  }

  /**
   * Register a callback for route changes (e.g. analytics, title updates).
   * @param {function(RouteContext)} callback
   */
  onRouteChange(callback) {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter(cb => cb !== callback);
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Internal helpers                                                  */
  /* ------------------------------------------------------------------ */

  _fireRouteChange(ctx) {
    for (const cb of this._listeners) {
      try { cb(ctx); } catch (e) { console.error('[Router] listener error:', e); }
    }
  }

  _parseQuery() {
    const q = window.location.hash.split('?')[1] || '';
    const params = new URLSearchParams(q);
    const obj = {};
    for (const [k, v] of params) obj[k] = v;
    return obj;
  }

  _updateActiveSidebar(path) {
    // Deactivate all sidebar items
    document.querySelectorAll('.sidebar-item.active').forEach(el => {
      el.classList.remove('active');
    });

    // Normalize path for matching (strip params after /)
    const basePath = path.split('/')[0];

    // Find matching sidebar item by data-route
    const match = document.querySelector(`.sidebar-item[data-route="${basePath}"]`);
    if (match) {
      match.classList.add('active');
    }
  }

  _default404(path) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">Page Not Found</div>
        <div class="empty-state-description">
          The route <code style="color:var(--accent);font-family:var(--font-mono);">#/${this._escapeHtml(path)}</code> does not exist.
        </div>
        <div class="empty-state-action">
          <button class="btn btn-primary" onclick="window.location.hash='#/dashboard'">
            Go to Dashboard
          </button>
        </div>
      </div>
    `;
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

/**
 * @typedef {object} RouteContext
 * @property {string}   path      — path without hash (e.g. "chart/BTCUSDT")
 * @property {string}   fullPath  — full hash (e.g. "#/chart/BTCUSDT")
 * @property {object}   route     — matched route definition {path, title, handler}
 * @property {object}   params    — extracted route params (e.g. {symbol: "BTCUSDT"})
 * @property {object}   query     — query string params as object
 */

/**
 * Pre-configured route definitions for the trading analyzer.
 * Each route's `handler` should be set later when pages are registered.
 */
export const ROUTE_DEFINITIONS = [
  { path: 'dashboard',      title: 'Dashboard',     handler: null },
  { path: 'chart',           title: 'Chart',         handler: null },
  { path: 'chart/:symbol',   title: 'Chart',         handler: null },
  { path: 'scanner',         title: 'Scanner',       handler: null },
  { path: 'signals',         title: 'Signals',       handler: null },
  { path: 'backtest',        title: 'Backtest',      handler: null },
  { path: 'paper-trading',   title: 'Paper Trading', handler: null },
  { path: 'settings',        title: 'Settings',      handler: null },
  { path: 'alerts',          title: 'Alerts',        handler: null },
  { path: 'about',           title: 'About',         handler: null },
  { path: 'markets',         title: 'Markets',       handler: null },
  { path: 'strategies',      title: 'Strategies',    handler: null },
  { path: 'journal',         title: 'Journal',       handler: null },
];

/**
 * Create a router pre-loaded with the standard trading analyzer routes.
 * Page handlers should be registered before calling `start()`.
 *
 * @example
 *   import { createRouter } from './js/ui/router.js';
 *   import { dashboardPage } from './pages/dashboard.js';
 *
 *   const router = createRouter();
 *   router.routes.find(r => r.path === 'dashboard').handler = dashboardPage;
 *   router.start();
 */
export function createRouter() {
  const routes = ROUTE_DEFINITIONS.map(r => ({ ...r }));
  return new Router(routes);
}
