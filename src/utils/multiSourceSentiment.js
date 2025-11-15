// ==================== MULTI-SOURCE SENTIMENT AGGREGATION ====================
// Aggregates sentiment data from multiple sources for comprehensive analysis
// Sources: CoinGecko, Santiment, CoinMarketCap, Social Media, News

/**
 * MultiSourceSentimentAggregator
 *
 * Combines sentiment signals from:
 * - Price-based sentiment (technical analysis)
 * - Social media sentiment (Twitter, Reddit mentions)
 * - News sentiment (web scraping)
 * - On-chain metrics (Santiment)
 * - Market metrics (CoinGecko, CoinMarketCap)
 */
class MultiSourceSentimentAggregator {
  constructor(apis, sentimentAnalyzer) {
    this.coinGeckoAPI = apis.coinGecko;
    this.santimentAPI = apis.santiment;
    this.coinMarketCapAPI = apis.coinMarketCap;
    this.webScraperAPI = apis.webScraper;
    this.sentimentAnalyzer = sentimentAnalyzer;

    // Weights for different sources (must sum to 1.0)
    this.sourceWeights = {
      price: 0.30,        // 30% - Technical/price action
      social: 0.25,       // 25% - Social media metrics
      onchain: 0.20,      // 20% - On-chain data
      news: 0.15,         // 15% - News sentiment
      market: 0.10,       // 10% - Market metrics (volume, liquidity)
    };

    // Cache for sentiment data (5 minute TTL)
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  // ==================== MAIN AGGREGATION ====================

  /**
   * Aggregate sentiment from all available sources
   * @param {string} symbol - Cryptocurrency symbol (e.g., 'BTC')
   * @param {string} coinId - CoinGecko coin ID (e.g., 'bitcoin')
   */
  async aggregateSentiment(symbol, coinId) {
    const cacheKey = `${symbol}_${coinId}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        return { ...cached.data, cached: true };
      }
    }

    try {
      // Fetch data from all sources in parallel
      const [
        priceData,
        socialData,
        onchainData,
        newsData,
        marketData,
      ] = await Promise.allSettled([
        this.fetchPriceSentiment(coinId),
        this.fetchSocialSentiment(symbol, coinId),
        this.fetchOnchainSentiment(symbol),
        this.fetchNewsSentiment(symbol),
        this.fetchMarketSentiment(coinId),
      ]);

      // Process results (handle rejections gracefully)
      const sentiments = {
        price: this.extractResult(priceData),
        social: this.extractResult(socialData),
        onchain: this.extractResult(onchainData),
        news: this.extractResult(newsData),
        market: this.extractResult(marketData),
      };

      // Calculate weighted aggregate score
      const aggregateResult = this.calculateAggregateScore(sentiments);

      // Add metadata
      const result = {
        symbol,
        coinId,
        timestamp: new Date().toISOString(),
        aggregate: aggregateResult,
        sources: sentiments,
        reliability: this.calculateReliability(sentiments),
      };

      // Cache result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to aggregate sentiment: ${error.message}`);
    }
  }

  // ==================== SOURCE-SPECIFIC FETCHERS ====================

  /**
   * Fetch price-based sentiment (technical analysis)
   */
  async fetchPriceSentiment(coinId) {
    try {
      // Get historical price data
      const priceData = await this.coinGeckoAPI.getHistoricalPrices(coinId, 30);
      const currentData = await this.coinGeckoAPI.getPrice(coinId);

      // Calculate price changes
      const prices = priceData.prices.map(p => p[1]);
      const volumes = priceData.total_volumes.map(v => v[1]);

      const priceChange24h = ((currentData.usd - prices[prices.length - 2]) / prices[prices.length - 2]) * 100;
      const priceChange7d = ((currentData.usd - prices[prices.length - 7]) / prices[prices.length - 7]) * 100;

      // Use sentiment analyzer
      const sentiment = this.sentimentAnalyzer.analyzePriceSentiment({
        currentPrice: currentData.usd,
        priceHistory: prices,
        volume24h: currentData.usd_24h_vol || volumes[volumes.length - 1],
        volumeHistory: volumes,
        priceChange24h,
        priceChange7d,
      });

      return {
        score: sentiment.score,
        label: sentiment.sentiment,
        confidence: sentiment.confidence,
        factors: sentiment.factors,
        available: true,
      };
    } catch (error) {
      return {
        score: 50,
        label: 'NEUTRAL',
        confidence: 0,
        factors: [],
        available: false,
        error: error.message,
      };
    }
  }

  /**
   * Fetch social media sentiment
   */
  async fetchSocialSentiment(symbol, coinId) {
    try {
      // Get CoinGecko community data
      const coinData = await this.coinGeckoAPI.getCoinData(coinId);
      const communityData = coinData.community_data || {};

      // Calculate social score based on available metrics
      let socialScore = 50; // Start neutral
      const factors = [];

      // Twitter followers (if available)
      if (communityData.twitter_followers) {
        const twitterScore = Math.min(20, Math.log10(communityData.twitter_followers) * 2);
        socialScore += twitterScore;
        factors.push(`Twitter: ${(communityData.twitter_followers / 1000).toFixed(0)}K followers (+${twitterScore.toFixed(0)})`);
      }

      // Reddit subscribers
      if (communityData.reddit_subscribers) {
        const redditScore = Math.min(15, Math.log10(communityData.reddit_subscribers) * 1.5);
        socialScore += redditScore;
        factors.push(`Reddit: ${(communityData.reddit_subscribers / 1000).toFixed(0)}K subscribers (+${redditScore.toFixed(0)})`);
      }

      // Telegram channel users
      if (communityData.telegram_channel_user_count) {
        const telegramScore = Math.min(10, Math.log10(communityData.telegram_channel_user_count) * 1);
        socialScore += telegramScore;
        factors.push(`Telegram: ${(communityData.telegram_channel_user_count / 1000).toFixed(0)}K users (+${telegramScore.toFixed(0)})`);
      }

      // Reddit activity (48h posts/comments)
      if (communityData.reddit_average_posts_48h) {
        const activityScore = Math.min(10, communityData.reddit_average_posts_48h / 5);
        socialScore += activityScore;
        factors.push(`Reddit activity: ${communityData.reddit_average_posts_48h} posts (+${activityScore.toFixed(0)})`);
      }

      // Normalize to 0-100
      socialScore = Math.max(0, Math.min(100, socialScore));

      let label;
      if (socialScore >= 70) label = 'VERY POSITIVE';
      else if (socialScore >= 55) label = 'POSITIVE';
      else if (socialScore >= 45) label = 'NEUTRAL';
      else if (socialScore >= 30) label = 'NEGATIVE';
      else label = 'VERY NEGATIVE';

      return {
        score: socialScore,
        label,
        confidence: factors.length > 0 ? 75 : 30,
        factors,
        available: true,
      };
    } catch (error) {
      return {
        score: 50,
        label: 'NEUTRAL',
        confidence: 0,
        factors: [],
        available: false,
        error: error.message,
      };
    }
  }

  /**
   * Fetch on-chain sentiment (if Santiment available)
   */
  async fetchOnchainSentiment(symbol) {
    try {
      // Try to get on-chain metrics from Santiment
      const metrics = await this.santimentAPI.getMetrics(symbol);

      let onchainScore = 50;
      const factors = [];

      // Active addresses
      if (metrics.activeAddresses) {
        const activeScore = Math.min(20, (metrics.activeAddresses / 10000) * 10);
        onchainScore += activeScore;
        factors.push(`Active addresses: ${metrics.activeAddresses} (+${activeScore.toFixed(0)})`);
      }

      // Development activity
      if (metrics.devActivity) {
        const devScore = Math.min(15, metrics.devActivity * 0.5);
        onchainScore += devScore;
        factors.push(`Dev activity: ${metrics.devActivity} (+${devScore.toFixed(0)})`);
      }

      // Transaction volume
      if (metrics.transactionVolume) {
        const txScore = Math.min(15, (metrics.transactionVolume / 1000000) * 5);
        onchainScore += txScore;
        factors.push(`TX volume: ${(metrics.transactionVolume / 1e6).toFixed(1)}M (+${txScore.toFixed(0)})`);
      }

      onchainScore = Math.max(0, Math.min(100, onchainScore));

      let label;
      if (onchainScore >= 70) label = 'STRONG';
      else if (onchainScore >= 55) label = 'HEALTHY';
      else if (onchainScore >= 45) label = 'NEUTRAL';
      else if (onchainScore >= 30) label = 'WEAK';
      else label = 'VERY WEAK';

      return {
        score: onchainScore,
        label,
        confidence: factors.length > 0 ? 70 : 20,
        factors,
        available: true,
      };
    } catch (error) {
      // Santiment might not be available or API key missing
      return {
        score: 50,
        label: 'NEUTRAL',
        confidence: 0,
        factors: ['Santiment data unavailable'],
        available: false,
        error: error.message,
      };
    }
  }

  /**
   * Fetch news sentiment (web scraping headlines)
   */
  async fetchNewsSentiment(symbol) {
    try {
      // Use web scraper to get recent headlines about the coin
      const headlines = await this.webScraperAPI.scrapeNews(symbol);

      if (!headlines || headlines.length === 0) {
        return {
          score: 50,
          label: 'NEUTRAL',
          confidence: 0,
          factors: ['No recent news found'],
          available: false,
        };
      }

      // Analyze headlines using sentiment analyzer
      let totalScore = 0;
      const analyzedHeadlines = [];

      for (const headline of headlines.slice(0, 10)) { // Analyze top 10
        const sentiment = this.sentimentAnalyzer.analyzeTextSentiment(headline.title);
        totalScore += sentiment.score;
        analyzedHeadlines.push({
          title: headline.title,
          sentiment: sentiment.sentiment,
          score: sentiment.score,
        });
      }

      const avgScore = totalScore / analyzedHeadlines.length;

      let label;
      if (avgScore >= 70) label = 'VERY POSITIVE';
      else if (avgScore >= 55) label = 'POSITIVE';
      else if (avgScore >= 45) label = 'NEUTRAL';
      else if (avgScore >= 30) label = 'NEGATIVE';
      else label = 'VERY NEGATIVE';

      return {
        score: avgScore,
        label,
        confidence: 60,
        factors: analyzedHeadlines.slice(0, 3).map(h =>
          `"${h.title.substring(0, 50)}..." (${h.sentiment})`
        ),
        available: true,
        headlines: analyzedHeadlines,
      };
    } catch (error) {
      return {
        score: 50,
        label: 'NEUTRAL',
        confidence: 0,
        factors: ['News scraping unavailable'],
        available: false,
        error: error.message,
      };
    }
  }

  /**
   * Fetch market sentiment (liquidity, volume, market cap)
   */
  async fetchMarketSentiment(coinId) {
    try {
      const data = await this.coinGeckoAPI.getCoinData(coinId);

      let marketScore = 50;
      const factors = [];

      // Market cap rank (lower is better)
      if (data.market_cap_rank) {
        const rankScore = Math.max(0, 20 - (data.market_cap_rank / 10));
        marketScore += rankScore;
        factors.push(`Rank #${data.market_cap_rank} (+${rankScore.toFixed(0)})`);
      }

      // Liquidity score
      if (data.liquidity_score) {
        const liquidityScore = data.liquidity_score * 15;
        marketScore += liquidityScore;
        factors.push(`Liquidity: ${(data.liquidity_score * 100).toFixed(0)}% (+${liquidityScore.toFixed(0)})`);
      }

      // Market cap change (24h)
      if (data.market_data && data.market_data.market_cap_change_percentage_24h) {
        const capChange = data.market_data.market_cap_change_percentage_24h;
        const capScore = Math.min(15, Math.max(-15, capChange));
        marketScore += capScore;
        factors.push(`Market cap 24h: ${capChange > 0 ? '+' : ''}${capChange.toFixed(1)}% (${capScore > 0 ? '+' : ''}${capScore.toFixed(0)})`);
      }

      marketScore = Math.max(0, Math.min(100, marketScore));

      let label;
      if (marketScore >= 70) label = 'STRONG';
      else if (marketScore >= 55) label = 'HEALTHY';
      else if (marketScore >= 45) label = 'NEUTRAL';
      else if (marketScore >= 30) label = 'WEAK';
      else label = 'VERY WEAK';

      return {
        score: marketScore,
        label,
        confidence: 65,
        factors,
        available: true,
      };
    } catch (error) {
      return {
        score: 50,
        label: 'NEUTRAL',
        confidence: 0,
        factors: [],
        available: false,
        error: error.message,
      };
    }
  }

  // ==================== AGGREGATION LOGIC ====================

  /**
   * Calculate weighted aggregate score from all sources
   */
  calculateAggregateScore(sentiments) {
    let totalScore = 0;
    let totalWeight = 0;
    const availableSources = [];

    // Calculate weighted average (only include available sources)
    for (const [source, data] of Object.entries(sentiments)) {
      if (data && data.available) {
        const weight = this.sourceWeights[source];
        totalScore += data.score * weight;
        totalWeight += weight;
        availableSources.push(source);
      }
    }

    // Normalize if not all sources available
    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 50;

    // Determine aggregate label
    let label;
    if (finalScore >= 75) label = 'VERY BULLISH';
    else if (finalScore >= 60) label = 'BULLISH';
    else if (finalScore >= 45) label = 'NEUTRAL';
    else if (finalScore >= 30) label = 'BEARISH';
    else label = 'VERY BEARISH';

    // Calculate confidence based on number of sources
    const confidence = Math.min(95, 40 + (availableSources.length * 11));

    return {
      score: Math.round(finalScore),
      label,
      confidence,
      availableSources,
      sourceCount: availableSources.length,
    };
  }

  /**
   * Calculate overall reliability score
   */
  calculateReliability(sentiments) {
    let availableCount = 0;
    let totalConfidence = 0;

    for (const data of Object.values(sentiments)) {
      if (data && data.available) {
        availableCount++;
        totalConfidence += data.confidence || 0;
      }
    }

    if (availableCount === 0) return 0;

    // Reliability = (sources available / total sources) * (avg confidence)
    const sourceReliability = (availableCount / 5) * 100;
    const avgConfidence = totalConfidence / availableCount;

    return Math.round((sourceReliability * 0.6) + (avgConfidence * 0.4));
  }

  /**
   * Extract result from Promise.allSettled
   */
  extractResult(settledResult) {
    if (settledResult.status === 'fulfilled') {
      return settledResult.value;
    } else {
      return {
        score: 50,
        label: 'NEUTRAL',
        confidence: 0,
        factors: [],
        available: false,
        error: settledResult.reason?.message || 'Unknown error',
      };
    }
  }

  // ==================== HELPERS ====================

  /**
   * Get sentiment emoji based on label
   */
  getSentimentEmoji(label) {
    const emojiMap = {
      'VERY BULLISH': 'ᚢᚢ',
      'BULLISH': 'ᚢ',
      'NEUTRAL': 'ᚺ',
      'BEARISH': 'ᛞ',
      'VERY BEARISH': 'ᛞᛞ',
      'VERY POSITIVE': 'ᛟᛟ',
      'POSITIVE': 'ᛟ',
      'NEGATIVE': 'ᛪ',
      'VERY NEGATIVE': 'ᛪᛪ',
      'STRONG': 'ᛋᛏ',
      'HEALTHY': 'ᛟ',
      'WEAK': 'ᚹ',
      'VERY WEAK': 'ᛪ',
    };
    return emojiMap[label] || 'ᛉ';
  }

  /**
   * Get color for sentiment score
   */
  getSentimentColor(score) {
    if (score >= 70) return '#00ff88';      // Bright green
    if (score >= 55) return '#88ff00';      // Yellow-green
    if (score >= 45) return '#ffaa00';      // Orange
    if (score >= 30) return '#ff6600';      // Red-orange
    return '#ff0066';                       // Bright red
  }

  /**
   * Format sentiment report
   */
  formatReport(aggregateResult) {
    const { aggregate, sources, reliability, symbol, timestamp } = aggregateResult;

    let report = `\n╔═══════════════════════════════════════════════════════╗\n`;
    report += `║  MULTI-SOURCE SENTIMENT ANALYSIS: ${symbol.padEnd(22)}║\n`;
    report += `╚═══════════════════════════════════════════════════════╝\n\n`;

    // Aggregate score
    const emoji = this.getSentimentEmoji(aggregate.label);
    report += `${emoji} AGGREGATE SENTIMENT: ${aggregate.label}\n`;
    report += `   Score: ${aggregate.score}/100  |  Confidence: ${aggregate.confidence}%\n`;
    report += `   Reliability: ${reliability}%  |  Sources: ${aggregate.sourceCount}/5\n\n`;

    // Individual sources
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    for (const [source, data] of Object.entries(sources)) {
      if (!data.available) continue;

      const sourceEmoji = this.getSentimentEmoji(data.label);
      const sourceName = source.toUpperCase().padEnd(10);

      report += `${sourceEmoji} ${sourceName} ${data.label.padEnd(15)} ${data.score}/100\n`;

      if (data.factors && data.factors.length > 0) {
        data.factors.slice(0, 2).forEach(factor => {
          report += `   • ${factor}\n`;
        });
      }
      report += `\n`;
    }

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `Updated: ${new Date(timestamp).toLocaleString()}\n`;

    return report;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export default MultiSourceSentimentAggregator;
