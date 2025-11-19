// ==================== MULTI-TIMEFRAME ANALYSIS ====================
// Compare asset performance across multiple time periods
// Analyze momentum, correlation, and seasonality patterns
// Updated to use CoinMarketCap API

export class MultiTimeframeAnalyzer {
  constructor() {
    this.timeframes = {
      '1d': { days: 1, label: '24h' },
      '7d': { days: 7, label: '1W' },
      '30d': { days: 30, label: '1M' },
      '90d': { days: 90, label: '3M' },
      '365d': { days: 365, label: '1Y' },
    };
  }

  // Helper to get CMC historical data
  async getCMCHistoricalData(cmcAPI, symbol, days) {
    const timeEnd = Math.floor(Date.now() / 1000);
    const timeStart = timeEnd - (days * 24 * 60 * 60);

    let interval = "daily";
    if (days <= 1) interval = "hourly";
    else if (days <= 7) interval = "hourly";
    else if (days <= 30) interval = "daily";
    else interval = "weekly";

    const data = await cmcAPI.getHistoricalQuotes(symbol, timeStart, timeEnd, interval);

    if (data && data.quotes) {
      return {
        prices: data.quotes.map(q => [q.timestamp * 1000, q.quote.USD.price])
      };
    }

    return { prices: [] };
  }

  // ==================== COMPARE TIMEFRAMES ====================

  async compareTimeframes(coinMarketCapAPI, symbol, timeframes = ['1d', '7d', '30d', '90d']) {
    const results = {};

    for (const tf of timeframes) {
      const config = this.timeframes[tf];
      if (!config) continue;

      try {
        const data = await this.getCMCHistoricalData(coinMarketCapAPI, symbol, config.days);
        const prices = data.prices.map(p => p[1]);

        if (prices.length < 2) continue;

        const startPrice = prices[0];
        const endPrice = prices[prices.length - 1];
        const change = ((endPrice - startPrice) / startPrice) * 100;
        const high = Math.max(...prices);
        const low = Math.min(...prices);
        const volatility = this.calculateVolatility(prices);

        results[tf] = {
          label: config.label,
          days: config.days,
          startPrice,
          endPrice,
          change,
          high,
          low,
          range: ((high - low) / low) * 100,
          volatility,
          trend: change > 0 ? 'BULLISH' : 'BEARISH',
        };
      } catch (error) {
        console.error(`Failed to fetch ${tf} data:`, error);
      }
    }

    return results;
  }

  // ==================== CORRELATION ANALYSIS ====================

  async analyzeCorrelation(coinMarketCapAPI, symbols, days = 30) {
    const priceData = {};

    // Fetch price data for all coins
    for (const symbol of symbols) {
      try {
        const data = await this.getCMCHistoricalData(coinMarketCapAPI, symbol, days);
        priceData[symbol] = data.prices.map(p => p[1]);
      } catch (error) {
        console.error(`Failed to fetch ${symbol}:`, error);
      }
    }

    // Calculate correlation matrix
    const correlations = {};
    const symbolArray = Object.keys(priceData);

    for (let i = 0; i < symbolArray.length; i++) {
      const symbol1 = symbolArray[i];
      correlations[symbol1] = {};

      for (let j = 0; j < symbolArray.length; j++) {
        const symbol2 = symbolArray[j];

        if (i === j) {
          correlations[symbol1][symbol2] = 1.0;
        } else {
          const corr = this.calculateCorrelation(
            priceData[symbol1],
            priceData[symbol2]
          );
          correlations[symbol1][symbol2] = corr;
        }
      }
    }

    return { correlations, coinIds: symbolArray };
  }

  // ==================== MOMENTUM ANALYSIS ====================

