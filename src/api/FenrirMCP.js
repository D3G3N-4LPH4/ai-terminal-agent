/**
 * Fenrir MCP (Model Context Protocol) Server
 * Exposes Fenrir trading bot capabilities as MCP tools for AI agents
 *
 * ⚠️  CRITICAL: These tools control REAL MONEY trading
 * Default: simulation mode only. Require explicit user confirmation for live trading.
 *
 * Available Tools:
 * - fenrir_start: Start trading bot with configuration
 * - fenrir_stop: Stop trading bot
 * - fenrir_status: Get bot status and portfolio
 * - fenrir_positions: Get all open positions
 * - fenrir_trade: Execute manual trade (requires confirmation)
 *
 * @class FenrirMCP
 */

import { FenrirTradingAPI } from './FenrirTradingAPI.js';
import { createError, ErrorType } from '../utils/errorHandler.js';

export class FenrirMCP {
  /**
   * Create a Fenrir MCP server
   * @param {string} [apiUrl] - Optional Fenrir API URL
   */
  constructor(apiUrl) {
    this.tradingAPI = new FenrirTradingAPI(apiUrl);
    this.serverName = 'fenrir-trading-mcp';
    this.version = '1.0.0';

    // Safety: Track if user has acknowledged risks
    this.riskAcknowledged = false;
    this.liveTrading Enabled = false;
  }

