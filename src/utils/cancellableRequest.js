/**
 * Cancellable request management utilities
 * Provides request cancellation support using AbortController
 */

/**
 * Request manager class for handling cancellable requests
 */
export class RequestManager {
  constructor() {
    this.activeRequests = new Map();
  }

  /**
   * Create a new cancellable request
   * @param {string} requestId - Unique identifier for the request
   * @returns {AbortController} - AbortController for the request
   */
  createRequest(requestId) {
    // Cancel any existing request with the same ID
    this.cancelRequest(requestId);

    const controller = new AbortController();
    this.activeRequests.set(requestId, controller);

    return controller;
  }

  /**
   * Cancel a specific request by ID
   * @param {string} requestId - Request identifier to cancel
   * @returns {boolean} - True if request was cancelled, false if not found
   */
  cancelRequest(requestId) {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(requestId);
      return true;
    }
    return false;
  }

  /**
   * Cancel all active requests
   */
  cancelAllRequests() {
    for (const [requestId, controller] of this.activeRequests.entries()) {
      controller.abort();
    }
    this.activeRequests.clear();
  }

  /**
   * Get the AbortSignal for a request
   * @param {string} requestId - Request identifier
   * @returns {AbortSignal|null} - AbortSignal or null if not found
   */
  getSignal(requestId) {
    const controller = this.activeRequests.get(requestId);
    return controller ? controller.signal : null;
  }

  /**
   * Check if a request is active
   * @param {string} requestId - Request identifier
   * @returns {boolean} - True if request is active
   */
  isActive(requestId) {
    return this.activeRequests.has(requestId);
  }

  /**
   * Clean up completed request
   * @param {string} requestId - Request identifier to clean up
   */
  cleanupRequest(requestId) {
    this.activeRequests.delete(requestId);
  }

  /**
   * Get count of active requests
   * @returns {number} - Number of active requests
   */
  getActiveCount() {
    return this.activeRequests.size;
  }
}

/**
 * Create a cancellable fetch wrapper
 * @param {RequestManager} requestManager - Request manager instance
 * @param {string} requestId - Unique request identifier
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>} - Fetch response
 */
export const cancellableFetch = async (
  requestManager,
  requestId,
  url,
  options = {},
  timeout = 30000
) => {
  const controller = requestManager.createRequest(requestId);
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    requestManager.cleanupRequest(requestId);

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    requestManager.cleanupRequest(requestId);

    if (error.name === 'AbortError') {
      throw new Error(`Request cancelled or timed out after ${timeout / 1000}s`);
    }
    throw error;
  }
};

/**
 * Wrapper for AI chat requests with cancellation support
 * @param {RequestManager} requestManager - Request manager instance
 * @param {string} requestId - Unique request identifier
 * @param {Function} chatFunction - The chat API function to call
 * @param {Array} messages - Chat messages
 * @param {Object} options - Chat options
 * @returns {Promise<any>} - Chat response
 */
export const cancellableChat = async (
  requestManager,
  requestId,
  chatFunction,
  messages,
  options = {}
) => {
  const controller = requestManager.createRequest(requestId);

  try {
    // Add abort signal to options if the chat function supports it
    const chatOptions = {
      ...options,
      signal: controller.signal,
    };

    const response = await chatFunction(messages, chatOptions);
    requestManager.cleanupRequest(requestId);

    return response;
  } catch (error) {
    requestManager.cleanupRequest(requestId);

    if (error.name === 'AbortError') {
      throw new Error('Chat request was cancelled');
    }
    throw error;
  }
};

/**
 * Create a hook for React components to manage cancellable requests
 * Returns a RequestManager that automatically cancels all requests on unmount
 */
export const createRequestManagerHook = () => {
  return function useRequestManager() {
    const [requestManager] = React.useState(() => new RequestManager());

    React.useEffect(() => {
      // Cleanup all requests when component unmounts
      return () => {
        requestManager.cancelAllRequests();
      };
    }, [requestManager]);

    return requestManager;
  };
};

/**
 * Debounced request execution
 * Cancels previous requests if a new one is made within the debounce period
 */
export class DebouncedRequestManager extends RequestManager {
  constructor(debounceMs = 300) {
    super();
    this.debounceMs = debounceMs;
    this.debounceTimers = new Map();
  }

  /**
   * Execute a debounced request
   * @param {string} requestId - Request identifier
   * @param {Function} requestFunction - Function that returns a Promise
   * @returns {Promise<any>} - Request result
   */
  debouncedRequest(requestId, requestFunction) {
    return new Promise((resolve, reject) => {
      // Cancel previous debounce timer
      const existingTimer = this.debounceTimers.get(requestId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Cancel any active request with same ID
      this.cancelRequest(requestId);

      // Set new debounce timer
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(requestId);
        const controller = this.createRequest(requestId);

        try {
          const result = await requestFunction(controller.signal);
          this.cleanupRequest(requestId);
          resolve(result);
        } catch (error) {
          this.cleanupRequest(requestId);
          if (error.name === 'AbortError') {
            reject(new Error('Request was cancelled'));
          } else {
            reject(error);
          }
        }
      }, this.debounceMs);

      this.debounceTimers.set(requestId, timer);
    });
  }

  /**
   * Cancel all requests and timers
   */
  cancelAllRequests() {
    super.cancelAllRequests();

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }
}

// Global request manager instance for shared use
export const globalRequestManager = new RequestManager();

export default {
  RequestManager,
  cancellableFetch,
  cancellableChat,
  createRequestManagerHook,
  DebouncedRequestManager,
  globalRequestManager,
};
