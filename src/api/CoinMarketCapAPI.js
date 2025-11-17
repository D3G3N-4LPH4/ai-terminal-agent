// API_CONFIG should be imported or defined in consuming code
import { fetchWithTimeout } from '../utils/fetchWithTimeout.js';
import { caches, cachedAPICall } from '../utils/requestCache.js';
import { validateAPIResponse, createError, ErrorType } from '../utils/errorHandler.js';

const getAPIConfig = () => {
  if (typeof window !== 'undefined' && window.API_CONFIG) {
    return window.API_CONFIG;
  }
  // Fallback for server-side usage
  return {
    coinMarketCap: {
      baseUrl: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001'
    }
  };
};

class CoinMarketCapAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    const apiConfig = getAPIConfig();
    this.baseUrl = apiConfig.coinMarketCap.baseUrl;
  }

  async makeRequest(endpoint, params = {}) {
    if (!this.apiKey) {
      throw createError(
        "CoinMarketCap API key not configured. Use 'apikeys' command to set it up.",
        ErrorType.API_KEY_MISSING
      );
    }

    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${this.baseUrl}${endpoint}${
        queryString ? `?${queryString}` : ""
      }`;

      const response = await fetchWithTimeout(url, {
        method: "GET",
        headers: {
          "X-CMC_PRO_API_KEY": this.apiKey,
          Accept: "application/json",
        },
      }, 15000); // 15s timeout

      if (!response.ok) {
        await validateAPIResponse(response, 'CoinMarketCap');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      const isConfigError = error.message.includes("not configured");
      const isCorsError =
        error.message.includes("Failed to fetch") ||
        error.message.includes("CORS");

      if (!isConfigError) {
        console.error("CoinMarketCap error:", error);
      }

      if (isCorsError) {
        throw new Error(
          "CORS Error: CoinMarketCap API cannot be called directly from the browser.\n\n" +
            "Solution: You need a backend server to proxy these requests.\n" +
            "Alternative: Use CoinGecko API instead (type 'price BTC' or 'market ETH')"
        );
      }

      throw error;
    }
  }

  async getQuotes(symbols) {
    try {
      const symbolList = Array.isArray(symbols) ? symbols.join(",") : symbols;
      const data = await this.makeRequest("/cryptocurrency/quotes/latest", {
        symbol: symbolList,
      });
      return data;
    } catch (error) {
      console.error("Get quotes error:", error);
      throw error;
    }
  }

  async getListings(limit = 100, start = 1) {
    try {
      const data = await this.makeRequest("/cryptocurrency/listings/latest", {
        start: start,
        limit: limit,
        convert: "USD",
      });
      return data;
    } catch (error) {
      console.error("Get listings error:", error);
      throw error;
    }
  }

  async getMetadata(symbols) {
    try {
      const symbolList = Array.isArray(symbols) ? symbols.join(",") : symbols;
      const data = await this.makeRequest("/cryptocurrency/info", {
        symbol: symbolList,
      });
      return data;
    } catch (error) {
      console.error("Get metadata error:", error);
      throw error;
    }
  }

  async getGlobalMetrics() {
    try {
      const data = await this.makeRequest("/global-metrics/quotes/latest");
      return data;
    } catch (error) {
      console.error("Get global metrics error:", error);
      throw error;
    }
  }

  async getTrending() {
    try {
      const data = await this.makeRequest("/cryptocurrency/trending/latest");
      return data;
    } catch (error) {
      console.error("Get trending error:", error);
      throw error;
    }
  }

  async getMostVisited() {
    try {
      const data = await this.makeRequest(
        "/cryptocurrency/trending/most-visited"
      );
      return data;
    } catch (error) {
      console.error("Get most visited error:", error);
      throw error;
    }
  }

  async getGainersLosers() {
    try {
      const data = await this.makeRequest(
        "/cryptocurrency/trending/gainers-losers"
      );
      return data;
    } catch (error) {
      console.error("Get gainers/losers error:", error);
      throw error;
    }
  }

  async convert(amount, symbol, convert = "USD") {
    try {
      const data = await this.makeRequest("/tools/price-conversion", {
        amount: amount,
        symbol: symbol,
        convert: convert,
      });
      return data;
    } catch (error) {
      console.error("Convert error:", error);
      throw error;
    }
  }

  async getCategories() {
    try {
      const data = await this.makeRequest("/cryptocurrency/categories");
      return data;
    } catch (error) {
      console.error("Get categories error:", error);
      throw error;
    }
  }

  async getOHLCV(symbol, interval = "daily", count = 10) {
    try {
      const data = await this.makeRequest("/cryptocurrency/ohlcv/latest", {
        symbol: symbol,
        convert: "USD",
        interval: interval,
        count: count,
      });
      return data;
    } catch (error) {
      console.error("Get OHLCV error:", error);
      throw error;
    }
  }

  async getMarketPairs(symbol, limit = 100) {
    try {
      const data = await this.makeRequest("/cryptocurrency/market-pairs/latest", {
        symbol: symbol,
        limit: limit,
        convert: "USD",
      });
      return data;
    } catch (error) {
      console.error("Get market pairs error:", error);
      throw error;
    }
  }

  async getPricePerformance(symbol, timePeriod = "24h") {
    try {
      const data = await this.makeRequest("/cryptocurrency/price-performance-stats/latest", {
        symbol: symbol,
        time_period: timePeriod,
        convert: "USD",
      });
      return data;
    } catch (error) {
      console.error("Get price performance error:", error);
      throw error;
    }
  }

  async getAirdrops(status = "ONGOING") {
    try {
      const data = await this.makeRequest("/cryptocurrency/airdrops", {
        status: status,
      });
      return data;
    } catch (error) {
      console.error("Get airdrops error:", error);
      throw error;
    }
  }

  async getFiatMap() {
    try {
      const data = await this.makeRequest("/fiat/map");
      return data;
    } catch (error) {
      console.error("Get fiat map error:", error);
      throw error;
    }
  }

  async getExchanges(limit = 100) {
    try {
      const data = await this.makeRequest("/exchange/listings/latest", {
        limit: limit,
        convert: "USD",
      });
      return data;
    } catch (error) {
      console.error("Get exchanges error:", error);
      throw error;
    }
  }

  async getExchangeInfo(slug) {
    try {
      const data = await this.makeRequest("/exchange/info", {
        slug: slug,
      });
      return data;
    } catch (error) {
      console.error("Get exchange info error:", error);
      throw error;
    }
  }

  async getHistoricalQuotes(symbol, timeStart, timeEnd, interval = "daily") {
    try {
      const data = await this.makeRequest("/cryptocurrency/quotes/historical", {
        symbol: symbol,
        time_start: timeStart,
        time_end: timeEnd,
        interval: interval,
        convert: "USD",
      });
      return data;
    } catch (error) {
      console.error("Get historical quotes error:", error);
      throw error;
    }
  }
}

export { CoinMarketCapAPI };
export default CoinMarketCapAPI;
