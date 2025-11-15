// ==================== PRICE PREDICTION MODULE ====================
// Uses LSTM (Long Short-Term Memory) neural networks for crypto price forecasting
// Trained on historical price data from CoinGecko API

import * as tf from '@tensorflow/tfjs';

class PricePredictor {
  constructor(mlService) {
    this.mlService = mlService;
    this.model = null;
    this.windowSize = 30; // Use 30 days of history to predict next day
    this.trainingHistory = null;
  }

  // ==================== MODEL ARCHITECTURE ====================

  /**
   * Build LSTM model for time series prediction
   * Architecture: LSTM(64) -> Dropout(0.2) -> LSTM(32) -> Dropout(0.2) -> Dense(1)
   */
  buildModel() {
    const model = tf.sequential();

    // First LSTM layer
    model.add(tf.layers.lstm({
      units: 64,
      returnSequences: true,
      inputShape: [this.windowSize, 1],
    }));

    // Dropout to prevent overfitting
    model.add(tf.layers.dropout({ rate: 0.2 }));

    // Second LSTM layer
    model.add(tf.layers.lstm({
      units: 32,
      returnSequences: false,
    }));

    // Dropout
    model.add(tf.layers.dropout({ rate: 0.2 }));

    // Output layer
    model.add(tf.layers.dense({ units: 1 }));

    // Compile model
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae'], // Mean Absolute Error
    });

    this.model = model;
    return model;
  }

  // ==================== TRAINING ====================

  /**
   * Train model on historical price data
   * @param {Array} prices - Historical price data
   * @param {Object} options - Training options
   */
  async train(prices, options = {}) {
    const {
      epochs = 50,
      batchSize = 32,
      validationSplit = 0.2,
      verbose = 0,
      onProgress = null, // Callback for progress updates
    } = options;

    // Normalize prices
    const { normalized, min, max } = this.mlService.normalizeData(prices);

    // Create sequences
    const { sequences, labels } = this.mlService.createSequences(
      normalized,
      this.windowSize
    );

    // Convert to tensors
    const xs = tf.tensor3d(sequences.map(seq => seq.map(val => [val])));
    const ys = tf.tensor2d(labels, [labels.length, 1]);

    // Build model if not exists
    if (!this.model) {
      this.buildModel();
    }

    // Train with progress callbacks
    const history = await this.model.fit(xs, ys, {
      epochs,
      batchSize,
      validationSplit,
      verbose,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          // Call progress callback
          if (onProgress) {
            onProgress(epoch + 1, epochs, logs);
          }

          // Yield to event loop every 5 epochs to keep UI responsive
          if (epoch % 5 === 0) {
            await tf.nextFrame();
          }

          if (verbose > 0 && epoch % 10 === 0) {
            console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}`);
          }
        },
      },
    });

    // Cleanup tensors
    xs.dispose();
    ys.dispose();

    // Store training info
    this.trainingHistory = {
      loss: history.history.loss,
      val_loss: history.history.val_loss,
      min,
      max,
      trainedOn: new Date().toISOString(),
      dataPoints: prices.length,
    };

    return this.trainingHistory;
  }

  // ==================== PREDICTION ====================

  /**
   * Predict future prices
   * @param {Array} recentPrices - Recent price history (last 30+ days)
   * @param {Number} days - Number of days to predict
   */
  async predict(recentPrices, days = 7) {
    if (!this.model) {
      throw new Error('Model not trained. Call train() first.');
    }

    if (recentPrices.length < this.windowSize) {
      throw new Error(`Need at least ${this.windowSize} days of price history`);
    }

    const { min, max } = this.trainingHistory;
    const predictions = [];

    // Normalize recent prices
    const normalizedInput = recentPrices
      .slice(-this.windowSize)
      .map(price => (price - min) / (max - min));

    let currentSequence = [...normalizedInput];

    // Predict iteratively
    for (let i = 0; i < days; i++) {
      // Prepare input tensor
      const inputTensor = tf.tensor3d([currentSequence.map(val => [val])]);

      // Predict next value
      const predictionTensor = this.model.predict(inputTensor);
      const predictionArray = await predictionTensor.data();
      const normalizedPrediction = predictionArray[0];

      // Denormalize
      const actualPrediction = normalizedPrediction * (max - min) + min;
      predictions.push(actualPrediction);

      // Update sequence for next prediction
      currentSequence = [...currentSequence.slice(1), normalizedPrediction];

      // Cleanup
      inputTensor.dispose();
      predictionTensor.dispose();
    }

    return predictions;
  }

  /**
   * Predict trend (bullish/bearish) with confidence score
   */
  async predictTrend(recentPrices) {
    const predictions = await this.predict(recentPrices, 7);
    const currentPrice = recentPrices[recentPrices.length - 1];
    const avgPrediction = predictions.reduce((a, b) => a + b, 0) / predictions.length;

    const change = ((avgPrediction - currentPrice) / currentPrice) * 100;
    const trend = change > 0 ? 'BULLISH' : 'BEARISH';

    // Calculate confidence based on consistency of predictions
    const increases = predictions.filter((p, i) =>
      i === 0 ? p > currentPrice : p > predictions[i - 1]
    ).length;
    const confidence = (increases / predictions.length) * 100;

    return {
      trend,
      change: Math.abs(change),
      confidence,
      predictions,
      currentPrice,
    };
  }

  /**
   * Get model summary
   */
  getSummary() {
    if (!this.model) return null;

    return {
      architecture: 'LSTM',
      layers: this.model.layers.length,
      parameters: this.model.countParams(),
      windowSize: this.windowSize,
      trainingHistory: this.trainingHistory,
    };
  }

  /**
   * Dispose model and free memory
   */
  dispose() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}

export default PricePredictor;
