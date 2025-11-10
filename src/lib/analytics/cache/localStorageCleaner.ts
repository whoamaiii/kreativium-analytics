/**
 * LocalStorage Cache Cleaner Module
 *
 * @module localStorageCleaner
 *
 * @description Manages clearing of analytics-related localStorage entries.
 * This module provides centralized localStorage cache management with pattern
 * matching and error handling.
 *
 * **Cache Types Managed**:
 * - Analytics profiles (student analytics configurations)
 * - Performance caches (hook-level performance data)
 * - AI metrics (LLM usage and performance metrics)
 * - General analytics caches (pattern analysis results)
 *
 * **Pattern Matching**:
 * - Prefix-based: Keys containing specific prefixes
 * - Exact match: Keys matching exact storage keys
 * - Fail-soft: Individual key failures don't stop batch operations
 *
 * **Environment Support**:
 * - Browser: Full localStorage access
 * - SSR/Node: Gracefully handles missing localStorage
 * - Tests: Safe with mocked localStorage
 */

import { STORAGE_KEYS } from '@/lib/analyticsConfig';
import { logger } from '@/lib/logger';

/**
 * Result summary from localStorage clearing operations.
 *
 * @interface LocalStorageClearResult
 * @property {string[]} keysCleared - List of successfully cleared keys
 */
export interface LocalStorageClearResult {
  keysCleared: string[];
}

/**
 * Clear all analytics-related localStorage entries.
 *
 * @function clearAnalyticsLocalStorage
 * @returns {LocalStorageClearResult} Summary of cleared keys
 *
 * @description Performs a comprehensive clear of all analytics caches in localStorage.
 *
 * **Clearing Strategy**:
 * 1. Define relevant prefixes and exact keys
 * 2. Iterate through all localStorage keys
 * 3. Match against patterns (prefix or exact)
 * 4. Collect matching keys for removal
 * 5. Remove collected keys with individual error handling
 *
 * **Keys Cleared**:
 * - Prefix matches:
 *   - `STORAGE_KEYS.cachePrefix` ("analytics-cache")
 *   - `STORAGE_KEYS.performancePrefix` ("performance-cache")
 * - Exact matches:
 *   - `STORAGE_KEYS.analyticsConfig` ("sensory-compass-analytics-config")
 *   - `STORAGE_KEYS.analyticsProfiles` ("sensoryTracker_analyticsProfiles")
 *   - "kreativium_ai_metrics_v1" (AI metrics from @/lib/ai/metrics)
 *
 * **Error Handling**:
 * - Returns empty result if localStorage unavailable (SSR/tests)
 * - Logs warnings for individual key removal failures
 * - Continues processing remaining keys on failure
 * - Overall operation never throws
 *
 * **Performance**:
 * - Single iteration through localStorage keys
 * - Batched collection before removal
 * - No re-iteration after removal (uses pre-collected keys)
 *
 * @example
 * ```typescript
 * const result = clearAnalyticsLocalStorage();
 * logger.info(`Cleared ${result.keysCleared.length} cache entries:`, result.keysCleared);
 * // Example output:
 * // Cleared 5 cache entries: [
 * //   "analytics-cache:student-123",
 * //   "performance-cache:insights",
 * //   "sensoryTracker_analyticsProfiles",
 * //   "kreativium_ai_metrics_v1",
 * //   "sensory-compass-analytics-config"
 * // ]
 * ```
 */
export function clearAnalyticsLocalStorage(): LocalStorageClearResult {
  const keysCleared: string[] = [];

  // Return early if localStorage is not available (SSR, tests)
  if (typeof localStorage === 'undefined') {
    return { keysCleared };
  }

  try {
    // Define relevant prefixes and exact keys to clear
    const relevantPrefixes = [
      STORAGE_KEYS.cachePrefix,      // "analytics-cache"
      STORAGE_KEYS.performancePrefix, // "performance-cache"
    ];

    const exactKeys = [
      STORAGE_KEYS.analyticsConfig,   // "sensory-compass-analytics-config"
      STORAGE_KEYS.analyticsProfiles, // "sensoryTracker_analyticsProfiles"
      'kreativium_ai_metrics_v1',     // AI metrics key from @/lib/ai/metrics
    ];

    // Collect keys to remove (iterate once to avoid mutations during iteration)
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Check if key contains any of the relevant prefixes
      const hasRelevantPrefix = relevantPrefixes.some(prefix => key.includes(prefix));

      // Check if key exactly matches any of the exact keys
      const isExactMatch = exactKeys.includes(key);

      if (hasRelevantPrefix || isExactMatch) {
        keysToRemove.push(key);
      }
    }

    // Remove collected keys with individual error handling
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        keysCleared.push(key);
      } catch (e) {
        logger.warn(`[localStorageCleaner] Failed to remove key: ${key}`, e as Error);
      }
    });
  } catch (e) {
    logger.warn('[localStorageCleaner] clearAnalyticsLocalStorage encountered issues', e as Error);
  }

  return { keysCleared };
}

