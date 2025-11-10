/**
 * Standardized error handling utilities
 *
 * Provides consistent error handling patterns across the application
 * to replace inconsistent try-catch blocks and silent failures.
 */

import { logger } from '@/lib/logger';

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * Safely parse JSON with fallback and logging
 *
 * @param json - JSON string to parse (can be null)
 * @param fallback - Fallback value if parsing fails
 * @param context - Context string for logging (e.g., 'UserSettings', 'StorageKey')
 * @returns Parsed value or fallback
 *
 * @example
 * ```ts
 * const data = safeJsonParse(
 *   localStorage.getItem('user'),
 *   { name: 'Guest' },
 *   'UserData'
 * );
 * ```
 */
export function safeJsonParse<T>(
  json: string | null | undefined,
  fallback: T,
  context: string
): T {
  if (!json) {
    return fallback;
  }

  try {
    return JSON.parse(json) as T;
  } catch (error) {
    logger.warn(`[${context}] JSON parse failed`, {
      error: error instanceof Error ? error.message : String(error),
      jsonLength: json.length,
    });
    return fallback;
  }
}

/**
 * Safely stringify JSON with fallback
 *
 * @param value - Value to stringify
 * @param fallback - Fallback string if stringification fails
 * @param context - Context string for logging
 * @returns JSON string or fallback
 */
export function safeJsonStringify<T>(
  value: T,
  fallback: string,
  context: string
): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    logger.warn(`[${context}] JSON stringify failed`, {
      error: error instanceof Error ? error.message : String(error),
      valueType: typeof value,
    });
    return fallback;
  }
}

/**
 * Safely access storage with fallback and logging
 *
 * @param key - Storage key
 * @param fallback - Fallback value if access fails
 * @param context - Context string for logging
 * @param storage - Storage backend (defaults to localStorage if available)
 * @returns Stored value or fallback
 *
 * @example
 * ```ts
 * const theme = safeLocalStorageGet('theme', 'light', 'ThemeSettings');
 * // or with custom storage
 * const temp = safeLocalStorageGet('temp', 'default', 'TempData', sessionStorage);
 * ```
 */
