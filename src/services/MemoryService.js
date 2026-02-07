/**
 * MemoryService - Persistent memory across sessions
 *
 * Stores conversation history, user facts, trade history, and daily limits
 * in localStorage with encryption for sensitive data.
 *
 * Inspired by OpenPrawn's per-user memory system.
 */

import BrowserEventEmitter from '../utils/BrowserEventEmitter.js';
import { generateRandomId } from '../utils/encryption.js';

const STORAGE_PREFIX = 'memory:';
const MAX_CONVERSATION = 50;
const MAX_FACTS = 50;
const MAX_TRADES = 100;

class MemoryService extends BrowserEventEmitter {
  constructor() {
    super();
    this.conversation = [];
    this.facts = {};
    this.tradeHistory = [];
    this.dailyLimits = {};
    this.preferences = {};
    this.loaded = false;
  }

  /**
   * Initialize - load all persisted data from localStorage
   */
  init() {
    if (this.loaded) return;
    this.conversation = this._load('conversation') || [];
    this.facts = this._load('facts') || {};
    this.tradeHistory = this._load('trade_history') || [];
    this.dailyLimits = this._load('daily_limits') || {};
    this.preferences = this._load('preferences') || {};
    this._checkDailyReset();
    this.loaded = true;
    this.emit('loaded');
  }

  // ── Conversation ──────────────────────────────────────────────

  /**
   * Add a message to conversation history
   * @param {string} role - 'user' | 'assistant' | 'system'
   * @param {string} content - Message content
   * @param {string} [model] - AI model used (for assistant messages)
   */
  addMessage(role, content, model = null) {
    this.conversation.push({
      role,
      content,
      model,
      timestamp: Date.now(),
    });
    // Trim to max
    if (this.conversation.length > MAX_CONVERSATION) {
      this.conversation = this.conversation.slice(-MAX_CONVERSATION);
    }
    this._save('conversation', this.conversation);
    this.emit('message_added', { role, content });
  }

  /**
   * Get recent conversation context for AI prompts
   * @param {number} [maxMessages=20] - Max messages to return
   * @returns {Array<{role: string, content: string}>}
   */
  getContext(maxMessages = 20) {
    return this.conversation.slice(-maxMessages).map(m => ({
      role: m.role,
      content: m.content,
    }));
  }

  /**
   * Clear conversation history
   */
  clearConversation() {
    this.conversation = [];
    this._save('conversation', this.conversation);
    this.emit('conversation_cleared');
  }

  // ── Facts ─────────────────────────────────────────────────────

  /**
   * Store a user fact
   * @param {string} key - Fact key/identifier
   * @param {string} value - Fact value
   * @param {string} [category='general'] - Category for organization
   */
  addFact(key, value, category = 'general') {
    if (!this.facts[category]) this.facts[category] = {};

    // Enforce max facts limit
    const totalFacts = Object.values(this.facts)
      .reduce((sum, cat) => sum + Object.keys(cat).length, 0);
    if (totalFacts >= MAX_FACTS && !this.facts[category]?.[key]) {
      return false; // At capacity
    }

    this.facts[category][key] = {
      value,
      timestamp: Date.now(),
    };
    this._save('facts', this.facts);
    this.emit('fact_added', { key, value, category });
    return true;
  }

  /**
   * Search facts by query string
   * @param {string} query - Search term
   * @returns {Array<{key: string, value: string, category: string}>}
   */
  searchFacts(query) {
    const results = [];
    const q = query.toLowerCase();
    Object.entries(this.facts).forEach(([category, entries]) => {
      Object.entries(entries).forEach(([key, data]) => {
        if (key.toLowerCase().includes(q) || data.value.toLowerCase().includes(q)) {
          results.push({ key, value: data.value, category });
        }
      });
    });
    return results;
  }

  /**
   * Get all facts, optionally filtered by category
   * @param {string} [category] - Filter by category
   * @returns {Array<{key: string, value: string, category: string}>}
   */
  getFacts(category) {
    const results = [];
    const cats = category ? { [category]: this.facts[category] || {} } : this.facts;
    Object.entries(cats).forEach(([cat, entries]) => {
      Object.entries(entries).forEach(([key, data]) => {
        results.push({ key, value: data.value, category: cat });
      });
    });
    return results;
  }

