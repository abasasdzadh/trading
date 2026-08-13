/**
 * OpenAICompatibleProvider — connects to any OpenAI-compatible endpoint.
 *
 * Useful for self-hosted models (Ollama, LM Studio, vLLM, etc.)
 * or any service that implements the OpenAI chat/completions schema.
 *
 * Config options:
 *   apiKey  {string} — required (can be placeholder like 'no-key' for local)
 *   model   {string} — required (e.g. 'llama3', 'mistral')
 *   baseUrl {string} — required (e.g. 'http://localhost:11434/v1')
 */

import { BaseAIProvider } from './base.js';

export class OpenAICompatibleProvider extends BaseAIProvider {
  constructor(config = {}) {
    super(config);
    if (!config.baseUrl) {
      throw new Error('OpenAICompatibleProvider requires config.baseUrl');
    }
    this.model = config.model || 'default';
    this.baseUrl = config.baseUrl.replace(/\/+$/, ''); // strip trailing slash
  }

  getName() { return 'OpenAI-Compatible'; }
  getDescription() {
    return `OpenAI-compatible endpoint at ${this.baseUrl} (model: ${this.model})`;
  }

  // ----------------------------------------------------------------

  /**
   * POST /chat/completions  (OpenAI format)
   * Headers: Authorization: Bearer {apiKey} (or omit if apiKey is a placeholder)
   * Body: { model, messages, temperature: 0.7 }
   * Parse: choices[0].message.content
   */
  async analyze(prompt, context) {
    const systemPrompt = this.buildSystemPrompt();
    const userText = context ? `${context}\n\n${prompt}` : prompt;

    const url = `${this.baseUrl}/chat/completions`;

    const headers = {
      'Content-Type': 'application/json',
    };
    // Only send auth header if key looks real (not a placeholder)
    if (this.apiKey && !['no-key', 'none', 'null', 'undefined', ''].includes(this.apiKey.toLowerCase())) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

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
        `OpenAI-Compatible API error: ${data.error.message || JSON.stringify(data.error)}`
      );
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('OpenAI-Compatible endpoint returned an empty response.');
    }

    return text;
  }
}
