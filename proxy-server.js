// Simple Express Proxy Server for AI Terminal Agent
// This solves CORS issues by proxying API requests through a backend

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { FenrirAgent } from './fenrirAgent.js';
import { createClient } from 'redis';

dotenv.config();

// Initialize Redis client for ML caching
let redisClient = null;
let redisConnected = false;

const initRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: false // Disable automatic reconnection
      }
    });

    redisClient.on('error', (err) => {
      // Silently ignore errors if Redis isn't available
      redisConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('ᛟ Redis connected - ML caching enabled');
      redisConnected = true;
    });

    await redisClient.connect();
  } catch (error) {
    console.log('ᚹ Redis unavailable - ML caching disabled');
    redisClient = null;
  }
};

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for your frontend
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://localhost:3000',
  // Add production URLs when deployed
  process.env.FRONTEND_URL,
  'https://ai-terminal-frontend.onrender.com'
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// Health check endpoint for deployment platforms
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    redis: redisConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Proxy endpoint for CoinMarketCap
app.use('/api/cmc', async (req, res) => {
  const apiKey = req.headers['x-cmc_pro_api_key'];
  const endpoint = req.url;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    const response = await fetch(`https://pro-api.coinmarketcap.com/v1${endpoint}`, {
      method: req.method,
      headers: {
        'X-CMC_PRO_API_KEY': apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('CoinMarketCap proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint for Helius (Solana)
app.post('/api/helius/rpc', async (req, res) => {
  const apiKey = req.headers['x-helius-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Helius proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/helius', async (req, res, next) => {
  // Skip the RPC endpoint, let it be handled by the specific route above
  if (req.path === '/rpc') {
    return next();
  }

  const apiKey = req.headers['x-helius-api-key'];
  const endpoint = req.url;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    const separator = endpoint.includes('?') ? '&' : '?';
    const response = await fetch(`https://api.helius.xyz/v0${endpoint}${separator}api-key=${apiKey}`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Helius proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint for Dune Analytics
app.use('/api/dune', async (req, res) => {
  const apiKey = req.headers['x-dune-api-key'];
  const endpoint = req.url;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    const response = await fetch(`https://api.dune.com/api/v1${endpoint}`, {
      method: req.method,
      headers: {
        'X-Dune-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Dune proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint for ScraperAPI - Web Scraping
app.get('/api/scraper', async (req, res) => {
  const apiKey = req.headers['x-scraper-api-key'];
  const url = req.query.url;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      url: url,
      render: req.query.render || 'false',
      country_code: req.query.country_code || 'us'
    });

    const response = await fetch(`https://api.scraperapi.com/?${params.toString()}`);
    const data = await response.text();
    res.send(data);
  } catch (error) {
    console.error('ScraperAPI proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint for ScraperAPI - Google Search
app.get('/api/scraper/google', async (req, res) => {
  const apiKey = req.headers['x-scraper-api-key'];
  const query = req.query.query || req.query.q;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  if (!query) {
    return res.status(400).json({ error: 'Search query required' });
  }

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      query: query,
      num: req.query.num || '10',
      country_code: req.query.country_code || 'us',
      output: req.query.output_format || 'json'
    });

    const response = await fetch(`https://api.scraperapi.com/structured/google/search?${params.toString()}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('ScraperAPI Google Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CoinGecko MCP Endpoints ====================

// Proxy endpoint for CoinGecko MCP - Call a tool
app.post('/api/coingecko-mcp/call', async (req, res) => {
  const apiKey = req.headers['x-cg-pro-api-key'];
  const { tool, params } = req.body;

  if (!tool) {
    return res.status(400).json({ error: 'Tool name required' });
  }

  try {
    // Use remote keyless MCP endpoint (or authenticated if API key provided)
    const mcpUrl = apiKey
      ? 'https://mcp.pro-api.coingecko.com/mcp'
      : 'https://mcp.api.coingecko.com/mcp';

    const headers = {
      'Content-Type': 'application/json'
    };

    if (apiKey) {
      headers['x-cg-pro-api-key'] = apiKey;
    }

    // Make MCP request
    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: tool,
          arguments: params || {}
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`MCP error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // Return the tool result
    if (data.error) {
      return res.status(500).json({ error: data.error.message || 'MCP tool error' });
    }

    res.json(data.result || data);
  } catch (error) {
    console.error('CoinGecko MCP call error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint for CoinGecko MCP - List available tools
app.get('/api/coingecko-mcp/tools', async (req, res) => {
  const apiKey = req.headers['x-cg-pro-api-key'];

  try {
    const mcpUrl = apiKey
      ? 'https://mcp.pro-api.coingecko.com/mcp'
      : 'https://mcp.api.coingecko.com/mcp';

    const headers = {
      'Content-Type': 'application/json'
    };

    if (apiKey) {
      headers['x-cg-pro-api-key'] = apiKey;
    }

    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`MCP error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    res.json(data.result || data);
  } catch (error) {
    console.error('CoinGecko MCP list tools error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint for Santiment (GraphQL)
app.post('/api/santiment', async (req, res) => {
  const apiKey = req.headers['authorization'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required in Authorization header' });
  }

  try {
    const response = await fetch('https://api.santiment.net/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Santiment proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint for Parallel AI
app.use('/api/parallel', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const endpoint = req.url;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required in x-api-key header' });
  }

  try {
    // Determine the correct base URL based on endpoint
    let baseUrl = 'https://api.parallel.ai';
    if (endpoint.includes('/search') || endpoint.includes('/extract')) {
      baseUrl += '/v1beta';
    } else if (endpoint.includes('/task')) {
      baseUrl += '/v1/tasks';
    } else {
      baseUrl += '/v1';
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    };

    // Add beta header for search/extract endpoints
    if (endpoint.includes('/search') || endpoint.includes('/extract')) {
      headers['parallel-beta'] = 'search-extract-2025-10-10';
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Parallel AI proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// LangGraph Agent endpoint
const agentInstances = new Map(); // Store agent instances per user/session

app.post('/api/agent/query', async (req, res) => {
  const { query, config = {}, stream = false } = req.body;
  const apiKey = req.headers['x-openrouter-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'OpenRouter API key required in x-openrouter-api-key header' });
  }

  if (!query) {
    return res.status(400).json({ error: 'Query parameter required' });
  }

  try {
    const sessionId = config.sessionId || 'default';

    // Get or create agent instance for this session
    if (!agentInstances.has(sessionId)) {
      const agent = new FenrirAgent({
        openRouterApiKey: apiKey,
        model: config.model || 'anthropic/claude-3.5-sonnet',
        apiEndpoint: 'https://openrouter.ai/api/v1',
        toolExecutor: null // Tool execution happens on frontend
      });
      await agent.compile();
      agentInstances.set(sessionId, agent);
    }

    const agent = agentInstances.get(sessionId);

    if (stream) {
      // Set headers for Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const streamGenerator = await agent.stream(query, {
        threadId: config.threadId,
        userId: config.userId
      });

      for await (const chunk of streamGenerator) {
        // Send each chunk as SSE
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // Non-streaming response
      const result = await agent.invoke(query, {
        threadId: config.threadId,
        userId: config.userId
      });

      // Format response for frontend
      const response = {
        finalResponse: result?.finalResponse || result?.messages?.at(-1)?.content || "No response generated",
        reasoningSteps: result?.reasoningSteps || [],
        messageCount: result?.messages?.length || 0,
        userPreferences: result?.userPreferences || {},
        timestamp: new Date().toISOString()
      };

      res.json(response);
    }
  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get agent state
app.get('/api/agent/state/:threadId', async (req, res) => {
  const { threadId } = req.params;
  const sessionId = req.query.sessionId || 'default';

  if (!agentInstances.has(sessionId)) {
    return res.status(404).json({ error: 'No agent session found' });
  }

  try {
    const agent = agentInstances.get(sessionId);
    const state = await agent.getState(threadId);
    res.json(state);
  } catch (error) {
    console.error('Get state error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset agent session
app.post('/api/agent/reset', async (req, res) => {
  const sessionId = req.body.sessionId || 'default';

  if (agentInstances.has(sessionId)) {
    agentInstances.delete(sessionId);
  }

  res.json({ success: true, message: 'Agent session reset' });
});

// ==================== ML CACHING ENDPOINTS ====================

// Helper function to generate cache keys
const generateCacheKey = (type, coinId, ...params) => {
  const baseKey = `ml:${type}:${coinId}`;
  if (params.length > 0) {
    return `${baseKey}:${params.join(':')}`;
  }
  return baseKey;
};

// Cache TTL (time-to-live) in seconds
const CACHE_TTL = {
  prediction: 3600,    // 1 hour
  sentiment: 1800,     // 30 minutes
  anomaly: 900,        // 15 minutes
  pattern: 3600,       // 1 hour
};

// GET cached prediction
app.get('/api/ml/prediction/:coinId/:days', async (req, res) => {
  const { coinId, days } = req.params;

  if (!redisConnected) {
    return res.status(503).json({
      cached: false,
      error: 'Cache unavailable'
    });
  }

  try {
    const key = generateCacheKey('prediction', coinId, days);
    const data = await redisClient.get(key);

    if (data) {
      res.json({
        cached: true,
        data: JSON.parse(data)
      });
    } else {
      res.json({
        cached: false,
        message: 'No cached prediction available'
      });
    }
  } catch (error) {
    console.error('Cache read error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST cache prediction
app.post('/api/ml/prediction/:coinId/:days', async (req, res) => {
  const { coinId, days } = req.params;
  const { predictions, metadata } = req.body;

  if (!redisConnected) {
    return res.status(503).json({
      success: false,
      error: 'Cache unavailable'
    });
  }

  try {
    const key = generateCacheKey('prediction', coinId, days);
    const data = {
      predictions,
      metadata,
      cachedAt: new Date().toISOString(),
    };

    await redisClient.setEx(key, CACHE_TTL.prediction, JSON.stringify(data));

    res.json({
      success: true,
      message: 'Prediction cached',
      expiresIn: CACHE_TTL.prediction
    });
  } catch (error) {
    console.error('Cache write error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET cached sentiment
app.get('/api/ml/sentiment/:coinId', async (req, res) => {
  const { coinId } = req.params;

  if (!redisConnected) {
    return res.status(503).json({
      cached: false,
      error: 'Cache unavailable'
    });
  }

  try {
    const key = generateCacheKey('sentiment', coinId);
    const data = await redisClient.get(key);

    if (data) {
      res.json({
        cached: true,
        data: JSON.parse(data)
      });
    } else {
      res.json({
        cached: false,
        message: 'No cached sentiment available'
      });
    }
  } catch (error) {
    console.error('Cache read error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST cache sentiment
app.post('/api/ml/sentiment/:coinId', async (req, res) => {
  const { coinId } = req.params;
  const sentimentData = req.body;

  if (!redisConnected) {
    return res.status(503).json({
      success: false,
      error: 'Cache unavailable'
    });
  }

  try {
    const key = generateCacheKey('sentiment', coinId);
    const data = {
      ...sentimentData,
      cachedAt: new Date().toISOString(),
    };

    await redisClient.setEx(key, CACHE_TTL.sentiment, JSON.stringify(data));

    res.json({
      success: true,
      message: 'Sentiment cached',
      expiresIn: CACHE_TTL.sentiment
    });
  } catch (error) {
    console.error('Cache write error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET cached anomaly detection
app.get('/api/ml/anomaly/:coinId', async (req, res) => {
  const { coinId } = req.params;

  if (!redisConnected) {
    return res.status(503).json({
      cached: false,
      error: 'Cache unavailable'
    });
  }

  try {
    const key = generateCacheKey('anomaly', coinId);
    const data = await redisClient.get(key);

    if (data) {
      res.json({
        cached: true,
        data: JSON.parse(data)
      });
    } else {
      res.json({
        cached: false,
        message: 'No cached anomaly data available'
      });
    }
  } catch (error) {
    console.error('Cache read error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST cache anomaly detection
app.post('/api/ml/anomaly/:coinId', async (req, res) => {
  const { coinId } = req.params;
  const anomalyData = req.body;

  if (!redisConnected) {
    return res.status(503).json({
      success: false,
      error: 'Cache unavailable'
    });
  }

  try {
    const key = generateCacheKey('anomaly', coinId);
    const data = {
      ...anomalyData,
      cachedAt: new Date().toISOString(),
    };

    await redisClient.setEx(key, CACHE_TTL.anomaly, JSON.stringify(data));

    res.json({
      success: true,
      message: 'Anomaly data cached',
      expiresIn: CACHE_TTL.anomaly
    });
  } catch (error) {
    console.error('Cache write error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET cached pattern recognition
app.get('/api/ml/pattern/:coinId', async (req, res) => {
  const { coinId } = req.params;

  if (!redisConnected) {
    return res.status(503).json({
      cached: false,
      error: 'Cache unavailable'
    });
  }

  try {
    const key = generateCacheKey('pattern', coinId);
    const data = await redisClient.get(key);

    if (data) {
      res.json({
        cached: true,
        data: JSON.parse(data)
      });
    } else {
      res.json({
        cached: false,
        message: 'No cached pattern data available'
      });
    }
  } catch (error) {
    console.error('Cache read error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST cache pattern recognition
app.post('/api/ml/pattern/:coinId', async (req, res) => {
  const { coinId } = req.params;
  const patternData = req.body;

  if (!redisConnected) {
    return res.status(503).json({
      success: false,
      error: 'Cache unavailable'
    });
  }

  try {
    const key = generateCacheKey('pattern', coinId);
    const data = {
      ...patternData,
      cachedAt: new Date().toISOString(),
    };

    await redisClient.setEx(key, CACHE_TTL.pattern, JSON.stringify(data));

    res.json({
      success: true,
      message: 'Pattern data cached',
      expiresIn: CACHE_TTL.pattern
    });
  } catch (error) {
    console.error('Cache write error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Invalidate cache for specific coin
app.delete('/api/ml/cache/:coinId', async (req, res) => {
  const { coinId } = req.params;
  const { type } = req.query; // Optional: 'prediction', 'sentiment', 'anomaly', 'pattern'

  if (!redisConnected) {
    return res.status(503).json({
      success: false,
      error: 'Cache unavailable'
    });
  }

  try {
    let pattern;
    if (type) {
      pattern = generateCacheKey(type, coinId) + '*';
    } else {
      pattern = `ml:*:${coinId}*`;
    }

    const keys = await redisClient.keys(pattern);

    if (keys.length > 0) {
      await redisClient.del(keys);
    }

    res.json({
      success: true,
      message: `Invalidated ${keys.length} cache entries`,
      keysDeleted: keys.length
    });
  } catch (error) {
    console.error('Cache invalidation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get cache statistics
app.get('/api/ml/cache/stats', async (req, res) => {
  if (!redisConnected) {
    return res.status(503).json({
      connected: false,
      error: 'Cache unavailable'
    });
  }

  try {
    const dbSize = await redisClient.dbSize();
    const info = await redisClient.info('stats');

    res.json({
      connected: redisConnected,
      totalKeys: dbSize,
      info
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear all ML cache
app.post('/api/ml/cache/flush', async (req, res) => {
  if (!redisConnected) {
    return res.status(503).json({
      success: false,
      error: 'Cache unavailable'
    });
  }

  try {
    await redisClient.flushDb();
    res.json({
      success: true,
      message: 'All ML cache cleared'
    });
  } catch (error) {
    console.error('Flush error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Proxy server is running',
    redis: {
      connected: redisConnected,
      mlCaching: redisConnected ? 'enabled' : 'disabled'
    }
  });
});

app.listen(PORT, async () => {
  // Initialize Redis for ML caching
  await initRedis();

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 AI Terminal Agent Proxy Server                      ║
║                                                           ║
║   Server running on: http://localhost:${PORT}              ║
║                                                           ║
║   Available endpoints:                                    ║
║   • /api/cmc/*       - CoinMarketCap proxy               ║
║   • /api/helius/*    - Helius/Solana proxy               ║
║   • /api/dune/*      - Dune Analytics proxy              ║
║   • /api/scraper     - ScraperAPI proxy                  ║
║   • /api/santiment   - Santiment GraphQL proxy           ║
║   • /api/parallel/*  - Parallel AI proxy                 ║
║   • /api/agent/*     - LangGraph AI Agent (stateful)     ║
║   • /api/ml/*        - ML Caching Layer (Redis)          ║
║   • /health          - Health check                       ║
║                                                           ║
║   ML Caching: ${redisConnected ? '✓ ENABLED' : '✗ DISABLED'}                             ║
║                                                           ║
║   Update your frontend API_CONFIG baseUrls to:           ║
║   http://localhost:${PORT}/api/[service]                   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
