/**
 * Centralized Logging Utility
 *
 * Provides consistent logging across the application with:
 * - Log levels (debug, info, warn, error)
 * - Timestamps
 * - Module context
 * - Color coding for console output
 * - Optional log persistence (localStorage for browser)
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

// Current log level (configurable)
let currentLogLevel = LOG_LEVELS.DEBUG;

// Log history for debugging (limited to last 500 entries)
const logHistory = [];
const MAX_LOG_HISTORY = 500;

// Console styling
const STYLES = {
  DEBUG: 'color: #888; font-style: italic;',
  INFO: 'color: #00FF41;',
  WARN: 'color: #FFD700; font-weight: bold;',
  ERROR: 'color: #FF4444; font-weight: bold;',
  MODULE: 'color: #00CED1; font-weight: bold;',
  TIMESTAMP: 'color: #666;',
};

/**
 * Format timestamp for logs
 * @returns {string} Formatted timestamp
 */
function formatTimestamp() {
  const now = new Date();
  return now.toISOString().substr(11, 12); // HH:mm:ss.SSS
}

/**
 * Add log entry to history
 * @param {Object} entry - Log entry
 */
function addToHistory(entry) {
  logHistory.push(entry);
  if (logHistory.length > MAX_LOG_HISTORY) {
    logHistory.shift();
  }
}

/**
 * Create a logger instance for a specific module
 * @param {string} moduleName - Name of the module
 * @returns {Object} Logger instance
 */
export function createLogger(moduleName) {
  const formatMessage = (level, message, data) => {
    const timestamp = formatTimestamp();
    const entry = {
      timestamp,
      level,
      module: moduleName,
      message,
      data,
    };
    addToHistory(entry);
    return entry;
  };

  return {
    /**
     * Log debug message (development only)
     * @param {string} message - Log message
     * @param {any} [data] - Optional data to log
     */
    debug(message, data) {
      if (currentLogLevel > LOG_LEVELS.DEBUG) return;
      const entry = formatMessage('DEBUG', message, data);
      console.log(
        `%c${entry.timestamp} %c[${moduleName}] %c${message}`,
        STYLES.TIMESTAMP,
        STYLES.MODULE,
        STYLES.DEBUG,
        data !== undefined ? data : ''
      );
    },

    /**
     * Log info message
     * @param {string} message - Log message
     * @param {any} [data] - Optional data to log
     */
    info(message, data) {
      if (currentLogLevel > LOG_LEVELS.INFO) return;
      const entry = formatMessage('INFO', message, data);
      console.log(
        `%c${entry.timestamp} %c[${moduleName}] %c${message}`,
        STYLES.TIMESTAMP,
        STYLES.MODULE,
        STYLES.INFO,
        data !== undefined ? data : ''
      );
    },

    /**
     * Log warning message
     * @param {string} message - Log message
     * @param {any} [data] - Optional data to log
     */
    warn(message, data) {
      if (currentLogLevel > LOG_LEVELS.WARN) return;
      const entry = formatMessage('WARN', message, data);
      console.warn(
        `%c${entry.timestamp} %c[${moduleName}] %c⚠ ${message}`,
        STYLES.TIMESTAMP,
        STYLES.MODULE,
        STYLES.WARN,
        data !== undefined ? data : ''
      );
    },

    /**
     * Log error message
     * @param {string} message - Log message
     * @param {any} [error] - Optional error object
     */
    error(message, error) {
      if (currentLogLevel > LOG_LEVELS.ERROR) return;
      const entry = formatMessage('ERROR', message, error);
      console.error(
        `%c${entry.timestamp} %c[${moduleName}] %c✖ ${message}`,
        STYLES.TIMESTAMP,
        STYLES.MODULE,
        STYLES.ERROR,
        error !== undefined ? error : ''
      );
    },

    /**
     * Log with timing measurement
     * @param {string} label - Timer label
     * @returns {Function} Function to call when operation completes
     */
    time(label) {
      const start = performance.now();
      return (message = 'completed') => {
        const duration = (performance.now() - start).toFixed(2);
        this.debug(`${label} ${message} (${duration}ms)`);
      };
    },

    /**
     * Log group start
     * @param {string} label - Group label
     */
    group(label) {
      if (currentLogLevel > LOG_LEVELS.DEBUG) return;
      console.groupCollapsed(
        `%c[${moduleName}] %c${label}`,
        STYLES.MODULE,
        STYLES.INFO
      );
    },

    /**
     * Log group end
     */
    groupEnd() {
      if (currentLogLevel > LOG_LEVELS.DEBUG) return;
      console.groupEnd();
    },
  };
}

/**
 * Set global log level
 * @param {string} level - Log level ('debug', 'info', 'warn', 'error', 'none')
 */
export function setLogLevel(level) {
  const levelMap = {
    debug: LOG_LEVELS.DEBUG,
    info: LOG_LEVELS.INFO,
    warn: LOG_LEVELS.WARN,
    error: LOG_LEVELS.ERROR,
    none: LOG_LEVELS.NONE,
  };
  currentLogLevel = levelMap[level.toLowerCase()] ?? LOG_LEVELS.DEBUG;
}

/**
 * Get current log level
 * @returns {string} Current log level name
 */
export function getLogLevel() {
  const levels = ['debug', 'info', 'warn', 'error', 'none'];
  return levels[currentLogLevel];
}

/**
 * Get log history
 * @param {number} [limit] - Maximum entries to return
 * @param {string} [level] - Filter by level
 * @returns {Array} Log entries
 */
export function getLogHistory(limit = 100, level = null) {
  let filtered = logHistory;
  if (level) {
    filtered = logHistory.filter(entry => entry.level === level.toUpperCase());
  }
  return filtered.slice(-limit);
}

/**
 * Clear log history
 */
export function clearLogHistory() {
  logHistory.length = 0;
}

/**
 * Export logs to JSON string
 * @returns {string} JSON string of log history
 */
export function exportLogs() {
  return JSON.stringify(logHistory, null, 2);
}

// Default logger for quick imports
const defaultLogger = createLogger('App');

export default {
  ...defaultLogger,
  createLogger,
  setLogLevel,
  getLogLevel,
  getLogHistory,
  clearLogHistory,
  exportLogs,
  LOG_LEVELS,
};
