// ==================== PATTERN RECOGNITION MODULE ====================
// Identifies technical chart patterns (head & shoulders, double top/bottom, triangles, etc.)
// Uses pattern matching algorithms and simple ML classifiers

class PatternRecognizer {
  constructor(mlService) {
    this.mlService = mlService;

    // Pattern templates
    this.patterns = {
      headAndShoulders: { type: 'REVERSAL', direction: 'BEARISH' },
      inverseHeadAndShoulders: { type: 'REVERSAL', direction: 'BULLISH' },
      doubleTop: { type: 'REVERSAL', direction: 'BEARISH' },
      doubleBottom: { type: 'REVERSAL', direction: 'BULLISH' },
      ascendingTriangle: { type: 'CONTINUATION', direction: 'BULLISH' },
      descendingTriangle: { type: 'CONTINUATION', direction: 'BEARISH' },
      symmetricalTriangle: { type: 'CONSOLIDATION', direction: 'NEUTRAL' },
      bullFlag: { type: 'CONTINUATION', direction: 'BULLISH' },
      bearFlag: { type: 'CONTINUATION', direction: 'BEARISH' },
      cup: { type: 'REVERSAL', direction: 'BULLISH' },
    };
  }

  // ==================== PATTERN DETECTION ====================

  /**
   * Find local peaks (highs) and troughs (lows)
   */
  findPeaksAndTroughs(prices, window = 5) {
    const peaks = [];
    const troughs = [];

    for (let i = window; i < prices.length - window; i++) {
      const windowBefore = prices.slice(i - window, i);
      const windowAfter = prices.slice(i + 1, i + window + 1);

      const isPeak = windowBefore.every(p => p < prices[i]) &&
                     windowAfter.every(p => p < prices[i]);

      const isTrough = windowBefore.every(p => p > prices[i]) &&
                       windowAfter.every(p => p > prices[i]);

      if (isPeak) peaks.push({ index: i, price: prices[i] });
      if (isTrough) troughs.push({ index: i, price: prices[i] });
    }

    return { peaks, troughs };
  }

  /**
   * Detect Head and Shoulders pattern
   * Pattern: Left Shoulder - Head - Right Shoulder
   */
  detectHeadAndShoulders(prices) {
    const { peaks, troughs } = this.findPeaksAndTroughs(prices);

    if (peaks.length < 3) return null;

    // Check last 3 peaks
    for (let i = 0; i < peaks.length - 2; i++) {
      const leftShoulder = peaks[i];
      const head = peaks[i + 1];
      const rightShoulder = peaks[i + 2];

      // Head should be higher than both shoulders
      // Shoulders should be roughly equal height
      const shoulderDiff = Math.abs(leftShoulder.price - rightShoulder.price) / leftShoulder.price;

      if (head.price > leftShoulder.price &&
          head.price > rightShoulder.price &&
          shoulderDiff < 0.05) { // 5% tolerance

        return {
          pattern: 'HEAD_AND_SHOULDERS',
          ...this.patterns.headAndShoulders,
          confidence: this.calculatePatternConfidence(shoulderDiff, 0.05),
          points: {
            leftShoulder: leftShoulder.index,
            head: head.index,
            rightShoulder: rightShoulder.index,
          },
          signal: 'SELL',
          reliability: 'HIGH',
        };
      }
    }

    return null;
  }

  /**
   * Detect Inverse Head and Shoulders (bullish reversal)
   */
  detectInverseHeadAndShoulders(prices) {
    const { troughs } = this.findPeaksAndTroughs(prices);

    if (troughs.length < 3) return null;

    for (let i = 0; i < troughs.length - 2; i++) {
      const leftShoulder = troughs[i];
      const head = troughs[i + 1];
      const rightShoulder = troughs[i + 2];

      const shoulderDiff = Math.abs(leftShoulder.price - rightShoulder.price) / leftShoulder.price;

      if (head.price < leftShoulder.price &&
          head.price < rightShoulder.price &&
          shoulderDiff < 0.05) {

        return {
          pattern: 'INVERSE_HEAD_AND_SHOULDERS',
          ...this.patterns.inverseHeadAndShoulders,
          confidence: this.calculatePatternConfidence(shoulderDiff, 0.05),
          points: {
            leftShoulder: leftShoulder.index,
            head: head.index,
            rightShoulder: rightShoulder.index,
          },
          signal: 'BUY',
          reliability: 'HIGH',
        };
      }
    }

    return null;
  }

