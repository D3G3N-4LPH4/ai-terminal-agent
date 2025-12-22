// API_CONFIG should be imported or defined in consuming code
import { fetchWithTimeout } from '../utils/fetchWithTimeout.js';
import { caches, cachedAPICall } from '../utils/requestCache.js';
import { validateAPIResponse, createError, ErrorType } from '../utils/errorHandler.js';

const getAPIConfig = () => {
  if (typeof window !== 'undefined' && window.API_CONFIG) {
    return window.API_CONFIG;
  }
  // Fallback for server-side usage
  return {
    parallel: {
      baseUrl: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001'
    }
  };
};

class ParallelAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    const apiConfig = getAPIConfig();
    this.baseUrl = apiConfig.parallel.baseUrl;
  }

  async search(objective, queries = [], maxResults = 10) {
    if (!this.apiKey || this.apiKey.trim() === "") {
      throw createError(
        "Parallel AI API key not configured. Use 'apikeys' command to set it up.",
        ErrorType.API_KEY_MISSING
      );
    }

    try {
      const response = await fetchWithTimeout(`${this.baseUrl}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({
          objective: objective,
          queries: queries,
          max_results: maxResults,
        }),
      }, 30000); // 30s timeout for search

      if (!response.ok) {
        await validateAPIResponse(response, 'Parallel AI');
      }

      return await response.json();
    } catch (error) {
      console.error("Parallel Search error:", error);

      // Handle CORS errors
      if (error.message?.includes('Failed to fetch') || error.message?.includes('CORS') || error.name === 'TypeError') {
        throw createError(
          "CORS Error: Parallel AI cannot be called directly from the browser.\n\n" +
          "Solution: Backend server not running. Start it with 'npm start'",
          ErrorType.NETWORK_ERROR
        );
      }

      throw error;
    }
  }

  async task(objective, processor = "base") {
    if (!this.apiKey || this.apiKey.trim() === "") {
      throw createError(
        "Parallel AI API key not configured. Use 'apikeys' command to set it up.",
        ErrorType.API_KEY_MISSING
      );
    }

    try {
      const response = await fetchWithTimeout(`${this.baseUrl}/task`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({
          objective: objective,
          processor: processor,
        }),
      }, 30000); // 30s timeout

      if (!response.ok) {
        await validateAPIResponse(response, 'Parallel AI');
      }

      return await response.json();
    } catch (error) {
      console.error("Parallel Task error:", error);

      // Handle CORS errors
      if (error.message?.includes('Failed to fetch') || error.message?.includes('CORS') || error.name === 'TypeError') {
        throw createError(
          "CORS Error: Parallel AI cannot be called directly from the browser.\n\n" +
          "Solution: Backend server not running. Start it with 'npm start'",
          ErrorType.NETWORK_ERROR
        );
      }

      throw error;
    }
  }

  async extract(urls, objective) {
    if (!this.apiKey || this.apiKey.trim() === "") {
      throw createError(
        "Parallel AI API key not configured. Use 'apikeys' command to set it up.",
        ErrorType.API_KEY_MISSING
      );
    }

    try {
      const urlsArray = Array.isArray(urls) ? urls : [urls];

      const response = await fetchWithTimeout(`${this.baseUrl}/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({
          urls: urlsArray,
          objective: objective,
        }),
      }, 30000); // 30s timeout

      if (!response.ok) {
        await validateAPIResponse(response, 'Parallel AI');
      }

      return await response.json();
    } catch (error) {
      console.error("Parallel Extract error:", error);

      // Handle CORS errors
      if (error.message?.includes('Failed to fetch') || error.message?.includes('CORS') || error.name === 'TypeError') {
        throw createError(
          "CORS Error: Parallel AI cannot be called directly from the browser.\n\n" +
          "Solution: Backend server not running. Start it with 'npm start'",
          ErrorType.NETWORK_ERROR
        );
      }

      throw error;
    }
  }
}

export { ParallelAPI };
export default ParallelAPI;
