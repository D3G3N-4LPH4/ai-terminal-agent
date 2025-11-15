// OpenRouter AI API Client

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
      throw new Error(
        "OpenRouter API key not configured. Use 'apikeys' command to set it up."
      );
    }

    try {
      const requestBody = {
        model: this.model,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        ...options,
      };

      // Add tools/functions if provided
      if (options.tools) {
        requestBody.tools = options.tools;
        requestBody.tool_choice = options.tool_choice || "auto";
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

      // Return the full message object if tools are used (includes tool_calls)
      if (options.tools && message.tool_calls) {
        return message;
      }

      // Otherwise return just the content
      return message.content;
    } catch (error) {
      // Only log actual errors, not configuration issues
      const isConfigError =
        error.message.includes("not configured") ||
        error.message.includes("No cookie auth") ||
        error.message.includes("Unauthorized");
      if (!isConfigError) {
        console.error("OpenRouter error:", error);
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
      return {
        content: data.choices[0].message.content,
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
}

export default OpenRouterAPI;
