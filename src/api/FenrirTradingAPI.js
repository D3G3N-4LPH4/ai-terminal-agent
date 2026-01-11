/**
 * Fenrir Trading Bot API Client
 * Node.js bridge to Python-based Solana trading bot
 * Controls pump.fun memecoin trading with risk management
 *
 * @class FenrirTradingAPI
 */

import { createError, ErrorType } from '../utils/errorHandler.js';

export class FenrirTradingAPI {
  /**
   * Create a Fenrir Trading API client
   * @param {string} [apiUrl='http://localhost:8000'] - Fenrir API backend URL
   */
  constructor(apiUrl = 'http://localhost:8000') {
    this.apiUrl = apiUrl;
    this.websocket = null;
    this.listeners = new Map();
  }

  /**
   * Start the trading bot
   * @param {Object} config - Bot configuration
   * @param {string} [config.mode='simulation'] - Trading mode: simulation, conservative, aggressive, degen
   * @param {number} [config.buyAmountSol=0.1] - SOL per trade
   * @param {number} [config.stopLossPct=25] - Stop loss percentage
   * @param {number} [config.takeProfitPct=100] - Take profit percentage
   * @param {number} [config.trailingStopPct=15] - Trailing stop percentage
   * @param {number} [config.maxPositionAgeMinutes=60] - Max hold time in minutes
   * @param {number} [config.minInitialLiquiditySol=5] - Min liquidity to enter
   * @param {number} [config.maxInitialMarketCapSol=100] - Max market cap to enter
   * @param {string} [config.rpcUrl] - Custom Solana RPC URL
   * @param {string} [config.privateKey] - Wallet private key (for live trading)
   * @param {AbortSignal} [config.signal] - AbortSignal for request cancellation
   * @returns {Promise<Object>} Start result
   * @throws {Error} If bot fails to start
   */
  async startBot(config = {}) {
    try {
      const response = await fetch(`${this.apiUrl}/bot/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: config.mode || 'simulation',
          buy_amount_sol: config.buyAmountSol || 0.1,
          stop_loss_pct: config.stopLossPct || 25.0,
          take_profit_pct: config.takeProfitPct || 100.0,
          trailing_stop_pct: config.trailingStopPct || 15.0,
          max_position_age_minutes: config.maxPositionAgeMinutes || 60,
          min_initial_liquidity_sol: config.minInitialLiquiditySol || 5.0,
          max_initial_market_cap_sol: config.maxInitialMarketCapSol || 100.0,
          rpc_url: config.rpcUrl || null,
          private_key: config.privateKey || null,
        }),
        signal: config.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw createError(
          `Failed to start Fenrir bot: ${error.detail}`,
          ErrorType.API_ERROR
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        throw createError(
          "Fenrir API not available. Make sure the Python backend is running:\n" +
          "  python fenrir_api.py\n" +
          "  (from the PF-SOL trade code directory)",
          ErrorType.NETWORK_ERROR
        );
      }
      throw error;
    }
  }

  /**
   * Stop the trading bot
   * @param {Object} [options={}] - Options
   * @param {AbortSignal} [options.signal] - AbortSignal for request cancellation
   * @returns {Promise<Object>} Stop result
   */
  async stopBot(options = {}) {
    try {
      const response = await fetch(`${this.apiUrl}/bot/stop`, {
        method: 'POST',
        signal: options.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw createError(
          `Failed to stop bot: ${error.detail}`,
          ErrorType.API_ERROR
        );
      }

      return await response.json();
    } catch (error) {
      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        throw createError(
          "Fenrir API not available",
          ErrorType.NETWORK_ERROR
        );
      }
      throw error;
    }
  }

  /**
   * Get bot status and portfolio summary
   * @param {Object} [options={}] - Options
   * @param {AbortSignal} [options.signal] - AbortSignal for request cancellation
   * @returns {Promise<Object>} Bot status with portfolio data
   */
  async getStatus(options = {}) {
    try {
      const response = await fetch(`${this.apiUrl}/bot/status`, {
        signal: options.signal,
      });

      if (!response.ok) {
        throw createError('Failed to get bot status', ErrorType.API_ERROR);
      }

      return await response.json();
    } catch (error) {
      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        throw createError(
          "Fenrir API not available",
          ErrorType.NETWORK_ERROR
        );
      }
      throw error;
    }
  }

  /**
   * Get all open positions
   * @param {Object} [options={}] - Options
   * @param {AbortSignal} [options.signal] - AbortSignal for request cancellation
   * @returns {Promise<Array>} Array of position objects
   */
  async getPositions(options = {}) {
    try {
      const response = await fetch(`${this.apiUrl}/bot/positions`, {
        signal: options.signal,
      });

      if (!response.ok) {
        throw createError('Failed to get positions', ErrorType.API_ERROR);
      }

      const data = await response.json();
      return data.positions || [];
    } catch (error) {
      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        throw createError(
          "Fenrir API not available",
          ErrorType.NETWORK_ERROR
        );
      }
      throw error;
    }
  }

  /**
   * Execute manual trade (buy or sell)
   * @param {Object} trade - Trade parameters
   * @param {string} trade.action - 'buy' or 'sell'
   * @param {string} trade.tokenAddress - Token mint address
   * @param {number} [trade.amount] - Amount (SOL for buy, tokens for sell)
   * @param {Object} [options={}] - Options
   * @param {AbortSignal} [options.signal] - AbortSignal for request cancellation
   * @returns {Promise<Object>} Trade result
   */
  async executeTrade(trade, options = {}) {
    try {
      const response = await fetch(`${this.apiUrl}/bot/trade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: trade.action,
          token_address: trade.tokenAddress,
          amount: trade.amount || null,
        }),
        signal: options.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw createError(
          `Trade execution failed: ${error.detail}`,
          ErrorType.API_ERROR
        );
      }

