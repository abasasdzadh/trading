/**
 * AI Trading Analyzer - Main Application Entry Point
 * Pure vanilla JS - No frameworks, no build step
 */

import { EventBus, eventBus } from './core/event-bus.js';
import { StorageService } from './core/storage.js';
import { ApiClient, createDefault as createDefaultClient } from './core/api-client.js';
import { generateDemoCandles, generateDemoSignals, generateDemoTrades, generateDemoWatchlist } from './core/demo-data.js';
import { APP_CONFIG } from './config/app-config.js';
import { DEFAULT_INDICATOR_CONFIGS } from './config/indicator-config.js';
import { DEFAULT_STRATEGY_CONFIGS } from './config/strategy-config.js';
import { SIGNAL_CONFIG } from './config/signal-config.js';
import { RISK_CONFIG } from './config/risk-config.js';
import { computeAllIndicators } from './indicators/index.js';
import { generateSignal } from './signals/signal-engine.js';
import { calculatePositionSize, calculateStopLoss, calculateTakeProfits } from './signals/risk-engine.js';
import { createMarketProvider, getAvailableProviders } from './providers/market/index.js';
import { createAIProvider, getAvailableAIProviders } from './providers/ai/index.js';
import { BacktestEngine } from './backtest/engine.js';
import { ScannerEngine } from './scanner/engine.js';
import { PaperTradingEngine } from './paper-trading/engine.js';
import { TradeJournal } from './paper-trading/journal.js';
import { AlertsEngine } from './alerts/engine.js';
import { Router, ROUTE_DEFINITIONS } from './ui/router.js';
import * as Pages from './ui/pages/index.js';

// Import page modules
import dashboardPage from './ui/pages/dashboard.js';
import chartPage from './ui/pages/chart.js';
import scannerPage from './ui/pages/scanner.js';
import signalsPage from './ui/pages/signals.js';
import backtestPage from './ui/pages/backtest.js';
import paperTradingPage from './ui/pages/paper-trading.js';
import settingsPage from './ui/pages/settings.js';
import alertsPage from './ui/pages/alerts.js';
import aboutPage from './ui/pages/about.js';
import marketsPage from './ui/pages/markets.js';
import strategiesPage from './ui/pages/strategies.js';
import journalPage from './ui/pages/journal.js';

const PAGE_MODULES = {
  dashboard: dashboardPage,
  chart: chartPage,
  scanner: scannerPage,
  signals: signalsPage,
  backtest: backtestPage,
  'paper-trading': paperTradingPage,
  settings: settingsPage,
  alerts: alertsPage,
  about: aboutPage,
  markets: marketsPage,
  strategies: strategiesPage,
  journal: journalPage
};

class App {
  constructor() {
    this.eventBus = eventBus;
    this.storage = new StorageService();
    this.apiClient = createDefaultClient();
    this.demoMode = true;
    this.marketProvider = null;
    this.aiProvider = null;
    this.paperTrading = null;
    this.journal = null;
    this.alertsEngine = null;
    this.backtestEngine = null;
    this.scannerEngine = null;
    this.router = null;
    this.currentPage = null;
    this.candlesCache = {};
    this.indicatorConfigs = {};
    this.strategyConfigs = {};
    this.settings = {};
  }

