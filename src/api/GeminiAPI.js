// Google Gemini API Client (Free Fallback)

import { fetchWithTimeout } from '../utils/fetchWithTimeout.js';
import { validateAPIResponse, createError, ErrorType } from '../utils/errorHandler.js';

export class GeminiAPI {
  constructor(apiKey, model = 'gemini-1.5-flash') {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1';
    this.model = model;
  }

  setModel(modelId) {
    this.model = modelId;
  }

  /**
   * Convert OpenAI-style messages to Gemini format
   */
  convertMessages(messages) {
    const contents = [];
    let systemInstruction = '';

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = msg.content;
      } else if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content }],
        });
      }
    }

    return { contents, systemInstruction };
  }

  async chat(messages, options = {}) {
    if (!this.apiKey) {
      throw createError(
        "Gemini API key not configured. Get a free key at https://ai.google.dev",
        ErrorType.API_KEY_MISSING
      );
    }

    try {
      const { contents, systemInstruction } = this.convertMessages(messages);

      const requestBody = {
        contents,
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 1000,
        },
      };

      // Add system instruction if present
      if (systemInstruction) {
        requestBody.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      // Note: Gemini doesn't support tool calling in same format as OpenRouter
      if (options.tools) {
        console.warn('Gemini fallback: Tool calling not supported, returning text response only');
      }

      const response = await fetchWithTimeout(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
        30000 // 30s timeout
      );

      if (!response.ok) {
        await validateAPIResponse(response, 'Gemini');
      }

      const data = await response.json();

      // Extract text from Gemini response
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Return in same format as OpenRouter
      if (options.tools) {
        return {
          content,
          tool_calls: null,
          usage: data.usageMetadata,
        };
      }

      return content;
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  // Get available models
  static getAvailableModels() {
    return [
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', speed: 'fast', free: true },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', speed: 'medium', free: true },
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)', speed: 'fastest', free: true },
    ];
  }
}

export default GeminiAPI;
