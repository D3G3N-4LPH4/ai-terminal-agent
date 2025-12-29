/**
 * Scraper MCP (Model Context Protocol) Server
 * Exposes web scraping capabilities as MCP tools for AI agents
 *
 * Available Tools:
 * - scrape_webpage: Scrape any URL with intelligent provider selection
 * - search_webpage: Search for keywords in page content
 * - extract_data: Extract data using CSS selectors
 * - get_links: Get all links from a page
 *
 * @class ScraperMCP
 */

import { HybridScraperAPI } from './HybridScraperAPI.js';
import { createError, ErrorType } from '../utils/errorHandler.js';

export class ScraperMCP {
  /**
   * Create a Scraper MCP server
   * @param {string} [scraperApiKey] - Optional ScraperAPI key for paid fallback
   */
  constructor(scraperApiKey) {
    this.scraper = new HybridScraperAPI(scraperApiKey);
    this.serverName = 'scraper-mcp';
    this.version = '1.0.0';
  }

  /**
   * List available MCP tools
   * @returns {Promise<Array>} Array of tool definitions
   */
  async listTools() {
    return [
      {
        name: 'scrape_webpage',
        description: 'Scrape a webpage and return clean content. Automatically chooses between free Python scraper and paid ScraperAPI based on site complexity. Supports text, markdown, and structured output formats.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL to scrape (must start with http:// or https://)',
            },
            format: {
              type: 'string',
              enum: ['text', 'markdown', 'structured'],
              default: 'text',
              description: 'Output format: text (clean text), markdown (converted to MD), structured (headings, paragraphs, links, images)',
            },
            useCache: {
              type: 'boolean',
              default: true,
              description: 'Use Redis cache if available (1 hour TTL)',
            },
            forcePython: {
              type: 'boolean',
              default: false,
              description: 'Force use of free Python scraper (may fail on JS-heavy sites)',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'search_webpage',
        description: 'Search for keywords in a webpage and return matches with surrounding context. Useful for finding specific information without reading the entire page.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL to search',
            },
            keywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'Keywords to search for (case-insensitive)',
            },
          },
          required: ['url', 'keywords'],
        },
      },
      {
        name: 'extract_data',
        description: 'Extract specific data from a webpage using CSS selectors. Perfect for structured data extraction like prices, titles, descriptions, etc.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL to extract data from',
            },
            selectors: {
              type: 'object',
              description: 'Object mapping field names to CSS selectors. Example: {"title": "h1.product-title", "price": ".price-value"}',
              additionalProperties: { type: 'string' },
            },
          },
          required: ['url', 'selectors'],
        },
      },
      {
        name: 'get_links',
        description: 'Get all links from a webpage. Useful for discovering related pages, sitemap generation, or link analysis.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL to extract links from',
            },
            filterInternal: {
              type: 'boolean',
              default: false,
              description: 'If true, only return links from the same domain',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'scraper_stats',
        description: 'Get statistics about scraper usage, success rates, and cache performance. Useful for monitoring and optimization.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  /**
   * Call an MCP tool
   * @param {string} toolName - Name of the tool to call
   * @param {Object} args - Tool arguments
   * @returns {Promise<Object>} Tool result
   */
  async callTool(toolName, args = {}) {
    try {
      switch (toolName) {
        case 'scrape_webpage':
          return await this._scrapeWebpage(args);

        case 'search_webpage':
          return await this._searchWebpage(args);

        case 'extract_data':
          return await this._extractData(args);

        case 'get_links':
          return await this._getLinks(args);

        case 'scraper_stats':
          return await this._getStats(args);

        default:
          throw createError(
            `Unknown tool: ${toolName}. Available tools: ${(await this.listTools()).map(t => t.name).join(', ')}`,
            ErrorType.VALIDATION_ERROR
          );
      }
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error calling ${toolName}: ${error.message}`,
          },
        ],
      };
    }
  }

  /**
   * Scrape webpage tool implementation
   * @private
   */
  async _scrapeWebpage(args) {
    const { url, format = 'text', useCache = true, forcePython = false } = args;

    if (!url) {
      throw createError('URL is required', ErrorType.VALIDATION_ERROR);
    }

    const result = await this.scraper.scrape(url, {
      format,
      useCache,
      forcePython,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            url: result.url,
            format: result.format,
            provider: result.provider,
            cached: result.cached,
            timestamp: result.timestamp,
            data: result.data,
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Search webpage tool implementation
   * @private
   */
  async _searchWebpage(args) {
    const { url, keywords } = args;

    if (!url || !keywords || !Array.isArray(keywords)) {
      throw createError('URL and keywords array are required', ErrorType.VALIDATION_ERROR);
    }

    const result = await this.scraper.search(url, keywords);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            url: result.url || url,
            keywords_found: result.keywords_found,
            matches: result.matches,
            status: result.status,
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Extract data tool implementation
   * @private
   */
  async _extractData(args) {
    const { url, selectors } = args;

    if (!url || !selectors || typeof selectors !== 'object') {
      throw createError('URL and selectors object are required', ErrorType.VALIDATION_ERROR);
    }

    const result = await this.scraper.extract(url, selectors);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            url,
            selectors,
            data: result,
            status: 'success',
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Get links tool implementation
   * @private
   */
  async _getLinks(args) {
    const { url, filterInternal = false } = args;

    if (!url) {
      throw createError('URL is required', ErrorType.VALIDATION_ERROR);
    }

    const links = await this.scraper.getLinks(url, { filterInternal });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            url,
            filterInternal,
            links,
            total: links.length,
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Get stats tool implementation
   * @private
   */
  async _getStats(args) {
    const stats = this.scraper.getStats();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            ...stats,
            message: 'Scraper statistics - tracks Python vs ScraperAPI usage, success rates, and cache performance',
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Get server information
   * @returns {Object} Server info
   */
  getServerInfo() {
    return {
      name: this.serverName,
      version: this.version,
      description: 'Web scraping MCP server with intelligent provider selection and caching',
      capabilities: ['tools'],
      tools: [
        'scrape_webpage',
        'search_webpage',
        'extract_data',
        'get_links',
        'scraper_stats',
      ],
    };
  }
}

export default ScraperMCP;
