/**
 * Telegram Scanner Service
 *
 * Manages the Python Telegram bot as a child process and provides
 * a WebSocket bridge to receive token alerts in the Terminal UI.
 */

import { spawn } from 'child_process';
import WebSocket from 'ws';
import EventEmitter from 'events';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TelegramScannerService extends EventEmitter {
  constructor() {
    super();

    this.pythonProcess = null;
    this.ws = null;
    this.isRunning = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;

    // Configuration
    this.wsPort = process.env.TELEGRAM_WS_PORT || 8766;
    this.httpPort = process.env.TELEGRAM_HTTP_PORT || 8765;

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
   * Start the Python Telegram bot and connect to its WebSocket
   */
  async start() {
    if (this.isRunning) {
      console.log('[TelegramScanner] Already running');
      return { success: false, message: 'Already running' };
    }

    try {
      // Start Python bot process
      const botPath = path.join(process.cwd(), 'telegram-scanner', 'telegram_bot.py');

      console.log('[TelegramScanner] Starting Python bot...');
      console.log('[TelegramScanner] Bot path:', botPath);

      this.pythonProcess = spawn('python', [botPath], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      // Handle Python process output
      this.pythonProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        console.log(`[TelegramBot] ${output}`);
        this.emit('log', { level: 'info', message: output });
      });

      this.pythonProcess.stderr.on('data', (data) => {
        const output = data.toString().trim();
        console.error(`[TelegramBot] ${output}`);
        this.emit('log', { level: 'error', message: output });
      });

      this.pythonProcess.on('error', (error) => {
        console.error('[TelegramScanner] Process error:', error);
        this.emit('error', error);
        this.isRunning = false;
      });

      this.pythonProcess.on('exit', (code, signal) => {
        console.log(`[TelegramScanner] Process exited with code ${code}, signal ${signal}`);
        this.isRunning = false;
        this.pythonProcess = null;
        this.emit('stopped', { code, signal });
      });

      // Wait for bot to start and then connect to WebSocket
      await this.sleep(3000); // Give bot time to initialize

      await this.connectWebSocket();

      this.isRunning = true;
      this.stats.startTime = new Date();

      return {
        success: true,
        message: 'Telegram scanner started successfully',
        wsPort: this.wsPort,
        httpPort: this.httpPort
      };

    } catch (error) {
      console.error('[TelegramScanner] Start error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Connect to Python bot's WebSocket server
   */
  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `ws://localhost:${this.wsPort}`;
        console.log(`[TelegramScanner] Connecting to ${wsUrl}...`);

        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
          console.log('[TelegramScanner] WebSocket connected');
          this.reconnectAttempts = 0;
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleWebSocketMessage(message);
          } catch (error) {
            console.error('[TelegramScanner] Failed to parse message:', error);
          }
        });

        this.ws.on('error', (error) => {
          console.error('[TelegramScanner] WebSocket error:', error);
          this.emit('ws_error', error);
          reject(error);
        });

        this.ws.on('close', () => {
          console.log('[TelegramScanner] WebSocket disconnected');
          this.emit('disconnected');

          // Attempt reconnection if bot is still running
          if (this.isRunning && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[TelegramScanner] Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            setTimeout(() => {
              this.connectWebSocket().catch(err => {
                console.error('[TelegramScanner] Reconnection failed:', err);
              });
            }, this.reconnectDelay);
          }
        });

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
   * Stop the Python bot
   */
  async stop() {
    if (!this.isRunning) {
      return { success: false, message: 'Not running' };
    }

    console.log('[TelegramScanner] Stopping...');

    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Kill Python process
    if (this.pythonProcess) {
      this.pythonProcess.kill('SIGTERM');

      // Force kill after timeout
      setTimeout(() => {
        if (this.pythonProcess) {
          console.log('[TelegramScanner] Force killing process...');
          this.pythonProcess.kill('SIGKILL');
        }
      }, 5000);
    }

    this.isRunning = false;
    this.emit('stopped', { code: 0, signal: 'SIGTERM' });

    return { success: true, message: 'Telegram scanner stopped' };
  }

  /**
   * Get bot status
   */
  async getStatus() {
    if (!this.isRunning) {
      return {
        running: false,
        stats: this.stats
      };
    }

    try {
      // Query HTTP API for additional status
      const response = await fetch(`http://localhost:${this.httpPort}/status`);
      const botStatus = await response.json();

      return {
        running: true,
        connected: this.ws?.readyState === WebSocket.OPEN,
        stats: this.stats,
        botStatus
      };
    } catch (error) {
      return {
        running: this.isRunning,
        connected: this.ws?.readyState === WebSocket.OPEN,
        stats: this.stats,
        error: error.message
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

  /**
   * Utility sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
const telegramScannerService = new TelegramScannerService();
export default telegramScannerService;
