/**
 * Evaluation Service - Phase 3 of Scout Framework
 *
 * Deep analysis with 50-point scoring system:
 * - Team/Dev (10 points)
 * - Community (10 points)
 * - Tokenomics (10 points)
 * - Product (10 points)
 * - Market Position (10 points)
 *
 * Provides evidence-based recommendations
 */

class EvaluationService {
  constructor() {
    // Scoring weights (can be customized)
    this.weights = {
      team: 10,
      community: 10,
      tokenomics: 10,
      product: 10,
      market: 10
    };

    // Recommendation thresholds
    this.thresholds = {
      strongBuy: 40,   // 80%+
      buy: 35,         // 70%+
      hold: 25,        // 50%+
      avoid: 0         // <50%
    };
  }

  /**
   * Run full evaluation on a candidate
   */
  async evaluate(candidate, config) {
    const evaluation = {
      symbol: candidate.symbol,
      name: candidate.name,
      address: candidate.address,
      categories: {},
      totalScore: 0,
      maxScore: 50,
      percentage: 0,
      recommendation: null,
      confidence: null,
      evidence: [],
      timestamp: new Date()
    };

    try {
      // Evaluate each category
      evaluation.categories.team = await this.evaluateTeam(candidate);
      evaluation.categories.community = await this.evaluateCommunity(candidate);
      evaluation.categories.tokenomics = await this.evaluateTokenomics(candidate);
      evaluation.categories.product = await this.evaluateProduct(candidate);
      evaluation.categories.market = await this.evaluateMarket(candidate, config);

      // Calculate total score
      evaluation.totalScore = Object.values(evaluation.categories)
        .reduce((sum, cat) => sum + cat.score, 0);

      evaluation.percentage = ((evaluation.totalScore / 50) * 100).toFixed(1);

      // Generate recommendation
      const rec = this.generateRecommendation(evaluation, config);
      evaluation.recommendation = rec.recommendation;
      evaluation.confidence = rec.confidence;

      // Collect all evidence
      for (const [category, data] of Object.entries(evaluation.categories)) {
        for (const item of data.evidence) {
          evaluation.evidence.push({
            category,
            ...item
          });
        }
      }

    } catch (error) {
      console.error('[Evaluation] Error:', error.message);
      evaluation.error = error.message;
    }

    return evaluation;
  }

  /**
   * Evaluate Team/Dev category (0-10)
   */
  async evaluateTeam(candidate) {
    const result = {
      score: 0,
      maxScore: 10,
      breakdown: {
        background: 0,    // 3 points
        activity: 0,      // 4 points
        backing: 0        // 3 points
      },
      evidence: []
    };

    // Background (0-3)
    // Check if team is doxxed/identified
    if (candidate.team?.doxxed || candidate.teamDoxxed) {
      result.breakdown.background = 3;
      result.evidence.push({ type: 'positive', text: 'Team is doxxed/identified' });
    } else if (candidate.twitter || candidate.telegram) {
      result.breakdown.background = 1.5;
      result.evidence.push({ type: 'neutral', text: 'Social presence but team not fully identified' });
    } else {
      result.evidence.push({ type: 'negative', text: 'Anonymous team' });
    }

    // Development Activity (0-4)
    // Check GitHub activity, updates, commits
    if (candidate.devActivity?.commits > 100 || candidate.sourceData?.developer_data?.commit_count_4_weeks > 50) {
      result.breakdown.activity = 4;
      result.evidence.push({ type: 'positive', text: 'High development activity' });
    } else if (candidate.devActivity?.commits > 20 || candidate.sourceData?.developer_data?.commit_count_4_weeks > 10) {
      result.breakdown.activity = 2.5;
      result.evidence.push({ type: 'positive', text: 'Active development' });
    } else if (candidate.sourceData?.developer_data) {
      result.breakdown.activity = 1;
      result.evidence.push({ type: 'neutral', text: 'Some development activity' });
    } else {
      result.evidence.push({ type: 'neutral', text: 'Development activity unknown' });
      result.breakdown.activity = 0.5; // Give benefit of doubt
    }

    // Backing/Investors (0-3)
    if (candidate.investors?.length > 0 || candidate.backers) {
      const hasTopVC = candidate.investors?.some(i =>
        ['a16z', 'paradigm', 'sequoia', 'polychain', 'coinbase'].some(vc =>
          i.toLowerCase().includes(vc)
        )
      );

      if (hasTopVC) {
        result.breakdown.backing = 3;
        result.evidence.push({ type: 'positive', text: 'Backed by top-tier investors' });
      } else {
        result.breakdown.backing = 1.5;
        result.evidence.push({ type: 'positive', text: 'Has investor backing' });
      }
    } else {
      result.evidence.push({ type: 'neutral', text: 'No known investors' });
    }

    result.score = Object.values(result.breakdown).reduce((a, b) => a + b, 0);
    return result;
  }

