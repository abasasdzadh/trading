/**
 * BaseAIProvider — Abstract base class for all AI analysis providers.
 *
 * Subclasses must override the analyze() method.
 * Provides shared utilities: validateApiKey(), buildSystemPrompt().
 */

export class BaseAIProvider {
  /**
   * @param {{apiKey:string, model?:string, baseUrl?:string}} config
   */
  constructor(config = {}) {
    if (!config.apiKey) {
      throw new Error(
        `${this.constructor.name} requires an apiKey in config`
      );
    }
    this.apiKey = config.apiKey;
    this.model = config.model || null;
    this.baseUrl = config.baseUrl || null;
  }

  // ------------------------------------------------------------------
  // Abstract method
  // ------------------------------------------------------------------

  /**
   * Send a prompt (with optional context) to the AI and return the
   * analysis text.
   *
   * @param {string} prompt   - The user prompt / question
   * @param {string} [context] - Optional additional context (e.g. chart data summary)
   * @returns {Promise<string>} The AI-generated analysis text
   */
  async analyze(prompt, context) {
    throw new Error(
      `analyze() is not implemented in ${this.constructor.name}`
    );
  }

  // ------------------------------------------------------------------
  // Metadata getters
  // ------------------------------------------------------------------

  /** Human-readable provider name */
  getName() {
    return 'Base AI Provider';
  }

  /** Short description */
  getDescription() {
    return 'Base class for AI analysis providers';
  }

  // ------------------------------------------------------------------
  // Shared utilities
  // ------------------------------------------------------------------

  /**
   * Validate that the API key looks non-empty.
   * @returns {boolean}
   */
  validateApiKey() {
    return typeof this.apiKey === 'string' && this.apiKey.trim().length > 0;
  }

  /**
   * Build a default system prompt for trading analysis.
   * Subclasses may override or extend this.
   * @returns {string}
   */
  buildSystemPrompt() {
    return `You are an expert cryptocurrency trading analyst. Analyze the provided market data and give clear, actionable insights.

Guidelines:
- Provide a concise market summary (trend direction, strength, key levels).
- Identify any notable patterns, signals, or divergences.
- Discuss support and resistance levels.
- Assess risk factors and potential scenarios.
- Give a balanced view — consider both bullish and bearish cases.
- Do NOT provide financial advice or guarantee outcomes.
- Use markdown formatting for readability.
- Keep the response focused and actionable.
- If the data is insufficient, state what additional information would help.`;
  }

  /**
   * Helper — perform a fetch call with CORS-aware error handling.
   * @param {string}     url
   * @param {RequestInit} [init]
   * @returns {Promise<any>} Parsed JSON
   */
  async _fetchJson(url, init = {}) {
    let response;
    try {
      response = await fetch(url, init);
    } catch (err) {
      if (
        err instanceof TypeError &&
        err.message.toLowerCase().includes('failed to fetch')
      ) {
        throw new Error(
          `CORS or network error when connecting to ${this.getName()}. ` +
            `Ensure the server allows cross-origin requests from this origin.`
        );
      }
      throw err;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `${this.getName()} API error ${response.status}: ${text || response.statusText}`
      );
    }

    return response.json();
  }
}
