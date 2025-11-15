// ==================== ML SERVICE ====================
// Central machine learning service for crypto analysis
// Provides: Price prediction, Sentiment analysis, Anomaly detection, Pattern recognition

import * as tf from '@tensorflow/tfjs';

class MLService {
  constructor() {
    this.models = {
      pricePredictor: null,
      sentimentAnalyzer: null,
      anomalyDetector: null,
      patternRecognizer: null,
    };

    this.isReady = false;
    this.trainingData = new Map(); // Cache for training data
  }

  // ==================== INITIALIZATION ====================

  async initialize() {
    try {
      // Set TensorFlow backend
      await tf.ready();
      console.log('✓ TensorFlow.js initialized');
      console.log('Backend:', tf.getBackend());

      this.isReady = true;
      return true;
    } catch (error) {
      console.error('ML Service initialization failed:', error);
      return false;
    }
  }

  // ==================== DATA PREPROCESSING ====================

  /**
   * Normalize data to 0-1 range for neural network training
   */
  normalizeData(data, min = null, max = null) {
    if (min === null) min = Math.min(...data);
    if (max === null) max = Math.max(...data);

    const range = max - min;
    if (range === 0) return data.map(() => 0.5);

    return {
      normalized: data.map(val => (val - min) / range),
      min,
      max,
    };
  }

  /**
   * Denormalize data back to original scale
   */
  denormalizeData(normalizedData, min, max) {
    const range = max - min;
    return normalizedData.map(val => val * range + min);
  }

  /**
   * Create sequences for time series prediction
   * Example: [1,2,3,4,5] with windowSize=3 -> [[1,2,3],[2,3,4],[3,4,5]]
   */
  createSequences(data, windowSize) {
    const sequences = [];
    const labels = [];

    for (let i = 0; i < data.length - windowSize; i++) {
      sequences.push(data.slice(i, i + windowSize));
      labels.push(data[i + windowSize]);
    }

    return { sequences, labels };
  }

  /**
   * Calculate technical indicators for pattern recognition
   */
  calculateTechnicalIndicators(prices) {
    const indicators = {};

    // Simple Moving Average (SMA)
    const sma = (data, period) => {
      const result = [];
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          result.push(null);
        } else {
          const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
          result.push(sum / period);
        }
      }
      return result;
    };

    // Relative Strength Index (RSI)
    const rsi = (data, period = 14) => {
      const changes = [];
      for (let i = 1; i < data.length; i++) {
        changes.push(data[i] - data[i - 1]);
      }

      const gains = changes.map(c => c > 0 ? c : 0);
      const losses = changes.map(c => c < 0 ? -c : 0);

      const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

      const rs = avgGain / (avgLoss || 1);
      const rsiValue = 100 - (100 / (1 + rs));

      return rsiValue;
    };

    indicators.sma7 = sma(prices, 7);
    indicators.sma30 = sma(prices, 30);
    indicators.rsi = rsi(prices);

    // Volatility
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    indicators.volatility = Math.sqrt(
      returns.reduce((sum, r) => sum + r * r, 0) / returns.length
    );

    return indicators;
  }

  // ==================== MEMORY MANAGEMENT ====================

  /**
   * Clean up TensorFlow memory
   */
  cleanup() {
    // Dispose of models
    Object.keys(this.models).forEach(key => {
      if (this.models[key]) {
        this.models[key].dispose();
        this.models[key] = null;
      }
    });

    // Clear training data cache
    this.trainingData.clear();

    console.log('ML Service cleaned up');
  }

  /**
   * Get memory usage statistics
   */
  getMemoryInfo() {
    const memoryInfo = tf.memory();
    return {
      numTensors: memoryInfo.numTensors,
      numDataBuffers: memoryInfo.numDataBuffers,
      numBytes: memoryInfo.numBytes,
      unreliable: memoryInfo.unreliable,
    };
  }
}

export default MLService;
