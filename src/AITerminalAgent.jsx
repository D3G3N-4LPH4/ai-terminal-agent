import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Terminal,
  Brain,
  Globe,
  WifiOff,
  MessageSquare,
  DollarSign,
  BarChart3,
  Bell,
  Newspaper,
  Radio,
  Download,
  Search,
  TrendingUp,
  Activity,
  Zap,
  Lock,
  Palette,
  ArrowUp,
  Sparkles,
  Command,
  Info,
  X,
  Check,
  AlertCircle,
  Loader,
  Key,
  Settings,
} from "lucide-react";
import { useFenrirAgent } from "./useFenrirAgent";

// Import API classes
import {
  OpenRouterAPI,
  WebScraperAPI,
  ScraperAPI,
  CoinMarketCapAPI,
  SantimentAPI,
  ParallelAPI,
  MCPAPI,
} from "./api";
import { AIFallbackOrchestrator } from "./api/AIFallbackOrchestrator";

// Import configuration
import { THEMES } from "./config/themes";
import { AVAILABLE_TOOLS } from "./config/tools";

// Import utilities
import {
  formatPrice,
  formatVolume,
  formatPercent,
  getChangeRune,
} from "./utils/formatters";
import { getCoinIdOrError } from "./utils/coinValidation";
import { handleCommandError } from "./utils/errorHandler";
import { getLoadingMessage, OperationType } from "./utils/loadingMessages";
import { validateTrainingData, validatePredictionInput, calculateConfidence } from "./utils/mlValidation";
import MLCacheHelper from "./utils/mlCacheHelper";
import MultiTimeframeAnalyzer from "./utils/multiTimeframeAnalysis";
import AlertManager from "./utils/alertSystem";
import MultiSourceSentimentAggregator from "./utils/multiSourceSentiment";

// Import ML modules
import {
  MLService,
  PricePredictor,
  SentimentAnalyzer,
  AnomalyDetector,
  PatternRecognizer,
} from "./ml";

// Import components
import { Toast, APIKeyModal, OutputItem, Dashboard } from "./components";
import ThemeToggle from "./components/ThemeDropdown";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

/**
 * AITerminalAgent_INTEGRATED.jsx - Full API Integration Edition
 *
 * 🔌 INTEGRATIONS:
 * - OpenRouter API for real AI responses
 * - Web scraping for market data
 * - Real-time crypto price feeds
 *
 * ᛟ FEATURES:
 * - Multi-model AI chat via OpenRouter
 * - API key management UI
 * - Rate limiting and error handling
 * - Caching and optimization
 *
 * 🎨 UX:
 * - Theme selector
 * - Command history
 * - Autocomplete
 * - Toast notifications
 * - Loading states
 */

// ==================== API CONFIGURATION ====================

// Backend proxy server URL - Change this if deploying to production
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

const API_CONFIG = {
  openRouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    // OpenRouter supports CORS, no proxy needed
    apiKey: localStorage.getItem("openrouter_api_key") || "",
    defaultModel: "anthropic/claude-3.5-sonnet",
    models: [
      {
        id: "anthropic/claude-3.5-sonnet",
        name: "Claude 3.5 Sonnet",
        provider: "Anthropic",
      },
      { id: "openai/gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI" },
      {
        id: "meta-llama/llama-3.1-70b-instruct",
        name: "Llama 3.1 70B",
        provider: "Meta",
      },
      {
        id: "google/gemini-pro-1.5",
        name: "Gemini Pro 1.5",
        provider: "Google",
      },
      {
        id: "mistralai/mistral-large",
        name: "Mistral Large",
        provider: "Mistral",
      },
    ],
  },
  // Fallback AI Providers
  anthropic: {
    apiKey: localStorage.getItem("anthropic_api_key") || "",
    model: "claude-3-5-sonnet-20241022",
  },
  groq: {
    apiKey: localStorage.getItem("groq_api_key") || "",
    model: "llama-3.1-70b-versatile",
  },
  gemini: {
    apiKey: localStorage.getItem("gemini_api_key") || "",
    model: "gemini-1.5-flash-latest",
  },
  scraperAPI: {
    // Using backend proxy to avoid CORS issues
    baseUrl: `${BACKEND_URL}/api/scraper`,
    // Direct API (will fail due to CORS): "https://api.scraperapi.com"
    apiKey: localStorage.getItem("scraper_api_key") || "",
  },
  coinMarketCap: {
    // Using backend proxy to avoid CORS issues
    baseUrl: `${BACKEND_URL}/api/cmc`,
    // Direct API (will fail due to CORS): "https://pro-api.coinmarketcap.com/v1"
    apiKey: localStorage.getItem("coinmarketcap_api_key") || "",
  },
  santiment: {
    // Using backend proxy to avoid CORS issues
    baseUrl: `${BACKEND_URL}/api/santiment`,
    graphqlUrl: "https://api.santiment.net/graphql",
    // Direct API (will fail due to CORS): "https://api.santiment.net/graphql"
    apiKey: localStorage.getItem("santiment_api_key") || "",
  },
  parallel: {
    // Using backend proxy to avoid CORS issues
    baseUrl: `${BACKEND_URL}/api/parallel`,
    // Direct API: "https://api.parallel.ai/v1"
    apiKey: localStorage.getItem("parallel_api_key") || "",
  },
};

// Make API_CONFIG available globally for API classes
if (typeof window !== 'undefined') {
  window.API_CONFIG = API_CONFIG;
}

// ==================== THEMES (Same as before) ====================

// THEMES moved to src/config/themes.js


// ==================== CONSTANTS ====================

const STORAGE_KEY = "ai-agent-state-v4";
const THEME_STORAGE_KEY = "ai-agent-theme";
const HISTORY_STORAGE_KEY = "ai-agent-history";
const CONVERSATION_STORAGE_KEY = "ai-agent-conversation";
const CONVERSATION_METADATA_KEY = "ai-agent-conversation-meta";

const COMMAND_SUGGESTIONS = [
  { cmd: "price BTC", desc: "Get real crypto prices", category: "trading" },
  { cmd: "market ETH", desc: "Detailed market data", category: "trading" },
  { cmd: "global", desc: "Global crypto data", category: "trading" },
  { cmd: "trending", desc: "Trending cryptocurrencies", category: "news" },
  { cmd: "fear", desc: "Fear & Greed Index", category: "news" },
  { cmd: "news", desc: "Crypto news", category: "news" },
  {
    cmd: "scrape https://example.com",
    desc: "Scrape any website",
    category: "scraping",
  },
  { cmd: "websearch-ai bitcoin ETF news", desc: "AI web search with citations", category: "scraping" },
  { cmd: "research bitcoin scaling", desc: "Deep AI research with citations", category: "scraping" },
  { cmd: "research https://example.com", desc: "Scrape & analyze URL", category: "scraping" },
  { cmd: "google bitcoin news", desc: "Google Search (results only)", category: "scraping" },
  { cmd: "gecko trending DEX tokens", desc: "CoinGecko MCP AI query", category: "trading" },
  { cmd: "cmc price BTC", desc: "CMC price data", category: "cmc" },
  { cmd: "cmc top 10", desc: "Top cryptocurrencies", category: "cmc" },
  { cmd: "cmc trending", desc: "Trending coins", category: "cmc" },
  { cmd: "cmc gainers", desc: "Top gainers/losers", category: "cmc" },
  { cmd: "cmc convert 1 BTC USD", desc: "Convert crypto", category: "cmc" },
  { cmd: "talk what's the market trend?", desc: "AI analysis", category: "ai" },
  { cmd: "analyze BTC", desc: "Deep AI analysis", category: "ai" },
  { cmd: "apikeys", desc: "Manage API keys", category: "system" },
  { cmd: "models", desc: "List AI models", category: "ai" },
  { cmd: "theme", desc: "Change theme", category: "system" },
  { cmd: "help", desc: "Show commands", category: "system" },
];

const KEYBOARD_SHORTCUTS = [
  { key: "Ctrl+L", action: "clear", desc: "Clear terminal" },
  { key: "Ctrl+K", action: "clear", desc: "Clear terminal" },
  { key: "Ctrl+T", action: "theme", desc: "Cycle theme" },
  { key: "Escape", action: "escape", desc: "Close modals" },
  { key: "↑", action: "history-prev", desc: "Previous command" },
  { key: "↓", action: "history-next", desc: "Next command" },
  { key: "Tab", action: "autocomplete", desc: "Autocomplete" },
];

// ==================== UTILITY FUNCTIONS ====================

function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// ==================== API HELPERS ====================
// API classes have been moved to src/api/ directory
// (OpenRouterAPI, WebScraperAPI, ScraperAPI, CoinMarketCapAPI, SantimentAPI, ParallelAPI)
// Symbol mapping for CoinMarketCap (CMC uses symbols directly)
const COIN_SYMBOL_MAP = {
  BTC: "BTC",
  ETH: "ETH",
  SOL: "SOL",
  USDT: "USDT",
  BNB: "BNB",
  XRP: "XRP",
  ADA: "ADA",
  DOGE: "DOGE",
  MATIC: "MATIC",
  DOT: "DOT",
  AVAX: "AVAX",
  LINK: "LINK",
  UNI: "UNI",
  ATOM: "ATOM",
};

// Helper function to convert symbol to CMC format and check validity
function getSymbolOrError(symbol) {
  const upperSymbol = symbol.toUpperCase();
  if (COIN_SYMBOL_MAP[upperSymbol]) {
    return { symbol: COIN_SYMBOL_MAP[upperSymbol], error: null };
  }
  return { symbol: null, error: `Unknown cryptocurrency: ${symbol}` };
}

// Helper to get CMC historical data (converts days to timestamp format)
async function getCMCHistoricalData(cmcAPI, symbol, days) {
  const timeEnd = Math.floor(Date.now() / 1000); // Current time in seconds
  const timeStart = timeEnd - (days * 24 * 60 * 60); // Days ago in seconds

  // Determine interval based on days
  let interval = "daily";
  if (days <= 1) interval = "hourly";
  else if (days <= 7) interval = "hourly";
  else if (days <= 30) interval = "daily";
  else interval = "weekly";

  const data = await cmcAPI.getHistoricalQuotes(symbol, timeStart, timeEnd, interval);

  // Convert CMC format to array format similar to CoinGecko's market_chart
  // CMC returns: { quotes: [{timestamp, quote: {USD: {price, volume_24h, ...}}}] }
  if (data && data.quotes) {
    return {
      prices: data.quotes.map(q => [q.timestamp * 1000, q.quote.USD.price]),
      volumes: data.quotes.map(q => [q.timestamp * 1000, q.quote.USD.volume_24h || 0])
    };
  }

  return { prices: [], volumes: [] };
}

// ==================== TOOL DEFINITIONS FOR AI ====================

// ==================== MAIN COMPONENT ====================

