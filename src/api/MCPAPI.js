// MCP (Model Context Protocol) API Client
// Enables querying documentation servers programmatically

import { fetchWithTimeout } from '../utils/fetchWithTimeout.js';
import { caches, cachedAPICall } from '../utils/requestCache.js';
import { validateAPIResponse, createError, ErrorType } from '../utils/errorHandler.js';

class MCPAPI {
  constructor() {
    // Default MCP documentation servers
    this.servers = {
      langchain: 'https://docs.langchain.com/mcp',
      mintlify: 'https://mintlify.com/mcp',
    };
  }

  /**
   * Add a custom MCP server
   * @param {string} name - Server identifier
   * @param {string} url - MCP server URL
   */
  addServer(name, url) {
    this.servers[name] = url;
  }

  /**
   * Query an MCP documentation server
   * @param {string} query - Search query
   * @param {string} serverName - Which server to query (default: langchain)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Search results
   */
  async query(query, serverName = 'langchain', options = {}) {
    const serverUrl = this.servers[serverName];

    if (!serverUrl) {
      throw createError(
        `MCP server '${serverName}' not found. Available: ${Object.keys(this.servers).join(', ')}`,
        ErrorType.NOT_FOUND
      );
    }

    // Use cache for documentation queries (10min TTL)
    return cachedAPICall(
      caches.research,
      'mcp_query',
      async () => {
        try {
          const response = await fetchWithTimeout(
            serverUrl,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'tools/call',
                params: {
                  name: 'search_docs',
                  arguments: {
                    query: query,
                    max_results: options.maxResults || 5,
                  },
                },
              }),
            },
            30000 // 30s timeout
          );

          if (!response.ok) {
            await validateAPIResponse(response, `MCP Server (${serverName})`);
          }

          const data = await response.json();

          // Handle MCP JSON-RPC response format
          if (data.error) {
            throw createError(
              `MCP Error: ${data.error.message}`,
              ErrorType.UNKNOWN
            );
          }

          return this.normalizeResults(data.result);
        } catch (error) {
          console.error(`MCP query error (${serverName}):`, error);
          throw error;
        }
      },
      { query, serverName, maxResults: options.maxResults }
    );
  }

  /**
   * Search multiple MCP servers simultaneously
   * @param {string} query - Search query
   * @param {Array<string>} servers - Server names to query
   * @returns {Promise<Object>} - Combined results
   */
  async queryMultiple(query, servers = ['langchain']) {
    const promises = servers.map((server) =>
      this.query(query, server).catch((err) => ({
        server,
        error: err.message,
        results: [],
      }))
    );

    const results = await Promise.all(promises);

    return {
      query,
      servers: results.map((r) => r.server || r),
      combined_results: results.flatMap((r) => r.results || []),
      total_results: results.reduce(
        (sum, r) => sum + (r.results?.length || 0),
        0
      ),
    };
  }

  /**
   * Fetch llms.txt from a documentation site
   * @param {string} baseUrl - Base URL of the documentation site
   * @returns {Promise<string>} - llms.txt content
   */
  async fetchLLMsTxt(baseUrl) {
    const url = `${baseUrl.replace(/\/$/, '')}/llms.txt`;

    try {
      const response = await fetchWithTimeout(url, {}, 10000);

      if (!response.ok) {
        throw createError(
          `llms.txt not found at ${url}`,
          ErrorType.NOT_FOUND
        );
      }

      return await response.text();
    } catch (error) {
      console.error('llms.txt fetch error:', error);
      throw error;
    }
  }

  /**
   * Get available documentation for a topic
   * @param {string} topic - Topic to search for
   * @param {string} serverName - MCP server to query
   * @returns {Promise<Object>} - Documentation results
   */
  async getDocumentation(topic, serverName = 'langchain') {
    const results = await this.query(topic, serverName, { maxResults: 3 });

    return {
      topic,
      source: serverName,
      documentation: results.results.map((result) => ({
        title: result.title,
        url: result.url,
        excerpt: result.excerpt,
        relevance: result.score,
      })),
      count: results.results.length,
    };
  }

  /**
   * Normalize MCP server results to a consistent format
   * @param {Object} rawResults - Raw results from MCP server
   * @returns {Object} - Normalized results
   */
  normalizeResults(rawResults) {
    // Handle different MCP server response formats
    if (Array.isArray(rawResults)) {
      return {
        results: rawResults.map((item, index) => ({
          title: item.title || item.name || 'Untitled',
          url: item.url || item.link || '',
          excerpt: item.content || item.description || item.excerpt || '',
          score: item.relevance || item.score || 1.0 - index * 0.1,
        })),
        total: rawResults.length,
      };
    }

    if (rawResults.content) {
      // Handle content-based response
      return {
        results: [
          {
            title: rawResults.title || 'Documentation',
            url: rawResults.url || '',
            excerpt: rawResults.content,
            score: 1.0,
          },
        ],
        total: 1,
      };
    }

    // Fallback for unknown format
    return {
      results: [],
      total: 0,
      raw: rawResults,
    };
  }

  /**
   * Get list of available MCP servers
   * @returns {Object} - Available servers
   */
  getAvailableServers() {
    return {
      servers: Object.keys(this.servers),
      count: Object.keys(this.servers).length,
      details: Object.entries(this.servers).map(([name, url]) => ({
        name,
        url,
      })),
    };
  }

  /**
   * Test MCP server connectivity
   * @param {string} serverName - Server to test
   * @returns {Promise<Object>} - Connection status
   */
  async testConnection(serverName = 'langchain') {
    const serverUrl = this.servers[serverName];

    if (!serverUrl) {
      return {
        server: serverName,
        status: 'error',
        message: 'Server not found',
      };
    }

    try {
      const startTime = Date.now();
      const response = await fetchWithTimeout(serverUrl, {}, 5000);
      const responseTime = Date.now() - startTime;

      return {
        server: serverName,
        status: response.ok ? 'connected' : 'error',
        responseTime: `${responseTime}ms`,
        url: serverUrl,
      };
    } catch (error) {
      return {
        server: serverName,
        status: 'error',
        message: error.message,
        url: serverUrl,
      };
    }
  }
}

export default MCPAPI;
