// ==================== ANOMALY DETECTION MODULE ====================
// Detects unusual patterns in price, volume, and market behavior
// Uses statistical methods and autoencoder neural networks

import * as tf from '@tensorflow/tfjs';

class AnomalyDetector {
  constructor(mlService) {
    this.mlService = mlService;
    this.autoencoder = null;
    this.thresholds = {
      price: { mean: 0, std: 0 },
      volume: { mean: 0, std: 0 },
    };
  }

  // ==================== STATISTICAL ANOMALY DETECTION ====================

  /**
   * Z-Score based anomaly detection (statistical method)
   * Anomaly if z-score > threshold (typically 3)
   */
  detectWithZScore(data, threshold = 3) {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const std = Math.sqrt(variance);

    const anomalies = [];
    data.forEach((value, index) => {
      const zScore = std === 0 ? 0 : Math.abs((value - mean) / std);
      if (zScore > threshold) {
        anomalies.push({
          index,
          value,
          zScore: zScore.toFixed(2),
          severity: this.getSeverity(zScore, threshold),
        });
      }
    });

    return {
      anomalies,
      stats: { mean, std },
      threshold,
    };
  }

  /**
   * IQR (Interquartile Range) based anomaly detection
   * More robust to outliers than Z-score
   */
  detectWithIQR(data) {
    const sorted = [...data].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);

    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const anomalies = [];
    data.forEach((value, index) => {
      if (value < lowerBound || value > upperBound) {
        anomalies.push({
          index,
          value,
          lowerBound,
          upperBound,
          type: value < lowerBound ? 'low' : 'high',
        });
      }
    });

