// API response normalization utilities

/**
 * Standard API response structure
 * @typedef {Object} NormalizedResponse
 * @property {boolean} success - Whether the request succeeded
 * @property {any} data - Response data
 * @property {Object} metadata - Additional metadata
 * @property {string} metadata.source - API source name
 * @property {number} metadata.timestamp - Response timestamp
 * @property {number} metadata.responseTime - Response time in ms
 * @property {string|null} error - Error message if failed
 */

/**
 * Normalize API response to standard format
 * @param {any} data - Raw API response data
 * @param {string} source - API source name
 * @param {number} startTime - Request start time
 * @returns {NormalizedResponse} - Normalized response
 */
export const normalizeResponse = (data, source, startTime = Date.now()) => {
  return {
    success: true,
    data,
    metadata: {
      source,
      timestamp: Date.now(),
      responseTime: Date.now() - startTime,
    },
    error: null,
  };
};

/**
 * Normalize error response to standard format
 * @param {Error} error - Error object
 * @param {string} source - API source name
 * @param {number} startTime - Request start time
 * @returns {NormalizedResponse} - Normalized error response
 */
export const normalizeError = (error, source, startTime = Date.now()) => {
  return {
    success: false,
    data: null,
    metadata: {
      source,
      timestamp: Date.now(),
      responseTime: Date.now() - startTime,
    },
    error: error.message || 'Unknown error',
  };
};

/**
 * Wrap API call with normalization
 * @param {Function} apiCall - Async API call function
 * @param {string} source - API source name
 * @returns {Function} - Wrapped API call
 */
export const wrapAPICall = (apiCall, source) => {
  return async (...args) => {
    const startTime = Date.now();

    try {
      const data = await apiCall(...args);
      return normalizeResponse(data, source, startTime);
    } catch (error) {
      return normalizeError(error, source, startTime);
    }
  };
};

/**
 * Normalize price data from different sources
 * @param {any} rawData - Raw price data from any API
 * @param {string} source - Source API (coingecko, coinmarketcap, etc.)
 * @returns {Object} - Normalized price data
 */
export const normalizePriceData = (rawData, source) => {
  switch (source.toLowerCase()) {
    case 'coingecko':
      return {
        price: rawData.usd || rawData.current_price?.usd,
        change_24h: rawData.usd_24h_change || rawData.price_change_percentage_24h,
        volume_24h: rawData.usd_24h_vol || rawData.total_volume?.usd,
        market_cap: rawData.usd_market_cap || rawData.market_cap?.usd,
        last_updated: rawData.last_updated_at || Date.now() / 1000,
      };

    case 'coinmarketcap':
      return {
        price: rawData.quote?.USD?.price || rawData.price,
        change_24h: rawData.quote?.USD?.percent_change_24h || rawData.change_24h,
        volume_24h: rawData.quote?.USD?.volume_24h || rawData.volume_24h,
        market_cap: rawData.quote?.USD?.market_cap || rawData.market_cap,
        last_updated: rawData.quote?.USD?.last_updated || rawData.last_updated,
      };

    default:
      // Assume already normalized format
      return {
        price: rawData.price,
        change_24h: rawData.change_24h,
        volume_24h: rawData.volume_24h,
        market_cap: rawData.market_cap,
        last_updated: rawData.last_updated || Date.now() / 1000,
      };
  }
};

/**
 * Normalize market data from different sources
 * @param {any} rawData - Raw market data
 * @param {string} source - Source API
 * @returns {Object} - Normalized market data
 */
export const normalizeMarketData = (rawData, source) => {
  switch (source.toLowerCase()) {
    case 'coingecko':
      return {
        total_market_cap: rawData.data?.total_market_cap?.usd,
        total_volume: rawData.data?.total_volume?.usd,
        market_cap_percentage: rawData.data?.market_cap_percentage,
        market_cap_change_24h: rawData.data?.market_cap_change_percentage_24h_usd,
        active_cryptocurrencies: rawData.data?.active_cryptocurrencies,
      };

    case 'coinmarketcap':
      return {
        total_market_cap: rawData.quote?.USD?.total_market_cap,
        total_volume: rawData.quote?.USD?.total_volume_24h,
        market_cap_percentage: rawData.btc_dominance
          ? { btc: rawData.btc_dominance, eth: rawData.eth_dominance }
          : null,
        market_cap_change_24h: rawData.quote?.USD?.total_market_cap_yesterday_percentage_change,
        active_cryptocurrencies: rawData.active_cryptocurrencies,
      };

    default:
      return rawData;
  }
};

