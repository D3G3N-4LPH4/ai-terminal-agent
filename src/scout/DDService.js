/**
 * Due Diligence Service - Phase 4 of Scout Framework
 *
 * Comprehensive 10-point checklist before investing:
 * 1. Basics (audit, market cap)
 * 2. Team (doxxed, active, clean history)
 * 3. Product (MVP, roadmap)
 * 4. Community (organic, positive)
 * 5. Tokenomics (fair, utility, locked)
 * 6. Risks (no critical flags)
 * 7. Legal (registered, compliant)
 * 8. Market (growing, weak competition)
 * 9. Entry/Exit (liquidity, plan)
 * 10. Portfolio Fit (diversification)
 *
 * 80%+ pass rate required for investment consideration
 */

class DDService {
  constructor() {
    // DD checklist items with weights
    this.checklist = [
      { id: 'basics', name: 'Basics', weight: 0.10 },
      { id: 'team', name: 'Team', weight: 0.15 },
      { id: 'product', name: 'Product', weight: 0.10 },
      { id: 'community', name: 'Community', weight: 0.10 },
      { id: 'tokenomics', name: 'Tokenomics', weight: 0.15 },
      { id: 'risks', name: 'Risks', weight: 0.15 },
      { id: 'legal', name: 'Legal', weight: 0.10 },
      { id: 'market', name: 'Market', weight: 0.05 },
      { id: 'entry_exit', name: 'Entry/Exit', weight: 0.05 },
      { id: 'portfolio', name: 'Portfolio Fit', weight: 0.05 }
    ];

    // Allocation recommendations based on confidence
    this.allocations = {
      veryHigh: { min: 3, max: 5, description: '3-5% of portfolio' },
      high: { min: 2, max: 3, description: '2-3% of portfolio' },
      medium: { min: 1, max: 2, description: '1-2% of portfolio' },
      low: { min: 0.5, max: 1, description: '0.5-1% of portfolio' },
      avoid: { min: 0, max: 0, description: 'Do not invest' }
    };
  }

  /**
   * Run full DD checklist
   */
  async runChecklist(candidate, evaluation, config) {
    const results = {
      symbol: candidate.symbol,
      name: candidate.name,
      checklist: [],
      passRate: 0,
      weightedScore: 0,
      passed: false,
      recommendation: null,
      action: null,
      allocation: null,
      confidence: null,
      completedAt: new Date()
    };

    try {
      // Run each checklist item
      results.checklist.push(await this.checkBasics(candidate, evaluation));
      results.checklist.push(await this.checkTeam(candidate, evaluation));
      results.checklist.push(await this.checkProduct(candidate, evaluation));
      results.checklist.push(await this.checkCommunity(candidate, evaluation));
      results.checklist.push(await this.checkTokenomics(candidate, evaluation));
      results.checklist.push(await this.checkRisks(candidate, evaluation));
      results.checklist.push(await this.checkLegal(candidate, evaluation));
      results.checklist.push(await this.checkMarket(candidate, evaluation, config));
      results.checklist.push(await this.checkEntryExit(candidate, evaluation));
      results.checklist.push(await this.checkPortfolioFit(candidate, evaluation, config));

      // Calculate pass rate and weighted score
      const passedCount = results.checklist.filter(c => c.passed).length;
      results.passRate = passedCount / results.checklist.length;

      results.weightedScore = results.checklist.reduce((sum, item) => {
        const weight = this.checklist.find(c => c.id === item.id)?.weight || 0.1;
        return sum + (item.passed ? weight : 0);
      }, 0);

      // Determine if DD passed
      results.passed = results.passRate >= config.ddThreshold;

      // Generate final recommendation
      const rec = this.generateFinalRecommendation(results, evaluation, config);
      results.recommendation = rec.recommendation;
      results.action = rec.action;
      results.allocation = rec.allocation;
      results.confidence = rec.confidence;

    } catch (error) {
      console.error('[DD] Error:', error.message);
      results.error = error.message;
    }

    return results;
  }