  /**
   * Evaluate Community category (0-10)
   */
  async evaluateCommunity(candidate) {
    const result = {
      score: 0,
      maxScore: 10,
      breakdown: {
        size: 0,          // 2 points
        engagement: 0,    // 3 points
        growth: 0,        // 2 points
        diversity: 0,     // 2 points
        sentiment: 0      // 1 point
      },
      evidence: []
    };

    // Community Size (0-2)
    const twitterFollowers = candidate.twitterFollowers || candidate.sourceData?.community_data?.twitter_followers || 0;
    const telegramMembers = candidate.telegramMembers || candidate.sourceData?.community_data?.telegram_channel_user_count || 0;
    const totalCommunity = twitterFollowers + telegramMembers;

    if (totalCommunity > 100000) {
      result.breakdown.size = 2;
      result.evidence.push({ type: 'positive', text: `Large community (${totalCommunity.toLocaleString()} members)` });
    } else if (totalCommunity > 10000) {
      result.breakdown.size = 1.5;
      result.evidence.push({ type: 'positive', text: `Growing community (${totalCommunity.toLocaleString()} members)` });
    } else if (totalCommunity > 1000) {
      result.breakdown.size = 1;
      result.evidence.push({ type: 'neutral', text: `Small community (${totalCommunity.toLocaleString()} members)` });
    } else {
      result.breakdown.size = 0.5;
      result.evidence.push({ type: 'neutral', text: 'Community size unknown or very small' });
    }

    // Engagement (0-3)
    // Based on holder activity, volume, social engagement
    const volumeToMcap = candidate.marketCap > 0 ? (candidate.volume24h || 0) / candidate.marketCap : 0;

    if (volumeToMcap > 1) {
      result.breakdown.engagement = 3;
      result.evidence.push({ type: 'positive', text: 'Very high trading engagement' });
    } else if (volumeToMcap > 0.3) {
      result.breakdown.engagement = 2;
      result.evidence.push({ type: 'positive', text: 'Good trading engagement' });
    } else if (volumeToMcap > 0.1) {
      result.breakdown.engagement = 1;
      result.evidence.push({ type: 'neutral', text: 'Moderate engagement' });
    } else {
      result.breakdown.engagement = 0.5;
      result.evidence.push({ type: 'neutral', text: 'Low engagement' });
    }

    // Growth (0-2)
    const priceChange = candidate.priceChange24h || 0;
    if (priceChange > 50) {
      result.breakdown.growth = 2;
      result.evidence.push({ type: 'positive', text: `Strong momentum (+${priceChange.toFixed(1)}% 24h)` });
    } else if (priceChange > 10) {
      result.breakdown.growth = 1.5;
      result.evidence.push({ type: 'positive', text: `Positive momentum (+${priceChange.toFixed(1)}% 24h)` });
    } else if (priceChange > -10) {
      result.breakdown.growth = 1;
      result.evidence.push({ type: 'neutral', text: 'Stable price action' });
    } else {
      result.breakdown.growth = 0.5;
      result.evidence.push({ type: 'negative', text: `Declining (${priceChange.toFixed(1)}% 24h)` });
    }

    // Platform Diversity (0-2)
    let platforms = 0;
    if (candidate.twitter) platforms++;
    if (candidate.telegram) platforms++;
    if (candidate.website) platforms++;
    if (candidate.discord) platforms++;

    result.breakdown.diversity = Math.min(2, platforms * 0.5);
    if (platforms >= 3) {
      result.evidence.push({ type: 'positive', text: `Multi-platform presence (${platforms} platforms)` });
    } else if (platforms >= 1) {
      result.evidence.push({ type: 'neutral', text: `Limited platform presence (${platforms} platforms)` });
    }

    // Sentiment (0-1)
    // Would need sentiment analysis API for real data
    if (candidate.aiDecision?.confidence > 0.7) {
      result.breakdown.sentiment = 1;
      result.evidence.push({ type: 'positive', text: 'Positive AI sentiment' });
    } else if (candidate.aiDecision?.confidence > 0.5) {
      result.breakdown.sentiment = 0.5;
      result.evidence.push({ type: 'neutral', text: 'Neutral sentiment' });
    } else {
      result.breakdown.sentiment = 0.5;
      result.evidence.push({ type: 'neutral', text: 'Sentiment data unavailable' });
    }

    result.score = Object.values(result.breakdown).reduce((a, b) => a + b, 0);
    return result;
  }