  async analyzeMomentum(coinMarketCapAPI, symbol, timeframes = ['1d', '7d', '30d']) {
    const momentum = {};

    for (const tf of timeframes) {
      const config = this.timeframes[tf];
      if (!config) continue;

      try {
        const data = await this.getCMCHistoricalData(coinMarketCapAPI, symbol, config.days);
        const prices = data.prices.map(p => p[1]);

        // Calculate ROC (Rate of Change)
        const roc = ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;

        // Calculate momentum strength
        const strength = this.calculateMomentumStrength(prices);

        // Determine momentum trend
        let trend;
        if (roc > 5) trend = 'STRONG BULLISH';
        else if (roc > 0) trend = 'BULLISH';
        else if (roc > -5) trend = 'BEARISH';
        else trend = 'STRONG BEARISH';

        momentum[tf] = {
          label: config.label,
          roc: roc.toFixed(2),
          strength,
          trend,
          consistency: this.checkTrendConsistency(prices),
        };
      } catch (error) {
        console.error(`Failed to analyze momentum for ${tf}:`, error);
      }
    }

    // Overall momentum signal
    const signals = Object.values(momentum).map(m => m.roc);
    const avgMomentum = signals.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / signals.length;

    let overallSignal;
    if (avgMomentum > 3) overallSignal = 'BULLISH';
    else if (avgMomentum < -3) overallSignal = 'BEARISH';
    else overallSignal = 'NEUTRAL';

    return {
      timeframes: momentum,
      overallSignal,
      avgMomentum: avgMomentum.toFixed(2),
    };
  }

  // ==================== SEASONALITY ANALYSIS ====================

  async analyzeSeasonality(coinMarketCapAPI, symbol) {
    // Fetch 1 year of data
    const data = await this.getCMCHistoricalData(coinMarketCapAPI, symbol, 365);
    const prices = data.prices;

    // Group by month
    const monthlyReturns = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let month = 0; month < 12; month++) {
      const monthPrices = prices.filter(p => {
        const date = new Date(p[0]);
        return date.getMonth() === month;
      });

      if (monthPrices.length < 2) continue;

      const returns = [];
      for (let i = 1; i < monthPrices.length; i++) {
        const ret = ((monthPrices[i][1] - monthPrices[i - 1][1]) / monthPrices[i - 1][1]) * 100;
        returns.push(ret);
      }

      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;

      monthlyReturns[monthNames[month]] = {
        avgReturn: avgReturn.toFixed(2),
        samples: returns.length,
        trend: avgReturn > 0 ? 'BULLISH' : 'BEARISH',
      };
    }

    // Find best/worst months
    const monthEntries = Object.entries(monthlyReturns);
    const sorted = monthEntries.sort((a, b) => parseFloat(b[1].avgReturn) - parseFloat(a[1].avgReturn));

    return {
      monthly: monthlyReturns,
      bestMonth: sorted[0] ? sorted[0][0] : 'N/A',
      worstMonth: sorted[sorted.length - 1] ? sorted[sorted.length - 1][0] : 'N/A',
    };
  }

  // ==================== HELPER METHODS ====================

  calculateVolatility(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    const variance = returns.reduce((sum, r) => sum + r * r, 0) / returns.length;
    return Math.sqrt(variance);
  }

  calculateCorrelation(arr1, arr2) {
    const minLength = Math.min(arr1.length, arr2.length);
    const a = arr1.slice(0, minLength);
    const b = arr2.slice(0, minLength);

    const mean1 = a.reduce((s, v) => s + v, 0) / a.length;
    const mean2 = b.reduce((s, v) => s + v, 0) / b.length;

    let num = 0;
    let den1 = 0;
    let den2 = 0;

    for (let i = 0; i < a.length; i++) {
      const diff1 = a[i] - mean1;
      const diff2 = b[i] - mean2;
      num += diff1 * diff2;
      den1 += diff1 * diff1;
      den2 += diff2 * diff2;
    }

    return num / Math.sqrt(den1 * den2);
  }

  calculateMomentumStrength(prices) {
    // Count consecutive ups and downs
    let ups = 0;
    let downs = 0;

    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > prices[i - 1]) ups++;
      else if (prices[i] < prices[i - 1]) downs++;
    }

    const total = ups + downs;
    const strength = Math.abs(ups - downs) / total;

    if (strength > 0.7) return 'STRONG';
    if (strength > 0.5) return 'MODERATE';
    return 'WEAK';
  }

  checkTrendConsistency(prices) {
    const midpoint = Math.floor(prices.length / 2);
    const firstHalf = prices.slice(0, midpoint);
    const secondHalf = prices.slice(midpoint);

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    return secondAvg > firstAvg ? 'CONSISTENT UP' : 'CONSISTENT DOWN';
  }
}

export default MultiTimeframeAnalyzer;
