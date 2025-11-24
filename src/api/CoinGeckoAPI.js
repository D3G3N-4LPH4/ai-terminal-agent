// CoinGecko API Client (free tier + Pro tier support)

import { fetchWithTimeout, fetchJSON } from '../utils/fetchWithTimeout.js';
import { caches, cachedAPICall } from '../utils/requestCache.js';
import { validateAPIResponse, createError, ErrorType } from '../utils/errorHandler.js';

export class CoinGeckoAPI {
  constructor(apiKey = "", baseUrl, proBaseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = apiKey ? proBaseUrl : baseUrl;
    this.freeBaseUrl = baseUrl;
    this.proBaseUrl = proBaseUrl;
  }

  getHeaders() {
    const headers = {};
    if (this.apiKey) {
      headers['x-cg-pro-api-key'] = this.apiKey;
    }
    return headers;
  }

  async getPrice(coinIds, vsCurrencies = ["usd"]) {
    const ids = Array.isArray(coinIds) ? coinIds.join(",") : coinIds;
    const currencies = Array.isArray(vsCurrencies)
      ? vsCurrencies.join(",")
      : vsCurrencies;

    // Use cache for price data (30s TTL)
    return cachedAPICall(
      caches.price,
      'coingecko_price',
      async () => {
        try {
          const url = `${this.baseUrl}/simple/price?ids=${ids}&vs_currencies=${currencies}&include_24hr_change=true&include_24hr_vol=true`;
          const response = await fetchWithTimeout(url, { headers: this.getHeaders() }, 10000);

          if (!response.ok) {
            // If Pro API fails, try falling back to free API
            if (this.apiKey && this.baseUrl === this.proBaseUrl) {
              console.warn("CoinGecko Pro API failed, falling back to free tier");
              const freeUrl = `${this.freeBaseUrl}/simple/price?ids=${ids}&vs_currencies=${currencies}&include_24hr_change=true&include_24hr_vol=true`;
              const freeResponse = await fetchWithTimeout(freeUrl, {}, 10000);

              if (freeResponse.ok) {
                return await freeResponse.json();
              }
            }

            await validateAPIResponse(response, 'CoinGecko');
          }

          return await response.json();
        } catch (error) {
          console.error("CoinGecko price error:", error);
          throw error;
        }
      },
      { ids, currencies }
    );
  }

  async getMarketData(coinId) {
    try {
      const response = await fetchWithTimeout(
        `${this.baseUrl}/coins/${coinId}`,
        { headers: this.getHeaders() },
        10000
      );

      if (!response.ok) {
        await validateAPIResponse(response, 'CoinGecko');
      }

      return await response.json();
    } catch (error) {
      console.error("CoinGecko market data error:", error);
      throw error;
    }
  }

  async getTrending() {
    // Use cache for trending data (2min TTL)
    return cachedAPICall(
      caches.trending,
      'coingecko_trending',
      async () => {
        try {
          const url = `${this.baseUrl}/search/trending`;
          const response = await fetchWithTimeout(url, { headers: this.getHeaders() }, 10000);

          if (!response.ok) {
            await validateAPIResponse(response, 'CoinGecko');
          }

          return await response.json();
        } catch (error) {
          console.error("CoinGecko trending error:", error);
          throw error;
        }
      },
      {}
    );
  }