  /**
   * Evaluate Tokenomics category (0-10)
   */
  async evaluateTokenomics(candidate) {
    const result = {
      score: 0,
      maxScore: 10,
      breakdown: {
        distribution: 0,  // 2 points
        fairness: 0,      // 2 points
        utility: 0,       // 2 points
        economics: 0,     // 2 points
        upside: 0         // 2 points
      },
      evidence: []
    };

    // Supply Distribution (0-2)
    const circulatingRatio = candidate.totalSupply > 0 ?
      (candidate.circulatingSupply || 0) / candidate.totalSupply : 0;

    if (circulatingRatio > 0.8) {
      result.breakdown.distribution = 2;
      result.evidence.push({ type: 'positive', text: `${(circulatingRatio * 100).toFixed(0)}% of supply circulating` });
    } else if (circulatingRatio > 0.5) {
      result.breakdown.distribution = 1.5;
      result.evidence.push({ type: 'neutral', text: `${(circulatingRatio * 100).toFixed(0)}% of supply circulating` });
    } else if (circulatingRatio > 0) {
      result.breakdown.distribution = 1;
      result.evidence.push({ type: 'negative', text: `Low circulating supply (${(circulatingRatio * 100).toFixed(0)}%)` });
    } else {
      result.breakdown.distribution = 1;
      result.evidence.push({ type: 'neutral', text: 'Supply distribution unknown' });
    }

    // Allocation Fairness (0-2)
    // Check if top holders don't have too much
    const topHolderPercent = candidate.screening?.securityChecks?.topHolderPercent ||
      candidate.metrics?.top_holder_percent;

    if (topHolderPercent !== undefined) {
      if (topHolderPercent < 5) {
        result.breakdown.fairness = 2;
        result.evidence.push({ type: 'positive', text: 'Well distributed holdings' });
      } else if (topHolderPercent < 15) {
        result.breakdown.fairness = 1.5;
        result.evidence.push({ type: 'neutral', text: `Top holder owns ${topHolderPercent.toFixed(1)}%` });
      } else {
        result.breakdown.fairness = 0.5;
        result.evidence.push({ type: 'negative', text: `Concentrated holdings (${topHolderPercent.toFixed(1)}%)` });
      }
    } else {
      result.breakdown.fairness = 1;
      result.evidence.push({ type: 'neutral', text: 'Holder distribution unknown' });
    }

    // Utility (0-2)
    // Based on whether token has actual use case
    const hasUtility = candidate.description?.toLowerCase().includes('utility') ||
      candidate.categories?.some(c => ['defi', 'gaming', 'infrastructure'].includes(c.toLowerCase()));

    if (hasUtility) {
      result.breakdown.utility = 2;
      result.evidence.push({ type: 'positive', text: 'Token has clear utility' });
    } else if (candidate.sector === 'Meme') {
      result.breakdown.utility = 1;
      result.evidence.push({ type: 'neutral', text: 'Meme token (speculative value)' });
    } else {
      result.breakdown.utility = 1;
      result.evidence.push({ type: 'neutral', text: 'Utility unclear' });
    }

    // Economic Model (0-2)
    // Check taxes, burns, etc.
    const buyTax = candidate.screening?.securityChecks?.buyTax ||
      candidate.metrics?.buy_tax_percent || 0;
    const sellTax = candidate.screening?.securityChecks?.sellTax ||
      candidate.metrics?.sell_tax_percent || 0;

    if (buyTax === 0 && sellTax === 0) {
      result.breakdown.economics = 2;
      result.evidence.push({ type: 'positive', text: 'No buy/sell taxes' });
    } else if (buyTax < 5 && sellTax < 5) {
      result.breakdown.economics = 1.5;
      result.evidence.push({ type: 'neutral', text: `Low taxes (${buyTax}%/${sellTax}%)` });
    } else {
      result.breakdown.economics = 0.5;
      result.evidence.push({ type: 'negative', text: `High taxes (${buyTax}%/${sellTax}%)` });
    }

    // Upside Potential (0-2)
    // Based on market cap vs potential
    const mcap = candidate.marketCap || 0;

    if (mcap < 300000) {
      result.breakdown.upside = 2;
      result.evidence.push({ type: 'positive', text: `Micro cap ($${(mcap / 1000).toFixed(0)}K) - high upside` });
    } else if (mcap < 1000000) {
      result.breakdown.upside = 1.5;
      result.evidence.push({ type: 'positive', text: `Small cap ($${(mcap / 1000).toFixed(0)}K) - good upside` });
    } else if (mcap < 10000000) {
      result.breakdown.upside = 1;
      result.evidence.push({ type: 'neutral', text: `Early stage ($${(mcap / 1000000).toFixed(1)}M)` });
    } else {
      result.breakdown.upside = 0.5;
      result.evidence.push({ type: 'neutral', text: `Established ($${(mcap / 1000000).toFixed(1)}M)` });
    }

    result.score = Object.values(result.breakdown).reduce((a, b) => a + b, 0);
    return result;
  }

