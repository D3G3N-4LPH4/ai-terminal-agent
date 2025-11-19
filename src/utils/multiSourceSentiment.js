// ==================== MULTI-SOURCE SENTIMENT AGGREGATION ====================
// Aggregates sentiment data from multiple sources for comprehensive analysis
// Sources: CoinMarketCap, Santiment, Social Media, News
// Updated to use CoinMarketCap API

/**
 * MultiSourceSentimentAggregator
 *
 * Combines sentiment signals from:
 * - Price-based sentiment (technical analysis)
 * - Social media sentiment (Twitter, Reddit mentions)
 * - News sentiment (web scraping)
 * - On-chain metrics (Santiment)
 * - Market metrics (CoinMarketCap)
 */
class MultiSourceSentimentAggregator {
  constructor(apis, sentimentAnalyzer) {
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
   */
  async aggregateSentiment(symbol) {
    const cacheKey = symbol;

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
        this.fetchPriceSentiment(symbol),
        this.fetchSocialSentiment(symbol),
        this.fetchOnchainSentiment(symbol),
        this.fetchNewsSentiment(symbol),
        this.fetchMarketSentiment(symbol),
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
  async fetchPriceSentiment(symbol) {
    try {
      // Get historical price data from CMC
      const timeEnd = Math.floor(Date.now() / 1000);
      const timeStart = timeEnd - (30 * 24 * 60 * 60);
      const priceData = await this.coinMarketCapAPI.getHistoricalQuotes(symbol, timeStart, timeEnd, "daily");
      const currentData = await this.coinMarketCapAPI.getQuotes(symbol);

      const quote = currentData[symbol]?.quote?.USD;
      const prices = priceData.quotes?.map(q => q.quote.USD.price) || [];
      const volumes = priceData.quotes?.map(q => q.quote.USD.volume_24h) || [];

      // Calculate price changes
      const priceChange24h = quote?.percent_change_24h || 0;
      const priceChange7d = quote?.percent_change_7d || 0;

      // Use sentiment analyzer
      const sentiment = this.sentimentAnalyzer.analyzePriceSentiment({
        currentPrice: quote?.price || 0,
        priceHistory: prices,
        volume24h: quote?.volume_24h || volumes[volumes.length - 1] || 0,
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
   * Note: CMC doesn't provide community data, so this relies on other sources
   */
  async fetchSocialSentiment(symbol) {
    try {
      // CMC doesn't have social/community data like CoinGecko
      // This would require external social media APIs (Twitter, Reddit, etc.)
      // For now, return neutral with low confidence
      return {
        score: 50,
        label: 'NEUTRAL',
        confidence: 0,
        factors: ['Social data unavailable (requires external API)'],
        available: false,
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
  async fetchMarketSentiment(symbol) {
    try {
      const data = await this.coinMarketCapAPI.getQuotes(symbol);
      const quote = data[symbol]?.quote?.USD;

      if (!quote) {
        throw new Error('No market data available');
      }

      let marketScore = 50;
      const factors = [];

      // Market cap rank (lower is better)
      if (data[symbol]?.cmc_rank) {
        const rank = data[symbol].cmc_rank;
        const rankScore = Math.max(0, 20 - (rank / 10));
        marketScore += rankScore;
        factors.push(`Rank #${rank} (+${rankScore.toFixed(0)})`);
      }

      // Volume to market cap ratio (higher is better for liquidity)
      if (quote.volume_24h && quote.market_cap) {
        const volumeRatio = quote.volume_24h / quote.market_cap;
        const liquidityScore = Math.min(15, volumeRatio * 100);
        marketScore += liquidityScore;
        factors.push(`Volume/MCap: ${(volumeRatio * 100).toFixed(2)}% (+${liquidityScore.toFixed(0)})`);
      }

      // Market cap change (24h)
      if (quote.percent_change_24h) {
        const capChange = quote.percent_change_24h;
        const capScore = Math.min(15, Math.max(-15, capChange));
        marketScore += capScore;
        factors.push(`Price 24h: ${capChange > 0 ? '+' : ''}${capChange.toFixed(1)}% (${capScore > 0 ? '+' : ''}${capScore.toFixed(0)})`);
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
