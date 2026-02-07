/**
 * skillExecutor.js - Execution engine for skill system
 *
 * Three execution modes:
 * - prompt: Returns a prompt extension string to inject into AI context
 * - api: Makes HTTP call with parameter substitution
 * - code: Sandboxed JS evaluation with restricted scope
 */

import { fetchWithTimeout } from './fetchWithTimeout.js';

const MAX_RESPONSE_LENGTH = 2000;
const CODE_TIMEOUT_MS = 5000;

/**
 * Execute a prompt-mode skill
 * Returns the skill content with {{input}} replaced by user input
 * @param {Object} skill - Skill definition
 * @param {string} input - User input
 * @returns {string} Prompt extension text
 */
export function executePrompt(skill, input) {
  let content = skill.content || '';
  content = content.replace(/\{\{input\}\}/g, input);
  // Replace named parameters if present
  if (skill.parameters) {
    skill.parameters.forEach(param => {
      const regex = new RegExp(`\\{\\{${param.name}\\}\\}`, 'g');
      content = content.replace(regex, param.default || '');
    });
  }
  return content;
}

/**
 * Execute an API-mode skill
 * Makes an HTTP request with parameter substitution in URL and body
 * @param {Object} skill - Skill definition
 * @param {string} input - User input
 * @returns {Promise<string>} API response (truncated)
 */
export async function executeApi(skill, input) {
  let url = (skill.content || '').replace(/\{\{input\}\}/g, encodeURIComponent(input));

  // Replace named parameters
  if (skill.parameters) {
    skill.parameters.forEach(param => {
      const regex = new RegExp(`\\{\\{${param.name}\\}\\}`, 'g');
      url = url.replace(regex, encodeURIComponent(param.default || ''));
    });
  }

  try {
    const response = await fetchWithTimeout(url, {
      method: skill.apiMethod || 'GET',
      headers: skill.apiHeaders || { 'Accept': 'application/json' },
      ...(skill.apiBody ? { body: skill.apiBody.replace(/\{\{input\}\}/g, input) } : {}),
    }, 10000);

    if (!response.ok) {
      return `API Error: ${response.status} ${response.statusText}`;
    }

    const text = await response.text();
    return text.length > MAX_RESPONSE_LENGTH
      ? text.substring(0, MAX_RESPONSE_LENGTH) + '... (truncated)'
      : text;
  } catch (error) {
    return `API Error: ${error.message}`;
  }
}

/**
 * Execute a code-mode skill
 * Runs user-defined JavaScript in a restricted scope
 * @param {Object} skill - Skill definition
 * @param {string} input - User input
 * @returns {Promise<string>} Execution result
 */
export async function executeCode(skill, input) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve('Error: Skill execution timed out (5s limit)');
    }, CODE_TIMEOUT_MS);

    try {
      // Restricted scope - no access to window, document, localStorage, fetch, etc.
      const restrictedGlobals = {
        window: undefined,
        document: undefined,
        localStorage: undefined,
        sessionStorage: undefined,
        fetch: undefined,
        XMLHttpRequest: undefined,
        WebSocket: undefined,
        eval: undefined,
        Function: undefined,
        importScripts: undefined,
      };

      const safeContext = {
        input,
        JSON,
        Math,
        Date,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        String,
        Number,
        Boolean,
        Array,
        Object,
        RegExp,
        Map,
        Set,
        console: { log: () => {}, warn: () => {}, error: () => {} },
      };

      // Build the function with restricted globals shadowing dangerous APIs
      const restrictedKeys = Object.keys(restrictedGlobals);
      const restrictedValues = Object.values(restrictedGlobals);
      const contextKeys = Object.keys(safeContext);
      const contextValues = Object.values(safeContext);

      const fn = new Function(
        ...restrictedKeys,
        ...contextKeys,
        `"use strict";\n${skill.content}`
      );

      const result = fn(...restrictedValues, ...contextValues);

      clearTimeout(timer);

      if (result === undefined || result === null) {
        resolve('(no output)');
      } else if (typeof result === 'object') {
        resolve(JSON.stringify(result, null, 2).substring(0, MAX_RESPONSE_LENGTH));
      } else {
        resolve(String(result).substring(0, MAX_RESPONSE_LENGTH));
      }
    } catch (error) {
      clearTimeout(timer);
      resolve(`Skill Error: ${error.message}`);
    }
  });
}

/**
 * Execute a skill based on its mode
 * @param {Object} skill - Skill definition
 * @param {string} input - User input
 * @returns {Promise<string>} Execution result
 */
export async function execute(skill, input) {
  switch (skill.mode) {
    case 'prompt':
      return executePrompt(skill, input);
    case 'api':
      return executeApi(skill, input);
    case 'code':
      return executeCode(skill, input);
    default:
      return `Unknown skill mode: ${skill.mode}`;
  }
}

export default { execute, executePrompt, executeApi, executeCode };
