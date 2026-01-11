/**
 * Autonomous AI Trading Agent
 *
 * Self-improving memecoin trading AI using:
 * - Reinforcement Learning (Q-Learning)
 * - Performance tracking and analytics
 * - Strategy optimization
 * - Pattern recognition
 * - Risk-adjusted decision making
 */

import { FenrirTradingAPI } from '../api/FenrirTradingAPI.js';

export class AutonomousTrader {
  constructor(config = {}) {
    this.tradingAPI = new FenrirTradingAPI(config.apiUrl);

    // AI Configuration
    this.learningRate = config.learningRate || 0.1;
    this.discountFactor = config.discountFactor || 0.95;
    this.explorationRate = config.explorationRate || 0.2; // Epsilon-greedy
    this.minExplorationRate = config.minExplorationRate || 0.05;
    this.explorationDecay = config.explorationDecay || 0.995;

    // Q-Learning table: state -> action -> Q-value
    this.qTable = new Map();

    // Performance tracking
    this.tradeHistory = [];
    this.performanceMetrics = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalProfit: 0,
      totalLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      averageHoldTime: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0
    };

    // Strategy parameters (learned over time)
    this.strategy = {
      entryThresholds: {
        minLiquidity: 5.0,
        maxMarketCap: 100.0,
        minVolume24h: 1.0,
        maxAge: 300 // seconds
      },
      exitConditions: {
        stopLoss: 0.25,
        takeProfit: 1.0,
        trailingStop: 0.15,
        maxHoldTime: 60 // minutes
      },
      positionSizing: {
        baseAmount: 0.1,
        maxPositions: 3,
        riskPerTrade: 0.02 // 2% of portfolio
      }
    };

    // Pattern recognition
    this.patterns = {
      rugPullIndicators: [],
      moonShotIndicators: [],
      consolidationPatterns: []
    };

    // Decision log for explainability
    this.decisionLog = [];

