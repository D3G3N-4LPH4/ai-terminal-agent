// ==================== ALERT SYSTEM ====================
// Real-time monitoring and notifications for price, pattern, and sentiment changes
// Uses background polling and browser notifications
// Updated to use CoinMarketCap API

export class AlertManager {
  constructor(coinMarketCapAPI, mlServices) {
    this.coinMarketCapAPI = coinMarketCapAPI;
    this.mlServices = mlServices;
    this.alerts = [];
    this.alertIdCounter = 1;
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.checkIntervalMs = 60000; // Check every 60 seconds
    this.notificationPermission = 'default';

    // Request notification permission
    this.requestNotificationPermission();
  }

  // ==================== NOTIFICATION PERMISSIONS ====================

  async requestNotificationPermission() {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        this.notificationPermission = permission;
        if (permission === 'granted') {
          console.log('✓ Browser notifications enabled');
        }
      } catch (error) {
        console.warn('Notification permission error:', error);
      }
    }
  }

  sendNotification(title, body, icon = 'ᛒ') {
    if (this.notificationPermission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: `/vite.svg`, // Use app icon
          badge: `/vite.svg`,
          tag: 'crypto-alert',
          requireInteraction: false,
        });
      } catch (error) {
        console.warn('Notification send error:', error);
      }
    }
  }

  // ==================== ALERT MANAGEMENT ====================

  addAlert(config) {
    const alert = {
      id: this.alertIdCounter++,
      ...config,
      createdAt: new Date().toISOString(),
      triggered: false,
      lastCheck: null,
    };

    this.alerts.push(alert);

    // Start monitoring if not already running
    if (!this.isMonitoring) {
      this.startMonitoring();
    }

    return alert;
  }

  removeAlert(alertId) {
    const index = this.alerts.findIndex(a => a.id === alertId);
    if (index !== -1) {
      this.alerts.splice(index, 1);

      // Stop monitoring if no alerts left
      if (this.alerts.length === 0) {
        this.stopMonitoring();
      }

      return true;
    }
    return false;
  }

  getAlerts() {
    return this.alerts;
  }

  clearAllAlerts() {
    this.alerts = [];
    this.stopMonitoring();
  }

  // ==================== MONITORING ====================

  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('✓ Alert monitoring started');

    // Immediate check
    this.checkAllAlerts();

    // Set up interval
    this.monitoringInterval = setInterval(() => {
      this.checkAllAlerts();
    }, this.checkIntervalMs);
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('✓ Alert monitoring stopped');
  }

  async checkAllAlerts() {
    const activeAlerts = this.alerts.filter(a => !a.triggered);

    for (const alert of activeAlerts) {
      try {
        await this.checkAlert(alert);
      } catch (error) {
        console.error(`Alert check error (ID ${alert.id}):`, error);
      }
    }
  }

  async checkAlert(alert) {
    alert.lastCheck = new Date().toISOString();

    switch (alert.type) {
      case 'price':
        await this.checkPriceAlert(alert);
        break;
      case 'pattern':
        await this.checkPatternAlert(alert);
        break;
      case 'sentiment':
        await this.checkSentimentAlert(alert);
        break;
      case 'anomaly':
        await this.checkAnomalyAlert(alert);
        break;
      default:
        console.warn(`Unknown alert type: ${alert.type}`);
    }
  }

  // ==================== ALERT TYPE CHECKERS ====================

  async checkPriceAlert(alert) {
    const { coinId, symbol, condition, threshold } = alert;

    try {
      // Fetch current price from CMC
      const data = await this.coinMarketCapAPI.getQuotes(symbol);
      const quote = data[symbol]?.quote?.USD;
      const currentPrice = quote?.price || 0;

      let triggered = false;

      switch (condition) {
        case '>':
          triggered = currentPrice > threshold;
          break;
        case '<':
          triggered = currentPrice < threshold;
          break;
        case '>=':
          triggered = currentPrice >= threshold;
          break;
        case '<=':
          triggered = currentPrice <= threshold;
          break;
        default:
          console.warn(`Unknown condition: ${condition}`);
      }

      if (triggered) {
        this.triggerAlert(alert, {
          currentPrice,
          message: `${symbol} price ${condition} $${threshold.toLocaleString()}\nCurrent: $${currentPrice.toLocaleString()}`,
        });
      }
    } catch (error) {
      console.error('Price alert check error:', error);
    }
  }

  async checkPatternAlert(alert) {
    const { coinId, symbol, pattern: targetPattern } = alert;

    if (!this.mlServices.patternRecognizer) {
      console.warn('Pattern recognizer not available');
      return;
    }

    try {
      // Fetch price data from CMC
      const timeEnd = Math.floor(Date.now() / 1000);
      const timeStart = timeEnd - (60 * 24 * 60 * 60); // 60 days
      const data = await this.coinMarketCapAPI.getHistoricalQuotes(symbol, timeStart, timeEnd, "daily");
      const prices = data.quotes?.map(q => q.quote.USD.price) || [];

      // Recognize patterns
      const result = this.mlServices.patternRecognizer.recognizePatterns(prices);

      if (result.detected) {
        // Check if target pattern is detected
        const foundPattern = result.patterns.find(p =>
          p.pattern.toLowerCase().includes(targetPattern.toLowerCase()) ||
          targetPattern.toLowerCase().includes(p.pattern.toLowerCase())
        );

        if (foundPattern) {
          this.triggerAlert(alert, {
            pattern: foundPattern,
            message: `${symbol}: ${foundPattern.pattern} pattern detected!\nSignal: ${foundPattern.signal} (${foundPattern.confidence}% confidence)`,
          });
        }
      }
    } catch (error) {
      console.error('Pattern alert check error:', error);
    }
  }

  async checkSentimentAlert(alert) {
    const { coinId, symbol, targetSentiment } = alert;

    if (!this.mlServices.sentimentAnalyzer) {
      console.warn('Sentiment analyzer not available');
      return;
    }

    try {
      // Fetch market data from CMC
      const data = await this.coinMarketCapAPI.getQuotes(symbol);
      const quote = data[symbol]?.quote?.USD;

      const timeEnd = Math.floor(Date.now() / 1000);
      const timeStart = timeEnd - (30 * 24 * 60 * 60);
      const chartData = await this.coinMarketCapAPI.getHistoricalQuotes(symbol, timeStart, timeEnd, "daily");

      const marketData = {
        currentPrice: quote?.price || 0,
        priceHistory: chartData.quotes?.map(q => q.quote.USD.price) || [],
        volumeHistory: chartData.quotes?.map(q => q.quote.USD.volume_24h) || [],
        volume24h: quote?.volume_24h || 0,
        priceChange24h: quote?.percent_change_24h || 0,
        priceChange7d: quote?.percent_change_7d || 0,
      };

      const sentiment = this.mlServices.sentimentAnalyzer.analyzePriceSentiment(marketData);

      // Check if sentiment matches target
      const sentimentMatch =
        sentiment.sentiment.toLowerCase().includes(targetSentiment.toLowerCase());

      if (sentimentMatch) {
        this.triggerAlert(alert, {
          sentiment,
          message: `${symbol} sentiment is ${sentiment.sentiment}!\nScore: ${sentiment.score}/100`,
        });
      }
    } catch (error) {
      console.error('Sentiment alert check error:', error);
    }
  }

  async checkAnomalyAlert(alert) {
    const { coinId, symbol } = alert;

    if (!this.mlServices.anomalyDetector) {
      console.warn('Anomaly detector not available');
      return;
    }

    try {
      // Fetch market data from CMC
      const data = await this.coinMarketCapAPI.getQuotes(symbol);
      const quote = data[symbol]?.quote?.USD;

      const timeEnd = Math.floor(Date.now() / 1000);
      const timeStart = timeEnd - (30 * 24 * 60 * 60);
      const chartData = await this.coinMarketCapAPI.getHistoricalQuotes(symbol, timeStart, timeEnd, "daily");

      const marketData = {
        currentPrice: quote?.price || 0,
        priceHistory: chartData.quotes?.map(q => q.quote.USD.price) || [],
        volumeHistory: chartData.quotes?.map(q => q.quote.USD.volume_24h) || [],
        volume24h: quote?.volume_24h || 0,
      };

      const anomalies = this.mlServices.anomalyDetector.analyzeAnomalies(marketData);

      // Check if any anomalies detected
      if (anomalies.summary.totalAnomalies > 0) {
        this.triggerAlert(alert, {
          anomalies,
          message: `${symbol}: ${anomalies.summary.totalAnomalies} anomalies detected!\nRisk Level: ${anomalies.summary.riskLevel}\nActivity: ${anomalies.summary.recentActivity}`,
        });
      }
    } catch (error) {
      console.error('Anomaly alert check error:', error);
    }
  }

  // ==================== ALERT TRIGGERING ====================

  triggerAlert(alert, data) {
    alert.triggered = true;
    alert.triggeredAt = new Date().toISOString();
    alert.triggerData = data;

    // Send notification
    this.sendNotification(
      `ᛒ Alert: ${alert.symbol}`,
      data.message,
      'ᚹ'
    );

    // Log to console
    console.log(`ᛒ Alert triggered (ID ${alert.id}):`, data.message);

    // Trigger callback if provided
    if (alert.onTrigger && typeof alert.onTrigger === 'function') {
      alert.onTrigger(alert, data);
    }

    return alert;
  }

  // ==================== HELPER METHODS ====================

  getActiveAlerts() {
    return this.alerts.filter(a => !a.triggered);
  }

  getTriggeredAlerts() {
    return this.alerts.filter(a => a.triggered);
  }

  getAlertStats() {
    return {
      total: this.alerts.length,
      active: this.getActiveAlerts().length,
      triggered: this.getTriggeredAlerts().length,
      isMonitoring: this.isMonitoring,
    };
  }
}

export default AlertManager;