  async init() {
    try {
      // Initialize storage
      await this.storage.init();

      // Load settings
      this.settings = await this.storage.getSetting('general', {
        theme: 'dark',
        language: 'en',
        demoMode: true,
        defaultSymbol: 'BTCUSDT',
        defaultTimeframe: '1h',
        autoRefresh: false,
        refreshInterval: 60
      });
      this.demoMode = this.settings.demoMode !== false;

      // Load indicator/strategy configs
      this.indicatorConfigs = await this.storage.getSetting('indicators', DEFAULT_INDICATOR_CONFIGS);
      this.strategyConfigs = await this.storage.getSetting('strategies', DEFAULT_STRATEGY_CONFIGS);

      // Initialize engines
      this.paperTrading = new PaperTradingEngine(this.storage);
      this.journal = new TradeJournal(this.storage);
      this.alertsEngine = new AlertsEngine(this.storage, this.eventBus);
      this.backtestEngine = new BacktestEngine({
        initialCapital: 10000,
        commission: 0.1,
        slippage: 0.05
      });
      this.scannerEngine = new ScannerEngine({ maxConcurrent: 5 });

      // Try to initialize providers from stored credentials
      await this._initProviders();

      // Create router
      this._initRouter();

      // Setup sidebar
      this._setupSidebar();

      // Setup mobile menu
      this._setupMobileMenu();

      // Show demo banner if in demo mode
      if (this.demoMode) {
        this._showDemoBanner();
      }

      // Start router
      this.router.start();

      this.eventBus.emit('app:ready');
      console.log('AI Trading Analyzer initialized');
    } catch (err) {
      console.error('Failed to initialize app:', err);
      const content = document.getElementById('app-content');
      if (content) {
        content.innerHTML = `<div class="empty-state"><h2>Initialization Error</h2><p>${err.message}</p><button class="btn btn-primary" onclick="location.reload()">Reload</button></div>`;
      }
    }
  }

  async _initProviders() {
    // Market provider
    const marketCreds = JSON.parse(sessionStorage.getItem('ta_market_credentials') || '{}');
    if (marketCreds.type && marketCreds.type !== 'none') {
      try {
        this.marketProvider = createMarketProvider(marketCreds.type, marketCreds);
      } catch (e) {
        console.warn('Failed to init market provider:', e);
      }
    }

    // AI provider
    const aiCreds = JSON.parse(sessionStorage.getItem('ta_ai_credentials') || '{}');
    if (aiCreds.apiKey) {
      try {
        this.aiProvider = createAIProvider(aiCreds.type || 'gemini', aiCreds);
      } catch (e) {
        console.warn('Failed to init AI provider:', e);
      }
    }
  }

  _initRouter() {
    const routes = ROUTE_DEFINITIONS.map(r => ({
      ...r,
      handler: (ctx) => this._handleRoute(ctx)
    }));

    this.router = new Router(routes);
    this.router.setNotFound(() => {
      const content = document.getElementById('app-content');
      if (content) {
        content.innerHTML = '<div class="empty-state"><h2>Page Not Found</h2><p>The page you are looking for does not exist.</p></div>';
      }
    });
  }

  _handleRoute(ctx) {
    // Destroy current page
    if (this.currentPage && this.currentPage.destroy) {
      this.currentPage.destroy(this._getContext());
    }

    // Determine page module
    let pageName = ctx.route.path;
    if (ctx.route.path === 'chart/:symbol') {
      pageName = 'chart';
    }

    const pageModule = PAGE_MODULES[pageName];
    if (!pageModule) {
      const content = document.getElementById('app-content');
      if (content) {
        content.innerHTML = '<div class="empty-state"><h2>Page Not Found</h2></div>';
      }
      return;
    }

    this.currentPage = pageModule;
    const appCtx = this._getContext(ctx);

    // Render page
    const content = document.getElementById('app-content');
    if (content) {
      const html = pageModule.render(appCtx);
      if (typeof html === 'string') {
        content.innerHTML = html;
      } else {
        content.innerHTML = '';
        content.appendChild(html);
      }

      // Initialize page interactivity
      if (pageModule.init) {
        requestAnimationFrame(() => pageModule.init(appCtx));
      }
    }

    // Update sidebar active state
    document.querySelectorAll('.sidebar .nav-item').forEach(item => {
      item.classList.remove('active');
      const navPath = item.getAttribute('data-route');
      if (navPath && ctx.fullPath.startsWith(navPath)) {
        item.classList.add('active');
      }
    });

    // Close mobile drawer
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('drawer-overlay')?.classList.remove('active');
  }