      return await response.json();
    } catch (error) {
      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        throw createError(
          "Fenrir API not available",
          ErrorType.NETWORK_ERROR
        );
      }
      throw error;
    }
  }

  /**
   * Get bot configuration
   * @param {Object} [options={}] - Options
   * @param {AbortSignal} [options.signal] - AbortSignal for request cancellation
   * @returns {Promise<Object>} Bot configuration
   */
  async getConfig(options = {}) {
    try {
      const response = await fetch(`${this.apiUrl}/bot/config`, {
        signal: options.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw createError(
          `Failed to get config: ${error.detail}`,
          ErrorType.API_ERROR
        );
      }

      const data = await response.json();
      return data.config;
    } catch (error) {
      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        throw createError(
          "Fenrir API not available",
          ErrorType.NETWORK_ERROR
        );
      }
      throw error;
    }
  }

  /**
   * Check if Fenrir API is available
   * @returns {Promise<boolean>} True if available
   */
  async isAvailable() {
    try {
      const response = await fetch(`${this.apiUrl}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Connect to WebSocket for real-time updates
   * @param {Function} onMessage - Callback for messages (event data)
   * @param {Function} [onError] - Callback for errors
   * @returns {WebSocket} WebSocket connection
   */
  connectWebSocket(onMessage, onError) {
    // Close existing WebSocket if it exists to prevent memory leak
    if (this.websocket) {
      console.log('[Fenrir] Closing existing WebSocket before creating new one');
      this.disconnectWebSocket();
    }

    const wsUrl = this.apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');

    this.websocket = new WebSocket(`${wsUrl}/ws/updates`);

    this.websocket.onopen = () => {
      console.log('[Fenrir] WebSocket connected');
    };

    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage && typeof onMessage === 'function') {
          try {
            onMessage(data);
          } catch (callbackError) {
            console.error('[Fenrir] Error in onMessage callback:', callbackError);
            if (onError && typeof onError === 'function') {
              onError(callbackError);
            }
          }
        }
      } catch (error) {
        console.error('[Fenrir] Failed to parse WebSocket message:', error);
      }
    };

    this.websocket.onerror = (error) => {
      console.error('[Fenrir] WebSocket error:', error);
      if (onError && typeof onError === 'function') {
        onError(error);
      }
    };

    this.websocket.onclose = () => {
      console.log('[Fenrir] WebSocket disconnected');
      this.websocket = null; // Clear reference on close
    };

    return this.websocket;
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket() {
    if (this.websocket) {
      // Remove all event listeners before closing
      this.websocket.onopen = null;
      this.websocket.onmessage = null;
      this.websocket.onerror = null;
      this.websocket.onclose = null;

      // Close connection if not already closed
      if (this.websocket.readyState === WebSocket.OPEN ||
          this.websocket.readyState === WebSocket.CONNECTING) {
        this.websocket.close();
      }

      this.websocket = null;
    }
  }

  /**
   * Get API health
   * @returns {Promise<Object>} Health status
   */
  async getHealth() {
    try {
      const response = await fetch(`${this.apiUrl}/health`);
      if (!response.ok) {
        throw new Error('Health check failed');
      }
      return await response.json();
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

export default FenrirTradingAPI;
