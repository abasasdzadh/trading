/**
 * GeminiProvider — Google Gemini (Generative Language) API.
 *
 * Uses the URL query param `?key=` for authentication.
 *
 * Config options:
 *   apiKey  {string} — required
 *   model   {string} — default 'gemini-2.0-flash'
 *   baseUrl {string} — default 'https://generativelanguage.googleapis.com/v1beta'
 */

import { BaseAIProvider } from './base.js';

const DEFAULT_MODEL = 'gemini-2.0-flash';

export class GeminiProvider extends BaseAIProvider {
  constructor(config = {}) {
    super(config);
    this.model = config.model || DEFAULT_MODEL;
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  }

  getName() { return 'Google Gemini'; }
  getDescription() { return `Google Gemini API (model: ${this.model})`; }

  // ----------------------------------------------------------------

  /**
   * POST /models/{model}:generateContent?key={apiKey}
   * Body:  { contents: [{ parts: [{ text }] }], systemInstruction: { parts: [{ text }] } }
   * Parse: response.candidates[0].content.parts[0].text
   */
  async analyze(prompt, context) {
    const systemPrompt = this.buildSystemPrompt();
    const userText = context ? `${context}\n\n${prompt}` : prompt;

    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      contents: [{ parts: [{ text: userText }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    const data = await this._fetchJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // Handle API-level errors
    if (data.error) {
      throw new Error(
        `Gemini API error: ${data.error.message || JSON.stringify(data.error)}`
      );
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error(
        'Gemini returned an empty response. The model may have refused or timed out.'
      );
    }

    return text;
  }
}