export function safeLocalStorageGet(
  key: string,
  fallback: string,
  context: string,
  storage: Storage = typeof window !== 'undefined' ? window.localStorage : ({} as Storage)
): string {
  try {
    if (!storage || typeof storage.getItem !== 'function') {
      return fallback;
    }
    const value = storage.getItem(key);
    return value ?? fallback;
  } catch (error) {
    logger.warn(`[${context}] storage.getItem failed`, {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}

/**
 * Safely set storage with logging
 *
 * @param key - Storage key
 * @param value - Value to store
 * @param context - Context string for logging
 * @param storage - Storage backend (defaults to localStorage if available)
 * @returns true if successful, false otherwise
 *
 * @example
 * ```ts
 * safeLocalStorageSet('theme', 'dark', 'ThemeSettings');
 * // or with custom storage
 * safeLocalStorageSet('temp', 'data', 'TempData', sessionStorage);
 * ```
 */
export function safeLocalStorageSet(
  key: string,
  value: string,
  context: string,
  storage: Storage = typeof window !== 'undefined' ? window.localStorage : ({} as Storage)
): boolean {
  try {
    if (!storage || typeof storage.setItem !== 'function') {
      logger.warn(`[${context}] storage.setItem not available`, { key });
      return false;
    }
    storage.setItem(key, value);
    return true;
  } catch (error) {
    logger.error(`[${context}] storage.setItem failed`, {
      key,
      error: error instanceof Error ? error.message : String(error),
      valueLength: value.length,
    });
    return false;
  }
}

/**
 * Safely remove storage item with logging
 *
 * @param key - Storage key
 * @param context - Context string for logging
 * @param storage - Storage backend (defaults to localStorage if available)
 * @returns true if successful, false otherwise
 *
 * @example
 * ```ts
 * safeLocalStorageRemove('theme', 'ThemeSettings');
 * // or with custom storage
 * safeLocalStorageRemove('temp', 'TempData', sessionStorage);
 * ```
 */
export function safeLocalStorageRemove(
  key: string,
  context: string,
  storage: Storage = typeof window !== 'undefined' ? window.localStorage : ({} as Storage)
): boolean {
  try {
    if (!storage || typeof storage.removeItem !== 'function') {
      logger.warn(`[${context}] storage.removeItem not available`, { key });
      return false;
    }
    storage.removeItem(key);
    return true;
  } catch (error) {
    logger.error(`[${context}] storage.removeItem failed`, {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Safely parse a number from string with fallback
 *
 * @param value - String value to parse
 * @param fallback - Fallback number if parsing fails
 * @param context - Context string for logging
 * @returns Parsed number or fallback
 *
 * @example
 * ```ts
 * const count = safeNumberParse(
 *   localStorage.getItem('count'),
 *   0,
 *   'ItemCount'
 * );
 * ```
 */
export function safeNumberParse(
  value: string | null | undefined,
  fallback: number,
  context: string
): number {
  if (!value) {
    return fallback;
  }

  try {
    const parsed = Number(value);
    if (isNaN(parsed) || !isFinite(parsed)) {
      logger.warn(`[${context}] Number parse resulted in NaN or Infinity`, {
        value,
      });
      return fallback;
    }
    return parsed;
  } catch (error) {
    logger.warn(`[${context}] Number parse failed`, {
      value,
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}

/**
 * Wrap an async operation with error handling
 *
 * @param operation - Async operation to execute
 * @param context - Context string for logging
 * @returns Result object with success/failure state
 *
 * @example
 * ```ts
 * const result = await tryCatch(
 *   async () => await fetchUserData(userId),
 *   'FetchUserData'
 * );
 *
 * if (result.success) {
 *   console.log('User data:', result.value);
 * } else {
 *   console.error('Failed to fetch:', result.error);
 * }
 * ```
 */
export async function tryCatch<T>(
  operation: () => Promise<T>,
  context: string
): Promise<Result<T>> {
  try {
    const value = await operation();
    return { success: true, value };
  } catch (error) {
    logger.error(`[${context}] Operation failed`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Wrap a sync operation with error handling
 *
 * @param operation - Sync operation to execute
 * @param context - Context string for logging
 * @returns Result object with success/failure state
 *
 * @example
 * ```ts
 * const result = tryCatchSync(
 *   () => JSON.parse(data),
 *   'ParseData'
 * );
 *
 * if (result.success) {
 *   console.log('Parsed:', result.value);
 * } else {
 *   console.error('Parse failed:', result.error);
 * }
 * ```
 */
export function tryCatchSync<T>(
  operation: () => T,
  context: string
): Result<T> {
  try {
    const value = operation();
    return { success: true, value };
  } catch (error) {
    logger.error(`[${context}] Operation failed`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Retry an async operation with exponential backoff
 *
 * @param operation - Async operation to execute
 * @param context - Context string for logging
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param initialDelayMs - Initial delay in milliseconds (default: 1000)
 * @returns Result object with success/failure state
 *
 * @example
 * ```ts
 * const result = await retryWithBackoff(
 *   async () => await fetchFromAPI(endpoint),
 *   'FetchAPI',
 *   3,
 *   1000
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  context: string,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<Result<T>> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const value = await operation();
      if (attempt > 0) {
        logger.info(`[${context}] Operation succeeded after ${attempt} retries`);
      }
      return { success: true, value };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delayMs = initialDelayMs * Math.pow(2, attempt);
        logger.warn(`[${context}] Operation failed, retrying in ${delayMs}ms`, {
          attempt: attempt + 1,
          maxRetries,
          error: lastError.message,
        });
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  logger.error(`[${context}] Operation failed after ${maxRetries} retries`, {
    error: lastError?.message,
    stack: lastError?.stack,
  });

  return {
    success: false,
    error: lastError ?? new Error('Operation failed after retries'),
  };
}

/**
 * Assert a condition and throw if false
 *
 * @param condition - Condition to check
 * @param message - Error message if condition is false
 * @param context - Context string for logging
 * @throws Error if condition is false
 *
 * @example
 * ```ts
 * assertCondition(user !== null, 'User must be logged in', 'AuthCheck');
 * ```
 */
export function assertCondition(
  condition: boolean,
  message: string,
  context: string
): asserts condition {
  if (!condition) {
    logger.error(`[${context}] Assertion failed: ${message}`);
    throw new Error(`[${context}] ${message}`);
  }
}

/**
 * Type guard to check if value is defined (not null or undefined)
 *
 * @param value - Value to check
 * @param context - Context string for logging
 * @returns true if value is defined
 *
 * @example
 * ```ts
 * if (isDefined(user, 'UserCheck')) {
 *   // user is definitely not null or undefined here
 *   console.log(user.name);
 * }
 * ```
 */
export function isDefined<T>(
  value: T | null | undefined,
  context?: string
): value is T {
  const defined = value !== null && value !== undefined;
  if (!defined && context) {
    logger.debug(`[${context}] Value is null or undefined`);
  }
  return defined;
}
