/**
 * @fileoverview Error Recovery Utilities
 *
 * Provides utilities for:
 * - Error classification and categorization
 * - User-friendly error message formatting
 * - Actionable recovery suggestions
 * - Recovery strategy selection based on error type
 * - Error reporting and logging integration
 *
 * @module lib/errorRecovery
 */

import { logger } from './logger';

/**
 * Error severity levels for prioritization
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error recovery action types
 */
export enum RecoveryAction {
  RETRY = 'retry',
  RELOAD_PAGE = 'reload_page',
  CLEAR_CACHE = 'clear_cache',
  CHECK_CONNECTION = 'check_connection',
  UPDATE_SETTINGS = 'update_settings',
  CONTACT_SUPPORT = 'contact_support',
  NAVIGATE_HOME = 'navigate_home',
  BROWSER_RESTART = 'browser_restart',
}

/**
 * Structured error information for display
 */
export interface DisplayErrorInfo {
  userMessage: string;
  technicalMessage: string;
  severity: ErrorSeverity;
  suggestions: string[];
  recoveryActions: RecoveryAction[];
  errorType: string;
  timestamp: Date;
}

/**
 * Classify an error to determine its severity and type
 */
export function classifyError(error: Error | unknown): {
  type: string;
  severity: ErrorSeverity;
  isRecoverable: boolean;
} {
  const errorStr = error instanceof Error ? error.toString() : String(error);
  const message = error instanceof Error ? error.message : '';
  const name = error instanceof Error ? error.name : 'Unknown';

  // Network errors
  if (
    name.includes('Network') ||
    message.includes('fetch') ||
    message.includes('CORS') ||
    message.includes('Failed to fetch') ||
    errorStr.includes('net::ERR_')
  ) {
    return {
      type: 'NETWORK_ERROR',
      severity: ErrorSeverity.HIGH,
      isRecoverable: true
    };
  }

  // Storage/Quota errors
  if (
    name.includes('QuotaExceeded') ||
    message.includes('storage') ||
    message.includes('quota') ||
    errorStr.includes('localStorage is full')
  ) {
    return {
      type: 'STORAGE_ERROR',
      severity: ErrorSeverity.MEDIUM,
      isRecoverable: true
    };
  }

  // Chart/Visualization errors
  if (
    message.includes('chart') ||
    message.includes('render') ||
    message.includes('DOM') ||
    name.includes('Render')
  ) {
    return {
      type: 'RENDERING_ERROR',
      severity: ErrorSeverity.MEDIUM,
      isRecoverable: true
    };
  }

  // Data validation errors
  if (
    name.includes('Validation') ||
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('malformed')
  ) {
    return {
      type: 'DATA_VALIDATION_ERROR',
      severity: ErrorSeverity.LOW,
      isRecoverable: true
    };
  }

  // Timeout errors
  if (
    name.includes('Timeout') ||
    message.includes('timeout') ||
    message.includes('took too long')
  ) {
    return {
      type: 'TIMEOUT_ERROR',
      severity: ErrorSeverity.MEDIUM,
      isRecoverable: true
    };
  }

  // Worker/Processing errors
  if (
    message.includes('worker') ||
    message.includes('process') ||
    name.includes('Worker')
  ) {
    return {
      type: 'PROCESSING_ERROR',
      severity: ErrorSeverity.MEDIUM,
      isRecoverable: true
    };
  }

  // Memory errors
  if (
    message.includes('memory') ||
    message.includes('heap') ||
    name.includes('RangeError')
  ) {
    return {
      type: 'MEMORY_ERROR',
      severity: ErrorSeverity.HIGH,
      isRecoverable: true
    };
  }

  // Type errors
  if (name.includes('TypeError')) {
    return {
      type: 'TYPE_ERROR',
      severity: ErrorSeverity.MEDIUM,
      isRecoverable: false
    };
  }

  // Reference errors
  if (name.includes('ReferenceError')) {
    return {
      type: 'REFERENCE_ERROR',
      severity: ErrorSeverity.MEDIUM,
      isRecoverable: false
    };
  }

  // Syntax errors
  if (name.includes('SyntaxError')) {
    return {
      type: 'SYNTAX_ERROR',
      severity: ErrorSeverity.HIGH,
      isRecoverable: false
    };
  }

  // Unknown error
  return {
    type: 'UNKNOWN_ERROR',
    severity: ErrorSeverity.MEDIUM,
    isRecoverable: true
  };
}

/**
 * Get recovery suggestions based on error classification
 */
