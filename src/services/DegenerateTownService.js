/**
 * Degenerate Town Service
 *
 * Manages Norse god AI agents in a simulated trading environment.
 * Each agent learns via Q-Learning and makes autonomous trading decisions.
 */

import {
  NORSE_AGENTS,
  NORSE_RUNES,
  REALM_TYPES,
  MARKET_EVENTS,
  DEGENERATE_TOWN_CONFIG
} from '../config/degenerateTown.js';
import BrowserEventEmitter from '../utils/BrowserEventEmitter.js';

class DegenerateTownService extends BrowserEventEmitter {
  constructor() {
    super();

    // State
    this.isRunning = false;
    this.agents = new Map();
    this.trades = [];
    this.marketEvents = [];
    this.leaderboard = [];

    // Q-Learning state for each agent
    this.qTables = new Map();

    // Simulation state
    this.simulationSpeed = 1000; // ms between ticks
    this.currentTick = 0;
    this.marketCondition = 'neutral'; // bullish, bearish, neutral, volatile

    // Statistics
    this.stats = {
      totalTrades: 0,
      totalVolume: 0,
      startTime: null,
      marketEvents: 0,
    };

    // Initialize agents
    this.initializeAgents();
  }

  /**
   * Initialize all Norse god agents
   */
  initializeAgents() {
    NORSE_AGENTS.forEach(agentConfig => {
      const agent = {
        ...agentConfig,
        balance: 10.0, // Starting SOL
        positions: [],
        totalPnL: 0,
        trades: 0,
        wins: 0,
        losses: 0,
        currentAction: 'idle',
        lastDecision: null,
        mood: 'neutral',
        // Q-Learning state
        qTable: this.initializeQTable(),
        explorationRate: DEGENERATE_TOWN_CONFIG.qlearning.explorationRate,
      };

      this.agents.set(agentConfig.id, agent);
      this.qTables.set(agentConfig.id, agent.qTable);
    });

    console.log(`[DegenerateTown] Initialized ${this.agents.size} Norse god agents`);
  }

  /**
   * Initialize Q-Table for an agent
   */
  initializeQTable() {
    const states = ['bullish', 'bearish', 'neutral', 'volatile', 'pump', 'dump'];
    const actions = ['buy', 'sell', 'hold', 'scalp', 'short'];

    const qTable = {};
    states.forEach(state => {
      qTable[state] = {};
      actions.forEach(action => {
        qTable[state][action] = 0;
      });
    });

    return qTable;
  }

  /**
   * Start the Degenerate Town simulation
   */
  async start() {
    if (this.isRunning) {
      return { success: false, message: 'Already running' };
    }

    console.log('[DegenerateTown] Starting simulation...');
    this.isRunning = true;
    this.stats.startTime = Date.now();

    // Start simulation loop
    this.simulationLoop();

    this.emit('started', {
      agents: Array.from(this.agents.values()).map(a => ({
        id: a.id,
        name: a.name,
        avatar: a.avatar,
        realm: a.realm,
      })),
    });

    return { success: true, message: 'Degenerate Town simulation started' };
  }

  /**
   * Stop the simulation
   */
  async stop() {
    if (!this.isRunning) {
      return { success: false, message: 'Not running' };
    }

    console.log('[DegenerateTown] Stopping simulation...');
    this.isRunning = false;

    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }

    this.emit('stopped', this.getStats());

