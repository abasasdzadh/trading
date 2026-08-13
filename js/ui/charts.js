/**
 * TradingChart — Lightweight Charts v5 wrapper
 * Uses the global `LightweightCharts` from the CDN script tag:
 *   https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js
 */

/** @type {typeof import('lightweight-charts')} */
const LC = typeof LightweightCharts !== 'undefined'
  ? LightweightCharts
  : null;

if (!LC) {
  console.warn(
    '[TradingChart] LightweightCharts global not found. ' +
    'Include the CDN script before using TradingChart.\n' +
    'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js'
  );
}

/* ================================================================== */
/*  Dark Theme Colors                                                  */
/* ================================================================== */

const THEME = {
  layout: {
    background: { type: 'solid', color: '#0f1117' },
    textColor: '#9ca3af',
    fontSize: 12,
  },
  grid: {
    vertLines: { color: '#1a1d29' },
    horzLines: { color: '#1a1d29' },
  },
  crosshair: {
    vertLine: {
      color: '#3b82f6',
      width: 1,
      style: LC?.CrosshairMode?.Normal ? undefined : 2,
      labelBackgroundColor: '#2c3044',
    },
    horzLine: {
      color: '#3b82f6',
      width: 1,
      style: LC?.CrosshairMode?.Normal ? undefined : 2,
      labelBackgroundColor: '#2c3044',
    },
    mode: LC?.CrosshairMode?.Normal ?? 0,
  },
  rightPriceScale: {
    borderColor: '#2a2d3a',
    scaleMargins: { top: 0.1, bottom: 0.1 },
  },
  timeScale: {
    borderColor: '#2a2d3a',
    timeVisible: true,
    secondsVisible: false,
  },
};

const VOLUME_UP = 'rgba(34, 197, 94, 0.3)';
const VOLUME_DOWN = 'rgba(239, 68, 68, 0.3)';

/* ================================================================== */
/*  TradingChart class                                                 */
/* ================================================================== */

export class TradingChart {
  /**
   * @param {HTMLElement} container — the DOM element to mount the chart into
   * @param {object} [options]
   * @param {boolean} [options.autoResize=true]
   * @param {object}  [options.layout] — overrides for theme layout
   * @param {boolean} [options.withVolume=true] — auto-create volume series
   * @param {string}  [options.height] — CSS height string, e.g. '100%'
   */
  constructor(container, options = {}) {
    if (!LC) throw new Error('LightweightCharts is not loaded. Include the CDN script first.');

    this._container = container;
    this._options = {
      autoResize: true,
      withVolume: true,
      height: '100%',
      ...options,
    };

    this._chart = null;
    this._candleSeries = null;
    this._volumeSeries = null;
    this._lineSeries = []; // {series, id}
    this._markers = [];
    this._resizeObserver = null;
  }

  /* ---------------------------------------------------------------- */
  /*  Lifecycle                                                        */
  /* ---------------------------------------------------------------- */

  /**
   * Initialize the chart and attach to the container.
   * @param {object} [chartOptions] — additional LightweightCharts chart options
   */
  createChart(chartOptions = {}) {
    // Ensure container has dimensions
    this._container.style.height = this._options.height || '100%';
    this._container.style.width = '100%';
    this._container.classList.add('lw-chart-container');

    const mergedLayout = {
      ...THEME.layout,
      ...(this._options.layout || {}),
      ...(chartOptions.layout || {}),
    };

    const chartOpts = {
      layout: mergedLayout,
      grid: THEME.grid,
      crosshair: THEME.crosshair,
      rightPriceScale: THEME.rightPriceScale,
      timeScale: THEME.timeScale,
      handleScroll: { vertTouchDrag: false },
      ...chartOptions,
    };
    // Re-apply layout since spread may be overridden
    chartOpts.layout = mergedLayout;

    this._chart = LC.createChart(this._container, chartOpts);

    // Candlestick series
    this._candleSeries = this._chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // Volume series
    if (this._options.withVolume) {
      this._volumeSeries = this._chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    this._chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    }

    // Auto-resize with ResizeObserver
    if (this._options.autoResize) {
      this._setupResize();
    }

    return this;
  }

