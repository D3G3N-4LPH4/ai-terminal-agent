// AI Fallback Orchestrator
// Automatically tries multiple AI providers in priority order

import { OpenRouterAPI } from './OpenRouterAPI.js';
import { AnthropicAPI } from './AnthropicAPI.js';
import { GroqAPI } from './GroqAPI.js';
import { GeminiAPI } from './GeminiAPI.js';

export class AIFallbackOrchestrator {
  constructor(config) {
    this.providers = [];
    this.lastUsedProvider = null;
    this.providerStats = {
      openrouter: { successes: 0, failures: 0 },
      anthropic: { successes: 0, failures: 0 },
      groq: { successes: 0, failures: 0 },
      gemini: { successes: 0, failures: 0 },
    };

    // Initialize providers based on available API keys
    this.initializeProviders(config);
  }

  initializeProviders(config) {
    // Priority 1: OpenRouter (primary)
    if (config.openRouter?.apiKey) {
      this.providers.push({
        name: 'openrouter',
        api: new OpenRouterAPI(
          config.openRouter.apiKey,
          config.openRouter.baseUrl,
          config.openRouter.defaultModel
        ),
        tier: 'primary',
        free: false,
      });
    }

    // Priority 2: Anthropic Direct (best quality fallback)
    if (config.anthropic?.apiKey) {
      this.providers.push({
        name: 'anthropic',
        api: new AnthropicAPI(config.anthropic.apiKey, config.anthropic.model),
        tier: 'premium',
        free: false,
      });
    }

    // Priority 3: Groq (fast & free)
    if (config.groq?.apiKey) {
      this.providers.push({
        name: 'groq',
        api: new GroqAPI(config.groq.apiKey, config.groq.model),
        tier: 'fallback',
        free: true,
      });
    }

    // Priority 4: Gemini (reliable & free)
    if (config.gemini?.apiKey) {
      this.providers.push({
        name: 'gemini',
        api: new GeminiAPI(config.gemini.apiKey, config.gemini.model),
        tier: 'fallback',
        free: true,
      });
    }
  }

  /**
   * Chat with automatic fallback
   * @param {Array} messages - Chat messages
   * @param {Object} options - Chat options
   * @param {Function} onProviderSwitch - Callback when switching providers
   * @returns {Promise<Object>} - Chat response
   */
  async chat(messages, options = {}, onProviderSwitch = null) {
    if (this.providers.length === 0) {
      throw new Error(
        'No AI providers configured. Please add API keys in "apikeys" settings.'
      );
    }

    let lastError = null;
    let attemptedProviders = [];

    for (const provider of this.providers) {
      try {
        attemptedProviders.push(provider.name);

        // Notify if switching to fallback provider
        if (provider.tier !== 'primary' && onProviderSwitch) {
          onProviderSwitch(provider.name, provider.tier, provider.free);
        }

        // Attempt chat with this provider
        const response = await provider.api.chat(messages, options);

        // Success! Update stats and return
        this.providerStats[provider.name].successes++;
        this.lastUsedProvider = provider.name;

        // Add provider metadata to response
        if (typeof response === 'object') {
          response._provider = provider.name;
          response._tier = provider.tier;
          response._free = provider.free;
        }

        return response;
      } catch (error) {
        lastError = error;
        this.providerStats[provider.name].failures++;

        console.warn(
          `Provider ${provider.name} failed, trying next...`,
          error.message
        );

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    const errorMessage = `All AI providers failed after trying: ${attemptedProviders.join(', ')}.\n\nLast error: ${lastError?.message || 'Unknown error'}`;
    throw new Error(errorMessage);
  }

  /**
   * Get statistics about provider usage
   */
  getStats() {
    return {
      providers: this.providers.map((p) => ({
        name: p.name,
        tier: p.tier,
        free: p.free,
        ...this.providerStats[p.name],
      })),
      lastUsed: this.lastUsedProvider,
    };
  }

  /**
   * Get available providers count
   */
  getAvailableCount() {
    return this.providers.length;
  }

  /**
   * Check if a specific provider is available
   */
  hasProvider(name) {
    return this.providers.some((p) => p.name === name);
  }
}

export default AIFallbackOrchestrator;