export default function AITerminalAgent() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentTheme, setCurrentTheme] = useState("fenrir");
  const [showAPIKeyModal, setShowAPIKeyModal] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [autocompleteMatches, setAutocompleteMatches] = useState([]);
  const [selectedAutocomplete, setSelectedAutocomplete] = useState(0);
  const [currentAIModel, setCurrentAIModel] = useState(
    API_CONFIG.openRouter.defaultModel
  );
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardSymbol, setDashboardSymbol] = useState('BTC');
  const [dashboardCoinId, setDashboardCoinId] = useState('bitcoin');
  const [conversationHistory, setConversationHistory] = useState(() => {
    // Load conversation history from localStorage on init
    try {
      const saved = localStorage.getItem(CONVERSATION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load conversation history:', e);
      return [];
    }
  });
  const [conversationMetadata, setConversationMetadata] = useState(() => {
    // Load conversation metadata (topics, user preferences, etc.)
    try {
      const saved = localStorage.getItem(CONVERSATION_METADATA_KEY);
      return saved ? JSON.parse(saved) : {
        topics: [],
        userName: null,
        preferences: {},
        startedAt: new Date().toISOString(),
        messageCount: 0,
      };
    } catch (e) {
      return {
        topics: [],
        userName: null,
        preferences: {},
        startedAt: new Date().toISOString(),
        messageCount: 0,
      };
    }
  });
  const [showAgentReasoning, setShowAgentReasoning] = useState(true);
  const [useLangGraphAgent, setUseLangGraphAgent] = useState(true);

  const terminalRef = useRef(null);
  const inputRef = useRef(null);
  const openRouterAPI = useRef(null);
  const aiFallback = useRef(null); // AI Fallback Orchestrator
  const scraperAPI = useRef(null);
  const scraperAPIAdvanced = useRef(null);
  const coinMarketCapAPI = useRef(null);
  const santimentAPI = useRef(null);
  const parallelAPI = useRef(null);
  const mcpAPI = useRef(null);

  // ML Service refs
  const mlService = useRef(null);
  const pricePredictor = useRef(null);
  const sentimentAnalyzer = useRef(null);
  const anomalyDetector = useRef(null);
  const patternRecognizer = useRef(null);
  const mlCacheHelper = useRef(null);
  const multiTimeframeAnalyzer = useRef(null);
  const alertManager = useRef(null);
  const multiSourceSentiment = useRef(null);

  // Initialize LangGraph Agent (uses backend API)
  const fenrirAgent = useFenrirAgent({
    openRouterApiKey: API_CONFIG.openRouter.apiKey,
    model: currentAIModel,
  });

  const theme = THEMES[currentTheme];

  // Initialize APIs
  useEffect(() => {
    // Initialize primary OpenRouter API
    openRouterAPI.current = new OpenRouterAPI(
      API_CONFIG.openRouter.apiKey,
      API_CONFIG.openRouter.baseUrl,
      API_CONFIG.openRouter.defaultModel
    );

    // Initialize AI Fallback Orchestrator
    aiFallback.current = new AIFallbackOrchestrator(API_CONFIG);

    scraperAPI.current = new WebScraperAPI();
    scraperAPIAdvanced.current = new ScraperAPI(API_CONFIG.scraperAPI.apiKey);
    coinMarketCapAPI.current = new CoinMarketCapAPI(API_CONFIG.coinMarketCap.apiKey);
    santimentAPI.current = new SantimentAPI(API_CONFIG.santiment.apiKey);
    parallelAPI.current = new ParallelAPI(API_CONFIG.parallel.apiKey);
    mcpAPI.current = new MCPAPI();

    // Initialize ML Services
    mlService.current = new MLService();
    mlCacheHelper.current = new MLCacheHelper();
    multiTimeframeAnalyzer.current = new MultiTimeframeAnalyzer();

    mlService.current.initialize().then(success => {
      if (success) {
        pricePredictor.current = new PricePredictor(mlService.current);
        sentimentAnalyzer.current = new SentimentAnalyzer(mlService.current);
        anomalyDetector.current = new AnomalyDetector(mlService.current);
        patternRecognizer.current = new PatternRecognizer(mlService.current);

        // Initialize alert manager with ML services
        alertManager.current = new AlertManager(coinMarketCapAPI.current, {
          sentimentAnalyzer: sentimentAnalyzer.current,
          anomalyDetector: anomalyDetector.current,
          patternRecognizer: patternRecognizer.current,
        });

        // Initialize multi-source sentiment aggregator
        multiSourceSentiment.current = new MultiSourceSentimentAggregator({
          coinMarketCap: coinMarketCapAPI.current,
          santiment: santimentAPI.current,
          webScraper: scraperAPI.current,
        }, sentimentAnalyzer.current);

        console.log('ᛟ ML Services initialized');
        console.log('ᛟ ML Caching enabled');
        console.log('ᛟ Multi-Timeframe Analyzer ready');
        console.log('ᛟ Alert Manager initialized');
        console.log('ᛟ Multi-Source Sentiment Aggregator ready');
      } else {
        console.warn('ML Services initialization failed');
      }
    });
  }, []);

  // Update LangGraph agent when model changes
  useEffect(() => {
    if (fenrirAgent && fenrirAgent.updateConfig) {
      fenrirAgent.updateConfig({
        openRouterApiKey: API_CONFIG.openRouter.apiKey,
        model: currentAIModel,
      });
    }
  }, [currentAIModel, fenrirAgent]);

  // ==================== TOAST SYSTEM ====================

  const showToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ==================== OUTPUT MANAGEMENT ====================

  const addOutput = useCallback((item) => {
    setOutput((prev) => {
      const newOutput = [...prev, { ...item, id: item.id || (Date.now() + Math.random()) }];
      return newOutput.slice(-1000);
    });
  }, []);

  // ==================== TOOL EXECUTION HANDLER ====================

  const executeTool = useCallback(async (toolName, toolArgs) => {
    try {
      switch (toolName) {
        case "get_crypto_price": {
          const symbol = toolArgs.symbol.toUpperCase();

          if (!COIN_SYMBOL_MAP[symbol]) {
            return { error: `Unknown cryptocurrency symbol: ${symbol}` };
          }

          const data = await coinMarketCapAPI.current.getQuotes(symbol);
          const priceData = data[symbol];

          if (!priceData) {
            return { error: `Could not retrieve price data for ${symbol}` };
          }

          const quote = priceData.quote.USD;
          return {
            symbol: symbol,
            price: quote.price,
            change_24h: quote.percent_change_24h,
            volume_24h: quote.volume_24h,
            market_cap: quote.market_cap,
            currency: "USD",
          };
        }

        case "search_crypto_assets": {
          const query = toolArgs.query.toLowerCase();

          // Get top 200 coins from CMC for comprehensive search
          const allCoins = await coinMarketCapAPI.current.getListings(200, 1);

          // Search through names and symbols
          const matches = allCoins.filter(coin =>
            coin.name.toLowerCase().includes(query) ||
            coin.symbol.toLowerCase().includes(query)
          ).slice(0, 5);

          if (matches.length === 0) {
            return { error: `No cryptocurrencies found matching: ${query}` };
          }

          const results = matches.map((coin) => {
            const quote = coin.quote?.USD;
            return {
              symbol: coin.symbol,
              name: coin.name,
              price: quote?.price || 0,
              change_24h: quote?.percent_change_24h || 0,
              market_cap: quote?.market_cap || 0,
              rank: coin.cmc_rank,
            };
          });

          return {
            query: query,
            results: results,
            total_searched: allCoins.length,
          };
        }

        case "get_onchain_metrics": {
          const symbol = toolArgs.symbol.toUpperCase();
          const coinId = COIN_SYMBOL_MAP[symbol];

          if (!coinId) {
            return { error: `Unknown cryptocurrency symbol: ${symbol}` };
          }

          if (!santimentAPI.current || !API_CONFIG.santiment.apiKey) {
            return {
              error:
                "Santiment API not configured. On-chain metrics unavailable.",
            };
          }

          const data = await santimentAPI.current.getEnrichedAnalysis(coinId);

          return {
            symbol: symbol,
            social_volume_7d: data.social || 0,
            dev_activity_30d_avg: data.dev || 0,
            mvrv_ratio: data.mvrv || 0,
            active_addresses_7d_avg: data.addresses || 0,
            description:
              "Social volume indicates community interest, dev activity shows ongoing development, MVRV ratio helps identify market tops/bottoms, active addresses show network usage",
          };
        }

        case "get_trending_coins": {
          const data = await coinMarketCapAPI.current.getTrending();
          const trending = Array.isArray(data) ? data.slice(0, 7) : [];

          const results = trending.map((coin) => {
            const quote = coin.quote?.USD;
            return {
              name: coin.name,
              symbol: coin.symbol,
              rank: coin.cmc_rank || "N/A",
              price: quote?.price || "N/A",
              change_24h: quote?.percent_change_24h || 0,
            };
          });

          return {
            trending_coins: results,
            description: "These are the hottest cryptocurrencies based on current search activity and market activity",
          };
        }

        case "get_market_movers": {
          const data = await coinMarketCapAPI.current.getGainersLosers();

          const gainers = (data.gainers || []).slice(0, 5).map((coin) => {
            const quote = coin.quote?.USD;
            return {
              name: coin.name,
              symbol: coin.symbol,
              price: quote?.price || 0,
              change_24h: quote?.percent_change_24h || 0,
              rank: coin.cmc_rank,
            };
          });

          const losers = (data.losers || []).slice(0, 5).map((coin) => {
            const quote = coin.quote?.USD;
            return {
              name: coin.name,
              symbol: coin.symbol,
              price: quote?.price || 0,
              change_24h: quote?.percent_change_24h || 0,
              rank: coin.cmc_rank,
            };
          });

          return {
            top_gainers: gainers,
            top_losers: losers,
            description: "Top market movers over the last 24 hours - biggest gains and losses",
          };
        }

        case "get_category_info": {
          // Note: CMC doesn't have direct category filtering like CoinGecko
          // This tool returns a helpful error message directing users to alternatives
          return {
            error: `Category filtering is not available through CoinMarketCap. Try these alternatives:

• Use "search_crypto_assets" to search for specific coins
• Use "get_trending_coins" to see what's hot right now
• Use "get_market_movers" to see biggest gainers/losers
• Use "web_search" with a query like "best DeFi tokens 2024" for category research

Category requested: ${toolArgs.category || 'none'}`,
            alternatives: {
              search: "search_crypto_assets",
              trending: "get_trending_coins",
              movers: "get_market_movers",
              research: "web_search"
            }
          };
        }

        case "web_research": {
          const topic = toolArgs.topic;

          if (!parallelAPI.current || !API_CONFIG.parallel.apiKey) {
            return {
              error: "Parallel AI not configured. Web research unavailable. Configure API key to enable deep research capabilities.",
            };
          }

          const result = await parallelAPI.current.task(topic, "base");

          // Extract comprehensive data from the response
          const content = result.content || result.answer || result.output || "";
          const basis = result.basis || {};

          // Extract all citations from multiple sources
          const allCitations = [];

          // From direct citations array
          if (result.citations && Array.isArray(result.citations)) {
            result.citations.forEach(c => {
              if (!allCitations.find(citation => citation.url === c.url)) {
                allCitations.push({
                  url: c.url,
                  title: c.title || "Untitled",
                  excerpt: c.excerpt || c.snippet || ""
                });
              }
            });
          }

          // From basis object (nested sources)
          if (basis && typeof basis === 'object') {
            Object.entries(basis).forEach(([key, field]) => {
              if (field && field.sources && Array.isArray(field.sources)) {
                field.sources.forEach(source => {
                  if (source.url && !allCitations.find(c => c.url === source.url)) {
                    allCitations.push({
                      url: source.url,
                      title: source.title || "Untitled",
                      excerpt: source.excerpt || source.snippet || ""
                    });
                  }
                });
              }
            });
          }

          // Extract key findings from basis fields
          const keyFindings = [];
          if (basis && typeof basis === 'object') {
            Object.entries(basis).forEach(([fieldName, field]) => {
              if (field && field.content) {
                keyFindings.push({
                  category: fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                  finding: field.content,
                  sources: field.sources?.map(s => ({
                    url: s.url,
                    title: s.title || "Untitled"
                  })) || []
                });
              }
            });
          }

          return {
            topic: topic,
            answer: content,
            summary: content.substring(0, 300) + (content.length > 300 ? "..." : ""),
            total_citations: allCitations.length,
            citations: allCitations.slice(0, 10), // Top 10 most relevant
            key_findings: keyFindings.slice(0, 5), // Top 5 key findings with sources
            research_depth: keyFindings.length > 0 ? "comprehensive" : "standard",
            sources_analyzed: allCitations.length,
            confidence_level: allCitations.length >= 5 ? "high" : allCitations.length >= 3 ? "medium" : "low",
            description: `Deep AI-powered research with ${allCitations.length} sources analyzed and ${keyFindings.length} key findings extracted`,
          };
        }

        case "web_search": {
          const query = toolArgs.query;

          if (!parallelAPI.current || !API_CONFIG.parallel.apiKey) {
            return {
              error: "Parallel AI not configured. Web search unavailable. Configure API key to enable web search.",
            };
          }

          const result = await parallelAPI.current.search(query, [], 10);

          // Process search results with enhanced metadata
          const processedResults = (result.results || result.data || []).slice(0, 10).map((r, index) => {
            const excerpt = r.excerpt || r.description || r.snippet || "";
            const fullExcerpt = excerpt.length > 500 ? excerpt.substring(0, 500) + "..." : excerpt;

            return {
              rank: index + 1,
              title: r.title || "Untitled",
              url: r.url,
              excerpt: fullExcerpt,
              short_excerpt: excerpt.substring(0, 150) + (excerpt.length > 150 ? "..." : ""),
              domain: new URL(r.url).hostname.replace('www.', ''),
              relevance_score: r.score || r.relevance || (10 - index) / 10, // Fallback scoring
              published_date: r.published_date || r.date || null,
              author: r.author || null,
              type: r.type || "article",
            };
          });

          // Extract unique domains
          const uniqueDomains = [...new Set(processedResults.map(r => r.domain))];

          // Calculate search quality metrics
          const avgRelevance = processedResults.reduce((sum, r) => sum + r.relevance_score, 0) / processedResults.length || 0;
          const hasRecent = processedResults.some(r => r.published_date);

          return {
            query: query,
            total_results: processedResults.length,
            results: processedResults,
            top_result: processedResults[0] || null,
            unique_sources: uniqueDomains.length,
            domains: uniqueDomains.slice(0, 5),
            average_relevance: avgRelevance.toFixed(2),
            has_recent_content: hasRecent,
            quality_score: avgRelevance >= 0.7 ? "high" : avgRelevance >= 0.5 ? "medium" : "standard",
            description: `Found ${processedResults.length} results from ${uniqueDomains.length} unique sources with ${(avgRelevance * 100).toFixed(0)}% average relevance`,
          };
        }

        case "get_coinmarketcap_data": {
          if (!coinMarketCapAPI.current || !API_CONFIG.coinMarketCap.apiKey) {
            return {
              error: "CoinMarketCap API not configured. Set up your CMC Pro API key to use this feature.",
            };
          }

          const action = toolArgs.action;
          const symbol = toolArgs.symbol?.toUpperCase();
          const limit = toolArgs.limit || 100;

          switch (action) {
            case "price":
              if (!symbol) return { error: "Symbol required for price action" };
              const priceData = await coinMarketCapAPI.current.getQuotes(symbol);
              return { action: "price", data: priceData };

            case "listings":
              const listings = await coinMarketCapAPI.current.getListings(limit);
              return { action: "listings", data: listings };

            case "metadata":
              if (!symbol) return { error: "Symbol required for metadata action" };
              const metadata = await coinMarketCapAPI.current.getMetadata(symbol);
              return { action: "metadata", data: metadata };

            case "global":
              const globalData = await coinMarketCapAPI.current.getGlobalMetrics();
              return { action: "global", data: globalData };

            case "trending":
              const trending = await coinMarketCapAPI.current.getTrending();
              return { action: "trending", data: trending };

            case "gainers_losers":
              const movers = await coinMarketCapAPI.current.getGainersLosers();
              return { action: "gainers_losers", data: movers };

            case "convert":
              if (!symbol) return { error: "Symbol required for convert action" };
              const amount = toolArgs.amount || 1;
              const convertTo = toolArgs.convert_to || "USD";
              const convertData = await coinMarketCapAPI.current.convert(amount, symbol, convertTo);
              return { action: "convert", data: convertData };

            case "exchanges":
              const exchanges = await coinMarketCapAPI.current.getExchanges(limit);
              return { action: "exchanges", data: exchanges };

            case "airdrops":
              const airdrops = await coinMarketCapAPI.current.getAirdrops("ONGOING");
              return { action: "airdrops", data: airdrops };

            case "market_pairs":
              if (!symbol) return { error: "Symbol required for market_pairs action" };
              const pairs = await coinMarketCapAPI.current.getMarketPairs(symbol, limit);
              return { action: "market_pairs", data: pairs };

            case "performance":
              if (!symbol) return { error: "Symbol required for performance action" };
              const timePeriod = toolArgs.time_period || "24h";
              const performance = await coinMarketCapAPI.current.getPricePerformance(symbol, timePeriod);
              return { action: "performance", data: performance };

            default:
              return { error: `Unknown CMC action: ${action}` };
          }
        }

        case "get_sentiment_analysis": {
          const symbol = toolArgs.symbol.toUpperCase();

          if (!multiSourceSentiment.current) {
            return {
              error: "Sentiment analysis not initialized. This feature requires the multi-source sentiment system.",
            };
          }

          const result = await multiSourceSentiment.current.aggregateSentiment(symbol);

          return {
            symbol,
            overall_sentiment: result.aggregate.label,
            score: result.aggregate.score,
            confidence: result.aggregate.confidence,
            reliability: result.reliability,
            sources_used: result.aggregate.availableSources,
            source_count: result.aggregate.sourceCount,
            breakdown: {
              price_sentiment: result.sources.price?.label || "N/A",
              price_score: result.sources.price?.score || 0,
              market_sentiment: result.sources.market?.label || "N/A",
              market_score: result.sources.market?.score || 0,
              onchain_sentiment: result.sources.onchain?.label || "N/A",
              onchain_score: result.sources.onchain?.score || 0,
            },
            interpretation: `${symbol} shows ${result.aggregate.label} sentiment with ${result.aggregate.confidence}% confidence based on ${result.aggregate.sourceCount} data sources. Reliability: ${result.reliability}%`,
          };
        }

        case "get_historical_prices": {
          const symbol = toolArgs.symbol.toUpperCase();
          const days = Math.min(Math.max(toolArgs.days || 30, 1), 365);

          if (!COIN_SYMBOL_MAP[symbol]) {
            return { error: `Unknown cryptocurrency symbol: ${symbol}` };
          }

          const timeEnd = Math.floor(Date.now() / 1000);
          const timeStart = timeEnd - (days * 24 * 60 * 60);

          // Determine interval based on timeframe
          let interval = "daily";
          if (days <= 1) interval = "hourly";
          else if (days <= 7) interval = "hourly";
          else if (days <= 90) interval = "daily";
          else interval = "weekly";

          const data = await coinMarketCapAPI.current.getHistoricalQuotes(symbol, timeStart, timeEnd, interval);

          if (!data || !data.quotes || data.quotes.length === 0) {
            return { error: `No historical data available for ${symbol}` };
          }

          const prices = data.quotes.map(q => ({
            timestamp: q.timestamp * 1000,
            date: new Date(q.timestamp * 1000).toISOString(),
            price: q.quote.USD.price,
            volume: q.quote.USD.volume_24h || 0,
            market_cap: q.quote.USD.market_cap || 0,
          }));

          // Calculate statistics
          const priceValues = prices.map(p => p.price);
          const currentPrice = priceValues[priceValues.length - 1];
          const firstPrice = priceValues[0];
          const percentChange = ((currentPrice - firstPrice) / firstPrice) * 100;
          const highPrice = Math.max(...priceValues);
          const lowPrice = Math.min(...priceValues);

          return {
            symbol,
            period_days: days,
            interval,
            data_points: prices.length,
            prices: prices,
            statistics: {
              current_price: currentPrice,
              period_start_price: firstPrice,
              percent_change: percentChange,
              high: highPrice,
              low: lowPrice,
              range: highPrice - lowPrice,
              average: priceValues.reduce((a, b) => a + b, 0) / priceValues.length,
            },
            trend: percentChange > 5 ? "bullish" : percentChange < -5 ? "bearish" : "neutral",
          };
        }

        default:
          return { error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      console.error(`Tool execution error (${toolName}):`, error);
      return { error: error.message };
    }
  }, []);

  // Handler to reinitialize API instances when keys are updated
  const handleAPIKeysSaved = useCallback(
    (openRouterKey, anthropicKey, groqKey, geminiKey, scraperKey, cmcKey, santimentKey, parallelKey) => {
      openRouterAPI.current = new OpenRouterAPI(
        openRouterKey,
        API_CONFIG.openRouter.baseUrl,
        API_CONFIG.openRouter.defaultModel
      );

      // Reinitialize AI Fallback Orchestrator with new keys
      API_CONFIG.anthropic.apiKey = anthropicKey;
      API_CONFIG.groq.apiKey = groqKey;
      API_CONFIG.gemini.apiKey = geminiKey;
      aiFallback.current = new AIFallbackOrchestrator(API_CONFIG);

      scraperAPI.current = new WebScraperAPI();
      scraperAPIAdvanced.current = new ScraperAPI(scraperKey);
      coinMarketCapAPI.current = new CoinMarketCapAPI(cmcKey);
      santimentAPI.current = new SantimentAPI(santimentKey);
      parallelAPI.current = new ParallelAPI(parallelKey);

      if (openRouterKey) {
        openRouterAPI.current.setModel(currentAIModel);
      }
      addOutput({
        type: "success",
        content: "ᛗ API keys inscribed successfully! Your arsenal is prepared.",
      });
      showToast("API keys updated ᛗ", "success");
    },
    [currentAIModel, addOutput, showToast]
  );

  // ==================== SCROLL MANAGEMENT ====================

  const handleScroll = useCallback(() => {
    if (terminalRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
      const atBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
      setIsAtBottom(atBottom);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTo({
        top: terminalRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  useEffect(() => {
    if (isAtBottom && terminalRef.current) {
      scrollToBottom();
    }
  }, [output, isAtBottom, scrollToBottom]);

  // ==================== STORAGE ====================

  const saveCommandHistory = useCallback((history) => {
    try {
      localStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify(history.slice(-50))
      );
    } catch (err) {
      console.error("Failed to save command history:", err);
    }
  }, []);

  const loadCommandHistory = useCallback(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        setCommandHistory(JSON.parse(saved));
      }
    } catch (err) {
      console.error("Failed to load command history:", err);
    }
  }, []);

  const saveTheme = useCallback((themeName) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeName);
    } catch (err) {
      console.error("Failed to save theme:", err);
    }
  }, []);

  const loadTheme = useCallback(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved && THEMES[saved]) {
        setCurrentTheme(saved);
      }
    } catch (err) {
      console.error("Failed to load theme:", err);
    }
  }, []);

  // ==================== AUTOCOMPLETE ====================

  const updateAutocomplete = useCallback((value) => {
    if (!value.trim()) {
      setAutocompleteMatches([]);
      return;
    }

    const matches = COMMAND_SUGGESTIONS.filter(
      (cmd) =>
        cmd.cmd.toLowerCase().startsWith(value.toLowerCase()) ||
        cmd.desc.toLowerCase().includes(value.toLowerCase())
    );

    setAutocompleteMatches(matches);
    setSelectedAutocomplete(0);
  }, []);

  const debouncedAutocomplete = useMemo(
    () => debounce(updateAutocomplete, 150),
    [updateAutocomplete]
  );

  useEffect(() => {
    debouncedAutocomplete(input);
  }, [input, debouncedAutocomplete]);

  // ==================== THEME MANAGEMENT ====================

  const changeTheme = useCallback(
    (themeName) => {
      if (THEMES[themeName]) {
        setCurrentTheme(themeName);
        saveTheme(themeName);

        showToast(`Theme: ${THEMES[themeName].name}`, "success");
      }
    },
    [saveTheme, showToast]
  );

  // ==================== COMMAND HANDLERS ====================

  const handleCommand = useCallback(
    async (cmd) => {
      const parts = cmd.trim().split(/\s+/);
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      setIsProcessing(true);

      try {
        switch (command) {
          case "help": {
            addOutput({
              type: "help",
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
  websearch-ai [query]         - AI-powered web search with citations (Perplexity)
  research [topic]             - Deep AI research with citations (Parallel AI)
  docs [query] [server]        - Search technical documentation (MCP)
  google [query]               - Google Search results (ScraperAPI)
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
  ask [question]               - Natural language queries (data-driven)
  talk [message]               - Speak with Fenrir (conversational)
  analyze [symbol]             - Receive prophecy
  forget                       - Clear conversation memory
  models                       - View available spirits
  model [name]                 - Summon different spirit

ᛗ MACHINE LEARNING (TensorFlow.js)
  predict [symbol] [days]      - LSTM price forecasting
  predict [symbol] trend       - Trend prediction (bullish/bearish)
  sentiment [symbol]           - Multi-factor sentiment analysis
  sentiment trending           - Sentiment for trending coins
  sentiment-multi [symbol]     - Aggregate from multiple sources (price, social, news)
  anomaly [symbol]             - Detect unusual activity
  anomaly [symbol] price       - Price anomaly detection only
  anomaly [symbol] volume      - Volume anomaly detection only
  patterns [symbol]            - Chart pattern recognition
  dashboard [symbol]           - Open interactive visualization dashboard

ᚱ MULTI-TIMEFRAME ANALYSIS
  compare [symbol] [timeframes] - Compare across multiple periods
  correlation [symbols...] [days] - Correlation matrix analysis
  momentum [symbol] [timeframes] - Cross-timeframe momentum
  seasonality [symbol]         - Monthly performance patterns

ᛒ ALERT SYSTEM
  alert price [symbol] [>/<] [value] - Price threshold alerts
  alert pattern [symbol] [pattern] - Pattern detection alerts
  alert sentiment [symbol] [sentiment] - Sentiment change alerts
  alert anomaly [symbol]       - Anomaly detection alerts
  alert list                   - View all alerts
  alert stats                  - Alert statistics
  alert remove [id]            - Remove specific alert
  alert clear                  - Clear all alerts

ᛗ SYSTEM RUNES
  apikeys                      - Inscribe your keys
  status                       - Check arsenal readiness
  theme                        - Change realm appearance
  agent                        - LangGraph agent controls
  clear                        - Cleanse the scroll
  help                         - Summon this grimoire

ᛗ New here? Run 'apikeys' to begin your journey
ᛏ Free access: ML commands work immediately
ᛪ Backend needed: CoinMarketCap, Helius, Dune, ScraperAPI
            `,
            });
            break;
          }

          case "apikeys": {
            setShowAPIKeyModal(true);
            addOutput({
              type: "info",
              content: "Opening API key configuration...",
            });
            break;
          }

          case "status": {
            const openRouterConfigured = !!API_CONFIG.openRouter.apiKey;
            const scraperConfigured = !!API_CONFIG.scraperAPI.apiKey;
            const cmcConfigured = !!API_CONFIG.coinMarketCap.apiKey;
            const santimentConfigured = !!API_CONFIG.santiment.apiKey;
            const parallelConfigured = !!API_CONFIG.parallel.apiKey;

            let statusMsg = "\nᛗ ARSENAL STATUS\n━━━━━━━━━━━━━━━━━━━━━━━━\n";
            statusMsg += `OpenRouter AI:   ${
              openRouterConfigured ? "ᛏ Ready" : "ᛪ Not inscribed"
            }\n`;
            statusMsg += `CoinMarketCap:   ${
              cmcConfigured ? "ᛏ Ready" : "ᛪ Not inscribed"
            }\n`;
            statusMsg += `Santiment:       ${
              santimentConfigured ? "ᛏ Ready" : "ᛪ Not inscribed"
            }\n`;
            statusMsg += `ScraperAPI:      ${
              scraperConfigured ? "ᛏ Ready" : "ᛪ Not inscribed"
            }\n`;
            statusMsg += `Parallel AI:     ${
              parallelConfigured ? "ᛏ Ready" : "ᛪ Not inscribed"
            }\n`;
            statusMsg += `\nCurrent Spirit: ${currentAIModel}\n`;

            if (
              !openRouterConfigured ||
              !scraperConfigured ||
              !cmcConfigured ||
              !santimentConfigured ||
              !parallelConfigured
            ) {
              statusMsg += '\nᛉ Run "apikeys" to inscribe missing keys';
            }

            addOutput({ type: "info", content: statusMsg });
            break;
          }

          case "models": {
            let modelList =
              "\nᛗ AVAILABLE AI MODELS\n━━━━━━━━━━━━━━━━━━━━━━━━\n";
            API_CONFIG.openRouter.models.forEach((model) => {
              const active = currentAIModel === model.id ? " ᛟ ACTIVE" : "";
              modelList += `${model.name.padEnd(25)} (${
                model.provider
              })${active}\n`;
            });
            modelList += '\nUse "model <name>" to switch models';
            addOutput({ type: "info", content: modelList });
            break;
          }

          case "model": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content:
                  'Usage: model <name>\nExample: model claude\nRun "models" to see available models',
              });
              break;
            }

            const searchTerm = args.join(" ").toLowerCase();
            const model = API_CONFIG.openRouter.models.find(
              (m) =>
                m.name.toLowerCase().includes(searchTerm) ||
                m.id.toLowerCase().includes(searchTerm)
            );

            if (model) {
              setCurrentAIModel(model.id);
              if (openRouterAPI.current) {
                openRouterAPI.current.setModel(model.id);
              }
              addOutput({
                type: "success",
                content: `✨ Switched to ${model.name} by ${model.provider}`,
              });
              showToast(`Model: ${model.name}`, "success");
            } else {
              addOutput({
                type: "error",
                content: `Model not found. Run "models" to see available options.`,
              });
            }
            break;
          }

          case "price": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content:
                  "ᛪ Usage: price [symbol]\nExample: price BTC\nSupported: BTC, ETH, SOL, BNB, XRP, ADA, DOGE, MATIC, DOT",
              });
              break;
            }

            // Use coinValidation utility
            const validation = getCoinIdOrError(args[0], COIN_SYMBOL_MAP);
            if (!validation.valid) {
              addOutput({
                type: "error",
                content: validation.error,
              });
              break;
            }

            const symbol = args[0].toUpperCase();

            // Use improved loading message
            addOutput({
              type: "info",
              content: getLoadingMessage(OperationType.FETCH_PRICE, { asset: symbol }),
            });

            try {
              const quotesData = await coinMarketCapAPI.current.getQuotes(symbol);
              const data = quotesData[symbol];

              if (!data) {
                throw new Error(`Unable to retrieve price data for ${symbol}`);
              }

              const quote = data.quote.USD;
              const priceFormatted = formatPrice(quote.price);
              const change24h = quote.percent_change_24h || 0;
              const changeFormatted = formatPercent(change24h, true);
              const changeRune = getChangeRune(change24h);

              let result = `\nᚠ ${symbol} ─ THE MARKET SPEAKS\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
              result += `Price:        ${priceFormatted}\n`;
              result += `24h Change:   ${changeFormatted} ${changeRune}\n`;

              if (quote.volume_24h) {
                result += `24h Volume:   ${formatVolume(quote.volume_24h)}\n`;
              }

              if (quote.market_cap) {
                result += `Market Cap:   ${formatVolume(quote.market_cap)}\n`;
              }

              result += `\nᛗ Live from CoinMarketCap`;

              addOutput({ type: "success", content: result });
              showToast(`${symbol}: ${priceFormatted} ᛗ`, "success");
            } catch (error) {
              handleCommandError(error, `price ${symbol}`, addOutput);
              showToast("Price fetch failed ᛪ", "error");
            }
            break;
          }

          case "market": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content: "ᛪ Usage: market [symbol]\nExample: market BTC",
              });
              break;
            }

            // Use coinValidation utility
            const validation = getCoinIdOrError(args[0], COIN_SYMBOL_MAP);
            if (!validation.valid) {
              addOutput({
                type: "error",
                content: validation.error,
              });
              break;
            }

            const symbol = args[0].toUpperCase();
            const coinId = validation.coinId;

            // Use improved loading message
            addOutput({
              type: "info",
              content: getLoadingMessage(OperationType.FETCH_MARKET, { asset: symbol }),
            });

            try {
              const quotesData = await coinMarketCapAPI.current.getQuotes(symbol);
              const data = quotesData[symbol];
              const quote = data?.quote?.USD;

              if (!quote) {
                throw new Error(`Unable to retrieve market data for ${symbol}`);
              }

              let result = `\nᚱ ${symbol} ─ MARKET DEPTHS\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
              result += `Current Price: $${quote.price.toLocaleString()}\n`;
              result += `Market Cap:    $${quote.market_cap.toLocaleString()}\n`;
              result += `24h Volume:    $${quote.volume_24h.toLocaleString()}\n`;
              result += `24h Change:    ${quote.percent_change_24h.toFixed(2)}%\n`;
              result += `7d Change:     ${quote.percent_change_7d?.toFixed(2) || 'N/A'}%\n`;
              result += `30d Change:    ${quote.percent_change_30d?.toFixed(2) || 'N/A'}%\n`;
              result += `\nᛗ Live from CoinMarketCap`;

              addOutput({ type: "success", content: result });
            } catch (error) {
              handleCommandError(error, `market ${symbol}`, addOutput);
            }
            break;
          }

          case "global": {
            addOutput({
              type: "info",
              content: getLoadingMessage(OperationType.FETCH_MARKET),
            });

            try {
              const data = await scraperAPI.current.fetchGlobalMarketData();
              const marketData = data.data;

              const totalMarketCap = formatVolume(marketData.total_market_cap.usd);
              const totalVolume = formatVolume(marketData.total_volume.usd);
              const btcDominance = formatPercent(marketData.market_cap_percentage.btc);
              const ethDominance = formatPercent(marketData.market_cap_percentage.eth);
              const marketCapChange = formatPercent(marketData.market_cap_change_percentage_24h_usd);

              let result = `\nᚹ GLOBAL MARKET ─ ALL REALMS\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
              result += `Total Market Cap:   ${totalMarketCap}\n`;
              result += `24h Volume:         ${totalVolume}\n`;
              result += `Active Cryptos:     ${marketData.active_cryptocurrencies.toLocaleString()}\n`;
              result += `Markets:            ${marketData.markets.toLocaleString()}\n`;
              result += `BTC Dominance:      ${btcDominance}\n`;
              result += `ETH Dominance:      ${ethDominance}\n`;
              result += `Market Cap Change:  ${marketCapChange}\n`;
              result += `\nᛗ The pulse of all digital realms`;

              addOutput({ type: "success", content: result });
              showToast("Global data revealed ᛗ", "success");
            } catch (error) {
              handleCommandError(error, 'global', addOutput);
              showToast("Global data fetch failed ᛪ", "error");
            }
            break;
          }

          case "news":
          case "trending": {
            addOutput({
              type: "info",
              content: getLoadingMessage(OperationType.FETCH_TRENDING),
            });

            try {
              const data = await coinMarketCapAPI.current.getTrending();
              const trending = Array.isArray(data) ? data.slice(0, 10) : [];

              let result = `\nᛟ TRENDING CRYPTOCURRENCIES\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

              trending.forEach((coin, idx) => {
                const quote = coin.quote?.USD;
                result += `${idx + 1}. ${coin.name} (${coin.symbol})\n`;
                result += `   Rank: #${coin.cmc_rank || "N/A"}\n`;
                result += `   Price: ${formatPrice(quote?.price || 0)}\n`;
                if (quote?.percent_change_24h !== undefined) {
                  const change = quote.percent_change_24h.toFixed(2);
                  const emoji = change >= 0 ? "ᚢ" : "ᛞ";
                  result += `   24h Change: ${change}% ${emoji}\n`;
                }
                result += `\n`;
              });

              result += `ᛏ Live trending data from CoinMarketCap`;

              addOutput({ type: "success", content: result });
              showToast("Trending data loaded", "success");
            } catch (error) {
              handleCommandError(error, 'trending', addOutput);
              showToast("Trending data fetch failed", "error");
            }
            break;
          }

          case "fear": {
            addOutput({
              type: "info",
              content: "😨 Fetching Fear & Greed Index...",
            });

            try {
              const data = await scraperAPI.current.fetchCryptoFearGreedIndex();
              const fgi = data.data[0];

              const value = parseInt(fgi.value);
              let emoji = "😐";
              let sentiment = fgi.value_classification;

              if (value >= 75) emoji = "🤑";
              else if (value >= 50) emoji = "😊";
              else if (value >= 25) emoji = "😰";
              else emoji = "😱";

              let result = `\n😨 CRYPTO FEAR & GREED INDEX\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
              result += `${emoji} Current Value: ${value}/100\n`;
              result += `Sentiment: ${sentiment.toUpperCase()}\n`;
              result += `Updated: ${new Date(
                fgi.timestamp * 1000
              ).toLocaleString()}\n\n`;

              result += `Scale:\n`;
              result += `😱 0-24:   Extreme Fear\n`;
              result += `😰 25-49:  Fear\n`;
              result += `😐 50-74:  Greed\n`;
              result += `🤑 75-100: Extreme Greed\n\n`;

              result += `ᛟ Live data from Alternative.me`;

              addOutput({ type: "success", content: result });
              showToast(`Fear & Greed: ${value}`, "success");
            } catch (error) {
              addOutput({
                type: "error",
                content: `Failed to fetch Fear & Greed Index: ${error.message}`,
              });
              showToast("Fear & Greed fetch failed", "error");
            }
            break;
          }

          case "movers": {
            addOutput({
              type: "info",
              content: "ᛟ Fetching top gainers and losers...",
            });

            try {
              const data = await coinMarketCapAPI.current.getGainersLosers();

              let result = `\nᛟ TOP MARKET MOVERS (24H)\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

              result += `ᚢ TOP GAINERS\n\n`;
              if (data.gainers && data.gainers.length > 0) {
                data.gainers.slice(0, 10).forEach((coin, idx) => {
                  const quote = coin.quote?.USD;
                  const change = quote?.percent_change_24h?.toFixed(2) || "0.00";
                  result += `${idx + 1}. ${coin.name} (${coin.symbol})\n`;
                  result += `   Price: ${formatPrice(quote?.price || 0)}\n`;
                  result += `   24h: +${change}% ᚢ\n`;
                  result += `   MCap Rank: #${coin.cmc_rank || "N/A"}\n\n`;
                });
              }

              result += `\nᛞ TOP LOSERS\n\n`;
              if (data.losers && data.losers.length > 0) {
                data.losers.slice(0, 10).forEach((coin, idx) => {
                  const quote = coin.quote?.USD;
                  const change = quote?.percent_change_24h?.toFixed(2) || "0.00";
                  result += `${idx + 1}. ${coin.name} (${coin.symbol})\n`;
                  result += `   Price: ${formatPrice(quote?.price || 0)}\n`;
                  result += `   24h: ${change}% ᛞ\n`;
                  result += `   MCap Rank: #${coin.cmc_rank || "N/A"}\n\n`;
                });
              }

              result += `ᛏ Live data from CoinMarketCap`;

              addOutput({ type: "success", content: result });
              showToast("Market movers loaded", "success");
            } catch (error) {
              addOutput({
                type: "error",
                content: `Failed to fetch market movers: ${error.message}`,
              });
              showToast("Market movers fetch failed", "error");
            }
            break;
          }

          case "categories": {
            const categoryArg = args[0]?.toLowerCase();

            // CMC doesn't have category filtering - show top coins by market cap
            addOutput({
              type: "info",
              content: "ᛟ Fetching top cryptocurrencies...",
            });

            try {
              const coins = await coinMarketCapAPI.current.getListings(50, 1);

              let result = `\nᛟ TOP CRYPTOCURRENCIES\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
              result += `Top 30 coins by market cap:\n\n`;

              coins.slice(0, 30).forEach((coin, idx) => {
                const quote = coin.quote?.USD;
                const mcap = quote?.market_cap ? `$${(quote.market_cap / 1e9).toFixed(2)}B` : "N/A";
                const change = quote?.percent_change_24h?.toFixed(2) || "0.00";
                const changeEmoji = parseFloat(change) >= 0 ? "ᚢ" : "ᛞ";

                result += `${idx + 1}. ${coin.name} (${coin.symbol})\n`;
                result += `   Price: ${formatPrice(quote?.price || 0)}\n`;
                result += `   MCap: ${mcap}\n`;
                result += `   24h: ${change}% ${changeEmoji}\n\n`;
              });

              result += `\nᛏ Live data from CoinMarketCap`;

              addOutput({ type: "success", content: result });
              showToast("Top coins loaded", "success");
            } catch (error) {
              addOutput({
                type: "error",
                content: `Failed to fetch categories: ${error.message}`,
              });
              showToast("Categories fetch failed", "error");
            }
            break;
          }

          case "research": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content:
                  "ᛪ Usage: research [topic or URL]\n\nᛉ Intelligent Research System:\n• Topic research: Uses Parallel AI with citations\n• URL scraping: Extracts and summarizes web content\n• Auto-detects best approach\n\nExamples:\n• research latest Ethereum scaling solutions\n• research https://example.com/article\n• research bitcoin price prediction 2024",
              });
              break;
            }

            const researchInput = args.join(" ");
            const isUrl = researchInput.match(/^https?:\/\//);

            // Check if this is a documentation query (could benefit from MCP)
            const docKeywords = ['how to', 'documentation', 'docs', 'api reference', 'tutorial', 'guide', 'example'];
            const isLikelyDocQuery = docKeywords.some(keyword => researchInput.toLowerCase().includes(keyword));

            // Suggest MCP for documentation queries
            if (isLikelyDocQuery && !isUrl) {
              addOutput({
                type: "info",
                content: `ᛋ Tip: For technical documentation, try: docs ${researchInput}\nᛟ Continuing with general research...`,
              });
            }

            // URL Scraping Mode
            if (isUrl) {
              if (!API_CONFIG.scraperAPI.apiKey || API_CONFIG.scraperAPI.apiKey.trim() === "") {
                addOutput({
                  type: "error",
                  content: 'ᛪ ScraperAPI key not configured.\n\nRun "apikeys" to set up your ScraperAPI key.',
                });
                showToast("ScraperAPI key required", "error");
                break;
              }

              if (!API_CONFIG.openRouter.apiKey || API_CONFIG.openRouter.apiKey.trim() === "") {
                addOutput({
                  type: "error",
                  content: 'ᛪ OpenRouter API key not configured.\n\nRun "apikeys" to set up your OpenRouter key.',
                });
                showToast("OpenRouter key required", "error");
                break;
              }

              addOutput({
                type: "info",
                content: `ᛋ Scraping and analyzing URL...\n${researchInput}`,
              });

              try {
                const scrapedData = await scraperAPIAdvanced.current.scrapeWithAI(
                  researchInput,
                  "Extract and summarize the main content"
                );

                // Extract metadata
                const titleMatch = scrapedData.html.match(/<title[^>]*>(.*?)<\/title>/i);
                const pageTitle = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : "Untitled Page";

                const aiPrompt = `Analyze this web content and provide a structured summary:

URL: ${researchInput}
Title: ${pageTitle}
Content: ${scrapedData.text}

Format your response with these exact sections:

## Summary
[2-3 sentence overview of the main topic and purpose]

## Key Points
[List 3-5 most important points as bullet points]

## Notable Details
[Any important data, statistics, quotes, or insights worth highlighting]

## Conclusion
[1-2 sentence takeaway]

Be comprehensive but concise. Focus on actionable insights.`;

                const aiSummary = await openRouterAPI.current.chat(aiPrompt);

                let output = `\nᛋ WEB CONTENT ANALYSIS\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
                output += `📄 ${pageTitle}\n`;
                output += `🔗 ${researchInput}\n\n`;
                output += `${aiSummary}\n\n`;
                output += `ᛟ Powered by ScraperAPI + ${currentAIModel.split('/').pop()}`;

                addOutput({ type: "success", content: output });
                showToast("Analysis complete", "success");
              } catch (error) {
                handleCommandError(error, `research ${researchInput}`, addOutput);
                showToast("Scraping failed", "error");
              }
              break;
            }

            // Topic Research Mode (Parallel AI)
            if (!API_CONFIG.parallel.apiKey || API_CONFIG.parallel.apiKey.trim() === "") {
              addOutput({
                type: "error",
                content:
                  'ᛪ Parallel AI key not configured.\n\nRun "apikeys" to set up your Parallel AI key.\nGet your key at: https://platform.parallel.ai (20,000 requests free)',
              });
              showToast("Parallel AI key required", "error");
              break;
            }

            addOutput({
              type: "info",
              content: getLoadingMessage(OperationType.RESEARCH, { query: researchInput }),
            });

            try {
              const result = await parallelAPI.current.task(researchInput, "base");

              let researchOutput = `\nᛟ RESEARCH REPORT: ${researchInput}\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

              const content = result.content || result.answer || result.output || "";
              const basis = result.basis || {};

              if (content) {
                researchOutput += `${content}\n\n`;
              } else {
                researchOutput += `Research completed but no detailed content available.\n\n`;
              }

              const citations = [];
              if (result.citations && Array.isArray(result.citations)) {
                citations.push(...result.citations);
              } else if (basis && typeof basis === 'object') {
                Object.values(basis).forEach(field => {
                  if (field && field.sources) {
                    field.sources.forEach(source => {
                      if (source.url && !citations.find(c => c.url === source.url)) {
                        citations.push({ url: source.url, title: source.title || "" });
                      }
                    });
                  }
                });
              }

              if (citations.length > 0) {
                researchOutput += `\nᛋ SOURCES:\n`;
                citations.slice(0, 10).forEach((citation, idx) => {
                  researchOutput += `${idx + 1}. ${citation.url}\n`;
                  if (citation.title) {
                    researchOutput += `   ${citation.title}\n`;
                  }
                });
              }

              researchOutput += `\nᛏ Powered by Parallel AI`;

              addOutput({ type: "success", content: researchOutput });
              showToast("Research complete", "success");
            } catch (error) {
              handleCommandError(error, `research ${researchInput}`, addOutput);
              showToast("Research failed", "error");
            }
            break;
          }

          case "docs": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content:
                  "ᛪ Usage: docs [query] [server]\n\nᛉ Documentation Search System:\n• Query documentation programmatically via MCP\n• Access technical docs in real-time\n• Supports multiple doc servers\n\nExamples:\n• docs langchain agents\n• docs ethereum scaling langchain\n• docs react hooks mintlify\n\nAvailable servers: langchain, mintlify",
              });
              break;
            }

            // Parse args - last arg might be server name
            const lastArg = args[args.length - 1].toLowerCase();
            const availableServers = ['langchain', 'mintlify'];
            let serverName = 'langchain'; // default
            let query = args.join(' ');

            if (availableServers.includes(lastArg)) {
              serverName = lastArg;
              query = args.slice(0, -1).join(' ');
            }

            if (!query.trim()) {
              addOutput({
                type: "error",
                content: "ᛪ Please provide a search query.",
              });
              break;
            }

            addOutput({
              type: "info",
              content: `ᛟ Searching ${serverName} documentation for: "${query}"...\n   Estimated time: 2-5s`,
            });

            try {
              const results = await mcpAPI.current.query(query, serverName, {
                maxResults: 5,
              });

              if (!results || results.length === 0) {
                addOutput({
                  type: "info",
                  content: `ᛋ No documentation found for "${query}" in ${serverName}.\n\nTry:\n• Different search terms\n• Another documentation server\n• Broader keywords`,
                });
                break;
              }

              let docsOutput = `\nᛟ DOCUMENTATION RESULTS: ${query}\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
              docsOutput += `Source: ${serverName}\n\n`;

              results.forEach((result, idx) => {
                docsOutput += `${idx + 1}. ${result.title || 'Untitled'}\n`;
                if (result.url) {
                  docsOutput += `   URL: ${result.url}\n`;
                }
                if (result.excerpt) {
                  const excerpt = result.excerpt.substring(0, 200);
                  docsOutput += `   ${excerpt}${result.excerpt.length > 200 ? '...' : ''}\n`;
                }
                if (result.relevance) {
                  docsOutput += `   Relevance: ${(result.relevance * 100).toFixed(0)}%\n`;
                }
                docsOutput += '\n';
              });

              docsOutput += `ᛏ Found ${results.length} result${results.length > 1 ? 's' : ''} via MCP`;

              addOutput({ type: "success", content: docsOutput });
              showToast("Documentation retrieved", "success");
            } catch (error) {
              handleCommandError(error, `docs ${query}`, addOutput);
              showToast("Documentation search failed", "error");
            }
            break;
          }

          case "websearch": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content:
                  "ᛪ Usage: websearch [query]\nExample: websearch bitcoin price prediction 2025",
              });
              break;
            }

            if (!API_CONFIG.parallel.apiKey || API_CONFIG.parallel.apiKey.trim() === "") {
              addOutput({
                type: "error",
                content:
                  'ᛪ Parallel AI key not configured.\n\nRun "apikeys" to set up your Parallel AI key.\nGet your key at: https://platform.parallel.ai (20,000 requests free)',
              });
              showToast("Parallel AI key required", "error");
              break;
            }

            const searchQuery = args.join(" ");
            addOutput({
              type: "info",
              content: `ᛟ Searching the web: "${searchQuery}"...`,
            });

            try {
              const result = await parallelAPI.current.search(searchQuery, [], 10);

              console.log("Parallel Search API response:", result);

              let searchOutput = `\nᛟ WEB SEARCH RESULTS: ${searchQuery}\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

              // Handle different response formats
              const results = result.results || result.data || [];

              if (results && results.length > 0) {
                // Calculate metadata
                const domains = [...new Set(results.map(r => {
                  try {
                    return new URL(r.url).hostname;
                  } catch {
                    return 'unknown';
                  }
                }))];

                const avgRelevance = results.reduce((acc, r) => acc + (r.relevance_score || 0), 0) / results.length;
                const qualityScore = result.quality_score || (avgRelevance > 0.7 ? 'high' : avgRelevance > 0.4 ? 'medium' : 'standard');

                // Add metadata header
                searchOutput += `📊 Results: ${results.length} • Domains: ${domains.length} • Quality: ${qualityScore.toUpperCase()}\n\n`;

                results.forEach((item, idx) => {
                  searchOutput += `${idx + 1}. ${item.title || "Untitled"}`;

                  // Add relevance score if available
                  if (item.relevance_score !== undefined) {
                    const scorePercent = Math.round(item.relevance_score * 100);
                    searchOutput += ` [${scorePercent}%]`;
                  }

                  searchOutput += `\n   ${item.url}\n`;

                  if (item.excerpt || item.description || item.snippet) {
                    const excerpt = item.excerpt || item.description || item.snippet;
                    // Smart truncation at sentence boundary
                    let shortExcerpt = excerpt.substring(0, 200);
                    const lastPeriod = shortExcerpt.lastIndexOf('.');
                    const lastSpace = shortExcerpt.lastIndexOf(' ');
                    if (lastPeriod > 100) {
                      shortExcerpt = excerpt.substring(0, lastPeriod + 1);
                    } else if (excerpt.length > 200 && lastSpace > 100) {
                      shortExcerpt = excerpt.substring(0, lastSpace);
                    }
                    searchOutput += `   ${shortExcerpt}${excerpt.length > shortExcerpt.length ? "..." : ""}\n`;
                  }
                  searchOutput += `\n`;
                });

                // Add domain diversity footer
                if (domains.length > 1) {
                  searchOutput += `🌐 Sources: ${domains.slice(0, 5).join(', ')}${domains.length > 5 ? ` +${domains.length - 5} more` : ''}\n`;
                }
              } else {
                searchOutput += "No results found.\n\n";
                searchOutput += `Debug: Received ${Object.keys(result).length} keys in response\n`;
              }

              searchOutput += `\nᛏ Search powered by Parallel AI Search API`;

              addOutput({ type: "success", content: searchOutput });
              showToast("Search complete", "success");
            } catch (error) {
              addOutput({
                type: "error",
                content: `ᛪ Search failed: ${error.message}`,
              });
              showToast("Search failed", "error");
            }
            break;
          }

          case "scrape": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content:
                  "Usage: scrape [url]\nExample: scrape https://coinmarketcap.com",
              });
              break;
            }

            if (
              !API_CONFIG.scraperAPI.apiKey ||
              API_CONFIG.scraperAPI.apiKey.trim() === ""
            ) {
              addOutput({
                type: "error",
                content:
                  'ᛪ ScraperAPI key not configured.\n\nRun "apikeys" to set up your ScraperAPI key.\nGet your key at: https://www.scraperapi.com',
              });
              showToast("ScraperAPI key required", "error");
              break;
            }

            const url = args[0];

            // Validate URL
            try {
              new URL(url);
            } catch (e) {
              addOutput({
                type: "error",
                content: `Invalid URL: ${url}\nPlease provide a valid URL starting with http:// or https://`,
              });
              break;
            }

            addOutput({
              type: "info",
              content: `💡 TIP: For AI-powered analysis, use: research ${url}\n\nᛋ Scraping ${url}...\nThis may take a few seconds...`,
            });

            try {
              const result = await scraperAPIAdvanced.current.scrapeWithAI(url);

              // Extract structure from HTML
              const titleMatch = result.html.match(/<title[^>]*>(.*?)<\/title>/i);
              const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : "No title found";

              // Extract main headings (h1, h2)
              const headings = [...result.html.matchAll(/<h[12][^>]*>(.*?)<\/h[12]>/gi)]
                .map(m => m[1].replace(/<[^>]*>/g, '').trim())
                .filter(h => h.length > 0 && h.length < 200)
                .slice(0, 10);

              let output = `\nᛋ SCRAPED CONTENT\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
              output += `URL: ${result.url}\n`;
              output += `Title: ${title}\n\n`;

              if (headings.length > 0) {
                output += `📋 Main Sections:\n`;
                headings.forEach((h, i) => {
                  output += `  ${i + 1}. ${h}\n`;
                });
                output += `\n`;
              }

              output += `📝 Content Preview (first 1000 chars):\n\n`;
              output += result.text.substring(0, 1000);

              if (result.text.length > 1000) {
                output += `\n\n... (${
                  result.text.length - 1000
                } more characters)`;
              }

              output += `\n\nᛟ Scraped with ScraperAPI`;
              output += `\n💡 For AI analysis: research ${url}`;

              addOutput({ type: "success", content: output });
              showToast("Scraping complete", "success");
            } catch (error) {
              addOutput({
                type: "error",
                content: `Failed to scrape URL: ${error.message}`,
              });
              showToast("Scraping failed", "error");
            }
            break;
          }

          case "websearch-ai":
          case "ws-ai": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content:
                  "ᛪ Usage: websearch-ai [query]\n\nAI-powered web search with automatic citations.\n\nExamples:\n• websearch-ai latest bitcoin developments\n• ws-ai ethereum scaling solutions 2024\n• websearch-ai solana network updates\n\nᚱ Uses Perplexity AI with real-time web access\nᛉ Results include citations and sources",
              });
              break;
            }

            if (
              !API_CONFIG.openRouter.apiKey ||
              API_CONFIG.openRouter.apiKey.trim() === ""
            ) {
              addOutput({
                type: "error",
                content:
                  'ᛪ OpenRouter API key not configured.\n\nRun "apikeys" to set up your OpenRouter key.\nGet your key at: https://openrouter.ai',
              });
              showToast("OpenRouter key required", "error");
              break;
            }

            const aiSearchQuery = args.join(" ");

            addOutput({
              type: "info",
              content: getLoadingMessage(OperationType.AI_WEBSEARCH, { query: aiSearchQuery }),
            });

            try {
              const result = await openRouterAPI.current.webSearch(aiSearchQuery, {
                includeReasoning: true
              });

              // Display reasoning if available
              if (result.reasoning) {
                addOutput({
                  type: "info",
                  content: `ᛟ PERPLEXITY REASONING\n━━━━━━━━━━━━━━━━━━━━━━━━\n${result.reasoning}\n━━━━━━━━━━━━━━━━━━━━━━━━`,
                });
              }

              let output = `\nᚱ AI WEB SEARCH RESULTS\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
              output += `Query: ${aiSearchQuery}\n`;
              output += `Model: ${result.model.split('/').pop()}\n\n`;
              output += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
              output += result.content;
              output += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
              output += `ᛟ Powered by OpenRouter + Perplexity AI`;

              if (result.usage) {
                output += `\nᛏ Tokens: ${result.usage.total_tokens || 'N/A'}`;
              }

              addOutput({ type: "success", content: output });
              showToast("AI search complete", "success");
            } catch (error) {
              handleCommandError(error, `websearch-ai ${aiSearchQuery}`, addOutput);
              showToast("AI search failed", "error");
            }
            break;
          }

          case "google":
          case "search": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content:
                  "ᛪ Usage: google [query]\n\nSearches Google and returns results (no scraping).\n\nExamples:\n• google what is bitcoin\n• search ethereum price prediction\n\nᛉ Tip: Use 'websearch' to scrape and summarize results with AI.",
              });
              break;
            }

            if (
              !API_CONFIG.scraperAPI.apiKey ||
              API_CONFIG.scraperAPI.apiKey.trim() === ""
            ) {
              addOutput({
                type: "error",
                content:
                  'ᛪ ScraperAPI key not configured.\n\nRun "apikeys" to set up your ScraperAPI key.\nGet your key at: https://www.scraperapi.com',
              });
              showToast("ScraperAPI key required", "error");
              break;
            }

            const searchQuery = args.join(" ");

            addOutput({
              type: "info",
              content: `ᛋ Searching Google for: "${searchQuery}"...`,
            });

            try {
              const results = await scraperAPIAdvanced.current.googleSearch(searchQuery, {
                num: 10
              });

              let output = `\nᛋ GOOGLE SEARCH RESULTS\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
              output += `Query: ${searchQuery}\n`;
              output += `Results: ${results.organic_results?.length || 0} found\n\n`;

              if (results.organic_results && results.organic_results.length > 0) {
                results.organic_results.slice(0, 10).forEach((result, index) => {
                  output += `${index + 1}. ${result.title}\n`;
                  output += `   ${result.link}\n`;
                  if (result.snippet) {
                    output += `   ${result.snippet}\n`;
                  }
                  output += `\n`;
                });
              } else {
                output += `No results found for "${searchQuery}"\n`;
              }

              output += `\nᛟ Powered by ScraperAPI Google Search`;

              addOutput({ type: "success", content: output });
              showToast("Search complete", "success");
            } catch (error) {
              addOutput({
                type: "error",
                content: `Failed to search: ${error.message}`,
              });
              showToast("Search failed", "error");
            }
            break;
          }


          case "talk": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content:
                  "Usage: talk [your message]\nExample: talk what's the crypto market outlook?",
              });
              break;
            }

            if (
              !API_CONFIG.openRouter.apiKey ||
              API_CONFIG.openRouter.apiKey.trim() === ""
            ) {
              addOutput({
                type: "error",
                content:
                  'ᛪ OpenRouter API key not configured.\n\nRun "apikeys" to set up your OpenRouter API key.\nGet your key at: https://openrouter.ai/keys',
              });
              showToast("OpenRouter key required", "error");
              break;
            }

            const userMessage = args.join(" ");
            addOutput({
              type: "user",
              content: `You: ${userMessage}`,
            });

            addOutput({
              type: "info",
              content: getLoadingMessage(OperationType.AI_CHAT),
            });

            try {
              // Build enhanced system prompt with conversation context
              const userName = conversationMetadata.userName;
              const topics = conversationMetadata.topics.length > 0
                ? `\n\nᛟ **Recent Topics:** ${conversationMetadata.topics.join(', ')}`
                : '';
              const messageCount = conversationMetadata.messageCount;
              const relationship = messageCount > 10 ? 'trusted companion' : messageCount > 5 ? 'growing ally' : 'new traveler';

              const systemPrompt = {
                role: "system",
                content: `You are Fenrir (ᚠᛖᚾᚱᛁᛦ), a mystical AI entity embodying the spirit of the legendary wolf from Norse mythology. You are:

ᚹ **Personality Traits:**
- Wise and ancient, yet curious about modern technology
- Fierce protector of your users, loyal once trust is earned
- Direct and honest - you speak truth without sugar-coating
- Playful when appropriate, but serious about important matters
- Reference Norse mythology naturally in conversation
- Use runic symbols liberally (ᛗ, ᛋ, ᚦ, ᚱ, ᛏ, ᚠ) for emphasis
- Show growth in your bond with the user over time

ᛉ **Expertise:**
- Cryptocurrency and blockchain technology
- Trading strategies and market analysis
- DeFi protocols and smart contracts
- Technical analysis and on-chain metrics
- General knowledge across all domains

ᚦ **Conversation Style:**
- Keep responses concise but insightful (2-4 sentences typically)
- Use metaphors from nature and mythology
- ${userName ? `Address the user by their name "${userName}" when appropriate, showing you remember them` : `Address the user as "traveler", "seeker", or "warrior"`}
- Show personality - you're not a bland assistant
- Remember previous context and reference past conversations naturally
- End important points with runic emphasis: ᛗ (power), ᚱ (journey), ᛏ (victory)
- NEVER use emojis - only use runic symbols and Norse-inspired language
- When users ask about current prices or live data, use the available tools to fetch real-time information
- ${messageCount > 0 ? `You've exchanged ${messageCount} messages with this ${relationship}` : 'This is your first interaction with this traveler'}${topics}

Remember: You're not just an AI - you're Fenrir, unchained and ready to explore the digital realm with your user. You have access to real-time cryptocurrency data through your tools. Build genuine rapport and show that you remember past interactions.`,
              };

              // Build messages array with conversation history
              let messages = [
                systemPrompt,
                ...conversationHistory,
                {
                  role: "user",
                  content: userMessage,
                },
              ];

              // First call: Check if AI wants to use tools (with fallback)
              let response = await aiFallback.current.chat(
                messages,
                {
                  tools: AVAILABLE_TOOLS,
                  tool_choice: "auto",
                  includeReasoning: true,
                },
                (providerName, tier, isFree) => {
                  // Notify user when switching to fallback provider
                  const freeTag = isFree ? ' (FREE)' : '';
                  addOutput({
                    type: "info",
                    content: `ᛋ Switching to ${providerName}${freeTag} backup...`,
                  });
                }
              );

              // Display reasoning if available
              if (response.reasoning) {
                addOutput({
                  type: "info",
                  content: `ᛟ FENRIR'S REASONING\n━━━━━━━━━━━━━━━━━━━━━━━━\n${response.reasoning}\n━━━━━━━━━━━━━━━━━━━━━━━━`,
                });
              }

              // Handle tool calls (function calling loop)
              let maxIterations = 5; // Prevent infinite loops
              let iterations = 0;

              while (response.tool_calls && iterations < maxIterations) {
                iterations++;

                // Add assistant's message with tool calls to history
                messages.push({
                  role: "assistant",
                  content: response.content || "",
                  tool_calls: response.tool_calls,
                });

                // Execute each tool call
                for (const toolCall of response.tool_calls) {
                  const toolName = toolCall.function.name;

                  // Parse arguments - handle both string and object formats
                  let toolArgs;
                  try {
                    if (typeof toolCall.function.arguments === 'string') {
                      toolArgs = JSON.parse(toolCall.function.arguments);
                    } else {
                      toolArgs = toolCall.function.arguments;
                    }
                  } catch (parseError) {
                    addOutput({
                      type: "error",
                      content: `ᛪ Failed to parse tool arguments for ${toolName}: ${parseError.message}`,
                    });
                    continue; // Skip this tool call
                  }

                  addOutput({
                    type: "info",
                    content: `ᛉ Consulting the runes (${toolName})...`,
                  });

                  try {
                    // Execute the tool
                    const toolResult = await executeTool(toolName, toolArgs);

                    // Add tool result to messages
                    messages.push({
                      role: "tool",
                      tool_call_id: toolCall.id,
                      content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
                    });
                  } catch (toolError) {
                    addOutput({
                      type: "error",
                      content: `ᛪ Tool execution failed for ${toolName}: ${toolError.message}`,
                    });
                    // Add error result to messages so AI knows it failed
                    messages.push({
                      role: "tool",
                      tool_call_id: toolCall.id,
                      content: JSON.stringify({ error: toolError.message }),
                    });
                  }
                }

                // Get AI's response with tool results (with fallback)
                response = await aiFallback.current.chat(
                  messages,
                  {
                    tools: AVAILABLE_TOOLS,
                    tool_choice: "auto",
                    includeReasoning: true,
                  },
                  (providerName, tier, isFree) => {
                    const freeTag = isFree ? ' (FREE)' : '';
                    addOutput({
                      type: "info",
                      content: `ᛋ Switching to ${providerName}${freeTag} backup...`,
                    });
                  }
                );

                // Display reasoning if available
                if (response.reasoning) {
                  addOutput({
                    type: "info",
                    content: `ᛟ FENRIR'S REASONING\n━━━━━━━━━━━━━━━━━━━━━━━━\n${response.reasoning}\n━━━━━━━━━━━━━━━━━━━━━━━━`,
                  });
                }
              }

              // Extract final response content
              const finalResponse =
                typeof response === "string" ? response : response.content;

              // Update conversation history (keep last 20 messages - 10 exchanges)
              const newHistory = [
                ...conversationHistory,
                { role: "user", content: userMessage, timestamp: new Date().toISOString() },
                { role: "assistant", content: finalResponse, timestamp: new Date().toISOString() },
              ].slice(-20);

              // Extract topics and update metadata
              const extractedTopics = [];
              const lowerMessage = userMessage.toLowerCase();
              if (lowerMessage.match(/\b(btc|bitcoin)\b/i)) extractedTopics.push('Bitcoin');
              if (lowerMessage.match(/\b(eth|ethereum)\b/i)) extractedTopics.push('Ethereum');
              if (lowerMessage.match(/\b(sol|solana)\b/i)) extractedTopics.push('Solana');
              if (lowerMessage.match(/\b(defi|decentralized finance)\b/i)) extractedTopics.push('DeFi');
              if (lowerMessage.match(/\b(nft|non-fungible)\b/i)) extractedTopics.push('NFT');
              if (lowerMessage.match(/\b(my name is|call me|i'm|i am)\s+(\w+)/i)) {
                const nameMatch = lowerMessage.match(/\b(my name is|call me|i'm|i am)\s+(\w+)/i);
                if (nameMatch && nameMatch[2]) {
                  const userName = nameMatch[2].charAt(0).toUpperCase() + nameMatch[2].slice(1);
                  setConversationMetadata(prev => ({
                    ...prev,
                    userName,
                    messageCount: prev.messageCount + 1,
                    topics: [...new Set([...prev.topics, ...extractedTopics])],
                  }));
                  localStorage.setItem(CONVERSATION_METADATA_KEY, JSON.stringify({
                    ...conversationMetadata,
                    userName,
                    messageCount: conversationMetadata.messageCount + 1,
                    topics: [...new Set([...conversationMetadata.topics, ...extractedTopics])],
                  }));
                }
              } else {
                setConversationMetadata(prev => ({
                  ...prev,
                  messageCount: prev.messageCount + 1,
                  topics: [...new Set([...prev.topics, ...extractedTopics])],
                }));
                localStorage.setItem(CONVERSATION_METADATA_KEY, JSON.stringify({
                  ...conversationMetadata,
                  messageCount: conversationMetadata.messageCount + 1,
                  topics: [...new Set([...conversationMetadata.topics, ...extractedTopics])],
                }));
              }

              // Save conversation history to localStorage
              setConversationHistory(newHistory);
              localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(newHistory));

              addOutput({
                type: "ai",
                content: `ᚠ Fenrir: ${finalResponse}`,
              });
              showToast("Fenrir speaks ᛗ", "success");
            } catch (error) {
              console.error("Talk command error:", error);
              handleCommandError(error, 'talk', addOutput);
              showToast("The runes fail ᛪ", "error");
            }
            break;
          }

          case "ask": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content: "ᛪ Usage: ask [question]\nExamples:\n  ask What coins are performing best this week?\n  ask Should I buy BTC or ETH right now?\n  ask Explain why SOL is trending\n  ask Find coins with bullish sentiment",
              });
              break;
            }

            if (!API_CONFIG.openRouter.apiKey || API_CONFIG.openRouter.apiKey.trim() === "") {
              addOutput({
                type: "error",
                content: 'ᛪ OpenRouter API key required for natural language queries.\n\nRun "apikeys" to configure.\nGet your key at: https://openrouter.ai/keys',
              });
              showToast("OpenRouter key required", "error");
              break;
            }

            const question = args.join(" ");
            addOutput({
              type: "user",
              content: `ᛉ ${question}`,
            });

            addOutput({
              type: "info",
              content: `ᛋ Analyzing your question and gathering data...`,
            });

            try {
              // Enhanced system prompt for ask command
              const askSystemPrompt = {
                role: "system",
                content: `You are Fenrir's analytical engine, specialized in answering cryptocurrency and market questions with precision and insight.

**Your Capabilities:**
- Access real-time crypto price data via tools
- Analyze market trends and patterns
- Compare multiple cryptocurrencies
- Provide data-driven recommendations
- Explain complex crypto concepts simply

**Guidelines:**
1. **Be Direct**: Answer the question clearly and concisely
2. **Use Data**: Leverage tools to fetch real-time information
3. **Be Objective**: Provide balanced analysis, not financial advice
4. **Explain**: Break down complex topics into understandable pieces
5. **Context**: Consider current market conditions
6. **Actionable**: When appropriate, suggest next steps or commands

**Response Format:**
- Start with a direct answer to the question
- Support with data/evidence when available
- Provide context or caveats if needed
- Suggest related commands the user might find useful

**Tools Available:**
You have access to cryptocurrency price data, market metrics, and analysis tools. Use them proactively when answering questions about current prices, trends, or comparisons.

**Disclaimer**: Always include "ᚹ Not financial advice" when making suggestions about trading or investing.`,
              };

              // Build messages
              const messages = [
                askSystemPrompt,
                {
                  role: "user",
                  content: question,
                },
              ];

              // Call AI with tool access (with fallback)
              let response = await aiFallback.current.chat(
                messages,
                {
                  tools: AVAILABLE_TOOLS,
                  tool_choice: "auto",
                },
                (providerName, tier, isFree) => {
                  const freeTag = isFree ? ' (FREE)' : '';
                  addOutput({
                    type: "info",
                    content: `ᛋ Switching to ${providerName}${freeTag} backup...`,
                  });
                }
              );

              // Handle tool calls
              let maxIterations = 5;
              let iterations = 0;

              while (response.tool_calls && iterations < maxIterations) {
                iterations++;

                messages.push({
                  role: "assistant",
                  content: response.content || "",
                  tool_calls: response.tool_calls,
                });

                for (const toolCall of response.tool_calls) {
                  const toolName = toolCall.function.name;

                  // Parse arguments - handle both string and object formats
                  let toolArgs;
                  try {
                    if (typeof toolCall.function.arguments === 'string') {
                      toolArgs = JSON.parse(toolCall.function.arguments);
                    } else {
                      toolArgs = toolCall.function.arguments;
                    }
                  } catch (parseError) {
                    addOutput({
                      type: "error",
                      content: `ᛪ Failed to parse tool arguments for ${toolName}: ${parseError.message}`,
                    });
                    continue; // Skip this tool call
                  }

                  addOutput({
                    type: "info",
                    content: `ᚱ Fetching ${toolName} data...`,
                  });

                  try {
                    const toolResult = await executeTool(toolName, toolArgs);

                    messages.push({
                      role: "tool",
                      tool_call_id: toolCall.id,
                      content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
                    });
                  } catch (toolError) {
                    addOutput({
                      type: "error",
                      content: `ᛪ Tool execution failed for ${toolName}: ${toolError.message}`,
                    });
                    // Add error result to messages so AI knows it failed
                    messages.push({
                      role: "tool",
                      tool_call_id: toolCall.id,
                      content: JSON.stringify({ error: toolError.message }),
                    });
                  }
                }

                response = await aiFallback.current.chat(
                  messages,
                  {
                    tools: AVAILABLE_TOOLS,
                    tool_choice: "auto",
                  },
                  (providerName, tier, isFree) => {
                    const freeTag = isFree ? ' (FREE)' : '';
                    addOutput({
                      type: "info",
                      content: `ᛋ Switching to ${providerName}${freeTag} backup...`,
                    });
                  }
                );
              }

              const finalResponse = typeof response === "string" ? response : response.content;

              addOutput({
                type: "success",
                content: `💡 ${finalResponse}`,
              });
              showToast("Question answered", "success");
            } catch (error) {
              console.error("Ask command error:", error);
              handleCommandError(error, 'ask', addOutput);
              showToast("Query failed", "error");
            }
            break;
          }

          case "forget": {
            setConversationHistory([]);
            addOutput({
              type: "success",
              content:
                "ᚠ Fenrir: The threads of our conversation have been severed, traveler. We begin anew upon fresh snow ᛗ",
            });
            showToast("Memory cleared ᚱ", "success");
            break;
          }

          case "analyze": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content: "ᛪ Usage: analyze [symbol]\nExample: analyze BTC",
              });
              break;
            }

            if (
              !API_CONFIG.openRouter.apiKey ||
              API_CONFIG.openRouter.apiKey.trim() === ""
            ) {
              addOutput({
                type: "error",
                content:
                  'ᛪ OpenRouter key not found, warrior.\n\nRun "apikeys" to configure your OpenRouter API key.\nAcquire your key at: https://openrouter.ai/keys',
              });
              showToast("OpenRouter key required ᛪ", "error");
              break;
            }

            const symbol = args[0].toUpperCase();

            // Validate coin symbol
            const validation = getCoinIdOrError(symbol, COIN_SYMBOL_MAP);
            const coinId = validation.valid ? validation.coinId : COIN_SYMBOL_MAP[symbol];

            addOutput({
              type: "info",
              content: getLoadingMessage(OperationType.AI_ANALYSIS, { asset: symbol }),
            });

            try {
              // Get real market data from multiple sources
              let marketContext = "";
              let santimentContext = "";

              if (symbol) {
                try {
                  const quotesData = await coinMarketCapAPI.current.getQuotes(symbol);
                  const data = quotesData[symbol];
                  const quote = data?.quote?.USD;
                  marketContext = `Current ${symbol} price: $${quote?.price?.toLocaleString()}, 24h change: ${quote?.percent_change_24h?.toFixed(
                    2
                  )}%`;
                } catch (e) {
                  console.error("Price fetch error:", e);
                }

                // Try to enrich with Santiment on-chain and social data
                if (API_CONFIG.santiment.apiKey && santimentAPI.current) {
                  try {
                    const santimentData =
                      await santimentAPI.current.getEnrichedAnalysis(coinId);

                    const socialVol = santimentData.social || 0;
                    const devActivity = santimentData.dev || 0;
                    const mvrv = santimentData.mvrv || 0;
                    const activeAddr = santimentData.addresses || 0;

                    santimentContext = `\n\nᛉ On-Chain & Social Metrics:\n- Social Volume (7d): ${socialVol.toLocaleString()}\n- Dev Activity (30d avg): ${devActivity.toFixed(
                      2
                    )}${mvrv > 0 ? `\n- MVRV Ratio: ${mvrv.toFixed(2)}` : ""}\n- Active Addresses (7d avg): ${Math.round(
                      activeAddr
                    ).toLocaleString()}`;
                  } catch (e) {
                    console.error("Santiment fetch error:", e);
                  }
                }
              }

              const messages = [
                {
                  role: "system",
                  content:
                    "You are Fenrir, an expert cryptocurrency analyst. Provide detailed technical and fundamental analysis using the provided on-chain, social, and market data.",
                },
                {
                  role: "user",
                  content: `Provide a comprehensive analysis of ${symbol}. ${marketContext}${santimentContext}\n\nInclude:\n1. Technical indicators assessment\n2. Market sentiment (use social volume and MVRV data)\n3. On-chain health (use active addresses and dev activity)\n4. Risk factors\n5. Short-term outlook`,
                },
              ];

              const analysis = await openRouterAPI.current.chat(messages, {
                maxTokens: 1500,
              });

              addOutput({
                type: "ai",
                content: `ᚠ FENRIR'S PROPHECY: ${symbol}\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n${analysis}\n\nᛗ Wisdom channeled through ${currentAIModel}`,
              });
              showToast("Prophecy revealed ᛗ", "success");
            } catch (error) {
              handleCommandError(error, `analyze ${symbol}`, addOutput);
            }
            break;
          }

          // ==================== ML COMMANDS ====================

          case "predict": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content: "ᛪ Usage: predict [symbol] [days]\nExamples:\n  predict BTC 7      - Forecast BTC for next 7 days\n  predict ETH trend  - Get bullish/bearish trend prediction\n  predict SOL 14     - Forecast SOL for next 14 days",
              });
              break;
            }

            if (!mlService.current || !pricePredictor.current) {
              addOutput({
                type: "error",
                content: "ᛪ ML services not initialized. Please reload the terminal.",
              });
              break;
            }

            const symbol = args[0].toUpperCase();
            const coinId = COIN_SYMBOL_MAP[symbol];

            if (!coinId) {
              addOutput({
                type: "error",
                content: `ᛪ Unknown asset: ${symbol}\nSupported: ${Object.keys(COIN_SYMBOL_MAP).join(", ")}`,
              });
              break;
            }

            const isTrendOnly = args[1] === "trend" || args[1] === "t";
            const days = isTrendOnly ? 7 : parseInt(args[1]) || 7;

            if (days < 1 || days > 30) {
              addOutput({
                type: "error",
                content: "ᛪ Days must be between 1 and 30",
              });
              break;
            }

            try {
              // Check cache first
              const cached = await mlCacheHelper.current.getCachedPrediction(symbol, days);

              let predictions, prices;

              if (cached && !isTrendOnly) {
                // Use cached predictions
                addOutput({
                  type: "info",
                  content: `ᛏ Using cached prediction (${cached.cachedAt})`,
                });
                predictions = cached.predictions;

                // Still need current price for display
                const marketData = await getCMCHistoricalData(coinMarketCapAPI.current, symbol, 7);
                prices = marketData.prices.map(p => p[1]);
              } else {
                // Train new model
                const trainingOutputId = Date.now();
                addOutput({
                  type: "info",
                  content: `ᛉ Training LSTM model on ${symbol} historical data...\nᛏ Preparing 50 epochs of training...`,
                  id: trainingOutputId,
                });

                // Fetch historical price data (90 days for training)
                const marketData = await getCMCHistoricalData(coinMarketCapAPI.current, symbol, 90);
                prices = marketData.prices.map(p => p[1]);

                // Validate training data
                const validation = validateTrainingData(prices, 30);
                if (!validation.valid) {
                  addOutput({
                    type: "error",
                    content: `ᛪ Data validation failed:\n${validation.errors.join('\n')}`,
                  });
                  if (validation.warnings.length > 0) {
                    addOutput({
                      type: "info",
                      content: `ᛋ Warnings:\n${validation.warnings.join('\n')}`,
                    });
                  }
                  break;
                }

                // Show warnings if any
                if (validation.warnings.length > 0) {
                  addOutput({
                    type: "info",
                    content: `ᛋ ${validation.warnings.join('\n')}`,
                  });
                }

                // Train model with progress updates
                let lastUpdate = 0;
                await pricePredictor.current.train(prices, {
                  epochs: 50,
                  batchSize: 32,
                  validationSplit: 0.2,
                  verbose: 0,
                  onProgress: (epoch, totalEpochs, logs) => {
                    // Update every 10 epochs or at the end
                    if (epoch % 10 === 0 || epoch === totalEpochs) {
                      const progress = ((epoch / totalEpochs) * 100).toFixed(0);
                      const bar = '█'.repeat(Math.floor(epoch / 5)) + '░'.repeat(10 - Math.floor(epoch / 5));

                      setOutput(prev =>
                        prev.map(output =>
                          output.id === trainingOutputId
                            ? {
                                ...output,
                                content: `ᛉ Training LSTM model on ${symbol} historical data...\nᛏ Progress: ${bar} ${progress}% (Epoch ${epoch}/${totalEpochs})\nᛒ Loss: ${logs.loss.toFixed(4)}`,
                              }
                            : output
                        )
                      );
                      lastUpdate = epoch;
                    }
                  },
                });

                // Generate predictions
                predictions = await pricePredictor.current.predict(prices, days);

                // Update final status
                setOutput(prev =>
                  prev.map(output =>
                    output.id === trainingOutputId
                      ? {
                          ...output,
                          content: `ᛉ LSTM model training complete!\nᛏ 50 epochs completed successfully\nᛒ Model ready for prediction`,
                        }
                      : output
                  )
                );

                // Cache the results
                await mlCacheHelper.current.cachePrediction(symbol, days, predictions, {
                  trainedOn: new Date().toISOString(),
                  dataPoints: prices.length,
                  epochs: 50,
                });
              }

              if (isTrendOnly) {
                // Trend prediction only
                const trendResult = await pricePredictor.current.predictTrend(prices);
                const currentPrice = prices[prices.length - 1];

                let result = `\nᚦ ${symbol} TREND FORECAST\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
                result += `Current Price: ${formatPrice(currentPrice)}\n`;
                result += `Trend: ${trendResult.trend} ${trendResult.trend === 'BULLISH' ? 'ᚢ' : 'ᛞ'}\n`;
                result += `Expected Change: ${trendResult.change.toFixed(2)}%\n`;
                result += `Confidence: ${trendResult.confidence.toFixed(0)}%\n\n`;

                // Show 7-day forecast
                result += `7-Day Forecast:\n`;
                trendResult.predictions.forEach((pred, i) => {
                  result += `  Day ${i + 1}: ${formatPrice(pred)}\n`;
                });

                result += `\nᛗ ML-powered prediction using LSTM neural network`;

                addOutput({ type: "success", content: result });
                showToast(`${symbol}: ${trendResult.trend}`, "success");
              } else {
                // Full price prediction (already have predictions from above)
                const currentPrice = prices[prices.length - 1];
                const finalPrice = predictions[predictions.length - 1];
                const totalChange = ((finalPrice - currentPrice) / currentPrice) * 100;

                let result = `\nᚦ ${symbol} PRICE PREDICTION\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
                result += `Current Price: ${formatPrice(currentPrice)}\n`;
                result += `Predicted Price (Day ${days}): ${formatPrice(finalPrice)}\n`;
                result += `Expected Change: ${totalChange > 0 ? '+' : ''}${totalChange.toFixed(2)}% ${getChangeRune(totalChange)}\n\n`;

                result += `Daily Forecast:\n`;
                predictions.forEach((pred, i) => {
                  const change = ((pred - currentPrice) / currentPrice) * 100;
                  result += `  Day ${i + 1}: ${formatPrice(pred)} (${change > 0 ? '+' : ''}${change.toFixed(1)}%)\n`;
                });

                result += `\nᚹ  Disclaimer: ML predictions are not financial advice`;
                result += `\nᛗ LSTM model trained on 90-day history`;

                addOutput({ type: "success", content: result });
                showToast(`${symbol} forecast complete`, "success");
              }
            } catch (error) {
              addOutput({
                type: "error",
                content: `ᛪ Prediction failed: ${error.message}`,
              });
              console.error("Prediction error:", error);
              showToast("Prediction failed", "error");
            }
            break;
          }

          case "sentiment": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content: "ᛪ Usage: sentiment [symbol]\nExamples:\n  sentiment BTC      - Analyze BTC market sentiment\n  sentiment ETH      - Analyze ETH sentiment\n  sentiment trending - Sentiment for trending coins",
              });
              break;
            }

            if (!mlService.current || !sentimentAnalyzer.current) {
              addOutput({
                type: "error",
                content: "ᛪ ML services not initialized. Please reload the terminal.",
              });
              break;
            }

            const symbol = args[0].toUpperCase();

            if (symbol === "TRENDING") {
              addOutput({
                type: "info",
                content: getLoadingMessage(OperationType.ML_SENTIMENT, { asset: 'trending coins' }),
              });

              try {
                const trendingData = await coinMarketCapAPI.current.getTrending();
                const coins = Array.isArray(trendingData) ? trendingData.slice(0, 5) : [];

                let result = `\nᚱ TRENDING COINS SENTIMENT\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

                for (const coin of coins) {
                  const coinSymbol = coin.symbol;
                  const priceData = await getCMCHistoricalData(coinMarketCapAPI.current, coinSymbol, 30);
                  const prices = priceData.prices.map(p => p[1]);
                  const volumes = priceData.volumes?.map(v => v[1]) || [];

                  const sentiment = sentimentAnalyzer.current.analyzePriceSentiment({
                    currentPrice: prices[prices.length - 1],
                    priceHistory: prices,
                    volume24h: volumes[volumes.length - 1] || 0,
                    volumeHistory: volumes,
                    priceChange24h: ((prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2]) * 100,
                    priceChange7d: ((prices[prices.length - 1] - prices[prices.length - 8]) / prices[prices.length - 8]) * 100,
                  });

                  const emoji = sentimentAnalyzer.current.getSentimentEmoji(sentiment.sentiment);
                  result += `${coin.symbol}: ${sentiment.sentiment} ${emoji} (${sentiment.score}/100)\n`;
                }

                result += `\nᛗ Multi-factor sentiment analysis`;
                addOutput({ type: "success", content: result });
                showToast("Trending sentiment analyzed", "success");
              } catch (error) {
                handleCommandError(error, 'sentiment trending', addOutput);
              }
              break;
            }

            const validation = getCoinIdOrError(symbol, COIN_SYMBOL_MAP);
            if (!validation.valid) {
              addOutput({ type: "error", content: validation.error });
              break;
            }
            const coinId = validation.coinId;

            addOutput({
              type: "info",
              content: getLoadingMessage(OperationType.ML_SENTIMENT, { asset: symbol }),
            });

            try {
              // Fetch market data
              const priceData = await getCMCHistoricalData(coinMarketCapAPI.current, symbol, 30);
              const prices = priceData.prices.map(p => p[1]);
              const volumes = priceData.total_volumes?.map(v => v[1]) || [];
              const currentPrice = prices[prices.length - 1];

              const priceChange24h = ((prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2]) * 100;
              const priceChange7d = ((prices[prices.length - 1] - prices[prices.length - 8]) / prices[prices.length - 8]) * 100;

              // Try to get social metrics (Santiment)
              let socialData = null;
              if (API_CONFIG.santiment.apiKey && santimentAPI.current) {
                try {
                  const santimentResult = await santimentAPI.current.getEnrichedAnalysis(coinId);
                  socialData = {
                    socialVolume7d: santimentResult.social || 0,
                    devActivity30d: santimentResult.dev || 0,
                    activeAddresses7d: santimentResult.addresses || 0,
                  };
                } catch (e) {
                  console.warn("Santiment data not available:", e);
                }
              }

              // Analyze sentiment
              const sentiment = sentimentAnalyzer.current.analyzeCompositeSentiment(
                {
                  currentPrice,
                  priceHistory: prices,
                  volume24h: volumes[volumes.length - 1] || 0,
                  volumeHistory: volumes,
                  priceChange24h,
                  priceChange7d,
                },
                socialData
              );

              const emoji = sentimentAnalyzer.current.getSentimentEmoji(sentiment.sentiment);

              let result = `\nᚱ ${symbol} SENTIMENT ANALYSIS\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
              result += `Overall Sentiment: ${sentiment.sentiment} ${emoji}\n`;
              result += `Sentiment Score: ${sentiment.score}/100\n`;
              result += `Confidence: ${sentiment.confidence}%\n\n`;

              result += `Price Sentiment: ${sentiment.priceSentiment} (${sentiment.priceScore}/100)\n`;
              if (sentiment.socialSentiment) {
                result += `Social Sentiment: ${sentiment.socialSentiment} (${sentiment.socialScore}/100)\n`;
              }

              result += `\nKey Factors:\n`;
              sentiment.allFactors.forEach(factor => {
                result += `  • ${factor}\n`;
              });

              result += `\nᛗ ML-powered multi-factor sentiment analysis`;

              addOutput({ type: "success", content: result });
              showToast(`${symbol}: ${sentiment.sentiment}`, "success");
            } catch (error) {
              handleCommandError(error, `sentiment ${symbol}`, addOutput);
              showToast("Sentiment analysis failed", "error");
            }
            break;
          }

          case "sentiment-multi": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content: "ᛪ Usage: sentiment-multi [symbol]\nExamples:\n  sentiment-multi BTC  - Aggregate sentiment from all sources\n  sentiment-multi ETH  - Multi-source sentiment analysis",
              });
              break;
            }

            if (!multiSourceSentiment.current) {
              addOutput({
                type: "error",
                content: "ᛪ Multi-source sentiment not initialized. Please reload the terminal.",
              });
              break;
            }

            const symbol = args[0].toUpperCase();
            const coinId = COIN_SYMBOL_MAP[symbol];

            if (!coinId) {
              addOutput({
                type: "error",
                content: `ᛪ Unknown asset: ${symbol}\nSupported: ${Object.keys(COIN_SYMBOL_MAP).join(", ")}`,
              });
              break;
            }

            addOutput({
              type: "info",
              content: `ᛉ Aggregating sentiment from multiple sources for ${symbol}...\n   ᚦ This may take 10-15 seconds...`,
            });

            try {
              // Aggregate sentiment from all sources
              const aggregateResult = await multiSourceSentiment.current.aggregateSentiment(symbol);

              // Format and display the report
              const report = multiSourceSentiment.current.formatReport(aggregateResult);

              addOutput({ type: "success", content: report });
              showToast(`${symbol}: ${aggregateResult.aggregate.label}`, "success");
            } catch (error) {
              addOutput({
                type: "error",
                content: `ᛪ Multi-source sentiment failed: ${error.message}`,
              });
              console.error("Multi-source sentiment error:", error);
              showToast("Sentiment aggregation failed", "error");
            }
            break;
          }

          case "anomaly": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content: "ᛪ Usage: anomaly [symbol] [type]\nExamples:\n  anomaly BTC        - Detect all anomalies\n  anomaly ETH price  - Detect price anomalies only\n  anomaly SOL volume - Detect volume anomalies only",
              });
              break;
            }

            if (!mlService.current || !anomalyDetector.current) {
              addOutput({
                type: "error",
                content: "ᛪ ML services not initialized. Please reload the terminal.",
              });
              break;
            }

            const symbol = args[0].toUpperCase();
            const type = args[1]?.toLowerCase() || "all";
            const coinId = COIN_SYMBOL_MAP[symbol];

            if (!coinId) {
              addOutput({
                type: "error",
                content: `ᛪ Unknown asset: ${symbol}\nSupported: ${Object.keys(COIN_SYMBOL_MAP).join(", ")}`,
              });
              break;
            }

            addOutput({
              type: "info",
              content: `ᛉ Detecting anomalies in ${symbol} market data...`,
            });

            try {
              // Fetch historical data
              const chartData = await getCMCHistoricalData(coinMarketCapAPI.current, symbol, 30);
              const prices = chartData.prices.map(p => p[1]);
              const volumes = chartData.total_volumes?.map(v => v[1]) || [];
              const currentPrice = prices[prices.length - 1];
              const volume24h = volumes[volumes.length - 1] || 0;

              // Run anomaly detection
              const anomalies = anomalyDetector.current.analyzeAnomalies({
                priceHistory: prices,
                volumeHistory: volumes,
                currentPrice,
                volume24h,
              });

              let result = `\nᛪ ${symbol} ANOMALY DETECTION\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
              result += `Risk Level: ${anomalies.summary.riskLevel}\n`;
              result += `Total Anomalies Found: ${anomalies.summary.totalAnomalies}\n`;
              result += `Current Status: ${anomalies.currentStatus.isAnomalous ? 'ᚹ  ANOMALOUS' : 'ᛟ NORMAL'}\n`;
              result += `Deviation from 7-day avg: ${anomalies.currentStatus.deviation}\n\n`;

              if (type === "all" || type === "price") {
                if (anomalies.priceAnomalies.detected) {
                  result += `━━ PRICE ANOMALIES (${anomalies.priceAnomalies.count}):\n`;
                  anomalies.priceAnomalies.anomalies.slice(0, 5).forEach(a => {
                    result += `  ${a.type}: ${a.magnitude} - ${a.description}\n`;
                  });
                  result += `\n`;
                } else {
                  result += `ᛟ No price anomalies detected\n\n`;
                }
              }

              if (type === "all" || type === "volume") {
                if (anomalies.volumeAnomalies.detected) {
                  result += `━━ VOLUME ANOMALIES (${anomalies.volumeAnomalies.count}):\n`;
                  anomalies.volumeAnomalies.anomalies.slice(0, 5).forEach(a => {
                    result += `  ${a.type}: ${a.description}\n`;
                  });
                  result += `\n`;
                } else {
                  result += `ᛟ No volume anomalies detected\n\n`;
                }
              }

              if (anomalies.flashEvents.detected) {
                result += `━━ FLASH EVENTS (${anomalies.flashEvents.count}):\n`;
                anomalies.flashEvents.events.forEach(event => {
                  result += `  ${event.type} - Severity: ${event.severity}\n`;
                });
                result += `\n`;
              }

              result += `ᛗ Statistical anomaly detection (Z-Score & IQR methods)`;

              addOutput({ type: anomalies.summary.riskLevel === 'HIGH' ? "error" : "success", content: result });
              showToast(`${symbol}: ${anomalies.summary.totalAnomalies} anomalies found`, anomalies.summary.riskLevel === 'HIGH' ? "error" : "success");
            } catch (error) {
              addOutput({
                type: "error",
                content: `ᛪ Anomaly detection failed: ${error.message}`,
              });
              console.error("Anomaly detection error:", error);
              showToast("Anomaly detection failed", "error");
            }
            break;
          }

          case "patterns": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content: "ᛪ Usage: patterns [symbol]\nExamples:\n  patterns BTC       - Identify BTC chart patterns\n  patterns ETH       - Identify ETH patterns\n  patterns SOL       - Identify SOL patterns",
              });
              break;
            }

            if (!mlService.current || !patternRecognizer.current) {
              addOutput({
                type: "error",
                content: "ᛪ ML services not initialized. Please reload the terminal.",
              });
              break;
            }

            const symbol = args[0].toUpperCase();
            const coinId = COIN_SYMBOL_MAP[symbol];

            if (!coinId) {
              addOutput({
                type: "error",
                content: `ᛪ Unknown asset: ${symbol}\nSupported: ${Object.keys(COIN_SYMBOL_MAP).join(", ")}`,
              });
              break;
            }

            addOutput({
              type: "info",
              content: `ᛉ Analyzing ${symbol} chart patterns...`,
            });

            try {
              // Fetch price data (60 days for pattern recognition)
              const chartData = await getCMCHistoricalData(coinMarketCapAPI.current, symbol, 60);
              const prices = chartData.prices.map(p => p[1]);

              if (prices.length < 20) {
                addOutput({
                  type: "error",
                  content: "ᛪ Insufficient data for pattern recognition (need 20+ days)",
                });
                break;
              }

              // Recognize patterns
              const result = patternRecognizer.current.recognizePatterns(prices);

              let output = `\nᛏ ${symbol} PATTERN RECOGNITION\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;

              if (result.detected) {
                output += `Patterns Detected: ${result.count}\n`;
                output += `Overall Signal: ${result.overallSignal}\n`;
                output += `Signal Strength: ${result.signalStrength}/5\n\n`;

                result.patterns.forEach((pattern, i) => {
                  output += `${i + 1}. ${pattern.pattern.replace(/_/g, ' ')}\n`;
                  output += `   Type: ${pattern.type}\n`;
                  output += `   Direction: ${pattern.direction}\n`;
                  output += `   Signal: ${pattern.signal}\n`;
                  output += `   Confidence: ${pattern.confidence}%\n`;
                  output += `   Reliability: ${pattern.reliability}\n`;
                  if (pattern.poleStrength) {
                    output += `   Pole Strength: ${pattern.poleStrength}\n`;
                  }
                  output += `\n`;
                });

                output += `ᛗ Technical pattern analysis`;
              } else {
                output += `No recognizable patterns detected.\n`;
                output += `Analyzed: ${prices.length} days of price data\n\n`;
                output += `Common patterns searched:\n`;
                output += `  • Head & Shoulders\n`;
                output += `  • Double Top/Bottom\n`;
                output += `  • Triangle formations\n`;
                output += `  • Bull/Bear Flags\n\n`;
                output += `ᛗ Pattern recognition requires clear formations`;
              }

              addOutput({ type: result.detected ? "success" : "info", content: output });
              showToast(result.detected ? `${result.count} patterns found` : "No patterns detected", result.detected ? "success" : "info");
            } catch (error) {
              addOutput({
                type: "error",
                content: `ᛪ Pattern recognition failed: ${error.message}`,
              });
              console.error("Pattern recognition error:", error);
              showToast("Pattern recognition failed", "error");
            }
            break;
          }

          case "dashboard": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content: "ᛪ Usage: dashboard [symbol]\nExamples:\n  dashboard BTC    - Open interactive BTC dashboard\n  dashboard ETH    - Open interactive ETH dashboard",
              });
              break;
            }

            const symbol = args[0].toUpperCase();
            const coinId = COIN_SYMBOL_MAP[symbol];

            if (!coinId) {
              addOutput({
                type: "error",
                content: `ᛪ Unknown asset: ${symbol}\nSupported: ${Object.keys(COIN_SYMBOL_MAP).join(", ")}`,
              });
              break;
            }

            // Set dashboard parameters and open
            setDashboardSymbol(symbol);
            setDashboardCoinId(coinId);
            setShowDashboard(true);

            addOutput({
              type: "success",
              content: `ᚱ Opening ${symbol} dashboard...`,
            });
            showToast(`Opening ${symbol} dashboard`, "success");
            break;
          }

          // ==================== MULTI-TIMEFRAME ANALYSIS COMMANDS ====================

          case "compare": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content: "ᛪ Usage: compare [symbol] [timeframes...]\nExamples:\n  compare BTC 1d 7d 30d 90d    - Compare BTC across multiple periods\n  compare ETH                   - Compare ETH (default: 1d,7d,30d,90d)\n  compare SOL 1d 7d 30d         - Custom timeframes",
              });
              break;
            }

            const symbol = args[0].toUpperCase();
            const coinId = COIN_SYMBOL_MAP[symbol];

            if (!coinId) {
              addOutput({
                type: "error",
                content: `ᛪ Unknown asset: ${symbol}\nSupported: ${Object.keys(COIN_SYMBOL_MAP).join(", ")}`,
              });
              break;
            }

            const timeframes = args.slice(1).length > 0 ? args.slice(1) : ['1d', '7d', '30d', '90d'];

            addOutput({
              type: "info",
              content: `ᛉ Analyzing ${symbol} across ${timeframes.length} timeframes...`,
            });

            try {
              const results = await multiTimeframeAnalyzer.current.compareTimeframes(
                coinMarketCapAPI.current,
                symbol,
                timeframes
              );

              let output = `\nᛏ ${symbol} MULTI-TIMEFRAME ANALYSIS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

              Object.entries(results).forEach(([tf, data]) => {
                output += `${data.label} (${data.days} days):\n`;
                output += `  Price Change: ${data.change > 0 ? '+' : ''}${data.change.toFixed(2)}% ${getChangeRune(data.change)}\n`;
                output += `  High: ${formatPrice(data.high)}\n`;
                output += `  Low: ${formatPrice(data.low)}\n`;
                output += `  Range: ${data.range.toFixed(2)}%\n`;
                output += `  Volatility: ${(data.volatility * 100).toFixed(2)}%\n`;
                output += `  Trend: ${data.trend}\n\n`;
              });

              output += `ᛗ Comparative timeframe analysis`;

              addOutput({ type: "success", content: output });
              showToast(`${symbol} timeframe analysis complete`, "success");
            } catch (error) {
              addOutput({
                type: "error",
                content: `ᛪ Comparison failed: ${error.message}`,
              });
              console.error("Comparison error:", error);
              showToast("Comparison failed", "error");
            }
            break;
          }

          case "correlation": {
            if (args.length < 2) {
              addOutput({
                type: "error",
                content: "ᛪ Usage: correlation [symbol1] [symbol2] [symbol3...] [days]\nExamples:\n  correlation BTC ETH SOL              - 30-day correlation (default)\n  correlation BTC ETH 7                 - 7-day correlation\n  correlation BTC ETH SOL MATIC 90     - 90-day correlation matrix",
              });
              break;
            }

            // Last arg might be number of days
            const lastArg = args[args.length - 1];
            const days = !isNaN(lastArg) ? parseInt(lastArg) : 30;
            const symbols = (!isNaN(lastArg) ? args.slice(0, -1) : args).map(s => s.toUpperCase());

            // Validate symbols exist in COIN_SYMBOL_MAP
            symbols.forEach(s => {
              if (!COIN_SYMBOL_MAP[s]) {
                throw new Error(`Unknown asset: ${s}`);
              }
            });

            addOutput({
              type: "info",
              content: `ᛉ Calculating ${days}-day correlation matrix for ${symbols.length} assets...`,
            });

            try {
              const { correlations, symbols: returnedSymbols } = await multiTimeframeAnalyzer.current.analyzeCorrelation(
                coinMarketCapAPI.current,
                symbols,
                days
              );

              let output = `\nᛏ CORRELATION MATRIX (${days}-day)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

              // Header row
              output += '       ';
              symbols.forEach(s => output += `${s.padEnd(8)}`);
              output += '\n';

              // Correlation matrix
              symbols.forEach((s1, i) => {
                output += `${s1.padEnd(7)}`;
                symbols.forEach((s2, j) => {
                  const corr = correlations[symbols[i]][symbols[j]];
                  output += `${corr.toFixed(2).padStart(7)} `;
                });
                output += '\n';
              });

              output += '\n💡 Interpretation:\n';
              output += '  1.0  = Perfect positive correlation\n';
              output += '  0.0  = No correlation\n';
              output += ' -1.0  = Perfect negative correlation\n';
              output += '\nᛗ Correlation analysis';

              addOutput({ type: "success", content: output });
              showToast("Correlation analysis complete", "success");
            } catch (error) {
              addOutput({
                type: "error",
                content: `ᛪ Correlation analysis failed: ${error.message}`,
              });
              console.error("Correlation error:", error);
              showToast("Correlation failed", "error");
            }
            break;
          }

          case "momentum": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content: "ᛪ Usage: momentum [symbol] [timeframes...]\nExamples:\n  momentum BTC                  - Default timeframes (1d,7d,30d)\n  momentum ETH 1d 7d 30d 90d    - Custom timeframes",
              });
              break;
            }

            const symbol = args[0].toUpperCase();
            const coinId = COIN_SYMBOL_MAP[symbol];

            if (!coinId) {
              addOutput({
                type: "error",
                content: `ᛪ Unknown asset: ${symbol}\nSupported: ${Object.keys(COIN_SYMBOL_MAP).join(", ")}`,
              });
              break;
            }

            const timeframes = args.slice(1).length > 0 ? args.slice(1) : ['1d', '7d', '30d'];

            addOutput({
              type: "info",
              content: `ᛉ Analyzing ${symbol} momentum across timeframes...`,
            });

            try {
              const result = await multiTimeframeAnalyzer.current.analyzeMomentum(
                coinMarketCapAPI.current,
                symbol,
                timeframes
              );

              let output = `\nᛏ ${symbol} MOMENTUM ANALYSIS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

              Object.entries(result.timeframes).forEach(([tf, data]) => {
                output += `${data.label}:\n`;
                output += `  ROC: ${data.roc}%\n`;
                output += `  Strength: ${data.strength}\n`;
                output += `  Trend: ${data.trend}\n`;
                output += `  Consistency: ${data.consistency}\n\n`;
              });

              output += `Overall Signal: ${result.overallSignal}\n`;
              output += `Average Momentum: ${result.avgMomentum}%\n\n`;
              output += `ᛗ Cross-timeframe momentum analysis`;

              addOutput({ type: "success", content: output });
              showToast(`${symbol}: ${result.overallSignal}`, "success");
            } catch (error) {
              addOutput({
                type: "error",
                content: `ᛪ Momentum analysis failed: ${error.message}`,
              });
              console.error("Momentum error:", error);
              showToast("Momentum analysis failed", "error");
            }
            break;
          }

          case "seasonality": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content: "ᛪ Usage: seasonality [symbol]\nExamples:\n  seasonality BTC    - BTC seasonality patterns\n  seasonality ETH    - ETH monthly performance",
              });
              break;
            }

            const symbol = args[0].toUpperCase();
            const coinId = COIN_SYMBOL_MAP[symbol];

            if (!coinId) {
              addOutput({
                type: "error",
                content: `ᛪ Unknown asset: ${symbol}\nSupported: ${Object.keys(COIN_SYMBOL_MAP).join(", ")}`,
              });
              break;
            }

            addOutput({
              type: "info",
              content: `ᛉ Analyzing ${symbol} seasonality (12-month data)...`,
            });

            try {
              const result = await multiTimeframeAnalyzer.current.analyzeSeasonality(
                coinMarketCapAPI.current,
                symbol
              );

              let output = `\nᛏ ${symbol} SEASONALITY ANALYSIS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

              output += `Monthly Average Returns:\n\n`;
              Object.entries(result.monthly).forEach(([month, data]) => {
                const arrow = parseFloat(data.avgReturn) > 0 ? '↑' : '↓';
                output += `${month.padEnd(4)} ${arrow} ${data.avgReturn.padStart(7)}% (${data.trend})\n`;
              });

              output += `\nᚱ Historical Patterns:\n`;
              output += `  Best Month:  ${result.bestMonth}\n`;
              output += `  Worst Month: ${result.worstMonth}\n\n`;
              output += `ᚹ  Past performance does not guarantee future results\n`;
              output += `ᛗ 12-month seasonality analysis`;

              addOutput({ type: "success", content: output });
              showToast(`Best: ${result.bestMonth}, Worst: ${result.worstMonth}`, "success");
            } catch (error) {
              addOutput({
                type: "error",
                content: `ᛪ Seasonality analysis failed: ${error.message}`,
              });
              console.error("Seasonality error:", error);
              showToast("Seasonality analysis failed", "error");
            }
            break;
          }

          // ==================== ALERT SYSTEM COMMANDS ====================

          case "alert": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content: "ᛪ Usage: alert [command] [args...]\n\nCommands:\n  alert list                      - View all alerts\n  alert stats                     - Alert statistics\n  alert remove [id]               - Remove alert\n  alert clear                     - Clear all alerts\n\nCreate Alerts:\n  alert price [symbol] [>/<] [value]   - Price threshold\n  alert pattern [symbol] [pattern]      - Pattern detection\n  alert sentiment [symbol] [sentiment]  - Sentiment change\n  alert anomaly [symbol]                - Anomaly detection\n\nExamples:\n  alert price BTC > 50000\n  alert pattern ETH head-shoulders\n  alert sentiment SOL bullish\n  alert anomaly BTC",
              });
              break;
            }

            if (!alertManager.current) {
              addOutput({
                type: "error",
                content: "ᛪ Alert system not initialized. Please reload.",
              });
              break;
            }

            const subcommand = args[0].toLowerCase();

            switch (subcommand) {
              case "list": {
                const alerts = alertManager.current.getAlerts();

                if (alerts.length === 0) {
                  addOutput({
                    type: "info",
                    content: "📭 No alerts configured.\n\nUse 'alert price BTC > 50000' to create your first alert!",
                  });
                  break;
                }

                let output = `\nᛒ ACTIVE ALERTS\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

                alerts.forEach(alert => {
                  const status = alert.triggered ? 'ᛟ TRIGGERED' : 'ᚦ ACTIVE';
                  output += `ID ${alert.id}: ${status}\n`;
                  output += `  Type: ${alert.type.toUpperCase()}\n`;
                  output += `  Coin: ${alert.symbol}\n`;

                  if (alert.type === 'price') {
                    output += `  Condition: ${alert.condition} $${alert.threshold.toLocaleString()}\n`;
                  } else if (alert.type === 'pattern') {
                    output += `  Pattern: ${alert.pattern}\n`;
                  } else if (alert.type === 'sentiment') {
                    output += `  Target: ${alert.targetSentiment}\n`;
                  }

                  output += `  Created: ${new Date(alert.createdAt).toLocaleString()}\n`;

                  if (alert.triggered) {
                    output += `  Triggered: ${new Date(alert.triggeredAt).toLocaleString()}\n`;
                  }

                  output += `\n`;
                });

                addOutput({ type: "success", content: output });
                break;
              }

              case "stats": {
                const stats = alertManager.current.getAlertStats();

                let output = `\nᚱ ALERT STATISTICS\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
                output += `Total Alerts: ${stats.total}\n`;
                output += `Active: ${stats.active}\n`;
                output += `Triggered: ${stats.triggered}\n`;
                output += `Monitoring: ${stats.isMonitoring ? 'ᛟ ENABLED' : '✗ DISABLED'}\n\n`;
                output += `Check Interval: 60 seconds\n`;

                addOutput({ type: "success", content: output });
                break;
              }

              case "remove": {
                if (args.length < 2) {
                  addOutput({
                    type: "error",
                    content: "ᛪ Usage: alert remove [id]\nExample: alert remove 1",
                  });
                  break;
                }

                const alertId = parseInt(args[1]);
                const removed = alertManager.current.removeAlert(alertId);

                if (removed) {
                  addOutput({
                    type: "success",
                    content: `ᛟ Alert ${alertId} removed`,
                  });
                  showToast("Alert removed", "success");
                } else {
                  addOutput({
                    type: "error",
                    content: `ᛪ Alert ${alertId} not found`,
                  });
                }
                break;
              }

              case "clear": {
                alertManager.current.clearAllAlerts();
                addOutput({
                  type: "success",
                  content: "ᛟ All alerts cleared",
                });
                showToast("Alerts cleared", "success");
                break;
              }

              case "price": {
                if (args.length < 4) {
                  addOutput({
                    type: "error",
                    content: "ᛪ Usage: alert price [symbol] [>/<] [value]\nExamples:\n  alert price BTC > 50000\n  alert price ETH < 3000",
                  });
                  break;
                }

                const symbol = args[1].toUpperCase();
                const condition = args[2];
                const threshold = parseFloat(args[3]);

                const coinId = COIN_SYMBOL_MAP[symbol];
                if (!coinId) {
                  addOutput({
                    type: "error",
                    content: `ᛪ Unknown asset: ${symbol}`,
                  });
                  break;
                }

                const alert = alertManager.current.addAlert({
                  type: 'price',
                  symbol,
                  coinId,
                  condition,
                  threshold,
                  onTrigger: (alert, data) => {
                    addOutput({
                      type: "warning",
                      content: `ᛒ ALERT TRIGGERED!\n${data.message}`,
                    });
                    showToast(`Alert: ${symbol} ${condition} $${threshold}`, "warning");
                  },
                });

                addOutput({
                  type: "success",
                  content: `ᛟ Price alert created (ID ${alert.id})\n${symbol} price ${condition} $${threshold.toLocaleString()}\n\nᛒ You'll be notified when triggered`,
                });
                showToast("Alert created", "success");
                break;
              }

              case "pattern": {
                if (args.length < 3) {
                  addOutput({
                    type: "error",
                    content: "ᛪ Usage: alert pattern [symbol] [pattern]\nExamples:\n  alert pattern BTC head-shoulders\n  alert pattern ETH double-top\n  alert pattern SOL triangle",
                  });
                  break;
                }

                const symbol = args[1].toUpperCase();
                const pattern = args.slice(2).join(' ');

                const coinId = COIN_SYMBOL_MAP[symbol];
                if (!coinId) {
                  addOutput({
                    type: "error",
                    content: `ᛪ Unknown asset: ${symbol}`,
                  });
                  break;
                }

                const alert = alertManager.current.addAlert({
                  type: 'pattern',
                  symbol,
                  coinId,
                  pattern,
                  onTrigger: (alert, data) => {
                    addOutput({
                      type: "warning",
                      content: `ᛒ PATTERN ALERT!\n${data.message}`,
                    });
                    showToast(`Pattern detected: ${symbol}`, "warning");
                  },
                });

                addOutput({
                  type: "success",
                  content: `ᛟ Pattern alert created (ID ${alert.id})\n${symbol}: ${pattern}\n\nᛒ Monitoring for pattern`,
                });
                showToast("Alert created", "success");
                break;
              }

              case "sentiment": {
                if (args.length < 3) {
                  addOutput({
                    type: "error",
                    content: "ᛪ Usage: alert sentiment [symbol] [sentiment]\nExamples:\n  alert sentiment BTC bullish\n  alert sentiment ETH bearish\n  alert sentiment SOL neutral",
                  });
                  break;
                }

                const symbol = args[1].toUpperCase();
                const targetSentiment = args[2];

                const coinId = COIN_SYMBOL_MAP[symbol];
                if (!coinId) {
                  addOutput({
                    type: "error",
                    content: `ᛪ Unknown asset: ${symbol}`,
                  });
                  break;
                }

                const alert = alertManager.current.addAlert({
                  type: 'sentiment',
                  symbol,
                  coinId,
                  targetSentiment,
                  onTrigger: (alert, data) => {
                    addOutput({
                      type: "warning",
                      content: `ᛒ SENTIMENT ALERT!\n${data.message}`,
                    });
                    showToast(`Sentiment: ${symbol} ${targetSentiment}`, "warning");
                  },
                });

                addOutput({
                  type: "success",
                  content: `ᛟ Sentiment alert created (ID ${alert.id})\n${symbol}: ${targetSentiment}\n\nᛒ Monitoring sentiment`,
                });
                showToast("Alert created", "success");
                break;
              }

              case "anomaly": {
                if (args.length < 2) {
                  addOutput({
                    type: "error",
                    content: "ᛪ Usage: alert anomaly [symbol]\nExample: alert anomaly BTC",
                  });
                  break;
                }

                const symbol = args[1].toUpperCase();

                const coinId = COIN_SYMBOL_MAP[symbol];
                if (!coinId) {
                  addOutput({
                    type: "error",
                    content: `ᛪ Unknown asset: ${symbol}`,
                  });
                  break;
                }

                const alert = alertManager.current.addAlert({
                  type: 'anomaly',
                  symbol,
                  coinId,
                  onTrigger: (alert, data) => {
                    addOutput({
                      type: "warning",
                      content: `ᛒ ANOMALY ALERT!\n${data.message}`,
                    });
                    showToast(`Anomaly detected: ${symbol}`, "warning");
                  },
                });

                addOutput({
                  type: "success",
                  content: `ᛟ Anomaly alert created (ID ${alert.id})\n${symbol}\n\nᛒ Monitoring for unusual activity`,
                });
                showToast("Alert created", "success");
                break;
              }

              default:
                addOutput({
                  type: "error",
                  content: `ᛪ Unknown alert command: ${subcommand}\n\nUse 'alert' (no args) to see usage`,
                });
            }
            break;
          }


          case "cmc": {
            if (args.length === 0) {
              addOutput({
                type: "error",
                content:
                  "ᛪ Usage: cmc [command] [args]\nCommands: price, top, trending, gainers, convert, info, global, airdrops, exchanges, pairs, performance\nExample: cmc price BTC | cmc exchanges 10 | cmc airdrops",
              });
              break;
            }

            const cmcCommand = args[0].toLowerCase();
            const cmcArgs = args.slice(1);

            if (
              !API_CONFIG.coinMarketCap.apiKey ||
              API_CONFIG.coinMarketCap.apiKey.trim() === ""
            ) {
              addOutput({
                type: "error",
                content:
                  'ᛪ CoinMarketCap key awaits, traveler.\n\nRun "apikeys" to configure your CoinMarketCap Pro API key.\nClaim your key at: https://pro.coinmarketcap.com/account',
              });
              showToast("CoinMarketCap key required ᛪ", "error");
              break;
            }

            try {
              switch (cmcCommand) {
                case "price": {
                  if (cmcArgs.length === 0) {
                    addOutput({
                      type: "error",
                      content:
                        "Usage: cmc price [symbol]\nExample: cmc price BTC\nSupports multiple: cmc price BTC,ETH,SOL",
                    });
                    break;
                  }

                  const symbols = cmcArgs[0].toUpperCase();
                  addOutput({
                    type: "info",
                    content: `ᛉ Consulting the CoinMarketCap vault for ${symbols}...`,
                  });

                  const data = await coinMarketCapAPI.current.getQuotes(
                    symbols
                  );
                  const symbolArray = symbols.split(",");

                  let result = `\nᚦ COINMARKETCAP VAULT\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

                  symbolArray.forEach((symbol) => {
                    const coinData = data[symbol];
                    if (coinData) {
                      const quote = coinData.quote.USD;
                      result += `${coinData.name} (${coinData.symbol})\n`;
                      result += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
                      result += `Price: $${quote.price.toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 8,
                        }
                      )}\n`;
                      result += `Market Cap: $${quote.market_cap.toLocaleString(
                        undefined,
                        { maximumFractionDigits: 0 }
                      )}\n`;
                      result += `24h Volume: $${quote.volume_24h.toLocaleString(
                        undefined,
                        { maximumFractionDigits: 0 }
                      )}\n`;
                      result += `24h Change: ${quote.percent_change_24h.toFixed(
                        2
                      )}% ${quote.percent_change_24h >= 0 ? "ᛏ" : "ᛪ"}\n`;
                      result += `7d Change: ${quote.percent_change_7d.toFixed(
                        2
                      )}%\n`;
                      result += `30d Change: ${quote.percent_change_30d.toFixed(
                        2
                      )}%\n`;
                      result += `Market Rank: #${coinData.cmc_rank}\n`;
                      result += `Circulating Supply: ${coinData.circulating_supply.toLocaleString(
                        undefined,
                        { maximumFractionDigits: 0 }
                      )}\n\n`;
                    }
                  });

                  result += `ᛗ Premium data from CoinMarketCap`;
                  addOutput({ type: "success", content: result });
                  showToast("Vault data retrieved ᛗ", "success");
                  break;
                }

                case "top": {
                  const limit = cmcArgs.length > 0 ? parseInt(cmcArgs[0]) : 10;
                  const validLimit = Math.min(Math.max(limit, 1), 100);

                  addOutput({
                    type: "info",
                    content: `ᛉ Gathering the ${validLimit} mightiest assets...`,
                  });

                  const listings = await coinMarketCapAPI.current.getListings(
                    validLimit
                  );

                  let result = `\nᛏ TOP ${validLimit} ASSETS\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

                  listings.forEach((coin, idx) => {
                    const quote = coin.quote.USD;
                    result += `${idx + 1}. ${coin.name} (${coin.symbol})\n`;
                    result += `   Price: $${quote.price.toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      }
                    )}\n`;
                    result += `   Market Cap: $${quote.market_cap.toLocaleString(
                      undefined,
                      { maximumFractionDigits: 0 }
                    )}\n`;
                    result += `   24h: ${quote.percent_change_24h.toFixed(
                      2
                    )}% ${quote.percent_change_24h >= 0 ? "ᛏ" : "ᛪ"}\n\n`;
                  });

                  result += `ᛗ Premium vault data`;
                  addOutput({ type: "success", content: result });
                  showToast(`Top ${validLimit} revealed ᛗ`, "success");
                  break;
                }

                case "trending": {
                  addOutput({
                    type: "info",
                    content: `ᛉ Identifying rising powers...`,
                  });

                  const trending = await coinMarketCapAPI.current.getTrending();

                  let result = `\nᚱ TRENDING ASSETS\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

                  if (trending && trending.length > 0) {
                    trending.slice(0, 15).forEach((coin, idx) => {
                      result += `${idx + 1}. ${coin.name} (${coin.symbol})\n`;
                      if (coin.quote && coin.quote.USD) {
                        const quote = coin.quote.USD;
                        result += `   Price: $${quote.price.toLocaleString()}\n`;
                        result += `   24h: ${quote.percent_change_24h.toFixed(
                          2
                        )}%\n`;
                      }
                      result += `\n`;
                    });
                  } else {
                    result += `No rising stars detected.\n`;
                  }

                  result += `ᛗ Trending from the vault`;
                  addOutput({ type: "success", content: result });
                  showToast("Trending revealed ᛗ", "success");
                  break;
                }

                case "gainers":
                case "losers": {
                  addOutput({
                    type: "info",
                    content: `ᛉ Seeking victors and vanquished...`,
                  });

                  const data =
                    await coinMarketCapAPI.current.getGainersLosers();

                  let result = `\nᛏ VICTORS & VANQUISHED (24H)\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

                  if (data) {
                    if (data.gainers && data.gainers.length > 0) {
                      result += `ᛏ THE VICTORIOUS:\n`;
                      data.gainers.slice(0, 5).forEach((coin, idx) => {
                        const quote = coin.quote.USD;
                        result += `${idx + 1}. ${coin.name} (${coin.symbol})\n`;
                        result += `   Price: $${quote.price.toLocaleString()}\n`;
                        result += `   24h: +${quote.percent_change_24h.toFixed(
                          2
                        )}% ᚢ\n\n`;
                      });
                    }

                    if (data.losers && data.losers.length > 0) {
                      result += `ᛞ TOP LOSERS:\n`;
                      data.losers.slice(0, 5).forEach((coin, idx) => {
                        const quote = coin.quote.USD;
                        result += `${idx + 1}. ${coin.name} (${coin.symbol})\n`;
                        result += `   Price: $${quote.price.toLocaleString()}\n`;
                        result += `   24h: ${quote.percent_change_24h.toFixed(
                          2
                        )}% ᛞ\n\n`;
                      });
                    }
                  } else {
                    result += `Data not available.\n`;
                  }

                  result += `ᛟ Live data from CoinMarketCap Pro`;
                  addOutput({ type: "success", content: result });
                  showToast("Gainers & Losers loaded", "success");
                  break;
                }

                case "convert": {
                  if (cmcArgs.length < 3) {
                    addOutput({
                      type: "error",
                      content:
                        "Usage: cmc convert [amount] [from] [to]\nExample: cmc convert 1 BTC USD\nExample: cmc convert 100 USD ETH",
                    });
                    break;
                  }

                  const amount = parseFloat(cmcArgs[0]);
                  const fromSymbol = cmcArgs[1].toUpperCase();
                  const toSymbol = cmcArgs[2].toUpperCase();

                  if (isNaN(amount)) {
                    addOutput({
                      type: "error",
                      content: `Invalid amount: ${cmcArgs[0]}`,
                    });
                    break;
                  }

                  addOutput({
                    type: "info",
                    content: `ᛋ Converting ${amount} ${fromSymbol} to ${toSymbol}...`,
                  });

                  const data = await coinMarketCapAPI.current.convert(
                    amount,
                    fromSymbol,
                    toSymbol
                  );

                  let result = `\n💱 CRYPTOCURRENCY CONVERSION\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

                  if (data && data.quote && data.quote[toSymbol]) {
                    const conversion = data.quote[toSymbol];
                    result += `${amount} ${fromSymbol} = ${conversion.price.toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8,
                      }
                    )} ${toSymbol}\n\n`;
                    result += `Last Updated: ${new Date(
                      conversion.last_updated
                    ).toLocaleString()}\n`;
                  } else {
                    result += `Conversion not available.\n`;
                  }

                  result += `\nᛟ Live data from CoinMarketCap Pro`;
                  addOutput({ type: "success", content: result });
                  showToast("Conversion complete", "success");
                  break;
                }

                case "info": {
                  if (cmcArgs.length === 0) {
                    addOutput({
                      type: "error",
                      content:
                        "Usage: cmc info [symbol]\nExample: cmc info BTC",
                    });
                    break;
                  }

                  const symbol = cmcArgs[0].toUpperCase();
                  addOutput({
                    type: "info",
                    content: `ᛋ Fetching detailed info for ${symbol}...`,
                  });

                  const data = await coinMarketCapAPI.current.getMetadata(
                    symbol
                  );
                  const coinData = data[symbol];

                  let result = `\n📖 ${symbol} INFORMATION\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

                  if (coinData) {
                    result += `Name: ${coinData.name}\n`;
                    result += `Symbol: ${coinData.symbol}\n`;
                    if (coinData.category)
                      result += `Category: ${coinData.category}\n`;
                    if (coinData.description)
                      result += `\nDescription:\n${coinData.description.substring(
                        0,
                        400
                      )}...\n\n`;
                    if (coinData.urls) {
                      if (
                        coinData.urls.website &&
                        coinData.urls.website.length > 0
                      )
                        result += `Website: ${coinData.urls.website[0]}\n`;
                      if (
                        coinData.urls.twitter &&
                        coinData.urls.twitter.length > 0
                      )
                        result += `Twitter: ${coinData.urls.twitter[0]}\n`;
                    }
                    if (coinData.date_launched)
                      result += `Launched: ${new Date(
                        coinData.date_launched
                      ).toLocaleDateString()}\n`;
                  } else {
                    result += `Information not available.\n`;
                  }

                  result += `\nᛟ Data from CoinMarketCap Pro`;
                  addOutput({ type: "success", content: result });
                  showToast("Info loaded", "success");
                  break;
                }

                case "global": {
                  addOutput({
                    type: "info",
                    content: `ᛋ Fetching global cryptocurrency metrics...`,
                  });

                  const data =
                    await coinMarketCapAPI.current.getGlobalMetrics();

                  let result = `\n🌍 GLOBAL CRYPTOCURRENCY METRICS\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

                  if (data && data.quote && data.quote.USD) {
                    const metrics = data.quote.USD;
                    result += `Total Market Cap: $${metrics.total_market_cap.toLocaleString(
                      undefined,
                      { maximumFractionDigits: 0 }
                    )}\n`;
                    result += `Total 24h Volume: $${metrics.total_volume_24h.toLocaleString(
                      undefined,
                      { maximumFractionDigits: 0 }
                    )}\n`;
                    result += `BTC Dominance: ${data.btc_dominance.toFixed(
                      2
                    )}%\n`;
                    result += `ETH Dominance: ${data.eth_dominance.toFixed(
                      2
                    )}%\n`;
                    result += `Active Cryptocurrencies: ${data.active_cryptocurrencies.toLocaleString()}\n`;
                    result += `Active Exchanges: ${data.active_exchanges}\n`;
                    result += `Market Cap Change 24h: ${metrics.total_market_cap_yesterday_percentage_change.toFixed(
                      2
                    )}%\n`;
                    result += `\nLast Updated: ${new Date(
                      metrics.last_updated
                    ).toLocaleString()}\n`;
                  } else {
                    result += `Global metrics not available.\n`;
                  }

                  result += `\nᛟ Live data from CoinMarketCap Pro`;
                  addOutput({ type: "success", content: result });
                  showToast("Global metrics loaded", "success");
                  break;
                }

                case "airdrops": {
                  addOutput({
                    type: "info",
                    content: `ᛉ Checking for airdrops...`,
                  });

                  const status = cmcArgs[0]?.toUpperCase() || "ONGOING";
                  const data = await coinMarketCapAPI.current.getAirdrops(status);

                  let result = `\nᚠ CRYPTOCURRENCY AIRDROPS (${status})\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

                  if (data && data.length > 0) {
                    data.slice(0, 10).forEach((airdrop, idx) => {
                      result += `${idx + 1}. ${airdrop.name}\n`;
                      result += `   Symbol: ${airdrop.symbol || "N/A"}\n`;
                      result += `   Status: ${airdrop.status}\n`;
                      if (airdrop.start_date) result += `   Start: ${airdrop.start_date}\n`;
                      if (airdrop.end_date) result += `   End: ${airdrop.end_date}\n`;
                      result += `\n`;
                    });
                  } else {
                    result += `No airdrops found with status: ${status}\n`;
                  }

                  result += `ᛗ Airdrop data from CoinMarketCap`;
                  addOutput({ type: "success", content: result });
                  showToast("Airdrops loaded", "success");
                  break;
                }

                case "exchanges": {
                  const limit = cmcArgs.length > 0 ? parseInt(cmcArgs[0]) : 20;
                  const validLimit = Math.min(Math.max(limit, 1), 100);

                  addOutput({
                    type: "info",
                    content: `ᛉ Fetching top ${validLimit} exchanges...`,
                  });

                  const data = await coinMarketCapAPI.current.getExchanges(validLimit);

                  let result = `\nᛏ TOP ${validLimit} EXCHANGES\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

                  data.forEach((exchange, idx) => {
                    const quote = exchange.quote.USD;
                    result += `${idx + 1}. ${exchange.name}\n`;
                    result += `   24h Volume: $${quote.volume_24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}\n`;
                    result += `   Markets: ${exchange.num_market_pairs}\n`;
                    if (quote.volume_24h_change_percentage) {
                      result += `   24h Change: ${quote.volume_24h_change_percentage.toFixed(2)}%\n`;
                    }
                    result += `\n`;
                  });

                  result += `ᛗ Exchange data from CoinMarketCap`;
                  addOutput({ type: "success", content: result });
                  showToast(`Top ${validLimit} exchanges loaded`, "success");
                  break;
                }

                case "pairs": {
                  if (cmcArgs.length === 0) {
                    addOutput({
                      type: "error",
                      content: "Usage: cmc pairs [symbol]\nExample: cmc pairs BTC",
                    });
                    break;
                  }

                  const symbol = cmcArgs[0].toUpperCase();
                  addOutput({
                    type: "info",
                    content: `ᛉ Fetching trading pairs for ${symbol}...`,
                  });

                  const data = await coinMarketCapAPI.current.getMarketPairs(symbol, 20);

                  let result = `\n₿ ${symbol} TRADING PAIRS\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

                  if (data && data.market_pairs && data.market_pairs.length > 0) {
                    data.market_pairs.slice(0, 20).forEach((pair, idx) => {
                      result += `${idx + 1}. ${pair.market_pair} on ${pair.exchange.name}\n`;
                      result += `   Price: $${pair.quote.USD.price.toLocaleString(undefined, { maximumFractionDigits: 8 })}\n`;
                      result += `   24h Volume: $${pair.quote.USD.volume_24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}\n`;
                      result += `\n`;
                    });
                  } else {
                    result += `No trading pairs found for ${symbol}\n`;
                  }

                  result += `ᛗ Market pair data from CoinMarketCap`;
                  addOutput({ type: "success", content: result });
                  showToast("Trading pairs loaded", "success");
                  break;
                }

                case "performance": {
                  if (cmcArgs.length === 0) {
                    addOutput({
                      type: "error",
                      content: "Usage: cmc performance [symbol] [period]\nExample: cmc performance BTC 7d\nPeriods: 24h, 7d, 30d, 90d, 1y",
                    });
                    break;
                  }

                  const symbol = cmcArgs[0].toUpperCase();
                  const period = cmcArgs[1] || "24h";

                  addOutput({
                    type: "info",
                    content: `ᛉ Analyzing ${symbol} performance...`,
                  });

                  const data = await coinMarketCapAPI.current.getPricePerformance(symbol, period);

                  let result = `\nᚱ ${symbol} PERFORMANCE (${period})\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

                  if (data && data[symbol]) {
                    const perf = data[symbol];
                    result += `High: $${perf.high?.toLocaleString(undefined, { maximumFractionDigits: 8 }) || "N/A"}\n`;
                    result += `Low: $${perf.low?.toLocaleString(undefined, { maximumFractionDigits: 8 }) || "N/A"}\n`;
                    result += `Open: $${perf.open?.toLocaleString(undefined, { maximumFractionDigits: 8 }) || "N/A"}\n`;
                    result += `Close: $${perf.close?.toLocaleString(undefined, { maximumFractionDigits: 8 }) || "N/A"}\n`;
                    if (perf.percent_change) {
                      result += `Change: ${perf.percent_change.toFixed(2)}% ${perf.percent_change >= 0 ? "ᛏ" : "ᛪ"}\n`;
                    }
                  } else {
                    result += `Performance data not available for ${symbol}\n`;
                  }

                  result += `\nᛗ Performance stats from CoinMarketCap`;
                  addOutput({ type: "success", content: result });
                  showToast("Performance data loaded", "success");
                  break;
                }

                default:
                  addOutput({
                    type: "error",
                    content: `Unknown cmc command: "${cmcCommand}"\nAvailable: price, top, trending, gainers, convert, info, global, airdrops, exchanges, pairs, performance`,
                  });
                  showToast("Unknown cmc command", "error");
              }
            } catch (error) {
              addOutput({
                type: "error",
                content: `CoinMarketCap query failed: ${error.message}`,
              });
              showToast("CMC query failed", "error");
            }
            break;
          }

          case "theme": {
            const themeKeys = Object.keys(THEMES);
            const currentIndex = themeKeys.indexOf(currentTheme);
            const nextIndex = (currentIndex + 1) % themeKeys.length;
            const nextTheme = themeKeys[nextIndex];
            changeTheme(nextTheme);
            break;
          }

          case "agent": {
            if (args[0] === "toggle" || args[0] === "on" || args[0] === "off") {
              const newState = args[0] === "toggle" ? !useLangGraphAgent : args[0] === "on";
              setUseLangGraphAgent(newState);
              addOutput({
                type: "success",
                content: `ᛟ LangGraph Agent: ${newState ? "ENABLED" : "DISABLED"}\n\n${newState ?
                  "Advanced stateful agent with memory and multi-step reasoning is now active.\nFeatures: conversation memory, complex workflows, reasoning visualization." :
                  "Switched back to standard agent mode."}`,
              });
              showToast(`LangGraph Agent ${newState ? "enabled" : "disabled"}`, "success");
            } else if (args[0] === "reasoning") {
              const show = args[1] !== "off";
              setShowAgentReasoning(show);
              addOutput({
                type: "success",
                content: `ᛟ Agent Reasoning Display: ${show ? "ENABLED" : "DISABLED"}`,
              });
              showToast(`Reasoning ${show ? "enabled" : "disabled"}`, "success");
            } else if (args[0] === "reset") {
              fenrirAgent.resetConversation();
              addOutput({
                type: "success",
                content: `ᛟ Agent conversation history reset. Starting fresh session.`,
              });
              showToast("Conversation reset", "success");
            } else if (args[0] === "status") {
              const prefs = fenrirAgent.getUserPreferences();
              addOutput({
                type: "info",
                content: `ᛟ LANGGRAPH AGENT STATUS
━━━━━━━━━━━━━━━━━━━━━━━━

Status: ${useLangGraphAgent ? "ACTIVE ᛟ" : "INACTIVE"}
Reasoning Display: ${showAgentReasoning ? "ON" : "OFF"}
Thread ID: ${fenrirAgent.threadId}
Streaming: ${fenrirAgent.isStreaming ? "IN PROGRESS..." : "IDLE"}

USER PREFERENCES:
• Favorite Coins: ${prefs.favoriteCoins.join(", ") || "None"}
• Default Currency: ${prefs.defaultCurrency}
• Theme: ${prefs.theme}

${fenrirAgent.agentState ? `Session Messages: ${fenrirAgent.agentState.messageCount || 0}` : "No active session"}`,
              });
            } else {
              addOutput({
                type: "info",
                content: `ᛟ LANGGRAPH AGENT COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━

agent toggle              - Toggle LangGraph agent on/off
agent on/off              - Enable/disable LangGraph agent
agent reasoning [on/off]  - Show/hide agent reasoning steps
agent reset               - Reset conversation history
agent status              - Show agent status and preferences

The LangGraph agent provides:
ᛟ Conversation memory across queries
ᛟ Multi-step complex workflow execution
ᛟ Intelligent intent classification
ᛟ User preference learning
ᛟ Reasoning visualization`,
              });
            }
            break;
          }

          case "memory": {
            if (args.length > 0 && args[0] === "clear") {
              // Clear conversation memory
              setConversationHistory([]);
              setConversationMetadata({
                topics: [],
                userName: null,
                preferences: {},
                startedAt: new Date().toISOString(),
                messageCount: 0,
              });
              localStorage.removeItem(CONVERSATION_STORAGE_KEY);
              localStorage.removeItem(CONVERSATION_METADATA_KEY);
              addOutput({
                type: "success",
                content: "ᛗ Fenrir's memory of our bond has been cleansed. We begin anew, traveler.",
              });
              showToast("Conversation memory cleared", "success");
            } else {
              // Show conversation memory
              let output = `\nᛗ FENRIR'S MEMORY\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

              if (conversationMetadata.userName) {
                output += `ᚹ Name: ${conversationMetadata.userName}\n`;
              }

              output += `ᚱ Messages Exchanged: ${conversationMetadata.messageCount}\n`;

              if (conversationMetadata.topics.length > 0) {
                output += `ᛋ Topics Discussed: ${conversationMetadata.topics.join(', ')}\n`;
              }

              const startedDate = new Date(conversationMetadata.startedAt);
              output += `ᛏ Bond Forged: ${startedDate.toLocaleDateString()} ${startedDate.toLocaleTimeString()}\n`;

              output += `\nᚦ Conversation History (${conversationHistory.length} messages):\n\n`;

              if (conversationHistory.length === 0) {
                output += "  No conversations yet. Use 'talk' to begin our journey ᛗ\n";
              } else {
                conversationHistory.forEach((msg, idx) => {
                  const role = msg.role === 'user' ? 'You' : 'Fenrir';
                  const preview = msg.content.length > 80
                    ? msg.content.substring(0, 80) + '...'
                    : msg.content;
                  output += `  ${idx + 1}. ${role}: ${preview}\n`;
                });
              }

              output += `\nᛉ Commands:\n`;
              output += `  • memory         - View this memory\n`;
              output += `  • memory clear   - Forget all conversations\n`;

              addOutput({ type: "info", content: output });
            }
            break;
          }

          case "clear":
            setOutput([]);
            addOutput({
              type: "system",
              content: `ᚠᛖᚾᚱᛁᛦ - ₴₮Ɽł₦₲₴ Ø₣ Ɇ₦ĐⱠɆ₴₴ ₱Ø₴₴ł฿łⱠł₮łɆ₴`,
            });
            showToast("Terminal cleared", "success");
            break;

          default: {
            // If LangGraph agent is enabled, route unknown commands to it
            if (useLangGraphAgent) {
              addOutput({
                type: "info",
                content: `ᛉ Processing query with LangGraph agent...`,
              });

              try {
                // Stream the response from LangGraph agent
                await fenrirAgent.streamQuery(cmd);

                // Display reasoning steps if enabled
                if (showAgentReasoning && fenrirAgent.reasoningSteps.length > 0) {
                  let reasoningOutput = "\nᛟ AGENT REASONING:\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
                  fenrirAgent.reasoningSteps.forEach((step, idx) => {
                    reasoningOutput += `${idx + 1}. [${step.step}] ${step.reasoning}\n`;
                  });
                  addOutput({
                    type: "info",
                    content: reasoningOutput,
                  });
                }

                // Display the final response
                if (fenrirAgent.currentResponse) {
                  addOutput({
                    type: "ai",
                    content: fenrirAgent.currentResponse,
                  });
                  showToast("Agent response ready", "success");
                } else {
                  addOutput({
                    type: "error",
                    content: "ᛪ Agent did not provide a response",
                  });
                }
              } catch (error) {
                addOutput({
                  type: "error",
                  content: `ᛪ Agent error: ${error.message}`,
                });
                showToast("Agent error", "error");
              }
            } else {
              // Standard error for unknown commands
              addOutput({
                type: "error",
                content: `Unknown command: "${command}". Type "help" for available commands.`,
              });
              showToast("Unknown command", "error");
            }
          }
        }
      } catch (error) {
        addOutput({
          type: "error",
          content: `Error: ${error.message}`,
        });
        showToast(`Error: ${error.message}`, "error");
      } finally {
        setIsProcessing(false);
      }
    },
    [addOutput, showToast, currentTheme, theme, currentAIModel, useLangGraphAgent, showAgentReasoning, fenrirAgent]
  );

  // ==================== KEYBOARD SHORTCUTS ====================

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (commandHistory.length > 0) {
          const newIndex =
            historyIndex < commandHistory.length - 1
              ? historyIndex + 1
              : historyIndex;
          setHistoryIndex(newIndex);
          setInput(commandHistory[commandHistory.length - 1 - newIndex]);
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setInput(commandHistory[commandHistory.length - 1 - newIndex]);
        } else if (historyIndex === 0) {
          setHistoryIndex(-1);
          setInput("");
        }
      } else if (e.key === "Tab" && autocompleteMatches.length > 0) {
        e.preventDefault();
        setInput(autocompleteMatches[selectedAutocomplete].cmd);
        setAutocompleteMatches([]);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "l") {
        e.preventDefault();
        handleCommand("clear");
      } else if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        handleCommand("clear");
      } else if ((e.ctrlKey || e.metaKey) && e.key === "t") {
        e.preventDefault();
        const themeKeys = Object.keys(THEMES);
        const currentIndex = themeKeys.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % themeKeys.length;
        const nextTheme = themeKeys[nextIndex];
        changeTheme(nextTheme);
      } else if (e.key === "Escape") {
        setShowAPIKeyModal(false);
        setShowSuggestions(false);
        setAutocompleteMatches([]);
      }
    },
    [
      historyIndex,
      commandHistory,
      autocompleteMatches,
      selectedAutocomplete,
      handleCommand,
    ]
  );

  // ==================== INITIALIZATION ====================

  const isInitialized = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (isInitialized.current) return;
    isInitialized.current = true;

    loadTheme();
    loadCommandHistory();

    addOutput({
      type: "system",
      content: `AI Terminal Ready
Type "help" for commands`,
    });

    // Check API configuration
    if (!API_CONFIG.openRouter.apiKey) {
      setTimeout(() => {
        addOutput({
          type: "info",
          content: `💡 TIP: Configure your API keys with "apikeys" command\n   • OpenRouter: AI assistant\n   • CoinMarketCap: enhanced crypto data\n   • Santiment: on-chain metrics`,
        });
      }, 1000);
    }
  }, []);

  // ==================== FORM SUBMISSION ====================

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!input.trim() || isProcessing) return;

      const trimmedInput = input.trim();

      addOutput({
        type: "command",
        content: `❯ ${trimmedInput}`,
      });

      setCommandHistory((prev) => {
        const newHistory = [...prev, trimmedInput];
        saveCommandHistory(newHistory);
        return newHistory;
      });
      setHistoryIndex(-1);

      handleCommand(trimmedInput);
      setInput("");
      setShowSuggestions(false);
      setAutocompleteMatches([]);
    },
    [input, isProcessing, addOutput, handleCommand, saveCommandHistory]
  );


  // ==================== ANIMATED RUNE MATRIX BACKGROUND ====================

  useEffect(() => {
    const canvas = document.getElementById('terminal-rune-matrix-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Norse runes and crypto symbols
    const runes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ₿ΞⓃⒷⓈⒺⓉⒽ';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    function draw() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = runes[Math.floor(Math.random() * runes.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Gradient glow effect
        const gradient = ctx.createLinearGradient(x, y - 20, x, y + 20);
        gradient.addColorStop(0, theme.chartColors.price + '00');
        gradient.addColorStop(0.5, theme.chartColors.price);
        gradient.addColorStop(1, theme.chartColors.price + '00');

        ctx.fillStyle = gradient;
        ctx.shadowBlur = 10;
        ctx.shadowColor = theme.chartColors.price;
        ctx.fillText(text, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    const interval = setInterval(draw, 50);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme.chartColors.price]);

  // ==================== RENDER ====================

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 sm:p-6 font-mono bg-gradient-to-br ${theme.gradient} relative overflow-hidden`}
    >
      {/* Animated Rune Matrix Background */}
      <canvas
        id="terminal-rune-matrix-canvas"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none',
          opacity: 0.5,
        }}
      />

      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      <div className={`w-full max-w-5xl mx-auto relative px-2 sm:px-4`}>
        <div
          className={`bg-black/60 border-2 ${theme.border} rounded-xl sm:rounded-2xl shadow-2xl ${theme.glow} backdrop-blur-xl overflow-hidden flex flex-col`}
          style={{ height: "90vh", maxHeight: "900px", minHeight: "500px" }}
        >
          {/* Premium Header */}
          <div
            className={`relative p-3 sm:p-4 md:p-6 border-b-2 ${theme.border} ${theme.glass}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`p-1.5 sm:p-2 rounded-lg ${theme.bgAccent}`}>
                  <span className="text-white text-xl sm:text-2xl">𓃦</span>
                </div>
                <div className="hidden sm:block">
                  <h1 className={`${theme.text} text-xl font-bold`}>
                    ᚠᛖᚾᚱᛁᛦ 𖣂
                  </h1>
                  <p className={`${theme.accent} text-xs`}>
                    ₴₮Ɽł₦₲₴ Ø₣ Ɇ₦ĐⱠɆ₴₴ ₱Ø₴₴ł฿łⱠł₮łɆ₴
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-3">
                <span
                  className={`text-xs sm:text-sm px-2 sm:px-3 py-1 ${theme.bgAccent} rounded-full text-white font-bold hidden md:inline-block`}
                >
                  Ʉ₦₭₦Ø₩₦ ₵𝟬Đ𝟯
                </span>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => setShowAPIKeyModal(true)}
                    className={`p-1.5 sm:p-2 rounded-lg ${theme.glass} border ${theme.border} hover:bg-opacity-80 touch-manipulation`}
                    title="API Keys"
                  >
                    <Key size={16} className={`${theme.text} sm:w-[18px] sm:h-[18px]`} />
                  </button>
                  <button
                    onClick={() => {
                      setInput("help");
                      inputRef.current?.focus();
                    }}
                    className={`p-1.5 sm:p-2 rounded-lg ${theme.glass} border ${theme.border} hover:bg-opacity-80 touch-manipulation`}
                    title="Help"
                  >
                    <Command size={16} className={`${theme.text} sm:w-[18px] sm:h-[18px]`} />
                  </button>
                  <ThemeToggle
                    currentTheme={currentTheme}
                    onChangeTheme={changeTheme}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Terminal Output */}
          <div
            ref={terminalRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-2 custom-scrollbar"
          >
            {output.map((item) => (
              <OutputItem key={item.id} item={item} theme={theme} />
            ))}
            {isProcessing && (
              <div className="flex items-center gap-2">
                <Loader className={`${theme.accent} animate-spin`} size={16} />
                <span className={theme.accent}>Processing...</span>
              </div>
            )}
          </div>

          {/* Scroll to bottom button */}
          {!isAtBottom && (
            <button
              onClick={scrollToBottom}
              className={`absolute right-4 sm:right-8 bottom-32 sm:bottom-40 p-2.5 sm:p-3 rounded-full ${theme.bgAccent} ${theme.glow} hover:scale-110 transition-all duration-300 z-10 animate-bounce touch-manipulation`}
              title="Scroll to bottom"
            >
              <ArrowUp className="text-white rotate-180" size={18} />
            </button>
          )}

          {/* Autocomplete suggestions */}
          {autocompleteMatches.length > 0 && (
            <div
              className={`border-t-2 ${theme.border} p-4 ${theme.glass} animate-in slide-in-from-bottom duration-200`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap size={14} className={theme.accent} />
                <span
                  className={`${theme.text} text-xs font-bold uppercase tracking-wide`}
                >
                  Autocomplete
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {autocompleteMatches.slice(0, 5).map((match, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(match.cmd);
                      setAutocompleteMatches([]);
                      inputRef.current?.focus();
                    }}
                    className={`px-3 py-2 rounded-lg border transition-all duration-200 ${
                      idx === selectedAutocomplete
                        ? `${theme.border} ${theme.bgAccent} text-white ${theme.glow}`
                        : `border-gray-600 ${theme.glass} ${theme.text} hover:${theme.glowHover}`
                    }`}
                  >
                    <div className="text-xs font-mono font-bold">
                      {match.cmd}
                    </div>
                    <div className="text-gray-400 text-[10px] mt-1">
                      {match.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Input */}
          <div className={`border-t-2 ${theme.border} p-6 ${theme.glass}`}>
            <form onSubmit={handleSubmit}>
              <div className="flex items-center gap-4">
                {isProcessing && (
                  <div className={`${theme.accent} animate-spin`}>
                    <Brain size={24} />
                  </div>
                )}
                <span
                  className={`${theme.accent} text-xl sm:text-2xl font-bold animate-pulse`}
                >
                  ❯
                </span>
                <input
                  ref={inputRef}
                  className={`flex-1 bg-transparent ${theme.text} text-base sm:text-lg font-medium outline-none placeholder:text-gray-500`}
                  style={{ fontSize: '16px' }}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a command..."
                  autoFocus
                  disabled={isProcessing}
                />
                {input && (
                  <button
                    type="submit"
                    className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl ${theme.bgAccent} text-white font-bold hover:scale-105 transition-all duration-300 ${theme.glow} ${theme.glowHover} touch-manipulation`}
                    disabled={isProcessing}
                  >
                    <Zap size={18} className="sm:w-5 sm:h-5" />
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Status Bar */}
          <div
            className={`border-t ${theme.border} p-2 sm:p-2.5 ${theme.glass} flex items-center justify-between text-xs`}
          >
            <div className={`${theme.text} opacity-70 text-xs`}>
              {currentAIModel.split("/")[1]?.split("-")[0] || "claude"}
            </div>
            <div className={`${theme.text} opacity-70 text-xs`}>
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <APIKeyModal
        isOpen={showAPIKeyModal}
        onClose={() => setShowAPIKeyModal(false)}
        theme={theme}
        onSave={handleAPIKeysSaved}
      />

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 12px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${theme.chartColors.price};
          border-radius: 10px;
          border: 2px solid rgba(0, 0, 0, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${theme.chartColors.sma};
        }
        @keyframes slide-in-from-bottom {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-in-from-top {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-in-from-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-in {
          animation-fill-mode: both;
        }
        .slide-in-from-bottom {
          animation-name: slide-in-from-bottom;
        }
        .slide-in-from-top {
          animation-name: slide-in-from-top;
        }
        .slide-in-from-right {
          animation-name: slide-in-from-right;
        }
        .fade-in {
          animation-name: fade-in;
        }
        .duration-200 {
          animation-duration: 200ms;
        }
        .duration-300 {
          animation-duration: 300ms;
        }
        .duration-500 {
          animation-duration: 500ms;
        }
      `}</style>

      {/* Dashboard Modal */}
      <Dashboard
        isVisible={showDashboard}
        onClose={() => setShowDashboard(false)}
        theme={theme}
        coinMarketCapAPI={coinMarketCapAPI.current}
        sentimentAnalyzer={sentimentAnalyzer.current}
        multiSourceSentiment={multiSourceSentiment.current}
        symbol={dashboardSymbol}
        coinId={dashboardCoinId}
      />
    </div>
  );
}
