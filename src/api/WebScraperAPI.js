class WebScraperAPI {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async fetchCryptoNews() {
    try {
      // Using a public crypto news API (CoinGecko trending)
      const response = await fetch(
        "https://api.coingecko.com/api/v3/search/trending"
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch news: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Web scraper error:", error);
      throw error;
    }
  }

  async fetchCryptoFearGreedIndex() {
    try {
      // Using Alternative.me Fear & Greed Index API
      const response = await fetch("https://api.alternative.me/fng/?limit=1");

      if (!response.ok) {
        throw new Error(
          `Failed to fetch Fear & Greed Index: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Fear & Greed Index error:", error);
      throw error;
    }
  }

  async fetchGlobalMarketData() {
    try {
      const response = await fetch("https://api.coingecko.com/api/v3/global");

      if (!response.ok) {
        throw new Error(`Failed to fetch global data: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Global market data error:", error);
      throw error;
    }
  }
}

export { WebScraperAPI };
export default WebScraperAPI;
