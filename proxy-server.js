// Simple Express Proxy Server for AI Terminal Agent
// This solves CORS issues by proxying API requests through a backend

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { FenrirAgent } from './fenrirAgent.js';
import { createClient } from 'redis';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

// ==================== HELPER FUNCTIONS ====================

/**
 * Centralized API proxy helper
 * Reduces code duplication across proxy endpoints
 * @param {Object} options - Proxy options
 * @param {string} options.url - Target URL
 * @param {string} options.method - HTTP method
 * @param {Object} options.headers - Request headers
 * @param {Object|undefined} options.body - Request body (for non-GET)
 * @param {Object} res - Express response object
 * @param {string} options.errorPrefix - Prefix for error logs
 */
async function proxyRequest({ url, method = 'GET', headers = {}, body, res, errorPrefix = 'Proxy' }) {
  try {
    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (method !== 'GET' && method !== 'HEAD' && body) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || errorData.message || `API error: ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error(`[${errorPrefix}] Error:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Validate API key presence
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {string} headerName - Header containing API key
 * @returns {string|null} API key or null if invalid
 */
function validateApiKey(req, res, headerName) {
  const apiKey = req.headers[headerName.toLowerCase()];
  if (!apiKey) {
    res.status(401).json({ error: `API key required in ${headerName} header` });
    return null;
  }
  return apiKey;
}

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

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for API responses
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(express.json());

// ==================== RATE LIMITING ====================

// General rate limiter for all endpoints (100 requests per 15 minutes)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// Strict rate limiter for AI endpoints (30 requests per 15 minutes)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 AI requests per windowMs
  message: {
    error: 'AI request rate limit exceeded. Please wait before making more requests.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiting to all routes
app.use(generalLimiter);

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

// ==================== ANTHROPIC API PROXY ====================

app.post('/api/anthropic/messages', aiLimiter, async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Anthropic error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== GROQ API PROXY ====================

app.post('/api/groq/chat/completions', aiLimiter, async (req, res) => {
  try {
    const apiKey = req.headers['authorization'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Groq API error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Groq error:', error.message);
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

// ==================== FENRIR TRADING BOT PROXY ====================

const FENRIR_API_URL = 'http://localhost:8000';

/**
 * Check if Fenrir API is available
 * @returns {Promise<boolean>} True if available
 */
const checkFenrirHealth = async () => {
  try {
    const response = await fetch(`${FENRIR_API_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Forward all Fenrir API requests to Python backend
 * Supports: /bot/start, /bot/stop, /bot/status, /bot/positions, /bot/trade, /bot/config
 */
app.use('/api/fenrir', async (req, res) => {
  const endpoint = req.url;
  const method = req.method;

  try {
    const fetchOptions = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    // Add body for non-GET requests
    if (method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(`${FENRIR_API_URL}${endpoint}`, fetchOptions);
    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error) {
    console.error('[Fenrir Proxy] Error:', error.message);
    res.status(503).json({
      error: 'Fenrir API unavailable',
      message: 'Make sure Python backend is running: python fenrir_api.py',
      detail: error.message
    });
  }
});

// Health check endpoint for Fenrir integration
app.get('/api/fenrir-health', async (req, res) => {
  const isAvailable = await checkFenrirHealth();

  res.json({
    available: isAvailable,
    apiUrl: FENRIR_API_URL,
    status: isAvailable ? 'healthy' : 'unavailable',
    message: isAvailable
      ? 'Fenrir API is running'
      : 'Fenrir API not available. Start with: python fenrir_api.py'
  });
});

// ==================== SOLANA WALLET ENDPOINTS ====================

/**
 * Generate new Solana wallet
 * Returns publicKey and privateKey (base58 encoded)
 */
app.post('/api/fenrir/wallet/generate', async (req, res) => {
  try {
    // Dynamic import of @solana/web3.js
    const { Keypair } = await import('@solana/web3.js');
    const bs58 = await import('bs58');

    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    const privateKey = bs58.default.encode(keypair.secretKey);

    res.json({
      publicKey,
      privateKey,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Wallet] Generation error:', error);
    res.status(500).json({
      error: 'Failed to generate wallet',
      message: error.message,
      hint: 'Make sure @solana/web3.js and bs58 are installed: npm install @solana/web3.js bs58'
    });
  }
});

/**
 * Import wallet from private key
 * Validates and returns public key
 */
app.post('/api/fenrir/wallet/import', async (req, res) => {
  try {
    const { privateKey } = req.body;

    if (!privateKey) {
      return res.status(400).json({ error: 'Private key is required' });
    }

    const { Keypair } = await import('@solana/web3.js');
    const bs58 = await import('bs58');

    // Decode base58 private key
    const secretKey = bs58.default.decode(privateKey);
    const keypair = Keypair.fromSecretKey(secretKey);
    const publicKey = keypair.publicKey.toString();

    res.json({
      publicKey,
      privateKey,
      importedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Wallet] Import error:', error);
    res.status(400).json({
      error: 'Invalid private key',
      message: error.message
    });
  }
});

/**
 * Get wallet balance
 * Fetches SOL balance from Solana RPC
 */
app.get('/api/fenrir/wallet/balance/:publicKey', async (req, res) => {
  try {
    const { publicKey } = req.params;
    const { Connection, PublicKey, LAMPORTS_PER_SOL } = await import('@solana/web3.js');

    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    const pubKey = new PublicKey(publicKey);
    const balance = await connection.getBalance(pubKey);

    res.json({
      publicKey,
      balance: balance / LAMPORTS_PER_SOL,
      balanceLamports: balance,
      rpcUrl
    });
  } catch (error) {
    console.error('[Wallet] Balance error:', error);
    res.status(400).json({
      error: 'Failed to fetch balance',
      message: error.message
    });
  }
});

/**
 * Airdrop SOL (devnet/testnet only)
 * For testing purposes
 */
app.post('/api/fenrir/wallet/airdrop', async (req, res) => {
  try {
    const { publicKey, amount = 1 } = req.body;

    if (!publicKey) {
      return res.status(400).json({ error: 'Public key is required' });
    }

    const { Connection, PublicKey, LAMPORTS_PER_SOL } = await import('@solana/web3.js');

    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    const pubKey = new PublicKey(publicKey);
    const signature = await connection.requestAirdrop(
      pubKey,
      amount * LAMPORTS_PER_SOL
    );

    await connection.confirmTransaction(signature);

    res.json({
      success: true,
      signature,
      amount,
      message: `Airdropped ${amount} SOL to ${publicKey}`
    });
  } catch (error) {
    console.error('[Wallet] Airdrop error:', error);
    res.status(500).json({
      error: 'Airdrop failed',
      message: error.message,
      hint: 'Airdrops only work on devnet/testnet'
    });
  }
});

// ==================== PYTHON SCRAPER ENDPOINTS ====================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to Python scraper script
const PYTHON_SCRAPER_PATH = path.join(__dirname, '..', 'webscrape', 'llm_scraper.py');

// Scraper cache TTL
const SCRAPER_CACHE_TTL = 3600; // 1 hour

/**
 * Generate cache key for scraped content
 * @param {string} url - URL being scraped
 * @param {string} format - Output format
 * @returns {string} Cache key
 */
const generateScraperCacheKey = (url, format = 'text') => {
  return `scraper:${format}:${url}`;
};

/**
 * Execute Python scraper script
 * @param {string[]} args - Command line arguments for Python script
 * @returns {Promise<Object>} - Parsed JSON result from Python script
 */
const executePythonScraper = (args) => {
  return new Promise((resolve, reject) => {
    const python = spawn('python', [PYTHON_SCRAPER_PATH, ...args]);
    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python scraper failed: ${stderr || 'Unknown error'}`));
        return;
      }

      try {
        // Try to parse JSON output
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        // If not JSON, return as text
        resolve({
          status: 'success',
          data: stdout,
          format: 'text'
        });
      }
    });

    python.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
};

// Health check for Python scraper
app.get('/api/python-scraper/health', (req, res) => {
  res.json({
    status: 'available',
    message: 'Python scraper is available',
    scriptPath: PYTHON_SCRAPER_PATH
  });
});

// Main scrape endpoint with caching
app.post('/api/python-scraper/scrape', generalLimiter, async (req, res) => {
  const { url, format = 'text', includeMetadata = true, useCache = true } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Check cache first if enabled and Redis is connected
    if (useCache && redisConnected) {
      const cacheKey = generateScraperCacheKey(url, format);
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        const result = JSON.parse(cached);
        result.cached = true;
        result.cacheKey = cacheKey;
        console.log(`[Cache Hit] Scraper cache for ${url} (${format})`);
        return res.json(result);
      }
    }

    // Cache miss - scrape the URL
    const result = await executePythonScraper([url, format]);
    result.cached = false;

    // Store in cache if successful and Redis is connected
    if (result.status === 'success' && useCache && redisConnected) {
      const cacheKey = generateScraperCacheKey(url, format);
      await redisClient.setEx(cacheKey, SCRAPER_CACHE_TTL, JSON.stringify(result));
      console.log(`[Cache Store] Cached scraper result for ${url} (${format})`);
    }

    res.json(result);
  } catch (error) {
    console.error('Python scraper error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Get links from page
app.post('/api/python-scraper/links', generalLimiter, async (req, res) => {
  const { url, filterInternal = false } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Use Python module mode to call get_links function
    const python = spawn('python', ['-c', `
import sys
sys.path.append('${path.dirname(PYTHON_SCRAPER_PATH)}')
from llm_scraper import LLMWebScraper
import json

scraper = LLMWebScraper()
links = scraper.get_links('${url}', filter_internal=${filterInternal ? 'True' : 'False'})
print(json.dumps({'status': 'success', 'links': links}))
    `]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({
          status: 'error',
          error: stderr || 'Unknown error'
        });
      }

      try {
        const result = JSON.parse(stdout);
        res.json(result);
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: 'Failed to parse Python output'
        });
      }
    });
  } catch (error) {
    console.error('Get links error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Search for keywords in page
app.post('/api/python-scraper/search', generalLimiter, async (req, res) => {
  const { url, keywords } = req.body;

  if (!url || !keywords || !Array.isArray(keywords)) {
    return res.status(400).json({ error: 'URL and keywords array are required' });
  }

  try {
    const keywordsJson = JSON.stringify(keywords);
    const python = spawn('python', ['-c', `
import sys
sys.path.append('${path.dirname(PYTHON_SCRAPER_PATH)}')
from llm_scraper import LLMWebScraper
import json

scraper = LLMWebScraper()
result = scraper.search_page('${url}', ${keywordsJson})
print(json.dumps(result))
    `]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({
          status: 'error',
          error: stderr || 'Unknown error'
        });
      }

      try {
        const result = JSON.parse(stdout);
        res.json(result);
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: 'Failed to parse Python output'
        });
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Extract data with CSS selectors
app.post('/api/python-scraper/extract', generalLimiter, async (req, res) => {
  const { url, selectors } = req.body;

  if (!url || !selectors || typeof selectors !== 'object') {
    return res.status(400).json({ error: 'URL and selectors object are required' });
  }

  try {
    const selectorsJson = JSON.stringify(selectors);
    const python = spawn('python', ['-c', `
import sys
sys.path.append('${path.dirname(PYTHON_SCRAPER_PATH)}')
from llm_scraper import LLMWebScraper
import json

scraper = LLMWebScraper()
result = scraper.extract_data('${url}', ${selectorsJson})
print(json.dumps(result))
    `]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({
          status: 'error',
          error: stderr || 'Unknown error'
        });
      }

      try {
        const result = JSON.parse(stdout);
        res.json(result);
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: 'Failed to parse Python output'
        });
      }
    });
  } catch (error) {
    console.error('Extract error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Scraper cache management endpoints

// Get cached scraper result
app.get('/api/scraper-cache/:url', async (req, res) => {
  const { url } = req.params;
  const { format = 'text' } = req.query;

  if (!redisConnected) {
    return res.status(503).json({
      cached: false,
      error: 'Cache unavailable'
    });
  }

  try {
    const cacheKey = generateScraperCacheKey(decodeURIComponent(url), format);
    const data = await redisClient.get(cacheKey);

    if (data) {
      res.json({
        cached: true,
        data: JSON.parse(data)
      });
    } else {
      res.json({
        cached: false,
        message: 'No cached result available'
      });
    }
  } catch (error) {
    console.error('Scraper cache read error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear scraper cache for URL
app.delete('/api/scraper-cache/:url', async (req, res) => {
  const { url } = req.params;

  if (!redisConnected) {
    return res.status(503).json({
      success: false,
      error: 'Cache unavailable'
    });
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    const formats = ['text', 'json', 'markdown', 'structured'];
    let deleted = 0;

    for (const format of formats) {
      const cacheKey = generateScraperCacheKey(decodedUrl, format);
      const result = await redisClient.del(cacheKey);
      deleted += result;
    }

    res.json({
      success: true,
      message: `Cleared ${deleted} cache entries for ${decodedUrl}`
    });
  } catch (error) {
    console.error('Scraper cache delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear all scraper cache
app.post('/api/scraper-cache/flush', async (req, res) => {
  if (!redisConnected) {
    return res.status(503).json({
      success: false,
      error: 'Cache unavailable'
    });
  }

  try {
    const pattern = 'scraper:*';
    const keys = await redisClient.keys(pattern);

    if (keys.length > 0) {
      await redisClient.del(keys);
    }

    res.json({
      success: true,
      message: `Cleared ${keys.length} scraper cache entries`
    });
  } catch (error) {
    console.error('Scraper cache flush error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== R-LOOP AUTONOMOUS AGENT ====================

// R-Loop state
let rloopProcess = null;
let rloopOutput = [];
const RLOOP_SCRIPT_PATH = path.join(__dirname, 'scripts', 'rloop.py');
const RLOOP_DATA_DIR = path.join(__dirname, 'scripts', 'rloop_data');

// Ensure R-Loop data directory exists
if (!fs.existsSync(RLOOP_DATA_DIR)) {
  fs.mkdirSync(RLOOP_DATA_DIR, { recursive: true });
}

/**
 * Start R-Loop autonomous agent
 * POST /api/rloop/start
 * Body: { tasks: ["task1", "task2"], maxIterations: 10, model: "claude-sonnet-4-20250514" }
 */
app.post('/api/rloop/start', async (req, res) => {
  if (rloopProcess && !rloopProcess.killed) {
    return res.status(400).json({
      success: false,
      error: 'R-Loop is already running. Stop it first or check status.'
    });
  }

  const { tasks, maxIterations = 10, model = 'claude-sonnet-4-20250514' } = req.body;

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Tasks array is required'
    });
  }

  // Check for Anthropic API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(400).json({
      success: false,
      error: 'ANTHROPIC_API_KEY environment variable not set'
    });
  }

  try {
    // Clear previous output
    rloopOutput = [];

    // Build arguments
    const args = [
      RLOOP_SCRIPT_PATH,
      '--tasks', ...tasks,
      '--max-iterations', maxIterations.toString(),
      '--model', model
    ];

    console.log(`[R-Loop] Starting with ${tasks.length} tasks...`);

    // Spawn Python process
    rloopProcess = spawn('python', args, {
      env: { ...process.env },
      cwd: __dirname
    });

    rloopProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[R-Loop] ${output}`);
      rloopOutput.push({ type: 'stdout', text: output, timestamp: new Date().toISOString() });
      // Keep only last 100 entries
      if (rloopOutput.length > 100) rloopOutput.shift();
    });

    rloopProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.error(`[R-Loop Error] ${output}`);
      rloopOutput.push({ type: 'stderr', text: output, timestamp: new Date().toISOString() });
    });

    rloopProcess.on('close', (code) => {
      console.log(`[R-Loop] Process exited with code ${code}`);
      rloopOutput.push({ type: 'system', text: `Process exited with code ${code}`, timestamp: new Date().toISOString() });
      rloopProcess = null;
    });

    rloopProcess.on('error', (error) => {
      console.error(`[R-Loop] Process error:`, error);
      rloopOutput.push({ type: 'error', text: error.message, timestamp: new Date().toISOString() });
    });

    res.json({
      success: true,
      message: `R-Loop started with ${tasks.length} tasks`,
      pid: rloopProcess.pid,
      tasks
    });

  } catch (error) {
    console.error('[R-Loop] Start error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Stop R-Loop agent
 * POST /api/rloop/stop
 */
app.post('/api/rloop/stop', (req, res) => {
  if (!rloopProcess || rloopProcess.killed) {
    return res.json({
      success: true,
      message: 'R-Loop is not running'
    });
  }

  try {
    rloopProcess.kill('SIGTERM');
    rloopOutput.push({ type: 'system', text: 'Process stopped by user', timestamp: new Date().toISOString() });

    res.json({
      success: true,
      message: 'R-Loop stopped'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get R-Loop status
 * GET /api/rloop/status
 */
app.get('/api/rloop/status', (req, res) => {
  const statusFile = path.join(RLOOP_DATA_DIR, 'status.json');
  const tasksFile = path.join(RLOOP_DATA_DIR, 'tasks.json');

  let status = { state: 'not_initialized', completed: 0, total: 0 };
  let tasks = { goals: [], completed: [] };

  try {
    if (fs.existsSync(statusFile)) {
      status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
    }
    if (fs.existsSync(tasksFile)) {
      tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
    }
  } catch (error) {
    console.error('[R-Loop] Status read error:', error);
  }

  res.json({
    running: rloopProcess !== null && !rloopProcess.killed,
    pid: rloopProcess?.pid || null,
    state: status.state,
    completed: status.completed,
    total: status.total,
    currentTask: status.current_task || null,
    error: status.error || null,
    tasks: tasks.goals.map((goal, i) => ({
      text: goal,
      completed: tasks.completed[i] || false
    })),
    updatedAt: status.updated_at || null
  });
});

/**
 * Get R-Loop output log
 * GET /api/rloop/output
 */
app.get('/api/rloop/output', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;

  res.json({
    output: rloopOutput.slice(-limit),
    total: rloopOutput.length,
    running: rloopProcess !== null && !rloopProcess.killed
  });
});

/**
 * Get R-Loop progress log
 * GET /api/rloop/progress
 */
app.get('/api/rloop/progress', (req, res) => {
  const progressFile = path.join(RLOOP_DATA_DIR, 'progress.txt');

  try {
    if (fs.existsSync(progressFile)) {
      const content = fs.readFileSync(progressFile, 'utf8');
      // Return last 5000 chars to avoid huge responses
      const trimmed = content.length > 5000 ? '...' + content.slice(-5000) : content;
      res.json({
        success: true,
        progress: trimmed,
        length: content.length
      });
    } else {
      res.json({
        success: true,
        progress: '',
        length: 0
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Reset R-Loop state
 * POST /api/rloop/reset
 */
app.post('/api/rloop/reset', (req, res) => {
  if (rloopProcess && !rloopProcess.killed) {
    rloopProcess.kill('SIGTERM');
    rloopProcess = null;
  }

  try {
    // Clear data files
    const files = ['status.json', 'tasks.json', 'progress.txt'];
    for (const file of files) {
      const filePath = path.join(RLOOP_DATA_DIR, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    rloopOutput = [];

    res.json({
      success: true,
      message: 'R-Loop state reset'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== HEALTH CHECK ====================

// Health check
app.get('/health', async (req, res) => {
  const fenrirAvailable = await checkFenrirHealth();

  res.json({
    status: 'OK',
    message: 'Proxy server is running',
    redis: {
      connected: redisConnected,
      mlCaching: redisConnected ? 'enabled' : 'disabled'
    },
    pythonScraper: {
      available: true,
      scriptPath: PYTHON_SCRAPER_PATH
    },
    fenrirBot: {
      available: fenrirAvailable,
      apiUrl: FENRIR_API_URL,
      status: fenrirAvailable ? 'connected' : 'disconnected'
    }
  });
});

app.listen(PORT, async () => {
  // Initialize Redis for ML caching
  await initRedis();

  // Check Fenrir availability
  const fenrirAvailable = await checkFenrirHealth();

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 AI Terminal Agent Proxy Server                      ║
║                                                           ║
║   Server running on: http://localhost:${PORT}              ║
║                                                           ║
║   PRIMARY AI PROVIDERS:                                   ║
║   • /api/anthropic/messages  - Anthropic Claude          ║
║   • /api/groq/chat/completions - Groq AI                 ║
║                                                           ║
║   DATA & SCRAPING:                                        ║
║   • /api/cmc/*       - CoinMarketCap proxy               ║
║   • /api/scraper     - ScraperAPI proxy                  ║
║   • /api/scraper/google - Google Search                  ║
║   • /api/python-scraper/* - Python LLM Scraper (FREE)    ║
║   • /api/santiment   - Santiment GraphQL proxy           ║
║                                                           ║
║   TRADING & AUTOMATION:                                   ║
║   • /api/fenrir/*    - Fenrir Trading Bot (Solana)       ║
║   • /api/fenrir-health - Fenrir status check             ║
║                                                           ║
║   ADVANCED FEATURES:                                      ║
║   • /api/parallel/*  - Parallel AI proxy                 ║
║   • /api/agent/*     - LangGraph AI Agent (stateful)     ║
║   • /api/ml/*        - ML Caching Layer (Redis)          ║
║   • /health          - Health check                       ║
║                                                           ║
║   ML Caching: ${redisConnected ? '✓ ENABLED' : '✗ DISABLED'}                             ║
║   Python Scraper: ✓ ENABLED (FREE)                       ║
║   Fenrir Bot: ${fenrirAvailable ? '✓ CONNECTED' : '✗ DISCONNECTED'}                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  if (!fenrirAvailable) {
    console.log(`
⚠️  Fenrir Trading Bot not detected
   Start the Python backend to enable trading features:

   cd "c:\\Users\\pmorr\\OneDrive\\Desktop\\PF-SOL trade code"
   python fenrir_api.py
`);
  }
});
