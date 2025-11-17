// ML model validation utilities

/**
 * Validate training data quality
 * @param {Array<number>} prices - Price data array
 * @param {number} minDataPoints - Minimum required data points
 * @returns {Object} - Validation result
 */
export const validateTrainingData = (prices, minDataPoints = 30) => {
  const errors = [];
  const warnings = [];

  // Check if data exists
  if (!prices || !Array.isArray(prices)) {
    errors.push('Price data must be an array');
    return { valid: false, errors, warnings };
  }

  // Check minimum data points
  if (prices.length < minDataPoints) {
    errors.push(
      `Insufficient data: need at least ${minDataPoints} days, got ${prices.length}`
    );
  }

  // Check for NaN or invalid values
  const invalidCount = prices.filter((p) => isNaN(p) || p === null || p === undefined).length;
  if (invalidCount > 0) {
    errors.push(`Found ${invalidCount} invalid price values (NaN, null, or undefined)`);
  }

  // Check for negative or zero prices
  const negativeCount = prices.filter((p) => p <= 0).length;
  if (negativeCount > 0) {
    errors.push(`Found ${negativeCount} negative or zero price values`);
  }

  // Check for data variance
  const max = Math.max(...prices.filter((p) => !isNaN(p)));
  const min = Math.min(...prices.filter((p) => !isNaN(p)));
  const range = max - min;

  if (range === 0) {
    errors.push('All prices are identical - no variance to learn from');
  } else if (range / min < 0.01) {
    warnings.push('Very low price variance detected - model may not learn effectively');
  }

  // Check for outliers (more than 10x std deviation)
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);

  const outliers = prices.filter((p) => Math.abs(p - mean) > stdDev * 10);
  if (outliers.length > 0) {
    warnings.push(
      `Found ${outliers.length} potential outliers (>10σ from mean) - may affect training`
    );
  }

  // Check data recency (if timestamps available)
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  if (prices.length > 0 && prices[prices.length - 1] < now - oneWeek) {
    warnings.push('Data may be stale - last data point is over a week old');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      count: prices.length,
      min,
      max,
      mean,
      stdDev,
      range,
    },
  };
};

/**
 * Validate prediction input
 * @param {Array<number>} recentPrices - Recent price history
 * @param {number} days - Days to predict
 * @param {number} windowSize - Required window size
 * @param {Object} trainingHistory - Training metadata
 * @returns {Object} - Validation result
 */