  async getTopGainersLosers() {
    try {
      // Pro tier has dedicated endpoint, free tier uses market data sorting
      if (this.apiKey) {
        const response = await fetchWithTimeout(
          `${this.baseUrl}/coins/top_gainers_losers?vs_currency=usd`,
          { headers: this.getHeaders() },
          10000
        );

        if (response.ok) {
          const data = await response.json();
          return {
            gainers: data.top_gainers || [],
            losers: data.top_losers || []
          };
        }
      }

      // Fallback to free tier method
      const response = await fetchWithTimeout(
        `${this.baseUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`,
        { headers: this.getHeaders() },
        10000
      );

      if (!response.ok) {
        await validateAPIResponse(response, 'CoinGecko');
      }

      const data = await response.json();

      // Sort by 24h price change
      const gainers = [...data]
        .filter(coin => coin.price_change_percentage_24h > 0)
        .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
        .slice(0, 10);

      const losers = [...data]
        .filter(coin => coin.price_change_percentage_24h < 0)
        .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)
        .slice(0, 10);

      return { gainers, losers };
    } catch (error) {
      console.error("CoinGecko gainers/losers error:", error);
      throw error;
    }
  }

  async getCategories() {
    try {
      const response = await fetchWithTimeout(
        `${this.baseUrl}/coins/categories`,
        { headers: this.getHeaders() },
        10000
      );

      if (!response.ok) {
        await validateAPIResponse(response, 'CoinGecko');
      }

      return await response.json();
    } catch (error) {
      console.error("CoinGecko categories error:", error);
      throw error;
    }
  }

  async getCategoryCoins(categoryId) {
    try {
      const response = await fetchWithTimeout(
        `${this.baseUrl}/coins/markets?vs_currency=usd&category=${categoryId}&order=market_cap_desc&per_page=20&page=1&sparkline=false`,
        { headers: this.getHeaders() },
        10000
      );

      if (!response.ok) {
        await validateAPIResponse(response, 'CoinGecko');
      }

      return await response.json();
    } catch (error) {
      console.error("CoinGecko category coins error:", error);
      throw error;
    }
  }

  async getGlobalData() {
    // Use cache for global market data (1min TTL)
    return cachedAPICall(
      caches.market,
      'coingecko_global',
      async () => {
        try {
          const url = `${this.baseUrl}/global`;
          const response = await fetchWithTimeout(url, { headers: this.getHeaders() }, 10000);

          if (!response.ok) {
            await validateAPIResponse(response, 'CoinGecko');
          }

          return await response.json();
        } catch (error) {
          console.error("CoinGecko global data error:", error);
          throw error;
        }
      },
      {}
    );
  }

  async getMarketChart(coinId, days = 30) {
    // Use cache for historical data (5min TTL)
    return cachedAPICall(
      caches.historical,
      'coingecko_chart',
      async () => {
        try {
          const url = `${this.baseUrl}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
          const response = await fetchWithTimeout(url, { headers: this.getHeaders() }, 15000);

          if (!response.ok) {
            // If Pro API fails, try falling back to free API
            if (this.apiKey && this.baseUrl === this.proBaseUrl) {
              console.warn("CoinGecko Pro API failed, falling back to free tier");
              const freeUrl = `${this.freeBaseUrl}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
              const freeResponse = await fetchWithTimeout(freeUrl, {}, 15000);

              if (freeResponse.ok) {
                return await freeResponse.json();
              }
            }

            await validateAPIResponse(response, 'CoinGecko');
          }

          return await response.json();
        } catch (error) {
          console.error("CoinGecko market chart error:", error);
          throw error;
        }
      },
      { coinId, days }
    );
  }

  async getHistoricalPrices(coinId, days = 30) {
    // Alias for getMarketChart for compatibility
    return this.getMarketChart(coinId, days);
  }

  async getCoinData(coinId) {
    try {
      const response = await fetch(
        `${this.baseUrl}/coins/${coinId}?localization=false&tickers=false&community_data=true&developer_data=false&sparkline=false`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        // If Pro API fails, try falling back to free API
        if (this.apiKey && this.baseUrl === this.proBaseUrl) {
          console.warn("CoinGecko Pro API failed, falling back to free tier");
          const freeResponse = await fetch(
            `${this.freeBaseUrl}/coins/${coinId}?localization=false&tickers=false&community_data=true&developer_data=false&sparkline=false`
          );

          if (freeResponse.ok) {
            return await freeResponse.json();
          }
        }

        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("CoinGecko coin data error:", error);
      throw error;
    }
  }
}

export default CoinGeckoAPI;