  /**
   * Detect Double Top (bearish reversal)
   */
  detectDoubleTop(prices) {
    const { peaks } = this.findPeaksAndTroughs(prices);

    if (peaks.length < 2) return null;

    for (let i = 0; i < peaks.length - 1; i++) {
      const firstTop = peaks[i];
      const secondTop = peaks[i + 1];

      // Tops should be roughly equal
      const diff = Math.abs(firstTop.price - secondTop.price) / firstTop.price;

      if (diff < 0.03) { // 3% tolerance
        return {
          pattern: 'DOUBLE_TOP',
          ...this.patterns.doubleTop,
          confidence: this.calculatePatternConfidence(diff, 0.03),
          points: {
            firstTop: firstTop.index,
            secondTop: secondTop.index,
          },
          signal: 'SELL',
          reliability: 'MEDIUM',
        };
      }
    }

    return null;
  }

  /**
   * Detect Double Bottom (bullish reversal)
   */
  detectDoubleBottom(prices) {
    const { troughs } = this.findPeaksAndTroughs(prices);

    if (troughs.length < 2) return null;

    for (let i = 0; i < troughs.length - 1; i++) {
      const firstBottom = troughs[i];
      const secondBottom = troughs[i + 1];

      const diff = Math.abs(firstBottom.price - secondBottom.price) / firstBottom.price;

      if (diff < 0.03) {
        return {
          pattern: 'DOUBLE_BOTTOM',
          ...this.patterns.doubleBottom,
          confidence: this.calculatePatternConfidence(diff, 0.03),
          points: {
            firstBottom: firstBottom.index,
            secondBottom: secondBottom.index,
          },
          signal: 'BUY',
          reliability: 'MEDIUM',
        };
      }
    }

    return null;
  }

  /**
   * Detect Triangle patterns (consolidation)
   */
  detectTriangles(prices) {
    const { peaks, troughs } = this.findPeaksAndTroughs(prices);

    if (peaks.length < 2 || troughs.length < 2) return null;

    const recentPeaks = peaks.slice(-3);
    const recentTroughs = troughs.slice(-3);

    // Ascending Triangle: flat resistance, rising support
    const peaksFlat = this.isFlat(recentPeaks.map(p => p.price));
    const troughsRising = this.isRising(recentTroughs.map(t => t.price));

    if (peaksFlat && troughsRising) {
      return {
        pattern: 'ASCENDING_TRIANGLE',
        ...this.patterns.ascendingTriangle,
        confidence: 75,
        signal: 'BUY',
        reliability: 'MEDIUM',
      };
    }

    // Descending Triangle: falling resistance, flat support
    const peaksFalling = this.isFalling(recentPeaks.map(p => p.price));
    const troughsFlat = this.isFlat(recentTroughs.map(t => t.price));

    if (peaksFalling && troughsFlat) {
      return {
        pattern: 'DESCENDING_TRIANGLE',
        ...this.patterns.descendingTriangle,
        confidence: 75,
        signal: 'SELL',
        reliability: 'MEDIUM',
      };
    }

    // Symmetrical Triangle: converging
    if (peaksFalling && troughsRising) {
      return {
        pattern: 'SYMMETRICAL_TRIANGLE',
        ...this.patterns.symmetricalTriangle,
        confidence: 70,
        signal: 'WAIT',
        reliability: 'LOW',
      };
    }

    return null;
  }

