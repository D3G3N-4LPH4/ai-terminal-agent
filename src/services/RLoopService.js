/**
 * R-Loop Service
 *
 * Frontend service for managing the R-Loop autonomous AI agent.
 * Communicates with backend endpoints to start/stop/monitor the agent.
 */

import BrowserEventEmitter from '../utils/BrowserEventEmitter.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

class RLoopService extends BrowserEventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.status = null;
    this.pollInterval = null;
    this.output = [];
  }

  /**
   * Start the R-Loop agent with given tasks
   * @param {string[]} tasks - Array of task descriptions
   * @param {Object} options - Optional settings
   * @param {number} options.maxIterations - Max iterations (default: 10)
   * @param {string} options.model - Claude model to use
   * @returns {Promise<Object>} Start result
   */
  async start(tasks, options = {}) {
    if (this.isRunning) {
      throw new Error('R-Loop is already running');
    }

    if (!tasks || tasks.length === 0) {
      throw new Error('At least one task is required');
    }

    const response = await fetch(`${BACKEND_URL}/api/rloop/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tasks,
        maxIterations: options.maxIterations || 10,
        model: options.model || 'claude-sonnet-4-20250514'
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to start R-Loop');
    }

    this.isRunning = true;
    this.emit('started', result);

    // Start polling for status updates
    this.startPolling();

    return result;
  }

  /**
   * Stop the running R-Loop agent
   * @returns {Promise<Object>} Stop result
   */
  async stop() {
    const response = await fetch(`${BACKEND_URL}/api/rloop/stop`, {
      method: 'POST'
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to stop R-Loop');
    }

    this.isRunning = false;
    this.stopPolling();
    this.emit('stopped', result);

    return result;
  }

  /**
   * Get current status
   * @returns {Promise<Object>} Status object
   */
  async getStatus() {
    const response = await fetch(`${BACKEND_URL}/api/rloop/status`);
    const status = await response.json();

    this.status = status;
    this.isRunning = status.running;

    return status;
  }

  /**
   * Get output log
   * @param {number} limit - Max entries to return
   * @returns {Promise<Object>} Output log
   */
  async getOutput(limit = 50) {
    const response = await fetch(`${BACKEND_URL}/api/rloop/output?limit=${limit}`);
    const result = await response.json();

    this.output = result.output || [];

    return result;
  }

  /**
   * Get progress log (detailed)
   * @returns {Promise<Object>} Progress log
   */
  async getProgress() {
    const response = await fetch(`${BACKEND_URL}/api/rloop/progress`);
    return response.json();
  }

  /**
   * Reset R-Loop state
   * @returns {Promise<Object>} Reset result
   */
  async reset() {
    const response = await fetch(`${BACKEND_URL}/api/rloop/reset`, {
      method: 'POST'
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to reset R-Loop');
    }

    this.isRunning = false;
    this.status = null;
    this.output = [];
    this.stopPolling();
    this.emit('reset', result);

    return result;
  }

  /**
   * Start polling for status updates
   * @param {number} interval - Poll interval in ms (default: 3000)
   */
  startPolling(interval = 3000) {
    this.stopPolling();

    this.pollInterval = setInterval(async () => {
      try {
        const status = await this.getStatus();
        this.emit('status', status);

        // Check for completion
        if (status.state === 'completed' && this.isRunning) {
          this.isRunning = false;
          this.stopPolling();
          this.emit('completed', status);
        }

        // Check for errors
        if (status.error) {
          this.emit('error', { error: status.error });
        }

        // Check if process stopped unexpectedly
        if (!status.running && this.isRunning) {
          this.isRunning = false;
          this.stopPolling();
          this.emit('stopped', status);
        }
      } catch (error) {
        console.error('[RLoopService] Polling error:', error);
      }
    }, interval);
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Format status for display
   * @param {Object} status - Status object
   * @returns {string} Formatted status
   */
  formatStatus(status) {
    if (!status) return 'Unknown';

    const lines = [];
    lines.push(`State: ${status.state || 'unknown'}`);
    lines.push(`Running: ${status.running ? 'Yes' : 'No'}`);
    lines.push(`Progress: ${status.completed || 0}/${status.total || 0} tasks`);

    if (status.currentTask) {
      lines.push(`Current: ${status.currentTask.substring(0, 50)}...`);
    }

    if (status.error) {
      lines.push(`Error: ${status.error}`);
    }

    if (status.tasks && status.tasks.length > 0) {
      lines.push('\nTasks:');
      status.tasks.forEach((task, i) => {
        const icon = task.completed ? '[X]' : '[ ]';
        lines.push(`  ${icon} ${i + 1}. ${task.text.substring(0, 60)}${task.text.length > 60 ? '...' : ''}`);
      });
    }

    return lines.join('\n');
  }
}

// Export singleton instance
const rloopService = new RLoopService();
export default rloopService;