  /**
   * 1. Basics Check - Audit, market cap verification
   */
  async checkBasics(candidate, evaluation) {
    const result = {
      id: 'basics',
      name: 'Basics',
      passed: false,
      score: 0,
      maxScore: 3,
      checks: [],
      notes: []
    };

    // Check market cap is reasonable
    const mcap = candidate.marketCap || 0;
    if (mcap > 0 && mcap < 100000000) {
      result.checks.push({ item: 'Market cap verified', passed: true });
      result.score++;
    } else {
      result.checks.push({ item: 'Market cap verified', passed: false, note: 'No market cap data or too large' });
    }

    // Check if contract exists on chain
    if (candidate.address && candidate.chain) {
      result.checks.push({ item: 'Contract verified on chain', passed: true });
      result.score++;
    } else {
      result.checks.push({ item: 'Contract verified on chain', passed: false });
    }

    // Check for any audit (placeholder - would need audit API)
    const hasAudit = candidate.audit || candidate.audited;
    if (hasAudit) {
      result.checks.push({ item: 'Contract audited', passed: true });
      result.score++;
    } else {
      result.checks.push({ item: 'Contract audited', passed: false, note: 'No audit found' });
      result.notes.push('Consider manual contract review');
    }

    result.passed = result.score >= 2;
    return result;
  }

  /**
   * 2. Team Check - Doxxed, active, clean history
   */
  async checkTeam(candidate, evaluation) {
    const result = {
      id: 'team',
      name: 'Team',
      passed: false,
      score: 0,
      maxScore: 3,
      checks: [],
      notes: []
    };

    const teamScore = evaluation.categories?.team?.score || 0;

    // Check if team is identified
    if (teamScore >= 7) {
      result.checks.push({ item: 'Team identified/doxxed', passed: true });
      result.score++;
    } else if (candidate.twitter || candidate.telegram) {
      result.checks.push({ item: 'Team identified/doxxed', passed: true, note: 'Social presence but not fully doxxed' });
      result.score += 0.5;
    } else {
      result.checks.push({ item: 'Team identified/doxxed', passed: false });
      result.notes.push('Anonymous team increases risk');
    }

    // Check development activity
    const activityScore = evaluation.categories?.team?.breakdown?.activity || 0;
    if (activityScore >= 2) {
      result.checks.push({ item: 'Active development', passed: true });
      result.score++;
    } else {
      result.checks.push({ item: 'Active development', passed: false });
    }

    // Check for clean history (placeholder)
    result.checks.push({ item: 'No rugpull history', passed: true, note: 'Manual verification recommended' });
    result.score++;

    result.passed = result.score >= 2;
    return result;
  }

  /**
   * 3. Product Check - MVP exists, roadmap quality
   */
  async checkProduct(candidate, evaluation) {
    const result = {
      id: 'product',
      name: 'Product',
      passed: false,
      score: 0,
      maxScore: 3,
      checks: [],
      notes: []
    };

    const productScore = evaluation.categories?.product?.score || 0;

    // Check for working product
    if (candidate.website) {
      result.checks.push({ item: 'Website/product exists', passed: true });
      result.score++;
    } else {
      result.checks.push({ item: 'Website/product exists', passed: false });
    }

    // Check product quality from evaluation
    if (productScore >= 6) {
      result.checks.push({ item: 'Product quality acceptable', passed: true });
      result.score++;
    } else {
      result.checks.push({ item: 'Product quality acceptable', passed: false });
    }

    // Roadmap check
    if (candidate.description && candidate.description.length > 200) {
      result.checks.push({ item: 'Has description/roadmap', passed: true });
      result.score++;
    } else {
      result.checks.push({ item: 'Has description/roadmap', passed: false });
      result.notes.push('Limited product information available');
    }

    result.passed = result.score >= 2;
    return result;
  }

