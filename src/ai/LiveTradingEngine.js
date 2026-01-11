/**
 * Live Trading Engine
 *
 * Integrates with pump.fun and bonk.fun to:
 * - Scan for new token launches in real-time
 * - Analyze token opportunities
 * - Execute real trades with Solana wallet
 * - Monitor positions and auto-exit
 * - Connect with Autonomous AI for decision making
 */

import { FenrirTradingAPI } from '../api/FenrirTradingAPI.js';

export class LiveTradingEngine {
  constructor(config = {}) {
    this.tradingAPI = new FenrirTradingAPI(config.apiUrl);

    // Configuration
    this.walletPublicKey = config.walletPublicKey;
    this.walletPrivateKey = config.walletPrivateKey;
    this.mode = config.mode || 'simulation'; // simulation or live

    // Scanning configuration
    this.scanInterval = config.scanInterval || 5000; // 5 seconds
    this.platforms = config.platforms || ['pump.fun', 'bonk.fun'];

    // Trading parameters
    this.maxPositions = config.maxPositions || 3;
    this.buyAmount = config.buyAmount || 0.1; // SOL
    this.stopLoss = config.stopLoss || 0.25; // 25%
    this.takeProfit = config.takeProfit || 1.0; // 100%
    this.trailingStop = config.trailingStop || 0.15; // 15%

    // Filters for token selection
    this.filters = {
      minLiquidity: config.minLiquidity || 5.0, // SOL
      maxMarketCap: config.maxMarketCap || 100.0, // SOL
      minVolume24h: config.minVolume24h || 1.0, // SOL
      maxTokenAge: config.maxTokenAge || 300, // seconds
      requireVerified: config.requireVerified || false,
      minHolders: config.minHolders || 10
    };

    // State
    this.isRunning = false;
    this.scannedTokens = new Map(); // tokenAddress -> tokenData
    this.activePositions = new Map(); // tokenAddress -> position
    this.watchlist = new Set();
    this.blacklist = new Set();

    // Statistics
    this.stats = {
      tokensScanned: 0,
      tradesExecuted: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalProfit: 0,
      totalLoss: 0,
      lastScanTime: null,
      uptime: 0
    };

    // Callbacks for events
    this.onTokenDiscovered = config.onTokenDiscovered || (() => {});
    this.onTradeExecuted = config.onTradeExecuted || (() => {});
    this.onPositionClosed = config.onPositionClosed || (() => {});
    this.onError = config.onError || ((error) => console.error(error));
  }

  /**
   * Start live trading engine
   */
  async start() {
    if (this.isRunning) {
      throw new Error('Trading engine already running');
    }

    console.log(`🚀 Live Trading Engine Starting...`);
    console.log(`📊 Mode: ${this.mode}`);
    console.log(`💼 Wallet: ${this.walletPublicKey?.substring(0, 8)}...`);
    console.log(`🔍 Platforms: ${this.platforms.join(', ')}`);
    console.log(`💰 Buy Amount: ${this.buyAmount} SOL`);
    console.log(`🛡️ Stop Loss: ${this.stopLoss * 100}%`);
    console.log(`🎯 Take Profit: ${this.takeProfit * 100}%`);

    if (this.mode === 'live' && !this.walletPrivateKey) {
      throw new Error('Private key required for live trading');
    }

    this.isRunning = true;
    this.startTime = Date.now();

    // Start scanning loop
    this.scanLoop();

    // Start position monitoring loop
    this.monitorLoop();

    return {
      status: 'started',
      mode: this.mode,
      platforms: this.platforms
    };
  }

  /**
   * Stop trading engine
   */
  async stop() {
    console.log('🛑 Stopping trading engine...');
    this.isRunning = false;

    // Close all positions if in live mode
    if (this.mode === 'live') {
      await this.closeAllPositions('Engine stopped');
    }

    return {
      status: 'stopped',
      stats: this.stats
    };
  }