export const validatePredictionInput = (recentPrices, days, windowSize, trainingHistory) => {
  const errors = [];
  const warnings = [];

  // Check if model was trained
  if (!trainingHistory) {
    errors.push('Model not trained - call train() before predict()');
    return { valid: false, errors, warnings };
  }

  // Check recent prices array
  if (!Array.isArray(recentPrices)) {
    errors.push('Recent prices must be an array');
    return { valid: false, errors, warnings };
  }

  // Check minimum data points
  if (recentPrices.length < windowSize) {
    errors.push(
      `Need at least ${windowSize} days of recent prices, got ${recentPrices.length}`
    );
  }

  // Check for invalid values
  const invalidCount = recentPrices.filter(
    (p) => isNaN(p) || p === null || p === undefined || p <= 0
  ).length;
  if (invalidCount > 0) {
    errors.push(`Found ${invalidCount} invalid values in recent prices`);
  }

  // Check prediction days
  if (!Number.isInteger(days) || days < 1) {
    errors.push('Prediction days must be a positive integer');
  }

  if (days > 30) {
    warnings.push(
      'Predicting >30 days ahead - accuracy decreases significantly for long-term predictions'
    );
  }

  // Check if recent prices are within training range
  const { min: trainMin, max: trainMax } = trainingHistory;
  const recentMin = Math.min(...recentPrices);
  const recentMax = Math.max(...recentPrices);

  if (recentMin < trainMin * 0.5 || recentMax > trainMax * 2) {
    warnings.push(
      'Recent prices are outside training range - predictions may be unreliable'
    );
  }

  // Check data staleness
  if (trainingHistory.trainedOn) {
    const trainedDate = new Date(trainingHistory.trainedOn);
    const daysSinceTrain = (Date.now() - trainedDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceTrain > 7) {
      warnings.push(
        `Model was trained ${Math.floor(daysSinceTrain)} days ago - consider retraining`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate sentiment analysis input
 * @param {string} symbol - Cryptocurrency symbol
 * @param {Object} priceData - Price data
 * @param {Object} socialData - Social metrics data
 * @returns {Object} - Validation result
 */
export const validateSentimentInput = (symbol, priceData, socialData) => {
  const errors = [];
  const warnings = [];
  const sources = [];

  if (!symbol || typeof symbol !== 'string') {
    errors.push('Valid cryptocurrency symbol required');
  }

  // Check price data
  if (priceData && priceData.prices && priceData.prices.length > 0) {
    sources.push('price');
  } else {
    warnings.push('No price data available - sentiment will be less accurate');
  }

  // Check social data
  if (socialData && Object.keys(socialData).length > 0) {
    sources.push('social');
  } else {
    warnings.push('No social data available - sentiment will be limited');
  }

  if (sources.length === 0) {
    errors.push('No data sources available - cannot calculate sentiment');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    availableSources: sources,
  };
};

/**
 * Calculate confidence score for ML prediction
 * @param {Object} trainingHistory - Training metadata
 * @param {number} predictionDays - Days being predicted
 * @param {Array<number>} recentPrices - Recent price history
 * @returns {Object} - Confidence metrics
 */
export const calculateConfidence = (trainingHistory, predictionDays, recentPrices) => {
  let confidence = 100;
  const factors = [];

  // Factor 1: Training data quality (max -30 points)
  if (trainingHistory.dataPoints < 60) {
    const penalty = Math.floor(((60 - trainingHistory.dataPoints) / 60) * 30);
    confidence -= penalty;
    factors.push(`Limited training data (-${penalty}%)`);
  }

  // Factor 2: Training loss (max -20 points)
  if (trainingHistory.finalLoss > 0.1) {
    const penalty = Math.min(20, Math.floor(trainingHistory.finalLoss * 100));
    confidence -= penalty;
    factors.push(`High training loss (-${penalty}%)`);
  }

  // Factor 3: Prediction horizon (max -30 points)
  if (predictionDays > 7) {
    const penalty = Math.min(30, Math.floor((predictionDays - 7) * 2));
    confidence -= penalty;
    factors.push(`Long-term prediction (-${penalty}%)`);
  }

  // Factor 4: Recent volatility (max -20 points)
  if (recentPrices.length >= 7) {
    const last7Days = recentPrices.slice(-7);
    const volatility = calculateVolatility(last7Days);

    if (volatility > 0.15) {
      const penalty = Math.min(20, Math.floor((volatility - 0.15) * 100));
      confidence -= penalty;
      factors.push(`High recent volatility (-${penalty}%)`);
    }
  }

  return {
    score: Math.max(0, Math.min(100, confidence)),
    level: getConfidenceLevel(confidence),
    factors,
  };
};

/**
 * Calculate price volatility
 * @param {Array<number>} prices - Price array
 * @returns {number} - Volatility (standard deviation / mean)
 */
const calculateVolatility = (prices) => {
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  return stdDev / mean;
};

/**
 * Get confidence level label
 * @param {number} score - Confidence score (0-100)
 * @returns {string} - Confidence level
 */
const getConfidenceLevel = (score) => {
  if (score >= 80) return 'HIGH';
  if (score >= 60) return 'MEDIUM';
  if (score >= 40) return 'LOW';
  return 'VERY LOW';
};

/**
 * Format validation result for terminal output
 * @param {Object} validation - Validation result
 * @param {string} operation - Operation name (e.g., 'Training', 'Prediction')
 * @returns {string} - Formatted message
 */
export const formatValidationMessage = (validation, operation = 'Operation') => {
  let message = '';

  if (!validation.valid) {
    message += `ᛪ ${operation} validation failed:\n`;
    validation.errors.forEach((error) => {
      message += `  • ${error}\n`;
    });
  }

  if (validation.warnings && validation.warnings.length > 0) {
    message += `\nᛋ Warnings:\n`;
    validation.warnings.forEach((warning) => {
      message += `  • ${warning}\n`;
    });
  }

  if (validation.stats) {
    message += `\nᛟ Data Statistics:\n`;
    message += `  • Data points: ${validation.stats.count}\n`;
    message += `  • Price range: $${validation.stats.min.toFixed(2)} - $${validation.stats.max.toFixed(2)}\n`;
    message += `  • Mean: $${validation.stats.mean.toFixed(2)}\n`;
    message += `  • Std Dev: $${validation.stats.stdDev.toFixed(2)}\n`;
  }

  return message.trim();
};

export default {
  validateTrainingData,
  validatePredictionInput,
  validateSentimentInput,
  calculateConfidence,
  formatValidationMessage,
};
