/**
 * Python LLM Scraper API Client
 * Node.js bridge to Python-based web scraper
 * Provides free web scraping alternative to ScraperAPI
 *
 * @class PythonScraperAPI
 */

import { createError, ErrorType } from '../utils/errorHandler.js';

export class PythonScraperAPI {
  /**
   * Create a Python scraper API client
   * @param {string} [pythonPath='python'] - Path to Python executable
   * @param {string} [scriptPath='../webscrape/llm_scraper.py'] - Path to Python scraper script
   */
  constructor(pythonPath = 'python', scriptPath = '../webscrape/llm_scraper.py') {
    this.pythonPath = pythonPath;
    this.scriptPath = scriptPath;
    this.backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  }

  /**
   * Scrape a webpage and return clean content
   * @param {string} url - URL to scrape
   * @param {Object} [options={}] - Scraping options
   * @param {string} [options.format='text'] - Output format: 'text', 'json', 'markdown', 'structured'
   * @param {boolean} [options.includeMetadata=true] - Include page metadata
   * @param {AbortSignal} [options.signal] - AbortSignal for request cancellation
   * @returns {Promise<Object>} Scraped data
   * @throws {Error} If scraping fails
   */
  async scrape(url, options = {}) {
    const { format = 'text', includeMetadata = true, signal } = options;

    try {
      // Call backend proxy endpoint that executes Python scraper
      const response = await fetch(`${this.backendUrl}/api/python-scraper/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          format,
          includeMetadata,
        }),
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw createError(
          `Python scraper failed: ${errorData.error || response.statusText}`,
          ErrorType.API_ERROR
        );
      }

      const data = await response.json();

      if (data.status === 'error') {
        throw createError(
          `Scraping failed: ${data.error}`,
          data.error_type === 'ValueError' ? ErrorType.VALIDATION_ERROR : ErrorType.API_ERROR
        );
      }

      return data;
    } catch (error) {
      // Handle CORS errors
      if (error.message?.includes('Failed to fetch') || error.message?.includes('CORS') || error.name === 'TypeError') {
        throw createError(
          "CORS Error: Python scraper backend not available.\n\n" +
          "Solution: Backend server not running. Start it with 'npm start'",
          ErrorType.NETWORK_ERROR
        );
      }

      throw error;
    }
  }

  /**
   * Get clean text content from a webpage
   * @param {string} url - URL to scrape
   * @param {Object} [options={}] - Options
   * @param {AbortSignal} [options.signal] - AbortSignal for request cancellation
   * @returns {Promise<string>} Clean text content
   */
  async getText(url, options = {}) {
    const result = await this.scrape(url, { ...options, format: 'text' });
    return result.data;
  }

  /**
   * Get webpage content as markdown
   * @param {string} url - URL to scrape
   * @param {Object} [options={}] - Options
   * @param {AbortSignal} [options.signal] - AbortSignal for request cancellation
   * @returns {Promise<string>} Markdown content
   */
  async getMarkdown(url, options = {}) {
    const result = await this.scrape(url, { ...options, format: 'markdown' });
    return result.data;
  }

  /**
   * Get structured data from webpage (headings, paragraphs, links, images)
   * @param {string} url - URL to scrape
   * @param {Object} [options={}] - Options
   * @param {AbortSignal} [options.signal] - AbortSignal for request cancellation
   * @returns {Promise<Object>} Structured data
   */
  async getStructured(url, options = {}) {
    const result = await this.scrape(url, { ...options, format: 'structured' });
    return result.data;
  }

  /**
   * Get all links from a webpage
   * @param {string} url - URL to scrape
   * @param {Object} [options={}] - Options
   * @param {boolean} [options.filterInternal=false] - Only return links from same domain
   * @param {AbortSignal} [options.signal] - AbortSignal for request cancellation
   * @returns {Promise<Array<string>>} Array of URLs
   */
  async getLinks(url, options = {}) {
    const { filterInternal = false, signal } = options;

    try {
      const response = await fetch(`${this.backendUrl}/api/python-scraper/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          filterInternal,
        }),
        signal,
      });

      if (!response.ok) {
        throw createError('Failed to get links', ErrorType.API_ERROR);
      }

      const data = await response.json();
      return data.links || [];
    } catch (error) {
      if (error.message?.includes('Failed to fetch') || error.message?.includes('CORS') || error.name === 'TypeError') {
        throw createError(
          "CORS Error: Python scraper backend not available.\n\n" +
          "Solution: Backend server not running. Start it with 'npm start'",
          ErrorType.NETWORK_ERROR
        );
      }
      throw error;
    }
  }

  /**
   * Search for keywords in webpage content
   * @param {string} url - URL to scrape
   * @param {Array<string>} keywords - Keywords to search for
   * @param {Object} [options={}] - Options
   * @param {AbortSignal} [options.signal] - AbortSignal for request cancellation
   * @returns {Promise<Object>} Search results with keyword matches and context
   */
  async search(url, keywords, options = {}) {
    const { signal } = options;

    try {
      const response = await fetch(`${this.backendUrl}/api/python-scraper/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          keywords,
        }),
        signal,
      });

      if (!response.ok) {
        throw createError('Search failed', ErrorType.API_ERROR);
      }

      const data = await response.json();

      if (data.status === 'error') {
        throw createError(`Search failed: ${data.error}`, ErrorType.API_ERROR);
      }

      return data;
    } catch (error) {
      if (error.message?.includes('Failed to fetch') || error.message?.includes('CORS') || error.name === 'TypeError') {
        throw createError(
          "CORS Error: Python scraper backend not available.\n\n" +
          "Solution: Backend server not running. Start it with 'npm start'",
          ErrorType.NETWORK_ERROR
        );
      }
      throw error;
    }
  }

  /**
   * Extract specific data using CSS selectors
   * @param {string} url - URL to scrape
   * @param {Object<string, string>} selectors - Object mapping field names to CSS selectors
   * @param {Object} [options={}] - Options
   * @param {AbortSignal} [options.signal] - AbortSignal for request cancellation
   * @returns {Promise<Object>} Extracted data
   * @example
   * // Extract product data
   * const data = await scraper.extract('https://example.com/product', {
   *   title: 'h1.product-title',
   *   price: '.price-value',
   *   description: '.product-description'
   * });
   */
  async extract(url, selectors, options = {}) {
    const { signal } = options;

    try {
      const response = await fetch(`${this.backendUrl}/api/python-scraper/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          selectors,
        }),
        signal,
      });

      if (!response.ok) {
        throw createError('Extraction failed', ErrorType.API_ERROR);
      }

      const data = await response.json();

      if (data.status === 'error') {
        throw createError(`Extraction failed: ${data.error}`, ErrorType.API_ERROR);
      }

      return data.data;
    } catch (error) {
      if (error.message?.includes('Failed to fetch') || error.message?.includes('CORS') || error.name === 'TypeError') {
        throw createError(
          "CORS Error: Python scraper backend not available.\n\n" +
          "Solution: Backend server not running. Start it with 'npm start'",
          ErrorType.NETWORK_ERROR
        );
      }
      throw error;
    }
  }

  /**
   * Check if Python scraper is available
   * @returns {Promise<boolean>} True if available
   */
  async isAvailable() {
    try {
      const response = await fetch(`${this.backendUrl}/api/python-scraper/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export default PythonScraperAPI;
