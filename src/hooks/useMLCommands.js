/**
 * useMLCommands - Machine Learning command handlers
 *
 * Handles commands:
 * - predict [symbol] [days] - LSTM price forecasting
 * - predict [symbol] trend - Trend prediction
 * - sentiment [symbol] - Multi-factor sentiment analysis
 * - sentiment-multi [symbol] - Aggregate from multiple sources
 * - anomaly [symbol] - Detect unusual activity
 * - patterns [symbol] - Chart pattern recognition
 * - dashboard [symbol] - Open interactive visualization
 * - compare [symbol] [timeframes] - Multi-timeframe comparison
 * - correlation [symbols...] [days] - Correlation matrix
 * - momentum [symbol] [timeframes] - Cross-timeframe momentum
 * - seasonality [symbol] - Monthly performance patterns
 */

import { useCallback } from 'react';
import { getCoinIdOrError } from '../utils/coinValidation';
import { handleCommandError } from '../utils/errorHandler';
import { formatPrice, getChangeRune } from '../utils/formatters';
import { getLoadingMessage, OperationType } from '../utils/loadingMessages';
import { validateTrainingData } from '../utils/mlValidation';

/**
 * Hook for ML-related commands
 * @param {Object} options - Command context
 * @returns {Object} Command handlers
 */