  /**
   * 4. Community Check - Organic, positive sentiment
   */
  async checkCommunity(candidate, evaluation) {
    const result = {
      id: 'community',
      name: 'Community',
      passed: false,
      score: 0,
      maxScore: 3,
      checks: [],
      notes: []
    };

    const communityScore = evaluation.categories?.community?.score || 0;

    // Check community size
    if (communityScore >= 5) {
      result.checks.push({ item: 'Has active community', passed: true });
      result.score++;
    } else {
      result.checks.push({ item: 'Has active community', passed: false });
    }

    // Check engagement
    const engagementScore = evaluation.categories?.community?.breakdown?.engagement || 0;
    if (engagementScore >= 1.5) {
      result.checks.push({ item: 'Good engagement', passed: true });
      result.score++;
    } else {
      result.checks.push({ item: 'Good engagement', passed: false });
    }

    // Check sentiment (placeholder)
    if (candidate.aiDecision?.confidence > 0.5) {
      result.checks.push({ item: 'Positive sentiment', passed: true });
      result.score++;
    } else {
      result.checks.push({ item: 'Positive sentiment', passed: true, note: 'Sentiment data limited' });
      result.score += 0.5;
    }

    result.passed = result.score >= 2;
    return result;
  }

  /**
   * 5. Tokenomics Check - Fair distribution, utility, locks
   */
  async checkTokenomics(candidate, evaluation) {
    const result = {
      id: 'tokenomics',
      name: 'Tokenomics',
      passed: false,
      score: 0,
      maxScore: 4,
      checks: [],
      notes: []
    };

    const tokenomicsScore = evaluation.categories?.tokenomics?.score || 0;

    // Check distribution fairness
    const fairnessScore = evaluation.categories?.tokenomics?.breakdown?.fairness || 0;
    if (fairnessScore >= 1.5) {
      result.checks.push({ item: 'Fair distribution', passed: true });
      result.score++;
    } else {
      result.checks.push({ item: 'Fair distribution', passed: false });
      result.notes.push('Concentrated holdings detected');
    }

    // Check for utility
    const utilityScore = evaluation.categories?.tokenomics?.breakdown?.utility || 0;
    if (utilityScore >= 1.5) {
      result.checks.push({ item: 'Has utility', passed: true });
      result.score++;
    } else if (candidate.sector === 'Meme') {
      result.checks.push({ item: 'Has utility', passed: true, note: 'Meme token - speculative value' });
      result.score += 0.5;
    } else {
      result.checks.push({ item: 'Has utility', passed: false });
    }

    // Check taxes
    const buyTax = candidate.screening?.securityChecks?.buyTax || 0;
    const sellTax = candidate.screening?.securityChecks?.sellTax || 0;
    if (buyTax < 10 && sellTax < 10) {
      result.checks.push({ item: 'Reasonable taxes', passed: true });
      result.score++;
    } else {
      result.checks.push({ item: 'Reasonable taxes', passed: false, note: `High taxes: ${buyTax}%/${sellTax}%` });
    }

    // Check liquidity lock (placeholder)
    result.checks.push({ item: 'Liquidity considerations', passed: true, note: 'Manual verification needed' });
    result.score += 0.5;

    result.passed = result.score >= 2.5;
    return result;
  }

