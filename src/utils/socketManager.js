/**
 * Socket.io Manager for Real-Time Communication
 *
 * Provides a centralized WebSocket connection manager for:
 * - Degenerate Town live updates
 * - Trading signals
 * - Market events
 * - Agent synchronization
 */

import { io } from 'socket.io-client';
import BrowserEventEmitter from './BrowserEventEmitter.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

class SocketManager extends BrowserEventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.subscriptions = new Set();
  }

  /**
   * Connect to the WebSocket server
   * @param {Object} options - Connection options
   * @returns {Promise<boolean>} Connection success
   */
  async connect(options = {}) {
    if (this.connected) {
      console.log('[SocketManager] Already connected');
      return true;
    }

    return new Promise((resolve) => {
      try {
        this.socket = io(BACKEND_URL, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
          timeout: 10000,
          ...options
        });

        this.socket.on('connect', () => {
          console.log('[SocketManager] Connected to server');
          this.connected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');

          // Re-subscribe to previous channels
          this.subscriptions.forEach(channel => {
            this.socket.emit('subscribe', channel);
          });

          resolve(true);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('[SocketManager] Disconnected:', reason);
          this.connected = false;
          this.emit('disconnected', reason);
        });

        this.socket.on('connect_error', (error) => {
          console.error('[SocketManager] Connection error:', error.message);
          this.reconnectAttempts++;
          this.emit('error', error);

          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[SocketManager] Max reconnection attempts reached');
            resolve(false);
          }
        });

        // Degenerate Town events
        this.socket.on('degen-update', (data) => {
          this.emit('degen-update', data);
        });

        this.socket.on('degen-trade', (trade) => {
          this.emit('degen-trade', trade);
        });

        this.socket.on('degen-event', (event) => {
          this.emit('degen-event', event);
        });

        this.socket.on('degen-leaderboard', (leaderboard) => {
          this.emit('degen-leaderboard', leaderboard);
        });

        // Trading events
        this.socket.on('trade-signal', (signal) => {
          this.emit('trade-signal', signal);
        });

        this.socket.on('price-update', (data) => {
          this.emit('price-update', data);
        });

        this.socket.on('market-alert', (alert) => {
          this.emit('market-alert', alert);
        });

        // Agent events
        this.socket.on('agent-decision', (decision) => {
          this.emit('agent-decision', decision);
        });

        this.socket.on('agent-status', (status) => {
          this.emit('agent-status', status);
        });

      } catch (error) {
        console.error('[SocketManager] Failed to initialize:', error);
        resolve(false);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.subscriptions.clear();
      console.log('[SocketManager] Disconnected');
    }
  }

  /**
   * Subscribe to a channel
   * @param {string} channel - Channel name
   */
  subscribe(channel) {
    this.subscriptions.add(channel);

    if (this.connected && this.socket) {
      this.socket.emit('subscribe', channel);
      console.log(`[SocketManager] Subscribed to: ${channel}`);
    }
  }

  /**
   * Unsubscribe from a channel
   * @param {string} channel - Channel name
   */
  unsubscribe(channel) {
    this.subscriptions.delete(channel);

    if (this.connected && this.socket) {
      this.socket.emit('unsubscribe', channel);
      console.log(`[SocketManager] Unsubscribed from: ${channel}`);
    }
  }

  /**
   * Send a message to the server
   * @param {string} event - Event name
   * @param {*} data - Data to send
   */
  send(event, data) {
    if (!this.connected || !this.socket) {
      console.warn('[SocketManager] Not connected, cannot send:', event);
      return false;
    }

    this.socket.emit(event, data);
    return true;
  }

  /**
   * Send a Degenerate Town action
   * @param {string} action - Action type
   * @param {Object} payload - Action payload
   */
  sendDegenAction(action, payload = {}) {
    return this.send('degen-action', { action, ...payload });
  }

  /**
   * Request the current state
   * @param {string} stateType - Type of state to request
   */
  requestState(stateType) {
    return this.send('request-state', { type: stateType });
  }

  /**
   * Check if connected
   * @returns {boolean} Connection status
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Get connection stats
   * @returns {Object} Connection statistics
   */
  getStats() {
    return {
      connected: this.connected,
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: Array.from(this.subscriptions),
      socketId: this.socket?.id || null
    };
  }
}

// Export singleton instance
const socketManager = new SocketManager();
export default socketManager;

// Named exports for specific use cases
export { SocketManager };
