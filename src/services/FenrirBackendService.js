/**
 * Fenrir Backend Service
 *
 * Connects to the Fenrir Trading Bot Python backend (FastAPI)
 * Provides access to Phase 1-3 features:
 * - Phase 1: Real Trading (pump.fun bonding curve, price feeds)
 * - Phase 2: Safety (trade database, Jito MEV protection)
 * - Phase 3: Intelligence (AI analysis, performance analytics)
 */

class FenrirBackendService {
  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
    this.isConnected = false;
    this.lastHealthCheck = null;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //                           CONNECTION & HEALTH
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Check if backend is available
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        this.isConnected = true;
        this.lastHealthCheck = {
          timestamp: new Date(),
          services: data.services,
          status: data.status
        };
        return { success: true, ...data };
      }

      this.isConnected = false;
      return { success: false, error: 'Backend not responding' };
    } catch (error) {
      this.isConnected = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * Get backend status
   */
  async getStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error getting status:', error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //                      PHASE 1: PRICE FEEDS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Get aggregated price from multiple sources
   */
  async getPrice(tokenMint, forceRefresh = false) {
    try {
      const response = await fetch(`${this.baseUrl}/price/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_mint: tokenMint,
          force_refresh: forceRefresh
        })
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error getting price:', error);
      return null;
    }
  }

  /**
   * Simple price lookup
   */
  async getPriceSimple(tokenMint) {
    try {
      const response = await fetch(`${this.baseUrl}/price/${tokenMint}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error getting simple price:', error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //                      PHASE 1: BONDING CURVE
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Decode bonding curve account data
   */
  async decodeBondingCurve(accountDataBase64) {
    try {
      const response = await fetch(`${this.baseUrl}/bonding-curve/decode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_data: accountDataBase64 })
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error decoding bonding curve:', error);
      return null;
    }
  }

  /**
   * Calculate buy amount and price impact
   */
  async calculateBuy(curveState, buyAmountSol) {
    try {
      const response = await fetch(`${this.baseUrl}/bonding-curve/calculate-buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          virtual_token_reserves: curveState.virtualTokenReserves,
          virtual_sol_reserves: curveState.virtualSolReserves,
          real_token_reserves: curveState.realTokenReserves,
          real_sol_reserves: curveState.realSolReserves,
          token_total_supply: curveState.tokenTotalSupply,
          buy_amount_sol: buyAmountSol
        })
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error calculating buy:', error);
      return null;
    }
  }

  /**
   * Get optimal buy amount for max price impact
   */
  async getOptimalBuy(curveState) {
    try {
      const response = await fetch(`${this.baseUrl}/bonding-curve/optimal-buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          virtual_token_reserves: curveState.virtualTokenReserves,
          virtual_sol_reserves: curveState.virtualSolReserves,
          real_token_reserves: curveState.realTokenReserves,
          real_sol_reserves: curveState.realSolReserves,
          token_total_supply: curveState.tokenTotalSupply,
          buy_amount_sol: 0.1 // placeholder
        })
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error getting optimal buy:', error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //                      PHASE 2: TRADE DATABASE
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Record a trade
   */
  async recordTrade(trade) {
    try {
      const response = await fetch(`${this.baseUrl}/trades/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trade_type: trade.type,
          token_mint: trade.tokenMint,
          token_symbol: trade.symbol,
          amount_sol: trade.amountSol,
          amount_tokens: trade.amountTokens,
          price_per_token: trade.price,
          slippage_pct: trade.slippage,
          gas_fee_sol: trade.gasFee,
          signature: trade.signature,
          position_id: trade.positionId,
          notes: trade.notes || ''
        })
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error recording trade:', error);
      return null;
    }
  }

  /**
   * Get recent trades
   */
  async getRecentTrades(limit = 50) {
    try {
      const response = await fetch(`${this.baseUrl}/trades/recent?limit=${limit}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error getting recent trades:', error);
      return null;
    }
  }

  /**
   * Open a new position
   */
  async openPosition(position) {
    try {
      const response = await fetch(`${this.baseUrl}/positions/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_mint: position.tokenMint,
          token_symbol: position.symbol,
          entry_price: position.entryPrice,
          entry_amount_tokens: position.amountTokens,
          entry_amount_sol: position.amountSol,
          entry_signature: position.signature,
          strategy: position.strategy || 'default',
          notes: position.notes || ''
        })
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error opening position:', error);
      return null;
    }
  }

  /**
   * Close a position
   */
  async closePosition(positionId, exitData) {
    try {
      const response = await fetch(`${this.baseUrl}/positions/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position_id: positionId,
          exit_price: exitData.price,
          exit_amount_tokens: exitData.amountTokens,
          exit_amount_sol: exitData.amountSol,
          exit_signature: exitData.signature,
          exit_reason: exitData.reason
        })
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error closing position:', error);
      return null;
    }
  }

  /**
   * Get open positions
   */
  async getOpenPositions() {
    try {
      const response = await fetch(`${this.baseUrl}/positions/open`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error getting open positions:', error);
      return null;
    }
  }

  /**
   * Get closed positions
   */
  async getClosedPositions(days = 30) {
    try {
      const response = await fetch(`${this.baseUrl}/positions/closed?days=${days}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error getting closed positions:', error);
      return null;
    }
  }

  /**
   * Update peak price for trailing stop
   */
  async updatePeakPrice(positionId, peakPrice) {
    try {
      const response = await fetch(
        `${this.baseUrl}/positions/${positionId}/update-peak?peak_price=${peakPrice}`,
        { method: 'POST' }
      );
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error updating peak price:', error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //                      PHASE 2: JITO MEV PROTECTION
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Get Jito status
   */
  async getJitoStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/jito/status`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error getting Jito status:', error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //                      PHASE 3: AI ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Analyze token with AI
   */
  async analyzeToken(tokenData) {
    try {
      const response = await fetch(`${this.baseUrl}/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_mint: tokenData.address || tokenData.tokenMint,
          name: tokenData.name || 'Unknown',
          symbol: tokenData.symbol || '???',
          description: tokenData.description,
          initial_liquidity_sol: tokenData.liquidity || 0,
          current_market_cap_sol: tokenData.marketCap || 0,
          holder_count: tokenData.holders || 0,
          top_10_holder_pct: tokenData.top10HolderPct || 0,
          twitter: tokenData.twitter,
          telegram: tokenData.telegram,
          creator_address: tokenData.creator
        })
      });

      if (response.ok) {
        return await response.json();
      }

      // Check if AI is not enabled
      if (response.status === 503) {
        return { error: 'AI analysis not enabled', enabled: false };
      }

      return null;
    } catch (error) {
      console.error('Error analyzing token:', error);
      return null;
    }
  }

  /**
   * Get AI prediction performance
   */
  async getAIPerformance() {
    try {
      const response = await fetch(`${this.baseUrl}/ai/performance`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error getting AI performance:', error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //                      PHASE 3: PERFORMANCE ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Get performance summary
   */
  async getPerformanceSummary(days = 30) {
    try {
      const response = await fetch(`${this.baseUrl}/performance/summary?days=${days}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error getting performance summary:', error);
      return null;
    }
  }

  /**
   * Get formatted performance report
   */
  async getPerformanceReport(days = 30) {
    try {
      const response = await fetch(`${this.baseUrl}/performance/report?days=${days}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error getting performance report:', error);
      return null;
    }
  }

  /**
   * Get best performing tokens
   */
  async getTokenPerformance(limit = 20) {
    try {
      const response = await fetch(`${this.baseUrl}/performance/tokens?limit=${limit}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error getting token performance:', error);
      return null;
    }
  }

  /**
   * Export performance data
   */
  async exportPerformance(days = 30) {
    try {
      const response = await fetch(`${this.baseUrl}/performance/export?days=${days}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error exporting performance:', error);
      return null;
    }
  }
}

// Export singleton instance
const fenrirBackend = new FenrirBackendService();
export default fenrirBackend;
export { FenrirBackendService };
