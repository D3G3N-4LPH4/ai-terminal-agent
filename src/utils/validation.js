/**
 * Input validation utilities for API requests and user inputs
 * Provides type-safe validation without requiring Zod dependency
 */

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Validate that a value is a non-empty string
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {string} - Validated string
 * @throws {ValidationError} - If validation fails
 */
export const validateString = (value, fieldName = 'value') => {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName);
  }
  if (value.trim().length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName);
  }
  return value.trim();
};

/**
 * Validate that a value is a valid number
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {object} options - Validation options (min, max)
 * @returns {number} - Validated number
 * @throws {ValidationError} - If validation fails
 */
export const validateNumber = (value, fieldName = 'value', options = {}) => {
  const num = Number(value);

  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a valid number`, fieldName);
  }

  if (options.min !== undefined && num < options.min) {
    throw new ValidationError(`${fieldName} must be at least ${options.min}`, fieldName);
  }

  if (options.max !== undefined && num > options.max) {
    throw new ValidationError(`${fieldName} must be at most ${options.max}`, fieldName);
  }

  return num;
};

/**
 * Validate that a value is a valid URL
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {string} - Validated URL
 * @throws {ValidationError} - If validation fails
 */
export const validateUrl = (value, fieldName = 'URL') => {
  const urlString = validateString(value, fieldName);

  try {
    const url = new URL(urlString);
    // Ensure it's http or https
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid protocol');
    }
    return urlString;
  } catch (error) {
    throw new ValidationError(`${fieldName} must be a valid URL (starting with http:// or https://)`, fieldName);
  }
};

/**
 * Validate that a value is a valid email
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {string} - Validated email
 * @throws {ValidationError} - If validation fails
 */
export const validateEmail = (value, fieldName = 'email') => {
  const email = validateString(value, fieldName);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new ValidationError(`${fieldName} must be a valid email address`, fieldName);
  }

  return email;
};

/**
 * Validate that a value is one of allowed options
 * @param {any} value - Value to validate
 * @param {Array} allowedValues - Array of allowed values
 * @param {string} fieldName - Name of the field for error messages
 * @returns {any} - Validated value
 * @throws {ValidationError} - If validation fails
 */
export const validateEnum = (value, allowedValues, fieldName = 'value') => {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      fieldName
    );
  }
  return value;
};

/**
 * Validate that a value is an array
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {object} options - Validation options (minLength, maxLength, itemValidator)
 * @returns {Array} - Validated array
 * @throws {ValidationError} - If validation fails
 */
export const validateArray = (value, fieldName = 'array', options = {}) => {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`, fieldName);
  }

  if (options.minLength !== undefined && value.length < options.minLength) {
    throw new ValidationError(`${fieldName} must have at least ${options.minLength} items`, fieldName);
  }

  if (options.maxLength !== undefined && value.length > options.maxLength) {
    throw new ValidationError(`${fieldName} must have at most ${options.maxLength} items`, fieldName);
  }

  // Validate each item if validator provided
  if (options.itemValidator) {
    value.forEach((item, index) => {
      try {
        options.itemValidator(item, `${fieldName}[${index}]`);
      } catch (error) {
        throw new ValidationError(error.message, fieldName);
      }
    });
  }

  return value;
};

/**
 * Validate that a value is an object
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {object} schema - Object schema with field validators
 * @returns {object} - Validated object
 * @throws {ValidationError} - If validation fails
 */
export const validateObject = (value, fieldName = 'object', schema = {}) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an object`, fieldName);
  }

  // Validate each field in schema
  const validated = {};
  for (const [key, validator] of Object.entries(schema)) {
    if (validator.required && !(key in value)) {
      throw new ValidationError(`${fieldName}.${key} is required`, `${fieldName}.${key}`);
    }

    if (key in value) {
      try {
        validated[key] = validator.validate(value[key], `${fieldName}.${key}`);
      } catch (error) {
        throw new ValidationError(error.message, `${fieldName}.${key}`);
      }
    } else if (validator.default !== undefined) {
      validated[key] = validator.default;
    }
  }

  return validated;
};

/**
 * Validate API key format
 * @param {any} value - Value to validate
 * @param {string} provider - Provider name for error messages
 * @returns {string} - Validated API key
 * @throws {ValidationError} - If validation fails
 */
export const validateApiKey = (value, provider = 'API') => {
  const apiKey = validateString(value, `${provider} API key`);

  // Check minimum length (most API keys are at least 20 chars)
  if (apiKey.length < 20) {
    throw new ValidationError(
      `${provider} API key appears to be invalid (too short)`,
      'apiKey'
    );
  }

  // Check for common mistakes (environment variable syntax)
  if (apiKey.includes('=') || apiKey.includes('$')) {
    throw new ValidationError(
      `${provider} API key appears to contain environment variable syntax. Use the actual key value.`,
      'apiKey'
    );
  }

  return apiKey;
};

/**
 * Validate chat messages array for AI APIs
 * @param {any} messages - Messages to validate
 * @returns {Array} - Validated messages array
 * @throws {ValidationError} - If validation fails
 */
export const validateChatMessages = (messages) => {
  const validatedMessages = validateArray(messages, 'messages', {
    minLength: 1,
  });

  validatedMessages.forEach((msg, index) => {
    if (!msg.role || !msg.content) {
      throw new ValidationError(
        `Message at index ${index} must have 'role' and 'content' fields`,
        'messages'
      );
    }

    validateEnum(msg.role, ['system', 'user', 'assistant'], `messages[${index}].role`);
    validateString(msg.content, `messages[${index}].content`);
  });

  return validatedMessages;
};

/**
 * Validate AI request options
 * @param {object} options - Options to validate
 * @returns {object} - Validated options
 * @throws {ValidationError} - If validation fails
 */
export const validateAIOptions = (options = {}) => {
  const validated = {};

  if (options.temperature !== undefined) {
    validated.temperature = validateNumber(options.temperature, 'temperature', {
      min: 0,
      max: 2,
    });
  }

  if (options.maxTokens !== undefined) {
    validated.maxTokens = validateNumber(options.maxTokens, 'maxTokens', {
      min: 1,
      max: 100000,
    });
  }

  if (options.top_p !== undefined) {
    validated.top_p = validateNumber(options.top_p, 'top_p', {
      min: 0,
      max: 1,
    });
  }

  if (options.top_k !== undefined) {
    validated.top_k = validateNumber(options.top_k, 'top_k', {
      min: 1,
    });
  }

  if (options.frequency_penalty !== undefined) {
    validated.frequency_penalty = validateNumber(options.frequency_penalty, 'frequency_penalty', {
      min: -2,
      max: 2,
    });
  }

  if (options.presence_penalty !== undefined) {
    validated.presence_penalty = validateNumber(options.presence_penalty, 'presence_penalty', {
      min: -2,
      max: 2,
    });
  }

  return validated;
};

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input to sanitize
 * @returns {string} - Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate and sanitize command input
 * @param {string} command - Command string to validate
 * @returns {string} - Validated and sanitized command
 * @throws {ValidationError} - If validation fails
 */
export const validateCommand = (command) => {
  const validatedCommand = validateString(command, 'command');

  // Check for maximum length to prevent abuse
  if (validatedCommand.length > 10000) {
    throw new ValidationError('Command is too long (max 10000 characters)', 'command');
  }

  return validatedCommand;
};

export default {
  ValidationError,
  validateString,
  validateNumber,
  validateUrl,
  validateEmail,
  validateEnum,
  validateArray,
  validateObject,
  validateApiKey,
  validateChatMessages,
  validateAIOptions,
  sanitizeInput,
  validateCommand,
};
