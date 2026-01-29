/**
 * useCMCCommands - CoinMarketCap Premium command handlers
 *
 * Handles commands:
 * - cmc price [symbol] - Detailed price data
 * - cmc top [limit] - Top cryptocurrencies
 * - cmc trending - Trending assets
 * - cmc gainers / cmc losers - Top movers
 * - cmc convert [amount] [from] [to] - Currency conversion
 * - cmc info [symbol] - Asset metadata
 * - cmc global - Global market metrics
 * - cmc airdrops [status] - Active airdrops
 * - cmc exchanges [limit] - Top exchanges
 * - cmc pairs [symbol] - Trading pairs
 * - cmc performance [symbol] [period] - Price performance
 */

import { useCallback } from 'react';

/**
 * Hook for CoinMarketCap commands
 * @param {Object} options - Command context
 * @returns {Object} Command handlers
 */
export function useCMCCommands({
  addOutput,
  showToast,
  coinMarketCapAPI,
  API_CONFIG,
}) {
  // Check API key
  const checkApiKey = useCallback(() => {
    if (!API_CONFIG?.coinMarketCap?.apiKey) {
      addOutput({
        type: 'error',
        content: 'ᛪ CoinMarketCap API key not configured\n\nGet your key at: https://pro.coinmarketcap.com/account\nRun "apikeys" to configure.',
      });
      return false;
    }
    return true;
  }, [addOutput, API_CONFIG]);

  const handlePrice = useCallback(async (args) => {
    if (args.length === 0) {
      addOutput({
        type: 'error',
        content: 'ᛪ Usage: cmc price [symbol(s)]\nExamples:\n  cmc price BTC\n  cmc price BTC,ETH,SOL',
      });
      return;
    }

    if (!checkApiKey()) return;

    const symbols = args[0].toUpperCase();
    addOutput({ type: 'info', content: `ᛉ Fetching CMC data for ${symbols}...` });

    try {
      const data = await coinMarketCapAPI.getQuotes(symbols);

      let result = `\nᚠ CMC PRICE DATA\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;

      Object.entries(data).forEach(([symbol, coinData]) => {
        const quote = coinData.quote?.USD;
        if (quote) {
          result += `\n${symbol}\n`;
          result += `  Price: $${quote.price.toLocaleString()}\n`;
          result += `  Market Cap: $${quote.market_cap?.toLocaleString() || 'N/A'}\n`;
          result += `  24h Change: ${quote.percent_change_24h?.toFixed(2) || 0}%\n`;
          result += `  7d Change: ${quote.percent_change_7d?.toFixed(2) || 'N/A'}%\n`;
          result += `  30d Change: ${quote.percent_change_30d?.toFixed(2) || 'N/A'}%\n`;
          result += `  Rank: #${coinData.cmc_rank || 'N/A'}\n`;
          result += `  Supply: ${coinData.circulating_supply?.toLocaleString() || 'N/A'}\n`;
        }
      });

      result += `\nᛗ Live from CoinMarketCap Pro`;
      addOutput({ type: 'success', content: result });
      showToast('CMC data loaded', 'success');
    } catch (error) {
      addOutput({ type: 'error', content: `ᛪ CMC price failed: ${error.message}` });
      showToast('CMC price failed', 'error');
    }
  }, [addOutput, showToast, checkApiKey, coinMarketCapAPI]);

  const handleTop = useCallback(async (args) => {
    if (!checkApiKey()) return;

    const limit = Math.min(100, Math.max(1, parseInt(args[0]) || 10));
    addOutput({ type: 'info', content: `ᛉ Fetching top ${limit} cryptocurrencies...` });

    try {
      const coins = await coinMarketCapAPI.getListings(limit);

      let result = `\nᛏ TOP ${limit} CRYPTOCURRENCIES\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      coins.forEach((coin, idx) => {
        const quote = coin.quote?.USD;
        const change = quote?.percent_change_24h?.toFixed(2) || '0.00';
        const changeIcon = parseFloat(change) >= 0 ? 'ᚢ' : 'ᛞ';

        result += `${idx + 1}. ${coin.name} (${coin.symbol})\n`;
        result += `   $${quote?.price?.toLocaleString() || 'N/A'} | ${change}% ${changeIcon}\n`;
      });

      result += `\nᛗ Live from CoinMarketCap`;
      addOutput({ type: 'success', content: result });
      showToast(`Top ${limit} loaded`, 'success');
    } catch (error) {
      addOutput({ type: 'error', content: `ᛪ Failed: ${error.message}` });
    }
  }, [addOutput, showToast, checkApiKey, coinMarketCapAPI]);

  const handleTrending = useCallback(async () => {
    if (!checkApiKey()) return;

    addOutput({ type: 'info', content: 'ᛉ Fetching trending assets...' });

    try {
      const data = await coinMarketCapAPI.getTrending();
      const trending = Array.isArray(data) ? data.slice(0, 15) : [];

      let result = `\nᛟ CMC TRENDING\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      trending.forEach((coin, idx) => {
        const quote = coin.quote?.USD;
        const change = quote?.percent_change_24h?.toFixed(2) || '0.00';
        result += `${idx + 1}. ${coin.name} (${coin.symbol})\n`;
        result += `   $${quote?.price?.toLocaleString() || 'N/A'} | ${change}%\n`;
      });

      result += `\nᛗ Trending on CoinMarketCap`;
      addOutput({ type: 'success', content: result });
      showToast('Trending loaded', 'success');
    } catch (error) {
      addOutput({ type: 'error', content: `ᛪ Failed: ${error.message}` });
    }
  }, [addOutput, showToast, checkApiKey, coinMarketCapAPI]);

  const handleGainersLosers = useCallback(async (type) => {
    if (!checkApiKey()) return;

    addOutput({ type: 'info', content: `ᛉ Fetching ${type}...` });

    try {
      const data = await coinMarketCapAPI.getGainersLosers();

      let result = `\nᛟ TOP ${type.toUpperCase()}\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      const list = type === 'gainers' ? data.gainers : data.losers;
      const icon = type === 'gainers' ? 'ᚢ' : 'ᛞ';

      (list || []).slice(0, 5).forEach((coin, idx) => {
        const quote = coin.quote?.USD;
        const change = quote?.percent_change_24h?.toFixed(2) || '0.00';
        result += `${idx + 1}. ${coin.name} (${coin.symbol})\n`;
        result += `   $${quote?.price?.toLocaleString() || 'N/A'} | ${change}% ${icon}\n`;
      });

      addOutput({ type: 'success', content: result });
      showToast(`${type} loaded`, 'success');
    } catch (error) {
      addOutput({ type: 'error', content: `ᛪ Failed: ${error.message}` });
    }
  }, [addOutput, showToast, checkApiKey, coinMarketCapAPI]);

  const handleConvert = useCallback(async (args) => {
    if (args.length < 3) {
      addOutput({
        type: 'error',
        content: 'ᛪ Usage: cmc convert [amount] [from] [to]\nExample: cmc convert 1 BTC USD',
      });
      return;
    }

    if (!checkApiKey()) return;

    const amount = parseFloat(args[0]);
    const from = args[1].toUpperCase();
    const to = args[2].toUpperCase();

    if (isNaN(amount)) {
      addOutput({ type: 'error', content: 'ᛪ Invalid amount' });
      return;
    }

    addOutput({ type: 'info', content: `ᛉ Converting ${amount} ${from} to ${to}...` });

    try {
      const result = await coinMarketCapAPI.convert(amount, from, to);

      let output = `\nᚱ CURRENCY CONVERSION\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      output += `${amount} ${from} = ${result.quote[to].price.toLocaleString()} ${to}\n`;
      output += `\nRate updated: ${new Date().toLocaleString()}`;

      addOutput({ type: 'success', content: output });
      showToast('Conversion complete', 'success');
    } catch (error) {
      addOutput({ type: 'error', content: `ᛪ Conversion failed: ${error.message}` });
    }
  }, [addOutput, showToast, checkApiKey, coinMarketCapAPI]);

  const handleInfo = useCallback(async (args) => {
    if (args.length === 0) {
      addOutput({
        type: 'error',
        content: 'ᛪ Usage: cmc info [symbol]\nExample: cmc info BTC',
      });
      return;
    }

    if (!checkApiKey()) return;

    const symbol = args[0].toUpperCase();
    addOutput({ type: 'info', content: `ᛉ Fetching info for ${symbol}...` });

    try {
      const data = await coinMarketCapAPI.getMetadata(symbol);
      const info = data[symbol];

      if (!info) {
        addOutput({ type: 'error', content: `ᛪ No data found for ${symbol}` });
        return;
      }

      let result = `\nᛏ ${info.name} (${info.symbol})\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      result += `Category: ${info.category || 'N/A'}\n`;
      result += `Description: ${(info.description || 'N/A').substring(0, 400)}...\n\n`;

      if (info.urls) {
        result += `Links:\n`;
        if (info.urls.website?.[0]) result += `  Website: ${info.urls.website[0]}\n`;
        if (info.urls.twitter?.[0]) result += `  Twitter: ${info.urls.twitter[0]}\n`;
      }

      if (info.date_launched) {
        result += `\nLaunched: ${new Date(info.date_launched).toLocaleDateString()}\n`;
      }

      addOutput({ type: 'success', content: result });
      showToast(`${symbol} info loaded`, 'success');
    } catch (error) {
      addOutput({ type: 'error', content: `ᛪ Failed: ${error.message}` });
    }
  }, [addOutput, showToast, checkApiKey, coinMarketCapAPI]);

  const handleGlobal = useCallback(async () => {
    if (!checkApiKey()) return;

    addOutput({ type: 'info', content: 'ᛉ Fetching global metrics...' });

    try {
      const data = await coinMarketCapAPI.getGlobalMetrics();
      const metrics = data.data;

      let result = `\nᚹ GLOBAL CRYPTO MARKET\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      result += `Total Market Cap: $${metrics.quote.USD.total_market_cap.toLocaleString()}\n`;
      result += `24h Volume: $${metrics.quote.USD.total_volume_24h.toLocaleString()}\n`;
      result += `BTC Dominance: ${metrics.btc_dominance.toFixed(2)}%\n`;
      result += `ETH Dominance: ${metrics.eth_dominance.toFixed(2)}%\n`;
      result += `Active Cryptos: ${metrics.active_cryptocurrencies.toLocaleString()}\n`;
      result += `Active Exchanges: ${metrics.active_exchanges.toLocaleString()}\n`;

      addOutput({ type: 'success', content: result });
      showToast('Global metrics loaded', 'success');
    } catch (error) {
      addOutput({ type: 'error', content: `ᛪ Failed: ${error.message}` });
    }
  }, [addOutput, showToast, checkApiKey, coinMarketCapAPI]);

  // Main command handler
  const handleCommand = useCallback(async (command, args) => {
    if (command !== 'cmc') return false;

    const subCommand = args[0]?.toLowerCase();
    const subArgs = args.slice(1);

    switch (subCommand) {
      case 'price':
        await handlePrice(subArgs);
        return true;
      case 'top':
        await handleTop(subArgs);
        return true;
      case 'trending':
        await handleTrending();
        return true;
      case 'gainers':
        await handleGainersLosers('gainers');
        return true;
      case 'losers':
        await handleGainersLosers('losers');
        return true;
      case 'convert':
        await handleConvert(subArgs);
        return true;
      case 'info':
        await handleInfo(subArgs);
        return true;
      case 'global':
        await handleGlobal();
        return true;
      default:
        addOutput({
          type: 'error',
          content: `ᛪ Unknown CMC command: ${subCommand}\n\nAvailable: price, top, trending, gainers, losers, convert, info, global`,
        });
        return true;
    }
  }, [handlePrice, handleTop, handleTrending, handleGainersLosers, handleConvert, handleInfo, handleGlobal, addOutput]);

  return {
    handleCommand,
    handlePrice,
    handleTop,
    handleTrending,
    handleGainersLosers,
    handleConvert,
    handleInfo,
    handleGlobal,
  };
}

export default useCMCCommands;