  /**
   * Main scanning loop - monitors pump.fun and bonk.fun
   */
  async scanLoop() {
    while (this.isRunning) {
      try {
        const startTime = Date.now();

        for (const platform of this.platforms) {
          await this.scanPlatform(platform);
        }

        this.stats.lastScanTime = Date.now();
        this.stats.uptime = Date.now() - this.startTime;

        // Wait for next scan
        const elapsed = Date.now() - startTime;
        const waitTime = Math.max(0, this.scanInterval - elapsed);
        await this.sleep(waitTime);

      } catch (error) {
        console.error('Scan loop error:', error);
        this.onError(error);
        await this.sleep(10000); // Wait 10s on error
      }
    }
  }

  /**
   * Scan specific platform for new tokens
   */
  async scanPlatform(platform) {
    console.log(`🔍 Scanning ${platform}...`);

    try {
      let tokens = [];

      if (platform === 'pump.fun') {
        tokens = await this.scanPumpFun();
      } else if (platform === 'bonk.fun') {
        tokens = await this.scanBonkFun();
      }

      // Process discovered tokens
      for (const token of tokens) {
        await this.processToken(token, platform);
      }

      console.log(`✓ ${platform}: Found ${tokens.length} tokens`);

    } catch (error) {
      console.error(`Error scanning ${platform}:`, error);
      this.onError({ platform, error });
    }
  }

