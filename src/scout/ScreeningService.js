/**
 * Screening Service - Phase 2 of Scout Framework
 *
 * Filters candidates based on:
 * - Upside potential scoring (market cap, momentum, traction)
 * - Red flag detection (honeypot, tokenomics, team issues)
 * - Security analysis integration
 *
 * Target: Eliminate 70-80% of candidates, keep only promising ones
 */

class ScreeningService {
  constructor() {
    // Red flag definitions
    this.redFlagCriteria = {
      // Critical (auto-reject)
      critical: [
        { id: 'honeypot', name: 'Honeypot Detected', weight: 10 },
        { id: 'rugpull_history', name: 'Creator Has Rugpull History', weight: 10 },
        { id: 'blacklisted', name: 'Token Blacklisted', weight: 10 }
      ],

      // Major (strong warning)
      major: [
        { id: 'anonymous_team', name: 'Anonymous Team', weight: 3 },
        { id: 'high_tax', name: 'High Buy/Sell Tax (>10%)', weight: 4 },
        { id: 'concentrated_holdings', name: 'Top Holder >20%', weight: 3 },
        { id: 'no_liquidity_lock', name: 'No Liquidity Lock', weight: 3 },
        { id: 'mintable', name: 'Mintable Token', weight: 2 },
        { id: 'proxy_contract', name: 'Proxy Contract', weight: 2 }
      ],

      // Minor (note of caution)
      minor: [
        { id: 'low_holders', name: 'Low Holder Count (<100)', weight: 1 },
        { id: 'low_liquidity', name: 'Low Liquidity (<$10k)', weight: 1 },
        { id: 'no_audit', name: 'No Contract Audit', weight: 1 },
        { id: 'new_token', name: 'Very New Token (<24h)', weight: 1 },
        { id: 'no_social', name: 'No Social Media', weight: 1 }
      ]
    };

    // Security API endpoints
    this.securityAPIs = {
      goplus: 'https://api.gopluslabs.io/api/v1/token_security',
      honeypot: 'https://api.honeypot.is/v2/IsHoneypot'
    };
  }

  /**
   * Screen a single candidate
   */
  async screenCandidate(candidate, config) {
    const result = {
      symbol: candidate.symbol,
      address: candidate.address,
      chain: candidate.chain,
      score: 0,
      maxScore: 10,
      upside: {},
      redFlags: [],
      warnings: [],
      securityChecks: {},
      passed: false,
      reason: null
    };

    try {
      // Calculate upside potential
      result.upside = this.calculateUpsideScore(candidate, config);

      // Run security checks
      result.securityChecks = await this.runSecurityChecks(candidate);

      // Detect red flags
      result.redFlags = this.detectRedFlags(candidate, result.securityChecks);

      // Calculate final score
      result.score = this.calculateFinalScore(result.upside, result.redFlags);

      // Determine if passed
      result.passed = result.score >= config.screeningThreshold &&
        !result.redFlags.some(rf => rf.severity === 'critical');

      if (!result.passed) {
        if (result.redFlags.some(rf => rf.severity === 'critical')) {
          result.reason = `Critical red flag: ${result.redFlags.find(rf => rf.severity === 'critical').name}`;
        } else {
          result.reason = `Score ${result.score.toFixed(1)}/10 below threshold ${config.screeningThreshold}`;
        }
      }

    } catch (error) {
      console.error(`[Screening] Error screening ${candidate.symbol}:`, error.message);
      result.score = 0;
      result.passed = false;
      result.reason = `Screening error: ${error.message}`;
    }

    return result;
  }

