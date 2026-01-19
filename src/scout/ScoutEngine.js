/**
 * Scout Engine - Main Orchestrator for 100x Token Discovery
 *
 * Implements a systematic 4-phase framework:
 * 1. Discovery - Find candidates from multiple sources
 * 2. Screening - Filter with red flag detection
 * 3. Evaluation - 50-point scoring system
 * 4. Due Diligence - 10-point checklist
 *
 * Integrates with Telegram Scanner and LiveTradingEngine
 */

import DiscoveryService from './DiscoveryService.js';
import ScreeningService from './ScreeningService.js';
import EvaluationService from './EvaluationService.js';
import DDService from './DDService.js';

class ScoutEngine {
  constructor() {
    // Initialize services
    this.discoveryService = new DiscoveryService();
    this.screeningService = new ScreeningService();
    this.evaluationService = new EvaluationService();
    this.ddService = new DDService();

    // State management
    this.state = {
      candidates: [],
      screened: [],
      evaluated: new Map(),
      ddReports: new Map(),
      watchlist: [],
      lastDiscovery: null,
      lastScreening: null
    };

    // Default configuration
    this.config = {
      // Market cap filters
      marketCap: 'emerging', // ultra (<$300K), emerging (<$1M), early (<$10M), mid (<$100M)

      // Sector filter
      sector: 'Any', // DeFi, AI, Gaming, Meme, Infra, RWA, Any

      // Risk level
      risk: 'Medium', // High, Medium, Low

      // Investment timeline
      timeline: 'Months', // Days, Weeks, Months, Years

      // Discovery settings
      maxCandidates: 50,
      sources: ['coingecko', 'dexscreener', 'coinmarketcap', 'telegram'],

      // Screening thresholds
      screeningThreshold: 6, // Minimum score to pass (out of 10)
      maxRedFlags: 2, // Maximum red flags allowed

      // Evaluation thresholds
      evaluationThreshold: 30, // Minimum score to recommend (out of 50)

      // DD threshold
      ddThreshold: 0.8, // 80% pass rate required

      // Chains to include
      chains: ['solana', 'ethereum', 'bsc'],

      // Auto-integration with other systems
      autoScoutTelegramAlerts: false,
      feedToLiveTradingEngine: false
    };

    // Statistics
    this.stats = {
      totalDiscovered: 0,
      totalScreened: 0,
      totalEvaluated: 0,
      totalDDPassed: 0,
      sessionsRun: 0,
      startTime: null
    };

    // Market cap ranges
    this.marketCapRanges = {
      ultra: { min: 0, max: 300000 },
      emerging: { min: 0, max: 1000000 },
      early: { min: 0, max: 10000000 },
      mid: { min: 0, max: 100000000 },
      any: { min: 0, max: Infinity }
    };
  }

  // ==================== PHASE 1: DISCOVERY ====================

