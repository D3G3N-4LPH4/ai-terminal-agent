// Request deduplication and caching utilities

/**
 * Simple in-memory cache with TTL support
 */
class RequestCache {
  constructor(defaultTTL = 60000) {
    // Cache entries: Map<key, {data, timestamp, expiresAt}>
    this.cache = new Map();
    // Pending requests: Map<key, Promise>
    this.pending = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generate cache key from parameters
   * @param {string} prefix - Cache key prefix (e.g., 'price', 'market')
   * @param {Object} params - Parameters to include in key
   * @returns {string} - Cache key
   */
  generateKey(prefix, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    return `${prefix}:${sortedParams}`;
  }

  /**
   * Get cached data if valid
   * @param {string} key - Cache key
   * @returns {any|null} - Cached data or null
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached data with TTL
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Clear expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.pending.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
      pending: this.pending.size,
    };
  }

  /**
   * Execute function with deduplication
   * Prevents multiple identical requests from executing simultaneously
   * @param {string} key - Cache key
   * @param {Function} fn - Async function to execute
   * @param {number} ttl - Cache TTL in milliseconds
   * @returns {Promise<any>} - Function result
   */
  async dedupe(key, fn, ttl = this.defaultTTL) {
    // Check cache first
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Check if request is already pending
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    // Execute request
    const promise = fn()
      .then((result) => {
        this.set(key, result, ttl);
        this.pending.delete(key);
        return result;
      })
      .catch((error) => {
        this.pending.delete(key);
        throw error;
      });

    this.pending.set(key, promise);
    return promise;
  }
}

/**
 * API-specific cache instances with appropriate TTLs
 */
export const caches = {
  // Price data - cache for 30 seconds
  price: new RequestCache(30000),

  // Market data - cache for 1 minute
  market: new RequestCache(60000),

  // Historical data - cache for 5 minutes
  historical: new RequestCache(300000),

  // Trending/rankings - cache for 2 minutes
  trending: new RequestCache(120000),

  // On-chain metrics - cache for 5 minutes
  onchain: new RequestCache(300000),

  // News/research - cache for 10 minutes
  research: new RequestCache(600000),

  // ML predictions - cache for 30 minutes
  predictions: new RequestCache(1800000),
};

/**
 * Periodic cleanup of all caches
 */
setInterval(() => {
  Object.values(caches).forEach((cache) => cache.cleanup());
}, 60000); // Cleanup every minute

/**
 * Helper to create a cached API call
 * @param {RequestCache} cache - Cache instance to use
 * @param {string} keyPrefix - Cache key prefix
 * @param {Function} fn - API function to call
 * @param {Object} params - Parameters for cache key
 * @param {number} ttl - Optional TTL override
 * @returns {Promise<any>} - API result
 */
export const cachedAPICall = async (cache, keyPrefix, fn, params = {}, ttl) => {
  const key = cache.generateKey(keyPrefix, params);
  return cache.dedupe(key, fn, ttl);
};

/**
 * Clear all caches
 */
export const clearAllCaches = () => {
  Object.values(caches).forEach((cache) => cache.clear());
};

/**
 * Get statistics for all caches
 * @returns {Object} - Stats for each cache
 */
export const getAllCacheStats = () => {
  const stats = {};
  for (const [name, cache] of Object.entries(caches)) {
    stats[name] = cache.getStats();
  }
  return stats;
};

export default RequestCache;
