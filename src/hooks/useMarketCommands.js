/**
 * useMarketCommands - Market data command handlers
 *
 * Handles commands:
 * - price [symbol] - Get real-time price
 * - market [symbol] - Detailed market data
 * - global - Global market overview
 * - trending / news - Trending cryptocurrencies
 * - fear - Fear & Greed Index
 * - movers - Top gainers/losers
 * - categories - Top coins by market cap
 */

import { useCallback } from 'react';
import { getCoinIdOrError } from '../utils/coinValidation';
import { handleCommandError } from '../utils/errorHandler';
import {
  formatPrice,
  formatVolume,
  formatPercent,
  getChangeRune,
} from '../utils/formatters';
import { getLoadingMessage, OperationType } from '../utils/loadingMessages';

// Symbol mapping for CoinMarketCap
const COIN_SYMBOL_MAP = {
  BTC: 'BTC', ETH: 'ETH', SOL: 'SOL', USDT: 'USDT', BNB: 'BNB',
  XRP: 'XRP', ADA: 'ADA', DOGE: 'DOGE', MATIC: 'MATIC', DOT: 'DOT',
  AVAX: 'AVAX', LINK: 'LINK', UNI: 'UNI', ATOM: 'ATOM',
};

/**
 * Hook for market-related commands
 * @param {Object} options - Command context
 * @returns {Function} Command handler
 */
