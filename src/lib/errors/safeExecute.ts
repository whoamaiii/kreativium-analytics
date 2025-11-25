/**
 * @file Safe execution utilities for error handling.
 *
 * Use these utilities instead of empty catch blocks or noop comments.
 * They provide consistent error logging and fallback handling.
 */

import { logger } from '@/lib/logger';

export interface SafeExecuteOptions<T> {
  /** Fallback value to return if the operation fails */
  fallback: T;
  /** If true, don't log the error (use sparingly, only for truly ignorable errors) */
  silent?: boolean;
  /** If true, re-throw the error after logging */
  rethrow?: boolean;
}

/**
 * Execute a synchronous function with error handling and logging.
 * Use this instead of empty catch blocks.
 *
 * @example
 * // Instead of:
 * try { doSomething(); } catch { /* noop *\/ }
 *
 * // Use:
 * safeExecute(() => doSomething(), 'MyComponent.doSomething', { fallback: undefined });
 */
export function safeExecute<T>(
  fn: () => T,
  context: string,
  options: SafeExecuteOptions<T>,
): T {
  try {
    return fn();
  } catch (error) {
    if (!options.silent) {
      logger.error(`[${context}] Operation failed`, { error });
    }
    if (options.rethrow) {
      throw error;
    }
    return options.fallback;
  }
}

/**
 * Execute an async function with error handling and logging.
 * Use this instead of empty catch blocks in async code.
 *
 * @example
 * // Instead of:
 * await fetchData().catch(() => { /* noop *\/ });
 *
 * // Use:
 * await safeExecuteAsync(() => fetchData(), 'MyService.fetchData', { fallback: [] });
 */
export async function safeExecuteAsync<T>(
  fn: () => Promise<T>,
  context: string,
  options: SafeExecuteOptions<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (!options.silent) {
      logger.error(`[${context}] Async operation failed`, { error });
    }
    if (options.rethrow) {
      throw error;
    }
    return options.fallback;
  }
}

/**
 * Execute a cleanup function where failure shouldn't crash the app
 * but should still be logged for debugging.
 *
 * @example
 * // Instead of:
 * try { cleanup(); } catch { /* noop *\/ }
 *
 * // Use:
 * safeCleanup(() => cleanup(), 'MyComponent.cleanup');
 */
export function safeCleanup(fn: () => void, context: string): void {
  try {
    fn();
  } catch (error) {
    logger.warn(`[${context}] Cleanup failed (non-fatal)`, { error });
  }
}

/**
 * Wrap a Promise's catch handler with proper logging.
 * Use this for fire-and-forget async operations.
 *
 * @example
 * // Instead of:
 * preloadData().catch(() => { /* noop *\/ });
 *
 * // Use:
 * preloadData().catch(safeCatch('MyComponent.preloadData'));
 */
export function safeCatch(context: string): (error: unknown) => void {
  return (error: unknown) => {
    logger.warn(`[${context}] Promise rejected (non-fatal)`, { error });
  };
}

/**
 * Create a wrapped version of a function that catches and logs errors.
 * Useful for event handlers and callbacks.
 *
 * @example
 * const safeHandler = withErrorBoundary(
 *   () => processEvent(),
 *   'EventProcessor.processEvent',
 *   undefined
 * );
 * element.addEventListener('click', safeHandler);
 */
export function withErrorBoundary<T extends (...args: unknown[]) => unknown>(
  fn: T,
  context: string,
  fallback: ReturnType<T>,
): T {
  return ((...args: unknown[]) => {
    try {
      const result = fn(...args);
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          logger.error(`[${context}] Handler failed`, { error });
          return fallback;
        });
      }
      return result;
    } catch (error) {
      logger.error(`[${context}] Handler failed`, { error });
      return fallback;
    }
  }) as T;
}