export function getErrorSuggestions(error: Error | unknown): string[] {
  const { type, isRecoverable } = classifyError(error);

  const suggestions: string[] = [];

  switch (type) {
    case 'NETWORK_ERROR':
      suggestions.push('Check your internet connection');
      suggestions.push('Try disabling any VPN or proxy');
      suggestions.push('Wait a moment and try again');
      suggestions.push('Check if the server is reachable');
      break;

    case 'STORAGE_ERROR':
      suggestions.push('Clear your browser cache and storage');
      suggestions.push('Remove old tracking data');
      suggestions.push('Close other tabs using this site');
      suggestions.push('Try using a private/incognito window');
      break;

    case 'RENDERING_ERROR':
      suggestions.push('Refresh the page');
      suggestions.push('Clear your browser cache');
      suggestions.push('Try a different browser');
      suggestions.push('Disable browser extensions');
      break;

    case 'DATA_VALIDATION_ERROR':
      suggestions.push('Check the format of your input data');
      suggestions.push('Ensure all required fields are filled');
      suggestions.push('Verify data types match expectations');
      break;

    case 'TIMEOUT_ERROR':
      suggestions.push('Check your internet connection speed');
      suggestions.push('Try the operation again with smaller data');
      suggestions.push('Close unnecessary browser tabs');
      suggestions.push('Try again later during off-peak hours');
      break;

    case 'PROCESSING_ERROR':
      suggestions.push('Try with less data');
      suggestions.push('Close other applications to free memory');
      suggestions.push('Restart your browser');
      suggestions.push('Try again in a few moments');
      break;

    case 'MEMORY_ERROR':
      suggestions.push('Close other tabs and applications');
      suggestions.push('Clear your browser cache');
      suggestions.push('Restart your browser');
      suggestions.push('Try with a smaller dataset');
      break;

    case 'TYPE_ERROR':
    case 'REFERENCE_ERROR':
    case 'SYNTAX_ERROR':
      suggestions.push('This is a software bug - please contact support');
      suggestions.push('Try refreshing the page');
      suggestions.push('Clear your browser cache');
      break;

    default:
      suggestions.push('Refresh the page');
      suggestions.push('Clear your browser cache and cookies');
      suggestions.push('Try again in a few moments');
      if (!isRecoverable) {
        suggestions.push('If the problem persists, contact support');
      }
  }

  return suggestions;
}

/**
 * Format error for display to users with appropriate message level
 */
export function formatErrorForDisplay(
  error: Error | unknown,
  isDevelopment: boolean = false
): DisplayErrorInfo {
  const classification = classifyError(error);
  const suggestions = getErrorSuggestions(error);

  const errorMsg = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : 'Error';

  let userMessage: string;
  let technicalMessage: string;

  switch (classification.type) {
    case 'NETWORK_ERROR':
      userMessage = 'Network connection failed. Please check your internet connection and try again.';
      technicalMessage = `Network error: ${errorMsg}`;
      break;

    case 'STORAGE_ERROR':
      userMessage = 'Storage is full or unavailable. Please clear some data and try again.';
      technicalMessage = `Storage error: ${errorMsg}`;
      break;

    case 'RENDERING_ERROR':
      userMessage = 'Failed to display the content. Please refresh the page.';
      technicalMessage = `Rendering error: ${errorMsg}`;
      break;

    case 'DATA_VALIDATION_ERROR':
      userMessage = 'The data you provided is invalid. Please check and try again.';
      technicalMessage = `Validation error: ${errorMsg}`;
      break;

    case 'TIMEOUT_ERROR':
      userMessage = 'The operation took too long. Please try again or try with less data.';
      technicalMessage = `Timeout error: ${errorMsg}`;
      break;

    case 'PROCESSING_ERROR':
      userMessage = 'Failed to process your request. Please try again.';
      technicalMessage = `Processing error: ${errorMsg}`;
      break;

    case 'MEMORY_ERROR':
      userMessage = 'The application ran out of memory. Please close some other applications and try again.';
      technicalMessage = `Memory error: ${errorMsg}`;
      break;

    case 'TYPE_ERROR':
    case 'REFERENCE_ERROR':
    case 'SYNTAX_ERROR':
      userMessage = 'A software error occurred. Please refresh the page or contact support if the problem persists.';
      technicalMessage = `${errorName}: ${errorMsg}`;
      break;

    default:
      userMessage = 'An unexpected error occurred. Please try again or refresh the page.';
      technicalMessage = `${errorName}: ${errorMsg}`;
  }

  if (isDevelopment) {
    userMessage = `[DEV] ${userMessage} - ${technicalMessage}`;
  }

  return {
    userMessage,
    technicalMessage,
    severity: classification.severity,
    suggestions,
    recoveryActions: getRecoveryActionsForError(classification.type),
    errorType: classification.type,
    timestamp: new Date()
  };
}

