// API_CONFIG should be imported or defined in consuming code
const getAPIConfig = () => {
  if (typeof window !== 'undefined' && window.API_CONFIG) {
    return window.API_CONFIG;
  }
  // Fallback for server-side usage
  return {
    scraperAPI: {
      baseUrl: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001'
    }
  };
};

class ScraperAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    const apiConfig = getAPIConfig();
    this.baseUrl = apiConfig.scraperAPI.baseUrl;
  }

  async scrapeUrl(url, options = {}) {
    if (!this.apiKey || this.apiKey.trim() === "") {
      throw new Error(
        "ScraperAPI key not configured. Use 'apikeys' command to set it up."
      );
    }

    try {
      // Clean the API key (remove any prefix if accidentally included)
      let cleanKey = this.apiKey.trim();
      if (cleanKey.includes("=")) {
        cleanKey = cleanKey.split("=").pop();
      }

      // Build query parameters (API key goes in header now)
      const params = new URLSearchParams({
        url: url,
        render: options.render || "false", // Set to true for JavaScript rendering
        country_code: options.countryCode || "us",
      });

      // Use backend proxy with API key in header
      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        headers: {
          'x-scraper-api-key': cleanKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(
          `ScraperAPI error (${response.status}): ${
            errorText || response.statusText
          }`
        );
      }

      const html = await response.text();
      return html;
    } catch (error) {
      console.error("ScraperAPI error:", error);

      const isCorsError =
        error.message.includes("Failed to fetch") ||
        error.message.includes("CORS");
      if (isCorsError) {
        throw new Error(
          "CORS Error: ScraperAPI cannot be called directly from the browser.\n\n" +
            "Solution: Backend server not running. Start it with 'npm start'\n" +
            "Alternative: Use the free web scraper (type 'news' or 'trending')"
        );
      }

      throw error;
    }
  }

  async scrapeWithAI(url, prompt) {
    // First scrape the URL
    const html = await this.scrapeUrl(url, { render: "true" });

    // Extract text content (simple version - removes HTML tags)
    const text = html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Limit text to avoid token limits (first 3000 chars)
    const limitedText = text.substring(0, 3000);

    return {
      html: html,
      text: limitedText,
      url: url,
    };
  }

  /**
   * Google Search using ScraperAPI Structured Data
   * @param {string} query - Search query
   * @param {object} options - Search options (num, country_code, output_format)
   * @returns {Promise<object>} - Search results
   */
  async googleSearch(query, options = {}) {
    if (!this.apiKey || this.apiKey.trim() === "") {
      throw new Error(
        "ScraperAPI key not configured. Use 'apikeys' command to set it up."
      );
    }

    try {
      let cleanKey = this.apiKey.trim();
      if (cleanKey.includes("=")) {
        cleanKey = cleanKey.split("=").pop();
      }

      const params = new URLSearchParams({
        query: query,
        num: options.num || '10',
        country_code: options.countryCode || 'us',
      });

      // Use backend proxy for Google Search
      const response = await fetch(`${this.baseUrl}/google?${params.toString()}`, {
        headers: {
          'x-scraper-api-key': cleanKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(
          `ScraperAPI Google Search error (${response.status}): ${errorText || response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("ScraperAPI Google Search error:", error);
      throw error;
    }
  }

}

export { ScraperAPI };
export default ScraperAPI;