    // State
    this.isRunning = false;
    this.currentMode = 'simulation';
    this.portfolioValue = 0;
    this.startingCapital = 0;
  }

  /**
   * Start autonomous trading
   */
  async start(mode = 'simulation', options = {}) {
    if (this.isRunning) {
      throw new Error('Autonomous trader is already running');
    }

    this.isRunning = true;
    this.currentMode = mode;
    this.startingCapital = options.startingCapital || 1.0; // SOL
    this.portfolioValue = this.startingCapital;

    console.log(`🤖 Autonomous Trader Starting in ${mode} mode`);
    console.log(`📊 Initial Capital: ${this.startingCapital} SOL`);
    console.log(`🧠 Learning Rate: ${this.learningRate}`);
    console.log(`🎲 Exploration Rate: ${this.explorationRate}`);

    // Load saved Q-table if exists
    await this.loadLearning();

    // Start trading loop
    this.tradingLoop();

    return {
      status: 'started',
      mode: this.currentMode,
      config: this.strategy
    };
  }

  /**
   * Stop autonomous trading
   */
  async stop() {
    console.log('🛑 Stopping autonomous trader...');
    this.isRunning = false;

    // Save learning
    await this.saveLearning();

    // Close all positions
    await this.closeAllPositions();

    return {
      status: 'stopped',
      performance: this.performanceMetrics,
      finalPortfolioValue: this.portfolioValue,
      roi: ((this.portfolioValue - this.startingCapital) / this.startingCapital * 100).toFixed(2)
    };
  }

  /**
   * Main trading loop
   */
  async tradingLoop() {
    while (this.isRunning) {
      try {
        // Get market state
        const state = await this.observeMarketState();

        // Make decision using Q-learning
        const action = this.selectAction(state);

        // Execute action
        const reward = await this.executeAction(action, state);

        // Update Q-values (learn from experience)
        await this.updateQValues(state, action, reward);

        // Decay exploration rate
        this.explorationRate = Math.max(
          this.minExplorationRate,
          this.explorationRate * this.explorationDecay
        );

        // Update metrics
        await this.updatePerformanceMetrics();

        // Log decision
        this.logDecision(state, action, reward);

        // Optimize strategy periodically
        if (this.tradeHistory.length % 10 === 0) {
          await this.optimizeStrategy();
        }

        // Wait before next iteration (avoid rate limits)
        await this.sleep(5000); // 5 seconds

      } catch (error) {
        console.error('Trading loop error:', error);
        await this.sleep(10000); // Wait 10s on error
      }
    }
  }

  /**
   * Observe current market state
   */
  async observeMarketState() {
    try {
      // Get bot status and positions
      const status = await this.tradingAPI.getStatus();
      const positions = await this.tradingAPI.getPositions();

      // Calculate market features
      const state = {
        // Portfolio metrics
        openPositions: positions.positions?.length || 0,
        portfolioValue: this.portfolioValue,
        availableCapital: this.portfolioValue * (1 - this.strategy.positionSizing.riskPerTrade * positions.positions?.length || 0),

        // Risk metrics
        currentDrawdown: this.calculateDrawdown(),
        volatility: this.calculateVolatility(),

        // Performance metrics
        recentWinRate: this.getRecentWinRate(10),
        consecutiveWins: this.performanceMetrics.consecutiveWins,
        consecutiveLosses: this.performanceMetrics.consecutiveLosses,

        // Time
        hourOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),

        // Position details
        positions: positions.positions || []
      };

      return this.discretizeState(state);
    } catch (error) {
      console.error('Error observing market state:', error);
      return this.getDefaultState();
    }
  }

  /**
   * Discretize continuous state into buckets for Q-table
   */
  discretizeState(state) {
    return {
      openPositions: Math.min(state.openPositions, 5),
      capitalLevel: this.discretize(state.availableCapital / this.startingCapital, [0, 0.5, 0.8, 1.0, 1.5]),
      drawdownLevel: this.discretize(state.currentDrawdown, [0, 0.1, 0.2, 0.3]),
      winRateLevel: this.discretize(state.recentWinRate, [0, 0.3, 0.5, 0.7]),
      streakType: state.consecutiveWins >= 3 ? 'hot' : state.consecutiveLosses >= 3 ? 'cold' : 'neutral',
      timeOfDay: state.hourOfDay < 6 ? 'night' : state.hourOfDay < 12 ? 'morning' : state.hourOfDay < 18 ? 'afternoon' : 'evening'
    };
  }

  /**
   * Discretize continuous value into buckets
   */
  discretize(value, thresholds) {
    for (let i = 0; i < thresholds.length; i++) {
      if (value < thresholds[i]) return i;
    }
    return thresholds.length;
  }

  /**
   * Select action using epsilon-greedy Q-learning
   */
  selectAction(state) {
    const possibleActions = this.getPossibleActions(state);

    // Exploration: random action
    if (Math.random() < this.explorationRate) {
      return possibleActions[Math.floor(Math.random() * possibleActions.length)];
    }

    // Exploitation: best known action
    const stateKey = JSON.stringify(state);
    const qValues = this.qTable.get(stateKey) || {};

    let bestAction = possibleActions[0];
    let bestValue = qValues[bestAction] || 0;

    for (const action of possibleActions) {
      const value = qValues[action] || 0;
      if (value > bestValue) {
        bestValue = value;
        bestAction = action;
      }
    }

    return bestAction;
  }

  /**
   * Get possible actions based on current state
   */
  getPossibleActions(state) {
    const actions = ['wait']; // Always can wait

    // Can enter new position if have capital and room
    if (state.openPositions < this.strategy.positionSizing.maxPositions) {
      actions.push('enter_aggressive');
      actions.push('enter_conservative');
    }

    // Can exit positions if have any
    if (state.openPositions > 0) {
      actions.push('exit_all');
      actions.push('exit_losers');
      actions.push('exit_winners');
    }

    // Can adjust strategy
    actions.push('tighten_stops');
    actions.push('loosen_stops');
    actions.push('increase_size');
    actions.push('decrease_size');

    return actions;
  }

  /**
   * Execute selected action
   */
  async executeAction(action, state) {
    console.log(`🎯 Action: ${action}`);

    let reward = 0;

    try {
      switch (action) {
        case 'wait':
          // Do nothing, small negative reward to encourage action
          reward = -0.01;
          break;

        case 'enter_aggressive':
          reward = await this.enterPosition('aggressive');
          break;

        case 'enter_conservative':
          reward = await this.enterPosition('conservative');
          break;

        case 'exit_all':
          reward = await this.exitAllPositions();
          break;

        case 'exit_losers':
          reward = await this.exitLosingPositions();
          break;

        case 'exit_winners':
          reward = await this.exitWinningPositions();
          break;

        case 'tighten_stops':
          this.strategy.exitConditions.stopLoss *= 0.9;
          reward = 0.01; // Small reward for risk management
          break;

        case 'loosen_stops':
          this.strategy.exitConditions.stopLoss *= 1.1;
          reward = -0.01; // Small penalty for increasing risk
          break;

        case 'increase_size':
          this.strategy.positionSizing.baseAmount *= 1.1;
          reward = 0;
          break;

        case 'decrease_size':
          this.strategy.positionSizing.baseAmount *= 0.9;
          reward = 0.01;
          break;

        default:
          reward = 0;
      }
    } catch (error) {
      console.error(`Action execution error: ${error.message}`);
      reward = -1.0; // Large penalty for errors
    }

    return reward;
  }

  /**
   * Enter new trading position
   */
  async enterPosition(style) {
    // This would integrate with Fenrir bot to enter a position
    // For now, simulate based on historical win rate

    const amount = this.strategy.positionSizing.baseAmount;
    const stopLoss = style === 'aggressive' ? 0.3 : 0.2;
    const takeProfit = style === 'aggressive' ? 2.0 : 1.0;

    // Simulate trade outcome (in reality, would wait for actual result)
    const winProbability = style === 'aggressive' ? 0.4 : 0.6;
    const isWin = Math.random() < winProbability;

    const pnl = isWin
      ? amount * (takeProfit - 1)
      : -amount * stopLoss;

    // Record trade
    this.recordTrade({
      action: 'enter',
      style,
      amount,
      pnl,
      outcome: isWin ? 'win' : 'loss'
    });

    // Reward is the PNL normalized by position size
    return pnl / amount;
  }

  /**
   * Exit all positions
   */
  async exitAllPositions() {
    try {
      const positions = await this.tradingAPI.getPositions();
      let totalPnl = 0;

      for (const pos of positions.positions || []) {
        totalPnl += pos.unrealized_pnl_sol || 0;
      }

      // In reality, would close all positions via API
      console.log(`💰 Exited all positions: ${totalPnl.toFixed(4)} SOL`);

      return totalPnl / this.strategy.positionSizing.baseAmount;
    } catch (error) {
      return -0.1;
    }
  }

  /**
   * Exit only losing positions
   */
  async exitLosingPositions() {
    const positions = await this.tradingAPI.getPositions();
    const losingPositions = (positions.positions || []).filter(p => (p.unrealized_pnl_pct || 0) < 0);

    let totalPnl = 0;
    for (const pos of losingPositions) {
      totalPnl += pos.unrealized_pnl_sol || 0;
    }

    console.log(`❌ Cut ${losingPositions.length} losers: ${totalPnl.toFixed(4)} SOL`);
    return Math.abs(totalPnl) / this.strategy.positionSizing.baseAmount * 0.5; // Reward for cutting losses
  }

  /**
   * Exit only winning positions
   */
  async exitWinningPositions() {
    const positions = await this.tradingAPI.getPositions();
    const winningPositions = (positions.positions || []).filter(p => (p.unrealized_pnl_pct || 0) > 0);

    let totalPnl = 0;
    for (const pos of winningPositions) {
      totalPnl += pos.unrealized_pnl_sol || 0;
    }

    console.log(`✅ Took profits on ${winningPositions.length} winners: ${totalPnl.toFixed(4)} SOL`);
    return totalPnl / this.strategy.positionSizing.baseAmount;
  }

  /**
   * Update Q-values using Q-learning algorithm
   */
  async updateQValues(state, action, reward) {
    const stateKey = JSON.stringify(state);
    const nextState = await this.observeMarketState();
    const nextStateKey = JSON.stringify(nextState);

    // Initialize Q-values if needed
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, {});
    }
    if (!this.qTable.has(nextStateKey)) {
      this.qTable.set(nextStateKey, {});
    }

    const qValues = this.qTable.get(stateKey);
    const nextQValues = this.qTable.get(nextStateKey);

    // Current Q-value
    const currentQ = qValues[action] || 0;

    // Max Q-value for next state
    const maxNextQ = Math.max(...Object.values(nextQValues), 0);

    // Q-learning update formula
    // Q(s,a) = Q(s,a) + α * [reward + γ * max(Q(s',a')) - Q(s,a)]
    const newQ = currentQ + this.learningRate * (
      reward + this.discountFactor * maxNextQ - currentQ
    );

    qValues[action] = newQ;

    console.log(`🧠 Q-Learning: Q(${action}) = ${newQ.toFixed(4)} (reward: ${reward.toFixed(4)})`);
  }

  /**
   * Record trade for history and analytics
   */
  recordTrade(trade) {
    trade.timestamp = Date.now();
    this.tradeHistory.push(trade);

    // Update portfolio value
    this.portfolioValue += trade.pnl;

    // Update metrics
    if (trade.outcome === 'win') {
      this.performanceMetrics.winningTrades++;
      this.performanceMetrics.totalProfit += trade.pnl;
      this.performanceMetrics.consecutiveWins++;
      this.performanceMetrics.consecutiveLosses = 0;
      if (trade.pnl > this.performanceMetrics.largestWin) {
        this.performanceMetrics.largestWin = trade.pnl;
      }
    } else {
      this.performanceMetrics.losingTrades++;
      this.performanceMetrics.totalLoss += Math.abs(trade.pnl);
      this.performanceMetrics.consecutiveLosses++;
      this.performanceMetrics.consecutiveWins = 0;
      if (trade.pnl < this.performanceMetrics.largestLoss) {
        this.performanceMetrics.largestLoss = trade.pnl;
      }
    }

    this.performanceMetrics.totalTrades++;
  }

  /**
   * Update performance metrics
   */
  async updatePerformanceMetrics() {
    if (this.tradeHistory.length === 0) return;

    const winRate = this.performanceMetrics.winningTrades / this.performanceMetrics.totalTrades;
    const avgWin = this.performanceMetrics.totalProfit / Math.max(this.performanceMetrics.winningTrades, 1);
    const avgLoss = this.performanceMetrics.totalLoss / Math.max(this.performanceMetrics.losingTrades, 1);

    // Calculate Sharpe Ratio
    const returns = this.tradeHistory.map(t => t.pnl / this.strategy.positionSizing.baseAmount);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    this.performanceMetrics.sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    // Calculate Max Drawdown
    this.performanceMetrics.maxDrawdown = this.calculateMaxDrawdown();

    console.log(`📊 Performance: Win Rate ${(winRate * 100).toFixed(1)}%, Sharpe ${this.performanceMetrics.sharpeRatio.toFixed(2)}, Max DD ${(this.performanceMetrics.maxDrawdown * 100).toFixed(1)}%`);
  }

  /**
   * Optimize strategy based on performance
   */
  async optimizeStrategy() {
    console.log('🔧 Optimizing strategy...');

    const winRate = this.performanceMetrics.winningTrades / Math.max(this.performanceMetrics.totalTrades, 1);

    // Adjust based on performance
    if (winRate < 0.4) {
      // Performing poorly - be more conservative
      this.strategy.exitConditions.stopLoss *= 0.95;
      this.strategy.positionSizing.baseAmount *= 0.9;
      console.log('📉 Low win rate - tightening risk controls');
    } else if (winRate > 0.6 && this.performanceMetrics.sharpeRatio > 1.5) {
      // Performing well - can be slightly more aggressive
      this.strategy.positionSizing.baseAmount *= 1.05;
      console.log('📈 High performance - increasing position size');
    }

    // Adjust entry thresholds based on recent losses
    if (this.performanceMetrics.consecutiveLosses >= 3) {
      this.strategy.entryThresholds.minLiquidity *= 1.2;
      console.log('⚠️ Consecutive losses - raising entry standards');
    }
  }

  /**
   * Log decision for explainability
   */
  logDecision(state, action, reward) {
    const log = {
      timestamp: Date.now(),
      state: state,
      action: action,
      reward: reward,
      portfolioValue: this.portfolioValue,
      explorationRate: this.explorationRate
    };

    this.decisionLog.push(log);

    // Keep only last 100 decisions
    if (this.decisionLog.length > 100) {
      this.decisionLog.shift();
    }
  }

  /**
   * Get performance summary
   */
  getPerformance() {
    const roi = ((this.portfolioValue - this.startingCapital) / this.startingCapital * 100);
    const winRate = this.performanceMetrics.winningTrades / Math.max(this.performanceMetrics.totalTrades, 1);

    return {
      ...this.performanceMetrics,
      winRate: winRate,
      roi: roi,
      portfolioValue: this.portfolioValue,
      startingCapital: this.startingCapital,
      profitLoss: this.portfolioValue - this.startingCapital,
      qTableSize: this.qTable.size,
      explorationRate: this.explorationRate,
      currentStrategy: this.strategy
    };
  }

  /**
   * Get recent decision history
   */
  getDecisionHistory(count = 10) {
    return this.decisionLog.slice(-count);
  }

  /**
   * Helper methods
   */

  calculateDrawdown() {
    let maxValue = this.startingCapital;
    let maxDrawdown = 0;

    for (const trade of this.tradeHistory) {
      const value = trade.portfolioValue || this.portfolioValue;
      if (value > maxValue) maxValue = value;
      const drawdown = (maxValue - value) / maxValue;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    return maxDrawdown;
  }

  calculateMaxDrawdown() {
    return this.calculateDrawdown();
  }

  calculateVolatility() {
    if (this.tradeHistory.length < 2) return 0;

    const returns = this.tradeHistory.map(t => t.pnl / this.strategy.positionSizing.baseAmount);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;

    return Math.sqrt(variance);
  }

  getRecentWinRate(count) {
    const recentTrades = this.tradeHistory.slice(-count);
    if (recentTrades.length === 0) return 0.5;

    const wins = recentTrades.filter(t => t.outcome === 'win').length;
    return wins / recentTrades.length;
  }

  getDefaultState() {
    return {
      openPositions: 0,
      capitalLevel: 2,
      drawdownLevel: 0,
      winRateLevel: 2,
      streakType: 'neutral',
      timeOfDay: 'afternoon'
    };
  }

  async closeAllPositions() {
    // Would actually close all positions via API
    console.log('Closing all positions...');
  }

  async saveLearning() {
    // Save Q-table to localStorage
    try {
      const data = {
        qTable: Array.from(this.qTable.entries()),
        performanceMetrics: this.performanceMetrics,
        strategy: this.strategy,
        tradeHistory: this.tradeHistory.slice(-100) // Last 100 trades
      };

      localStorage.setItem('autonomous_trader_learning', JSON.stringify(data));
      console.log('💾 Learning saved to storage');
    } catch (error) {
      console.error('Failed to save learning:', error);
    }
  }

  async loadLearning() {
    try {
      const saved = localStorage.getItem('autonomous_trader_learning');
      if (saved) {
        const data = JSON.parse(saved);
        this.qTable = new Map(data.qTable);
        this.performanceMetrics = data.performanceMetrics || this.performanceMetrics;
        this.strategy = data.strategy || this.strategy;
        this.tradeHistory = data.tradeHistory || [];

        console.log(`💾 Loaded learning: ${this.qTable.size} states, ${this.tradeHistory.length} historical trades`);
      }
    } catch (error) {
      console.error('Failed to load learning:', error);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default AutonomousTrader;
