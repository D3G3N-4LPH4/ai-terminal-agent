// Symbol mapping for CoinGecko - Synced with AITerminalAgent.jsx COINGECKO_ID_MAP
const COIN_ID_MAP = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  USDT: "tether",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  MATIC: "matic-network",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  UNI: "uniswap",
  ATOM: "cosmos",
  SHIB: "shiba-inu",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  NEAR: "near",
  APT: "aptos",
  ARB: "arbitrum",
  OP: "optimism",
  SUI: "sui",
  TIA: "celestia",
  SEI: "sei-network",
  INJ: "injective-protocol",
  RUNE: "thorchain",
  FTM: "fantom",
  AAVE: "aave",
  MKR: "maker",
};

const AVAILABLE_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_crypto_price",
      description:
        "Get real-time cryptocurrency price data including current price, 24h change, and market volume. Use this when users ask about current prices or market data.",
      parameters: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            description: "The cryptocurrency symbol (e.g., BTC, ETH, SOL)",
            enum: Object.keys(COIN_ID_MAP),
          },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_crypto_assets",
      description:
        "Search for cryptocurrency information across multiple assets. Returns name, symbol, price, market cap, and other key metrics.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search term (can be partial name or symbol)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_onchain_metrics",
      description:
        "Get on-chain and social metrics for a cryptocurrency including social volume, development activity, MVRV ratio, and active addresses. Use this for deeper fundamental analysis.",
      parameters: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            description: "The cryptocurrency symbol (e.g., BTC, ETH, SOL)",
            enum: Object.keys(COIN_ID_MAP),
          },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_trending_coins",
      description:
        "Get the top trending cryptocurrencies based on current search activity and social buzz. Returns the most popular coins being discussed right now.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_market_movers",
      description:
        "Get the top gainers and losers in the cryptocurrency market over the last 24 hours. Returns the biggest price movers both up and down.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_category_info",
      description:
        "Get cryptocurrencies in a specific category (e.g., defi, layer-1, meme-token, ai-big-data, gaming, etc.). Useful for analyzing market sectors and themed collections of coins.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "The category ID (e.g., 'defi', 'layer-1', 'meme-token', 'ai-big-data', 'gaming', 'privacy-coins', 'exchange-based-tokens')",
          },
        },
        required: ["category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_research",
      description:
        "Conduct comprehensive AI-powered deep research on any topic using Parallel AI. Returns: full answer, summary, key findings (up to 5 categorized insights with sources), citations (up to 10 sources with URLs, titles, excerpts), research quality metrics (confidence level, research depth, sources analyzed count). Returns structured data including answer (full research content), summary (300 char overview), key_findings (array of categorized insights with source attribution), citations (comprehensive source list), total_citations, sources_analyzed, confidence_level (high/medium/low), and research_depth (comprehensive/standard). Perfect for in-depth analysis, trend research, comparative studies, and gathering authoritative information with full source tracking.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description: "The research topic or question requiring deep analysis (e.g., 'latest Ethereum scaling solutions with technical details', 'Bitcoin ETF approval timeline and impact analysis', 'comprehensive DeFi lending protocols comparison')",
          },
        },
        required: ["topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Perform fast, ranked web search to find recent information, news articles, and relevant URLs. Returns: search results (up to 10 items with title, URL, full excerpt, short excerpt, domain, relevance score, rank, published date, author, type), top_result (most relevant match), search quality metrics (total results count, unique sources count, domain list, average relevance score, quality score rating, has recent content flag). Each result includes rank, title, url, excerpt (500 chars), short_excerpt (150 chars), domain, relevance_score (0-1), published_date, author, and type. Also returns query, total_results, unique_sources, domains (top 5), average_relevance, quality_score (high/medium/standard), and has_recent_content. Ideal for quick information lookup, finding specific sources, getting recent news/updates, and comparing multiple viewpoints from different domains.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query (e.g., 'Solana network updates', 'Chainlink price analysis')",
          },
        },
        required: ["query"],
      },
    },
  },
  // ==================== GENERAL PURPOSE TOOLS ====================
  // Note: General-purpose tools (calculate, time, code, translate, summarize, etc.)
  // are not implemented yet. Only crypto/blockchain tools are currently functional.
  {
    type: "function",
    function: {
      name: "get_coinmarketcap_data",
      description:
        "Get comprehensive cryptocurrency data from CoinMarketCap including prices, market data, exchanges, airdrops, and historical information. Provides authoritative market data with rankings, volume, market cap, and detailed metadata.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            description: "Type of data to retrieve",
            enum: ["price", "listings", "metadata", "global", "trending", "gainers_losers", "convert", "exchanges", "airdrops", "market_pairs", "performance"],
          },
          symbol: {
            type: "string",
            description: "Cryptocurrency symbol (e.g., 'BTC', 'ETH') - required for price, metadata, convert, market_pairs, performance",
          },
          limit: {
            type: "number",
            description: "Number of results to return (default: 100)",
          },
          convert_to: {
            type: "string",
            description: "Currency to convert to for 'convert' action (default: 'USD')",
          },
          amount: {
            type: "number",
            description: "Amount to convert for 'convert' action",
          },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_sentiment_analysis",
      description:
        "Get comprehensive multi-source sentiment analysis for a cryptocurrency. Aggregates sentiment from price action, market metrics, on-chain data, and social indicators. Returns overall sentiment score (0-100), sentiment label (VERY BULLISH/BULLISH/NEUTRAL/BEARISH/VERY BEARISH), confidence level, reliability score, and breakdown by source (price, market, onchain). Use this for sentiment-driven trading decisions and market psychology analysis.",
      parameters: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            description: "The cryptocurrency symbol (e.g., BTC, ETH, SOL)",
          },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_historical_prices",
      description:
        "Get historical price data for a cryptocurrency over a specified time period. Returns daily/hourly price points, volume, and market cap data. Useful for trend analysis, pattern recognition, and understanding price movements over time. Data includes timestamps, prices, volumes, and percentage changes.",
      parameters: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            description: "The cryptocurrency symbol (e.g., BTC, ETH, SOL)",
          },
          days: {
            type: "number",
            description: "Number of days of historical data to retrieve (1-365). Default: 30",
          },
        },
        required: ["symbol"],
      },
    },
  },
];

export { AVAILABLE_TOOLS, COIN_ID_MAP };
export default AVAILABLE_TOOLS;