  /**
   * Set candlestick (OHLCV) data.
   * @param {Array<{time: number|string, open:number, high:number, low:number, close:number, volume?:number}>} candles
   */
  setCandles(candles) {
    if (!this._candleSeries) return;

    const ohlc = candles.map(c => ({
      time: this._toTime(c.time),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    this._candleSeries.setData(ohlc);

    // If volume series exists and candles have volume, set volume too
    if (this._volumeSeries && candles.length > 0 && candles[0].volume != null) {
      this.addVolumeSeries(candles);
    }

    return this;
  }

  /**
   * Add / update volume histogram series.
   * Alias: addVolume
   * @param {Array<{time:number|string, open:number, close:number, volume:number}>} candles
   */
  addVolumeSeries(candles) {
    this.addVolume(candles);
    return this;
  }

  /**
   * Add / update volume histogram series (green/red bars on 'volume' price scale).
   * @param {Array<{time:number|string, open:number, close:number, volume:number}>} candles
   */
  addVolume(candles) {
    if (!this._volumeSeries) {
      // Lazily create volume series if not yet created
      this._volumeSeries = this._chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      this._chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
      });
    }

    const volumeData = candles.map(c => ({
      time: this._toTime(c.time),
      value: c.volume,
      color: c.close >= c.open ? VOLUME_UP : VOLUME_DOWN,
    }));

    this._volumeSeries.setData(volumeData);
  }

  /**
   * Add a line series overlay (e.g., EMA, SMA, Bollinger bands).
   * @param {Array<{time:number|string, value:number}>} data
   * @param {object} opts
   * @param {string} [opts.color='#3b82f6']
   * @param {number} [opts.lineWidth=2]
   * @param {string} [opts.title]
   * @param {boolean} [opts.priceLineVisible=false]
   * @param {number} [opts.lineStyle]
   * @param {string} [opts.id] — identifier for later removal
   * @returns {object} the series instance
   */
  addLine(data, opts = {}) {
    if (!this._chart) return null;

    const {
      color = '#3b82f6',
      lineWidth = 2,
      title = '',
      lineStyle,
      id = `line-${Date.now()}`,
    } = opts;

    const series = this._chart.addLineSeries({
      color,
      lineWidth,
      title,
      ...(lineStyle != null ? { lineStyle } : {}),
      priceLineVisible: opts.priceLineVisible ?? false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    const formatted = data.map(d => ({
      time: this._toTime(d.time),
      value: d.value,
    }));

    series.setData(formatted);

    const entry = { series, id };
    this._lineSeries.push(entry);
    return entry;
  }

  /**
   * Add a line series overlay (alias for addLine).
   * @param {Array<{time:number|string, value:number}>} data
   * @param {object} opts
   * @returns {object} the series instance
   */
  addLineSeries(data, opts = {}) {
    return this.addLine(data, opts);
  }

  /**
   * Remove a line series by its id.
   * @param {string} id
   */
  removeLineSeries(id) {
    const idx = this._lineSeries.findIndex(e => e.id === id);
    if (idx === -1) return;
    const { series } = this._lineSeries[idx];
    this._chart.removeSeries(series);
    this._lineSeries.splice(idx, 1);
  }

  /**
   * Remove all line series overlays.
   */
  clearLineSeries() {
    for (const { series } of this._lineSeries) {
      try { this._chart.removeSeries(series); } catch (_) { /* already removed */ }
    }
    this._lineSeries = [];
  }

  /**
   * Set signal markers (buy/sell arrows) on the candlestick series.
   * Alias: addMarkers
   * @param {Array<{time:number|string, position:'aboveBar'|'belowBar', color:string, shape:'arrowUp'|'arrowDown'|'circle', text?:string}>} markers
   */
  setMarkers(markers) {
    this.addMarkers(markers);
    return this;
  }

  /**
   * Add signal markers (buy/sell arrows) to the candlestick series.
   * @param {Array<{time:number|string, position:'aboveBar'|'belowBar', color:string, shape:'arrowUp'|'arrowDown'|'circle', text?:string}>} markers
   */
  addMarkers(markers) {
    if (!this._candleSeries) return;

    this._markers = markers.map(m => ({
      time: this._toTime(m.time),
      position: m.position,
      color: m.color,
      shape: m.shape,
      text: m.text || '',
    }));

    // Sort by time to satisfy LightweightCharts requirement
    this._markers.sort((a, b) => {
      const ta = typeof a.time === 'string' ? a.time : String(a.time);
      const tb = typeof b.time === 'string' ? b.time : String(b.time);
      return ta < tb ? -1 : ta > tb ? 1 : 0;
    });

    this._candleSeries.setMarkers(this._markers);
    return this;
  }

  /**
   * Clear all markers.
   */
  clearMarkers() {
    if (this._candleSeries) {
      this._candleSeries.setMarkers([]);
    }
    this._markers = [];
  }

  /**
   * Set equity curve data (shortcut: creates or updates equity line).
   * @param {Array<{time:number|string, value:number}>} data
   * @param {object} [opts]
   * @param {string} [opts.color='#22c55e']
   * @param {string} [opts.title='Equity']
   */
  setEquityData(data, opts = {}) {
    // Remove existing equity curve if present
    const existIdx = this._lineSeries.findIndex(e => e.id === 'equity-curve');
    if (existIdx !== -1) {
      try { this._chart.removeSeries(this._lineSeries[existIdx].series); } catch (_) {}
      this._lineSeries.splice(existIdx, 1);
    }
    return this.addEquityCurve(data, opts);
  }

  /**
   * Add an equity curve line (used in backtest results).
   * Creates a fresh price scale for the equity axis.
   * @param {Array<{time:number|string, value:number}>} data
   * @param {object} [opts]
   * @param {string} [opts.color='#22c55e']
   * @param {string} [opts.title='Equity']
   */
  addEquityCurve(data, opts = {}) {
    if (!this._chart) return;

    const { color = '#22c55e', title = 'Equity' } = opts;

    // Create a dedicated price scale for equity
    const equityScaleId = 'equity';
    this._chart.priceScale(equityScaleId).applyOptions({
      scaleMargins: { top: 0.05, bottom: 0.05 },
      visible: true,
    });

    const series = this._chart.addLineSeries({
      color,
      lineWidth: 2,
      title,
      priceScaleId: equityScaleId,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    });

    const formatted = data.map(d => ({
      time: this._toTime(d.time),
      value: d.value,
    }));

    series.setData(formatted);

    const entry = { series, id: 'equity-curve' };
    this._lineSeries.push(entry);
    return entry;
  }

  /* ---------------------------------------------------------------- */
  /*  Time range & fit                                                 */
  /* ---------------------------------------------------------------- */

  /**
   * Set the visible time range.
   * @param {number|string} from — unix timestamp or YYYY-MM-DD
   * @param {number|string} to
   */
  setTimeRange(from, to) {
    if (!this._chart) return;
    this._chart.timeScale().setVisibleRange({
      from: this._toTime(from),
      to: this._toTime(to),
    });
    return this;
  }

  /**
   * Fit all data to the visible area.
   */
  fitContent() {
    if (!this._chart) return;
    this._chart.timeScale().fitContent();
    return this;
  }

  /* ---------------------------------------------------------------- */
  /*  Resize                                                           */
  /* ---------------------------------------------------------------- */

  /**
   * Manually trigger a chart resize (usually handled automatically).
   */
  resize() {
    if (this._chart) {
      this._chart.resize(
        this._container.clientWidth,
        this._container.clientHeight
      );
    }
    return this;
  }

  /**
   * Apply chart options after creation.
   * @param {object} opts — any LightweightCharts chart options
   */
  applyOptions(opts) {
    if (this._chart) {
      this._chart.applyOptions(opts);
    }
    return this;
  }

  /* ---------------------------------------------------------------- */
  /*  Teardown                                                         */
  /* ---------------------------------------------------------------- */

  /**
   * Destroy the chart and clean up observers.
   */
  destroy() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._chart) {
      this._chart.remove();
      this._chart = null;
    }
    this._candleSeries = null;
    this._volumeSeries = null;
    this._lineSeries = [];
    this._markers = [];
  }

  /* ---------------------------------------------------------------- */
  /*  Getters                                                          */
  /* ---------------------------------------------------------------- */

  /** @returns {import('lightweight-charts').IChartApi|null} */
  get chart() { return this._chart; }

  /** @returns {import('lightweight-charts').ISeriesApi<'Candlestick'>|null} */
  get candleSeries() { return this._candleSeries; }

  /** @returns {import('lightweight-charts').ISeriesApi<'Histogram'>|null} */
  get volumeSeries() { return this._volumeSeries; }

  /* ---------------------------------------------------------------- */
  /*  Internal                                                         */
  /* ---------------------------------------------------------------- */

  /**
   * Normalize time input to a value Lightweight Charts accepts.
   * @param {number|string} t — unix timestamp (seconds or ms) or 'YYYY-MM-DD'
   * @returns {number|string}
   */
  _toTime(t) {
    if (typeof t === 'string') {
      // Already a date string like '2024-01-15'
      return t;
    }
    // If > 1e12, it's in milliseconds → convert to seconds
    if (t > 1e12) {
      return Math.floor(t / 1000);
    }
    return t;
  }

  /**
   * Set up a ResizeObserver for automatic chart resizing.
   */
  _setupResize() {
    if (typeof ResizeObserver === 'undefined') return;

    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && this._chart) {
          this._chart.resize(width, height);
        }
      }
    });

    this._resizeObserver.observe(this._container);
  }
}