  /**
   * Calculate upside potential score (0-10)
   */
  calculateUpsideScore(candidate, config) {
    const scores = {
      marketCap: 0,
      momentum: 0,
      traction: 0,
      timing: 0,
      sector: 0
    };

    // Market Cap Score (0-2.5)
    // Lower market cap = higher upside potential
    const mcap = candidate.marketCap || 0;
    if (mcap > 0) {
      if (mcap < 100000) scores.marketCap = 2.5;
      else if (mcap < 300000) scores.marketCap = 2.0;
      else if (mcap < 1000000) scores.marketCap = 1.5;
      else if (mcap < 5000000) scores.marketCap = 1.0;
      else if (mcap < 10000000) scores.marketCap = 0.5;
    }

    // Momentum Score (0-2.5)
    // Based on price change and volume
    const priceChange = candidate.priceChange24h || 0;
    const volume = candidate.volume24h || 0;
    const volumeToMcap = mcap > 0 ? volume / mcap : 0;

    if (priceChange > 50) scores.momentum = 2.5;
    else if (priceChange > 20) scores.momentum = 2.0;
    else if (priceChange > 10) scores.momentum = 1.5;
    else if (priceChange > 0) scores.momentum = 1.0;
    else if (priceChange > -10) scores.momentum = 0.5;

    // Bonus for high volume relative to mcap
    if (volumeToMcap > 1) scores.momentum = Math.min(2.5, scores.momentum + 0.5);

    // Traction Score (0-2)
    // Based on holders, liquidity, social presence
    const holders = candidate.holderCount || candidate.holders || 0;
    const liquidity = candidate.liquidity || 0;

    if (holders > 1000) scores.traction = 1.0;
    else if (holders > 500) scores.traction = 0.75;
    else if (holders > 100) scores.traction = 0.5;
    else if (holders > 50) scores.traction = 0.25;

    if (liquidity > 100000) scores.traction += 1.0;
    else if (liquidity > 50000) scores.traction += 0.75;
    else if (liquidity > 20000) scores.traction += 0.5;
    else if (liquidity > 10000) scores.traction += 0.25;

    scores.traction = Math.min(2, scores.traction);

    // Timing Score (0-1.5)
    // Based on how new the token is (for config timeline)
    const listedAt = candidate.listedAt || candidate.createdAt;
    if (listedAt) {
      const ageHours = (Date.now() - new Date(listedAt).getTime()) / (1000 * 60 * 60);

      if (config.timeline === 'Days' || config.timeline === 'Weeks') {
        // Short-term: prefer very new
        if (ageHours < 24) scores.timing = 1.5;
        else if (ageHours < 72) scores.timing = 1.0;
        else if (ageHours < 168) scores.timing = 0.5;
      } else {
        // Longer-term: prefer established but still early
        if (ageHours > 168 && ageHours < 720) scores.timing = 1.5; // 1-4 weeks
        else if (ageHours > 72 && ageHours < 168) scores.timing = 1.0; // 3-7 days
        else if (ageHours < 72) scores.timing = 0.5; // Very new
      }
    }

    // Sector Score (0-1.5)
    // Based on how "hot" the sector is
    const hotSectors = ['AI', 'Meme', 'RWA', 'DeFi'];
    const mediumSectors = ['Gaming', 'Infra'];

    if (hotSectors.includes(candidate.sector)) {
      scores.sector = 1.5;
    } else if (mediumSectors.includes(candidate.sector)) {
      scores.sector = 1.0;
    } else if (candidate.sector) {
      scores.sector = 0.5;
    }

    // Calculate total
    const total = Object.values(scores).reduce((a, b) => a + b, 0);

    return {
      ...scores,
      total: Math.min(10, total),
      breakdown: `MC:${scores.marketCap.toFixed(1)} MOM:${scores.momentum.toFixed(1)} TRAC:${scores.traction.toFixed(1)} TIME:${scores.timing.toFixed(1)} SEC:${scores.sector.toFixed(1)}`
    };
  }

  /**
   * Run security checks on candidate
   */
  async runSecurityChecks(candidate) {
    const checks = {
      honeypot: null,
      buyTax: null,
      sellTax: null,
      isProxy: null,
      isMintable: null,
      holders: null,
      topHolderPercent: null,
      liquidityLocked: null,
      verified: false
    };

    // If we already have metrics from Telegram alert, use those
    if (candidate.metrics) {
      checks.honeypot = candidate.metrics.is_honeypot;
      checks.buyTax = candidate.metrics.buy_tax_percent;
      checks.sellTax = candidate.metrics.sell_tax_percent;
      checks.holders = candidate.metrics.holder_count;
      checks.topHolderPercent = candidate.metrics.top_holder_percent;
      checks.verified = true;
      return checks;
    }

    // If we have AI decision from Telegram, use risk info
    if (candidate.aiDecision) {
      checks.riskScore = candidate.aiDecision.risk_score;
      return checks;
    }

    // Otherwise, try to fetch security data
    if (!candidate.address || !candidate.chain) {
      return checks;
    }

    try {
      // Try GoPlus API for EVM chains
      if (['ethereum', 'bsc', 'polygon', 'arbitrum'].includes(candidate.chain?.toLowerCase())) {
        const chainIds = {
          ethereum: '1',
          bsc: '56',
          polygon: '137',
          arbitrum: '42161'
        };

        const chainId = chainIds[candidate.chain.toLowerCase()];
        if (chainId) {
          const response = await fetch(
            `${this.securityAPIs.goplus}/${chainId}?contract_addresses=${candidate.address}`
          );

          if (response.ok) {
            const data = await response.json();
            const tokenData = data.result?.[candidate.address.toLowerCase()];

            if (tokenData) {
              checks.honeypot = tokenData.is_honeypot === '1';
              checks.buyTax = parseFloat(tokenData.buy_tax || '0') * 100;
              checks.sellTax = parseFloat(tokenData.sell_tax || '0') * 100;
              checks.isProxy = tokenData.is_proxy === '1';
              checks.isMintable = tokenData.is_mintable === '1';
              checks.holders = parseInt(tokenData.holder_count || '0');

              if (tokenData.holders && tokenData.holders.length > 0) {
                const topHolder = tokenData.holders.reduce((max, h) =>
                  parseFloat(h.percent) > parseFloat(max.percent) ? h : max
                );
                checks.topHolderPercent = parseFloat(topHolder.percent) * 100;
              }

              checks.verified = true;
            }
          }
        }
      }

      // For Solana, we rely on data from DexScreener or existing metrics
      // Full Solana security checks would need RugCheck.xyz integration

    } catch (error) {
      console.error(`[Screening] Security check error for ${candidate.symbol}:`, error.message);
    }

    return checks;
  }

