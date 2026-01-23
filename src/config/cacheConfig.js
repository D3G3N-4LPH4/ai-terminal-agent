/**
 * Centralized Cache Configuration
 *
 * Defines TTLs (time-to-live) for all cached data types.
 * Used by both frontend caching helpers and backend Redis.
 */

// Cache TTLs in seconds
export const CACHE_TTL = {
  // ML Predictions
  prediction: 3600,      // 1 hour - predictions are computationally expensive
  sentiment: 1800,       // 30 minutes - sentiment changes frequently
  anomaly: 900,          // 15 minutes - anomalies need quick detection
  pattern: 3600,         // 1 hour - technical patterns are stable

  // Price Data
  priceRealtime: 30,     // 30 seconds - near real-time updates
  priceHistorical: 3600, // 1 hour - historical data rarely changes
  priceOHLC: 300,        // 5 minutes - OHLC data for charts

  // Market Data
  marketOverview: 300,   // 5 minutes - market overview stats
  trending: 600,         // 10 minutes - trending coins
  newListings: 120,      // 2 minutes - new token listings (important for trading)

  // Token Analysis
  tokenInfo: 1800,       // 30 minutes - basic token info
  tokenHolders: 600,     // 10 minutes - holder distribution
  tokenTransactions: 60, // 1 minute - recent transactions

  // Web Scraping
  scraperDefault: 3600,  // 1 hour - general web scrapes
  scraperNews: 1800,     // 30 minutes - news content
  scraperPricing: 300,   // 5 minutes - pricing pages

  // User Preferences
  userSettings: 86400,   // 24 hours - user settings rarely change
  sessionData: 1800,     // 30 minutes - session-related data
};

// Cache key prefixes for organization
export const CACHE_KEYS = {
  ml: 'ml',
  price: 'price',
  market: 'market',
  token: 'token',
  scraper: 'scraper',
  user: 'user',
};

/**
 * Generate a standardized cache key
 * @param {string} prefix - Cache key prefix
 * @param {string} type - Data type
 * @param {...string} params - Additional parameters
 * @returns {string} Cache key
 */
export function generateCacheKey(prefix, type, ...params) {
  const parts = [prefix, type, ...params].filter(Boolean);
  return parts.join(':');
}

/**
 * Check if cached data is still valid
 * @param {Object} cachedData - Cached data with cachedAt timestamp
 * @param {number} ttlSeconds - TTL in seconds
 * @returns {boolean} True if still valid
 */
export function isCacheValid(cachedData, ttlSeconds) {
  if (!cachedData || !cachedData.cachedAt) return false;

  const cachedTime = new Date(cachedData.cachedAt).getTime();
  const now = Date.now();
  const ageSeconds = (now - cachedTime) / 1000;

  return ageSeconds < ttlSeconds;
}

/**
 * Add cache metadata to data
 * @param {any} data - Data to cache
 * @returns {Object} Data with cache metadata
 */
export function wrapCacheData(data) {
  return {
    data,
    cachedAt: new Date().toISOString(),
    version: '1.0',
  };
}

export default {
  CACHE_TTL,
  CACHE_KEYS,
  generateCacheKey,
  isCacheValid,
  wrapCacheData,
};
