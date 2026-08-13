export default {
  render(ctx) {
    return `
      <div class="page-header">
        <div>
          <h1>About</h1>
          <p class="text-muted">AI Trading Analyzer - Client-Side Trading Decision Support</p>
        </div>
      </div>

      <div class="card" style="max-width:800px;margin:0 auto;">
        <div class="card-header">
          <h2>AI Trading Analyzer</h2>
          <span class="badge badge-info">v1.0.0</span>
        </div>
        <div class="card-body" style="line-height:1.8;">
          <p>A comprehensive, <strong>client-side only</strong> trading decision support system. All analysis runs in your browser — no backend, no data leaves your machine.</p>

          <h3 style="margin-top:1.5rem;color:#e2e8f0;">Features</h3>
          <ul style="padding-left:1.5rem;">
            <li><strong>22+ Technical Indicators</strong> — EMA, SMA, RSI, MACD, ATR, Bollinger Bands, Stochastic, CCI, ADX, VWAP, OBV, MFI, Ichimoku, Pivot Points, Fibonacci, Williams %R, SuperTrend, Keltner, Donchian, Parabolic SAR</li>
            <li><strong>7 Trading Strategies</strong> — EMA Trend, RSI Pullback, MACD Momentum, Breakout Retest, VWAP Volume, Market Structure, Bollinger Squeeze</li>
            <li><strong>Signal Engine</strong> — 0–100 composite scoring across 6 dimensions (Trend, Momentum, Volume, Structure, Price Action, Volatility)</li>
            <li><strong>Risk Management</strong> — ATR/Fixed/Swing/SR stop loss, multiple take profit levels, position sizing</li>
            <li><strong>Backtesting</strong> — Full backtest engine with 17+ metrics, equity curve, trade history</li>
            <li><strong>Paper Trading</strong> — Simulated trading with PnL tracking, trade journal</li>
            <li><strong>Market Scanner</strong> — Multi-symbol scanning with signal generation</li>
            <li><strong>AI Analysis</strong> — Optional integration with Gemini, OpenAI, OpenRouter, Anthropic</li>
            <li><strong>Market Data Providers</strong> — Binance, Bybit, OKX, CoinGecko, Custom endpoints</li>
            <li><strong>Demo Mode</strong> — Full functionality with realistic simulated data</li>
          </ul>

          <h3 style="margin-top:1.5rem;color:#e2e8f0;">Architecture</h3>
          <p>Built with pure HTML, CSS, and vanilla JavaScript. No frameworks, no build step, no Node.js required. Deploy directly to GitHub Pages by uploading files.</p>

          <h3 style="margin-top:1.5rem;color:#e2e8f0;">Privacy & Security</h3>
          <ul style="padding-left:1.5rem;">
            <li>All analysis runs client-side — your data never leaves your browser</li>
            <li>API keys stored in session storage only — never persisted or logged</li>
            <li>Export/import excludes API keys by default</li>
            <li>No tracking, no analytics, no external requests except market/AI APIs you configure</li>
          </ul>

          <h3 style="margin-top:1.5rem;color:#e2e8f0;">Technology</h3>
          <ul style="padding-left:1.5rem;">
            <li>Charts: <a href="https://github.com/nicehash/lightweight-charts" target="_blank" style="color:#3b82f6;">Lightweight Charts v5</a></li>
            <li>Storage: IndexedDB + localStorage</li>
            <li>Module System: ES Modules</li>
          </ul>
        </div>
      </div>

      <div class="risk-warning" style="max-width:800px;margin:1rem auto 0;">
        <strong>Risk Disclaimer:</strong> This tool is for educational and informational purposes only. It does not constitute financial advice. Trading involves substantial risk of loss. Past performance is not indicative of future results. Always do your own research and consult with a qualified financial advisor before making any trading decisions.
      </div>
    `;
  },

  init(ctx) {
    // No dynamic behavior needed for about page
  }
};