  /**
   * Detect red flags from candidate data and security checks
   */
  detectRedFlags(candidate, securityChecks) {
    const redFlags = [];

    // Critical checks
    if (securityChecks.honeypot === true) {
      redFlags.push({
        id: 'honeypot',
        name: 'Honeypot Detected',
        severity: 'critical',
        description: 'Token cannot be sold - likely a scam'
      });
    }

    // Major checks
    if (securityChecks.buyTax > 10 || securityChecks.sellTax > 10) {
      redFlags.push({
        id: 'high_tax',
        name: `High Tax (Buy: ${securityChecks.buyTax?.toFixed(1)}%, Sell: ${securityChecks.sellTax?.toFixed(1)}%)`,
        severity: 'major',
        description: 'High transaction taxes reduce profit potential'
      });
    }

    if (securityChecks.topHolderPercent > 20) {
      redFlags.push({
        id: 'concentrated_holdings',
        name: `Top Holder Owns ${securityChecks.topHolderPercent?.toFixed(1)}%`,
        severity: 'major',
        description: 'Concentrated holdings increase dump risk'
      });
    }

    if (securityChecks.isMintable === true) {
      redFlags.push({
        id: 'mintable',
        name: 'Mintable Token',
        severity: 'major',
        description: 'Owner can create new tokens, diluting value'
      });
    }

    if (securityChecks.isProxy === true) {
      redFlags.push({
        id: 'proxy_contract',
        name: 'Proxy Contract',
        severity: 'major',
        description: 'Contract can be modified by owner'
      });
    }

    // Check for anonymous team
    if (!candidate.twitter && !candidate.telegram && !candidate.website) {
      redFlags.push({
        id: 'no_social',
        name: 'No Social Media Presence',
        severity: 'minor',
        description: 'No official social channels found'
      });
    }

    // Minor checks
    if (securityChecks.holders !== null && securityChecks.holders < 100) {
      redFlags.push({
        id: 'low_holders',
        name: `Low Holder Count (${securityChecks.holders})`,
        severity: 'minor',
        description: 'Few holders increase volatility risk'
      });
    }

    const liquidity = candidate.liquidity || 0;
    if (liquidity < 10000) {
      redFlags.push({
        id: 'low_liquidity',
        name: `Low Liquidity ($${liquidity.toLocaleString()})`,
        severity: 'minor',
        description: 'Low liquidity means high slippage'
      });
    }

    // Check token age
    const listedAt = candidate.listedAt || candidate.createdAt;
    if (listedAt) {
      const ageHours = (Date.now() - new Date(listedAt).getTime()) / (1000 * 60 * 60);
      if (ageHours < 24) {
        redFlags.push({
          id: 'new_token',
          name: `Very New Token (${ageHours.toFixed(1)}h old)`,
          severity: 'minor',
          description: 'Very new tokens have higher risk'
        });
      }
    }

    return redFlags;
  }

  /**
   * Calculate final screening score
   */
  calculateFinalScore(upside, redFlags) {
    let score = upside.total;

    // Deduct for red flags
    for (const flag of redFlags) {
      if (flag.severity === 'critical') {
        return 0; // Auto-fail
      } else if (flag.severity === 'major') {
        score -= 2;
      } else if (flag.severity === 'minor') {
        score -= 0.5;
      }
    }

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Batch screen multiple candidates
   */
  async screenBatch(candidates, config) {
    const results = [];

    for (const candidate of candidates) {
      const result = await this.screenCandidate(candidate, config);
      results.push({
        ...candidate,
        screening: result
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Get screening summary statistics
   */
  getScreeningSummary(screenedResults) {
    const total = screenedResults.length;
    const passed = screenedResults.filter(r => r.screening.passed).length;
    const criticalFlags = screenedResults.filter(r =>
      r.screening.redFlags.some(rf => rf.severity === 'critical')
    ).length;

    const avgScore = total > 0 ?
      screenedResults.reduce((sum, r) => sum + r.screening.score, 0) / total : 0;

    return {
      total,
      passed,
      rejected: total - passed,
      passRate: total > 0 ? ((passed / total) * 100).toFixed(1) + '%' : '0%',
      avgScore: avgScore.toFixed(1),
      criticalFlagsFound: criticalFlags
    };
  }
}

export default ScreeningService;