    return {
      anomalies,
      bounds: { lower: lowerBound, upper: upperBound },
      iqr,
    };
  }

  // ==================== PRICE ANOMALY DETECTION ====================

  /**
   * Detect abnormal price movements
   */
  detectPriceAnomalies(priceHistory, options = {}) {
    const { method = 'zscore', threshold = 3 } = options;

    // Calculate price changes (returns)
    const returns = [];
    for (let i = 1; i < priceHistory.length; i++) {
      const change = ((priceHistory[i] - priceHistory[i - 1]) / priceHistory[i - 1]) * 100;
      returns.push(change);
    }

    let result;
    if (method === 'zscore') {
      result = this.detectWithZScore(returns, threshold);
    } else {
      result = this.detectWithIQR(returns);
    }

    // Interpret anomalies
    const interpretations = result.anomalies.map(anomaly => {
      const change = returns[anomaly.index];
      const type = change > 0 ? 'PUMP' : 'DUMP';
      const magnitude = Math.abs(change);

      let description;
      if (magnitude > 20) description = 'Extreme price movement';
      else if (magnitude > 10) description = 'Significant price movement';
      else description = 'Unusual price movement';

      return {
        ...anomaly,
        type,
        magnitude: magnitude.toFixed(2) + '%',
        description,
        date: `Day ${anomaly.index + 1}`,
      };
    });

    return {
      detected: interpretations.length > 0,
      count: interpretations.length,
      anomalies: interpretations,
      method,
      stats: result.stats || result.bounds,
    };
  }

  // ==================== VOLUME ANOMALY DETECTION ====================

  /**
   * Detect abnormal volume spikes or drops
   */
  detectVolumeAnomalies(volumeHistory, options = {}) {
    const { threshold = 2.5 } = options;

    const result = this.detectWithZScore(volumeHistory, threshold);

    const interpretations = result.anomalies.map(anomaly => {
      const avgVolume = result.stats.mean;
      const ratio = anomaly.value / avgVolume;

      let type, description;
      if (ratio > 2) {
        type = 'VOLUME SPIKE';
        description = `${ratio.toFixed(1)}x above average volume`;
      } else {
        type = 'VOLUME DROP';
        description = `${(1 / ratio).toFixed(1)}x below average volume`;
      }

      return {
        ...anomaly,
        type,
        description,
        ratio: ratio.toFixed(2),
        date: `Day ${anomaly.index + 1}`,
      };
    });

    return {
      detected: interpretations.length > 0,
      count: interpretations.length,
      anomalies: interpretations,
      avgVolume: result.stats.mean.toFixed(0),
    };
  }

  // ==================== FLASH CRASH / PUMP DETECTION ====================

  /**
   * Detect flash crashes or pumps (rapid price changes that reverse)
   */
  detectFlashEvents(priceHistory, windowSize = 5) {
    const flashEvents = [];

    for (let i = windowSize; i < priceHistory.length - windowSize; i++) {
      const beforeWindow = priceHistory.slice(i - windowSize, i);
      const afterWindow = priceHistory.slice(i + 1, i + windowSize + 1);

      const beforeAvg = beforeWindow.reduce((a, b) => a + b, 0) / beforeWindow.length;
      const afterAvg = afterWindow.reduce((a, b) => a + b, 0) / afterWindow.length;
      const currentPrice = priceHistory[i];

      // Check for flash crash (sudden drop and recovery)
      const dropFromBefore = ((currentPrice - beforeAvg) / beforeAvg) * 100;
      const recoverToAfter = ((afterAvg - currentPrice) / currentPrice) * 100;

      if (dropFromBefore < -10 && recoverToAfter > 8) {
        flashEvents.push({
          type: 'FLASH CRASH',
          index: i,
          dropPercent: Math.abs(dropFromBefore).toFixed(2),
          recoveryPercent: recoverToAfter.toFixed(2),
          severity: 'HIGH',
        });
      }

      // Check for flash pump (sudden spike and correction)
      if (dropFromBefore > 10 && recoverToAfter < -8) {
        flashEvents.push({
          type: 'FLASH PUMP',
          index: i,
          pumpPercent: dropFromBefore.toFixed(2),
          correctionPercent: Math.abs(recoverToAfter).toFixed(2),
          severity: 'HIGH',
        });
      }
    }

    return {
      detected: flashEvents.length > 0,
      events: flashEvents,
      count: flashEvents.length,
    };
  }

  // ==================== COMPOSITE ANOMALY ANALYSIS ====================

  /**
   * Run comprehensive anomaly detection on market data
   */
  analyzeAnomalies(marketData) {
    const {
      priceHistory,
      volumeHistory,
      currentPrice,
      volume24h,
    } = marketData;

    // Detect different types of anomalies
    const priceAnomalies = this.detectPriceAnomalies(priceHistory);
    const volumeAnomalies = volumeHistory ?
      this.detectVolumeAnomalies(volumeHistory) :
      { detected: false, anomalies: [] };
    const flashEvents = this.detectFlashEvents(priceHistory);

    // Calculate current status
    const recentPrices = priceHistory.slice(-7);
    const weekAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    const currentDeviation = ((currentPrice - weekAvg) / weekAvg) * 100;

    const isCurrentAnomalous = Math.abs(currentDeviation) > 5;

    // Overall risk assessment
    const totalAnomalies =
      priceAnomalies.count +
      volumeAnomalies.count +
      flashEvents.count;

    let riskLevel;
    if (totalAnomalies >= 5) riskLevel = 'HIGH';
    else if (totalAnomalies >= 2) riskLevel = 'MEDIUM';
    else riskLevel = 'LOW';

    return {
      priceAnomalies,
      volumeAnomalies,
      flashEvents,
      currentStatus: {
        isAnomalous: isCurrentAnomalous,
        deviation: currentDeviation.toFixed(2) + '%',
        direction: currentDeviation > 0 ? 'above' : 'below',
      },
      summary: {
        totalAnomalies,
        riskLevel,
        hasFlashEvents: flashEvents.detected,
        recentActivity: totalAnomalies > 0 ? 'UNUSUAL' : 'NORMAL',
      },
    };
  }

  // ==================== HELPERS ====================

  getSeverity(zScore, threshold) {
    if (zScore > threshold * 2) return 'CRITICAL';
    if (zScore > threshold * 1.5) return 'HIGH';
    if (zScore > threshold) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Dispose resources
   */
  dispose() {
    if (this.autoencoder) {
      this.autoencoder.dispose();
      this.autoencoder = null;
    }
  }
}

export default AnomalyDetector;
