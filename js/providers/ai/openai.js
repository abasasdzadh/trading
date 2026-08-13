/**
 * OpenAIProvider — OpenAI Chat Completions API.
 *
 * Config options:
 *   apiKey  {string} — required
 *   model   {string} — default 'gpt-4o-mini'
 *   baseUrl {string} — default 'https://api.openai.com/v1'
 */

import { BaseAIProvider } from './base.js';

const DEFAULT_MODEL = 'gpt-4o-mini';

export class OpenAIProvider extends BaseAIProvider {
  constructor(config = {}) {
    super(config);
    this.model = config.model || DEFAULT_MODEL;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  getName() { return 'OpenAI'; }
  getDescription() { return `OpenAI Chat Completions API (model: ${this.model})`; }

  // ----------------------------------------------------------------

  /**
   * POST /chat/completions
   * Headers: Authorization: Bearer {apiKey}
   * Body: { model, messages, temperature: 0.7 }
   * Parse: choices[0].message.content
   */
  async analyze(prompt, context) {
    const systemPrompt = this.buildSystemPrompt();
    const userText = context ? `${context}\n\n${prompt}` : prompt;

    const url = `${this.baseUrl}/chat/completions`;

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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (data.error) {
      throw new Error(
        `OpenAI API error: ${data.error.message || JSON.stringify(data.error)}`
      );
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('OpenAI returned an empty response.');
    }

    return text;
  }
}
