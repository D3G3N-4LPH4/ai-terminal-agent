/**
 * useTradingCommands - Trading bot command handlers
 *
 * Handles commands:
 * - fenrir start/stop/status/positions/config/health
 * - scan start/stop/status/tokens/config/stats/performance/history/toptokens/ai/backend
 */

import { useCallback } from 'react';

/**
 * Utility function for error handling
 */
function handleCommandError(error, command, addOutput) {
  console.error(`Command error (${command}):`, error);
  addOutput({
    type: 'error',
    content: `Error executing ${command}: ${error.message}`,
  });
}

/**
 * Hook for Fenrir and Scan trading commands
 * @param {Object} options - Command context
 * @returns {Object} Command handlers
 */
export function useTradingCommands({
  addOutput,
  showToast,
  fenrirTradingAPI,
  liveTradingEngine,
  WalletUtils,
}) {
  // === FENRIR COMMANDS ===

  const handleFenrirHelp = useCallback(() => {
    addOutput({
      type: 'error',
      content:
        "⚔️ Fenrir Trading Bot\n\nAvailable commands:\n• fenrir start [mode] - Start bot (simulation/conservative/aggressive/degen)\n• fenrir stop - Stop the bot\n• fenrir status - Portfolio summary\n• fenrir positions - Open positions\n• fenrir config - Bot configuration\n• fenrir health - Check backend status",
    });
  }, [addOutput]);

  const handleFenrirHealth = useCallback(async () => {
    addOutput({
      type: 'info',
      content: '⚔️ Checking Fenrir backend status...',
    });

    try {
      const health = await fenrirTradingAPI.checkHealth();

      if (health.available) {
        addOutput({
          type: 'success',
          content: `✓ Fenrir Trading Bot Connected\n\nᛟ Backend Status: ${health.status}\nᛟ API URL: ${health.apiUrl}\nᛟ Message: ${health.message}`,
        });
      } else {
        addOutput({
          type: 'error',
          content: `✗ Fenrir Backend Unavailable\n\nᛪ Status: ${health.status}\nᛪ API URL: ${health.apiUrl}\nᛪ Message: ${health.message}\n\nᛉ Start the Python backend:\n  cd "c:\\Users\\pmorr\\OneDrive\\Desktop\\PF-SOL trade code"\n  python fenrir_api.py`,
        });
      }
    } catch (error) {
      handleCommandError(error, 'fenrir health', addOutput);
    }
  }, [addOutput, fenrirTradingAPI]);

  const handleFenrirStart = useCallback(
    async (mode) => {
      const validModes = ['simulation', 'conservative', 'aggressive', 'degen'];

      if (!validModes.includes(mode)) {
        addOutput({
          type: 'error',
          content: `Invalid mode: ${mode}\n\nValid modes: simulation, conservative, aggressive, degen`,
        });
        return;
      }

      addOutput({
        type: 'info',
        content: `⚔️ Starting Fenrir in ${mode.toUpperCase()} mode...`,
      });

      try {
        const result = await fenrirTradingAPI.startBot({
          mode,
          buyAmountSol:
            mode === 'simulation'
              ? 0.1
              : mode === 'conservative'
                ? 0.05
                : mode === 'aggressive'
                  ? 0.2
                  : 0.5,
          stopLossPct: 25.0,
          takeProfitPct: mode === 'degen' ? 300.0 : 100.0,
          trailingStopPct: 15.0,
        });

        if (result.status === 'success') {
          addOutput({
            type: 'success',
            content: `✓ Fenrir Started Successfully!\n\nᛟ Mode: ${mode.toUpperCase()}${mode === 'simulation' ? ' (Paper Trading - No Real Funds)' : ''}\nᛟ Message: ${result.message}\n\nᛉ Use 'fenrir status' to monitor performance`,
          });
          showToast(`Fenrir started in ${mode} mode`, 'success');
        } else {
          addOutput({
            type: 'error',
            content: `✗ Failed to start Fenrir\n\nᛪ Error: ${result.error || result.message}`,
          });
        }
      } catch (error) {
        handleCommandError(error, 'fenrir start', addOutput);
      }
    },
    [addOutput, showToast, fenrirTradingAPI]
  );

  const handleFenrirStop = useCallback(async () => {
    addOutput({
      type: 'info',
      content: '⚔️ Stopping Fenrir Trading Bot...',
    });

    try {
      const result = await fenrirTradingAPI.stopBot();

      if (result.status === 'success') {
        addOutput({
          type: 'success',
          content: `✓ Fenrir Stopped\n\nᛟ Message: ${result.message}`,
        });
        showToast('Fenrir stopped', 'success');
      } else {
        addOutput({
          type: 'error',
          content: `✗ Failed to stop Fenrir\n\nᛪ Error: ${result.error || result.message}`,
        });
      }
    } catch (error) {
      handleCommandError(error, 'fenrir stop', addOutput);
    }
  }, [addOutput, showToast, fenrirTradingAPI]);

  const handleFenrirStatus = useCallback(async () => {
    addOutput({
      type: 'info',
      content: '⚔️ Fetching Fenrir status...',
    });

    try {
      const status = await fenrirTradingAPI.getStatus();

      if (status.error) {
        addOutput({
          type: 'error',
          content: `✗ Failed to get status\n\nᛪ Error: ${status.error}`,
        });
        return;
      }

      const portfolio = status.portfolio || {};
      const pnlColor = (portfolio.total_pnl_pct || 0) >= 0 ? '+' : '';

      addOutput({
        type: 'info',
        content: `⚔️ FENRIR TRADING BOT STATUS\n\nᛟ Bot Status: ${status.is_running ? '🟢 RUNNING' : '🔴 STOPPED'}\nᛟ Mode: ${status.mode || 'N/A'}\n\n💼 PORTFOLIO SUMMARY:\nᛏ Total Invested: ${portfolio.total_invested_sol || 0} SOL\nᛏ Current Value: ${portfolio.current_value_sol || 0} SOL\nᛏ Total P&L: ${pnlColor}${(portfolio.total_pnl_pct || 0).toFixed(2)}% (${pnlColor}${(portfolio.total_pnl_sol || 0).toFixed(4)} SOL)\nᛏ Open Positions: ${portfolio.open_positions || 0}\nᛏ Closed Positions: ${portfolio.closed_positions || 0}\nᛏ Win Rate: ${((portfolio.win_rate || 0) * 100).toFixed(1)}%`,
      });
    } catch (error) {
      handleCommandError(error, 'fenrir status', addOutput);
    }
  }, [addOutput, fenrirTradingAPI]);

  const handleFenrirPositions = useCallback(async () => {
    addOutput({
      type: 'info',
      content: '⚔️ Fetching open positions...',
    });

    try {
      const result = await fenrirTradingAPI.getPositions();

      if (result.error) {
        addOutput({
          type: 'error',
          content: `✗ Failed to get positions\n\nᛪ Error: ${result.error}`,
        });
        return;
      }

      const positions = result.positions || [];

      if (positions.length === 0) {
        addOutput({
          type: 'info',
          content: '⚔️ No open positions',
        });
        return;
      }

      let output = `⚔️ OPEN POSITIONS (${positions.length})\n\n`;

      positions.forEach((pos, idx) => {
        const pnlColor = (pos.unrealized_pnl_pct || 0) >= 0 ? '+' : '';
        const ageMinutes = Math.floor((Date.now() - new Date(pos.entry_time).getTime()) / 60000);

        output += `${idx + 1}. ${pos.symbol || 'Unknown'}\n`;
        output += `   ᛏ Token: ${pos.token_address?.substring(0, 8)}...${pos.token_address?.substring(pos.token_address.length - 6)}\n`;
        output += `   ᛏ Entry: ${pos.entry_price?.toFixed(8)} SOL (${pos.amount_sol} SOL)\n`;
        output += `   ᛏ Current: ${pos.current_price?.toFixed(8)} SOL\n`;
        output += `   ᛏ P&L: ${pnlColor}${(pos.unrealized_pnl_pct || 0).toFixed(2)}% (${pnlColor}${(pos.unrealized_pnl_sol || 0).toFixed(4)} SOL)\n`;
        output += `   ᛏ Hold Time: ${ageMinutes} minutes\n`;
        if (pos.stop_loss) output += `   ᛏ Stop Loss: ${pos.stop_loss.toFixed(8)} SOL\n`;
        if (pos.take_profit) output += `   ᛏ Take Profit: ${pos.take_profit.toFixed(8)} SOL\n`;
        output += `\n`;
      });

      addOutput({
        type: 'info',
        content: output,
      });
    } catch (error) {
      handleCommandError(error, 'fenrir positions', addOutput);
    }
  }, [addOutput, fenrirTradingAPI]);

  const handleFenrirConfig = useCallback(async () => {
    addOutput({
      type: 'info',
      content: '⚔️ Fetching bot configuration...',
    });

    try {
      const config = await fenrirTradingAPI.getConfig();

      if (config.error) {
        addOutput({
          type: 'error',
          content: `✗ Failed to get config\n\nᛪ Error: ${config.error}`,
        });
        return;
      }

      addOutput({
        type: 'info',
        content: `⚔️ FENRIR BOT CONFIGURATION\n\nᛟ Trading Mode: ${config.mode || 'N/A'}\nᛟ Buy Amount: ${config.buy_amount_sol || 0} SOL\nᛟ Stop Loss: ${config.stop_loss_pct || 0}%\nᛟ Take Profit: ${config.take_profit_pct || 0}%\nᛟ Trailing Stop: ${config.trailing_stop_pct || 0}%\nᛟ Max Position Age: ${config.max_position_age_minutes || 0} minutes\nᛟ Min Liquidity: ${config.min_initial_liquidity_sol || 0} SOL\nᛟ Max Market Cap: ${config.max_initial_market_cap_sol || 0} SOL`,
      });
    } catch (error) {
      handleCommandError(error, 'fenrir config', addOutput);
    }
  }, [addOutput, fenrirTradingAPI]);

  // === SCAN COMMANDS ===

  const handleScanHelp = useCallback(() => {
    addOutput({
      type: 'info',
      content: `🔍 LIVE TRADING SCANNER\n\n📡 Real-time token discovery on pump.fun and bonk.fun\n\nCommands:\n  scan start <mode>      Start scanner (simulation/live)\n  scan stop              Stop scanner\n  scan status            View scanner status and positions\n  scan tokens            List discovered tokens\n  scan config <key>=<val> Update configuration\n  scan stats             Trading statistics\n\nExamples:\n  > scan start simulation\n  > scan start live\n  > scan status\n  > scan config buyAmount=0.1\n  > scan stats\n\n⚠️  Always test in simulation mode before using live mode with real money!`,
    });
  }, [addOutput]);

  const handleScanStart = useCallback(
    async (mode) => {
      if (!['simulation', 'live'].includes(mode)) {
        addOutput({
          type: 'error',
          content: `Invalid mode: ${mode}\n\nValid modes: simulation, live`,
        });
        return;
      }

      if (mode === 'live') {
        addOutput({
          type: 'warning',
          content: `⚠️  LIVE MODE WARNING\n\nYou are about to start live trading with real money!\n\nMake sure:\n• Your wallet has sufficient SOL\n• You understand the risks\n• Stop loss and take profit are configured\n• You are ready to monitor positions\n\nStarting in 3 seconds...`,
        });
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      try {
        liveTradingEngine.mode = mode;
        await liveTradingEngine.start();

        const config = liveTradingEngine.getConfig();
        addOutput({
          type: 'success',
          content: `✓ Live Scanner Started!\n\n📡 Mode: ${mode.toUpperCase()}\n💰 Buy Amount: ${config.buyAmount} SOL\n🛑 Stop Loss: ${(config.stopLoss * 100).toFixed(1)}%\n🎯 Take Profit: ${(config.takeProfit * 100).toFixed(1)}%\n📈 Trailing Stop: ${(config.trailingStop * 100).toFixed(1)}%\n\n🔍 Scanning pump.fun and bonk.fun for new tokens...\n\n${mode === 'simulation' ? '🧪 Simulation mode - No real money at risk' : '💸 LIVE mode - Trading with real money!'}`,
        });
        showToast(`Scanner started in ${mode} mode`, 'success');
      } catch (error) {
        handleCommandError(error, 'scan start', addOutput);
      }
    },
    [addOutput, showToast, liveTradingEngine]
  );

  const handleScanStop = useCallback(async () => {
    try {
      await liveTradingEngine.stop();
      addOutput({
        type: 'success',
        content: `✓ Live Scanner Stopped\n\nAll scanning and monitoring has been stopped.`,
      });
      showToast('Scanner stopped', 'success');
    } catch (error) {
      handleCommandError(error, 'scan stop', addOutput);
    }
  }, [addOutput, showToast, liveTradingEngine]);

  const handleScanStatus = useCallback(() => {
    const status = liveTradingEngine.getStatus();
    const positions = Array.from(liveTradingEngine.activePositions.values());

    let output = `📊 SCANNER STATUS\n\n`;
    output += `Status: ${status.isRunning ? '🟢 Running' : '🔴 Stopped'}\n`;
    output += `Mode: ${status.mode.toUpperCase()}\n`;
    output += `Tokens Scanned: ${status.stats.tokensScanned}\n`;
    output += `Trades Executed: ${status.stats.tradesExecuted}\n`;
    output += `Active Positions: ${positions.length}\n\n`;

    if (positions.length > 0) {
      output += `📈 ACTIVE POSITIONS:\n`;
      output += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      for (const pos of positions) {
        const pnlPercent = (((pos.currentPrice - pos.entryPrice) / pos.entryPrice) * 100).toFixed(
          2
        );
        const pnlSOL = ((pos.currentPrice - pos.entryPrice) * pos.amount).toFixed(4);
        output += `${pos.symbol || WalletUtils.truncatePublicKey(pos.tokenAddress)}\n`;
        output += `  Entry: ${pos.entryPrice.toFixed(6)} SOL\n`;
        output += `  Current: ${pos.currentPrice.toFixed(6)} SOL\n`;
        output += `  P&L: ${pnlPercent >= 0 ? '🟢' : '🔴'} ${pnlPercent}% (${pnlSOL} SOL)\n`;
        output += `  Hold Time: ${Math.floor((Date.now() - pos.entryTime) / 60000)} min\n\n`;
      }
    } else {
      output += `No active positions\n`;
    }

    addOutput({
      type: 'info',
      content: output,
    });
  }, [addOutput, liveTradingEngine, WalletUtils]);

  const handleScanTokens = useCallback(() => {
    const tokens = Array.from(liveTradingEngine.scannedTokens.values()).slice(-10);

    if (tokens.length === 0) {
      addOutput({
        type: 'info',
        content: `No tokens discovered yet.\n\nMake sure the scanner is running: scan start simulation`,
      });
      return;
    }

    let output = `🔍 DISCOVERED TOKENS (Last 10):\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    for (const token of tokens) {
      output += `${token.symbol || 'Unknown'}\n`;
      output += `  Address: ${WalletUtils.truncatePublicKey(token.address)}\n`;
      output += `  Platform: ${token.platform}\n`;
      output += `  Liquidity: ${token.liquidity ? token.liquidity.toFixed(2) + ' SOL' : 'Unknown'}\n`;
      output += `  Risk Score: ${token.riskScore ? (token.riskScore * 100).toFixed(1) + '%' : 'Unknown'}\n`;
      output += `  Discovered: ${new Date(token.discovered).toLocaleTimeString()}\n\n`;
    }

    addOutput({
      type: 'info',
      content: output,
    });
  }, [addOutput, liveTradingEngine, WalletUtils]);

  const handleScanConfig = useCallback(
    (keyValueArg) => {
      if (!keyValueArg) {
        const config = liveTradingEngine.getConfig();
        addOutput({
          type: 'info',
          content: `⚙️  SCANNER CONFIGURATION\n\n💰 Buy Amount: ${config.buyAmount} SOL\n🛑 Stop Loss: ${(config.stopLoss * 100).toFixed(1)}%\n🎯 Take Profit: ${(config.takeProfit * 100).toFixed(1)}%\n📈 Trailing Stop: ${(config.trailingStop * 100).toFixed(1)}%\n⏱️  Scan Interval: ${config.scanInterval / 1000}s\n💧 Min Liquidity: ${config.minLiquidity} SOL\n📊 Max Market Cap: ${config.maxMarketCap} SOL\n\nUpdate: scan config <key>=<value>`,
        });
        return;
      }

      // Parse key=value
      const [key, value] = keyValueArg.split('=');
      if (!key || !value) {
        addOutput({
          type: 'error',
          content: `Invalid format. Use: scan config <key>=<value>\n\nExample: scan config buyAmount=0.1`,
        });
        return;
      }

      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        addOutput({
          type: 'error',
          content: `Invalid value: ${value}. Must be a number.`,
        });
        return;
      }

      const validKeys = [
        'buyAmount',
        'stopLoss',
        'takeProfit',
        'trailingStop',
        'minLiquidity',
        'maxMarketCap',
      ];
      if (!validKeys.includes(key)) {
        addOutput({
          type: 'error',
          content: `Invalid config key: ${key}\n\nValid keys: ${validKeys.join(', ')}`,
        });
        return;
      }

      // Validate value ranges
      const validationRules = {
        buyAmount: { min: 0.001, max: 100, unit: 'SOL' },
        stopLoss: { min: 0.01, max: 0.99, unit: '%', multiply: 100 },
        takeProfit: { min: 0.01, max: 10, unit: '%', multiply: 100 },
        trailingStop: { min: 0.01, max: 0.5, unit: '%', multiply: 100 },
        minLiquidity: { min: 0, max: 1000, unit: 'SOL' },
        maxMarketCap: { min: 1, max: 100000, unit: 'SOL' },
      };

      const rule = validationRules[key];
      if (numValue < rule.min || numValue > rule.max) {
        const displayMin = rule.multiply ? (rule.min * rule.multiply).toFixed(0) : rule.min;
        const displayMax = rule.multiply ? (rule.max * rule.multiply).toFixed(0) : rule.max;
        addOutput({
          type: 'error',
          content: `❌ Invalid value for ${key}\n\nMust be between ${displayMin}${rule.unit} and ${displayMax}${rule.unit}\n\nYou provided: ${rule.multiply ? (numValue * rule.multiply).toFixed(1) : numValue}${rule.unit}`,
        });
        return;
      }

      // Additional validation for logical relationships
      if (key === 'takeProfit' && numValue <= liveTradingEngine.stopLoss) {
        addOutput({
          type: 'error',
          content: `❌ Take profit (${(numValue * 100).toFixed(1)}%) must be greater than stop loss (${(liveTradingEngine.stopLoss * 100).toFixed(1)}%)`,
        });
        return;
      }

      if (key === 'stopLoss' && numValue >= liveTradingEngine.takeProfit) {
        addOutput({
          type: 'error',
          content: `❌ Stop loss (${(numValue * 100).toFixed(1)}%) must be less than take profit (${(liveTradingEngine.takeProfit * 100).toFixed(1)}%)`,
        });
        return;
      }

      liveTradingEngine[key] = numValue;
      const displayValue = rule.multiply
        ? `${(numValue * rule.multiply).toFixed(1)}${rule.unit}`
        : `${numValue} ${rule.unit}`;
      addOutput({
        type: 'success',
        content: `✓ Configuration Updated\n\n${key} = ${displayValue}`,
      });
      showToast(`Config updated: ${key}`, 'success');
    },
    [addOutput, showToast, liveTradingEngine]
  );

  const handleScanStats = useCallback(() => {
    const stats = liveTradingEngine.getStats();

    let output = `📊 TRADING STATISTICS\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    output += `🔍 Tokens Scanned: ${stats.tokensScanned}\n`;
    output += `💰 Trades Executed: ${stats.tradesExecuted}\n`;
    output += `✅ Winning Trades: ${stats.winningTrades}\n`;
    output += `❌ Losing Trades: ${stats.losingTrades}\n`;
    output += `📈 Win Rate: ${stats.tradesExecuted > 0 ? ((stats.winningTrades / stats.tradesExecuted) * 100).toFixed(1) : 0}%\n\n`;
    output += `💵 Total P&L: ${stats.totalPnL >= 0 ? '🟢' : '🔴'} ${stats.totalPnL.toFixed(4)} SOL\n`;
    output += `📊 ROI: ${stats.roi.toFixed(2)}%\n`;
    output += `🏆 Best Trade: ${stats.bestTrade.toFixed(4)} SOL\n`;
    output += `💔 Worst Trade: ${stats.worstTrade.toFixed(4)} SOL\n\n`;
    output += `⏱️  Running Time: ${Math.floor(stats.runningTime / 60000)} minutes\n`;

    addOutput({
      type: 'info',
      content: output,
    });
  }, [addOutput, liveTradingEngine]);

  const handleScanPerformance = useCallback(
    async (days) => {
      const numDays = parseInt(days) || 30;
      addOutput({
        type: 'info',
        content: `📊 Fetching performance report (${numDays} days)...`,
      });

      try {
        const report = await liveTradingEngine.getPerformanceReport(numDays);

        if (report?.error) {
          addOutput({
            type: 'warning',
            content: `⚠️ ${report.error}\n\nTo enable performance analytics:\n1. Start Fenrir backend: cd fenrir-trading-bot && python app.py\n2. Backend must be running on http://localhost:8000`,
          });
          return;
        }

        if (report?.report) {
          addOutput({
            type: 'info',
            content: report.report,
          });
        } else {
          addOutput({
            type: 'warning',
            content: `No performance data available for the last ${numDays} days.`,
          });
        }
      } catch (error) {
        handleCommandError(error, 'scan performance', addOutput);
      }
    },
    [addOutput, liveTradingEngine]
  );

  const handleScanHistory = useCallback(
    async (limit) => {
      const numLimit = parseInt(limit) || 20;

      try {
        const history = await liveTradingEngine.getPositionHistory(30);

        if (history?.error) {
          addOutput({
            type: 'warning',
            content: `⚠️ ${history.error}\n\nStart Fenrir backend to enable trade history.`,
          });
          return;
        }

        if (!history?.positions || history.positions.length === 0) {
          addOutput({
            type: 'info',
            content: 'No trade history available yet.',
          });
          return;
        }

        let output = `📜 TRADE HISTORY (Last ${history.positions.length} positions)\n`;
        output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        history.positions.slice(0, numLimit).forEach((p, i) => {
          const pnlIcon = p.pnl_sol >= 0 ? '🟢' : '🔴';
          output += `${i + 1}. ${p.token_symbol || p.token_mint?.substring(0, 8)}\n`;
          output += `   P&L: ${pnlIcon} ${p.pnl_sol?.toFixed(4)} SOL (${p.pnl_pct?.toFixed(1)}%)\n`;
          output += `   Hold: ${p.hold_time_minutes} min | Exit: ${p.exit_reason || 'N/A'}\n\n`;
        });

        addOutput({
          type: 'info',
          content: output,
        });
      } catch (error) {
        handleCommandError(error, 'scan history', addOutput);
      }
    },
    [addOutput, liveTradingEngine]
  );

  const handleScanTopTokens = useCallback(
    async (limit) => {
      const numLimit = parseInt(limit) || 10;

      try {
        const tokens = await liveTradingEngine.getTopTokens(numLimit);

        if (tokens?.error) {
          addOutput({
            type: 'warning',
            content: `⚠️ ${tokens.error}\n\nStart Fenrir backend to enable token analytics.`,
          });
          return;
        }

        if (!tokens?.tokens || tokens.tokens.length === 0) {
          addOutput({
            type: 'info',
            content: 'No token performance data available yet.',
          });
          return;
        }

        let output = `🏆 TOP PERFORMING TOKENS\n`;
        output += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        tokens.tokens.forEach((t, i) => {
          output += `${i + 1}. ${t.token_symbol || t.token_mint?.substring(0, 8)}\n`;
          output += `   Avg Return: ${t.avg_return?.toFixed(1)}%\n`;
          output += `   Total P&L: ${t.total_pnl?.toFixed(4)} SOL\n`;
          output += `   Trades: ${t.trades}\n\n`;
        });

        addOutput({
          type: 'info',
          content: output,
        });
      } catch (error) {
        handleCommandError(error, 'scan toptokens', addOutput);
      }
    },
    [addOutput, liveTradingEngine]
  );

  const handleScanAI = useCallback(
    async (action, tokenAddress) => {
      if (!action || action === 'status') {
        const jitoStatus = await liveTradingEngine.getJitoStatus();
        addOutput({
          type: 'info',
          content:
            `🤖 AI & BACKEND STATUS\n\n` +
            `AI Analysis: ${liveTradingEngine.useAIAnalysis ? '✅ Enabled' : '❌ Disabled'}\n` +
            `Database: ${liveTradingEngine.useDatabase ? '✅ Enabled' : '❌ Disabled'}\n` +
            `Backend Connected: ${liveTradingEngine.backendConnected ? '✅ Yes' : '❌ No'}\n` +
            `Jito MEV: ${jitoStatus?.enabled ? '✅ Enabled' : '❌ Disabled'}\n\n` +
            `Commands:\n` +
            `• scan ai enable - Enable AI-powered analysis\n` +
            `• scan ai disable - Disable AI analysis\n` +
            `• scan ai analyze <address> - Analyze specific token`,
        });
        return;
      }

      if (action === 'enable') {
        liveTradingEngine.useAIAnalysis = true;
        addOutput({
          type: 'success',
          content: `✅ AI Analysis Enabled\n\nTokens will now be analyzed using Claude AI before trading.\n\n⚠️ Requires:\n• Fenrir backend running\n• OPENROUTER_API_KEY configured\n• AI_ANALYSIS_ENABLED=true in .env`,
        });
        return;
      }

      if (action === 'disable') {
        liveTradingEngine.useAIAnalysis = false;
        addOutput({
          type: 'success',
          content: `❌ AI Analysis Disabled\n\nTokens will be evaluated using risk score only.`,
        });
        return;
      }

      if (action === 'analyze' && tokenAddress) {
        addOutput({
          type: 'info',
          content: `🤖 Analyzing token ${tokenAddress.substring(0, 8)}...`,
        });

        try {
          const analysis = await liveTradingEngine.getAIAnalysis({
            address: tokenAddress,
            name: 'Unknown',
            symbol: '???',
          });

          if (analysis?.error) {
            addOutput({
              type: 'warning',
              content: `⚠️ ${analysis.error}\n\nMake sure Fenrir backend is running with AI enabled.`,
            });
            return;
          }

          let output = `🤖 AI ANALYSIS RESULT\n`;
          output += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
          output += `🎯 Decision: ${analysis.decision?.toUpperCase()}\n`;
          output += `📊 Confidence: ${(analysis.confidence * 100).toFixed(0)}%\n`;
          output += `⚠️ Risk Score: ${analysis.risk_score}/10\n\n`;
          output += `💭 Reasoning:\n${analysis.reasoning}\n\n`;

          if (analysis.red_flags?.length > 0) {
            output += `🚩 Red Flags:\n`;
            analysis.red_flags.forEach((f) => (output += `• ${f}\n`));
            output += `\n`;
          }

          if (analysis.green_flags?.length > 0) {
            output += `✅ Green Flags:\n`;
            analysis.green_flags.forEach((f) => (output += `• ${f}\n`));
            output += `\n`;
          }

          if (analysis.suggested_buy_amount_sol) {
            output += `💡 Suggested:\n`;
            output += `• Buy: ${analysis.suggested_buy_amount_sol} SOL\n`;
            output += `• Stop Loss: ${analysis.suggested_stop_loss_pct}%\n`;
            output += `• Take Profit: ${analysis.suggested_take_profit_pct}%\n`;
          }

          addOutput({
            type:
              analysis.decision === 'buy' || analysis.decision === 'strong_buy'
                ? 'success'
                : 'info',
            content: output,
          });
        } catch (error) {
          handleCommandError(error, 'scan ai analyze', addOutput);
        }
        return;
      }

      addOutput({
        type: 'error',
        content: `Unknown AI command: ${action}\n\nUse: scan ai [enable|disable|status|analyze <address>]`,
      });
    },
    [addOutput, liveTradingEngine]
  );

  const handleScanBackend = useCallback(async () => {
    addOutput({
      type: 'info',
      content: '🔌 Checking Fenrir backend connection...',
    });

    try {
      const health = await liveTradingEngine.checkBackendStatus();

      if (health.success) {
        let output = `✅ FENRIR BACKEND CONNECTED\n\n`;
        output += `Services:\n`;
        output += `• Price Feed: ${health.services?.price_feed ? '✅' : '❌'}\n`;
        output += `• Trade Database: ${health.services?.trade_db ? '✅' : '❌'}\n`;
        output += `• AI Analyst: ${health.services?.ai_analyst ? '✅' : '❌'}\n`;
        output += `• Jito MEV: ${health.services?.jito ? '✅' : '❌'}\n`;
        output += `• Performance Analyzer: ${health.services?.performance_analyzer ? '✅' : '❌'}\n`;

        addOutput({
          type: 'success',
          content: output,
        });
      } else {
        addOutput({
          type: 'error',
          content: `❌ FENRIR BACKEND NOT AVAILABLE\n\nError: ${health.error}\n\nTo start the backend:\n1. cd fenrir-trading-bot\n2. pip install -r requirements.txt\n3. cp .env.example .env\n4. python app.py\n\nBackend provides:\n• Multi-source price feeds\n• Trade database & persistence\n• AI-powered token analysis\n• Performance analytics\n• Jito MEV protection`,
        });
      }
    } catch (error) {
      handleCommandError(error, 'scan backend', addOutput);
    }
  }, [addOutput, liveTradingEngine]);

  // Main command handler
  const handleCommand = useCallback(
    async (command, args) => {
      if (command === 'fenrir') {
        const subCommand = args[0]?.toLowerCase();

        if (!subCommand) {
          handleFenrirHelp();
          return true;
        }

        switch (subCommand) {
          case 'health':
            await handleFenrirHealth();
            return true;
          case 'start':
            await handleFenrirStart(args[1]?.toLowerCase() || 'simulation');
            return true;
          case 'stop':
            await handleFenrirStop();
            return true;
          case 'status':
            await handleFenrirStatus();
            return true;
          case 'positions':
            await handleFenrirPositions();
            return true;
          case 'config':
            await handleFenrirConfig();
            return true;
          default:
            addOutput({
              type: 'error',
              content: `Unknown Fenrir command: ${subCommand}\n\nUse 'fenrir' to see available commands`,
            });
            return true;
        }
      }

      if (command === 'scan') {
        const subCommand = args[0]?.toLowerCase();

        if (!subCommand || subCommand === 'help') {
          handleScanHelp();
          return true;
        }

        switch (subCommand) {
          case 'start':
            await handleScanStart(args[1]?.toLowerCase() || 'simulation');
            return true;
          case 'stop':
            await handleScanStop();
            return true;
          case 'status':
            handleScanStatus();
            return true;
          case 'tokens':
            handleScanTokens();
            return true;
          case 'config':
            handleScanConfig(args[1]);
            return true;
          case 'stats':
            handleScanStats();
            return true;
          case 'performance':
            await handleScanPerformance(args[1]);
            return true;
          case 'history':
            await handleScanHistory(args[1]);
            return true;
          case 'toptokens':
            await handleScanTopTokens(args[1]);
            return true;
          case 'ai':
            await handleScanAI(args[1]?.toLowerCase(), args[2]);
            return true;
          case 'backend':
            await handleScanBackend();
            return true;
          default:
            addOutput({
              type: 'error',
              content: `Unknown scan command: ${subCommand}\n\nUse 'scan' to see available commands`,
            });
            return true;
        }
      }

      return false;
    },
    [
      addOutput,
      handleFenrirHelp,
      handleFenrirHealth,
      handleFenrirStart,
      handleFenrirStop,
      handleFenrirStatus,
      handleFenrirPositions,
      handleFenrirConfig,
      handleScanHelp,
      handleScanStart,
      handleScanStop,
      handleScanStatus,
      handleScanTokens,
      handleScanConfig,
      handleScanStats,
      handleScanPerformance,
      handleScanHistory,
      handleScanTopTokens,
      handleScanAI,
      handleScanBackend,
    ]
  );

  return {
    handleCommand,
    // Fenrir handlers
    handleFenrirHealth,
    handleFenrirStart,
    handleFenrirStop,
    handleFenrirStatus,
    handleFenrirPositions,
    handleFenrirConfig,
    // Scan handlers
    handleScanStart,
    handleScanStop,
    handleScanStatus,
    handleScanTokens,
    handleScanConfig,
    handleScanStats,
    handleScanPerformance,
    handleScanHistory,
    handleScanTopTokens,
    handleScanAI,
    handleScanBackend,
  };
}

export default useTradingCommands;
