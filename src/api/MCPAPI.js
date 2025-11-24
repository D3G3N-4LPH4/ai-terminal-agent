// MCP (Model Context Protocol) API Client
// Enables querying documentation servers programmatically
// Implements MCP spec: https://modelcontextprotocol.io/

import { fetchWithTimeout } from '../utils/fetchWithTimeout.js';
import { caches, cachedAPICall } from '../utils/requestCache.js';
import { validateAPIResponse, createError, ErrorType } from '../utils/errorHandler.js';

// Storage key for persisted servers
const MCP_SERVERS_STORAGE_KEY = 'mcp_custom_servers';

class MCPAPI {
  constructor() {
    // Default MCP documentation servers (verified working endpoints)
    this.defaultServers = {
      // Context7 - Library documentation MCP
      context7: {
        url: 'https://mcp.context7.com',
        description: 'Library documentation lookup',
        capabilities: ['tools'],
      },
      // Exa - Web search MCP
      exa: {
        url: 'https://mcp.exa.ai',
        description: 'AI-powered web search',
        capabilities: ['tools'],
      },
      // Browserbase - Web browsing MCP
      browserbase: {
        url: 'https://mcp.browserbase.com',
        description: 'Web browsing and scraping',
        capabilities: ['tools'],
      },
      // Firecrawl - Web crawling MCP
      firecrawl: {
        url: 'https://mcp.firecrawl.dev',
        description: 'Web crawling and extraction',
        capabilities: ['tools'],
      },
    };

    // Load persisted custom servers
    this.customServers = this.loadCustomServers();

    // Merge default and custom servers
    this.servers = { ...this.defaultServers, ...this.customServers };

    // Cache for server capabilities
    this.capabilitiesCache = new Map();

    // Retry configuration
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 10000, // 10 seconds
    };
  }

  /**
   * Load custom servers from localStorage
   * @returns {Object} - Custom servers
   */
  loadCustomServers() {
    try {
      const stored = localStorage.getItem(MCP_SERVERS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Failed to load custom MCP servers:', error);
      return {};
    }
  }

  /**
   * Save custom servers to localStorage
   */
  saveCustomServers() {
    try {
      localStorage.setItem(MCP_SERVERS_STORAGE_KEY, JSON.stringify(this.customServers));
    } catch (error) {
      console.warn('Failed to save custom MCP servers:', error);
    }
  }

  /**
   * Execute a fetch with exponential backoff retry
   * @param {Function} fetchFn - Function that returns a fetch promise
   * @param {string} context - Context for error messages
   * @returns {Promise<Response>} - Fetch response
   */
  async fetchWithRetry(fetchFn, context = 'MCP request') {
    let lastError;

    for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await fetchFn();

        // Don't retry on client errors (4xx), only server errors (5xx)
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }

        lastError = new Error(`${context} failed with status ${response.status}`);
      } catch (error) {
        lastError = error;
      }

      // Calculate delay with exponential backoff + jitter
      if (attempt < this.retryConfig.maxRetries - 1) {
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          this.retryConfig.maxDelay
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Add a custom MCP server
   * @param {string} name - Server identifier
   * @param {string} url - MCP server URL
   * @param {string} description - Server description
   * @param {boolean} persist - Whether to persist to localStorage
   */
  addServer(name, url, description = '', persist = true) {
    const serverConfig = {
      url,
      description,
      capabilities: [], // Will be detected on first use
      custom: true,
    };

    this.servers[name] = serverConfig;

    if (persist) {
      this.customServers[name] = serverConfig;
      this.saveCustomServers();
    }

    return { success: true, server: name };
  }

  /**
   * Remove a custom MCP server
   * @param {string} name - Server identifier
   */
  removeServer(name) {
    if (this.defaultServers[name]) {
      return { success: false, error: 'Cannot remove default server' };
    }

    delete this.servers[name];
    delete this.customServers[name];
    this.capabilitiesCache.delete(name);
    this.saveCustomServers();

    return { success: true };
  }

  /**
   * Get server URL from server config
   * @param {string} serverName - Server identifier
   * @returns {string} - Server URL
   */
  getServerUrl(serverName) {
    const server = this.servers[serverName];
    if (!server) {
      throw createError(
        `MCP server '${serverName}' not found. Available: ${Object.keys(this.servers).join(', ')}`,
        ErrorType.NOT_FOUND
      );
    }
    return typeof server === 'string' ? server : server.url;
  }

  /**
   * Make a JSON-RPC request to an MCP server
   * @param {string} serverName - Server identifier
   * @param {string} method - JSON-RPC method
   * @param {Object} params - Method parameters
   * @param {number} timeout - Request timeout in ms
   * @returns {Promise<Object>} - Response result
   */
  async rpcRequest(serverName, method, params = {}, timeout = 30000) {
    const serverUrl = this.getServerUrl(serverName);

    const response = await this.fetchWithRetry(
      () => fetchWithTimeout(
        serverUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method,
            params,
          }),
        },
        timeout
      ),
      `MCP ${method} (${serverName})`
    );

    if (!response.ok) {
      await validateAPIResponse(response, `MCP Server (${serverName})`);
    }

    const data = await response.json();

    if (data.error) {
      throw createError(
        `MCP Error: ${data.error.message || JSON.stringify(data.error)}`,
        ErrorType.UNKNOWN
      );
    }

    return data.result;
  }

  // ==================== MCP PROTOCOL METHODS ====================

  /**
   * Initialize connection and get server capabilities
   * @param {string} serverName - Server identifier
   * @returns {Promise<Object>} - Server capabilities
   */
  async initialize(serverName) {
    // Check cache first
    if (this.capabilitiesCache.has(serverName)) {
      return this.capabilitiesCache.get(serverName);
    }

    try {
      const result = await this.rpcRequest(serverName, 'initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: { listChanged: true },
          sampling: {},
        },
        clientInfo: {
          name: 'ai-terminal-agent',
          version: '1.0.0',
        },
      });

      const capabilities = {
        serverInfo: result.serverInfo || {},
        capabilities: result.capabilities || {},
        protocolVersion: result.protocolVersion || 'unknown',
        tools: result.capabilities?.tools ? true : false,
        resources: result.capabilities?.resources ? true : false,
        prompts: result.capabilities?.prompts ? true : false,
      };

      // Cache capabilities
      this.capabilitiesCache.set(serverName, capabilities);

      // Update server config with detected capabilities
      if (this.servers[serverName]) {
        const capList = [];
        if (capabilities.tools) capList.push('tools');
        if (capabilities.resources) capList.push('resources');
        if (capabilities.prompts) capList.push('prompts');

        if (typeof this.servers[serverName] === 'object') {
          this.servers[serverName].capabilities = capList;
        }
      }

      return capabilities;
    } catch (error) {
      console.warn(`Failed to initialize ${serverName}:`, error.message);
      return {
        serverInfo: {},
        capabilities: {},
        protocolVersion: 'unknown',
        error: error.message,
      };
    }
  }

  /**
   * List available tools on an MCP server
   * @param {string} serverName - Server identifier
   * @returns {Promise<Object>} - Available tools
   */
  async listTools(serverName) {
    return cachedAPICall(
      caches.research,
      'mcp_tools',
      async () => {
        const result = await this.rpcRequest(serverName, 'tools/list');
        return {
          server: serverName,
          tools: result.tools || [],
          count: result.tools?.length || 0,
        };
      },
      { serverName }
    );
  }

  /**
   * Call a tool on an MCP server
   * @param {string} serverName - Server identifier
   * @param {string} toolName - Tool to call
   * @param {Object} args - Tool arguments
   * @returns {Promise<Object>} - Tool result
   */
  async callTool(serverName, toolName, args = {}) {
    const result = await this.rpcRequest(serverName, 'tools/call', {
      name: toolName,
      arguments: args,
    });

    return {
      server: serverName,
      tool: toolName,
      content: result.content || [],
      isError: result.isError || false,
    };
  }

  /**
   * List available resources on an MCP server
   * @param {string} serverName - Server identifier
   * @returns {Promise<Object>} - Available resources
   */
  async listResources(serverName) {
    return cachedAPICall(
      caches.research,
      'mcp_resources',
      async () => {
        const result = await this.rpcRequest(serverName, 'resources/list');
        return {
          server: serverName,
          resources: result.resources || [],
          count: result.resources?.length || 0,
        };
      },
      { serverName }
    );
  }

  /**
   * Read a resource from an MCP server
   * @param {string} serverName - Server identifier
   * @param {string} uri - Resource URI
   * @returns {Promise<Object>} - Resource content
   */
  async readResource(serverName, uri) {
    const result = await this.rpcRequest(serverName, 'resources/read', { uri });

    return {
      server: serverName,
      uri,
      contents: result.contents || [],
    };
  }

  /**
   * List available prompts on an MCP server
   * @param {string} serverName - Server identifier
   * @returns {Promise<Object>} - Available prompts
   */
  async listPrompts(serverName) {
    return cachedAPICall(
      caches.research,
      'mcp_prompts',
      async () => {
        const result = await this.rpcRequest(serverName, 'prompts/list');
        return {
          server: serverName,
          prompts: result.prompts || [],
          count: result.prompts?.length || 0,
        };
      },
      { serverName }
    );
  }

  /**
   * Get a prompt from an MCP server
   * @param {string} serverName - Server identifier
   * @param {string} promptName - Prompt name
   * @param {Object} args - Prompt arguments
   * @returns {Promise<Object>} - Prompt content
   */
  async getPrompt(serverName, promptName, args = {}) {
    const result = await this.rpcRequest(serverName, 'prompts/get', {
      name: promptName,
      arguments: args,
    });

    return {
      server: serverName,
      prompt: promptName,
      description: result.description || '',
      messages: result.messages || [],
    };
  }

  // ==================== HIGH-LEVEL QUERY METHODS ====================

  /**
   * Query an MCP documentation server
   * @param {string} query - Search query
   * @param {string} serverName - Which server to query (default: context7)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Search results
   */
  async query(query, serverName = 'context7', options = {}) {
    // Use cache for documentation queries (10min TTL)
    return cachedAPICall(
      caches.research,
      'mcp_query',
      async () => {
        try {
          // First, try to list tools to find the right one
          let searchTool = 'search_docs';
          try {
            const tools = await this.listTools(serverName);
            const searchTools = tools.tools.filter(t =>
              t.name.includes('search') ||
              t.name.includes('query') ||
              t.name.includes('lookup')
            );
            if (searchTools.length > 0) {
              searchTool = searchTools[0].name;
            }
          } catch {
            // Use default search tool
          }

          const result = await this.callTool(serverName, searchTool, {
            query,
            max_results: options.maxResults || 5,
          });

          return this.normalizeResults(result.content);
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
   * @param {Array<string>} servers - Server names to query (default: all servers)
   * @returns {Promise<Object>} - Combined results
   */
  async queryMultiple(query, servers = null) {
    const serverList = servers || Object.keys(this.servers);

    const promises = serverList.map((server) =>
      this.query(query, server).catch((err) => ({
        server,
        error: err.message,
        results: [],
      }))
    );

    const results = await Promise.all(promises);

    return {
      query,
      servers: serverList,
      results: results.map((r, i) => ({
        server: serverList[i],
        success: !r.error,
        error: r.error || null,
        results: r.results || [],
      })),
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
      details: Object.entries(this.servers).map(([name, config]) => ({
        name,
        url: typeof config === 'string' ? config : config.url,
        description: typeof config === 'object' ? config.description : '',
        capabilities: typeof config === 'object' ? config.capabilities : [],
        custom: typeof config === 'object' ? config.custom || false : false,
      })),
      defaultServers: Object.keys(this.defaultServers),
      customServers: Object.keys(this.customServers),
    };
  }

  /**
   * Test MCP server connectivity
   * @param {string} serverName - Server to test
   * @returns {Promise<Object>} - Connection status
   */
  async testConnection(serverName = 'context7') {
    try {
      const serverUrl = this.getServerUrl(serverName);
      const startTime = Date.now();

      // Try to initialize to test full MCP connectivity
      const capabilities = await this.initialize(serverName);
      const responseTime = Date.now() - startTime;

      return {
        server: serverName,
        status: capabilities.error ? 'partial' : 'connected',
        responseTime: `${responseTime}ms`,
        url: serverUrl,
        capabilities: capabilities,
        error: capabilities.error || null,
      };
    } catch (error) {
      return {
        server: serverName,
        status: 'error',
        message: error.message,
      };
    }
  }

  /**
   * Test all configured servers
   * @returns {Promise<Object>} - Connection status for all servers
   */
  async testAllConnections() {
    const serverNames = Object.keys(this.servers);
    const results = await Promise.all(
      serverNames.map(name => this.testConnection(name))
    );

    return {
      total: serverNames.length,
      connected: results.filter(r => r.status === 'connected').length,
      partial: results.filter(r => r.status === 'partial').length,
      failed: results.filter(r => r.status === 'error').length,
      servers: results,
    };
  }

  /**
   * Discover tools across all configured servers
   * @returns {Promise<Object>} - Tools from all servers
   */
  async discoverAllTools() {
    const serverNames = Object.keys(this.servers);
    const results = await Promise.all(
      serverNames.map(async (name) => {
        try {
          const tools = await this.listTools(name);
          return { server: name, ...tools };
        } catch (error) {
          return { server: name, error: error.message, tools: [], count: 0 };
        }
      })
    );

    return {
      servers: results,
      allTools: results.flatMap(r =>
        r.tools.map(t => ({ ...t, server: r.server }))
      ),
      totalTools: results.reduce((sum, r) => sum + r.count, 0),
    };
  }

  /**
   * Get server statistics
   * @returns {Object} - Server stats
   */
  getStats() {
    return {
      totalServers: Object.keys(this.servers).length,
      defaultServers: Object.keys(this.defaultServers).length,
      customServers: Object.keys(this.customServers).length,
      cachedCapabilities: this.capabilitiesCache.size,
      retryConfig: this.retryConfig,
    };
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.capabilitiesCache.clear();
  }

  /**
   * Reset to default servers only
   */
  resetToDefaults() {
    this.customServers = {};
    this.servers = { ...this.defaultServers };
    this.capabilitiesCache.clear();
    this.saveCustomServers();
  }
}

export default MCPAPI;
