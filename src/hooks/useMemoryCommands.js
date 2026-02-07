/**
 * useMemoryCommands - Persistent memory and daily limit commands
 *
 * Handles commands:
 * - memory show          - Display memory statistics
 * - memory facts [cat]   - List stored facts
 * - memory remember <f>  - Store a fact
 * - memory forget <key>  - Delete a fact
 * - memory trades        - Show trade history
 * - memory export        - Export memory as JSON
 * - memory import <json> - Import memory from JSON
 * - memory clear [ns]    - Clear memory namespace
 * - limit set <amount>   - Set daily SOL trading limit
 * - limit show           - Show daily limits and usage
 */

import { useCallback } from 'react';
import memoryService from '../services/MemoryService.js';

export function useMemoryCommands({ addOutput, showToast }) {

  const handleMemoryShow = useCallback(() => {
    const stats = memoryService.getStats();
    addOutput({
      type: 'info',
      content: `
ᚠ PERSISTENT MEMORY STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Conversation Messages : ${stats.messages} / 50
  Stored Facts          : ${stats.facts} / 50
  Trade Records         : ${stats.trades} / 100
  Daily Limits Set      : ${stats.limits}
  Preferences           : ${stats.preferences}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Memory persists across page refreshes.
  Use 'memory remember <fact>' to store info.
  Use 'memory export' to backup.`,
    });
    return true;
  }, [addOutput]);

  const handleMemoryFacts = useCallback((args) => {
    const category = args.trim() || null;
    const facts = memoryService.getFacts(category);

    if (facts.length === 0) {
      addOutput({
        type: 'info',
        content: category
          ? `No facts stored in category "${category}".`
          : "No facts stored yet. Use 'memory remember <fact>' to add one.",
      });
      return true;
    }

    const grouped = {};
    facts.forEach(f => {
      if (!grouped[f.category]) grouped[f.category] = [];
      grouped[f.category].push(f);
    });

    let output = 'ᚠ STORED FACTS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    Object.entries(grouped).forEach(([cat, items]) => {
      output += `\n  [${cat.toUpperCase()}]\n`;
      items.forEach(f => {
        output += `    ${f.key}: ${f.value}\n`;
      });
    });

    addOutput({ type: 'info', content: output });
    return true;
  }, [addOutput]);

  const handleMemoryRemember = useCallback((args) => {
    const text = args.trim();
    if (!text) {
      addOutput({ type: 'error', content: "Usage: memory remember <fact>\nExample: memory remember I prefer conservative trades" });
      return true;
    }

    // Auto-generate key from first few words
    const key = text.split(' ').slice(0, 4).join('_').toLowerCase().replace(/[^a-z0-9_]/g, '');
    const added = memoryService.addFact(key, text);

    if (added) {
      addOutput({ type: 'success', content: `Remembered: "${text}"` });
      showToast?.('Fact saved to memory', 'success');
    } else {
      addOutput({ type: 'error', content: 'Memory full (50 facts max). Delete some with "memory forget <key>".' });
    }
    return true;
  }, [addOutput, showToast]);

  const handleMemoryForget = useCallback((args) => {
    const key = args.trim();
    if (!key) {
      addOutput({ type: 'error', content: "Usage: memory forget <key>" });
      return true;
    }

    // Search for matching facts
    const matches = memoryService.searchFacts(key);
    if (matches.length === 0) {
      addOutput({ type: 'error', content: `No fact found matching "${key}".` });
      return true;
    }

    matches.forEach(m => memoryService.deleteFact(m.key, m.category));
    addOutput({ type: 'success', content: `Deleted ${matches.length} fact(s) matching "${key}".` });
    return true;
  }, [addOutput]);

  const handleMemoryTrades = useCallback((args) => {
    const limit = parseInt(args.trim()) || 10;
    const trades = memoryService.getTradeHistory({ limit });

    if (trades.length === 0) {
      addOutput({ type: 'info', content: 'No trades recorded yet.' });
      return true;
    }

    let output = 'ᚠ TRADE HISTORY\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    trades.reverse().forEach(t => {
      const date = new Date(t.timestamp).toLocaleString();
      const icon = t.type === 'buy' ? '🟢' : '🔴';
      output += `  ${icon} ${date} | ${t.type?.toUpperCase()} ${t.symbol || t.token || '?'} | ${t.amount || '?'} SOL`;
      if (t.pnl !== undefined) output += ` | PnL: ${t.pnl > 0 ? '+' : ''}${t.pnl}`;
      output += '\n';
    });

    addOutput({ type: 'info', content: output });
    return true;
  }, [addOutput]);

  const handleMemoryExport = useCallback(() => {
    const data = memoryService.export();
    const json = JSON.stringify(data, null, 2);
    // Copy to clipboard
    navigator.clipboard?.writeText(json).then(() => {
      showToast?.('Memory exported to clipboard', 'success');
    }).catch(() => {});
    addOutput({ type: 'success', content: `Memory exported (${json.length} bytes). Copied to clipboard.\n\nUse 'memory import <json>' to restore.` });
    return true;
  }, [addOutput, showToast]);

  const handleMemoryImport = useCallback((args) => {
    const json = args.trim();
    if (!json) {
      addOutput({ type: 'error', content: "Usage: memory import <json>" });
      return true;
    }
    try {
      const data = JSON.parse(json);
      memoryService.import(data);
      const stats = memoryService.getStats();
      addOutput({ type: 'success', content: `Memory imported! ${stats.messages} messages, ${stats.facts} facts, ${stats.trades} trades.` });
      showToast?.('Memory imported successfully', 'success');
    } catch (e) {
      addOutput({ type: 'error', content: `Import failed: ${e.message}` });
    }
    return true;
  }, [addOutput, showToast]);

  const handleMemoryClear = useCallback((args) => {
    const ns = args.trim() || 'all';
    const valid = ['all', 'conversation', 'facts', 'trade_history', 'daily_limits', 'preferences'];
    if (!valid.includes(ns)) {
      addOutput({ type: 'error', content: `Invalid namespace. Options: ${valid.join(', ')}` });
      return true;
    }
    memoryService.clear(ns === 'all' ? null : ns);
    addOutput({ type: 'success', content: `Cleared ${ns === 'all' ? 'all memory' : ns}.` });
    showToast?.(`Memory cleared: ${ns}`, 'success');
    return true;
  }, [addOutput, showToast]);

  const handleLimitSet = useCallback((args) => {
    const amount = parseFloat(args.trim());
    if (isNaN(amount) || amount <= 0) {
      addOutput({ type: 'error', content: "Usage: limit set <amount_in_sol>\nExample: limit set 5.0" });
      return true;
    }
    memoryService.setDailyLimit('trading', amount);
    addOutput({ type: 'success', content: `Daily trading limit set to ${amount} SOL. Resets at midnight UTC.` });
    return true;
  }, [addOutput]);

  const handleLimitShow = useCallback(() => {
    const limits = memoryService.getDailyLimits();
    if (Object.keys(limits).length === 0) {
      addOutput({ type: 'info', content: "No daily limits set. Use 'limit set <amount>' to set a trading limit." });
      return true;
    }

    let output = 'ᚠ DAILY LIMITS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    Object.entries(limits).forEach(([type, data]) => {
      const pct = data.limit > 0 ? ((data.used / data.limit) * 100).toFixed(1) : 0;
      const bar = data.limit > 0
        ? '█'.repeat(Math.min(20, Math.floor(data.used / data.limit * 20))) + '░'.repeat(Math.max(0, 20 - Math.floor(data.used / data.limit * 20)))
        : '░'.repeat(20);
      output += `  ${type.toUpperCase()}\n`;
      output += `    [${bar}] ${pct}%\n`;
      output += `    Used: ${data.used.toFixed(4)} / ${data.limit} SOL\n`;
      output += `    Remaining: ${Math.max(0, data.limit - data.used).toFixed(4)} SOL\n`;
      output += `    Resets: ${data.resetDate} (midnight UTC)\n\n`;
    });

    addOutput({ type: 'info', content: output });
    return true;
  }, [addOutput]);

  const handleCommand = useCallback((command, args) => {
    switch (command) {
      case 'memory': {
        const [sub, ...rest] = (args || '').trim().split(/\s+/);
        const subArgs = rest.join(' ');
        switch (sub) {
          case 'show': case 'status': case undefined: return handleMemoryShow();
          case 'facts': return handleMemoryFacts(subArgs);
          case 'remember': return handleMemoryRemember(subArgs);
          case 'forget': return handleMemoryForget(subArgs);
          case 'trades': return handleMemoryTrades(subArgs);
          case 'export': return handleMemoryExport();
          case 'import': return handleMemoryImport(subArgs);
          case 'clear': return handleMemoryClear(subArgs);
          default:
            addOutput({ type: 'error', content: `Unknown memory subcommand: ${sub}\nOptions: show, facts, remember, forget, trades, export, import, clear` });
            return true;
        }
      }
      case 'limit': {
        const [sub, ...rest] = (args || '').trim().split(/\s+/);
        const subArgs = rest.join(' ');
        switch (sub) {
          case 'set': return handleLimitSet(subArgs);
          case 'show': case undefined: return handleLimitShow();
          default:
            addOutput({ type: 'error', content: `Unknown limit subcommand: ${sub}\nOptions: set, show` });
            return true;
        }
      }
      default:
        return false;
    }
  }, [handleMemoryShow, handleMemoryFacts, handleMemoryRemember, handleMemoryForget,
      handleMemoryTrades, handleMemoryExport, handleMemoryImport, handleMemoryClear,
      handleLimitSet, handleLimitShow, addOutput]);

  return { handleCommand };
}

export default useMemoryCommands;
