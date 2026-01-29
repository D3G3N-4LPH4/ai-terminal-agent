/**
 * useSystemCommands - System and utility command handlers
 *
 * Handles commands:
 * - help - Show all commands
 * - welcome / start / onboarding - Getting started guide
 * - ? / quickhelp [category] - Quick help by category
 * - apikeys - Open API key configuration
 * - status - Check API status
 * - theme - Change appearance
 * - clear - Clear terminal
 * - models - List AI models
 * - model [name] - Switch AI model
 */

import { useCallback } from 'react';

/**
 * Hook for system-related commands
 * @param {Object} options - Command context
 * @returns {Object} Command handlers
 */
export function useSystemCommands({
  addOutput,
  showToast,
  setShowAPIKeyModal,
  setOutput,
  API_CONFIG,
  currentAIModel,
  setCurrentAIModel,
}) {
  const handleHelp = useCallback(() => {
    addOutput({
      type: 'help',
      content: `
ᚠ Ʉ₦₭₦Ø₩₦ ₵𝟬Đ𝟯 ─ FENRIR'S GRIMOIRE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ᚠ MARKET ORACLE (CoinMarketCap - Pro)
  price [symbol]               - Divine real-time prices
  market [symbol]              - Delve into market depths
  global                       - Survey all nine realms
  trending                     - Track hottest coins
  movers                       - See top gainers/losers
  categories                   - Top coins by market cap
  fear                         - Fear & Greed Index

ᛉ WEB RESEARCH
  websearch-ai [query]         - AI-powered web search with citations
  research [topic]             - Deep AI research with citations
  docs [query] [server]        - Search technical documentation
  google [query]               - Google Search results
  scrape [url]                 - Extract and analyze any website

ᚦ COINMARKETCAP VAULT (Premium Data)
  cmc price [symbol]           - Detailed market intel
  cmc top [limit]              - Mightiest assets
  cmc trending                 - Rising stars
  cmc gainers                  - Victors & vanquished
  cmc convert [amt] [from] [to] - Transform currencies
  cmc info [symbol]            - Deep asset lore
  cmc global                   - Realm statistics

ᚠ FENRIR'S COUNSEL (OpenRouter AI)
  ask [question]               - Natural language queries
  talk [message]               - Speak with Fenrir
  analyze [symbol]             - Receive prophecy
  forget                       - Clear conversation memory
  models                       - View available spirits
  model [name]                 - Summon different spirit

ᛗ MACHINE LEARNING (TensorFlow.js)
  predict [symbol] [days]      - LSTM price forecasting
  predict [symbol] trend       - Trend prediction
  sentiment [symbol]           - Multi-factor sentiment
  anomaly [symbol]             - Detect unusual activity
  patterns [symbol]            - Chart pattern recognition
  dashboard [symbol]           - Interactive visualization

🏛️ DEGENERATE TOWN (Norse AI Trading)
  degen start                  - Start Q-Learning simulation
  degen stop                   - Stop the simulation
  degen status                 - View realm statistics
  degen agents                 - List Norse god agents
  degen agent <name>           - View specific agent
  degen leaderboard            - Show agent rankings
  degen open                   - Open visual simulation

⚔️ FENRIR TRADING BOT
  fenrir start [mode]          - Start trading bot
  fenrir stop                  - Stop the trading bot
  fenrir status                - Bot status and portfolio
  fenrir positions             - View open positions

🔍 SCOUT (Token Discovery)
  scout discover               - Find token candidates
  scout evaluate <symbol>      - Deep 50-point evaluation
  scout report <symbol>        - Run DD checklist
  scout rank                   - Show ranked tokens

ᛗ SYSTEM RUNES
  apikeys                      - Inscribe your keys
  status                       - Check arsenal readiness
  theme                        - Change realm appearance
  clear                        - Cleanse the scroll
  help                         - Summon this grimoire
  welcome                      - Getting started guide

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🆕 NEW HERE? Try these commands:
   welcome              - Interactive getting started guide
   ? [category]         - Quick help (e.g., '? market', '? trading', '? ml')

🆓 FREE FEATURES (No API key needed):
   predict, sentiment, patterns, anomaly, dashboard, degen

🔑 REQUIRES API KEY:
   price, market, analyze, research, fenrir, scout
`,
    });
  }, [addOutput]);

  const handleWelcome = useCallback(() => {
    const openRouterConfigured = !!API_CONFIG?.openRouter?.apiKey;
    const cmcConfigured = !!API_CONFIG?.coinMarketCap?.apiKey;
    const anyApiConfigured = openRouterConfigured || cmcConfigured;

    let welcomeContent = `
┌─────────────────────────────────────────────────────────────────┐
│  ᚠ WELCOME TO FENRIR'S GRIMOIRE - AI Trading Terminal          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                 │
│  Your intelligent command center for crypto analysis,           │
│  ML predictions, and autonomous trading.                        │
└─────────────────────────────────────────────────────────────────┘

`;

    if (!anyApiConfigured) {
      welcomeContent += `
⚠️  SETUP REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
No API keys detected. Run 'apikeys' to configure your keys.

FREE FEATURES (No API key needed):
  • Machine Learning predictions
  • Pattern recognition
  • Degenerate Town simulation
  • Alert system

`;
    } else {
      welcomeContent += `
✅ API STATUS: ${openRouterConfigured ? 'AI Ready' : ''} ${cmcConfigured ? '| Market Data Ready' : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
    }

    welcomeContent += `
🚀 QUICK START COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  MARKET DATA          │  AI ANALYSIS          │  TRADING
  ─────────────────────┼───────────────────────┼──────────────────
  price BTC            │  analyze SOL          │  fenrir start
  market ETH           │  predict BTC 7        │  scan start
  trending             │  sentiment BTC        │  degen open
  fear                 │  patterns ETH         │  scout discover

  RESEARCH             │  TOOLS                │  SYSTEM
  ─────────────────────┼───────────────────────┼──────────────────
  research bitcoin     │  dashboard BTC        │  apikeys
  websearch-ai ETF     │  alert price BTC > 50k│  status
  scrape <url>         │  web3 connect         │  theme
                       │                       │  help

⌨️  KEYBOARD SHORTCUTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ↑ / ↓    Navigate command history
  Tab      Autocomplete commands
  Ctrl+L   Clear terminal
  Escape   Close modals

💡 TIP: Type 'help' for full command list, or 'help <category>' for specific commands
   Categories: market, ai, ml, trading, research, alerts, system
`;

    addOutput({ type: 'welcome', content: welcomeContent });
  }, [addOutput, API_CONFIG]);

  const handleQuickHelp = useCallback((args) => {
    const category = args[0]?.toLowerCase();

    const helpCategories = {
      market: `
ᚠ MARKET COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  price [symbol]       Get real-time price (e.g., price BTC)
  market [symbol]      Detailed market data with volume, supply
  global               Global crypto market overview
  trending             Top trending cryptocurrencies
  movers               Top gainers and losers (24h)
  fear                 Fear & Greed Index
`,
      ai: `
ᚠ AI COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ask [question]       Data-driven AI analysis
  talk [message]       Conversational AI (remembers context)
  analyze [symbol]     Deep market analysis with predictions
  forget               Clear conversation memory
  models               List available AI models
  model [name]         Switch AI model
`,
      ml: `
ᚠ MACHINE LEARNING COMMANDS (No API key required!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  predict [symbol] [days]     LSTM price prediction
  predict [symbol] trend      Trend direction prediction
  sentiment [symbol]          Multi-factor sentiment analysis
  sentiment-multi [symbol]    Aggregate from multiple sources
  anomaly [symbol]            Detect unusual activity
  patterns [symbol]           Chart pattern recognition
  dashboard [symbol]          Interactive visualization
`,
      trading: `
⚔️ TRADING COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  FENRIR BOT:
  fenrir start [mode]  Start bot (simulation/conservative/aggressive)
  fenrir stop          Stop trading bot
  fenrir status        Portfolio and bot status
  fenrir positions     View open positions

  LIVE SCANNER:
  scan start [mode]    Start pump.fun/bonk.fun scanner
  scan stop            Stop scanner
  scan status          Scanner status

  AI TRADER:
  ai start             Start autonomous AI trader
  ai stop              Stop and save learning
  ai performance       View AI performance
`,
      research: `
ᛉ RESEARCH COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  websearch-ai [query]  AI web search with citations
  research [topic]      Deep research with Parallel AI
  google [query]        Google search results
  scrape [url]          Extract content from any URL
  docs [query]          Search technical documentation
`,
      alerts: `
ᛒ ALERT COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  alert price [sym] [>/<] [val]  Price threshold alert
  alert pattern [sym] [pattern]  Pattern detection alert
  alert sentiment [sym] [sent]   Sentiment change alert
  alert anomaly [sym]            Anomaly detection alert
  alert list                     View all alerts
  alert remove [id]              Remove specific alert
  alert clear                    Clear all alerts
`,
      system: `
ᛗ SYSTEM COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  apikeys              Configure API keys
  status               Check API status
  theme                Change appearance
  clear                Clear terminal
  help                 Full command list
  welcome              Show getting started screen

  WALLET:
  web3 connect         Connect Phantom/Solflare (recommended)
  web3 disconnect      Disconnect wallet
  web3 balance         Check balance
`,
      degen: `
🏛️ DEGENERATE TOWN COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  degen start          Start Q-Learning simulation
  degen stop           Stop simulation
  degen open           Open visual simulation (interactive!)
  degen status         View realm statistics
  degen agents         List all Norse god agents
  degen agent [name]   View specific agent details
  degen leaderboard    Show agent rankings
  degen trades [n]     View recent trades
  degen events [n]     View market events
  degen speed [1-10]   Adjust simulation speed
  degen reset          Reset all learning data
`,
    };

    if (category && helpCategories[category]) {
      addOutput({ type: 'help', content: helpCategories[category] });
    } else {
      addOutput({
        type: 'help',
        content: `
ᚠ QUICK HELP - Command Categories
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Type '? [category]' or 'quickhelp [category]' for detailed help:

  ? market     - Price data, trending, fear index
  ? ai         - AI analysis, conversations, models
  ? ml         - Machine learning predictions (FREE!)
  ? trading    - Fenrir bot, scanner, AI trader
  ? research   - Web search, scraping, documentation
  ? alerts     - Price, pattern, sentiment alerts
  ? degen      - Degenerate Town simulation
  ? system     - API keys, themes, wallet

Examples:
  ? market     - Show all market commands
  ? trading    - Show all trading commands

Or type 'help' for the complete command reference.
`,
      });
    }
  }, [addOutput]);

  const handleApiKeys = useCallback(() => {
    setShowAPIKeyModal(true);
    addOutput({
      type: 'info',
      content: 'Opening API key configuration...',
    });
  }, [addOutput, setShowAPIKeyModal]);

  const handleStatus = useCallback(() => {
    const openRouterConfigured = !!API_CONFIG?.openRouter?.apiKey;
    const scraperConfigured = !!API_CONFIG?.scraperAPI?.apiKey;
    const cmcConfigured = !!API_CONFIG?.coinMarketCap?.apiKey;
    const santimentConfigured = !!API_CONFIG?.santiment?.apiKey;
    const parallelConfigured = !!API_CONFIG?.parallel?.apiKey;

    let statusMsg = '\nᛗ ARSENAL STATUS\n━━━━━━━━━━━━━━━━━━━━━━━━\n';
    statusMsg += `OpenRouter AI:   ${openRouterConfigured ? 'ᛏ Ready' : 'ᛪ Not inscribed'}\n`;
    statusMsg += `CoinMarketCap:   ${cmcConfigured ? 'ᛏ Ready' : 'ᛪ Not inscribed'}\n`;
    statusMsg += `Santiment:       ${santimentConfigured ? 'ᛏ Ready' : 'ᛪ Not inscribed'}\n`;
    statusMsg += `ScraperAPI:      ${scraperConfigured ? 'ᛏ Ready' : 'ᛪ Not inscribed'}\n`;
    statusMsg += `Parallel AI:     ${parallelConfigured ? 'ᛏ Ready' : 'ᛪ Not inscribed'}\n`;
    statusMsg += `\nCurrent Spirit: ${currentAIModel}\n`;

    if (!openRouterConfigured || !scraperConfigured || !cmcConfigured) {
      statusMsg += '\nᛟ Run "apikeys" to configure missing keys';
    }

    addOutput({ type: 'info', content: statusMsg });
  }, [addOutput, API_CONFIG, currentAIModel]);

  const handleClear = useCallback(() => {
    setOutput([]);
    addOutput({
      type: 'system',
      content: `ᚠᛖᚾᚱᛁᛦ - ₴₮Ɽł₦₲₴ Ø₣ Ɇ₦ĐⱠɆ₴₴ ₱Ø₴₴ł฿łⱠł₮łɆ₴`,
    });
    showToast('Terminal cleared', 'success');
  }, [addOutput, setOutput, showToast]);

  const handleModels = useCallback(() => {
    const models = API_CONFIG?.openRouter?.models || [];
    let result = '\nᛟ AVAILABLE AI SPIRITS\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    models.forEach(model => {
      const isActive = model.id === currentAIModel ? ' ◄ ACTIVE' : '';
      result += `• ${model.name} (${model.provider})${isActive}\n`;
      result += `  ID: ${model.id}\n\n`;
    });

    result += `\nTo switch: model [model-id]`;
    addOutput({ type: 'info', content: result });
  }, [addOutput, API_CONFIG, currentAIModel]);

  const handleModel = useCallback((args) => {
    const modelId = args[0];
    if (!modelId) {
      addOutput({
        type: 'error',
        content: 'Usage: model [model-id]\n\nRun "models" to see available options.',
      });
      return;
    }

    const models = API_CONFIG?.openRouter?.models || [];
    const model = models.find(m => m.id.toLowerCase().includes(modelId.toLowerCase()));

    if (model) {
      setCurrentAIModel(model.id);
      addOutput({
        type: 'success',
        content: `ᛟ Spirit summoned: ${model.name}`,
      });
      showToast(`Model: ${model.name}`, 'success');
    } else {
      addOutput({
        type: 'error',
        content: `Model not found: ${modelId}\n\nRun "models" to see available options.`,
      });
    }
  }, [addOutput, showToast, API_CONFIG, setCurrentAIModel]);

  // Main command handler
  const handleCommand = useCallback((command, args) => {
    switch (command) {
      case 'help':
        handleHelp();
        return true;
      case 'welcome':
      case 'start':
      case 'onboarding':
      case 'tutorial':
        handleWelcome();
        return true;
      case 'quickhelp':
      case '?':
        handleQuickHelp(args);
        return true;
      case 'apikeys':
        handleApiKeys();
        return true;
      case 'status':
        handleStatus();
        return true;
      case 'clear':
        handleClear();
        return true;
      case 'models':
        handleModels();
        return true;
      case 'model':
        handleModel(args);
        return true;
      default:
        return false;
    }
  }, [handleHelp, handleWelcome, handleQuickHelp, handleApiKeys, handleStatus, handleClear, handleModels, handleModel]);

  return {
    handleCommand,
    handleHelp,
    handleWelcome,
    handleQuickHelp,
    handleApiKeys,
    handleStatus,
    handleClear,
    handleModels,
    handleModel,
  };
}

export default useSystemCommands;