  /**
   * Evaluate Product category (0-10)
   */
  async evaluateProduct(candidate) {
    const result = {
      score: 0,
      maxScore: 10,
      breakdown: {
        working: 0,       // 4 points
        roadmap: 0,       // 2 points
        innovation: 0,    // 2 points
        technical: 0      // 2 points
      },
      evidence: []
    };

    // Working Product (0-4)
    const hasWebsite = !!candidate.website;
    const hasDescription = !!candidate.description && candidate.description.length > 100;

    if (hasWebsite && hasDescription) {
      result.breakdown.working = 3;
      result.evidence.push({ type: 'positive', text: 'Has website and product description' });
    } else if (hasWebsite || hasDescription) {
      result.breakdown.working = 2;
      result.evidence.push({ type: 'neutral', text: 'Partial product presence' });
    } else {
      result.breakdown.working = 1;
      result.evidence.push({ type: 'neutral', text: 'Product details limited' });
    }

    // For DeFi/established projects, add extra points
    if (candidate.sector === 'DeFi' || candidate.sector === 'Infra') {
      result.breakdown.working = Math.min(4, result.breakdown.working + 1);
      result.evidence.push({ type: 'positive', text: `${candidate.sector} project - likely has working product` });
    }

    // Roadmap (0-2)
    // Hard to evaluate without specific data, give neutral score
    result.breakdown.roadmap = 1;
    result.evidence.push({ type: 'neutral', text: 'Roadmap data not available' });

    // Innovation (0-2)
    if (candidate.sector === 'AI') {
      result.breakdown.innovation = 2;
      result.evidence.push({ type: 'positive', text: 'AI sector - high innovation potential' });
    } else if (['DeFi', 'Infra', 'RWA'].includes(candidate.sector)) {
      result.breakdown.innovation = 1.5;
      result.evidence.push({ type: 'positive', text: `${candidate.sector} - innovative sector` });
    } else {
      result.breakdown.innovation = 1;
      result.evidence.push({ type: 'neutral', text: 'Innovation level unknown' });
    }

    // Technical Quality (0-2)
    // Based on contract verification, audit, etc.
    const isVerified = !candidate.screening?.securityChecks?.isProxy;
    const isNotMintable = !candidate.screening?.securityChecks?.isMintable;

    if (isVerified && isNotMintable) {
      result.breakdown.technical = 2;
      result.evidence.push({ type: 'positive', text: 'Contract appears secure' });
    } else if (isVerified || isNotMintable) {
      result.breakdown.technical = 1;
      result.evidence.push({ type: 'neutral', text: 'Some contract concerns' });
    } else {
      result.breakdown.technical = 0.5;
      result.evidence.push({ type: 'negative', text: 'Contract security concerns' });
    }

    result.score = Object.values(result.breakdown).reduce((a, b) => a + b, 0);
    return result;
  }