  /**
   * Scan pump.fun for new token launches
   */
  async scanPumpFun() {
    try {
      // Method 1: Scrape pump.fun website
      const response = await fetch('http://localhost:3001/api/python-scraper/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://pump.fun',
          format: 'structured'
        })
      });

      if (!response.ok) {
        throw new Error(`Scraping failed: ${response.statusText}`);
      }

      const data = await response.json();
      const tokens = this.parsePumpFunData(data);

      // Method 2: Also check Solana blockchain directly for pump.fun program
      const blockchainTokens = await this.scanSolanaProgram('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');

      // Combine both sources
      return [...tokens, ...blockchainTokens];

    } catch (error) {
      console.error('pump.fun scan error:', error);
      return [];
    }
  }

  /**
   * Scan bonk.fun for new token launches
   */
  async scanBonkFun() {
    try {
      const response = await fetch('http://localhost:3001/api/python-scraper/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://bonk.fun',
          format: 'structured'
        })
      });

      if (!response.ok) {
        throw new Error(`Scraping failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseBonkFunData(data);

    } catch (error) {
      console.error('bonk.fun scan error:', error);
      return [];
    }
  }

  /**
   * Scan Solana blockchain for program transactions
   */
  async scanSolanaProgram(programId) {
    try {
      // This would use @solana/web3.js to monitor program
      // For now, return empty array (implement in Python backend)
      const response = await fetch(`http://localhost:8000/scan/program/${programId}`);

      if (response.ok) {
        const data = await response.json();
        return data.tokens || [];
      }

      return [];
    } catch (error) {
      console.error('Solana program scan error:', error);
      return [];
    }
  }

  /**
   * Parse pump.fun scraped data
   */
  parsePumpFunData(data) {
    const tokens = [];

    try {
      // Extract token data from scraped HTML/JSON
      // This depends on pump.fun's structure
      const content = data.content || data.text || '';

      // Look for token addresses (Solana addresses are base58, ~44 chars)
      const addressRegex = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
      const addresses = content.match(addressRegex) || [];

      // For each potential token address, create entry
      for (const address of addresses) {
        if (!this.scannedTokens.has(address) && !this.blacklist.has(address)) {
          tokens.push({
            address,
            platform: 'pump.fun',
            discovered: Date.now(),
            name: null, // Will fetch later
            symbol: null,
            liquidity: null,
            marketCap: null,
            holders: null,
            volume24h: null
          });
        }
      }

    } catch (error) {
      console.error('Error parsing pump.fun data:', error);
    }

    return tokens;
  }

  /**
   * Parse bonk.fun scraped data
   */
  parseBonkFunData(data) {
    const tokens = [];

    try {
      const content = data.content || data.text || '';
      const addressRegex = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
      const addresses = content.match(addressRegex) || [];

      for (const address of addresses) {
        if (!this.scannedTokens.has(address) && !this.blacklist.has(address)) {
          tokens.push({
            address,
            platform: 'bonk.fun',
            discovered: Date.now(),
            name: null,
            symbol: null,
            liquidity: null,
            marketCap: null,
            holders: null,
            volume24h: null
          });
        }
      }

    } catch (error) {
      console.error('Error parsing bonk.fun data:', error);
    }

    return tokens;
  }

  /**
   * Process discovered token
   */
  async processToken(token, platform) {
    this.stats.tokensScanned++;

    // Skip if already processed
    if (this.scannedTokens.has(token.address)) {
      return;
    }

    // Mark as scanned
    this.scannedTokens.set(token.address, token);

    console.log(`🆕 New token discovered: ${token.address.substring(0, 8)}... on ${platform}`);

    // Fetch detailed token data
    const enrichedToken = await this.fetchTokenData(token);

    // Apply filters
    if (!this.passesFilters(enrichedToken)) {
      console.log(`❌ Token ${token.address.substring(0, 8)}... filtered out`);
      return;
    }

    // Notify discovery
    this.onTokenDiscovered(enrichedToken);

    // Add to watchlist
    this.watchlist.add(token.address);

    // Analyze and potentially trade
    await this.analyzeAndTrade(enrichedToken);
  }

  /**
   * Fetch detailed token data from blockchain
   */
  async fetchTokenData(token) {
    try {
      // Call Python backend to get token details
      const response = await fetch(`http://localhost:8000/token/${token.address}`);

      if (response.ok) {
        const data = await response.json();
        return {
          ...token,
          name: data.name,
          symbol: data.symbol,
          liquidity: data.liquidity,
          marketCap: data.market_cap,
          holders: data.holders,
          volume24h: data.volume_24h,
          price: data.price,
          priceChange24h: data.price_change_24h,
          isVerified: data.is_verified || false
        };
      }

      return token;
    } catch (error) {
      console.error('Error fetching token data:', error);
      return token;
    }
  }

  /**
   * Check if token passes filters
   */
  passesFilters(token) {
    // Age check
    const age = (Date.now() - token.discovered) / 1000;
    if (age > this.filters.maxTokenAge) {
      return false;
    }

    // Liquidity check
    if (token.liquidity && token.liquidity < this.filters.minLiquidity) {
      return false;
    }

    // Market cap check
    if (token.marketCap && token.marketCap > this.filters.maxMarketCap) {
      return false;
    }

    // Volume check
    if (token.volume24h && token.volume24h < this.filters.minVolume24h) {
      return false;
    }

    // Holder check
    if (token.holders && token.holders < this.filters.minHolders) {
      return false;
    }

    // Verified check
    if (this.filters.requireVerified && !token.isVerified) {
      return false;
    }

    return true;
  }

  /**
   * Analyze token and execute trade if criteria met
   */
  async analyzeAndTrade(token) {
    // Check if we have room for more positions
    if (this.activePositions.size >= this.maxPositions) {
      console.log(`⚠️ Max positions (${this.maxPositions}) reached, skipping trade`);
      return;
    }

    // Calculate risk score (0-1, higher is riskier)
    const riskScore = this.calculateRiskScore(token);

    console.log(`📊 Token Analysis: ${token.symbol || token.address.substring(0, 8)}`);
    console.log(`   Risk Score: ${(riskScore * 100).toFixed(1)}%`);
    console.log(`   Liquidity: ${token.liquidity?.toFixed(2)} SOL`);
    console.log(`   Market Cap: ${token.marketCap?.toFixed(2)} SOL`);
    console.log(`   Holders: ${token.holders}`);

    // Decision threshold - only trade if risk is acceptable
    const riskThreshold = 0.6; // 60%

    if (riskScore < riskThreshold) {
      console.log(`✅ Risk acceptable, executing trade...`);
      await this.executeBuy(token);
    } else {
      console.log(`❌ Risk too high (${(riskScore * 100).toFixed(1)}% > ${riskThreshold * 100}%), skipping`);
    }
  }

  /**
   * Calculate risk score for token (0-1, higher = riskier)
   */
  calculateRiskScore(token) {
    let risk = 0;
    let factors = 0;

    // Low liquidity = high risk
    if (token.liquidity) {
      risk += Math.max(0, 1 - token.liquidity / 10); // normalize to 10 SOL
      factors++;
    }

    // High market cap = lower risk (for early tokens)
    if (token.marketCap) {
      risk += Math.min(1, token.marketCap / 200); // normalize to 200 SOL
      factors++;
    }

    // Few holders = high risk
    if (token.holders) {
      risk += Math.max(0, 1 - token.holders / 100); // normalize to 100 holders
      factors++;
    }

    // Low volume = high risk
    if (token.volume24h) {
      risk += Math.max(0, 1 - token.volume24h / 5); // normalize to 5 SOL
      factors++;
    }

    // Not verified = higher risk
    if (!token.isVerified) {
      risk += 0.3;
      factors++;
    }

    return factors > 0 ? risk / factors : 0.5; // default to medium risk
  }

  /**
   * Execute buy trade
   */
  async executeBuy(token) {
    try {
      console.log(`💰 Buying ${this.buyAmount} SOL of ${token.symbol || token.address.substring(0, 8)}...`);

      const trade = {
        type: 'buy',
        tokenAddress: token.address,
        amount: this.buyAmount,
        wallet: this.walletPublicKey
      };

      let result;

      if (this.mode === 'live') {
        // Execute real trade via Fenrir backend
        result = await this.tradingAPI.executeTrade({
          action: 'buy',
          token_address: token.address,
          amount: this.buyAmount
        });
      } else {
        // Simulation mode
        result = {
          success: true,
          signature: 'simulation_' + Date.now(),
          price: token.price || 0.001,
          amount: this.buyAmount / (token.price || 0.001)
        };
      }

      if (result.success || result.status === 'success') {
        // Record position
        const position = {
          tokenAddress: token.address,
          token: token,
          entryPrice: result.price || token.price,
          entryTime: Date.now(),
          amount: this.buyAmount,
          tokensOwned: result.amount || (this.buyAmount / (token.price || 0.001)),
          signature: result.signature,
          stopLoss: (result.price || token.price) * (1 - this.stopLoss),
          takeProfit: (result.price || token.price) * (1 + this.takeProfit),
          trailingStopPrice: null,
          highestPrice: result.price || token.price
        };

        this.activePositions.set(token.address, position);
        this.stats.tradesExecuted++;

        console.log(`✅ Trade executed! Signature: ${result.signature}`);
        this.onTradeExecuted({ trade, result, position });

      } else {
        console.error(`❌ Trade failed:`, result.error || result);
        this.stats.failedTrades++;
        this.blacklist.add(token.address);
      }

    } catch (error) {
      console.error('Buy execution error:', error);
      this.stats.failedTrades++;
      this.onError({ action: 'buy', token, error });
    }
  }

  /**
   * Monitor positions and auto-exit based on conditions
   */
  async monitorLoop() {
    while (this.isRunning) {
      try {
        for (const [address, position] of this.activePositions) {
          await this.checkPositionExit(position);
        }

        await this.sleep(2000); // Check every 2 seconds

      } catch (error) {
        console.error('Monitor loop error:', error);
        await this.sleep(5000);
      }
    }
  }

  /**
   * Check if position should be exited
   */
  async checkPositionExit(position) {
    try {
      // Fetch current price
      const currentPrice = await this.getCurrentPrice(position.tokenAddress);

      if (!currentPrice) {
        return;
      }

      // Update highest price for trailing stop
      if (currentPrice > position.highestPrice) {
        position.highestPrice = currentPrice;
        position.trailingStopPrice = currentPrice * (1 - this.trailingStop);
      }

      const pnlPct = (currentPrice - position.entryPrice) / position.entryPrice;
      const holdTime = (Date.now() - position.entryTime) / 1000 / 60; // minutes

      // Check exit conditions
      let exitReason = null;

      // Stop loss
      if (currentPrice <= position.stopLoss) {
        exitReason = `Stop loss hit (${(pnlPct * 100).toFixed(1)}%)`;
      }

      // Take profit
      else if (currentPrice >= position.takeProfit) {
        exitReason = `Take profit hit (+${(pnlPct * 100).toFixed(1)}%)`;
      }

      // Trailing stop
      else if (position.trailingStopPrice && currentPrice <= position.trailingStopPrice) {
        exitReason = `Trailing stop hit (+${(pnlPct * 100).toFixed(1)}%)`;
      }

      // Max hold time (1 hour default)
      else if (holdTime > 60) {
        exitReason = `Max hold time (${holdTime.toFixed(0)} min)`;
      }

      if (exitReason) {
        await this.executeSell(position, exitReason, currentPrice);
      }

    } catch (error) {
      console.error('Position check error:', error);
    }
  }

  /**
   * Get current price for token
   */
  async getCurrentPrice(tokenAddress) {
    try {
      const response = await fetch(`http://localhost:8000/token/${tokenAddress}/price`);

      if (response.ok) {
        const data = await response.json();
        return data.price;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Execute sell trade
   */
  async executeSell(position, reason, currentPrice) {
    try {
      console.log(`💸 Selling ${position.token.symbol || position.tokenAddress.substring(0, 8)}...`);
      console.log(`   Reason: ${reason}`);

      const trade = {
        type: 'sell',
        tokenAddress: position.tokenAddress,
        amount: position.tokensOwned,
        wallet: this.walletPublicKey
      };

      let result;

      if (this.mode === 'live') {
        result = await this.tradingAPI.executeTrade({
          action: 'sell',
          token_address: position.tokenAddress,
          amount: position.tokensOwned
        });
      } else {
        result = {
          success: true,
          signature: 'simulation_sell_' + Date.now(),
          price: currentPrice,
          proceeds: position.tokensOwned * currentPrice
        };
      }

      if (result.success || result.status === 'success') {
        const pnl = (result.proceeds || (position.tokensOwned * currentPrice)) - position.amount;
        const pnlPct = pnl / position.amount;

        console.log(`✅ Position closed: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(4)} SOL (${(pnlPct * 100).toFixed(1)}%)`);

        if (pnl > 0) {
          this.stats.successfulTrades++;
          this.stats.totalProfit += pnl;
        } else {
          this.stats.totalLoss += Math.abs(pnl);
        }

        this.onPositionClosed({ position, reason, pnl, pnlPct, result });
        this.activePositions.delete(position.tokenAddress);
        this.watchlist.delete(position.tokenAddress);

      } else {
        console.error(`❌ Sell failed:`, result.error || result);
      }

    } catch (error) {
      console.error('Sell execution error:', error);
      this.onError({ action: 'sell', position, error });
    }
  }

  /**
   * Close all active positions
   */
  async closeAllPositions(reason) {
    console.log(`Closing all ${this.activePositions.size} positions...`);

    for (const [address, position] of this.activePositions) {
      const currentPrice = await this.getCurrentPrice(address) || position.entryPrice;
      await this.executeSell(position, reason, currentPrice);
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      mode: this.mode,
      platforms: this.platforms,
      activePositions: this.activePositions.size,
      watchlistSize: this.watchlist.size,
      stats: {
        ...this.stats,
        winRate: this.stats.tradesExecuted > 0
          ? this.stats.successfulTrades / this.stats.tradesExecuted
          : 0,
        netPnl: this.stats.totalProfit - this.stats.totalLoss
      },
      positions: Array.from(this.activePositions.values()).map(p => ({
        token: p.token.symbol || p.tokenAddress.substring(0, 8),
        entryPrice: p.entryPrice,
        holdTime: ((Date.now() - p.entryTime) / 1000 / 60).toFixed(1) + ' min'
      }))
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default LiveTradingEngine;
