/**
 * Hybrid Scraper API
 * Intelligently chooses between Python scraper (free) and ScraperAPI (paid)
 * based on URL characteristics and previous performance
 *
 * Strategy:
 * 1. Try Python scraper first for static content (FREE)
 * 2. Fall back to ScraperAPI for JavaScript-heavy sites (PAID)
 * 3. Learn from failures to optimize future requests
 *
 * @class HybridScraperAPI
 */

import { PythonScraperAPI } from './PythonScraperAPI.js';
import { ScraperAPI } from './ScraperAPI.js';
import { createError, ErrorType } from '../utils/errorHandler.js';

export class HybridScraperAPI {
  /**
   * Create a hybrid scraper
   * @param {string} [scraperApiKey] - ScraperAPI key (optional, enables paid fallback)
   * @param {Object} [options={}] - Configuration options
   * @param {boolean} [options.preferFree=true] - Prefer free Python scraper when possible
   * @param {boolean} [options.enableLearning=true] - Learn from failures to optimize routing
   * @param {number} [options.cacheTimeout=3600] - Cache timeout in seconds (1 hour default)
   */
  constructor(scraperApiKey, options = {}) {
    this.pythonScraper = new PythonScraperAPI();
    this.scraperAPI = scraperApiKey ? new ScraperAPI(scraperApiKey) : null;

    this.preferFree = options.preferFree !== false;
    this.enableLearning = options.enableLearning !== false;
    this.cacheTimeout = options.cacheTimeout || 3600;

    // Track which domains work with Python scraper vs need ScraperAPI
    this.domainClassification = new Map();

    // Statistics
    this.stats = {
      pythonSuccesses: 0,
      pythonFailures: 0,
      scraperAPISuccesses: 0,
      scraperAPIFailures: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };

    // Patterns that suggest JavaScript-heavy site
    this.jsHeavyPatterns = [
      /linkedin\.com/i,
      /twitter\.com/i,
      /x\.com/i,
      /facebook\.com/i,
      /instagram\.com/i,
      /reddit\.com/i,
      /amazon\.com.*\/dp\//i,  // Amazon product pages
      /ebay\.com/i,
      /shopify\.com/i,
      /app\./i,  // Sites with app. subdomain are usually SPAs
    ];

    // Patterns that suggest static/documentation site
    this.staticPatterns = [
      /docs?\./i,
      /blog\./i,
      /medium\.com/i,
      /github\.io/i,
      /wikipedia\.org/i,
      /stackoverflow\.com/i,
      /readthedocs\.io/i,
      /npmjs\.com/i,
    ];
  }

  /**
   * Determine if URL is likely JavaScript-heavy
   * @param {string} url - URL to check
   * @returns {boolean} True if likely needs JavaScript rendering
   * @private
   */
  _isLikelyJSHeavy(url) {
    // Check against known JS-heavy patterns
    for (const pattern of this.jsHeavyPatterns) {
      if (pattern.test(url)) {
        return true;
      }
    }

    // Check domain history
    const domain = new URL(url).hostname;
    const classification = this.domainClassification.get(domain);

    if (classification) {
      // If we've tried this domain before and Python failed, assume JS-heavy
      return classification.pythonFailures > classification.pythonSuccesses;
    }

    return false;
  }

  /**
   * Determine if URL is likely static content
   * @param {string} url - URL to check
   * @returns {boolean} True if likely static/simple
   * @private
   */
  _isLikelyStatic(url) {
    // Check against known static patterns
    for (const pattern of this.staticPatterns) {
      if (pattern.test(url)) {
        return true;
      }
    }

    // Check domain history
    const domain = new URL(url).hostname;
    const classification = this.domainClassification.get(domain);

    if (classification) {
      // If Python has succeeded more than failed, assume static
      return classification.pythonSuccesses > classification.pythonFailures;
    }

    return false;
  }

