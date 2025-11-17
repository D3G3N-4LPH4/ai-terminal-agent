// Contextual error handling utilities

/**
 * Error types for better categorization
 */
export const ErrorType = {
  API_KEY_MISSING: 'API_KEY_MISSING',
  API_KEY_INVALID: 'API_KEY_INVALID',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMIT: 'RATE_LIMIT',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  ML_ERROR: 'ML_ERROR',
  PARSING_ERROR: 'PARSING_ERROR',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Detect error type from error message
 * @param {Error} error - The error object
 * @returns {string} - Error type constant
 */
const detectErrorType = (error) => {
  const message = error.message?.toLowerCase() || '';

  if (message.includes('api key not configured') || message.includes('no api key')) {
    return ErrorType.API_KEY_MISSING;
  }
  if (message.includes('unauthorized') || message.includes('invalid api key') || message.includes('401')) {
    return ErrorType.API_KEY_INVALID;
  }
  if (message.includes('timeout') || message.includes('timed out')) {
    return ErrorType.TIMEOUT;
  }
  if (message.includes('rate limit') || message.includes('429') || message.includes('too many requests')) {
    return ErrorType.RATE_LIMIT;
  }
  if (message.includes('not found') || message.includes('404')) {
    return ErrorType.NOT_FOUND;
  }
  if (message.includes('failed to fetch') || message.includes('network') || error.name === 'TypeError') {
    return ErrorType.NETWORK_ERROR;
  }
  if (message.includes('invalid') || message.includes('validation')) {
    return ErrorType.VALIDATION_ERROR;
  }
  if (message.includes('model') || message.includes('prediction') || message.includes('training')) {
    return ErrorType.ML_ERROR;
  }
  if (message.includes('json') || message.includes('parse')) {
    return ErrorType.PARSING_ERROR;
  }

  return ErrorType.UNKNOWN;
};

/**
 * Get actionable error message based on error type
 * @param {string} errorType - Error type constant
 * @param {string} context - Context (e.g., command name, API name)
 * @returns {string} - User-friendly error message with action
 */
const getActionableMessage = (errorType, context = '') => {
  const messages = {
    [ErrorType.API_KEY_MISSING]: {
      message: 'API key not configured',
      action: 'Run "apikeys" command to set up your API keys',
      icon: 'ᛪ',
    },
    [ErrorType.API_KEY_INVALID]: {
      message: 'Invalid API key',
      action: 'Check your API key in "apikeys" settings',
      icon: 'ᛪ',
    },
    [ErrorType.NETWORK_ERROR]: {
      message: 'Network connection failed',
      action: 'Check your internet connection and backend server status',
      icon: 'ᛪ',
    },
    [ErrorType.TIMEOUT]: {
      message: 'Request timed out',
      action: 'Try again or check your network connection',
      icon: 'ᛪ',
    },
    [ErrorType.RATE_LIMIT]: {
      message: 'Rate limit exceeded',
      action: 'Wait a moment before trying again',
      icon: 'ᛪ',
    },
    [ErrorType.NOT_FOUND]: {
      message: `${context} not found`,
      action: 'Check your input and try again',
      icon: 'ᛪ',
    },
    [ErrorType.VALIDATION_ERROR]: {
      message: 'Invalid input',
      action: 'Use "help" command to see correct usage',
      icon: 'ᛪ',
    },
    [ErrorType.ML_ERROR]: {
      message: 'ML operation failed',
      action: 'Ensure sufficient data is available for the operation',
      icon: 'ᛪ',
    },
    [ErrorType.PARSING_ERROR]: {
      message: 'Invalid response format',
      action: 'The API returned unexpected data. Try again later',
      icon: 'ᛪ',
    },
    [ErrorType.UNKNOWN]: {
      message: 'An error occurred',
      action: 'Try again or contact support if the issue persists',
      icon: 'ᛪ',
    },
  };

  return messages[errorType] || messages[ErrorType.UNKNOWN];
};

/**
 * Format error for terminal output
 * @param {Error} error - The error object
 * @param {string} context - Context information (command, API, etc.)
 * @param {boolean} includeStack - Include stack trace for debugging
 * @returns {string} - Formatted error message
 */
export const formatError = (error, context = '', includeStack = false) => {
  const errorType = detectErrorType(error);
  const actionable = getActionableMessage(errorType, context);

  let output = `${actionable.icon} ${actionable.message}`;

  if (context) {
    output += ` (${context})`;
  }

  output += `\nᛋ ${actionable.action}`;

  // Add original error message if different
  if (error.message && !output.toLowerCase().includes(error.message.toLowerCase())) {
    output += `\n\nDetails: ${error.message}`;
  }

  // Add stack trace in development
  if (includeStack && error.stack) {
    output += `\n\nStack trace:\n${error.stack}`;
  }

  return output;
};

/**
 * Handle command errors with context
 * @param {Error} error - The error object
 * @param {string} commandName - Name of the command that failed
 * @param {Object} addOutput - Function to add output to terminal
 * @param {boolean} includeStack - Include stack trace
 */
export const handleCommandError = (error, commandName, addOutput, includeStack = false) => {
  const errorMessage = formatError(error, commandName, includeStack);

  addOutput({
    type: 'error',
    content: errorMessage,
  });

  // Log to console for debugging
  console.error(`[${commandName}] Error:`, error);
};

/**
 * Create error with type annotation
 * @param {string} message - Error message
 * @param {string} type - Error type constant
 * @returns {Error} - Error with type property
 */
export const createError = (message, type = ErrorType.UNKNOWN) => {
  const error = new Error(message);
  error.type = type;
  return error;
};

/**
 * Validate API response and throw appropriate error
 * @param {Response} response - Fetch response
 * @param {string} apiName - Name of the API
 * @throws {Error} - Typed error based on status code
 */
export const validateAPIResponse = async (response, apiName) => {
  if (response.ok) return;

  const status = response.status;
  let errorMessage = '';

  try {
    const errorBody = await response.text();
    errorMessage = errorBody || response.statusText;
  } catch {
    errorMessage = response.statusText;
  }

  if (status === 401 || status === 403) {
    throw createError(
      `Unauthorized access to ${apiName}: ${errorMessage}`,
      ErrorType.API_KEY_INVALID
    );
  }

  if (status === 404) {
    throw createError(
      `Resource not found in ${apiName}: ${errorMessage}`,
      ErrorType.NOT_FOUND
    );
  }

  if (status === 429) {
    throw createError(
      `Rate limit exceeded for ${apiName}: ${errorMessage}`,
      ErrorType.RATE_LIMIT
    );
  }

  if (status >= 500) {
    throw createError(
      `${apiName} server error (${status}): ${errorMessage}`,
      ErrorType.NETWORK_ERROR
    );
  }

  throw createError(
    `${apiName} error (${status}): ${errorMessage}`,
    ErrorType.UNKNOWN
  );
};

/**
 * Wrap async function with error handling
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context for error messages
 * @param {Object} addOutput - Terminal output function
 * @returns {Function} - Wrapped function
 */
export const withErrorHandling = (fn, context, addOutput) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleCommandError(error, context, addOutput);
      throw error; // Re-throw for caller to handle if needed
    }
  };
};

export default {
  ErrorType,
  formatError,
  handleCommandError,
  createError,
  validateAPIResponse,
  withErrorHandling,
};
