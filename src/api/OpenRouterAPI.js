// OpenRouter AI API Client
// Supports advanced features: model fallbacks, JSON mode, provider preferences,
// streaming, function calling, and comprehensive LLM parameter controls

import { fetchWithTimeout, fetchWithRetry } from '../utils/fetchWithTimeout.js';
import { validateAPIResponse, createError, ErrorType } from '../utils/errorHandler.js';

export class OpenRouterAPI {
  constructor(apiKey, baseUrl, defaultModel) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = defaultModel;
  }

  setModel(modelId) {
    this.model = modelId;
  }

  async chat(messages, options = {}) {
    if (!this.apiKey) {
      throw createError(
        "OpenRouter API key not configured. Use 'apikeys' command to set it up.",
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

      // Add tools/functions if provided
      if (options.tools) {
        requestBody.tools = options.tools;
        requestBody.tool_choice = options.tool_choice || "auto";
      }

      // Add reasoning parameter if requested
      if (options.includeReasoning) {
        requestBody.reasoning = {
          effort: options.reasoningEffort || "high"
        };
      }

      // JSON Mode - Force JSON responses (limited provider support)
      if (options.jsonMode) {
        requestBody.response_format = { type: "json_object" };
      }

      // Model Fallbacks - Automatic failover for rate limits/errors
      if (options.fallbackModels && Array.isArray(options.fallbackModels)) {
        requestBody.models = [this.model, ...options.fallbackModels];
        requestBody.route = "fallback";
      }

      // Provider Preferences - Control which provider serves the request
      if (options.provider) {
        requestBody.provider = options.provider;
      }

      // Seed for reproducibility
      if (options.seed !== undefined) {
        requestBody.seed = options.seed;
      }

      // Advanced sampling parameters
      if (options.top_p !== undefined) requestBody.top_p = options.top_p;
      if (options.top_k !== undefined) requestBody.top_k = options.top_k;
      if (options.frequency_penalty !== undefined) requestBody.frequency_penalty = options.frequency_penalty;
      if (options.presence_penalty !== undefined) requestBody.presence_penalty = options.presence_penalty;
      if (options.repetition_penalty !== undefined) requestBody.repetition_penalty = options.repetition_penalty;

      // Use retry logic for better resilience against transient 500 errors
      const response = await fetchWithRetry(
        `${this.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.href,
            "X-Title": "Fenrir AI Terminal",
          },
          body: JSON.stringify(requestBody),
        },
        2, // Max 2 retries for 500 errors
        60000 // 60s timeout for AI responses
      );

      if (!response.ok) {
        await validateAPIResponse(response, 'OpenRouter');
      }

      const data = await response.json();
      const message = data.choices[0].message;

      // If both tools and reasoning are requested
      if (options.tools && options.includeReasoning) {
        return {
          content: message.content,
          reasoning: message.reasoning || null,
          tool_calls: message.tool_calls || null,
          usage: data.usage
        };
      }

      // Return the full message object if tools are used (includes tool_calls)
      if (options.tools && message.tool_calls) {
        return message;
      }

      // If tools are enabled but not used, return structure with null tool_calls
      if (options.tools) {
        return {
          content: message.content,
          tool_calls: null,
          usage: data.usage
        };
      }

      // If reasoning is requested, return full response with reasoning
      if (options.includeReasoning) {
        return {
          content: message.content,
          reasoning: message.reasoning || null,  // Reasoning is in message.reasoning
          usage: data.usage
        };
      }

      // Otherwise return just the content
      return message.content;
    } catch (error) {
      // Only log actual errors, not configuration issues
      const isConfigError =
        error.message.includes("not configured") ||
        error.message.includes("No cookie auth") ||
        error.message.includes("Unauthorized");

      // Check if it's a server error (500)
      const isServerError = error.message.includes("500") || error.message.includes("Internal Server Error");

      if (!isConfigError) {
        console.error("OpenRouter error:", error);
      }

      // Provide helpful context for server errors
      if (isServerError) {
        throw createError(
          `OpenRouter server error (temporary issue on their side). Please try again in a moment.\n\nOriginal error: ${error.message}`,
          ErrorType.API_ERROR
        );
      }

      throw error;
    }
  }

  async webSearch(query, options = {}) {
    if (!this.apiKey) {
      throw new Error(
        "OpenRouter API key not configured. Use 'apikeys' command to set it up."
      );
    }

    try {
      // Use Perplexity's online model for web search
      const webModel = options.model || "perplexity/llama-3.1-sonar-large-128k-online";

      const messages = [
        {
          role: "user",
          content: query
        }
      ];

      const requestBody = {
        model: webModel,
        messages: messages,
        temperature: options.temperature || 0.3, // Lower temp for factual responses
        max_tokens: options.maxTokens || 2000,
      };

      // Add reasoning parameter if requested
      if (options.includeReasoning) {
        requestBody.reasoning = {
          effort: options.reasoningEffort || "high"
        };
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.href,
          "X-Title": "Fenrir AI Terminal",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message ||
            `OpenRouter API error: ${response.statusText}`
        );
      }

      const data = await response.json();
      const message = data.choices[0].message;

      // If reasoning is requested, return full response with reasoning
      if (options.includeReasoning) {
        return {
          content: message.content,
          reasoning: message.reasoning || null,  // Reasoning is in message.reasoning
          model: webModel,
          usage: data.usage
        };
      }

      // Otherwise return standard response
      return {
        content: message.content,
        model: webModel,
        usage: data.usage
      };
    } catch (error) {
      console.error("OpenRouter web search error:", error);
      throw error;
    }
  }

  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("OpenRouter models error:", error);
      throw error;
    }
  }

  /**
   * Get detailed generation information including native token counts and costs
   * OpenRouter normalizes usage data to GPT-4o tokenizer; use this for precise billing
   * @param {string} generationId - ID from the response
   * @returns {Promise<Object>} - Detailed generation stats with native token counts
   */
  async getGenerationDetails(generationId) {
    if (!this.apiKey) {
      throw new Error("OpenRouter API key not configured");
    }

    try {
      const response = await fetch(`${this.baseUrl}/generation?id=${generationId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("OpenRouter generation details error:", error);
      throw error;
    }
  }
}

export default OpenRouterAPI;
