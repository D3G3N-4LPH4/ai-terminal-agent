// Groq AI API Client (Fast & Free Fallback)

import { fetchWithTimeout } from '../utils/fetchWithTimeout.js';
import { validateAPIResponse, createError, ErrorType } from '../utils/errorHandler.js';

export class GroqAPI {
  constructor(apiKey, model = 'llama-3.1-70b-versatile', useProxy = true) {
    this.apiKey = apiKey;
    // Use backend proxy by default to avoid CORS issues
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    this.baseUrl = useProxy ? `${backendUrl}/api/groq` : 'https://api.groq.com/openai/v1';
    this.model = model;
  }

  setModel(modelId) {
    this.model = modelId;
  }

  async chat(messages, options = {}) {
    if (!this.apiKey) {
      throw createError(
        "Groq API key not configured. Get a free key at https://groq.com",
        ErrorType.API_KEY_MISSING
      );
    }

    try {
      const requestBody = {
        model: this.model,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
      };

      // Note: Groq doesn't support tool calling in the same way as OpenRouter
      // We'll return a simple response
      if (options.tools) {
        console.warn('Groq fallback: Tool calling not supported, returning text response only');
      }

      const response = await fetchWithTimeout(
        `${this.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
        30000 // 30s timeout (Groq is very fast)
      );

      if (!response.ok) {
        await validateAPIResponse(response, 'Groq');
      }

      const data = await response.json();
      const message = data.choices[0].message;

      // Return in same format as OpenRouter
      if (options.tools) {
        return {
          content: message.content,
          tool_calls: null,
          usage: data.usage,
        };
      }

      return message.content;
    } catch (error) {
      console.error('Groq API error:', error);
      throw error;
    }
  }

  // Get available models
  static getAvailableModels() {
    return [
      { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', speed: 'fast' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', speed: 'fastest' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', speed: 'fast' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B', speed: 'fast' },
    ];
  }
}

export default GroqAPI;