export function useMarketCommands({
  addOutput,
  showToast,
  coinMarketCapAPI,
  scraperAPI,
}) {
  const handlePrice = useCallback(async (args) => {
    if (args.length === 0) {
      addOutput({
        type: 'error',
        content: 'ᛪ Usage: price [symbol]\nExample: price BTC\nSupported: BTC, ETH, SOL, BNB, XRP, ADA, DOGE, MATIC, DOT',
      });
      return;
    }

    const validation = getCoinIdOrError(args[0], COIN_SYMBOL_MAP);
    if (!validation.valid) {
      addOutput({ type: 'error', content: validation.error });
      return;
    }

    const symbol = args[0].toUpperCase();
    addOutput({
      type: 'info',
      content: getLoadingMessage(OperationType.FETCH_PRICE, { asset: symbol }),
    });

    try {
      const quotesData = await coinMarketCapAPI.getQuotes(symbol);
      const data = quotesData[symbol];

      if (!data) {
        throw new Error(`Unable to retrieve price data for ${symbol}`);
      }

      const quote = data.quote.USD;
      const priceFormatted = formatPrice(quote.price);
      const change24h = quote.percent_change_24h || 0;
      const changeFormatted = formatPercent(change24h, true);
      const changeRune = getChangeRune(change24h);

      let result = `\nᚠ ${symbol} ─ THE MARKET SPEAKS\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      result += `Price:        ${priceFormatted}\n`;
      result += `24h Change:   ${changeFormatted} ${changeRune}\n`;

      if (quote.volume_24h) {
        result += `24h Volume:   ${formatVolume(quote.volume_24h)}\n`;
      }
      if (quote.market_cap) {
        result += `Market Cap:   ${formatVolume(quote.market_cap)}\n`;
      }
      result += `\nᛗ Live from CoinMarketCap`;

      addOutput({ type: 'success', content: result });
      showToast(`${symbol}: ${priceFormatted} ᛗ`, 'success');
    } catch (error) {
      handleCommandError(error, `price ${symbol}`, addOutput);
      showToast('Price fetch failed ᛪ', 'error');
    }
  }, [addOutput, showToast, coinMarketCapAPI]);

  const handleMarket = useCallback(async (args) => {
    if (args.length === 0) {
      addOutput({
        type: 'error',
        content: 'ᛪ Usage: market [symbol]\nExample: market BTC',
      });
      return;
    }

    const validation = getCoinIdOrError(args[0], COIN_SYMBOL_MAP);
    if (!validation.valid) {
      addOutput({ type: 'error', content: validation.error });
      return;
    }

    const symbol = args[0].toUpperCase();
    addOutput({
      type: 'info',
      content: getLoadingMessage(OperationType.FETCH_MARKET, { asset: symbol }),
    });

    try {
      const quotesData = await coinMarketCapAPI.getQuotes(symbol);
      const data = quotesData[symbol];
      const quote = data?.quote?.USD;

      if (!quote) {
        throw new Error(`Unable to retrieve market data for ${symbol}`);
      }

      let result = `\nᚱ ${symbol} ─ MARKET DEPTHS\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      result += `Current Price: $${quote.price.toLocaleString()}\n`;
      result += `Market Cap:    $${quote.market_cap.toLocaleString()}\n`;
      result += `24h Volume:    $${quote.volume_24h.toLocaleString()}\n`;
      result += `24h Change:    ${quote.percent_change_24h.toFixed(2)}%\n`;
      result += `7d Change:     ${quote.percent_change_7d?.toFixed(2) || 'N/A'}%\n`;
      result += `30d Change:    ${quote.percent_change_30d?.toFixed(2) || 'N/A'}%\n`;
      result += `\nᛗ Live from CoinMarketCap`;

      addOutput({ type: 'success', content: result });
    } catch (error) {
      handleCommandError(error, `market ${symbol}`, addOutput);
    }
  }, [addOutput, coinMarketCapAPI]);

  const handleGlobal = useCallback(async () => {
    addOutput({
      type: 'info',
      content: getLoadingMessage(OperationType.FETCH_MARKET),
    });

    try {
      const data = await scraperAPI.fetchGlobalMarketData();
      const marketData = data.data;

      const totalMarketCap = formatVolume(marketData.total_market_cap.usd);
      const totalVolume = formatVolume(marketData.total_volume.usd);
      const btcDominance = formatPercent(marketData.market_cap_percentage.btc);
      const ethDominance = formatPercent(marketData.market_cap_percentage.eth);
      const marketCapChange = formatPercent(marketData.market_cap_change_percentage_24h_usd);

      let result = `\nᚹ GLOBAL MARKET ─ ALL REALMS\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      result += `Total Market Cap:   ${totalMarketCap}\n`;
      result += `24h Volume:         ${totalVolume}\n`;
      result += `Active Cryptos:     ${marketData.active_cryptocurrencies.toLocaleString()}\n`;
      result += `Markets:            ${marketData.markets.toLocaleString()}\n`;
      result += `BTC Dominance:      ${btcDominance}\n`;
      result += `ETH Dominance:      ${ethDominance}\n`;
      result += `Market Cap Change:  ${marketCapChange}\n`;
      result += `\nᛗ The pulse of all digital realms`;

      addOutput({ type: 'success', content: result });
      showToast('Global data revealed ᛗ', 'success');
    } catch (error) {
      handleCommandError(error, 'global', addOutput);
      showToast('Global data fetch failed ᛪ', 'error');
    }
  }, [addOutput, showToast, scraperAPI]);

  const handleTrending = useCallback(async () => {
    addOutput({
      type: 'info',
      content: getLoadingMessage(OperationType.FETCH_TRENDING),
    });

    try {
      const data = await coinMarketCapAPI.getTrending();
      const trending = Array.isArray(data) ? data.slice(0, 10) : [];

      let result = `\nᛟ TRENDING CRYPTOCURRENCIES\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      trending.forEach((coin, idx) => {
        const quote = coin.quote?.USD;
        result += `${idx + 1}. ${coin.name} (${coin.symbol})\n`;
        result += `   Rank: #${coin.cmc_rank || 'N/A'}\n`;
        result += `   Price: ${formatPrice(quote?.price || 0)}\n`;
        if (quote?.percent_change_24h !== undefined) {
          const change = quote.percent_change_24h.toFixed(2);
          const emoji = change >= 0 ? 'ᚢ' : 'ᛞ';
          result += `   24h Change: ${change}% ${emoji}\n`;
        }
        result += `\n`;
      });

      result += `ᛏ Live trending data from CoinMarketCap`;

      addOutput({ type: 'success', content: result });
      showToast('Trending data loaded', 'success');
    } catch (error) {
      handleCommandError(error, 'trending', addOutput);
      showToast('Trending data fetch failed', 'error');
    }
  }, [addOutput, showToast, coinMarketCapAPI]);

  const handleFear = useCallback(async () => {
    addOutput({
      type: 'info',
      content: '😨 Fetching Fear & Greed Index...',
    });

    try {
      const data = await scraperAPI.fetchCryptoFearGreedIndex();
      const fgi = data.data[0];

      const value = parseInt(fgi.value);
      let emoji = '😐';
      let sentiment = fgi.value_classification;

      if (value >= 75) emoji = '🤑';
      else if (value >= 50) emoji = '😊';
      else if (value >= 25) emoji = '😰';
      else emoji = '😱';

      let result = `\n😨 CRYPTO FEAR & GREED INDEX\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      result += `${emoji} Current Value: ${value}/100\n`;
      result += `Sentiment: ${sentiment.toUpperCase()}\n`;
      result += `Updated: ${new Date(fgi.timestamp * 1000).toLocaleString()}\n\n`;
      result += `Scale:\n`;
      result += `😱 0-24:   Extreme Fear\n`;
      result += `😰 25-49:  Fear\n`;
      result += `😐 50-74:  Greed\n`;
      result += `🤑 75-100: Extreme Greed\n\n`;
      result += `ᛟ Live data from Alternative.me`;

      addOutput({ type: 'success', content: result });
      showToast(`Fear & Greed: ${value}`, 'success');
    } catch (error) {
      addOutput({
        type: 'error',
        content: `Failed to fetch Fear & Greed Index: ${error.message}`,
      });
      showToast('Fear & Greed fetch failed', 'error');
    }
  }, [addOutput, showToast, scraperAPI]);

  const handleMovers = useCallback(async () => {
    addOutput({
      type: 'info',
      content: 'ᛟ Fetching top gainers and losers...',
    });

    try {
      const data = await coinMarketCapAPI.getGainersLosers();

      let result = `\nᛟ TOP MARKET MOVERS (24H)\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      result += `ᚢ TOP GAINERS\n\n`;
      if (data.gainers && data.gainers.length > 0) {
        data.gainers.slice(0, 10).forEach((coin, idx) => {
          const quote = coin.quote?.USD;
          const change = quote?.percent_change_24h?.toFixed(2) || '0.00';
          result += `${idx + 1}. ${coin.name} (${coin.symbol})\n`;
          result += `   Price: ${formatPrice(quote?.price || 0)}\n`;
          result += `   24h: +${change}% ᚢ\n`;
          result += `   MCap Rank: #${coin.cmc_rank || 'N/A'}\n\n`;
        });
      }

      result += `\nᛞ TOP LOSERS\n\n`;
      if (data.losers && data.losers.length > 0) {
        data.losers.slice(0, 10).forEach((coin, idx) => {
          const quote = coin.quote?.USD;
          const change = quote?.percent_change_24h?.toFixed(2) || '0.00';
          result += `${idx + 1}. ${coin.name} (${coin.symbol})\n`;
          result += `   Price: ${formatPrice(quote?.price || 0)}\n`;
          result += `   24h: ${change}% ᛞ\n`;
          result += `   MCap Rank: #${coin.cmc_rank || 'N/A'}\n\n`;
        });
      }

      result += `ᛏ Live data from CoinMarketCap`;

      addOutput({ type: 'success', content: result });
      showToast('Market movers loaded', 'success');
    } catch (error) {
      addOutput({
        type: 'error',
        content: `Failed to fetch market movers: ${error.message}`,
      });
      showToast('Market movers fetch failed', 'error');
    }
  }, [addOutput, showToast, coinMarketCapAPI]);

  const handleCategories = useCallback(async () => {
    addOutput({
      type: 'info',
      content: 'ᛟ Fetching top cryptocurrencies...',
    });

    try {
      const coins = await coinMarketCapAPI.getListings(50, 1);

      let result = `\nᛟ TOP CRYPTOCURRENCIES\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      result += `Top 30 coins by market cap:\n\n`;

      coins.slice(0, 30).forEach((coin, idx) => {
        const quote = coin.quote?.USD;
        const mcap = quote?.market_cap ? `$${(quote.market_cap / 1e9).toFixed(2)}B` : 'N/A';
        const change = quote?.percent_change_24h?.toFixed(2) || '0.00';
        const changeEmoji = parseFloat(change) >= 0 ? 'ᚢ' : 'ᛞ';

        result += `${idx + 1}. ${coin.name} (${coin.symbol})\n`;
        result += `   Price: ${formatPrice(quote?.price || 0)}\n`;
        result += `   MCap: ${mcap}\n`;
        result += `   24h: ${change}% ${changeEmoji}\n\n`;
      });

      result += `\nᛏ Live data from CoinMarketCap`;

      addOutput({ type: 'success', content: result });
      showToast('Top coins loaded', 'success');
    } catch (error) {
      addOutput({
        type: 'error',
        content: `Failed to fetch categories: ${error.message}`,
      });
      showToast('Categories fetch failed', 'error');
    }
  }, [addOutput, showToast, coinMarketCapAPI]);

  // Main command handler
  const handleCommand = useCallback(async (command, args) => {
    switch (command) {
      case 'price':
        await handlePrice(args);
        return true;
      case 'market':
        await handleMarket(args);
        return true;
      case 'global':
        await handleGlobal();
        return true;
      case 'news':
      case 'trending':
        await handleTrending();
        return true;
      case 'fear':
        await handleFear();
        return true;
      case 'movers':
        await handleMovers();
        return true;
      case 'categories':
        await handleCategories();
        return true;
      default:
        return false; // Command not handled
    }
  }, [handlePrice, handleMarket, handleGlobal, handleTrending, handleFear, handleMovers, handleCategories]);

  return {
    handleCommand,
    handlePrice,
    handleMarket,
    handleGlobal,
    handleTrending,
    handleFear,
    handleMovers,
    handleCategories,
  };
}

export default useMarketCommands;
