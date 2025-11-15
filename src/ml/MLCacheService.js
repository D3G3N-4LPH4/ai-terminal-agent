// ==================== ML CACHE SERVICE ====================
// Manages Redis caching for ML predictions, sentiment analysis, and pattern detection
// Provides instant results for frequently queried coins

// NOTE: This service is designed for backend use only
// Redis client is dynamically imported to avoid bundling in frontend

class MLCacheService {
  constructor(redisUrl = 'redis://localhost:6379') {
    this.redisUrl = redisUrl;
    this.client = null;
    this.isConnected = false;
    this.isNode = typeof window === 'undefined'; // Detect Node.js environment

    // Cache TTL (time-to-live) in seconds
    this.ttl = {
      prediction: 3600,        // 1 hour (predictions change slowly)
      sentiment: 1800,         // 30 minutes (sentiment is more dynamic)
      anomaly: 900,            // 15 minutes (anomalies need fresh data)
      pattern: 3600,           // 1 hour (patterns are stable)
      training: 7200,          // 2 hours (training metadata)
    };
  }

  // ==================== CONNECTION MANAGEMENT ====================

  async connect() {
    // Only attempt Redis connection in Node.js environment
    if (!this.isNode) {
      console.warn('MLCacheService: Redis not available in browser environment');
      return false;
    }

    try {
      // Dynamic import to avoid bundling Redis in frontend
      const { createClient } = await import('redis');
      this.client = createClient({ url: this.redisUrl });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('✓ Redis connected');
        this.isConnected = true;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error.message);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      console.log('✓ Redis disconnected');
    }
  }

  // ==================== CACHE KEY GENERATION ====================

  generateKey(type, coinId, ...params) {
    const baseKey = `ml:${type}:${coinId}`;
    if (params.length > 0) {
      return `${baseKey}:${params.join(':')}`;
    }
    return baseKey;
  }

  // ==================== PREDICTION CACHING ====================

  async cachePrediction(coinId, days, predictions, metadata) {
    if (!this.isConnected) return false;

    const key = this.generateKey('prediction', coinId, days);
    const data = {
      predictions,
      metadata,
      cachedAt: new Date().toISOString(),
    };

    try {
      await this.client.setEx(key, this.ttl.prediction, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Cache write error:', error);
      return false;
    }
  }

  async getPrediction(coinId, days) {
    if (!this.isConnected) return null;

    const key = this.generateKey('prediction', coinId, days);

    try {
      const data = await this.client.get(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  // ==================== SENTIMENT CACHING ====================

  async cacheSentiment(coinId, sentimentData) {
    if (!this.isConnected) return false;

    const key = this.generateKey('sentiment', coinId);
    const data = {
      ...sentimentData,
      cachedAt: new Date().toISOString(),
    };

    try {
      await this.client.setEx(key, this.ttl.sentiment, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Cache write error:', error);
      return false;
    }
  }

  async getSentiment(coinId) {
    if (!this.isConnected) return null;

    const key = this.generateKey('sentiment', coinId);

    try {
      const data = await this.client.get(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  // ==================== ANOMALY CACHING ====================

  async cacheAnomaly(coinId, anomalyData) {
    if (!this.isConnected) return false;

    const key = this.generateKey('anomaly', coinId);
    const data = {
      ...anomalyData,
      cachedAt: new Date().toISOString(),
    };

    try {
      await this.client.setEx(key, this.ttl.anomaly, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Cache write error:', error);
      return false;
    }
  }

  async getAnomaly(coinId) {
    if (!this.isConnected) return null;

    const key = this.generateKey('anomaly', coinId);

    try {
      const data = await this.client.get(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  // ==================== PATTERN CACHING ====================

  async cachePattern(coinId, patternData) {
    if (!this.isConnected) return false;

    const key = this.generateKey('pattern', coinId);
    const data = {
      ...patternData,
      cachedAt: new Date().toISOString(),
    };

    try {
      await this.client.setEx(key, this.ttl.pattern, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Cache write error:', error);
      return false;
    }
  }

  async getPattern(coinId) {
    if (!this.isConnected) return null;

    const key = this.generateKey('pattern', coinId);

    try {
      const data = await this.client.get(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  // ==================== TRAINING METADATA CACHING ====================

  async cacheTrainingMetadata(coinId, metadata) {
    if (!this.isConnected) return false;

    const key = this.generateKey('training', coinId);
    const data = {
      ...metadata,
      cachedAt: new Date().toISOString(),
    };

    try {
      await this.client.setEx(key, this.ttl.training, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Cache write error:', error);
      return false;
    }
  }

  async getTrainingMetadata(coinId) {
    if (!this.isConnected) return null;

    const key = this.generateKey('training', coinId);

    try {
      const data = await this.client.get(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  // ==================== CACHE MANAGEMENT ====================

  async invalidateCache(coinId, type = null) {
    if (!this.isConnected) return false;

    try {
      if (type) {
        // Invalidate specific type for coin
        const pattern = this.generateKey(type, coinId) + '*';
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(keys);
        }
      } else {
        // Invalidate all ML data for coin
        const pattern = `ml:*:${coinId}*`;
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(keys);
        }
      }
      return true;
    } catch (error) {
      console.error('Cache invalidation error:', error);
      return false;
    }
  }

  async getCacheStats() {
    if (!this.isConnected) return null;

    try {
      const info = await this.client.info('stats');
      const keys = await this.client.dbSize();

      return {
        connected: this.isConnected,
        totalKeys: keys,
        info,
      };
    } catch (error) {
      console.error('Stats error:', error);
      return null;
    }
  }

  async flushAll() {
    if (!this.isConnected) return false;

    try {
      await this.client.flushDb();
      console.log('✓ Cache cleared');
      return true;
    } catch (error) {
      console.error('Flush error:', error);
      return false;
    }
  }
}

export default MLCacheService;
