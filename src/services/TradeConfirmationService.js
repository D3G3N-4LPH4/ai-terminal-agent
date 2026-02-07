/**
 * TradeConfirmationService - Tiered trade confirmation flow
 *
 * Prevents accidental large trades by requiring confirmation.
 * Three tiers based on trade amount:
 * - auto:   < 0.1 SOL or simulation mode → executes immediately
 * - simple: < 1.0 SOL → single confirmation prompt
 * - strict: >= 1.0 SOL → detailed info card with countdown
 *
 * Inspired by OpenPrawn's pending trade confirmation pattern.
 */

import BrowserEventEmitter from '../utils/BrowserEventEmitter.js';
import { generateRandomId } from '../utils/encryption.js';
import memoryService from './MemoryService.js';

// Configurable thresholds (in SOL)
const DEFAULT_THRESHOLDS = {
  autoMax: 0.1,    // Auto-execute below this
  simpleMax: 1.0,  // Simple confirm below this, strict above
};

class TradeConfirmationService extends BrowserEventEmitter {
  constructor() {
    super();
    this.pendingTrades = new Map();
    this.thresholds = { ...DEFAULT_THRESHOLDS };
  }

  /**
   * Configure tier thresholds
   * @param {{ autoMax?: number, simpleMax?: number }} thresholds
   */
  setThresholds(thresholds) {
    Object.assign(this.thresholds, thresholds);
  }

  /**
   * Determine the confirmation tier for a trade amount
   * @param {number} amountSol - Trade amount in SOL
   * @param {boolean} isSimulation - Whether in simulation mode
   * @returns {'auto' | 'simple' | 'strict'}
   */
  getTier(amountSol, isSimulation = false) {
    if (isSimulation) return 'auto';
    if (amountSol < this.thresholds.autoMax) return 'auto';
    if (amountSol < this.thresholds.simpleMax) return 'simple';
    return 'strict';
  }

  /**
   * Request confirmation for a trade
   * @param {Object} tradeData - { type, symbol, mint, amount, price, slippage, executeFn }
   * @param {boolean} isSimulation - Whether in simulation mode
   * @returns {{ id: string, tier: string, trade: Object }}
   */
  requestConfirmation(tradeData, isSimulation = false) {
    const tier = this.getTier(tradeData.amount, isSimulation);
    const id = generateRandomId(6);

    const pending = {
      id,
      tier,
      trade: { ...tradeData },
      status: tier === 'auto' ? 'auto_executed' : 'pending',
      createdAt: Date.now(),
      strictCountdown: tier === 'strict' ? 5 : 0,
    };

    // Check daily limit
    const limitCheck = memoryService.checkDailyLimit('trading', tradeData.amount);
    if (!limitCheck.allowed) {
      pending.status = 'blocked_by_limit';
      this.emit('trade_blocked', {
        id,
        reason: `Daily limit exceeded. Used: ${limitCheck.used.toFixed(4)} / ${limitCheck.limit} SOL. Remaining: ${limitCheck.remaining.toFixed(4)} SOL`,
      });
      return pending;
    }

    if (tier === 'auto') {
      // Auto-execute
      this.emit('trade_auto_executed', pending);
      return pending;
    }

    // Store pending trade
    this.pendingTrades.set(id, pending);
    this.emit('trade_pending', pending);
    return pending;
  }

  /**
   * Confirm and execute a pending trade
   * @param {string} id - Trade ID
   * @returns {Object|null} The confirmed trade, or null if not found
   */
  confirmTrade(id) {
    const pending = this.pendingTrades.get(id);
    if (!pending) return null;
    if (pending.status !== 'pending') return null;

    // Strict tier: check countdown
    if (pending.tier === 'strict') {
      const elapsed = (Date.now() - pending.createdAt) / 1000;
      if (elapsed < pending.strictCountdown) {
        const remaining = Math.ceil(pending.strictCountdown - elapsed);
        this.emit('trade_countdown', { id, remaining });
        return null;
      }
    }

    pending.status = 'confirmed';
    this.pendingTrades.delete(id);

    // Record spend in memory
    memoryService.recordSpend('trading', pending.trade.amount);

    this.emit('trade_confirmed', pending);
    return pending;
  }

  /**
   * Cancel a pending trade
   * @param {string} id - Trade ID
   * @returns {boolean}
   */
  cancelTrade(id) {
    const pending = this.pendingTrades.get(id);
    if (!pending) return false;
    pending.status = 'cancelled';
    this.pendingTrades.delete(id);
    this.emit('trade_cancelled', pending);
    return true;
  }

  /**
   * Get all pending trades
   * @returns {Array}
   */
  getPending() {
    return Array.from(this.pendingTrades.values());
  }

  /**
   * Format a pending trade for terminal display
   * @param {Object} pending
   * @returns {string}
   */
  formatPendingTrade(pending) {
    const { id, tier, trade, createdAt, strictCountdown } = pending;
    const tierIcon = { auto: '🟢', simple: '🟡', strict: '🔴' };
    const elapsed = Math.floor((Date.now() - createdAt) / 1000);

    let output = `\n${tierIcon[tier]} TRADE CONFIRMATION [${tier.toUpperCase()}]  ID: ${id}\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    output += `  Type     : ${trade.type?.toUpperCase() || 'BUY'}\n`;
    output += `  Token    : ${trade.symbol || trade.mint || '?'}\n`;
    output += `  Amount   : ${trade.amount} SOL\n`;
    if (trade.price) output += `  Price    : $${trade.price}\n`;
    if (trade.slippage) output += `  Slippage : ${trade.slippage}%\n`;

    if (tier === 'strict') {
      const remaining = Math.max(0, strictCountdown - elapsed);
      if (remaining > 0) {
        output += `\n  ⏳ Countdown: ${remaining}s remaining\n`;
        output += `     Wait before confirming (safety delay)\n`;
      } else {
        output += `\n  ✅ Ready to confirm\n`;
      }
    }

    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    output += `  ▸ trade confirm ${id}   - Execute trade\n`;
    output += `  ▸ trade cancel ${id}    - Cancel trade\n`;

    return output;
  }

  /**
   * Expire old pending trades (> 5 minutes)
   */
  expireOld() {
    const fiveMin = 5 * 60 * 1000;
    const now = Date.now();
    for (const [id, pending] of this.pendingTrades) {
      if (now - pending.createdAt > fiveMin) {
        pending.status = 'expired';
        this.pendingTrades.delete(id);
        this.emit('trade_expired', pending);
      }
    }
  }
}

// Singleton
const tradeConfirmationService = new TradeConfirmationService();
export { TradeConfirmationService };
export default tradeConfirmationService;
