// Coin validation utilities to reduce code duplication

/**
 * Validates a cryptocurrency symbol against COIN_ID_MAP
 * @param {string} symbol - The crypto symbol (e.g., 'BTC', 'ETH')
 * @param {Object} COIN_ID_MAP - Map of symbols to coin IDs
 * @returns {string|null} - Coin ID if valid, null if invalid
 */
export const validateCoinSymbol = (symbol, COIN_ID_MAP) => {
  if (!symbol) return null;
  const upperSymbol = symbol.toUpperCase();
  return COIN_ID_MAP[upperSymbol] || null;
};

/**
 * Gets formatted list of supported coins
 * @param {Object} COIN_ID_MAP - Map of symbols to coin IDs
 * @returns {string} - Comma-separated list of supported symbols
 */
export const getSupportedCoins = (COIN_ID_MAP) => {
  return Object.keys(COIN_ID_MAP).join(", ");
};

/**
 * Creates a standardized error message for invalid coin symbols
 * @param {string} symbol - The invalid symbol
 * @param {Object} COIN_ID_MAP - Map of symbols to coin IDs
 * @returns {string} - Formatted error message
 */
export const createInvalidCoinError = (symbol, COIN_ID_MAP) => {
  return `ᛪ Unknown asset: ${symbol}\nᛋ Supported: ${getSupportedCoins(COIN_ID_MAP)}`;
};

/**
 * Validates and returns coin ID, or returns error object for output
 * @param {string} symbol - The crypto symbol
 * @param {Object} COIN_ID_MAP - Map of symbols to coin IDs
 * @returns {Object} - {valid: boolean, coinId?: string, error?: string}
 */
export const getCoinIdOrError = (symbol, COIN_ID_MAP) => {
  const coinId = validateCoinSymbol(symbol, COIN_ID_MAP);

  if (!coinId) {
    return {
      valid: false,
      error: createInvalidCoinError(symbol, COIN_ID_MAP)
    };
  }

  return {
    valid: true,
    coinId
  };
};
