/**
 * Discovery Service - Phase 1 of Scout Framework
 *
 * Aggregates token candidates from multiple sources:
 * - CoinGecko (new listings, trending)
 * - DexScreener (new DEX pairs)
 * - CoinMarketCap (recently added)
 * - pump.fun (Solana memecoins)
 *
 * Normalizes data into unified candidate format
 */

class DiscoveryService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes

    // API endpoints
    this.endpoints = {
      coingecko: {
        newCoins: 'https://api.coingecko.com/api/v3/coins/list',
        trending: 'https://api.coingecko.com/api/v3/search/trending',
        markets: 'https://api.coingecko.com/api/v3/coins/markets'
      },
      dexscreener: {
        newPairs: 'https://api.dexscreener.com/latest/dex/tokens',
        search: 'https://api.dexscreener.com/latest/dex/search'
      },
      coinmarketcap: {
        listings: '/api/cmc/listings',
        recent: '/api/cmc/recent'
      },
      pumpfun: {
        new: 'https://frontend-api.pump.fun/coins/latest',
        king: 'https://frontend-api.pump.fun/coins/king-of-the-hill'
      }
    };

    // Sector keywords for categorization
    this.sectorKeywords = {
      DeFi: ['defi', 'swap', 'yield', 'lending', 'stake', 'liquidity', 'amm', 'dex'],
      AI: ['ai', 'artificial', 'intelligence', 'machine', 'learning', 'neural', 'gpt', 'llm'],
      Gaming: ['game', 'gaming', 'play', 'metaverse', 'nft', 'p2e', 'play-to-earn'],
      Meme: ['meme', 'doge', 'shib', 'pepe', 'wojak', 'chad', 'moon', 'inu', 'elon'],
      Infra: ['infrastructure', 'layer', 'scaling', 'bridge', 'oracle', 'storage', 'compute'],
      RWA: ['rwa', 'real world', 'tokenized', 'asset', 'commodity', 'estate']
    };
  }

  /**
   * Discover from CoinGecko
   */
  async discoverFromCoinGecko(mcRange, params) {
    const cacheKey = `coingecko_${mcRange.max}_${params.sector}`;

    // Check cache
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    const candidates = [];

    try {
      // Get trending coins
      const trendingResponse = await fetch(this.endpoints.coingecko.trending);
      if (trendingResponse.ok) {
        const trending = await trendingResponse.json();

        if (trending.coins) {
          for (const item of trending.coins) {
            const coin = item.item;
            candidates.push(this.normalizeCoinGeckoData({
              id: coin.id,
              symbol: coin.symbol,
              name: coin.name,
              market_cap_rank: coin.market_cap_rank,
              thumb: coin.thumb,
              price_btc: coin.price_btc,
              source: 'coingecko_trending'
            }));
          }
        }
      }

      // Get market data for small caps
      const marketParams = new URLSearchParams({
        vs_currency: 'usd',
        order: 'market_cap_asc',
        per_page: 100,
        page: 1,
        sparkline: false
      });

      const marketsResponse = await fetch(
        `${this.endpoints.coingecko.markets}?${marketParams}`
      );

      if (marketsResponse.ok) {
        const markets = await marketsResponse.json();

        for (const coin of markets) {
          // Filter by market cap range
          if (coin.market_cap && coin.market_cap <= mcRange.max && coin.market_cap >= mcRange.min) {
            candidates.push(this.normalizeCoinGeckoData({
              ...coin,
              source: 'coingecko_markets'
            }));
          }
        }
      }

      // Cache results
      this.setCache(cacheKey, candidates);

      return candidates;

    } catch (error) {
      console.error('[Discovery] CoinGecko error:', error.message);
      return [];
    }
  }

  /**
   * Discover from DexScreener
   */
  async discoverFromDexScreener(mcRange, params) {
    const cacheKey = `dexscreener_${mcRange.max}_${params.chains?.join('_')}`;

    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    const candidates = [];

    try {
      // Search for new pairs on each chain
      const chains = params.chains || ['solana', 'ethereum', 'bsc'];

      for (const chain of chains) {
        try {
          // DexScreener doesn't have a direct "new pairs" endpoint publicly
          // We'll use search with common new token patterns
          const searchTerms = ['new', 'launch', 'fair'];

          for (const term of searchTerms.slice(0, 1)) { // Limit to reduce API calls
            const response = await fetch(
              `${this.endpoints.dexscreener.search}?q=${term}`
            );

            if (response.ok) {
              const data = await response.json();

              if (data.pairs) {
                for (const pair of data.pairs) {
                  // Filter by chain and market cap
                  if (pair.chainId?.toLowerCase() === chain.toLowerCase()) {
                    const marketCap = parseFloat(pair.fdv) || parseFloat(pair.marketCap) || 0;

                    if (marketCap <= mcRange.max && marketCap >= mcRange.min) {
                      candidates.push(this.normalizeDexScreenerData(pair));
                    }
                  }
                }
              }
            }

            // Rate limit delay
            await this.sleep(500);
          }
        } catch (chainError) {
          console.error(`[Discovery] DexScreener ${chain} error:`, chainError.message);
        }
      }

      // Deduplicate
      const unique = this.deduplicateCandidates(candidates);

      this.setCache(cacheKey, unique);
      return unique;

    } catch (error) {
      console.error('[Discovery] DexScreener error:', error.message);
      return [];
    }
  }

  /**
   * Discover from CoinMarketCap (via proxy)
   */
  async discoverFromCoinMarketCap(mcRange, params) {
    const cacheKey = `cmc_${mcRange.max}`;

    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    const candidates = [];

    try {
      // Use the existing CMC API through the proxy
      const response = await fetch(`/api/cmc/v1/cryptocurrency/listings/latest?limit=200&sort=date_added&sort_dir=desc`);

      if (response.ok) {
        const data = await response.json();

        if (data.data) {
          for (const coin of data.data) {
            const marketCap = coin.quote?.USD?.market_cap || 0;

            if (marketCap <= mcRange.max && marketCap >= mcRange.min) {
              candidates.push(this.normalizeCMCData(coin));
            }
          }
        }
      }

      this.setCache(cacheKey, candidates);
      return candidates;

    } catch (error) {
      console.error('[Discovery] CMC error:', error.message);
      return [];
    }
  }

  /**
   * Discover from pump.fun (Solana memecoins)
   */
  async discoverFromPumpFun(mcRange, params) {
    const cacheKey = `pumpfun_${mcRange.max}`;

    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    const candidates = [];

    try {
      // Get latest coins
      const response = await fetch(this.endpoints.pumpfun.new);

      if (response.ok) {
        const coins = await response.json();

        for (const coin of coins) {
          const marketCap = coin.usd_market_cap || coin.market_cap || 0;

          if (marketCap <= mcRange.max && marketCap >= mcRange.min) {
            candidates.push(this.normalizePumpFunData(coin));
          }
        }
      }

      // Also get "king of the hill" coins
      const kingResponse = await fetch(this.endpoints.pumpfun.king);

      if (kingResponse.ok) {
        const kings = await kingResponse.json();

        for (const coin of kings) {
          const marketCap = coin.usd_market_cap || coin.market_cap || 0;

          if (marketCap <= mcRange.max && marketCap >= mcRange.min) {
            candidates.push(this.normalizePumpFunData(coin));
          }
        }
      }

      const unique = this.deduplicateCandidates(candidates);
      this.setCache(cacheKey, unique);
      return unique;

    } catch (error) {
      console.error('[Discovery] pump.fun error:', error.message);
      return [];
    }
  }

  /**
   * Fetch data for a specific token
   */
  async fetchTokenData(symbolOrAddress) {
    try {
      // Try DexScreener first (works with addresses)
      if (symbolOrAddress.length > 20) {
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${symbolOrAddress}`
        );

        if (response.ok) {
          const data = await response.json();

          if (data.pairs && data.pairs.length > 0) {
            // Get the pair with highest liquidity
            const bestPair = data.pairs.reduce((best, pair) =>
              (parseFloat(pair.liquidity?.usd) || 0) > (parseFloat(best.liquidity?.usd) || 0) ? pair : best
            );

            return this.normalizeDexScreenerData(bestPair);
          }
        }
      }

      // Try CoinGecko by symbol
      const cgResponse = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${symbolOrAddress}`
      );

      if (cgResponse.ok) {
        const data = await cgResponse.json();

        if (data.coins && data.coins.length > 0) {
          const coin = data.coins[0];

          // Get full market data
          const marketResponse = await fetch(
            `https://api.coingecko.com/api/v3/coins/${coin.id}`
          );

          if (marketResponse.ok) {
            const marketData = await marketResponse.json();
            return this.normalizeCoinGeckoData({
              ...marketData,
              source: 'coingecko_search'
            });
          }
        }
      }

      return null;

    } catch (error) {
      console.error('[Discovery] fetchTokenData error:', error.message);
      return null;
    }
  }

  // ==================== NORMALIZATION METHODS ====================

  /**
   * Normalize CoinGecko data to unified format
   */
  normalizeCoinGeckoData(data) {
    return {
      // Identity
      id: data.id,
      symbol: data.symbol?.toUpperCase(),
      name: data.name,
      address: data.platforms?.ethereum || data.platforms?.['binance-smart-chain'] || data.contract_address,
      chain: this.detectChainFromPlatforms(data.platforms),

      // Market data
      price: data.current_price || data.market_data?.current_price?.usd,
      marketCap: data.market_cap || data.market_data?.market_cap?.usd,
      fdv: data.fully_diluted_valuation || data.market_data?.fully_diluted_valuation?.usd,
      volume24h: data.total_volume || data.market_data?.total_volume?.usd,
      priceChange24h: data.price_change_percentage_24h || data.market_data?.price_change_percentage_24h,

      // Supply
      circulatingSupply: data.circulating_supply || data.market_data?.circulating_supply,
      totalSupply: data.total_supply || data.market_data?.total_supply,
      maxSupply: data.max_supply || data.market_data?.max_supply,

      // Metadata
      image: data.image?.small || data.thumb,
      description: data.description?.en?.substring(0, 500),
      categories: data.categories || [],
      sector: this.detectSector(data.name, data.categories),

      // Social
      twitter: data.links?.twitter_screen_name,
      telegram: data.links?.telegram_channel_identifier,
      website: data.links?.homepage?.[0],

      // Timestamps
      launchDate: data.genesis_date,
      listedAt: data.market_data?.ath_date?.usd,

      // Source
      source: data.source || 'coingecko',
      sourceData: data
    };
  }

  /**
   * Normalize DexScreener data to unified format
   */
  normalizeDexScreenerData(pair) {
    return {
      // Identity
      id: pair.pairAddress,
      symbol: pair.baseToken?.symbol?.toUpperCase(),
      name: pair.baseToken?.name,
      address: pair.baseToken?.address,
      chain: pair.chainId?.toLowerCase(),

      // Market data
      price: parseFloat(pair.priceUsd) || 0,
      marketCap: parseFloat(pair.marketCap) || parseFloat(pair.fdv) || 0,
      fdv: parseFloat(pair.fdv) || 0,
      volume24h: parseFloat(pair.volume?.h24) || 0,
      priceChange24h: parseFloat(pair.priceChange?.h24) || 0,
      liquidity: parseFloat(pair.liquidity?.usd) || 0,

      // Pair info
      pairAddress: pair.pairAddress,
      quoteToken: pair.quoteToken?.symbol,
      dexId: pair.dexId,

      // Timestamps
      pairCreatedAt: pair.pairCreatedAt,
      listedAt: pair.pairCreatedAt ? new Date(pair.pairCreatedAt).toISOString() : null,

      // URLs
      url: pair.url,

      // Metadata
      sector: this.detectSector(pair.baseToken?.name, []),
      categories: [],

      // Source
      source: 'dexscreener',
      sourceData: pair
    };
  }

  /**
   * Normalize CoinMarketCap data to unified format
   */
  normalizeCMCData(coin) {
    const quote = coin.quote?.USD || {};

    return {
      // Identity
      id: coin.id?.toString(),
      symbol: coin.symbol?.toUpperCase(),
      name: coin.name,
      address: coin.platform?.token_address,
      chain: this.mapCMCPlatform(coin.platform?.name),

      // Market data
      price: quote.price || 0,
      marketCap: quote.market_cap || 0,
      fdv: quote.fully_diluted_market_cap || 0,
      volume24h: quote.volume_24h || 0,
      priceChange24h: quote.percent_change_24h || 0,

      // Supply
      circulatingSupply: coin.circulating_supply,
      totalSupply: coin.total_supply,
      maxSupply: coin.max_supply,

      // Rankings
      cmcRank: coin.cmc_rank,

      // Timestamps
      listedAt: coin.date_added,

      // Metadata
      tags: coin.tags || [],
      sector: this.detectSector(coin.name, coin.tags),
      categories: coin.tags || [],

      // Source
      source: 'coinmarketcap',
      sourceData: coin
    };
  }

  /**
   * Normalize pump.fun data to unified format
   */
  normalizePumpFunData(coin) {
    return {
      // Identity
      id: coin.mint,
      symbol: coin.symbol?.toUpperCase(),
      name: coin.name,
      address: coin.mint,
      chain: 'solana',

      // Market data
      price: coin.price || 0,
      marketCap: coin.usd_market_cap || coin.market_cap || 0,
      fdv: coin.usd_market_cap || 0,
      volume24h: coin.volume_24h || 0,

      // Metadata
      description: coin.description,
      image: coin.image_uri,
      twitter: coin.twitter,
      telegram: coin.telegram,
      website: coin.website,

      // pump.fun specific
      bondingCurve: coin.bonding_curve,
      creator: coin.creator,
      isComplete: coin.complete,
      kingOfHill: coin.king_of_the_hill_timestamp,

      // Sector (meme by default for pump.fun)
      sector: 'Meme',
      categories: ['meme', 'solana'],

      // Timestamps
      createdAt: coin.created_timestamp,
      listedAt: coin.created_timestamp ? new Date(coin.created_timestamp).toISOString() : null,

      // Source
      source: 'pumpfun',
      sourceData: coin
    };
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Detect sector from name and categories
   */
  detectSector(name, categories = []) {
    const text = `${name || ''} ${(categories || []).join(' ')}`.toLowerCase();

    for (const [sector, keywords] of Object.entries(this.sectorKeywords)) {
      if (keywords.some(kw => text.includes(kw))) {
        return sector;
      }
    }

    return 'Other';
  }

  /**
   * Detect chain from CoinGecko platforms
   */
  detectChainFromPlatforms(platforms) {
    if (!platforms) return null;

    if (platforms.solana) return 'solana';
    if (platforms.ethereum || platforms['ethereum']) return 'ethereum';
    if (platforms['binance-smart-chain'] || platforms.bsc) return 'bsc';
    if (platforms.polygon) return 'polygon';
    if (platforms.avalanche) return 'avalanche';
    if (platforms.arbitrum) return 'arbitrum';

    return Object.keys(platforms)[0] || null;
  }

  /**
   * Map CMC platform to chain name
   */
  mapCMCPlatform(platform) {
    const mapping = {
      'Ethereum': 'ethereum',
      'BNB Smart Chain': 'bsc',
      'Binance Smart Chain': 'bsc',
      'Solana': 'solana',
      'Polygon': 'polygon',
      'Avalanche': 'avalanche',
      'Arbitrum': 'arbitrum'
    };

    return mapping[platform] || platform?.toLowerCase();
  }

  /**
   * Deduplicate candidates by address/symbol
   */
  deduplicateCandidates(candidates) {
    const seen = new Set();
    return candidates.filter(c => {
      const key = c.address?.toLowerCase() || c.symbol?.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Check if cache is valid
   */
  isCacheValid(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.cacheTimeout;
  }

  /**
   * Set cache
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default DiscoveryService;
