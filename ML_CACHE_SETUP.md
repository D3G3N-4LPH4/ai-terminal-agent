# ML Caching System Setup Guide

## Overview

The shared ML backend provides **10-100x faster predictions** by caching results in Redis. When a user requests a prediction for a coin (e.g., BTC 7-day forecast), the system:

1. **First time**: Trains LSTM model (30-60 seconds) → Caches result
2. **Subsequent times**: Returns cached result (<1 second) ⚡

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │◄────►│ Proxy Server │◄────►│    Redis    │
│ (Browser)   │      │  (Node.js)   │      │   (Cache)   │
└─────────────┘      └──────────────┘      └─────────────┘
      │
      └─► Trains ML models locally (TensorFlow.js in browser)
      └─► Sends results to backend for caching
      └─► Fetches cached results for instant predictions
```

## Benefits

✅ **10-100x faster predictions** - No retraining for popular coins
✅ **Shared across all users** - One user trains, everyone benefits
✅ **Privacy-preserving** - Only prediction results cached, not training data
✅ **Cost-efficient** - Reduces API calls and computation
✅ **Auto-expiring** - Predictions expire after 1 hour, sentiment after 30 min

## Installation Options

### Option 1: Local Redis (Recommended for Development)

**Windows:**
```bash
# Install Redis using Chocolatey
choco install redis

# Or download from:
https://github.com/microsoftarchive/redis/releases
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
```

### Option 2: Cloud Redis (Recommended for Production)

**Free Options:**
- **Redis Cloud** (30 MB free): https://redis.com/try-free/
- **Upstash** (10,000 commands/day free): https://upstash.com/

**Setup:**
1. Create account
2. Create database
3. Copy connection URL (e.g., `redis://default:password@host:port`)
4. Add to `.env`:
```bash
REDIS_URL=redis://your-redis-cloud-url
```

## Configuration

Add to `.env` file:
```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379  # Or your cloud Redis URL

# Optional: Redis connection settings
REDIS_PASSWORD=your-password-if-required
REDIS_TLS=false  # Set to true for cloud Redis with TLS
```

## Starting the System

### 1. Start Redis (if using local)
```bash
# Windows
redis-server

# macOS/Linux
redis-server
```

### 2. Start Proxy Server
```bash
npm run proxy-server
```

You should see:
```
✓ Redis connected
🚀 AI Terminal Agent Proxy Server
ML Caching: ✓ ENABLED
```

### 3. Start Frontend
```bash
npm run dev
```

## Testing the ML Caching

### Test 1: First Prediction (Training)
```bash
# In terminal
predict BTC 7
```

**Expected**: 30-60 seconds (training LSTM model)
**Output**: "ᛉ Training LSTM model on BTC historical data..."

### Test 2: Cached Prediction (Instant)
```bash
# Run same command again
predict BTC 7
```

**Expected**: <1 second ⚡
**Output**: "⚡ Using cached prediction (2025-11-11T...)"

### Test 3: Different Coins
```bash
predict ETH 7    # First time: 30-60s (training)
predict ETH 7    # Second time: <1s (cached)
predict SOL 14   # First time: 30-60s (training)
predict SOL 14   # Second time: <1s (cached)
```

### Test 4: Cache Statistics
Open browser console:
```javascript
// Check cache status
await fetch('http://localhost:3001/api/ml/cache/stats').then(r => r.json())

// Response:
{
  connected: true,
  totalKeys: 3,  // Number of cached predictions
  info: "..."
}
```

## Cache Management

### View Cache Stats
```bash
curl http://localhost:3001/api/ml/cache/stats
```

### Invalidate Cache for Specific Coin
```bash
# Clear all ML data for BTC
curl -X DELETE http://localhost:3001/api/ml/cache/bitcoin

# Clear only predictions for BTC
curl -X DELETE "http://localhost:3001/api/ml/cache/bitcoin?type=prediction"
```

### Flush All Cache
```bash
curl -X POST http://localhost:3001/api/ml/cache/flush
```

## Cache TTL (Time-to-Live)