  /**
   * Update domain classification based on result
   * @param {string} url - URL that was scraped
   * @param {string} provider - 'python' or 'scraperapi'
   * @param {boolean} success - Whether the scrape succeeded
   * @private
   */
  _updateClassification(url, provider, success) {
    if (!this.enableLearning) return;

    const domain = new URL(url).hostname;

    if (!this.domainClassification.has(domain)) {
      this.domainClassification.set(domain, {
        pythonSuccesses: 0,
        pythonFailures: 0,
        scraperAPISuccesses: 0,
        scraperAPIFailures: 0,
      });
    }

    const stats = this.domainClassification.get(domain);

    if (provider === 'python') {
      if (success) {
        stats.pythonSuccesses++;
        this.stats.pythonSuccesses++;
      } else {
        stats.pythonFailures++;
        this.stats.pythonFailures++;
      }
    } else if (provider === 'scraperapi') {
      if (success) {
        stats.scraperAPISuccesses++;
        this.stats.scraperAPISuccesses++;
      } else {
        stats.scraperAPIFailures++;
        this.stats.scraperAPIFailures++;
      }
    }
  }

  /**
   * Scrape a URL using the best available provider
   * @param {string} url - URL to scrape
   * @param {Object} [options={}] - Scraping options
   * @param {string} [options.format='text'] - Output format: 'text', 'markdown', 'structured'
   * @param {boolean} [options.forcePython=false] - Force use of Python scraper
   * @param {boolean} [options.forceScraperAPI=false] - Force use of ScraperAPI
   * @param {boolean} [options.useCache=true] - Use Redis cache if available
   * @param {AbortSignal} [options.signal] - AbortSignal for request cancellation
   * @returns {Promise<Object>} Scraped data with metadata
   */
  async scrape(url, options = {}) {
    const {
      format = 'text',
      forcePython = false,
      forceScraperAPI = false,
      useCache = true,
      signal,
    } = options;

    // Determine provider strategy
    let usePython = true;
    let useScraperAPIFallback = Boolean(this.scraperAPI);

    if (forceScraperAPI) {
      if (!this.scraperAPI) {
        throw createError(
          'ScraperAPI is not configured. Provide an API key to use ScraperAPI.',
          ErrorType.API_KEY_MISSING
        );
      }
      usePython = false;
      useScraperAPIFallback = false;
    } else if (forcePython) {
      useScraperAPIFallback = false;
    } else if (!this.preferFree && this.scraperAPI) {
      // User prefers paid ScraperAPI
      usePython = false;
      useScraperAPIFallback = false;
    } else {
      // Smart routing based on URL characteristics
      if (this._isLikelyJSHeavy(url) && this.scraperAPI) {
        usePython = false;
      } else if (this._isLikelyStatic(url)) {
        usePython = true;
      }
    }

    let result;
    let provider;
    let error;

    // Try primary provider
    if (usePython) {
      try {
        console.log(`[HybridScraper] Using Python scraper for ${url}`);

        if (format === 'text') {
          const data = await this.pythonScraper.getText(url, { signal });
          result = { status: 'success', data, format: 'text', provider: 'python' };
        } else if (format === 'markdown') {
          const data = await this.pythonScraper.getMarkdown(url, { signal });
          result = { status: 'success', data, format: 'markdown', provider: 'python' };
        } else if (format === 'structured') {
          const data = await this.pythonScraper.getStructured(url, { signal });
          result = { status: 'success', data, format: 'structured', provider: 'python' };
        } else {
          const data = await this.pythonScraper.scrape(url, { format, signal });
          result = { ...data, provider: 'python' };
        }

        this._updateClassification(url, 'python', true);
        provider = 'python';
      } catch (err) {
        console.warn(`[HybridScraper] Python scraper failed for ${url}:`, err.message);
        this._updateClassification(url, 'python', false);
        error = err;
      }
    } else if (this.scraperAPI) {
      try {
        console.log(`[HybridScraper] Using ScraperAPI for ${url}`);
        const data = await this.scraperAPI.scrape(url);
        result = { status: 'success', data, format: 'html', provider: 'scraperapi' };
        this._updateClassification(url, 'scraperapi', true);
        provider = 'scraperapi';
      } catch (err) {
        console.warn(`[HybridScraper] ScraperAPI failed for ${url}:`, err.message);
        this._updateClassification(url, 'scraperapi', false);
        error = err;
      }
    }

    // Try fallback if primary failed
    if (!result && error && useScraperAPIFallback && !forceScraperAPI) {
      try {
        console.log(`[HybridScraper] Falling back to ScraperAPI for ${url}`);
        const data = await this.scraperAPI.scrape(url);
        result = { status: 'success', data, format: 'html', provider: 'scraperapi-fallback' };
        this._updateClassification(url, 'scraperapi', true);
        provider = 'scraperapi';
      } catch (fallbackErr) {
        this._updateClassification(url, 'scraperapi', false);
        // Both failed, throw original error
        throw error;
      }
    }

    if (!result && error) {
      throw error;
    }

    if (!result) {
      throw createError(
        'No scraping provider available. Configure ScraperAPI key for fallback.',
        ErrorType.API_KEY_MISSING
      );
    }

    // Add metadata
    result.url = url;
    result.timestamp = new Date().toISOString();
    result.cached = false;

    return result;
  }