  /**
   * Build a facts summary string for AI context injection
   * @returns {string}
   */
  getFactsSummary() {
    const allFacts = this.getFacts();
    if (allFacts.length === 0) return '';
    const lines = allFacts.map(f => `- ${f.key}: ${f.value}`);
    return `User facts:\n${lines.join('\n')}`;
  }

  /**
   * Delete a fact
   * @param {string} key - Fact key
   * @param {string} [category='general'] - Category
   */
  deleteFact(key, category = 'general') {
    if (this.facts[category]) {
      delete this.facts[category][key];
      if (Object.keys(this.facts[category]).length === 0) {
        delete this.facts[category];
      }
      this._save('facts', this.facts);
      this.emit('fact_deleted', { key, category });
    }
  }

  // ── Trade History ─────────────────────────────────────────────

  /**
   * Record a trade
   * @param {Object} trade - Trade data
   */
  saveTrade(trade) {
    this.tradeHistory.push({
      id: generateRandomId(8),
      timestamp: Date.now(),
      ...trade,
    });
    // Trim to max
    if (this.tradeHistory.length > MAX_TRADES) {
      this.tradeHistory = this.tradeHistory.slice(-MAX_TRADES);
    }
    this._save('trade_history', this.tradeHistory);
    this.emit('trade_saved', trade);
  }

  /**
   * Get trade history with optional filters
   * @param {Object} [filters] - { type, symbol, limit }
   * @returns {Array}
   */
  getTradeHistory(filters = {}) {
    let trades = [...this.tradeHistory];
    if (filters.type) {
      trades = trades.filter(t => t.type === filters.type);
    }
    if (filters.symbol) {
      const sym = filters.symbol.toUpperCase();
      trades = trades.filter(t => t.symbol?.toUpperCase() === sym);
    }
    if (filters.limit) {
      trades = trades.slice(-filters.limit);
    }
    return trades;
  }

  // ── Daily Limits ──────────────────────────────────────────────

  /**
   * Set a daily spending limit
   * @param {string} type - Limit type ('trading', 'ai_requests')
   * @param {number} amount - Max amount per day
   */
  setDailyLimit(type, amount) {
    const today = this._getUTCDate();
    if (!this.dailyLimits[type]) {
      this.dailyLimits[type] = { limit: amount, used: 0, resetDate: today };
    } else {
      this.dailyLimits[type].limit = amount;
    }
    this._save('daily_limits', this.dailyLimits);
    this.emit('limit_set', { type, amount });
  }

  /**
   * Check if a spending amount is within the daily limit
   * @param {string} type - Limit type
   * @param {number} amount - Amount to check
   * @returns {{ allowed: boolean, remaining: number, limit: number, used: number }}
   */
  checkDailyLimit(type, amount) {
    this._checkDailyReset();
    const entry = this.dailyLimits[type];
    if (!entry || !entry.limit) {
      return { allowed: true, remaining: Infinity, limit: 0, used: 0 };
    }
    const remaining = Math.max(0, entry.limit - entry.used);
    return {
      allowed: amount <= remaining,
      remaining,
      limit: entry.limit,
      used: entry.used,
    };
  }

  /**
   * Record spending against a daily limit
   * @param {string} type - Limit type
   * @param {number} amount - Amount spent
   */
  recordSpend(type, amount) {
    this._checkDailyReset();
    if (!this.dailyLimits[type]) {
      this.dailyLimits[type] = { limit: 0, used: 0, resetDate: this._getUTCDate() };
    }
    this.dailyLimits[type].used += amount;
    this._save('daily_limits', this.dailyLimits);
    this.emit('spend_recorded', { type, amount });
  }

  /**
   * Get all daily limits
   * @returns {Object}
   */
  getDailyLimits() {
    this._checkDailyReset();
    return { ...this.dailyLimits };
  }

  // ── Preferences ───────────────────────────────────────────────

  /**
   * Set a preference
   * @param {string} key
   * @param {*} value
   */
  setPreference(key, value) {
    this.preferences[key] = value;
    this._save('preferences', this.preferences);
  }