  /**
   * List available MCP tools
   * @returns {Promise<Array>} Array of tool definitions
   */
  async listTools() {
    return [
      {
        name: 'fenrir_start',
        description: 'Start Fenrir pump.fun trading bot. DEFAULT: simulation mode (paper trading). Use for monitoring launches and testing strategies without risk. Live trading requires explicit confirmation and wallet setup.',
        inputSchema: {
          type: 'object',
          properties: {
            mode: {
              type: 'string',
              enum: ['simulation', 'conservative', 'aggressive', 'degen'],
              default: 'simulation',
              description: 'Trading mode. SIMULATION (safe testing), CONSERVATIVE (small positions), AGGRESSIVE (larger positions), DEGEN (maximum risk)',
            },
            buyAmountSol: {
              type: 'number',
              default: 0.1,
              description: 'SOL amount per trade (default: 0.1 SOL)',
            },
            stopLossPct: {
              type: 'number',
              default: 25.0,
              description: 'Stop loss percentage - exit if down this much (default: 25%)',
            },
            takeProfitPct: {
              type: 'number',
              default: 100.0,
              description: 'Take profit percentage - exit if up this much (default: 100%)',
            },
            trailingStopPct: {
              type: 'number',
              default: 15.0,
              description: 'Trailing stop percentage - trail stop by this much from peak (default: 15%)',
            },
            maxPositionAgeMinutes: {
              type: 'number',
              default: 60,
              description: 'Maximum hold time in minutes - auto-sell after this duration (default: 60)',
            },
            minInitialLiquiditySol: {
              type: 'number',
              default: 5.0,
              description: 'Minimum SOL liquidity to consider token (default: 5 SOL)',
            },
            maxInitialMarketCapSol: {
              type: 'number',
              default: 100.0,
              description: 'Maximum market cap to enter position (default: 100 SOL)',
            },
          },
          required: [],
        },
      },
      {
        name: 'fenrir_stop',
        description: 'Stop Fenrir trading bot. Halts monitoring and prevents new trades. Existing positions remain open - use with caution.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'fenrir_status',
        description: 'Get Fenrir bot status, portfolio summary, and performance metrics. Shows: running status, open positions, total P&L, uptime.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'fenrir_positions',
        description: 'Get detailed information about all open trading positions. Includes: entry price, current price, P&L, hold time, and exit conditions.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'fenrir_trade',
        description: '⚠️  DANGER: Execute manual trade (buy or sell specific token). Requires explicit user confirmation. Should only be used in exceptional circumstances when automated rules are insufficient.',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['buy', 'sell'],
              description: 'Trade action: buy or sell',
            },
            tokenAddress: {
              type: 'string',
              description: 'Solana token mint address (base58 pubkey)',
            },
            amount: {
              type: 'number',
              description: 'Optional: amount to trade (SOL for buy, tokens for sell)',
            },
            confirmRisk: {
              type: 'boolean',
              default: false,
              description: 'User confirmation that they understand the risks',
            },
          },
          required: ['action', 'tokenAddress', 'confirmRisk'],
        },
      },
      {
        name: 'fenrir_config',
        description: 'Get current bot configuration including trading mode, risk parameters, and entry criteria.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  /**
   * Call an MCP tool
   * @param {string} toolName - Name of the tool to call
   * @param {Object} args - Tool arguments
   * @returns {Promise<Object>} Tool result
   */
  async callTool(toolName, args = {}) {
    try {
      switch (toolName) {
        case 'fenrir_start':
          return await this._startBot(args);

        case 'fenrir_stop':
          return await this._stopBot(args);

        case 'fenrir_status':
          return await this._getStatus(args);

        case 'fenrir_positions':
          return await this._getPositions(args);

        case 'fenrir_trade':
          return await this._executeTrade(args);

        case 'fenrir_config':
          return await this._getConfig(args);

        default:
          throw createError(
            `Unknown tool: ${toolName}. Available tools: ${(await this.listTools()).map(t => t.name).join(', ')}`,
            ErrorType.VALIDATION_ERROR
          );
      }
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error calling ${toolName}: ${error.message}`,
          },
        ],
      };
    }
  }

  /**
   * Start bot tool implementation
   * @private
   */
  async _startBot(args) {
    const { mode = 'simulation', ...config } = args;

    // Safety check: warn if attempting live trading
    if (mode !== 'simulation' && !this.liveTradingEnabled) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'LIVE TRADING DISABLED',
              message: 'Live trading modes (conservative, aggressive, degen) require explicit setup:',
              steps: [
                '1. Configure wallet private key (WALLET_PRIVATE_KEY env var)',
                '2. Fund wallet with SOL for trading + gas',
                '3. Test in simulation mode first',
                '4. Acknowledge you understand the risks',
                '5. Enable live trading in this session'
              ],
              current_mode: 'simulation_only',
              requested_mode: mode,
            }, null, 2),
          },
        ],
      };
    }

    const result = await this.tradingAPI.startBot({
      mode,
      ...config,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'started',
            mode,
            config,
            message: mode === 'simulation'
              ? '🐺 Fenrir started in SIMULATION mode - No real trades will be executed'
              : `🐺 Fenrir started in ${mode.toUpperCase()} mode - LIVE TRADING ACTIVE`,
            warning: mode !== 'simulation'
              ? 'Real money is at risk. Monitor positions closely.'
              : null,
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Stop bot tool implementation
   * @private
   */
  async _stopBot(args) {
    const result = await this.tradingAPI.stopBot();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'stopped',
            message: '🛑 Fenrir stopped - No new trades will be executed',
            note: 'Existing positions remain open. Close manually if needed.',
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Get status tool implementation
   * @private
   */
  async _getStatus(args) {
    const status = await this.tradingAPI.getStatus();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            bot_status: status.status,
            mode: status.mode,
            uptime_seconds: status.uptime_seconds,
            positions_count: status.positions_count,
            portfolio: status.portfolio,
            error: status.error,
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Get positions tool implementation
   * @private
   */
  async _getPositions(args) {
    const positions = await this.tradingAPI.getPositions();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            positions_count: positions.length,
            positions: positions.map(p => ({
              token: p.token_address,
              entry_time: p.entry_time,
              entry_price: p.entry_price,
              current_price: p.current_price,
              amount_tokens: p.amount_tokens,
              invested_sol: p.amount_sol_invested,
              pnl_percent: p.pnl_percent.toFixed(2) + '%',
              pnl_sol: p.pnl_sol.toFixed(4) + ' SOL',
              peak_price: p.peak_price,
            })),
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Execute trade tool implementation
   * @private
   */
  async _executeTrade(args) {
    const { action, tokenAddress, amount, confirmRisk } = args;

    // Safety check: require confirmation
    if (!confirmRisk) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'CONFIRMATION REQUIRED',
              message: 'Manual trading requires explicit risk confirmation',
              required_parameter: 'confirmRisk: true',
              warning: 'Manual trades bypass automated risk management. Use with extreme caution.',
            }, null, 2),
          },
        ],
      };
    }

    const result = await this.tradingAPI.executeTrade({
      action,
      tokenAddress,
      amount,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'executed',
            action,
            token: tokenAddress,
            amount,
            result,
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Get config tool implementation
   * @private
   */
  async _getConfig(args) {
    const config = await this.tradingAPI.getConfig();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            config,
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Enable live trading (requires explicit call)
   * @param {boolean} acknowledged - User must explicitly acknowledge risks
   */
  enableLiveTrading(acknowledged) {
    if (acknowledged === true) {
      this.liveTradingEnabled = true;
      this.riskAcknowledged = true;
      console.log('⚠️  LIVE TRADING ENABLED - Real money at risk');
    }
  }

  /**
   * Get server information
   * @returns {Object} Server info
   */
  getServerInfo() {
    return {
      name: this.serverName,
      version: this.version,
      description: 'Fenrir pump.fun trading bot MCP server - Automated memecoin trading on Solana',
      capabilities: ['tools'],
      tools: [
        'fenrir_start',
        'fenrir_stop',
        'fenrir_status',
        'fenrir_positions',
        'fenrir_trade',
        'fenrir_config',
      ],
      safety: {
        live_trading_enabled: this.liveTradingEnabled,
        risk_acknowledged: this.riskAcknowledged,
        default_mode: 'simulation',
      },
    };
  }
}

export default FenrirMCP;
