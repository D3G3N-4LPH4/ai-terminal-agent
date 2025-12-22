// CoinGecko MCP (Model Context Protocol) Client
// Provides AI-native access to CoinGecko data including DEX analytics

import { createError, ErrorType } from '../utils/errorHandler.js';

const getAPIConfig = () => {
  if (typeof window !== 'undefined' && window.API_CONFIG) {
    return window.API_CONFIG;
  }
  // Fallback for server-side usage
  return {
    coinGeckoMCP: {
      baseUrl: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001'
    }
  };
};

class CoinGeckoMCP {
  constructor(apiKey = "") {
    this.apiKey = apiKey; // Optional - for Pro tier
    const apiConfig = getAPIConfig();
    this.baseUrl = apiConfig.coinGeckoMCP?.baseUrl || 'http://localhost:3001';
  }

  /**
   * Call an MCP tool with parameters
   * @param {string} toolName - Name of the MCP tool to call
   * @param {object} params - Tool parameters
   * @returns {Promise<object>} - Tool result
   */
  async callTool(toolName, params = {}) {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      // Add API key if provided (for Pro tier)
      if (this.apiKey && this.apiKey.trim() !== "") {
        headers['x-cg-pro-api-key'] = this.apiKey.trim();
      }

      const response = await fetch(`${this.baseUrl}/api/coingecko-mcp/call`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          tool: toolName,
          params: params
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(
          `CoinGecko MCP error (${response.status}): ${errorText || response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("CoinGecko MCP error:", error);

      // Handle CORS errors
      if (error.message?.includes('Failed to fetch') || error.message?.includes('CORS') || error.name === 'TypeError') {
        throw createError(
          "CORS Error: CoinGecko MCP cannot be called directly from the browser.\n\n" +
          "Solution: Backend server not running. Start it with 'npm start'",
          ErrorType.NETWORK_ERROR
        );
      }

      throw error;
    }
  }

  /**
   * List all available MCP tools
   * @returns {Promise<array>} - List of available tools
   */
  async listTools() {
    try {
      const headers = {};
      if (this.apiKey && this.apiKey.trim() !== "") {
        headers['x-cg-pro-api-key'] = this.apiKey.trim();
      }

      const response = await fetch(`${this.baseUrl}/api/coingecko-mcp/tools`, {
        headers: headers
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(
          `CoinGecko MCP error (${response.status}): ${errorText || response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("CoinGecko MCP list tools error:", error);

      // Handle CORS errors
      if (error.message?.includes('Failed to fetch') || error.message?.includes('CORS') || error.name === 'TypeError') {
        throw createError(
          "CORS Error: CoinGecko MCP cannot be called directly from the browser.\n\n" +
          "Solution: Backend server not running. Start it with 'npm start'",
          ErrorType.NETWORK_ERROR
        );
      }

      throw error;
    }
  }

  /**
   * Search for cryptocurrency information
   * @param {string} query - Search query (e.g., "bitcoin", "trending DEX tokens")
   * @returns {Promise<object>} - Search results
   */
  async search(query) {
    return this.callTool('coingecko_search', { query });
  }

  /**
   * Get cryptocurrency price data
   * @param {string} coinId - Coin ID (e.g., "bitcoin", "ethereum")
   * @param {string} vsCurrency - Currency to compare (default: "usd")
   * @returns {Promise<object>} - Price data
   */
  async getPrice(coinId, vsCurrency = "usd") {
    return this.callTool('coingecko_price', {
      coin_id: coinId,
      vs_currency: vsCurrency
    });
  }

  /**
   * Get trending coins
   * @returns {Promise<object>} - Trending coins data
   */
  async getTrending() {
    return this.callTool('coingecko_trending', {});
  }

  /**
   * Get market data for a coin
   * @param {string} coinId - Coin ID
   * @returns {Promise<object>} - Market data
   */
  async getMarketData(coinId) {
    return this.callTool('coingecko_market', { coin_id: coinId });
  }

  /**
   * Get historical price data
   * @param {string} coinId - Coin ID
   * @param {number} days - Number of days (default: 30)
   * @returns {Promise<object>} - Historical data
   */
  async getHistory(coinId, days = 30) {
    return this.callTool('coingecko_history', {
      coin_id: coinId,
      days: days
    });
  }

  /**
   * Get DEX token data from GeckoTerminal
   * @param {string} query - Token search query
   * @param {string} network - Network (e.g., "eth", "bsc", "polygon")
   * @returns {Promise<object>} - DEX token data
   */
  async getDEXTokens(query, network = "eth") {
    return this.callTool('geckoterminal_search', {
      query: query,
      network: network
    });
  }

  /**
   * Get coins by category
   * @param {string} category - Category (e.g., "defi", "layer-1", "ai-agents")
   * @returns {Promise<object>} - Category coins
   */
  async getCategoryCoins(category) {
    return this.callTool('coingecko_category', { category });
  }

  /**
   * Natural language query - AI-powered
   * @param {string} query - Natural language query
   * @returns {Promise<object>} - AI-processed result
   */
  async query(query) {
    return this.callTool('coingecko_query', { query });
  }
}

export { CoinGeckoMCP };
export default CoinGeckoMCP;