    return { success: true, message: 'Degenerate Town simulation stopped' };
  }

  /**
   * Main simulation loop
   */
  simulationLoop() {
    this.simulationInterval = setInterval(() => {
      if (!this.isRunning) return;

      this.currentTick++;

      // Update market condition periodically
      if (this.currentTick % 10 === 0) {
        this.updateMarketCondition();
      }

      // Generate random market events
      if (Math.random() < 0.15) {
        this.generateMarketEvent();
      }

      // Each agent makes a decision
      this.agents.forEach((agent, agentId) => {
        this.agentDecision(agentId);
      });

      // Update leaderboard
      this.updateLeaderboard();

      // Emit tick event
      this.emit('tick', {
        tick: this.currentTick,
        marketCondition: this.marketCondition,
        agents: this.getAgentStates(),
        leaderboard: this.leaderboard.slice(0, 5),
      });

    }, this.simulationSpeed);
  }

  /**
   * Update market condition based on random factors
   */
  updateMarketCondition() {
    const conditions = ['bullish', 'bearish', 'neutral', 'volatile'];
    const weights = [0.3, 0.25, 0.3, 0.15];

    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < conditions.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        if (this.marketCondition !== conditions[i]) {
          this.marketCondition = conditions[i];
          this.emit('marketChange', {
            condition: this.marketCondition,
            tick: this.currentTick,
          });
        }
        break;
      }
    }
  }

  /**
   * Generate a random market event
   */
  generateMarketEvent() {
    const eventTypes = Object.keys(MARKET_EVENTS);
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const eventConfig = MARKET_EVENTS[eventType];

    const event = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type: eventType,
      ...eventConfig,
      tick: this.currentTick,
      timestamp: new Date().toISOString(),
      magnitude: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
    };

    this.marketEvents.push(event);
    this.stats.marketEvents++;

    // Keep only last 50 events
    if (this.marketEvents.length > 50) {
      this.marketEvents.shift();
    }

    this.emit('marketEvent', event);

    // Market events affect condition
    if (eventType === 'PUMP') {
      this.marketCondition = 'bullish';
    } else if (eventType === 'DUMP' || eventType === 'RUGPULL') {
      this.marketCondition = 'bearish';
    }

    return event;
  }

  /**
   * Agent makes a trading decision using Q-Learning
   */
  agentDecision(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    const state = this.getMarketState();
    const action = this.selectAction(agent, state);

    // Execute the action
    const result = this.executeAction(agent, action);

    // Calculate reward
    const reward = this.calculateReward(result, agent);

    // Update Q-Table
    this.updateQTable(agent, state, action, reward);

    // Update agent state
    agent.currentAction = action;
    agent.lastDecision = {
      action,
      state,
      reward,
      tick: this.currentTick,
      quote: this.getAgentQuote(agent, action),
    };

    // Decay exploration rate
    agent.explorationRate = Math.max(
      DEGENERATE_TOWN_CONFIG.qlearning.minExploration,
      agent.explorationRate * DEGENERATE_TOWN_CONFIG.qlearning.explorationDecay
    );

    // Update mood based on recent performance
    this.updateAgentMood(agent);

    return agent.lastDecision;
  }

  /**
   * Get current market state for Q-Learning
   */
  getMarketState() {
    // Check for recent events that override condition
    const recentEvent = this.marketEvents[this.marketEvents.length - 1];
    if (recentEvent && this.currentTick - recentEvent.tick < 5) {
      if (recentEvent.type === 'PUMP') return 'pump';
      if (recentEvent.type === 'DUMP' || recentEvent.type === 'RUGPULL') return 'dump';
    }

    return this.marketCondition;
  }

  /**
   * Select action using epsilon-greedy strategy
   */
  selectAction(agent, state) {
    const actions = ['buy', 'sell', 'hold', 'scalp', 'short'];

    // Exploration: random action
    if (Math.random() < agent.explorationRate) {
      // Weight actions based on agent personality
      const weights = this.getActionWeights(agent, actions);
      return this.weightedRandomSelect(actions, weights);
    }

    // Exploitation: best action from Q-table
    const qValues = agent.qTable[state] || {};
    let bestAction = 'hold';
    let bestValue = -Infinity;

    actions.forEach(action => {
      const value = (qValues[action] || 0) + this.getPersonalityBonus(agent, action);
      if (value > bestValue) {
        bestValue = value;
        bestAction = action;
      }
    });

    return bestAction;
  }

  /**
   * Get action weights based on agent personality
   */
  getActionWeights(agent, actions) {
    const { personality, strategy } = agent;
    const weights = {};

    actions.forEach(action => {
      let weight = 1;

      if (action === 'buy') {
        weight = personality.aggression * 1.5 + personality.greed;
      } else if (action === 'sell') {
        weight = (1 - personality.greed) * 1.5 + personality.wisdom;
      } else if (action === 'hold') {
        weight = personality.patience * 2;
      } else if (action === 'scalp') {
        weight = personality.aggression * 2 - personality.patience;
      } else if (action === 'short') {
        weight = personality.wisdom + (1 - personality.greed);
      }

      weights[action] = Math.max(0.1, weight);
    });

    return Object.values(weights);
  }

  /**
   * Get personality bonus for Q-value calculation
   */
  getPersonalityBonus(agent, action) {
    const { personality } = agent;

    switch (action) {
      case 'buy':
        return (personality.aggression - 0.5) * 0.5;
      case 'sell':
        return (personality.wisdom - 0.5) * 0.5;
      case 'hold':
        return (personality.patience - 0.5) * 0.5;
      case 'scalp':
        return (personality.aggression - personality.patience) * 0.3;
      case 'short':
        return ((1 - personality.greed) - 0.5) * 0.3;
      default:
        return 0;
    }
  }

  /**
   * Weighted random selection
   */
  weightedRandomSelect(items, weights) {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }

    return items[items.length - 1];
  }

  /**
   * Execute trading action
   */
  executeAction(agent, action) {
    const result = {
      action,
      success: true,
      pnl: 0,
      message: '',
    };

    // Simulate trade outcome based on market condition and action
    const marketFactor = this.getMarketFactor();
    const personalityFactor = this.getPersonalityFactor(agent, action);
    const randomFactor = (Math.random() - 0.5) * 0.4;

    const outcome = marketFactor * personalityFactor + randomFactor;

    switch (action) {
      case 'buy':
        if (this.marketCondition === 'bullish' || this.marketCondition === 'pump') {
          result.pnl = agent.strategy.positionSize * (0.1 + outcome * 0.3);
        } else {
          result.pnl = agent.strategy.positionSize * (-0.05 + outcome * 0.2);
        }
        break;

      case 'sell':
        if (agent.positions.length > 0 || this.marketCondition === 'bearish') {
          result.pnl = agent.strategy.positionSize * (0.05 + outcome * 0.2);
        } else {
          result.pnl = 0;
        }
        break;

      case 'hold':
        result.pnl = agent.strategy.positionSize * outcome * 0.05;
        break;

      case 'scalp':
        result.pnl = agent.strategy.positionSize * outcome * 0.15;
        break;

      case 'short':
        if (this.marketCondition === 'bearish' || this.marketCondition === 'dump') {
          result.pnl = agent.strategy.positionSize * (0.15 + outcome * 0.3);
        } else {
          result.pnl = agent.strategy.positionSize * (-0.1 + outcome * 0.1);
        }
        break;
    }

    // Apply result
    agent.balance += result.pnl;
    agent.totalPnL += result.pnl;
    agent.trades++;

    if (result.pnl > 0) {
      agent.wins++;
    } else if (result.pnl < 0) {
      agent.losses++;
    }

    // Record trade
    const trade = {
      agentId: agent.id,
      agentName: agent.name,
      action,
      pnl: result.pnl,
      tick: this.currentTick,
      timestamp: new Date().toISOString(),
      marketCondition: this.marketCondition,
    };

    this.trades.push(trade);
    this.stats.totalTrades++;
    this.stats.totalVolume += Math.abs(result.pnl);

    // Keep only last 100 trades
    if (this.trades.length > 100) {
      this.trades.shift();
    }

    this.emit('trade', trade);

    return result;
  }

  /**
   * Get market factor for outcome calculation
   */
  getMarketFactor() {
    switch (this.marketCondition) {
      case 'bullish': return 0.3;
      case 'bearish': return -0.2;
      case 'volatile': return 0;
      case 'pump': return 0.5;
      case 'dump': return -0.4;
      default: return 0;
    }
  }

  /**
   * Get personality factor for outcome calculation
   */
  getPersonalityFactor(agent, action) {
    const { personality } = agent;

    // Better wisdom = better decisions
    // Higher aggression = more variance
    const skillFactor = personality.wisdom * 0.3;
    const varianceFactor = personality.aggression * 0.2;

    return skillFactor + (Math.random() - 0.5) * varianceFactor;
  }

  /**
   * Calculate reward for Q-Learning update
   */
  calculateReward(result, agent) {
    let reward = result.pnl * 10; // Scale PnL to reward

    // Bonus for good risk management
    if (result.pnl > 0 && agent.strategy.riskTolerance < 0.5) {
      reward *= 1.2;
    }

    // Penalty for risky losses
    if (result.pnl < 0 && agent.strategy.riskTolerance > 0.7) {
      reward *= 1.5;
    }

    return reward;
  }

  /**
   * Update Q-Table using Q-Learning algorithm
   */
  updateQTable(agent, state, action, reward) {
    const { learningRate, discountFactor } = DEGENERATE_TOWN_CONFIG.qlearning;

    const currentQ = agent.qTable[state]?.[action] || 0;
    const nextState = this.getMarketState();
    const maxNextQ = Math.max(...Object.values(agent.qTable[nextState] || { hold: 0 }));

    // Q-Learning update formula
    const newQ = currentQ + learningRate * (reward + discountFactor * maxNextQ - currentQ);

    if (!agent.qTable[state]) {
      agent.qTable[state] = {};
    }
    agent.qTable[state][action] = newQ;
  }

  /**
   * Update agent mood based on recent performance
   */
  updateAgentMood(agent) {
    const recentTrades = this.trades
      .filter(t => t.agentId === agent.id)
      .slice(-5);

    if (recentTrades.length === 0) {
      agent.mood = 'neutral';
      return;
    }

    const recentPnL = recentTrades.reduce((sum, t) => sum + t.pnl, 0);

    if (recentPnL > 0.5) {
      agent.mood = 'triumphant';
    } else if (recentPnL > 0.1) {
      agent.mood = 'pleased';
    } else if (recentPnL < -0.5) {
      agent.mood = 'enraged';
    } else if (recentPnL < -0.1) {
      agent.mood = 'frustrated';
    } else {
      agent.mood = 'neutral';
    }
  }

  /**
   * Get a random quote from agent based on action
   */
  getAgentQuote(agent, action) {
    const quotes = agent.quotes;
    if (!quotes || quotes.length === 0) return '';

    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  /**
   * Update leaderboard
   */
  updateLeaderboard() {
    this.leaderboard = Array.from(this.agents.values())
      .map(agent => ({
        id: agent.id,
        name: agent.name,
        avatar: agent.avatar,
        totalPnL: agent.totalPnL,
        balance: agent.balance,
        winRate: agent.trades > 0 ? (agent.wins / agent.trades * 100).toFixed(1) : 0,
        trades: agent.trades,
        realm: agent.realm,
      }))
      .sort((a, b) => b.totalPnL - a.totalPnL);
  }

  /**
   * Get all agent states
   */
  getAgentStates() {
    return Array.from(this.agents.values()).map(agent => ({
      id: agent.id,
      name: agent.name,
      avatar: agent.avatar,
      balance: agent.balance.toFixed(4),
      totalPnL: agent.totalPnL.toFixed(4),
      currentAction: agent.currentAction,
      mood: agent.mood,
      winRate: agent.trades > 0 ? (agent.wins / agent.trades * 100).toFixed(1) : 0,
      lastQuote: agent.lastDecision?.quote || '',
      realm: agent.realm,
      explorationRate: (agent.explorationRate * 100).toFixed(1),
    }));
  }

  /**
   * Get simulation statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      currentTick: this.currentTick,
      marketCondition: this.marketCondition,
      totalTrades: this.stats.totalTrades,
      totalVolume: this.stats.totalVolume.toFixed(4),
      marketEvents: this.stats.marketEvents,
      uptime: this.stats.startTime ? Date.now() - this.stats.startTime : 0,
      agentCount: this.agents.size,
      leaderboard: this.leaderboard.slice(0, 5),
    };
  }

  /**
   * Get specific agent info
   */
  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  /**
   * Get recent trades
   */
  getRecentTrades(limit = 20) {
    return this.trades.slice(-limit).reverse();
  }

  /**
   * Get recent market events
   */
  getRecentEvents(limit = 10) {
    return this.marketEvents.slice(-limit).reverse();
  }

  /**
   * Reset all agent learning
   */
  resetLearning() {
    this.agents.forEach((agent, agentId) => {
      agent.qTable = this.initializeQTable();
      agent.explorationRate = DEGENERATE_TOWN_CONFIG.qlearning.explorationRate;
      agent.balance = 10.0;
      agent.totalPnL = 0;
      agent.trades = 0;
      agent.wins = 0;
      agent.losses = 0;
    });

    this.trades = [];
    this.marketEvents = [];
    this.currentTick = 0;
    this.stats = {
      totalTrades: 0,
      totalVolume: 0,
      startTime: null,
      marketEvents: 0,
    };

    console.log('[DegenerateTown] All agent learning reset');
    return { success: true, message: 'All agent learning reset' };
  }

  /**
   * Set simulation speed
   */
  setSpeed(speedMs) {
    this.simulationSpeed = Math.max(100, Math.min(5000, speedMs));

    if (this.isRunning) {
      clearInterval(this.simulationInterval);
      this.simulationLoop();
    }

    return { success: true, speed: this.simulationSpeed };
  }
}

// Export singleton instance
const degenerateTownService = new DegenerateTownService();
export default degenerateTownService;
export { DegenerateTownService };
