/**
 * useDegenTownCommands - Degenerate Town simulation command handlers
 *
 * Handles commands:
 * - degen start - Start the Q-Learning simulation
 * - degen stop - Stop the simulation
 * - degen status - View realm statistics
 * - degen agents - List all Norse god agents
 * - degen agent <name> - View specific agent details
 * - degen leaderboard - Show agent rankings
 * - degen trades [limit] - View recent trades
 * - degen events [limit] - View market events
 * - degen speed <ms> - Adjust simulation speed
 * - degen reset - Reset all learning data
 * - degen open/view - Toggle visual simulation
 */

import { useCallback } from 'react';
import { handleCommandError } from '../utils/errorHandler';
import degenerateTownService from '../services/DegenerateTownService';
import { NORSE_AGENTS, NORSE_RUNES } from '../config/degenerateTown';

/**
 * Hook for Degenerate Town commands
 * @param {Object} options - Command context
 * @returns {Object} Command handlers
 */
export function useDegenTownCommands({
  addOutput,
  showToast,
  showDegenTown,
  setShowDegenTown,
}) {
  const handleStart = useCallback(async () => {
    addOutput({
      type: 'info',
      content: '⚔️ Summoning the Norse gods to the trading floor...',
    });

    const result = await degenerateTownService.start();

    if (result.success) {
      let output = `✅ DEGENERATE TOWN ACTIVATED!\n\n`;
      output += `🏛️ The gods have entered the trading floor:\n\n`;

      NORSE_AGENTS.forEach(agent => {
        output += `${agent.avatar} ${agent.name}\n`;
        output += `   ${agent.title}\n`;
        output += `   Strategy: ${agent.strategy.type}\n\n`;
      });

      output += `\n⚡ Market simulation running...\n`;
      output += `Use 'degen status' to monitor the gods' trades.`;

      addOutput({ type: 'success', content: output });
      showToast('Degenerate Town started!', 'success');

      // Set up event listeners for live updates
      degenerateTownService.on('trade', (trade) => {
        const pnlIcon = trade.pnl >= 0 ? '🟢' : '🔴';
        addOutput({
          type: trade.pnl >= 0 ? 'success' : 'warning',
          content: `${pnlIcon} [${trade.agentName}] ${trade.action.toUpperCase()} → ${trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(4)} SOL`,
        });
      });

      degenerateTownService.on('marketEvent', (event) => {
        addOutput({
          type: 'info',
          content: `${event.icon} MARKET EVENT: ${event.type} (${event.rune})`,
        });
      });
    } else {
      addOutput({ type: 'warning', content: `⚠️ ${result.message}` });
    }
  }, [addOutput, showToast]);

  const handleStop = useCallback(async () => {
    const result = await degenerateTownService.stop();

    if (result.success) {
      addOutput({
        type: 'success',
        content: `✅ Degenerate Town stopped\n\nThe Norse gods rest...\n\nFinal Stats:\n• Total Trades: ${result.totalTrades || 0}\n• Total Volume: ${result.totalVolume || '0'} SOL`,
      });
      showToast('Simulation stopped', 'success');

      // Remove event listeners
      degenerateTownService.removeAllListeners('trade');
      degenerateTownService.removeAllListeners('marketEvent');
    } else {
      addOutput({ type: 'warning', content: `⚠️ ${result.message}` });
    }
  }, [addOutput, showToast]);

  const handleStatus = useCallback(() => {
    const stats = degenerateTownService.getStats();

    let output = `⚔️ DEGENERATE TOWN STATUS\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    output += `Status: ${stats.isRunning ? '🟢 Running' : '🔴 Stopped'}\n`;
    output += `Tick: ${stats.currentTick}\n`;
    output += `Market: ${stats.marketCondition?.toUpperCase() || 'N/A'}\n`;
    output += `Uptime: ${Math.floor((stats.uptime || 0) / 1000)}s\n\n`;

    output += `📊 Statistics:\n`;
    output += `• Total Trades: ${stats.totalTrades}\n`;
    output += `• Total Volume: ${stats.totalVolume} SOL\n`;
    output += `• Market Events: ${stats.marketEvents}\n\n`;

    if (stats.leaderboard && stats.leaderboard.length > 0) {
      output += `🏆 Top Performers:\n`;
      stats.leaderboard.forEach((agent, i) => {
        const pnlIcon = parseFloat(agent.totalPnL) >= 0 ? '🟢' : '🔴';
        output += `${i + 1}. ${agent.avatar} ${agent.name}: ${pnlIcon} ${agent.totalPnL} SOL\n`;
      });
    }

    addOutput({ type: 'info', content: output });
  }, [addOutput]);

  const handleAgents = useCallback(() => {
    const agentStates = degenerateTownService.getAgentStates();

    let output = `👥 NORSE GOD AGENTS\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    agentStates.forEach(agent => {
      const pnlIcon = parseFloat(agent.totalPnL) >= 0 ? '🟢' : '🔴';
      output += `${agent.avatar} ${agent.name}\n`;
      output += `   Realm: ${agent.realm}\n`;
      output += `   Balance: ${agent.balance} SOL\n`;
      output += `   P&L: ${pnlIcon} ${agent.totalPnL} SOL\n`;
      output += `   Win Rate: ${agent.winRate}%\n`;
      output += `   Mood: ${agent.mood}\n`;
      output += `   Action: ${agent.currentAction}\n`;
      if (agent.lastQuote) {
        output += `   💬 "${agent.lastQuote}"\n`;
      }
      output += `\n`;
    });

    addOutput({ type: 'info', content: output });
  }, [addOutput]);

  const handleAgent = useCallback((args) => {
    const agentName = args.slice(1).join(' ').toLowerCase();

    if (!agentName) {
      addOutput({
        type: 'error',
        content: 'Please specify an agent name: degen agent <name>',
      });
      return;
    }

    // Find agent by name (partial match)
    const agent = NORSE_AGENTS.find(a =>
      a.name.toLowerCase().includes(agentName) ||
      a.id.toLowerCase().includes(agentName)
    );

    if (!agent) {
      addOutput({
        type: 'error',
        content: `Agent not found: ${agentName}\n\nAvailable agents:\n${NORSE_AGENTS.map(a => `• ${a.name}`).join('\n')}`,
      });
      return;
    }

    const agentState = degenerateTownService.getAgent(agent.id);

    let output = `${agent.avatar} ${agent.name}\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    output += `Title: ${agent.title}\n`;
    output += `Rune: ${agent.runeSymbol}\n`;
    output += `Realm: ${agent.realm}\n\n`;

    output += `📊 Strategy:\n`;
    output += `• Type: ${agent.strategy.type}\n`;
    output += `• Description: ${agent.strategy.description}\n`;
    output += `• Position Size: ${agent.strategy.positionSize * 100}%\n`;
    output += `• Risk Tolerance: ${(agent.strategy.riskTolerance * 100).toFixed(0)}%\n\n`;

    output += `🧠 Personality:\n`;
    output += `• Wisdom: ${(agent.personality.wisdom * 100).toFixed(0)}%\n`;
    output += `• Aggression: ${(agent.personality.aggression * 100).toFixed(0)}%\n`;
    output += `• Patience: ${(agent.personality.patience * 100).toFixed(0)}%\n`;
    output += `• Greed: ${(agent.personality.greed * 100).toFixed(0)}%\n\n`;

    if (agentState) {
      const pnlIcon = agentState.totalPnL >= 0 ? '🟢' : '🔴';
      output += `💰 Current State:\n`;
      output += `• Balance: ${agentState.balance.toFixed(4)} SOL\n`;
      output += `• Total P&L: ${pnlIcon} ${agentState.totalPnL.toFixed(4)} SOL\n`;
      output += `• Trades: ${agentState.trades}\n`;
      output += `• Win Rate: ${agentState.trades > 0 ? (agentState.wins / agentState.trades * 100).toFixed(1) : 0}%\n`;
      output += `• Exploration Rate: ${(agentState.explorationRate * 100).toFixed(1)}%\n`;
      output += `• Mood: ${agentState.mood}\n\n`;
    }

    output += `💬 Quotes:\n`;
    agent.quotes.forEach(q => output += `• "${q}"\n`);

    addOutput({ type: 'info', content: output });
  }, [addOutput]);

  const handleLeaderboard = useCallback(() => {
    const stats = degenerateTownService.getStats();

    if (!stats.leaderboard || stats.leaderboard.length === 0) {
      addOutput({
        type: 'info',
        content: "No leaderboard data yet. Start the simulation first: degen start",
      });
      return;
    }

    let output = `🏆 DEGENERATE TOWN LEADERBOARD\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    stats.leaderboard.forEach((agent, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      const pnlIcon = parseFloat(agent.totalPnL) >= 0 ? '🟢' : '🔴';

      output += `${medal} ${agent.avatar} ${agent.name}\n`;
      output += `   P&L: ${pnlIcon} ${agent.totalPnL} SOL\n`;
      output += `   Balance: ${agent.balance} SOL\n`;
      output += `   Win Rate: ${agent.winRate}% (${agent.trades} trades)\n\n`;
    });

    addOutput({ type: 'info', content: output });
  }, [addOutput]);

  const handleTrades = useCallback((args) => {
    const limit = parseInt(args[1]) || 10;
    const trades = degenerateTownService.getRecentTrades(limit);

    if (trades.length === 0) {
      addOutput({
        type: 'info',
        content: "No trades yet. Start the simulation first: degen start",
      });
      return;
    }

    let output = `📜 RECENT TRADES (Last ${trades.length})\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    trades.forEach(trade => {
      const pnlIcon = trade.pnl >= 0 ? '🟢' : '🔴';
      output += `${pnlIcon} [${trade.agentName}] ${trade.action.toUpperCase()}\n`;
      output += `   P&L: ${trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(4)} SOL\n`;
      output += `   Market: ${trade.marketCondition}\n`;
      output += `   Tick: ${trade.tick}\n\n`;
    });

    addOutput({ type: 'info', content: output });
  }, [addOutput]);

  const handleEvents = useCallback((args) => {
    const limit = parseInt(args[1]) || 10;
    const events = degenerateTownService.getRecentEvents(limit);

    if (events.length === 0) {
      addOutput({
        type: 'info',
        content: "No market events yet. Start the simulation first: degen start",
      });
      return;
    }

    let output = `📢 RECENT MARKET EVENTS (Last ${events.length})\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    events.forEach(event => {
      output += `${event.icon} ${event.type} (${event.rune})\n`;
      output += `   Impact: ${event.impact}\n`;
      output += `   Magnitude: ${(event.magnitude * 100).toFixed(0)}%\n`;
      output += `   Tick: ${event.tick}\n\n`;
    });

    addOutput({ type: 'info', content: output });
  }, [addOutput]);

  const handleSpeed = useCallback((args) => {
    const speed = parseInt(args[1]);

    if (!speed || speed < 100 || speed > 5000) {
      addOutput({
        type: 'error',
        content: 'Please specify a speed between 100-5000ms: degen speed <ms>',
      });
      return;
    }

    const result = degenerateTownService.setSpeed(speed);
    addOutput({
      type: 'success',
      content: `✅ Simulation speed set to ${result.speed}ms per tick`,
    });
  }, [addOutput]);

  const handleReset = useCallback(() => {
    degenerateTownService.resetLearning();
    addOutput({
      type: 'success',
      content: `✅ All agent learning has been reset!\n\nThe Norse gods will start learning from scratch.\nTheir Q-tables have been cleared and balances restored to 10 SOL.`,
    });
    showToast('Agent learning reset', 'success');
  }, [addOutput, showToast]);

  const handleOpenView = useCallback(async () => {
    const isOpening = !showDegenTown;
    setShowDegenTown(prev => !prev);

    // Auto-start simulation if opening and not running
    if (isOpening && !degenerateTownService.isRunning) {
      await degenerateTownService.start();
      addOutput({
        type: 'info',
        content: `🎮 Opening Degenerate Town Ultimate Visualization...

⚔️ Simulation auto-started!

FEATURES:
• Interactive town zones (Asgard, Valhalla, Market Square, Bifrost, Helheim)
• Click any Norse god to view Q-table and detailed stats
• Particle effects for trades and market events
• Ragnarok screen shake and fire effects
• Real-time leaderboard and market HUD
• Performance-based agent positioning
• Twinkling stars and floating runes
• Odin's Hall and Thor's Forge buildings

💡 Click any agent to see their strategy, PnL, and Q-table!`,
      });
    } else {
      addOutput({
        type: 'info',
        content: isOpening
          ? `🎮 Opening Degenerate Town Ultimate Visualization...

⚔️ FEATURES:
• Interactive town zones (Asgard, Valhalla, Market Square, Bifrost, Helheim)
• Click any Norse god to view Q-table and stats
• Particle effects and Ragnarok screen shake
• Real-time leaderboard and market HUD

💡 Click any agent to see their stats!`
          : '🎮 Closing Degenerate Town...',
      });
    }
    showToast(isOpening ? 'Degenerate Town opened' : 'Degenerate Town closed', 'success');
  }, [addOutput, showToast, showDegenTown, setShowDegenTown]);

  const showDefaultInfo = useCallback(() => {
    const stats = degenerateTownService.getStats();
    addOutput({
      type: 'info',
      content: `⚔️ DEGENERATE TOWN ⚔️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Norse Gods Meet Solana DeFi
AI agents compete in a trading simulation using Q-Learning

Status: ${stats.isRunning ? '🟢 Running' : '🔴 Stopped'}
Agents: ${stats.agentCount} Norse Gods
Tick: ${stats.currentTick}
Market: ${stats.marketCondition?.toUpperCase() || 'N/A'}

Commands:
• degen start - Start the simulation
• degen stop - Stop the simulation
• degen status - Show simulation status
• degen agents - List all Norse god agents
• degen agent <name> - Show specific agent details
• degen leaderboard - Show top performers
• degen trades [limit] - Show recent trades
• degen events [limit] - Show market events
• degen speed <ms> - Set simulation speed (100-5000ms)
• degen reset - Reset all agent learning
• degen open - Open the visual simulation window

Norse Runes:
${NORSE_RUNES.buy} Buy  ${NORSE_RUNES.sell} Sell  ${NORSE_RUNES.hold} Hold  ${NORSE_RUNES.profit} Profit  ${NORSE_RUNES.loss} Loss`,
    });
  }, [addOutput]);

  // Main command handler
  const handleCommand = useCallback(async (command, args) => {
    if (command !== 'degen') return false;

    const subCommand = args[0]?.toLowerCase();

    if (!subCommand) {
      showDefaultInfo();
      return true;
    }

    try {
      switch (subCommand) {
        case 'start':
          await handleStart();
          break;
        case 'stop':
          await handleStop();
          break;
        case 'status':
          handleStatus();
          break;
        case 'agents':
          handleAgents();
          break;
        case 'agent':
          handleAgent(args);
          break;
        case 'leaderboard':
          handleLeaderboard();
          break;
        case 'trades':
          handleTrades(args);
          break;
        case 'events':
          handleEvents(args);
          break;
        case 'speed':
          handleSpeed(args);
          break;
        case 'reset':
          handleReset();
          break;
        case 'open':
        case 'view':
          await handleOpenView();
          break;
        default:
          addOutput({
            type: 'error',
            content: `Unknown degen command: ${subCommand}\n\nUse 'degen' to see available commands`,
          });
      }
    } catch (error) {
      handleCommandError(error, `degen ${subCommand}`, addOutput);
    }

    return true;
  }, [
    addOutput,
    showDefaultInfo,
    handleStart,
    handleStop,
    handleStatus,
    handleAgents,
    handleAgent,
    handleLeaderboard,
    handleTrades,
    handleEvents,
    handleSpeed,
    handleReset,
    handleOpenView,
  ]);

  return {
    handleCommand,
    handleStart,
    handleStop,
    handleStatus,
    handleAgents,
    handleAgent,
    handleLeaderboard,
    handleTrades,
    handleEvents,
    handleSpeed,
    handleReset,
    handleOpenView,
  };
}

export default useDegenTownCommands;