/* ================================================================== */
/*  Equity Chart — standalone factory                                   */
/* ================================================================== */

/**
 * Create a standalone equity line chart (no candlesticks).
 * Useful for backtest equity curves, P&L tracking, etc.
 *
 * @param {HTMLElement} containerEl
 * @param {object} [opts]
 * @param {string} [opts.color='#22c55e']
 * @param {string} [opts.title='Equity']
 * @param {string} [opts.height='100%']
 * @returns {TradingChart}
 */
export function createEquityChart(containerEl, opts = {}) {
  const { color = '#22c55e', title = 'Equity', height = '100%' } = opts;

  const chart = new TradingChart(containerEl, {
    withVolume: false,
    height,
  });

  chart.createChart({
    rightPriceScale: {
      borderColor: '#2a2d3a',
      scaleMargins: { top: 0.05, bottom: 0.05 },
    },
  });

  // Store options for later use
  chart._equityOpts = { color, title };

  return chart;
}

/* ================================================================== */
/*  Convenience factory                                                */
/* ================================================================== */

/**
 * Create a TradingChart instance attached to a container.
 * @param {HTMLElement|string} container — element or CSS selector
 * @param {object} [options]
 * @returns {TradingChart}
 */
export function createTradingChart(container, options = {}) {
  const el = typeof container === 'string'
    ? document.querySelector(container)
    : container;

  if (!el) throw new Error(`[createTradingChart] Container not found: ${container}`);

  const chart = new TradingChart(el, options);
  chart.createChart();
  return chart;
}
