// ==================== ML CACHE HELPER ====================
// Client-side utilities to interact with backend ML caching layer
// Provides instant results for frequently queried coins

const ML_CACHE_BASE_URL = 'http://localhost:3001/api/ml';

class MLCacheHelper {
  constructor() {
    this.enabled = true; // Can be toggled by user
  }

  // ==================== PREDICTION CACHING ====================

  async getCachedPrediction(coinId, days) {
    if (!this.enabled) return null;

    try {
      const response = await fetch(`${ML_CACHE_BASE_URL}/prediction/${coinId}/${days}`);
      const result = await response.json();

      if (result.cached && result.data) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.warn('Cache read failed:', error.message);
      return null;
    }
  }

  async cachePrediction(coinId, days, predictions, metadata) {
    if (!this.enabled) return false;

    try {
      const response = await fetch(`${ML_CACHE_BASE_URL}/prediction/${coinId}/${days}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          predictions,
          metadata,
        }),
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.warn('Cache write failed:', error.message);
      return false;
    }
  }

  // ==================== SENTIMENT CACHING ====================

  async getCachedSentiment(coinId) {
    if (!this.enabled) return null;

    try {
      const response = await fetch(`${ML_CACHE_BASE_URL}/sentiment/${coinId}`);
      const result = await response.json();

      if (result.cached && result.data) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.warn('Cache read failed:', error.message);
      return null;
    }
  }

  async cacheSentiment(coinId, sentimentData) {
    if (!this.enabled) return false;

    try {
      const response = await fetch(`${ML_CACHE_BASE_URL}/sentiment/${coinId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sentimentData),
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.warn('Cache write failed:', error.message);
      return false;
    }
  }

  // ==================== ANOMALY CACHING ====================

  async getCachedAnomaly(coinId) {
    if (!this.enabled) return null;

    try {
      const response = await fetch(`${ML_CACHE_BASE_URL}/anomaly/${coinId}`);
      const result = await response.json();

      if (result.cached && result.data) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.warn('Cache read failed:', error.message);
      return null;
    }
  }

  async cacheAnomaly(coinId, anomalyData) {
    if (!this.enabled) return false;

    try {
      const response = await fetch(`${ML_CACHE_BASE_URL}/anomaly/${coinId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(anomalyData),
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.warn('Cache write failed:', error.message);
      return false;
    }
  }

  // ==================== PATTERN CACHING ====================

  async getCachedPattern(coinId) {
    if (!this.enabled) return null;

    try {
      const response = await fetch(`${ML_CACHE_BASE_URL}/pattern/${coinId}`);
      const result = await response.json();

      if (result.cached && result.data) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.warn('Cache read failed:', error.message);
      return null;
    }
  }

  async cachePattern(coinId, patternData) {
    if (!this.enabled) return false;

    try {
      const response = await fetch(`${ML_CACHE_BASE_URL}/pattern/${coinId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patternData),
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.warn('Cache write failed:', error.message);
      return false;
    }
  }

  // ==================== CACHE MANAGEMENT ====================

  async invalidateCache(coinId, type = null) {
    try {
      const url = type
        ? `${ML_CACHE_BASE_URL}/cache/${coinId}?type=${type}`
        : `${ML_CACHE_BASE_URL}/cache/${coinId}`;

      const response = await fetch(url, {
        method: 'DELETE',
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.warn('Cache invalidation failed:', error.message);
      return false;
    }
  }

  async getCacheStats() {
    try {
      const response = await fetch(`${ML_CACHE_BASE_URL}/cache/stats`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.warn('Stats retrieval failed:', error.message);
      return null;
    }
  }

  async flushCache() {
    try {
      const response = await fetch(`${ML_CACHE_BASE_URL}/cache/flush`, {
        method: 'POST',
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.warn('Cache flush failed:', error.message);
      return false;
    }
  }

  // ==================== SETTINGS ====================

  enable() {
    this.enabled = true;
    console.log('✓ ML caching enabled');
  }

  disable() {
    this.enabled = false;
    console.log('✗ ML caching disabled');
  }

  isEnabled() {
    return this.enabled;
  }
}

export default MLCacheHelper;