  /**
   * Evaluate Market Position category (0-10)
   */
  async evaluateMarket(candidate, config) {
    const result = {
      score: 0,
      maxScore: 10,
      breakdown: {
        timing: 0,        // 3 points
        competition: 0,   // 3 points
        metrics: 0,       // 2 points
        liquidity: 0      // 2 points
      },
      evidence: []
    };

    // Market Timing (0-3)
    // Hot sectors get higher scores
    const hotSectors = ['AI', 'RWA', 'Meme'];
    if (hotSectors.includes(candidate.sector)) {
      result.breakdown.timing = 3;
      result.evidence.push({ type: 'positive', text: `${candidate.sector} is a trending sector` });
    } else if (['DeFi', 'Gaming'].includes(candidate.sector)) {
      result.breakdown.timing = 2;
      result.evidence.push({ type: 'neutral', text: `${candidate.sector} is an established sector` });
    } else {
      result.breakdown.timing = 1;
      result.evidence.push({ type: 'neutral', text: 'Market timing neutral' });
    }

    // Competition (0-3)
    // Lower market cap in hot sector = less competition
    const mcap = candidate.marketCap || 0;
    if (mcap < 1000000 && hotSectors.includes(candidate.sector)) {
      result.breakdown.competition = 3;
      result.evidence.push({ type: 'positive', text: 'Early entry in trending sector' });
    } else if (mcap < 5000000) {
      result.breakdown.competition = 2;
      result.evidence.push({ type: 'positive', text: 'Limited competition at this stage' });
    } else {
      result.breakdown.competition = 1;
      result.evidence.push({ type: 'neutral', text: 'Competitive market' });
    }

    // Market Metrics (0-2)
    // Volume, holder count, etc.
    const volume = candidate.volume24h || 0;
    const holders = candidate.holderCount || candidate.screening?.securityChecks?.holders || 0;

    if (volume > 100000 && holders > 500) {
      result.breakdown.metrics = 2;
      result.evidence.push({ type: 'positive', text: 'Strong market metrics' });
    } else if (volume > 10000 || holders > 100) {
      result.breakdown.metrics = 1.5;
      result.evidence.push({ type: 'neutral', text: 'Decent market metrics' });
    } else {
      result.breakdown.metrics = 1;
      result.evidence.push({ type: 'neutral', text: 'Early stage metrics' });
    }

    // Liquidity (0-2)
    const liquidity = candidate.liquidity || 0;

    if (liquidity > 100000) {
      result.breakdown.liquidity = 2;
      result.evidence.push({ type: 'positive', text: `Strong liquidity ($${(liquidity / 1000).toFixed(0)}K)` });
    } else if (liquidity > 30000) {
      result.breakdown.liquidity = 1.5;
      result.evidence.push({ type: 'neutral', text: `Adequate liquidity ($${(liquidity / 1000).toFixed(0)}K)` });
    } else if (liquidity > 10000) {
      result.breakdown.liquidity = 1;
      result.evidence.push({ type: 'neutral', text: `Low liquidity ($${(liquidity / 1000).toFixed(0)}K)` });
    } else {
      result.breakdown.liquidity = 0.5;
      result.evidence.push({ type: 'negative', text: `Very low liquidity ($${liquidity.toLocaleString()})` });
    }

    result.score = Object.values(result.breakdown).reduce((a, b) => a + b, 0);
    return result;
  }

  /**
   * Generate recommendation based on evaluation
   */
  generateRecommendation(evaluation, config) {
    const score = evaluation.totalScore;
    const percentage = parseFloat(evaluation.percentage);

    let recommendation, confidence;

    if (score >= this.thresholds.strongBuy) {
      recommendation = 'STRONG_BUY';
      confidence = 'High';
    } else if (score >= this.thresholds.buy) {
      recommendation = 'BUY';
      confidence = 'Medium-High';
    } else if (score >= this.thresholds.hold) {
      recommendation = 'HOLD';
      confidence = 'Medium';
    } else {
      recommendation = 'AVOID';
      confidence = 'Low';
    }

    // Adjust confidence based on risk setting
    if (config.risk === 'High') {
      // More aggressive - upgrade recommendations
      if (recommendation === 'HOLD' && percentage > 55) {
        recommendation = 'BUY';
        confidence = 'Medium';
      }
    } else if (config.risk === 'Low') {
      // More conservative - downgrade recommendations
      if (recommendation === 'BUY' && percentage < 75) {
        recommendation = 'HOLD';
        confidence = 'Medium';
      }
    }

    return { recommendation, confidence };
  }
}

export default EvaluationService;
