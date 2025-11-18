// Anthropic Direct API Client (Premium Fallback)

import { fetchWithTimeout } from '../utils/fetchWithTimeout.js';
import { validateAPIResponse, createError, ErrorType } from '../utils/errorHandler.js';

export class AnthropicAPI {
  constructor(apiKey, model = 'claude-3-5-sonnet-20241022') {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.anthropic.com/v1';
    this.model = model;
    this.apiVersion = '2023-06-01';
  }

  setModel(modelId) {
    this.model = modelId;
  }

  /**
   * Convert OpenAI-style messages to Anthropic format
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

  async chat(messages, options = {}) {
    if (!this.apiKey) {
      throw createError(
        "Anthropic API key not configured. Get a key at https://console.anthropic.com",
        ErrorType.API_KEY_MISSING
      );
    }

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

  // Get available models
  static getAvailableModels() {
    return [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', tier: 'premium' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', tier: 'fast' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', tier: 'premium' },
    ];
  }
}

export default AnthropicAPI;
