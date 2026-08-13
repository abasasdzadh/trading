/**
 * AI provider factory & registry.
 *
 * Usage:
 *   import { createAIProvider, getAvailableAIProviders } from './index.js';
 *   const provider = createAIProvider('openai', { apiKey: 'sk-...', model: 'gpt-4o-mini' });
 */

import { GeminiProvider } from './gemini.js';
import { OpenAIProvider } from './openai.js';
import { OpenRouterProvider } from './openrouter.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAICompatibleProvider } from './compatible.js';

/** Provider registry — maps type key → { ctor, name, description } */
const AI_PROVIDERS = {
  gemini: {
    ctor: GeminiProvider,
    name: 'Google Gemini',
    description: 'Google Gemini API (generativelanguage.googleapis.com)',
  },
  openai: {
    ctor: OpenAIProvider,
    name: 'OpenAI',
    description: 'OpenAI Chat Completions API (api.openai.com)',
  },
  openrouter: {
    ctor: OpenRouterProvider,
    name: 'OpenRouter',
    description: 'OpenRouter — route to many models via one API',
  },
  anthropic: {
    ctor: AnthropicProvider,
    name: 'Anthropic Claude',
    description: 'Anthropic Messages API (api.anthropic.com)',
  },
  compatible: {
    ctor: OpenAICompatibleProvider,
    name: 'OpenAI-Compatible',
    description: 'Any OpenAI-compatible endpoint (Ollama, LM Studio, vLLM, etc.)',
  },
};

/**
 * Create an AI provider instance by type.
 * @param {string} type   - Provider type key (e.g. 'openai')
 * @param {object} config - Provider-specific configuration
 * @returns {import('./base.js').BaseAIProvider}
 */
export function createAIProvider(type, config = {}) {
  const entry = AI_PROVIDERS[type];
  if (!entry) {
    const available = Object.keys(AI_PROVIDERS).join(', ');
    throw new Error(
      `Unknown AI provider type: "${type}". Available: ${available}`
    );
  }
  return new entry.ctor(config);
}

/**
 * List all registered AI providers.
 * @returns {Array<{type:string, name:string, description:string}>}
 */
export function getAvailableAIProviders() {
  return Object.entries(AI_PROVIDERS).map(([type, { name, description }]) => ({
    type,
    name,
    description,
  }));
}
