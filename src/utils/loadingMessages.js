// Loading state messages with context and time estimates

/**
 * Loading message templates with estimated times
 */
const LOADING_TEMPLATES = {
  // API Data Fetching
  fetch_price: {
    message: 'Fetching current price data',
    emoji: 'ᛉ',
    estimatedTime: '1-2s',
  },
  fetch_market: {
    message: 'Gathering market overview',
    emoji: 'ᛉ',
    estimatedTime: '2-3s',
  },
  fetch_historical: {
    message: 'Loading historical price data',
    emoji: 'ᛉ',
    estimatedTime: '3-5s',
  },
  fetch_trending: {
    message: 'Finding trending cryptocurrencies',
    emoji: 'ᛉ',
    estimatedTime: '2-3s',
  },
  fetch_onchain: {
    message: 'Analyzing on-chain metrics',
    emoji: 'ᛉ',
    estimatedTime: '4-6s',
  },

  // AI Operations
  ai_chat: {
    message: 'Channeling ancient wisdom',
    emoji: 'ᚠ',
    estimatedTime: '3-8s',
  },
  ai_analysis: {
    message: 'Analyzing your question',
    emoji: 'ᛋ',
    estimatedTime: '5-10s',
  },
  ai_research: {
    message: 'Conducting deep research',
    emoji: 'ᛟ',
    estimatedTime: '15-30s',
  },
  ai_websearch: {
    message: 'Searching the web',
    emoji: 'ᛉ',
    estimatedTime: '5-15s',
  },

  // ML Operations
  ml_training: {
    message: 'Training prediction model',
    emoji: 'ᚢ',
    estimatedTime: '10-30s',
  },
  ml_predicting: {
    message: 'Generating predictions',
    emoji: 'ᛞ',
    estimatedTime: '2-5s',
  },
  ml_sentiment: {
    message: 'Calculating market sentiment',
    emoji: 'ᛋ',
    estimatedTime: '5-10s',
  },
  ml_anomaly: {
    message: 'Detecting market anomalies',
    emoji: 'ᛪ',
    estimatedTime: '8-15s',
  },
  ml_patterns: {
    message: 'Identifying price patterns',
    emoji: 'ᛗ',
    estimatedTime: '10-20s',
  },

  // Data Processing
  processing_multi: {
    message: 'Processing data from multiple sources',
    emoji: 'ᚢ',
    estimatedTime: '5-10s',
  },
  processing_calc: {
    message: 'Performing calculations',
    emoji: 'ᛋ',
    estimatedTime: '1-3s',
  },

  // Tool Execution
  tool_executing: {
    message: 'Executing tools',
    emoji: 'ᛞ',
    estimatedTime: '3-10s',
  },
};

/**
 * Get loading message for operation
 * @param {string} operationType - Type of operation
 * @param {Object} context - Additional context (asset name, etc.)
 * @returns {string} - Formatted loading message
 */
export const getLoadingMessage = (operationType, context = {}) => {
  const template = LOADING_TEMPLATES[operationType] || LOADING_TEMPLATES.processing_calc;

  let message = `${template.emoji} ${template.message}`;

  // Add context if provided
  if (context.asset) {
    message += ` for ${context.asset}`;
  }

  if (context.days) {
    message += ` (${context.days} days)`;
  }

  // Add time estimate
  message += `...\n   Estimated time: ${template.estimatedTime}`;

  return message;
};

/**
 * Get progress message for long operations
 * @param {string} operation - Operation name
 * @param {number} current - Current step
 * @param {number} total - Total steps
 * @param {string} currentTask - Description of current task
 * @returns {string} - Formatted progress message
 */
export const getProgressMessage = (operation, current, total, currentTask = '') => {
  const percentage = Math.floor((current / total) * 100);
  const progressBar = createProgressBar(percentage);

  let message = `ᛟ ${operation} - ${percentage}%\n`;
  message += `${progressBar}\n`;

  if (currentTask) {
    message += `   ${currentTask}`;
  }

  return message;
};

/**
 * Create text-based progress bar
 * @param {number} percentage - Progress percentage (0-100)
 * @param {number} width - Width of progress bar
 * @returns {string} - Progress bar string
 */
const createProgressBar = (percentage, width = 20) => {
  const filled = Math.floor((percentage / 100) * width);
  const empty = width - filled;

  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
};

/**
 * Get step-by-step messages for multi-step operations
 * @param {string} operation - Operation name
 * @returns {Object} - Step messages
 */