/**
 * Get recommended recovery actions for an error type
 */
export function getRecoveryActionsForError(errorType: string): RecoveryAction[] {
  const actions: RecoveryAction[] = [];

  switch (errorType) {
    case 'NETWORK_ERROR':
      actions.push(RecoveryAction.CHECK_CONNECTION);
      actions.push(RecoveryAction.RETRY);
      actions.push(RecoveryAction.CONTACT_SUPPORT);
      break;

    case 'STORAGE_ERROR':
      actions.push(RecoveryAction.CLEAR_CACHE);
      actions.push(RecoveryAction.RETRY);
      break;

    case 'RENDERING_ERROR':
      actions.push(RecoveryAction.RELOAD_PAGE);
      actions.push(RecoveryAction.CLEAR_CACHE);
      break;

    case 'DATA_VALIDATION_ERROR':
      actions.push(RecoveryAction.UPDATE_SETTINGS);
      actions.push(RecoveryAction.RETRY);
      break;

    case 'TIMEOUT_ERROR':
      actions.push(RecoveryAction.RETRY);
      actions.push(RecoveryAction.CHECK_CONNECTION);
      break;

    case 'PROCESSING_ERROR':
      actions.push(RecoveryAction.RETRY);
      actions.push(RecoveryAction.BROWSER_RESTART);
      break;

    case 'MEMORY_ERROR':
      actions.push(RecoveryAction.BROWSER_RESTART);
      actions.push(RecoveryAction.CLEAR_CACHE);
      break;

    default:
      actions.push(RecoveryAction.RETRY);
      actions.push(RecoveryAction.RELOAD_PAGE);
      actions.push(RecoveryAction.NAVIGATE_HOME);
  }

  return actions;
}

/**
 * Log an error with context for reporting
 */
export function logErrorForReporting(
  error: Error | unknown,
  context: Record<string, unknown> = {}
): void {
  const classification = classifyError(error);
  const displayInfo = formatErrorForDisplay(error);

  const reportData = {
    timestamp: new Date().toISOString(),
    errorType: classification.type,
    severity: classification.severity,
    isRecoverable: classification.isRecoverable,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    context
  };

  // Log based on severity
  if (classification.severity === ErrorSeverity.CRITICAL || classification.severity === ErrorSeverity.HIGH) {
    logger.error('[Error Report] High severity error', reportData);
  } else {
    logger.warn('[Error Report]', reportData);
  }
}

/**
 * Create a serializable error object for reporting
 */
export function serializeError(error: Error | unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause ? serializeError(error.cause) : undefined
    };
  }

  return {
    value: error,
    type: typeof error
  };
}

/**
 * Check if an error is likely due to user actions vs system issues
 */
export function isUserError(error: Error | unknown): boolean {
  const { type } = classifyError(error);

  const userErrorTypes = [
    'DATA_VALIDATION_ERROR',
    'TYPE_ERROR',
    'REFERENCE_ERROR',
    'SYNTAX_ERROR'
  ];

  return userErrorTypes.includes(type);
}

/**
 * Check if an error is transient and safe to retry
 */
export function isTransientError(error: Error | unknown): boolean {
  const { type, isRecoverable } = classifyError(error);

  const transientErrorTypes = [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'PROCESSING_ERROR'
  ];

  return isRecoverable && transientErrorTypes.includes(type);
}

/**
 * Get recommended retry strategy for an error
 */
export function getRetryStrategy(error: Error | unknown): {
  shouldRetry: boolean;
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
} {
  const { type } = classifyError(error);

  switch (type) {
    case 'NETWORK_ERROR':
    case 'TIMEOUT_ERROR':
      return {
        shouldRetry: true,
        maxAttempts: 5,
        delayMs: 1000,
        backoffMultiplier: 1.5
      };

    case 'PROCESSING_ERROR':
      return {
        shouldRetry: true,
        maxAttempts: 3,
        delayMs: 2000,
        backoffMultiplier: 2
      };

    case 'STORAGE_ERROR':
      return {
        shouldRetry: true,
        maxAttempts: 2,
        delayMs: 500,
        backoffMultiplier: 1
      };

    default:
      return {
        shouldRetry: false,
        maxAttempts: 1,
        delayMs: 0,
        backoffMultiplier: 1
      };
  }
}
