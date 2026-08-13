/**
 * OpenRouterProvider — routes requests through OpenRouter.ai.
 *
 * Uses the same request/response format as OpenAI but adds
 * extra headers (HTTP-Referer, X-Title) and a different base URL.
 *
 * Config options:
 *   apiKey   {string} — required (OpenRouter API key)
 *   model    {string} — default 'google/gemini-2.0-flash-exp:free'
 *   baseUrl  {string} — default 'https://openrouter.ai/api/v1'
 *   referer  {string} — optional HTTP-Referer header value
 *   title    {string} — optional X-Title header value
 */

import { BaseAIProvider } from './base.js';

const DEFAULT_MODEL = 'google/gemini-2.0-flash-exp:free';

export class OpenRouterProvider extends BaseAIProvider {
  constructor(config = {}) {
    super(config);
    this.model = config.model || DEFAULT_MODEL;
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
    this.referer = config.referer || '';
    this.title = config.title || 'Trading Analyzer';
  }

  getName() { return 'OpenRouter'; }
  getDescription() { return `OpenRouter API (model: ${this.model})`; }

  // ----------------------------------------------------------------

  /**
   * POST /chat/completions  (same format as OpenAI)
   * Additional headers: HTTP-Referer, X-Title
   * Parse: choices[0].message.content
   */
  async analyze(prompt, context) {
    const systemPrompt = this.buildSystemPrompt();
    const userText = context ? `${context}\n\n${prompt}` : prompt;

    const url = `${this.baseUrl}/chat/completions`;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (this.referer) headers['HTTP-Referer'] = this.referer;
    if (this.title) headers['X-Title'] = this.title;

    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText },
      ],
      temperature: 0.7,
    };

    const data = await this._fetchJson(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (data.error) {
      throw new Error(
        `OpenRouter API error: ${data.error.message || JSON.stringify(data.error)}`
      );
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('OpenRouter returned an empty response.');
    }

    return text;
  }
}