  _getContext(routeCtx) {
    return {
      app: this,
      storage: this.storage,
      eventBus: this.eventBus,
      apiClient: this.apiClient,
      marketProvider: this.marketProvider,
      aiProvider: this.aiProvider,
      paperTrading: this.paperTrading,
      journal: this.journal,
      alertsEngine: this.alertsEngine,
      backtestEngine: this.backtestEngine,
      scannerEngine: this.scannerEngine,
      demoMode: this.demoMode,
      settings: this.settings,
      indicatorConfigs: this.indicatorConfigs,
      strategyConfigs: this.strategyConfigs,
      candlesCache: this.candlesCache,
      params: routeCtx?.params || {},
      route: routeCtx?.route,
      fullPath: routeCtx?.fullPath || ''
    };
  }

  _setupSidebar() {
    const navItems = document.querySelectorAll('.sidebar .nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const route = item.getAttribute('data-route');
        if (route) {
          this.router.navigate(route);
        }
      });
    });
  }

  _setupMobileMenu() {
    const hamburger = document.getElementById('hamburger-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('drawer-overlay');

    if (hamburger) {
      hamburger.addEventListener('click', () => {
        sidebar?.classList.toggle('open');
        overlay?.classList.toggle('active');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar?.classList.remove('open');
        overlay.classList.remove('active');
      });
    }
  }

  _showDemoBanner() {
    const container = document.getElementById('demo-banner-container');
    if (!container) return;
    container.innerHTML = `
      <div class="demo-banner" id="demo-banner">
        <span>Demo Mode - Using simulated data. Configure API keys in Settings for live data.</span>
        <button class="btn btn-ghost btn-sm" id="dismiss-demo">&times;</button>
      </div>
    `;
    document.getElementById('dismiss-demo')?.addEventListener('click', () => {
      container.innerHTML = '';
    });
  }

  // ---- Public API for pages to use ----

  async getCandles(symbol, timeframe, limit = 500) {
    const cacheKey = `${symbol}_${timeframe}`;
    if (this.candlesCache[cacheKey] && this.candlesCache[cacheKey].length >= limit) {
      return this.candlesCache[cacheKey];
    }

    if (this.marketProvider && !this.demoMode) {
      try {
        const candles = await this.marketProvider.fetchCandles(symbol, timeframe, limit);
        this.candlesCache[cacheKey] = candles;
        return candles;
      } catch (err) {
        console.warn(`Failed to fetch candles for ${symbol}:`, err);
        // Fall through to demo
      }
    }

    // Demo data
    const demoCandles = generateDemoCandles(symbol, timeframe, limit);
    this.candlesCache[cacheKey] = demoCandles;
    return demoCandles;
  }

  computeIndicators(candles, customConfigs) {
    const configs = { ...this.indicatorConfigs, ...customConfigs };
    return computeAllIndicators(candles, configs);
  }

  generateSignal(candles, indicators) {
    return generateSignal(candles, indicators, {}, SIGNAL_CONFIG);
  }

  async analyzeWithAI(symbol, candles, signal) {
    if (!this.aiProvider) {
      return 'AI provider not configured. Go to Settings > Providers to set up an AI provider.';
    }
    try {
      const lastCandle = candles[candles.length - 1];
      const prompt = `Analyze ${symbol} for trading. Current price: ${lastCandle?.close}. Signal: ${signal?.direction || 'none'}, Score: ${signal?.score || 0}/100. Reasoning: ${signal?.reasoning || 'N/A'}. Provide concise trading analysis with key levels and recommendation.`;
      return await this.aiProvider.analyze(prompt, { candles, signal });
    } catch (err) {
      return `AI analysis failed: ${err.message}`;
    }
  }

  setMarketProvider(type, config) {
    this.marketProvider = createMarketProvider(type, config);
    sessionStorage.setItem('ta_market_credentials', JSON.stringify({ type, ...config }));
    this.eventBus.emit('provider:changed', { type: 'market', provider: type });
  }

  setAIProvider(type, config) {
    this.aiProvider = createAIProvider(type, config);
    sessionStorage.setItem('ta_ai_credentials', JSON.stringify({ type, ...config }));
    this.eventBus.emit('provider:changed', { type: 'ai', provider: type });
  }

  updateSetting(key, value) {
    this.settings = { ...this.settings, [key]: value };
    this.storage.setSetting('general', this.settings);
    this.eventBus.emit('settings:changed', { key, value });
  }
}

// Boot
const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());

export { app };
