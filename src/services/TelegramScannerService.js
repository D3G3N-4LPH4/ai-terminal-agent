/**
 * Telegram Scanner Service (Browser-Compatible)
 *
 * Connects to an externally running Python Telegram bot via WebSocket.
 * The Python bot must be started separately (e.g., via command line).
 *
 * To start the Python bot:
 *   cd telegram-scanner && python telegram_bot.py
 */

/**
 * Browser-compatible EventEmitter implementation
 */
class BrowserEventEmitter {
  constructor() {
    this._events = {};
  }

  on(event, listener) {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push(listener);
    return this;
  }

  off(event, listener) {
    if (!this._events[event]) return this;
    this._events[event] = this._events[event].filter(l => l !== listener);
    return this;
  }

  emit(event, ...args) {
    if (!this._events[event]) return false;
    this._events[event].forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
    return true;
  }

  removeAllListeners(event) {
    if (event) {
      delete this._events[event];
    } else {
      this._events = {};
    }
    return this;
  }
}

class TelegramScannerService extends BrowserEventEmitter {
  constructor() {
    super();

    this.ws = null;
    this.isRunning = false;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
    this.reconnectTimer = null;

    // Configuration - adjust these based on your Python bot settings
    this.wsPort = 8766;
    this.httpPort = 8765;

    // Statistics
    this.stats = {
      tokensReceived: 0,
      buySignals: 0,
      lastAlert: null,
      startTime: null
    };

    // Recent alerts buffer
    this.recentAlerts = [];
    this.maxRecentAlerts = 50;
  }

  /**
   * Start connecting to the Telegram bot WebSocket
   * Note: The Python bot must be started externally
   */
  async start() {
    if (this.isRunning) {
      console.log('[TelegramScanner] Already running');
      return { success: false, message: 'Already running' };
    }

    try {
      console.log('[TelegramScanner] Connecting to Python bot WebSocket...');
      console.log('[TelegramScanner] Note: Make sure the Python bot is running:');
      console.log('[TelegramScanner]   cd telegram-scanner && python telegram_bot.py');

      await this.connectWebSocket();

      this.isRunning = true;
      this.stats.startTime = new Date();

      return {
        success: true,
        message: 'Telegram scanner connected successfully',
        wsPort: this.wsPort,
        httpPort: this.httpPort
      };

    } catch (error) {
      console.error('[TelegramScanner] Start error:', error);
      return {
        success: false,
        message: `Failed to connect: ${error.message}. Is the Python bot running?`
      };
    }
  }

  /**
   * Connect to Python bot's WebSocket server using browser WebSocket
   */
  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `ws://localhost:${this.wsPort}`;
        console.log(`[TelegramScanner] Connecting to ${wsUrl}...`);

        // Use browser native WebSocket
        this.ws = new WebSocket(wsUrl);

        const timeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            this.ws.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          console.log('[TelegramScanner] WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleWebSocketMessage(message);
          } catch (error) {
            console.error('[TelegramScanner] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error('[TelegramScanner] WebSocket error:', error);
          this.emit('ws_error', error);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = () => {
          console.log('[TelegramScanner] WebSocket disconnected');
          this.isConnected = false;
          this.emit('disconnected');

          // Attempt reconnection if service is still running
          if (this.isRunning && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[TelegramScanner] Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            this.reconnectTimer = setTimeout(() => {
              this.connectWebSocket().catch(err => {
                console.error('[TelegramScanner] Reconnection failed:', err);
              });
            }, this.reconnectDelay);
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages from Python bot
   */
  handleWebSocketMessage(message) {
    if (message.type === 'pong') {
      // Health check response
      return;
    }

    if (message.type === 'telegram_token_alert') {
      this.stats.tokensReceived++;
      this.stats.lastAlert = new Date();

      if (message.ai_decision?.decision === 'BUY') {
        this.stats.buySignals++;
      }

      // Add to recent alerts buffer
      this.recentAlerts.unshift(message);
      if (this.recentAlerts.length > this.maxRecentAlerts) {
        this.recentAlerts.pop();
      }

      // Emit alert to UI
      this.emit('token_alert', message);

      console.log(`[TelegramScanner] Token alert: ${message.token.address.substring(0, 8)}... (${message.ai_decision?.decision})`);
    }
  }

  /**
   * Stop the WebSocket connection
   */
  async stop() {
    if (!this.isRunning) {
      return { success: false, message: 'Not running' };
    }

    console.log('[TelegramScanner] Stopping...');

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isRunning = false;
    this.isConnected = false;
    this.emit('stopped', { code: 0, signal: 'manual' });

    return { success: true, message: 'Telegram scanner stopped' };
  }

  /**
   * Get bot status
   */
  async getStatus() {
    if (!this.isRunning) {
      return {
        running: false,
        connected: false,
        stats: this.stats
      };
    }

    try {
      // Query HTTP API for additional status
      const response = await fetch(`http://localhost:${this.httpPort}/status`);
      const botStatus = await response.json();

      return {
        running: true,
        connected: this.isConnected,
        stats: this.stats,
        botStatus
      };
    } catch (error) {
      return {
        running: this.isRunning,
        connected: this.isConnected,
        stats: this.stats,
        error: 'Could not reach Python bot HTTP API'
      };
    }
  }

  /**
   * Get recent token alerts
   */
  getRecentAlerts(limit = 10) {
    return this.recentAlerts.slice(0, limit);
  }

  /**
   * Get recent token analyses from Python bot's database
   */
  async getRecentAnalyses(limit = 10) {
    try {
      const response = await fetch(`http://localhost:${this.httpPort}/recent?limit=${limit}`);
      const data = await response.json();
      return data.tokens || [];
    } catch (error) {
      console.error('[TelegramScanner] Failed to fetch recent analyses:', error);
      return [];
    }
  }

  /**
   * Update bot configuration
   */
  async updateConfig(config) {
    try {
      const response = await fetch(`http://localhost:${this.httpPort}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const result = await response.json();
      return { success: true, result };
    } catch (error) {
      console.error('[TelegramScanner] Failed to update config:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Send health check ping
   */
  sendPing() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));
    }
  }
}

// Export singleton instance
const telegramScannerService = new TelegramScannerService();
export default telegramScannerService;