  /**
   * Detect Bull/Bear Flags (continuation patterns)
   */
  detectFlags(prices) {
    if (prices.length < 20) return null;

    const recentPrices = prices.slice(-20);

    // Strong move followed by consolidation
    const firstHalf = recentPrices.slice(0, 10);
    const secondHalf = recentPrices.slice(10);

    const firstChange = ((firstHalf[firstHalf.length - 1] - firstHalf[0]) / firstHalf[0]) * 100;
    const secondVolatility = this.calculateVolatility(secondHalf);

    // Bull Flag: Strong up move, then consolidation
    if (firstChange > 10 && secondVolatility < 0.03) {
      return {
        pattern: 'BULL_FLAG',
        ...this.patterns.bullFlag,
        confidence: 70,
        signal: 'BUY',
        reliability: 'MEDIUM',
        poleStrength: firstChange.toFixed(2) + '%',
      };
    }

    // Bear Flag: Strong down move, then consolidation
    if (firstChange < -10 && secondVolatility < 0.03) {
      return {
        pattern: 'BEAR_FLAG',
        ...this.patterns.bearFlag,
        confidence: 70,
        signal: 'SELL',
        reliability: 'MEDIUM',
        poleStrength: Math.abs(firstChange).toFixed(2) + '%',
      };
    }

    return null;
  }

  // ==================== COMPREHENSIVE PATTERN SCAN ====================

  /**
   * Scan for all recognizable patterns
   */
  recognizePatterns(priceHistory) {
    if (priceHistory.length < 20) {
      return {
        detected: false,
        message: 'Insufficient data for pattern recognition (need 20+ days)',
        patterns: [],
      };
    }

    const detectedPatterns = [];

    // Run all detectors
    const headAndShoulders = this.detectHeadAndShoulders(priceHistory);
    const inverseHeadAndShoulders = this.detectInverseHeadAndShoulders(priceHistory);
    const doubleTop = this.detectDoubleTop(priceHistory);
    const doubleBottom = this.detectDoubleBottom(priceHistory);
    const triangle = this.detectTriangles(priceHistory);
    const flag = this.detectFlags(priceHistory);

    if (headAndShoulders) detectedPatterns.push(headAndShoulders);
    if (inverseHeadAndShoulders) detectedPatterns.push(inverseHeadAndShoulders);
    if (doubleTop) detectedPatterns.push(doubleTop);
    if (doubleBottom) detectedPatterns.push(doubleBottom);
    if (triangle) detectedPatterns.push(triangle);
    if (flag) detectedPatterns.push(flag);

    // Calculate overall signal
    const buySignals = detectedPatterns.filter(p => p.signal === 'BUY').length;
    const sellSignals = detectedPatterns.filter(p => p.signal === 'SELL').length;

    let overallSignal;
    if (buySignals > sellSignals) overallSignal = 'BULLISH';
    else if (sellSignals > buySignals) overallSignal = 'BEARISH';
    else overallSignal = 'NEUTRAL';

    return {
      detected: detectedPatterns.length > 0,
      count: detectedPatterns.length,
      patterns: detectedPatterns,
      overallSignal,
      signalStrength: Math.abs(buySignals - sellSignals),
    };
  }

  // ==================== HELPER METHODS ====================

  isFlat(values, tolerance = 0.05) {
    if (values.length < 2) return false;
    const first = values[0];
    return values.every(v => Math.abs((v - first) / first) < tolerance);
  }

  isRising(values) {
    for (let i = 1; i < values.length; i++) {
      if (values[i] <= values[i - 1]) return false;
    }
    return true;
  }

  isFalling(values) {
    for (let i = 1; i < values.length; i++) {
      if (values[i] >= values[i - 1]) return false;
    }
    return true;
  }

  calculateVolatility(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return Math.sqrt(
      returns.reduce((sum, r) => sum + r * r, 0) / returns.length
    );
  }

  calculatePatternConfidence(actualDiff, maxDiff) {
    // Convert difference to confidence score (0-100)
    return Math.max(0, Math.min(100, (1 - actualDiff / maxDiff) * 100));
  }
}

export default PatternRecognizer;
