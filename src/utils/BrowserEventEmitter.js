/**
 * Browser-compatible EventEmitter implementation
 *
 * Use this instead of Node.js 'events' module for browser compatibility.
 * Shared utility to avoid code duplication across services.
 */

class BrowserEventEmitter {
  constructor() {
    this._events = {};
  }

  /**
   * Register an event listener
   * @param {string} event - Event name
   * @param {Function} listener - Callback function
   * @returns {this} For chaining
   */
  on(event, listener) {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push(listener);
    return this;
  }

  /**
   * Register a one-time event listener
   * @param {string} event - Event name
   * @param {Function} listener - Callback function
   * @returns {this} For chaining
   */
  once(event, listener) {
    const onceWrapper = (...args) => {
      this.off(event, onceWrapper);
      listener.apply(this, args);
    };
    onceWrapper._originalListener = listener;
    return this.on(event, onceWrapper);
  }

  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {Function} listener - Callback function to remove
   * @returns {this} For chaining
   */
  off(event, listener) {
    if (!this._events[event]) return this;
    this._events[event] = this._events[event].filter(
      l => l !== listener && l._originalListener !== listener
    );
    return this;
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {...any} args - Arguments to pass to listeners
   * @returns {boolean} True if event had listeners
   */
  emit(event, ...args) {
    if (!this._events[event]) return false;
    this._events[event].forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`[EventEmitter] Error in listener for "${event}":`, error);
      }
    });
    return true;
  }

  /**
   * Remove all listeners for an event (or all events)
   * @param {string} [event] - Optional event name
   * @returns {this} For chaining
   */
  removeAllListeners(event) {
    if (event) {
      delete this._events[event];
    } else {
      this._events = {};
    }
    return this;
  }

  /**
   * Get listener count for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    return this._events[event]?.length || 0;
  }

  /**
   * Get all event names with registered listeners
   * @returns {string[]} Array of event names
   */
  eventNames() {
    return Object.keys(this._events);
  }
}

export default BrowserEventEmitter;
