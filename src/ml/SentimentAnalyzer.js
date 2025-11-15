// ==================== SENTIMENT ANALYSIS MODULE ====================
// Analyzes market sentiment from social volume, price action, and momentum
// Uses statistical methods and simple neural networks

import * as tf from '@tensorflow/tfjs';

class SentimentAnalyzer {
  constructor(mlService) {
    this.mlService = mlService;
    this.model = null;

    // Sentiment keywords for basic text analysis
    this.bullishKeywords = [
      'moon', 'bullish', 'buy', 'pump', 'rocket', 'breakout', 'rally',
      'surge', 'uptick', 'green', 'gains', 'profit', 'ATH', 'bull run'
    ];

    this.bearishKeywords = [
      'dump', 'bearish', 'sell', 'crash', 'drop', 'red', 'loss', 'down',
      'decline', 'plunge', 'fear', 'panic', 'bottom', 'bear market'
    ];
  }

  // ==================== PRICE-BASED SENTIMENT ====================

  /**
   * Calculate sentiment from price action and momentum
   * @param {Object} data - Market data (price, volume, social metrics)
   */
  analyzePriceSentiment(data) {
    const {
      currentPrice,
      priceHistory, // Last 30 days
      volume24h,
      volumeHistory,
      priceChange24h,
      priceChange7d,
    } = data;

    let sentimentScore = 0;
    const factors = [];

    // Factor 1: Recent price momentum (30%)
    if (priceChange24h > 5) {
      sentimentScore += 30;
      factors.push('Strong 24h gain (+30)');
    } else if (priceChange24h > 0) {
      sentimentScore += 15;
      factors.push('Positive 24h (+15)');
    } else if (priceChange24h < -5) {
      sentimentScore -= 30;
      factors.push('Strong 24h loss (-30)');
    } else {
      sentimentScore -= 15;
      factors.push('Negative 24h (-15)');
    }

    // Factor 2: Weekly trend (25%)
    if (priceChange7d > 10) {
      sentimentScore += 25;
      factors.push('Strong weekly gain (+25)');
    } else if (priceChange7d > 0) {
      sentimentScore += 12;
      factors.push('Positive weekly (+12)');
    } else if (priceChange7d < -10) {
      sentimentScore -= 25;
      factors.push('Weak weekly (-25)');
    } else {
      sentimentScore -= 12;
      factors.push('Negative weekly (-12)');
    }

    // Factor 3: Volume analysis (20%)
    if (volumeHistory && volumeHistory.length > 0) {
      const avgVolume = volumeHistory.reduce((a, b) => a + b, 0) / volumeHistory.length;
      const volumeRatio = volume24h / avgVolume;

      if (volumeRatio > 1.5 && priceChange24h > 0) {
        sentimentScore += 20;
        factors.push('High volume + price up (+20)');
      } else if (volumeRatio > 1.2) {
        sentimentScore += 10;
        factors.push('Above avg volume (+10)');
      } else if (volumeRatio < 0.7) {
        sentimentScore -= 10;
        factors.push('Low volume (-10)');
      }
    }

    // Factor 4: Volatility (15%)
    if (priceHistory && priceHistory.length > 7) {
      const returns = [];
      for (let i = 1; i < priceHistory.length; i++) {
        returns.push((priceHistory[i] - priceHistory[i - 1]) / priceHistory[i - 1]);
      }
      const volatility = Math.sqrt(
        returns.reduce((sum, r) => sum + r * r, 0) / returns.length
      );

      if (volatility > 0.05) {
        sentimentScore -= 15;
        factors.push('High volatility (-15)');
      } else if (volatility < 0.02) {
        sentimentScore += 10;
        factors.push('Low volatility (+10)');
      }
    }

    // Factor 5: Trend consistency (10%)
    if (priceHistory && priceHistory.length >= 7) {
      const recent = priceHistory.slice(-7);
      const increases = recent.filter((p, i) => i > 0 && p > recent[i - 1]).length;
      const consistency = increases / 6; // 6 comparisons

      if (consistency > 0.7) {
        sentimentScore += 10;
        factors.push('Consistent uptrend (+10)');
      } else if (consistency < 0.3) {
        sentimentScore -= 10;
        factors.push('Consistent downtrend (-10)');
      }
    }

    // Normalize to 0-100 scale
    sentimentScore = Math.max(0, Math.min(100, sentimentScore + 50));

    // Determine sentiment label
    let sentiment;
    if (sentimentScore >= 70) sentiment = 'VERY BULLISH';
    else if (sentimentScore >= 55) sentiment = 'BULLISH';
    else if (sentimentScore >= 45) sentiment = 'NEUTRAL';
    else if (sentimentScore >= 30) sentiment = 'BEARISH';
    else sentiment = 'VERY BEARISH';

    return {
      sentiment,
      score: sentimentScore,
      factors,
      confidence: this.calculateConfidence(factors.length),
    };
  }

  // ==================== SOCIAL SENTIMENT ====================