Data automatically expires:
- **Predictions**: 1 hour (3600s)
- **Sentiment**: 30 minutes (1800s)
- **Anomalies**: 15 minutes (900s)
- **Patterns**: 1 hour (3600s)

## Troubleshooting

### Redis connection failed
**Problem**: `Redis Client Error: connect ECONNREFUSED`

**Solution**:
1. Ensure Redis is running: `redis-cli ping` (should return "PONG")
2. Check Redis URL in `.env`
3. For cloud Redis, verify credentials and TLS settings

### Cache unavailable (503 errors)
**Problem**: `/api/ml/*` endpoints return 503

**Solution**:
- Redis connection is down
- System will work without caching (just slower)
- Fix Redis connection or restart proxy server

### Predictions not caching
**Problem**: Every prediction takes 30-60s

**Solution**:
1. Check browser console for cache errors
2. Verify proxy server shows "ML Caching: ✓ ENABLED"
3. Test health endpoint: `curl http://localhost:3001/health`

## API Endpoints Reference

### GET /api/ml/prediction/:coinId/:days
Get cached prediction

**Response:**
```json
{
  "cached": true,
  "data": {
    "predictions": [45123.45, 45678.90, ...],
    "metadata": { "trainedOn": "2025-11-11T...", "epochs": 50 },
    "cachedAt": "2025-11-11T..."
  }
}
```

### POST /api/ml/prediction/:coinId/:days
Cache prediction

**Body:**
```json
{
  "predictions": [45123.45, 45678.90, ...],
  "metadata": { "trainedOn": "...", "dataPoints": 90 }
}
```

### GET /api/ml/sentiment/:coinId
Get cached sentiment

### POST /api/ml/sentiment/:coinId
Cache sentiment

### GET /api/ml/anomaly/:coinId
Get cached anomaly detection

### POST /api/ml/anomaly/:coinId
Cache anomaly detection

### GET /api/ml/pattern/:coinId
Get cached pattern recognition

### POST /api/ml/pattern/:coinId
Cache pattern recognition

### DELETE /api/ml/cache/:coinId?type=prediction
Invalidate cache

### GET /api/ml/cache/stats
Get cache statistics

### POST /api/ml/cache/flush
Clear all cache

## Performance Metrics

### Without Caching
- **First prediction**: 30-60 seconds
- **Second prediction**: 30-60 seconds (full retrain)
- **100 predictions**: 50-100 minutes

### With Caching
- **First prediction**: 30-60 seconds (train + cache)
- **Second prediction**: <1 second (cached)
- **100 cached predictions**: <2 minutes ⚡

**Speed improvement**: **50-100x faster** for cached predictions

## Production Deployment

### Recommended Setup
1. **Cloud Redis**: Use Redis Cloud or AWS ElastiCache
2. **Connection Pooling**: Already configured in proxy-server
3. **TLS/SSL**: Enable for cloud Redis
4. **Monitoring**: Use Redis INFO command for metrics
5. **Backup**: Redis persistence enabled by default

### Environment Variables
```bash
# Production .env
REDIS_URL=rediss://user:pass@production-redis:6379
REDIS_TLS=true
REDIS_RETRY_STRATEGY=exponential
REDIS_MAX_RETRIES=10
```

## Cost Analysis

### Without Shared Backend
- User A predicts BTC: 60 seconds
- User B predicts BTC: 60 seconds
- User C predicts BTC: 60 seconds
**Total**: 180 seconds, 3x computation

### With Shared Backend
- User A predicts BTC: 60 seconds (trains + caches)
- User B predicts BTC: 0.5 seconds (cached)
- User C predicts BTC: 0.5 seconds (cached)
**Total**: 61 seconds, 1x computation

**Savings**: 66% time reduction, 66% computation reduction

## Next Steps

1. Install Redis (local or cloud)
2. Start proxy server with Redis
3. Test predictions with `predict BTC 7`
4. Verify caching with second identical command
5. Monitor cache stats

## Support

For issues or questions:
- Check proxy server logs
- Verify Redis connection: `redis-cli ping`
- Check browser console for errors
- Test health endpoint: `/health`
