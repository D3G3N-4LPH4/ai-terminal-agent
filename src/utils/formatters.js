// ==================== FORMATTING UTILITIES ====================
// Helper functions for consistent number/currency formatting throughout the app

/**
 * Format a number as USD currency with smart precision
 * @param {number} value - The number to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export const formatPrice = (value, options = {}) => {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 8,
  } = options;

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits,
    maximumFractionDigits,
  });
};

/**
 * Format a number as USD currency with no decimals (for volumes/market caps)
 * @param {number} value - The number to format
 * @returns {string} Formatted currency string with no decimals
 */
export const formatVolume = (value) => {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
};

/**
 * Format a percentage with 2 decimal places
 * @param {number} value - The percentage value (e.g., 5.23 for 5.23%)
 * @param {boolean} includeSign - Whether to include + for positive values
 * @returns {string} Formatted percentage string
 */
export const formatPercent = (value, includeSign = false) => {
  const formatted = value.toFixed(2);
  if (includeSign && value > 0) {
    return `+${formatted}%`;
  }
  return `${formatted}%`;
};

/**
 * Format a large number with smart precision
 * @param {number} value - The number to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted number string
 */
export const formatNumber = (value, options = {}) => {
  const {
    maximumFractionDigits = 2,
    minimumFractionDigits = 0,
  } = options;

  // For very large numbers (> 1M), use compact notation
  if (Math.abs(value) > 1000000) {
    return value.toLocaleString("en-US", {
      maximumFractionDigits,
      minimumFractionDigits,
    });
  }

  // For smaller numbers with decimals
  if (value % 1 !== 0) {
    return value.toFixed(maximumFractionDigits);
  }

  // For whole numbers
  return value.toLocaleString("en-US");
};

/**
 * Get rune symbol based on positive/negative value
 * @param {number} value - The value to check
 * @returns {string} Rune symbol (ᛏ for positive, ᛪ for negative)
 */
export const getChangeRune = (value) => {
  return value >= 0 ? "ᛏ" : "ᛪ";
};

/**
 * Format market cap or volume with abbreviated notation (K, M, B, T)
 * @param {number} value - The value to format
 * @returns {string} Abbreviated format (e.g., "1.2B", "350M")
 */
export const formatAbbreviated = (value) => {
  const absValue = Math.abs(value);

  if (absValue >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`;
  } else if (absValue >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  } else if (absValue >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  } else if (absValue >= 1e3) {
    return `$${(value / 1e3).toFixed(2)}K`;
  }

  return `$${value.toFixed(2)}`;
};

export default {
  formatPrice,
  formatVolume,
  formatPercent,
  formatNumber,
  getChangeRune,
  formatAbbreviated,
};