  /**
   * Analyze sentiment from social metrics (Santiment data)
   */
  analyzeSocialSentiment(socialData) {
    const {
      socialVolume7d = 0,
      devActivity30d = 0,
      activeAddresses7d = 0,
    } = socialData;

    let sentimentScore = 50; // Start neutral
    const factors = [];

    // High social volume = attention (can be bullish or bearish)
    if (socialVolume7d > 10000) {
      sentimentScore += 15;
      factors.push('High social attention (+15)');
    } else if (socialVolume7d > 5000) {
      sentimentScore += 8;
      factors.push('Moderate social attention (+8)');
    }

    // Developer activity = long-term health
    if (devActivity30d > 50) {
      sentimentScore += 20;
      factors.push('Strong dev activity (+20)');
    } else if (devActivity30d > 20) {
      sentimentScore += 10;
      factors.push('Moderate dev activity (+10)');
    } else if (devActivity30d < 5) {
      sentimentScore -= 15;
      factors.push('Low dev activity (-15)');
    }

    // Active addresses = network health
    if (activeAddresses7d > 100000) {
      sentimentScore += 15;
      factors.push('High network activity (+15)');
    } else if (activeAddresses7d > 50000) {
      sentimentScore += 8;
      factors.push('Moderate network activity (+8)');
    } else if (activeAddresses7d < 10000) {
      sentimentScore -= 10;
      factors.push('Low network activity (-10)');
    }

    sentimentScore = Math.max(0, Math.min(100, sentimentScore));

    let sentiment;
    if (sentimentScore >= 70) sentiment = 'POSITIVE';
    else if (sentimentScore >= 45) sentiment = 'NEUTRAL';
    else sentiment = 'NEGATIVE';

    return {
      sentiment,
      score: sentimentScore,
      factors,
    };
  }

  // ==================== TEXT SENTIMENT (BASIC) ====================

  /**
   * Simple keyword-based sentiment analysis
   * For more advanced NLP, would need pre-trained model or API
   */
  analyzeTextSentiment(text) {
    if (!text) return { sentiment: 'NEUTRAL', score: 50 };

    const lowerText = text.toLowerCase();
    let bullishCount = 0;
    let bearishCount = 0;

    this.bullishKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) bullishCount += matches.length;
    });

    this.bearishKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) bearishCount += matches.length;
    });

    const totalKeywords = bullishCount + bearishCount;
    if (totalKeywords === 0) return { sentiment: 'NEUTRAL', score: 50 };

    const bullishRatio = bullishCount / totalKeywords;
    const score = bullishRatio * 100;

    let sentiment;
    if (score >= 70) sentiment = 'BULLISH';
    else if (score >= 45) sentiment = 'NEUTRAL';
    else sentiment = 'BEARISH';

    return {
      sentiment,
      score: Math.round(score),
      bullishKeywords: bullishCount,
      bearishKeywords: bearishCount,
    };
  }

  // ==================== COMPOSITE SENTIMENT ====================

  /**
   * Combine price, social, and other factors for overall sentiment
   */
  analyzeCompositeSentiment(marketData, socialData = null) {
    const priceSentiment = this.analyzePriceSentiment(marketData);

    let compositeSentiment = {
      ...priceSentiment,
      priceSentiment: priceSentiment.sentiment,
      priceScore: priceSentiment.score,
      allFactors: [...priceSentiment.factors],
    };

    // Add social sentiment if available
    if (socialData) {
      const socialSentiment = this.analyzeSocialSentiment(socialData);

      // Weighted average: 70% price, 30% social
      const compositeScore = (priceSentiment.score * 0.7) + (socialSentiment.score * 0.3);

      compositeSentiment.socialSentiment = socialSentiment.sentiment;
      compositeSentiment.socialScore = socialSentiment.score;
      compositeSentiment.score = Math.round(compositeScore);
      compositeSentiment.allFactors.push(...socialSentiment.factors);

      // Update overall sentiment
      if (compositeScore >= 70) compositeSentiment.sentiment = 'VERY BULLISH';
      else if (compositeScore >= 55) compositeSentiment.sentiment = 'BULLISH';
      else if (compositeScore >= 45) compositeSentiment.sentiment = 'NEUTRAL';
      else if (compositeScore >= 30) compositeSentiment.sentiment = 'BEARISH';
      else compositeSentiment.sentiment = 'VERY BEARISH';
    }

    return compositeSentiment;
  }

  // ==================== HELPERS ====================

  calculateConfidence(factorCount) {
    // More factors = higher confidence
    return Math.min(95, 50 + (factorCount * 5));
  }

  /**
   * Get sentiment emoji
   */
  getSentimentEmoji(sentiment) {
    const emojiMap = {
      'VERY BULLISH': 'ᚢᚢ',
      'BULLISH': 'ᚢ',
      'NEUTRAL': 'ᚺ',
      'BEARISH': 'ᛞ',
      'VERY BEARISH': 'ᛞᛞ',
      'POSITIVE': 'ᛟ',
      'NEGATIVE': 'ᛪ',
    };
    return emojiMap[sentiment] || 'ᛉ';
  }
}

export default SentimentAnalyzer;
