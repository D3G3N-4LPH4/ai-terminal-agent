// Backend Proxy Server for AI Terminal Agent
// Handles API calls that require CORS bypass (CoinMarketCap, Santiment, etc.)

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// ==================== COINMARKETCAP API PROXY ====================

const CMC_BASE_URL = 'https://pro-api.coinmarketcap.com/v1';

// Helper to make CMC requests
async function cmcRequest(endpoint, params, apiKey) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${CMC_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-CMC_PRO_API_KEY': apiKey,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.status?.error_message || `CMC API error: ${response.status}`);
  }

  return response.json();
}

// CMC Cryptocurrency Quotes
app.get('/api/cmc/cryptocurrency/quotes/latest', async (req, res) => {
  try {
    const apiKey = req.headers['x-cmc_pro_api_key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const data = await cmcRequest('/cryptocurrency/quotes/latest', req.query, apiKey);
    res.json(data);
  } catch (error) {
    console.error('CMC quotes error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// CMC Cryptocurrency Listings
app.get('/api/cmc/cryptocurrency/listings/latest', async (req, res) => {
  try {
    const apiKey = req.headers['x-cmc_pro_api_key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const data = await cmcRequest('/cryptocurrency/listings/latest', req.query, apiKey);
    res.json(data);
  } catch (error) {
    console.error('CMC listings error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// CMC Gainers/Losers
app.get('/api/cmc/cryptocurrency/trending/gainers-losers', async (req, res) => {
  try {
    const apiKey = req.headers['x-cmc_pro_api_key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const data = await cmcRequest('/cryptocurrency/trending/gainers-losers', req.query, apiKey);
    res.json(data);
  } catch (error) {
    console.error('CMC gainers/losers error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// CMC Historical Quotes (for charts/predictions)
app.get('/api/cmc/cryptocurrency/quotes/historical', async (req, res) => {
  try {
    const apiKey = req.headers['x-cmc_pro_api_key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    // Note: Historical quotes require paid CMC plan
    const data = await cmcRequest('/cryptocurrency/quotes/historical', req.query, apiKey);
    res.json(data);
  } catch (error) {
    console.error('CMC historical error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// CMC Global Metrics
app.get('/api/cmc/global-metrics/quotes/latest', async (req, res) => {
  try {
    const apiKey = req.headers['x-cmc_pro_api_key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const data = await cmcRequest('/global-metrics/quotes/latest', req.query, apiKey);
    res.json(data);
  } catch (error) {
    console.error('CMC global metrics error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SANTIMENT API PROXY ====================

const SANTIMENT_URL = 'https://api.santiment.net/graphql';

app.post('/api/santiment', async (req, res) => {
  try {
    const apiKey = req.headers['authorization'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const response = await fetch(SANTIMENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      throw new Error(`Santiment API error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Santiment error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ML CACHE ENDPOINTS ====================

// In-memory cache (replace with Redis for production)
const mlCache = new Map();

// Cache TTL values (in milliseconds)
const CACHE_TTL = {
  prediction: 3600000,    // 1 hour
  sentiment: 1800000,     // 30 minutes
  anomaly: 900000,        // 15 minutes
  pattern: 3600000,       // 1 hour
};

// Get cached prediction
app.get('/api/ml/prediction/:coinId/:days', (req, res) => {
  const { coinId, days } = req.params;
  const key = `prediction:${coinId}:${days}`;
  const cached = mlCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL.prediction) {
    res.json({ cached: true, data: cached.data });
  } else {
    res.json({ cached: false, data: null });
  }
});

// Cache prediction
app.post('/api/ml/prediction/:coinId/:days', (req, res) => {
  const { coinId, days } = req.params;
  const key = `prediction:${coinId}:${days}`;

  mlCache.set(key, {
    data: req.body,
    timestamp: Date.now(),
  });

  res.json({ success: true });
});

// Get cached sentiment
app.get('/api/ml/sentiment/:coinId', (req, res) => {
  const { coinId } = req.params;
  const key = `sentiment:${coinId}`;
  const cached = mlCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL.sentiment) {
    res.json({ cached: true, data: cached.data });
  } else {
    res.json({ cached: false, data: null });
  }
});

// Cache sentiment
app.post('/api/ml/sentiment/:coinId', (req, res) => {
  const { coinId } = req.params;
  const key = `sentiment:${coinId}`;

  mlCache.set(key, {
    data: req.body,
    timestamp: Date.now(),
  });

  res.json({ success: true });
});

// Get cached anomaly
app.get('/api/ml/anomaly/:coinId', (req, res) => {
  const { coinId } = req.params;
  const key = `anomaly:${coinId}`;
  const cached = mlCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL.anomaly) {
    res.json({ cached: true, data: cached.data });
  } else {
    res.json({ cached: false, data: null });
  }
});

// Cache anomaly
app.post('/api/ml/anomaly/:coinId', (req, res) => {
  const { coinId } = req.params;
  const key = `anomaly:${coinId}`;

  mlCache.set(key, {
    data: req.body,
    timestamp: Date.now(),
  });

  res.json({ success: true });
});

// Get cached pattern
app.get('/api/ml/pattern/:coinId', (req, res) => {
  const { coinId } = req.params;
  const key = `pattern:${coinId}`;
  const cached = mlCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL.pattern) {
    res.json({ cached: true, data: cached.data });
  } else {
    res.json({ cached: false, data: null });
  }
});

// Cache pattern
app.post('/api/ml/pattern/:coinId', (req, res) => {
  const { coinId } = req.params;
  const key = `pattern:${coinId}`;

  mlCache.set(key, {
    data: req.body,
    timestamp: Date.now(),
  });

  res.json({ success: true });
});

// Cache stats
app.get('/api/ml/cache/stats', (req, res) => {
  res.json({
    size: mlCache.size,
    keys: Array.from(mlCache.keys()),
  });
});

// Flush cache
app.post('/api/ml/cache/flush', (req, res) => {
  mlCache.clear();
  res.json({ success: true });
});

// ==================== HEALTH CHECK ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/cmc/*',
      '/api/santiment',
      '/api/ml/*',
    ],
  });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           AI Terminal Agent - Backend Server               ║
╠════════════════════════════════════════════════════════════╣
║  Status: Running                                           ║
║  Port: ${PORT}                                                ║
║                                                            ║
║  Endpoints:                                                ║
║    • /api/cmc/*        - CoinMarketCap proxy               ║
║    • /api/santiment    - Santiment GraphQL proxy           ║
║    • /api/ml/*         - ML cache endpoints                ║
║    • /health           - Health check                      ║
║                                                            ║
║  Frontend should use VITE_BACKEND_URL=http://localhost:${PORT} ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;