  /**
   * Discover new token candidates from multiple sources
   */
  async discover(params = {}) {
    const startTime = Date.now();
    const mergedParams = { ...this.config, ...params };

    console.log('[Scout] Starting discovery phase...');
    console.log(`[Scout] Config: marketCap=${mergedParams.marketCap}, sector=${mergedParams.sector}`);

    try {
      // Get market cap range
      const mcRange = this.marketCapRanges[mergedParams.marketCap.toLowerCase()] || this.marketCapRanges.emerging;

      // Discover from all configured sources in parallel
      const discoveryPromises = [];

      if (mergedParams.sources.includes('coingecko')) {
        discoveryPromises.push(this.discoveryService.discoverFromCoinGecko(mcRange, mergedParams));
      }

      if (mergedParams.sources.includes('dexscreener')) {
        discoveryPromises.push(this.discoveryService.discoverFromDexScreener(mcRange, mergedParams));
      }

      if (mergedParams.sources.includes('coinmarketcap')) {
        discoveryPromises.push(this.discoveryService.discoverFromCoinMarketCap(mcRange, mergedParams));
      }

      // Wait for all sources
      const results = await Promise.allSettled(discoveryPromises);

      // Aggregate and deduplicate
      let allCandidates = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          console.log(`[Scout] Source ${index + 1}: Found ${result.value.length} candidates`);
          allCandidates = allCandidates.concat(result.value);
        } else if (result.status === 'rejected') {
          console.error(`[Scout] Source ${index + 1} failed:`, result.reason?.message || result.reason);
        }
      });

      // Deduplicate by symbol/address
      const seen = new Set();
      const uniqueCandidates = allCandidates.filter(c => {
        const key = c.address?.toLowerCase() || c.symbol?.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Filter by sector if specified
      let filteredCandidates = uniqueCandidates;
      if (mergedParams.sector && mergedParams.sector !== 'Any') {
        filteredCandidates = uniqueCandidates.filter(c =>
          c.sector?.toLowerCase() === mergedParams.sector.toLowerCase() ||
          c.categories?.some(cat => cat.toLowerCase().includes(mergedParams.sector.toLowerCase()))
        );
      }

      // Filter by chain if specified
      if (mergedParams.chains && mergedParams.chains.length > 0) {
        filteredCandidates = filteredCandidates.filter(c =>
          !c.chain || mergedParams.chains.includes(c.chain.toLowerCase())
        );
      }

      // Limit to maxCandidates
      const finalCandidates = filteredCandidates.slice(0, mergedParams.maxCandidates);

      // Update state
      this.state.candidates = finalCandidates;
      this.state.lastDiscovery = new Date();
      this.stats.totalDiscovered += finalCandidates.length;
      this.stats.sessionsRun++;

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      return {
        success: true,
        phase: 'discovery',
        candidates: finalCandidates,
        count: finalCandidates.length,
        sources: mergedParams.sources,
        duration: `${duration}s`,
        message: `Found ${finalCandidates.length} candidates from ${mergedParams.sources.length} sources`
      };

    } catch (error) {
      console.error('[Scout] Discovery error:', error);
      return {
        success: false,
        phase: 'discovery',
        error: error.message,
        candidates: []
      };
    }
  }

  // ==================== PHASE 2: SCREENING ====================

  /**
   * Screen candidates for red flags and upside potential
   */
  async screen(candidates = null) {
    const startTime = Date.now();
    const toScreen = candidates || this.state.candidates;

    if (!toScreen || toScreen.length === 0) {
      return {
        success: false,
        phase: 'screening',
        error: 'No candidates to screen. Run "scout discover" first.',
        screened: []
      };
    }

    console.log(`[Scout] Screening ${toScreen.length} candidates...`);

    try {
      const screenedResults = [];

      for (const candidate of toScreen) {
        const result = await this.screeningService.screenCandidate(candidate, this.config);
        screenedResults.push({
          ...candidate,
          screening: result
        });
      }

      // Filter by threshold and red flags
      const passed = screenedResults.filter(r =>
        r.screening.score >= this.config.screeningThreshold &&
        r.screening.redFlags.length <= this.config.maxRedFlags
      );

      // Sort by score descending
      passed.sort((a, b) => b.screening.score - a.screening.score);

      // Update state
      this.state.screened = passed;
      this.state.lastScreening = new Date();
      this.stats.totalScreened += passed.length;

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      const passRate = ((passed.length / toScreen.length) * 100).toFixed(0);

      return {
        success: true,
        phase: 'screening',
        screened: passed,
        count: passed.length,
        total: toScreen.length,
        passRate: `${passRate}%`,
        duration: `${duration}s`,
        threshold: this.config.screeningThreshold,
        message: `${passed.length}/${toScreen.length} passed screening (${passRate}%)`
      };

    } catch (error) {
      console.error('[Scout] Screening error:', error);
      return {
        success: false,
        phase: 'screening',
        error: error.message,
        screened: []
      };
    }
  }

  // ==================== PHASE 3: EVALUATION ====================

  /**
   * Deep evaluation of a specific token with 50-point scoring
   */
  async evaluate(symbolOrAddress) {
    const startTime = Date.now();

    if (!symbolOrAddress) {
      return {
        success: false,
        phase: 'evaluation',
        error: 'Symbol or address required'
      };
    }

    console.log(`[Scout] Evaluating ${symbolOrAddress}...`);

    try {
      // Find in screened list or fetch fresh data
      let candidate = this.state.screened.find(c =>
        c.symbol?.toLowerCase() === symbolOrAddress.toLowerCase() ||
        c.address?.toLowerCase() === symbolOrAddress.toLowerCase()
      );

      // If not in screened list, try to find in candidates
      if (!candidate) {
        candidate = this.state.candidates.find(c =>
          c.symbol?.toLowerCase() === symbolOrAddress.toLowerCase() ||
          c.address?.toLowerCase() === symbolOrAddress.toLowerCase()
        );
      }

      // If still not found, fetch fresh data
      if (!candidate) {
        candidate = await this.discoveryService.fetchTokenData(symbolOrAddress);
        if (!candidate) {
          return {
            success: false,
            phase: 'evaluation',
            error: `Token not found: ${symbolOrAddress}`
          };
        }
      }

      // Run evaluation
      const evaluation = await this.evaluationService.evaluate(candidate, this.config);

      // Store result
      this.state.evaluated.set(symbolOrAddress.toLowerCase(), {
        candidate,
        evaluation,
        evaluatedAt: new Date()
      });

      this.stats.totalEvaluated++;

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      return {
        success: true,
        phase: 'evaluation',
        symbol: candidate.symbol,
        name: candidate.name,
        evaluation,
        totalScore: evaluation.totalScore,
        maxScore: 50,
        percentage: `${((evaluation.totalScore / 50) * 100).toFixed(0)}%`,
        recommendation: evaluation.recommendation,
        confidence: evaluation.confidence,
        duration: `${duration}s`
      };

    } catch (error) {
      console.error('[Scout] Evaluation error:', error);
      return {
        success: false,
        phase: 'evaluation',
        error: error.message
      };
    }
  }

  // ==================== PHASE 4: DUE DILIGENCE ====================

  /**
   * Run comprehensive DD checklist
   */
  async runDD(symbolOrAddress) {
    const startTime = Date.now();

    if (!symbolOrAddress) {
      return {
        success: false,
        phase: 'dd',
        error: 'Symbol or address required'
      };
    }

    console.log(`[Scout] Running DD on ${symbolOrAddress}...`);

    try {
      // Get evaluation data if available
      const evalData = this.state.evaluated.get(symbolOrAddress.toLowerCase());

      let candidate = evalData?.candidate;
      let evaluation = evalData?.evaluation;

      // If no evaluation, run it first
      if (!evaluation) {
        const evalResult = await this.evaluate(symbolOrAddress);
        if (!evalResult.success) {
          return evalResult;
        }
        const storedEval = this.state.evaluated.get(symbolOrAddress.toLowerCase());
        candidate = storedEval.candidate;
        evaluation = storedEval.evaluation;
      }

      // Run DD checklist
      const ddResult = await this.ddService.runChecklist(candidate, evaluation, this.config);

      // Store result
      this.state.ddReports.set(symbolOrAddress.toLowerCase(), {
        candidate,
        evaluation,
        dd: ddResult,
        completedAt: new Date()
      });

      if (ddResult.passRate >= this.config.ddThreshold) {
        this.stats.totalDDPassed++;
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      return {
        success: true,
        phase: 'dd',
        symbol: candidate.symbol,
        name: candidate.name,
        checklist: ddResult.checklist,
        passRate: ddResult.passRate,
        passRatePercent: `${(ddResult.passRate * 100).toFixed(0)}%`,
        passed: ddResult.passRate >= this.config.ddThreshold,
        threshold: `${(this.config.ddThreshold * 100).toFixed(0)}%`,
        recommendation: ddResult.recommendation,
        action: ddResult.action,
        allocation: ddResult.allocation,
        confidence: ddResult.confidence,
        duration: `${duration}s`
      };

    } catch (error) {
      console.error('[Scout] DD error:', error);
      return {
        success: false,
        phase: 'dd',
        error: error.message
      };
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get ranked list of evaluated tokens
   */
  getRankings(limit = 10) {
    const evaluated = Array.from(this.state.evaluated.values());

    // Sort by evaluation score
    evaluated.sort((a, b) => b.evaluation.totalScore - a.evaluation.totalScore);

    return evaluated.slice(0, limit).map((item, index) => ({
      rank: index + 1,
      symbol: item.candidate.symbol,
      name: item.candidate.name,
      score: item.evaluation.totalScore,
      maxScore: 50,
      percentage: `${((item.evaluation.totalScore / 50) * 100).toFixed(0)}%`,
      recommendation: item.evaluation.recommendation,
      ddPassed: this.state.ddReports.has(item.candidate.symbol?.toLowerCase()) ?
        this.state.ddReports.get(item.candidate.symbol.toLowerCase()).dd.passRate >= this.config.ddThreshold :
        null
    }));
  }

  /**
   * Get watchlist
   */
  getWatchlist() {
    return this.state.watchlist;
  }

  /**
   * Add to watchlist
   */
  addToWatchlist(symbolOrAddress, notes = '') {
    const key = symbolOrAddress.toLowerCase();

    // Check if already in watchlist
    if (this.state.watchlist.some(w => w.key === key)) {
      return { success: false, message: 'Already in watchlist' };
    }

    // Get data if available
    const evalData = this.state.evaluated.get(key);
    const ddData = this.state.ddReports.get(key);

    this.state.watchlist.push({
      key,
      symbol: evalData?.candidate?.symbol || symbolOrAddress,
      name: evalData?.candidate?.name || symbolOrAddress,
      addedAt: new Date(),
      notes,
      score: evalData?.evaluation?.totalScore || null,
      ddPassed: ddData ? ddData.dd.passRate >= this.config.ddThreshold : null
    });

    return { success: true, message: `Added ${symbolOrAddress} to watchlist` };
  }

  /**
   * Remove from watchlist
   */
  removeFromWatchlist(symbolOrAddress) {
    const key = symbolOrAddress.toLowerCase();
    const index = this.state.watchlist.findIndex(w => w.key === key);

    if (index === -1) {
      return { success: false, message: 'Not in watchlist' };
    }

    this.state.watchlist.splice(index, 1);
    return { success: true, message: `Removed ${symbolOrAddress} from watchlist` };
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(updates) {
    const validKeys = Object.keys(this.config);
    const applied = {};

    for (const [key, value] of Object.entries(updates)) {
      if (validKeys.includes(key)) {
        this.config[key] = value;
        applied[key] = value;
      }
    }

    return { success: true, applied, config: this.config };
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      candidatesInMemory: this.state.candidates.length,
      screenedInMemory: this.state.screened.length,
      evaluatedCount: this.state.evaluated.size,
      ddReportsCount: this.state.ddReports.size,
      watchlistCount: this.state.watchlist.length,
      lastDiscovery: this.state.lastDiscovery,
      lastScreening: this.state.lastScreening
    };
  }

  /**
   * Export all data as JSON
   */
  exportData() {
    return {
      exportedAt: new Date().toISOString(),
      config: this.config,
      stats: this.getStats(),
      candidates: this.state.candidates,
      screened: this.state.screened,
      evaluated: Array.from(this.state.evaluated.entries()).map(([k, v]) => ({
        key: k,
        ...v,
        evaluatedAt: v.evaluatedAt?.toISOString()
      })),
      ddReports: Array.from(this.state.ddReports.entries()).map(([k, v]) => ({
        key: k,
        ...v,
        completedAt: v.completedAt?.toISOString()
      })),
      watchlist: this.state.watchlist.map(w => ({
        ...w,
        addedAt: w.addedAt?.toISOString()
      }))
    };
  }

  /**
   * Reset all state
   */
  reset() {
    this.state = {
      candidates: [],
      screened: [],
      evaluated: new Map(),
      ddReports: new Map(),
      watchlist: [],
      lastDiscovery: null,
      lastScreening: null
    };

    return { success: true, message: 'Scout state reset' };
  }

  // ==================== INTEGRATION METHODS ====================

  /**
   * Process a token alert from Telegram Scanner
   */
  async processTelegramAlert(alert) {
    if (!alert?.token?.address) {
      return { success: false, error: 'Invalid alert format' };
    }

    console.log(`[Scout] Processing Telegram alert: ${alert.token.address}`);

    // Create candidate from alert
    const candidate = {
      address: alert.token.address,
      chain: alert.token.chain,
      symbol: alert.token.symbol || 'UNKNOWN',
      name: alert.token.name || alert.token.address.substring(0, 8),
      source: 'telegram',
      chatName: alert.token.chat_name,
      detectedAt: alert.timestamp,
      metrics: alert.metrics,
      aiDecision: alert.ai_decision
    };

    // Add to candidates
    this.state.candidates.push(candidate);

    // If auto-scout is enabled, run screening
    if (this.config.autoScoutTelegramAlerts) {
      const screenResult = await this.screeningService.screenCandidate(candidate, this.config);

      if (screenResult.score >= this.config.screeningThreshold) {
        // Run evaluation
        const evalResult = await this.evaluate(candidate.address);

        return {
          success: true,
          candidate,
          screening: screenResult,
          evaluation: evalResult,
          recommendation: evalResult.success ? evalResult.recommendation : 'MANUAL_REVIEW'
        };
      }

      return {
        success: true,
        candidate,
        screening: screenResult,
        passed: false,
        reason: `Score ${screenResult.score}/10 below threshold ${this.config.screeningThreshold}`
      };
    }

    return {
      success: true,
      candidate,
      message: 'Added to candidates. Run "scout screen" to analyze.'
    };
  }

  /**
   * Get tokens ready for LiveTradingEngine
   */
  getTradeReady() {
    const tradeReady = [];

    for (const [key, data] of this.state.ddReports) {
      if (data.dd.passRate >= this.config.ddThreshold) {
        tradeReady.push({
          address: data.candidate.address,
          symbol: data.candidate.symbol,
          chain: data.candidate.chain,
          score: data.evaluation.totalScore,
          ddPassRate: data.dd.passRate,
          recommendation: data.dd.recommendation,
          suggestedAllocation: data.dd.allocation
        });
      }
    }

    return tradeReady;
  }
}

// Export singleton instance
const scoutEngine = new ScoutEngine();
export default scoutEngine;