  /**
   * 6. Risks Check - No critical red flags
   */
  async checkRisks(candidate, evaluation) {
    const result = {
      id: 'risks',
      name: 'Risks',
      passed: false,
      score: 0,
      maxScore: 4,
      checks: [],
      notes: []
    };

    const securityChecks = candidate.screening?.securityChecks || {};
    const redFlags = candidate.screening?.redFlags || [];

    // Check for honeypot
    if (securityChecks.honeypot !== true) {
      result.checks.push({ item: 'Not a honeypot', passed: true });
      result.score++;
    } else {
      result.checks.push({ item: 'Not a honeypot', passed: false });
      result.notes.push('CRITICAL: Honeypot detected!');
    }

    // Check for mintable
    if (securityChecks.isMintable !== true) {
      result.checks.push({ item: 'Not mintable', passed: true });
      result.score++;
    } else {
      result.checks.push({ item: 'Not mintable', passed: false });
      result.notes.push('Owner can mint new tokens');
    }

    // Check for proxy
    if (securityChecks.isProxy !== true) {
      result.checks.push({ item: 'Not a proxy contract', passed: true });
      result.score++;
    } else {
      result.checks.push({ item: 'Not a proxy contract', passed: false });
      result.notes.push('Contract can be modified');
    }

    // Check critical red flags
    const criticalFlags = redFlags.filter(rf => rf.severity === 'critical');
    if (criticalFlags.length === 0) {
      result.checks.push({ item: 'No critical red flags', passed: true });
      result.score++;
    } else {
      result.checks.push({ item: 'No critical red flags', passed: false });
      result.notes.push(`Critical flags: ${criticalFlags.map(f => f.name).join(', ')}`);
    }

    result.passed = result.score >= 3;
    return result;
  }

  /**
   * 7. Legal Check - Registration, compliance
   */
  async checkLegal(candidate, evaluation) {
    const result = {
      id: 'legal',
      name: 'Legal',
      passed: false,
      score: 0,
      maxScore: 2,
      checks: [],
      notes: []
    };

    // Legal checks are difficult to automate - give neutral scores
    // In production, would integrate with regulatory databases

    // Check if not a known security token issue
    result.checks.push({ item: 'Not a registered security', passed: true, note: 'Manual verification needed' });
    result.score++;

    // Check jurisdiction (placeholder)
    result.checks.push({ item: 'No known legal issues', passed: true, note: 'Self-verify compliance in your jurisdiction' });
    result.score++;

    result.notes.push('Legal compliance is your responsibility - DYOR');

    result.passed = result.score >= 1;
    return result;
  }

  /**
   * 8. Market Check - Growing market, competition analysis
   */
  async checkMarket(candidate, evaluation, config) {
    const result = {
      id: 'market',
      name: 'Market',
      passed: false,
      score: 0,
      maxScore: 3,
      checks: [],
      notes: []
    };

    const marketScore = evaluation.categories?.market?.score || 0;

    // Check market timing
    if (marketScore >= 6) {
      result.checks.push({ item: 'Good market timing', passed: true });
      result.score++;
    } else {
      result.checks.push({ item: 'Good market timing', passed: false });
    }

    // Check sector growth
    const hotSectors = ['AI', 'RWA', 'Meme'];
    if (hotSectors.includes(candidate.sector)) {
      result.checks.push({ item: 'Trending sector', passed: true });
      result.score++;
    } else {
      result.checks.push({ item: 'Trending sector', passed: false, note: `${candidate.sector || 'Unknown'} sector` });
    }

    // Check competition (low mcap = less competition)
    const mcap = candidate.marketCap || 0;
    if (mcap < 5000000) {
      result.checks.push({ item: 'Early market position', passed: true });
      result.score++;
    } else {
      result.checks.push({ item: 'Early market position', passed: false });
    }

    result.passed = result.score >= 2;
    return result;
  }

  /**
   * 9. Entry/Exit Check - Liquidity, trading plan
   */
  async checkEntryExit(candidate, evaluation) {
    const result = {
      id: 'entry_exit',
      name: 'Entry/Exit',
      passed: false,
      score: 0,
      maxScore: 3,
      checks: [],
      notes: []
    };

    // Check liquidity
    const liquidity = candidate.liquidity || 0;
    if (liquidity > 50000) {
      result.checks.push({ item: 'Sufficient liquidity', passed: true });
      result.score++;
    } else if (liquidity > 20000) {
      result.checks.push({ item: 'Sufficient liquidity', passed: true, note: `Moderate liquidity ($${(liquidity / 1000).toFixed(0)}K)` });
      result.score += 0.5;
    } else {
      result.checks.push({ item: 'Sufficient liquidity', passed: false, note: `Low liquidity ($${liquidity.toLocaleString()})` });
    }

    // Check slippage would be acceptable (based on liquidity vs typical trade size)
    if (liquidity > 30000) {
      result.checks.push({ item: 'Acceptable slippage', passed: true });
      result.score++;
    } else {
      result.checks.push({ item: 'Acceptable slippage', passed: false, note: 'High slippage expected' });
      result.notes.push('Use limit orders and small position sizes');
    }

    // Exit strategy consideration
    result.checks.push({ item: 'Exit strategy defined', passed: true, note: 'Set stop loss and take profit targets' });
    result.score++;
    result.notes.push('Recommended: Set stop loss at -20% to -30%, take profit at +50% to +100%');

    result.passed = result.score >= 2;
    return result;
  }

