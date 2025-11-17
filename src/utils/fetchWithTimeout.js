// Fetch utilities with timeout protection and retry logic

/**
 * Fetch with automatic timeout protection
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 * @returns {Promise<Response>} - Fetch response
 * @throws {Error} - Timeout or network error
 */
export const fetchWithTimeout = async (url, options = {}, timeout = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout / 1000}s`);
    }
    throw error;
  }
};

/**
 * Fetch with retry logic and exponential backoff
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @param {number} timeout - Timeout per attempt in ms (default: 30000)
 * @returns {Promise<Response>} - Fetch response
 */
export const fetchWithRetry = async (
  url,
  options = {},
  maxRetries = 3,
  timeout = 30000
) => {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);

      // Retry on server errors (5xx) but not client errors (4xx)
      if (response.status >= 500 && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;

      // Don't retry on timeout for final attempt
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff before retry
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Fetch JSON with timeout and automatic error handling
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<any>} - Parsed JSON response
 */
export const fetchJSON = async (url, options = {}, timeout = 30000) => {
  const response = await fetchWithTimeout(url, options, timeout);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(`Invalid JSON response: ${error.message}`);
  }
};

/**
 * Creates a rate-limited fetch function
 * @param {number} maxRequestsPerSecond - Maximum requests per second
 * @returns {Function} - Rate-limited fetch function
 */
export const createRateLimitedFetch = (maxRequestsPerSecond = 5) => {
  const queue = [];
  const minInterval = 1000 / maxRequestsPerSecond;
  let lastRequestTime = 0;

  const processQueue = async () => {
    if (queue.length === 0) return;

    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < minInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, minInterval - timeSinceLastRequest)
      );
    }

    const { url, options, timeout, resolve, reject } = queue.shift();
    lastRequestTime = Date.now();

    try {
      const response = await fetchWithTimeout(url, options, timeout);
      resolve(response);
    } catch (error) {
      reject(error);
    }

    processQueue(); // Process next item
  };

  return (url, options, timeout) => {
    return new Promise((resolve, reject) => {
      queue.push({ url, options, timeout, resolve, reject });
      if (queue.length === 1) {
        processQueue();
      }
    });
  };
};

export default fetchWithTimeout;