/**
 * Clear a specific analytics cache key from localStorage.
 *
 * @function clearSpecificKey
 * @param {string} key - The exact localStorage key to clear
 * @returns {boolean} True if key was successfully cleared
 *
 * @description Removes a single specific key from localStorage with error handling.
 *
 * **Use Cases**:
 * - Clear specific student cache
 * - Remove individual performance cache entry
 * - Delete specific analytics result
 *
 * **Error Handling**:
 * - Returns false if localStorage unavailable
 * - Returns false if key doesn't exist (no-op)
 * - Logs warning on removal failure
 * - Never throws
 *
 * @example
 * ```typescript
 * const cleared = clearSpecificKey('analytics-cache:student-abc123');
 * if (cleared) {
 *   logger.info('Student cache cleared');
 * }
 * ```
 */
export function clearSpecificKey(key: string): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    logger.warn(`[localStorageCleaner] Failed to remove key: ${key}`, e as Error);
    return false;
  }
}

/**
 * Clear all localStorage keys matching a specific prefix.
 *
 * @function clearByPrefix
 * @param {string} prefix - The prefix to match against
 * @returns {LocalStorageClearResult} Summary of cleared keys
 *
 * @description Removes all localStorage keys containing the specified prefix.
 *
 * **Pattern Matching**:
 * - Uses `String.includes()` for flexible matching
 * - Prefix can appear anywhere in key name
 * - Case-sensitive matching
 *
 * **Use Cases**:
 * - Clear all student analytics caches
 * - Remove all performance caches
 * - Batch clear by feature area
 *
 * @example
 * ```typescript
 * // Clear all analytics caches
 * const result = clearByPrefix(STORAGE_KEYS.cachePrefix);
 * logger.info(`Cleared ${result.keysCleared.length} analytics caches`);
 *
 * // Clear all performance caches
 * const perfResult = clearByPrefix(STORAGE_KEYS.performancePrefix);
 * ```
 */
export function clearByPrefix(prefix: string): LocalStorageClearResult {
  const keysCleared: string[] = [];

  if (typeof localStorage === 'undefined') {
    return { keysCleared };
  }

  try {
    const keysToRemove: string[] = [];

    // Collect keys matching prefix
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(prefix)) {
        keysToRemove.push(key);
      }
    }

    // Remove collected keys
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        keysCleared.push(key);
      } catch (e) {
        logger.warn(`[localStorageCleaner] Failed to remove key: ${key}`, e as Error);
      }
    });
  } catch (e) {
    logger.warn(`[localStorageCleaner] clearByPrefix("${prefix}") encountered issues`, e as Error);
  }

  return { keysCleared };
}

/**
 * Get count of analytics-related entries in localStorage.
 *
 * @function getAnalyticsCacheCount
 * @returns {number} Count of analytics cache entries
 *
 * @description Counts localStorage entries matching analytics patterns without clearing them.
 *
 * **Counted Patterns**:
 * - All keys with analytics cache prefixes
 * - Exact analytics config/profile keys
 * - AI metrics keys
 *
 * **Use Cases**:
 * - Cache size monitoring
 * - Pre-clear validation
 * - Dashboard metrics
 *
 * @example
 * ```typescript
 * const count = getAnalyticsCacheCount();
 * logger.info(`Currently ${count} analytics cache entries in localStorage`);
 * ```
 */
export function getAnalyticsCacheCount(): number {
  if (typeof localStorage === 'undefined') {
    return 0;
  }

  try {
    const relevantPrefixes = [
      STORAGE_KEYS.cachePrefix,
      STORAGE_KEYS.performancePrefix,
    ];

    const exactKeys = [
      STORAGE_KEYS.analyticsConfig,
      STORAGE_KEYS.analyticsProfiles,
      'kreativium_ai_metrics_v1',
    ];

    let count = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const hasRelevantPrefix = relevantPrefixes.some(prefix => key.includes(prefix));
      const isExactMatch = exactKeys.includes(key);

      if (hasRelevantPrefix || isExactMatch) {
        count++;
      }
    }

    return count;
  } catch (e) {
    logger.warn('[localStorageCleaner] getAnalyticsCacheCount failed', e as Error);
    return 0;
  }
}
