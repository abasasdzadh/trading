/**
 * AnthropicProvider — Anthropic Messages API (Claude).
 *
 * Config options:
 *   apiKey  {string} — required
 *   model   {string} — default 'claude-sonnet-4-20250514'
 *   baseUrl {string} — default 'https://api.anthropic.com/v1'
 */

import { BaseAIProvider } from './base.js';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const ANTHROPIC_VERSION = '2023-06-01';

export class AnthropicProvider extends BaseAIProvider {
  constructor(config = {}) {
    super(config);
    this.model = config.model || DEFAULT_MODEL;
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
  }

  getName() { return 'Anthropic Claude'; }
  getDescription() { return `Anthropic Messages API (model: ${this.model})`; }

  // ----------------------------------------------------------------

  /**
   * POST /messages
   * Headers: x-api-key, anthropic-version, content-type
   * Body: { model, max_tokens: 4096, system, messages: [{ role:'user', content }] }
   * Parse: content[0].text
   */
  async analyze(prompt, context) {
    const systemPrompt = this.buildSystemPrompt();
    const userText = context ? `${context}\n\n${prompt}` : prompt;

    const url = `${this.baseUrl}/messages`;

    const body = {
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userText }],
    };

    const data = await this._fetchJson(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (data.error) {
      throw new Error(
        `Anthropic API error: ${data.error.message || JSON.stringify(data.error)}`
      );
    }

    const text = data?.content?.[0]?.text;
    if (!text) {
      throw new Error('Anthropic returned an empty response.');
    }

    return text;
  }
}