export function useMLCommands({
  addOutput,
  showToast,
  setOutput,
  mlService,
  pricePredictor,
  sentimentAnalyzer,
  anomalyDetector,
  patternRecognizer,
  multiTimeframeAnalyzer,
  multiSourceSentiment,
  mlCacheHelper,
  coinMarketCapAPI,
  coinGeckoAPI,
  santimentAPI,
  API_CONFIG,
  COIN_SYMBOL_MAP,
  setDashboardSymbol,
  setDashboardCoinId,
  setShowDashboard,
  getCMCHistoricalData,
}) {
  // Check if ML services are ready
  const checkMLServices = useCallback(() => {
    if (!mlService || !pricePredictor) {
      addOutput({
        type: 'error',
        content: 'ᛪ ML services not initialized. Please reload the terminal.',
      });
      return false;
    }
    return true;
  }, [addOutput, mlService, pricePredictor]);

  // Validate symbol
  const validateSymbol = useCallback((symbol) => {
    const validation = getCoinIdOrError(symbol, COIN_SYMBOL_MAP);
    if (!validation.valid) {
      addOutput({ type: 'error', content: validation.error });
      return null;
    }
    return validation;
  }, [addOutput, COIN_SYMBOL_MAP]);

  const handlePredict = useCallback(async (args) => {
    if (args.length === 0) {
      addOutput({
        type: 'error',
        content: 'ᛪ Usage: predict [symbol] [days]\nExamples:\n  predict BTC 7      - Forecast BTC for next 7 days\n  predict ETH trend  - Get bullish/bearish trend prediction\n  predict SOL 14     - Forecast SOL for next 14 days',
      });
      return;
    }

    if (!checkMLServices()) return;

    const symbol = args[0].toUpperCase();
    const coinId = COIN_SYMBOL_MAP[symbol];

    if (!coinId) {
      addOutput({
        type: 'error',
        content: `ᛪ Unknown asset: ${symbol}\nSupported: ${Object.keys(COIN_SYMBOL_MAP).join(', ')}`,
      });
      return;
    }

    const isTrendOnly = args[1] === 'trend' || args[1] === 't';
    const days = isTrendOnly ? 7 : parseInt(args[1]) || 7;

    if (days < 1 || days > 30) {
      addOutput({ type: 'error', content: 'ᛪ Days must be between 1 and 30' });
      return;
    }

    try {
      const cached = await mlCacheHelper?.getCachedPrediction(symbol, days);
      let predictions, prices;

      if (cached && !isTrendOnly) {
        addOutput({
          type: 'info',
          content: `ᛏ Using cached prediction (${cached.cachedAt})`,
        });
        predictions = cached.predictions;
        const marketData = await getCMCHistoricalData(coinMarketCapAPI, symbol, 7, coinGeckoAPI);
        prices = marketData.prices.map(p => p[1]);
      } else {
        const trainingOutputId = Date.now();
        addOutput({
          type: 'info',
          content: `ᛉ Training LSTM model on ${symbol} historical data...\nᛏ Preparing 50 epochs of training...`,
          id: trainingOutputId,
        });

        const marketData = await getCMCHistoricalData(coinMarketCapAPI, symbol, 90, coinGeckoAPI);
        prices = marketData.prices.map(p => p[1]);

        const validation = validateTrainingData(prices, 30);
        if (!validation.valid) {
          addOutput({
            type: 'error',
            content: `ᛪ Data validation failed:\n${validation.errors.join('\n')}`,
          });
          return;
        }

        await pricePredictor.train(prices, {
          epochs: 50,
          batchSize: 32,
          validationSplit: 0.2,
          verbose: 0,
          onProgress: (epoch, totalEpochs, logs) => {
            if (epoch % 10 === 0 || epoch === totalEpochs) {
              const progress = ((epoch / totalEpochs) * 100).toFixed(0);
              const bar = '█'.repeat(Math.floor(epoch / 5)) + '░'.repeat(10 - Math.floor(epoch / 5));
              setOutput(prev =>
                prev.map(output =>
                  output.id === trainingOutputId
                    ? { ...output, content: `ᛉ Training LSTM model on ${symbol}...\nᛏ Progress: ${bar} ${progress}%\nᛒ Loss: ${logs.loss.toFixed(4)}` }
                    : output
                )
              );
            }
          },
        });

        predictions = await pricePredictor.predict(prices, days);

        setOutput(prev =>
          prev.map(output =>
            output.id === trainingOutputId
              ? { ...output, content: `ᛉ LSTM model training complete!\nᛏ 50 epochs completed\nᛒ Model ready` }
              : output
          )
        );

        await mlCacheHelper?.cachePrediction(symbol, days, predictions, {
          trainedOn: new Date().toISOString(),
          dataPoints: prices.length,
          epochs: 50,
        });
      }

      if (isTrendOnly) {
        const trendResult = await pricePredictor.predictTrend(prices);
        const currentPrice = prices[prices.length - 1];

        let result = `\nᚦ ${symbol} TREND FORECAST\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        result += `Current Price: ${formatPrice(currentPrice)}\n`;
        result += `Trend: ${trendResult.trend} ${trendResult.trend === 'BULLISH' ? 'ᚢ' : 'ᛞ'}\n`;
        result += `Expected Change: ${trendResult.change.toFixed(2)}%\n`;
        result += `Confidence: ${trendResult.confidence.toFixed(0)}%\n\n`;
        result += `7-Day Forecast:\n`;
        trendResult.predictions.forEach((pred, i) => {
          result += `  Day ${i + 1}: ${formatPrice(pred)}\n`;
        });
        result += `\nᛗ ML-powered LSTM prediction`;

        addOutput({ type: 'success', content: result });
        showToast(`${symbol}: ${trendResult.trend}`, 'success');
      } else {
        const currentPrice = prices[prices.length - 1];
        const finalPrice = predictions[predictions.length - 1];
        const totalChange = ((finalPrice - currentPrice) / currentPrice) * 100;

        let result = `\nᚦ ${symbol} PRICE PREDICTION\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        result += `Current Price: ${formatPrice(currentPrice)}\n`;
        result += `Predicted (Day ${days}): ${formatPrice(finalPrice)}\n`;
        result += `Expected Change: ${totalChange > 0 ? '+' : ''}${totalChange.toFixed(2)}% ${getChangeRune(totalChange)}\n\n`;
        result += `Daily Forecast:\n`;
        predictions.forEach((pred, i) => {
          const change = ((pred - currentPrice) / currentPrice) * 100;
          result += `  Day ${i + 1}: ${formatPrice(pred)} (${change > 0 ? '+' : ''}${change.toFixed(1)}%)\n`;
        });
        result += `\nᚹ Not financial advice\nᛗ LSTM model trained on 90-day history`;

        addOutput({ type: 'success', content: result });
        showToast(`${symbol} forecast complete`, 'success');
      }
    } catch (error) {
      addOutput({ type: 'error', content: `ᛪ Prediction failed: ${error.message}` });
      showToast('Prediction failed', 'error');
    }
  }, [addOutput, showToast, setOutput, checkMLServices, mlCacheHelper, pricePredictor, coinMarketCapAPI, coinGeckoAPI, COIN_SYMBOL_MAP]);

  const handleSentiment = useCallback(async (args) => {
    if (args.length === 0) {
      addOutput({
        type: 'error',
        content: 'ᛪ Usage: sentiment [symbol]\nExamples:\n  sentiment BTC      - Analyze BTC sentiment\n  sentiment trending - Sentiment for trending coins',
      });
      return;
    }

    if (!sentimentAnalyzer) {
      addOutput({ type: 'error', content: 'ᛪ Sentiment analyzer not initialized.' });
      return;
    }

    const symbol = args[0].toUpperCase();

    if (symbol === 'TRENDING') {
      addOutput({
        type: 'info',
        content: getLoadingMessage(OperationType.ML_SENTIMENT, { asset: 'trending coins' }),
      });

      try {
        const trendingData = await coinMarketCapAPI.getTrending();
        const coins = Array.isArray(trendingData) ? trendingData.slice(0, 5) : [];

        let result = `\nᚱ TRENDING COINS SENTIMENT\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        for (const coin of coins) {
          const priceData = await getCMCHistoricalData(coinMarketCapAPI, coin.symbol, 30, coinGeckoAPI);
          const prices = priceData.prices.map(p => p[1]);
          const volumes = priceData.volumes?.map(v => v[1]) || [];

          const sentiment = sentimentAnalyzer.analyzePriceSentiment({
            currentPrice: prices[prices.length - 1],
            priceHistory: prices,
            volume24h: volumes[volumes.length - 1] || 0,
            volumeHistory: volumes,
            priceChange24h: ((prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2]) * 100,
            priceChange7d: ((prices[prices.length - 1] - prices[prices.length - 8]) / prices[prices.length - 8]) * 100,
          });

          const emoji = sentimentAnalyzer.getSentimentEmoji(sentiment.sentiment);
          result += `${coin.symbol}: ${sentiment.sentiment} ${emoji} (${sentiment.score}/100)\n`;
        }

        result += `\nᛗ Multi-factor sentiment analysis`;
        addOutput({ type: 'success', content: result });
        showToast('Trending sentiment analyzed', 'success');
      } catch (error) {
        handleCommandError(error, 'sentiment trending', addOutput);
      }
      return;
    }

    const validation = validateSymbol(symbol);
    if (!validation) return;

    addOutput({
      type: 'info',
      content: getLoadingMessage(OperationType.ML_SENTIMENT, { asset: symbol }),
    });

    try {
      const priceData = await getCMCHistoricalData(coinMarketCapAPI, symbol, 30, coinGeckoAPI);
      const prices = priceData.prices.map(p => p[1]);
      const volumes = priceData.total_volumes?.map(v => v[1]) || [];
      const currentPrice = prices[prices.length - 1];

      const priceChange24h = ((prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2]) * 100;
      const priceChange7d = ((prices[prices.length - 1] - prices[prices.length - 8]) / prices[prices.length - 8]) * 100;

      let socialData = null;
      if (API_CONFIG?.santiment?.apiKey && santimentAPI) {
        try {
          const result = await santimentAPI.getEnrichedAnalysis(validation.coinId);
          socialData = {
            socialVolume7d: result.social || 0,
            devActivity30d: result.dev || 0,
            activeAddresses7d: result.addresses || 0,
          };
        } catch (e) { /* Santiment optional */ }
      }

      const sentiment = sentimentAnalyzer.analyzeCompositeSentiment(
        { currentPrice, priceHistory: prices, volume24h: volumes[volumes.length - 1] || 0, volumeHistory: volumes, priceChange24h, priceChange7d },
        socialData
      );

      const emoji = sentimentAnalyzer.getSentimentEmoji(sentiment.sentiment);

      let result = `\nᚱ ${symbol} SENTIMENT ANALYSIS\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      result += `Overall: ${sentiment.sentiment} ${emoji}\n`;
      result += `Score: ${sentiment.score}/100\n`;
      result += `Confidence: ${sentiment.confidence}%\n\n`;
      result += `Key Factors:\n`;
      sentiment.allFactors.forEach(f => result += `  • ${f}\n`);
      result += `\nᛗ ML-powered sentiment analysis`;

      addOutput({ type: 'success', content: result });
      showToast(`${symbol}: ${sentiment.sentiment}`, 'success');
    } catch (error) {
      handleCommandError(error, `sentiment ${symbol}`, addOutput);
    }
  }, [addOutput, showToast, validateSymbol, sentimentAnalyzer, coinMarketCapAPI, coinGeckoAPI, santimentAPI, API_CONFIG]);

  const handleAnomaly = useCallback(async (args) => {
    if (args.length === 0) {
      addOutput({
        type: 'error',
        content: 'ᛪ Usage: anomaly [symbol] [type]\nExamples:\n  anomaly BTC        - Detect all anomalies\n  anomaly ETH price  - Price anomalies only\n  anomaly SOL volume - Volume anomalies only',
      });
      return;
    }

    if (!anomalyDetector) {
      addOutput({ type: 'error', content: 'ᛪ Anomaly detector not initialized.' });
      return;
    }

    const symbol = args[0].toUpperCase();
    const validation = validateSymbol(symbol);
    if (!validation) return;

    const type = args[1]?.toLowerCase() || 'all';

    addOutput({ type: 'info', content: `ᛉ Scanning ${symbol} for anomalies...` });

    try {
      const marketData = await getCMCHistoricalData(coinMarketCapAPI, symbol, 30, coinGeckoAPI);
      const prices = marketData.prices.map(p => p[1]);
      const volumes = marketData.total_volumes?.map(v => v[1]) || [];

      const anomalies = anomalyDetector.detectAnomalies({ prices, volumes }, { type });

      let result = `\nᛉ ${symbol} ANOMALY DETECTION\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      result += `Status: ${anomalies.hasAnomalies ? '⚠️ ANOMALIES DETECTED' : '✅ Normal'}\n`;
      result += `Risk Level: ${anomalies.riskLevel}\n`;
      result += `Anomaly Count: ${anomalies.count}\n\n`;

      if (anomalies.details && anomalies.details.length > 0) {
        result += `Details:\n`;
        anomalies.details.forEach(d => result += `  • ${d}\n`);
      }

      result += `\nᛗ ML-powered anomaly detection`;

      addOutput({ type: anomalies.hasAnomalies ? 'warning' : 'success', content: result });
      showToast(`${symbol}: ${anomalies.riskLevel} risk`, anomalies.hasAnomalies ? 'warning' : 'success');
    } catch (error) {
      handleCommandError(error, `anomaly ${symbol}`, addOutput);
    }
  }, [addOutput, showToast, validateSymbol, anomalyDetector, coinMarketCapAPI, coinGeckoAPI]);

  const handlePatterns = useCallback(async (args) => {
    if (args.length === 0) {
      addOutput({
        type: 'error',
        content: 'ᛪ Usage: patterns [symbol]\nExample: patterns BTC',
      });
      return;
    }

    if (!patternRecognizer) {
      addOutput({ type: 'error', content: 'ᛪ Pattern recognizer not initialized.' });
      return;
    }

    const symbol = args[0].toUpperCase();
    const validation = validateSymbol(symbol);
    if (!validation) return;

    addOutput({ type: 'info', content: `ᛉ Analyzing ${symbol} chart patterns...` });

    try {
      const marketData = await getCMCHistoricalData(coinMarketCapAPI, symbol, 60, coinGeckoAPI);
      const prices = marketData.prices.map(p => p[1]);

      if (prices.length < 20) {
        addOutput({ type: 'error', content: 'ᛪ Insufficient data for pattern recognition (need 20+ days)' });
        return;
      }

      const patterns = patternRecognizer.recognizePatterns(prices);

      let result = `\nᛉ ${symbol} PATTERN RECOGNITION\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;

      if (patterns.length === 0) {
        result += `No significant patterns detected.\n`;
      } else {
        patterns.forEach(p => {
          result += `\n${p.type} Pattern\n`;
          result += `  Confidence: ${p.confidence}%\n`;
          result += `  Signal: ${p.signal}\n`;
          if (p.description) result += `  ${p.description}\n`;
        });
      }

      result += `\nᛗ ML-powered pattern recognition`;

      addOutput({ type: 'success', content: result });
      showToast(`${symbol} patterns analyzed`, 'success');
    } catch (error) {
      handleCommandError(error, `patterns ${symbol}`, addOutput);
    }
  }, [addOutput, showToast, validateSymbol, patternRecognizer, coinMarketCapAPI, coinGeckoAPI]);

  const handleDashboard = useCallback((args) => {
    if (args.length === 0) {
      addOutput({
        type: 'error',
        content: 'ᛪ Usage: dashboard [symbol]\nExample: dashboard BTC',
      });
      return;
    }

    const symbol = args[0].toUpperCase();
    const validation = validateSymbol(symbol);
    if (!validation) return;

    setDashboardSymbol(symbol);
    setDashboardCoinId(validation.coinId);
    setShowDashboard(true);

    addOutput({
      type: 'info',
      content: `📊 Opening interactive dashboard for ${symbol}...`,
    });
    showToast(`Dashboard: ${symbol}`, 'success');
  }, [addOutput, showToast, validateSymbol, setDashboardSymbol, setDashboardCoinId, setShowDashboard]);

  // Main command handler
  const handleCommand = useCallback(async (command, args) => {
    switch (command) {
      case 'predict':
        await handlePredict(args);
        return true;
      case 'sentiment':
        await handleSentiment(args);
        return true;
      case 'sentiment-multi':
        // Simplified - would need multiSourceSentiment
        addOutput({ type: 'info', content: 'ᛉ Multi-source sentiment requires additional setup.' });
        return true;
      case 'anomaly':
        await handleAnomaly(args);
        return true;
      case 'patterns':
        await handlePatterns(args);
        return true;
      case 'dashboard':
        handleDashboard(args);
        return true;
      case 'compare':
      case 'correlation':
      case 'momentum':
      case 'seasonality':
        // These require multiTimeframeAnalyzer - simplified
        addOutput({ type: 'info', content: `ᛉ ${command} command requires multi-timeframe analyzer.` });
        return true;
      default:
        return false;
    }
  }, [handlePredict, handleSentiment, handleAnomaly, handlePatterns, handleDashboard, addOutput]);

  return {
    handleCommand,
    handlePredict,
    handleSentiment,
    handleAnomaly,
    handlePatterns,
    handleDashboard,
  };
}

export default useMLCommands;
