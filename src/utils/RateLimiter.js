/**
 * Sliding Window Rate Limiter
 *
 * Client-side rate limiting to prevent API hammering.
 * Uses a sliding window algorithm that tracks request timestamps.
 *
 * Inspired by OpenPrawn's rate-limiter pattern.
 */

// Default rate limits per endpoint
const DEFAULT_LIMITS = {
  openrouter: { maxRequests: 30, windowMs: 15 * 60 * 1000 },   // 30 per 15 min
  anthropic: { maxRequests: 30, windowMs: 15 * 60 * 1000 },    // 30 per 15 min
  coingecko: { maxRequests: 25, windowMs: 60 * 1000 },         // 25 per min
  cmc: { maxRequests: 14, windowMs: 60 * 60 * 1000 },          // 14 per hour
  fenrir: { maxRequests: 10, windowMs: 60 * 1000 },            // 10 per min
  scraper: { maxRequests: 20, windowMs: 60 * 1000 },           // 20 per min
  default: { maxRequests: 60, windowMs: 60 * 1000 },           // 60 per min fallback
};

class RateLimiter {
  constructor() {
    this.windows = {};   // { key: timestamp[] }
    this.limits = {};    // { key: { maxRequests, windowMs } }

    // Load defaults
    Object.entries(DEFAULT_LIMITS).forEach(([key, config]) => {
      this.limits[key] = { ...config };
    });
  }

  /**
   * Configure rate limit for an endpoint
   * @param {string} key - Endpoint key
   * @param {Object} config - { maxRequests, windowMs }
   */
  configure(key, { maxRequests, windowMs }) {
    this.limits[key] = { maxRequests, windowMs };
  }

  /**
   * Get the limit config for a key (falls back to default)
   * @param {string} key - Endpoint key
   * @returns {{ maxRequests: number, windowMs: number }}
   */
  getLimit(key) {
    return this.limits[key] || this.limits.default;
  }

  /**
   * Prune expired timestamps from the sliding window
   * @param {string} key - Endpoint key
   */
  prune(key) {
    if (!this.windows[key]) return;
    const { windowMs } = this.getLimit(key);
    const cutoff = Date.now() - windowMs;
    this.windows[key] = this.windows[key].filter(ts => ts > cutoff);
  }

  /**
   * Try to acquire a request slot (non-blocking)
   * @param {string} key - Endpoint key
   * @returns {boolean} True if request is allowed
   */
  tryAcquire(key) {
    this.prune(key);
    const { maxRequests } = this.getLimit(key);
    if (!this.windows[key]) this.windows[key] = [];

    if (this.windows[key].length < maxRequests) {
      this.windows[key].push(Date.now());
      return true;
    }
    return false;
  }

  /**
   * Wait until a request slot is available (blocking)
   * @param {string} key - Endpoint key
   * @returns {Promise<void>} Resolves when request is allowed
   */
  async wait(key) {
    if (this.tryAcquire(key)) return;

    // Calculate how long to wait for the oldest request to expire
    const { windowMs } = this.getLimit(key);
    const oldest = this.windows[key]?.[0] || Date.now();
    const waitMs = Math.max(50, oldest + windowMs - Date.now() + 50);

    await new Promise(resolve => setTimeout(resolve, waitMs));
    return this.wait(key); // Retry
  }

  /**
   * Get remaining requests in the current window
   * @param {string} key - Endpoint key
   * @returns {number} Remaining request count
   */
  getRemainingRequests(key) {
    this.prune(key);
    const { maxRequests } = this.getLimit(key);
    const used = this.windows[key]?.length || 0;
    return Math.max(0, maxRequests - used);
  }

  /**
   * Get ms until the window resets (oldest request expires)
   * @param {string} key - Endpoint key
   * @returns {number} Milliseconds until reset, 0 if not limited
   */
  getResetTime(key) {
    this.prune(key);
    const { maxRequests, windowMs } = this.getLimit(key);
    if (!this.windows[key] || this.windows[key].length < maxRequests) return 0;
    const oldest = this.windows[key][0];
    return Math.max(0, oldest + windowMs - Date.now());
  }

  /**
   * Check if currently rate limited
   * @param {string} key - Endpoint key
   * @returns {boolean}
   */
  isLimited(key) {
    this.prune(key);
    const { maxRequests } = this.getLimit(key);
    return (this.windows[key]?.length || 0) >= maxRequests;
  }

  /**
   * Get status for all endpoints
   * @returns {Object} Status per endpoint
   */
  getStatus() {
    const status = {};
    Object.keys(this.limits).forEach(key => {
      if (key === 'default') return;
      this.prune(key);
      const { maxRequests, windowMs } = this.getLimit(key);
      const used = this.windows[key]?.length || 0;
      status[key] = {
        used,
        max: maxRequests,
        remaining: Math.max(0, maxRequests - used),
        windowMs,
        limited: used >= maxRequests,
        resetIn: this.getResetTime(key),
      };
    });
    return status;
  }

  /**
   * Reset a specific endpoint counter
   * @param {string} key - Endpoint key
   */
  reset(key) {
    delete this.windows[key];
  }

  /**
   * Reset all counters
   */
  resetAll() {
    this.windows = {};
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

export { RateLimiter, DEFAULT_LIMITS };
export default rateLimiter;