  /**
   * Get a preference
   * @param {string} key
   * @param {*} [defaultValue]
   * @returns {*}
   */
  getPreference(key, defaultValue = null) {
    return this.preferences[key] ?? defaultValue;
  }

  // ── Export / Import ───────────────────────────────────────────

  /**
   * Export all memory as JSON
   * @returns {Object}
   */
  export() {
    return {
      version: 1,
      exportedAt: Date.now(),
      conversation: this.conversation,
      facts: this.facts,
      tradeHistory: this.tradeHistory,
      dailyLimits: this.dailyLimits,
      preferences: this.preferences,
    };
  }

  /**
   * Import memory from JSON
   * @param {Object} data - Exported data
   */
  import(data) {
    if (!data || data.version !== 1) {
      throw new Error('Invalid memory export format');
    }
    if (data.conversation) {
      this.conversation = data.conversation.slice(-MAX_CONVERSATION);
      this._save('conversation', this.conversation);
    }
    if (data.facts) {
      this.facts = data.facts;
      this._save('facts', this.facts);
    }
    if (data.tradeHistory) {
      this.tradeHistory = data.tradeHistory.slice(-MAX_TRADES);
      this._save('trade_history', this.tradeHistory);
    }
    if (data.dailyLimits) {
      this.dailyLimits = data.dailyLimits;
      this._save('daily_limits', this.dailyLimits);
    }
    if (data.preferences) {
      this.preferences = data.preferences;
      this._save('preferences', this.preferences);
    }
    this.emit('imported');
  }

  /**
   * Clear a specific namespace or all
   * @param {string} [namespace] - 'conversation', 'facts', 'trade_history', 'daily_limits', 'preferences'
   */
  clear(namespace) {
    if (!namespace || namespace === 'all') {
      this.conversation = [];
      this.facts = {};
      this.tradeHistory = [];
      this.dailyLimits = {};
      this.preferences = {};
      ['conversation', 'facts', 'trade_history', 'daily_limits', 'preferences']
        .forEach(ns => this._remove(ns));
    } else {
      switch (namespace) {
        case 'conversation': this.conversation = []; break;
        case 'facts': this.facts = {}; break;
        case 'trade_history': this.tradeHistory = []; break;
        case 'daily_limits': this.dailyLimits = {}; break;
        case 'preferences': this.preferences = {}; break;
      }
      this._save(namespace, this[this._nsToField(namespace)]);
    }
    this.emit('cleared', namespace);
  }

  /**
   * Get stats summary
   * @returns {Object}
   */
  getStats() {
    return {
      messages: this.conversation.length,
      facts: Object.values(this.facts).reduce((s, c) => s + Object.keys(c).length, 0),
      trades: this.tradeHistory.length,
      limits: Object.keys(this.dailyLimits).length,
      preferences: Object.keys(this.preferences).length,
    };
  }

  // ── Internal ──────────────────────────────────────────────────

  _nsToField(ns) {
    const map = {
      conversation: 'conversation',
      facts: 'facts',
      trade_history: 'tradeHistory',
      daily_limits: 'dailyLimits',
      preferences: 'preferences',
    };
    return map[ns] || ns;
  }

  _getUTCDate() {
    return new Date().toISOString().split('T')[0];
  }

  _checkDailyReset() {
    const today = this._getUTCDate();
    let changed = false;
    Object.keys(this.dailyLimits).forEach(type => {
      if (this.dailyLimits[type].resetDate !== today) {
        this.dailyLimits[type].used = 0;
        this.dailyLimits[type].resetDate = today;
        changed = true;
      }
    });
    if (changed) {
      this._save('daily_limits', this.dailyLimits);
    }
  }

  _save(key, data) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
    } catch (e) {
      console.error('[MemoryService] Save error:', e.message);
    }
  }

  _load(key) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('[MemoryService] Load error:', e.message);
      return null;
    }
  }

  _remove(key) {
    localStorage.removeItem(STORAGE_PREFIX + key);
  }
}

// Singleton
const memoryService = new MemoryService();
export { MemoryService };
export default memoryService;
