/**
 * Anthropic Direct API Client (Premium Fallback)
 * Provides access to Claude models via Anthropic's official API
 * @class AnthropicAPI
 */

import { fetchWithTimeout } from '../utils/fetchWithTimeout.js';
import { validateAPIResponse, createError, ErrorType } from '../utils/errorHandler.js';
import rateLimiter from '../utils/RateLimiter.js';

export class AnthropicAPI {
  /**
   * Create an Anthropic API client
   * @param {string} apiKey - Anthropic API key from console.anthropic.com
   * @param {string} [model='claude-3-5-sonnet-20241022'] - Default model to use
   * @param {boolean} [useProxy=true] - Whether to use backend proxy (avoids CORS)
   */
  constructor(apiKey, model = 'claude-3-5-sonnet-20241022', useProxy = true) {
    this.apiKey = apiKey;
    // Use backend proxy by default to avoid CORS issues
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    this.baseUrl = useProxy ? `${backendUrl}/api/anthropic` : 'https://api.anthropic.com/v1';
    this.model = model;
    this.apiVersion = '2023-06-01';
  }

  /**
   * Set the model to use for subsequent chat requests
   * @param {string} modelId - Model identifier (e.g., 'claude-3-5-sonnet-20241022')
   */
  setModel(modelId) {
    this.model = modelId;
  }

  /**
   * Convert OpenAI-style messages to Anthropic format
   * Separates system messages from user/assistant messages
   * @param {Array<{role: string, content: string}>} messages - OpenAI-format messages
   * @returns {{messages: Array, system: string}} Anthropic-format messages with system prompt
   */
  convertMessages(messages) {
    const anthropicMessages = [];
    let system = '';

    for (const msg of messages) {
      if (msg.role === 'system') {
        system = msg.content;
      } else if (msg.role === 'user' || msg.role === 'assistant') {
        anthropicMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    return { messages: anthropicMessages, system };
  }

  /**
   * Send a chat completion request to Anthropic API
   * @param {Array<{role: string, content: string}>} messages - Chat messages (OpenAI format)
   * @param {Object} [options={}] - Request options
   * @param {number} [options.maxTokens=1000] - Maximum tokens to generate
   * @param {number} [options.temperature=0.7] - Sampling temperature (0-1)
   * @param {Array} [options.tools] - Tool/function definitions for tool calling
   * @param {AbortSignal} [options.signal] - AbortSignal for request cancellation
   * @returns {Promise<string|Object>} Chat completion (string if no tools, object if tools enabled)
   * @throws {Error} If API key is missing or request fails
   */
  async chat(messages, options = {}) {
    if (!this.apiKey) {
      throw createError(
        "Anthropic API key not configured. Get a key at https://console.anthropic.com",
        ErrorType.API_KEY_MISSING
      );
    }

    // Rate limit check
    await rateLimiter.wait('anthropic');

    try {
      const { messages: anthropicMessages, system } = this.convertMessages(messages);

      const requestBody = {
        model: this.model,
        messages: anthropicMessages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
      };

      // Add system message if present
      if (system) {
        requestBody.system = system;
      }

      // Anthropic supports tool calling
      if (options.tools) {
        requestBody.tools = options.tools.map(tool => ({
          name: tool.function.name,
          description: tool.function.description,
          input_schema: tool.function.parameters,
        }));
      }

      const response = await fetchWithTimeout(
        `${this.baseUrl}/messages`,
        {
          method: 'POST',
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': this.apiVersion,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
        60000 // 60s timeout
      );

      if (!response.ok) {
        await validateAPIResponse(response, 'Anthropic');
      }

      const data = await response.json();

      // Extract content
      const content = data.content.find(c => c.type === 'text')?.text || '';

      // Check for tool use
      const toolUse = data.content.find(c => c.type === 'tool_use');

      // Return in OpenRouter-compatible format
      if (options.tools) {
        const tool_calls = toolUse ? [{
          id: toolUse.id,
          type: 'function',
          function: {
            name: toolUse.name,
            arguments: JSON.stringify(toolUse.input),
          },
        }] : null;

        return {
          content,
          tool_calls,
          usage: data.usage,
        };
      }

      return content;
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw error;
    }
  }

  /**
   * Get list of available Anthropic Claude models
   * @static
   * @returns {Array<{id: string, name: string, tier: string}>} Available models with metadata
   */
  static getAvailableModels() {
    return [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', tier: 'premium' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', tier: 'fast' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', tier: 'premium' },
    ];
  }
}

export default AnthropicAPI;
