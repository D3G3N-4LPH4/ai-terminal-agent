/**
 * useCommandContext - Shared context and utilities for command hooks
 *
 * Provides common functionality needed by all command handlers:
 * - Output management (addOutput)
 * - Toast notifications (showToast)
 * - API references
 * - Utility functions
 */

import { useCallback, useRef } from 'react';

/**
 * Creates a command context with common utilities
 * @param {Object} options - Configuration options
 * @returns {Object} Command context with utilities
 */
export function useCommandContext({
  addOutput,
  showToast,
  apis,
  mlServices,
  config,
}) {
  return {
    addOutput,
    showToast,
    apis,
    mlServices,
    config,
  };
}

/**
 * Command result types for consistent output
 */
export const OutputType = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
  SYSTEM: 'system',
  HELP: 'help',
  AI: 'ai',
  WELCOME: 'welcome',
};

/**
 * Helper to create formatted output
 */
export function createOutput(type, content, options = {}) {
  return {
    type,
    content,
    id: options.id || Date.now() + Math.random(),
    ...options,
  };
}

/**
 * Command handler result
 */
export const CommandResult = {
  HANDLED: 'handled',
  NOT_HANDLED: 'not_handled',
  ERROR: 'error',
};

export default useCommandContext;