export const getStepMessages = (operation) => {
  const steps = {
    predict: {
      1: { message: 'Fetching historical price data', emoji: 'ᛉ' },
      2: { message: 'Preparing training dataset', emoji: 'ᚢ' },
      3: { message: 'Training neural network', emoji: 'ᛞ' },
      4: { message: 'Generating predictions', emoji: 'ᛗ' },
      5: { message: 'Calculating confidence intervals', emoji: 'ᛋ' },
    },

    sentiment: {
      1: { message: 'Gathering price data', emoji: 'ᛉ' },
      2: { message: 'Analyzing social metrics', emoji: 'ᚢ' },
      3: { message: 'Checking on-chain activity', emoji: 'ᛞ' },
      4: { message: 'Scanning news sentiment', emoji: 'ᛗ' },
      5: { message: 'Calculating composite sentiment', emoji: 'ᛋ' },
    },

    research: {
      1: { message: 'Formulating search queries', emoji: 'ᛉ' },
      2: { message: 'Gathering web sources', emoji: 'ᚢ' },
      3: { message: 'Analyzing content', emoji: 'ᛞ' },
      4: { message: 'Synthesizing findings', emoji: 'ᛗ' },
      5: { message: 'Generating summary', emoji: 'ᛋ' },
    },

    analyze: {
      1: { message: 'Collecting market data', emoji: 'ᛉ' },
      2: { message: 'Running technical analysis', emoji: 'ᚢ' },
      3: { message: 'Evaluating fundamentals', emoji: 'ᛞ' },
      4: { message: 'Comparing to peers', emoji: 'ᛗ' },
      5: { message: 'Compiling analysis', emoji: 'ᛋ' },
    },
  };

  return steps[operation] || steps.predict;
};

/**
 * Format step message
 * @param {Object} step - Step object with message and emoji
 * @param {number} stepNum - Step number
 * @param {number} totalSteps - Total number of steps
 * @returns {string} - Formatted step message
 */
export const formatStepMessage = (step, stepNum, totalSteps) => {
  return `${step.emoji} Step ${stepNum}/${totalSteps}: ${step.message}...`;
};

/**
 * Get completion message
 * @param {string} operation - Operation name
 * @param {number} duration - Duration in milliseconds
 * @returns {string} - Completion message
 */
export const getCompletionMessage = (operation, duration) => {
  const seconds = (duration / 1000).toFixed(1);
  return `ᛟ ${operation} completed in ${seconds}s`;
};

/**
 * Get retry message
 * @param {string} operation - Operation name
 * @param {number} attempt - Current attempt number
 * @param {number} maxAttempts - Maximum attempts
 * @param {number} delaySeconds - Delay before retry
 * @returns {string} - Retry message
 */
export const getRetryMessage = (operation, attempt, maxAttempts, delaySeconds) => {
  return `ᛪ ${operation} failed (attempt ${attempt}/${maxAttempts})\n   Retrying in ${delaySeconds}s...`;
};

/**
 * Get timeout warning message
 * @param {string} operation - Operation name
 * @param {number} elapsedSeconds - Elapsed time
 * @returns {string} - Warning message
 */
export const getTimeoutWarning = (operation, elapsedSeconds) => {
  return `ᛋ ${operation} is taking longer than expected (${elapsedSeconds}s)\n   Please wait, still processing...`;
};

/**
 * Operation type constants for easy reference
 */
export const OperationType = {
  FETCH_PRICE: 'fetch_price',
  FETCH_MARKET: 'fetch_market',
  FETCH_HISTORICAL: 'fetch_historical',
  FETCH_TRENDING: 'fetch_trending',
  FETCH_ONCHAIN: 'fetch_onchain',
  AI_CHAT: 'ai_chat',
  AI_ANALYSIS: 'ai_analysis',
  AI_RESEARCH: 'ai_research',
  AI_WEBSEARCH: 'ai_websearch',
  ML_TRAINING: 'ml_training',
  ML_PREDICTING: 'ml_predicting',
  ML_SENTIMENT: 'ml_sentiment',
  ML_ANOMALY: 'ml_anomaly',
  ML_PATTERNS: 'ml_patterns',
  PROCESSING_MULTI: 'processing_multi',
  PROCESSING_CALC: 'processing_calc',
  TOOL_EXECUTING: 'tool_executing',
};

export default {
  getLoadingMessage,
  getProgressMessage,
  getStepMessages,
  formatStepMessage,
  getCompletionMessage,
  getRetryMessage,
  getTimeoutWarning,
  OperationType,
};