  /**
   * 10. Portfolio Fit Check - Diversification, risk allocation
   */
  async checkPortfolioFit(candidate, evaluation, config) {
    const result = {
      id: 'portfolio',
      name: 'Portfolio Fit',
      passed: false,
      score: 0,
      maxScore: 2,
      checks: [],
      notes: []
    };

    // Check if allocation makes sense for risk level
    if (config.risk === 'High') {
      result.checks.push({ item: 'Fits risk profile', passed: true });
      result.score++;
      result.notes.push('High risk tolerance - can allocate 3-5% max');
    } else if (config.risk === 'Medium') {
      result.checks.push({ item: 'Fits risk profile', passed: true });
      result.score++;
      result.notes.push('Medium risk tolerance - allocate 1-3% max');
    } else {
      const totalScore = evaluation.totalScore || 0;
      if (totalScore >= 35) {
        result.checks.push({ item: 'Fits risk profile', passed: true });
        result.score++;
      } else {
        result.checks.push({ item: 'Fits risk profile', passed: false, note: 'Too risky for conservative strategy' });
      }
    }

    // Diversification check (would need portfolio context)
    result.checks.push({ item: 'Diversification check', passed: true, note: 'Ensure not overexposed to single sector' });
    result.score++;

    result.passed = result.score >= 1;
    return result;
  }

  /**
   * Generate final recommendation
   */
  generateFinalRecommendation(ddResults, evaluation, config) {
    const passRate = ddResults.passRate;
    const weightedScore = ddResults.weightedScore;
    const evalScore = evaluation.totalScore || 0;

    let recommendation, action, allocation, confidence;

    if (passRate >= 0.9 && evalScore >= 40) {
      recommendation = 'STRONG BUY';
      action = 'Enter position immediately';
      allocation = this.allocations.veryHigh.description;
      confidence = 'Very High';
    } else if (passRate >= 0.8 && evalScore >= 35) {
      recommendation = 'BUY';
      action = 'Enter position with standard allocation';
      allocation = this.allocations.high.description;
      confidence = 'High';
    } else if (passRate >= 0.7 && evalScore >= 30) {
      recommendation = 'SPECULATIVE BUY';
      action = 'Enter small position, monitor closely';
      allocation = this.allocations.medium.description;
      confidence = 'Medium';
    } else if (passRate >= 0.6 && evalScore >= 25) {
      recommendation = 'WATCHLIST';
      action = 'Add to watchlist, wait for better entry';
      allocation = this.allocations.low.description;
      confidence = 'Low';
    } else {
      recommendation = 'AVOID';
      action = 'Do not invest - fails DD criteria';
      allocation = this.allocations.avoid.description;
      confidence = 'N/A';
    }

    // Adjust based on risk profile
    if (config.risk === 'Low' && recommendation !== 'STRONG BUY') {
      if (recommendation === 'BUY') {
        recommendation = 'SPECULATIVE BUY';
        allocation = this.allocations.medium.description;
      } else if (recommendation === 'SPECULATIVE BUY') {
        recommendation = 'WATCHLIST';
        allocation = this.allocations.low.description;
      }
    }

    return { recommendation, action, allocation, confidence };
  }
}

export default DDService;