/**
 * Normalize historical price data
 * @param {any} rawData - Raw historical data
 * @param {string} source - Source API
 * @returns {Array} - Normalized array of {timestamp, price, volume}
 */
export const normalizeHistoricalData = (rawData, source) => {
  switch (source.toLowerCase()) {
    case 'coingecko':
      // CoinGecko format: {prices: [[timestamp, price]], total_volumes: [[timestamp, volume]]}
      if (rawData.prices && Array.isArray(rawData.prices)) {
        return rawData.prices.map((item, index) => ({
          timestamp: item[0],
          price: item[1],
          volume: rawData.total_volumes?.[index]?.[1] || null,
        }));
      }
      return [];

    case 'coinmarketcap':
      // CoinMarketCap format varies, normalize to consistent structure
      if (Array.isArray(rawData)) {
        return rawData.map((item) => ({
          timestamp: new Date(item.timestamp || item.time_close).getTime(),
          price: item.quote?.USD?.price || item.close,
          volume: item.quote?.USD?.volume_24h || item.volume,
        }));
      }
      return [];

    default:
      // Assume already normalized
      if (Array.isArray(rawData)) {
        return rawData.map((item) => ({
          timestamp: item.timestamp || item.time,
          price: item.price || item.close,
          volume: item.volume,
        }));
      }
      return [];
  }
};

/**
 * Normalize trending/top coins data
 * @param {any} rawData - Raw trending data
 * @param {string} source - Source API
 * @returns {Array} - Normalized array of coin data
 */
export const normalizeTrendingData = (rawData, source) => {
  switch (source.toLowerCase()) {
    case 'coingecko':
      if (rawData.coins && Array.isArray(rawData.coins)) {
        return rawData.coins.map((item) => {
          const coin = item.item || item;
          return {
            id: coin.id,
            symbol: coin.symbol?.toUpperCase(),
            name: coin.name,
            rank: coin.market_cap_rank || coin.score,
            price: coin.price || null,
            change_24h: coin.price_change_percentage_24h || null,
          };
        });
      }
      return [];

    case 'coinmarketcap':
      if (Array.isArray(rawData)) {
        return rawData.map((coin) => ({
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          rank: coin.cmc_rank || coin.rank,
          price: coin.quote?.USD?.price,
          change_24h: coin.quote?.USD?.percent_change_24h,
        }));
      }
      return [];

    default:
      return rawData;
  }
};

/**
 * Merge data from multiple sources with fallback
 * @param {Array<NormalizedResponse>} responses - Array of normalized responses
 * @param {Function} merger - Function to merge data
 * @returns {Object} - Merged data with source attribution
 */
export const mergeResponses = (responses, merger = (data) => data[0]) => {
  const successful = responses.filter((r) => r.success);

  if (successful.length === 0) {
    return {
      success: false,
      data: null,
      sources: responses.map((r) => r.metadata.source),
      errors: responses.map((r) => r.error).filter(Boolean),
    };
  }

  return {
    success: true,
    data: merger(successful.map((r) => r.data)),
    sources: successful.map((r) => r.metadata.source),
    metadata: {
      timestamp: Date.now(),
      sourceCount: successful.length,
    },
  };
};

/**
 * Create fallback chain for API calls
 * @param {Array<{name: string, call: Function}>} apiCalls - Array of API calls with names
 * @returns {Promise<NormalizedResponse>} - First successful response
 */
export const createFallbackChain = async (apiCalls) => {
  const errors = [];

  for (const { name, call } of apiCalls) {
    try {
      const startTime = Date.now();
      const data = await call();
      return normalizeResponse(data, name, startTime);
    } catch (error) {
      errors.push({ source: name, error: error.message });
    }
  }

  // All failed
  return {
    success: false,
    data: null,
    metadata: {
      timestamp: Date.now(),
      attemptedSources: apiCalls.map((a) => a.name),
    },
    error: `All API calls failed: ${errors.map((e) => `${e.source}: ${e.error}`).join('; ')}`,
  };
};

export default {
  normalizeResponse,
  normalizeError,
  wrapAPICall,
  normalizePriceData,
  normalizeMarketData,
  normalizeHistoricalData,
  normalizeTrendingData,
  mergeResponses,
  createFallbackChain,
};