  /**
   * Get clean text from URL
   * @param {string} url - URL to scrape
   * @param {Object} [options={}] - Options
   * @returns {Promise<string>} Clean text content
   */
  async getText(url, options = {}) {
    const result = await this.scrape(url, { ...options, format: 'text' });
    return result.data;
  }

  /**
   * Get markdown from URL
   * @param {string} url - URL to scrape
   * @param {Object} [options={}] - Options
   * @returns {Promise<string>} Markdown content
   */
  async getMarkdown(url, options = {}) {
    const result = await this.scrape(url, { ...options, format: 'markdown' });
    return result.data;
  }

  /**
   * Get structured data from URL
   * @param {string} url - URL to scrape
   * @param {Object} [options={}] - Options
   * @returns {Promise<Object>} Structured data
   */
  async getStructured(url, options = {}) {
    const result = await this.scrape(url, { ...options, format: 'structured' });
    return result.data;
  }

  /**
   * Search for keywords in page (uses Python scraper)
   * @param {string} url - URL to search
   * @param {Array<string>} keywords - Keywords to search for
   * @param {Object} [options={}] - Options
   * @returns {Promise<Object>} Search results
   */
  async search(url, keywords, options = {}) {
    return await this.pythonScraper.search(url, keywords, options);
  }

  /**
   * Extract data with CSS selectors (uses Python scraper)
   * @param {string} url - URL to scrape
   * @param {Object<string, string>} selectors - CSS selectors
   * @param {Object} [options={}] - Options
   * @returns {Promise<Object>} Extracted data
   */
  async extract(url, selectors, options = {}) {
    return await this.pythonScraper.extract(url, selectors, options);
  }

  /**
   * Get links from page (uses Python scraper)
   * @param {string} url - URL to scrape
   * @param {Object} [options={}] - Options
   * @returns {Promise<Array<string>>} Array of URLs
   */
  async getLinks(url, options = {}) {
    return await this.pythonScraper.getLinks(url, options);
  }

  /**
   * Get scraper statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      totalRequests: this.stats.pythonSuccesses + this.stats.pythonFailures +
                     this.stats.scraperAPISuccesses + this.stats.scraperAPIFailures,
      pythonSuccessRate: this.stats.pythonSuccesses /
                         (this.stats.pythonSuccesses + this.stats.pythonFailures) || 0,
      scraperAPISuccessRate: this.stats.scraperAPISuccesses /
                            (this.stats.scraperAPISuccesses + this.stats.scraperAPIFailures) || 0,
      cacheHitRate: this.stats.cacheHits /
                   (this.stats.cacheHits + this.stats.cacheMisses) || 0,
      domainsLearned: this.domainClassification.size,
    };
  }

  /**
   * Get domain classification history
   * @returns {Map} Domain classification map
   */
  getDomainHistory() {
    return new Map(this.domainClassification);
  }

  /**
   * Clear domain classification history
   */
  clearHistory() {
    this.domainClassification.clear();
  }

  /**
   * Export configuration and history
   * @returns {Object} Exportable state
   */
  export() {
    return {
      stats: this.stats,
      domainClassification: Array.from(this.domainClassification.entries()),
      config: {
        preferFree: this.preferFree,
        enableLearning: this.enableLearning,
        hasScraperAPI: Boolean(this.scraperAPI),
      },
    };
  }

  /**
   * Import configuration and history
   * @param {Object} state - Previously exported state
   */
  import(state) {
    if (state.stats) {
      this.stats = { ...this.stats, ...state.stats };
    }
    if (state.domainClassification) {
      this.domainClassification = new Map(state.domainClassification);
    }
  }
}

export default HybridScraperAPI;
