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
 *
 * **Direct localStorage Access**:
 * This module retains direct localStorage access for iteration and removal operations
 * because it's a low-level cache cleanup utility. It uses storage abstraction utilities
 * where possible but needs direct access to enumerate all keys for pattern matching.
 */

import { STORAGE_KEYS as ANALYTICS_STORAGE_KEYS } from '@/lib/analyticsConfig';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { logger } from '@/lib/logger';
import { storageKeys, storageClearKeys } from '@/lib/storage/storageHelpers';

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

  try {
    // Define relevant prefixes and exact keys to clear
    const relevantPrefixes = [
      ANALYTICS_STORAGE_KEYS.cachePrefix,      // "analytics-cache"
      ANALYTICS_STORAGE_KEYS.performancePrefix, // "performance-cache"
    ];

    const exactKeys = [
      ANALYTICS_STORAGE_KEYS.analyticsConfig,   // "sensory-compass-analytics-config"
      ANALYTICS_STORAGE_KEYS.analyticsProfiles, // "sensoryTracker_analyticsProfiles"
      STORAGE_KEYS.AI_METRICS,                  // AI metrics key from @/lib/ai/metrics
    ];

    // Collect keys to remove using storage helpers
    const keysToRemove: string[] = [];

    // Get all keys from storage
    const allKeys = storageKeys();

    // Filter keys matching prefixes or exact matches
    allKeys.forEach(key => {
      const hasRelevantPrefix = relevantPrefixes.some(prefix => key.includes(prefix));
      const isExactMatch = exactKeys.includes(key);

      if (hasRelevantPrefix || isExactMatch) {
        keysToRemove.push(key);
      }
    });

    // Remove collected keys using storage helper
    const removed = storageClearKeys(keysToRemove);
    keysCleared.push(...removed);
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
  try {
    const removed = storageClearKeys([key]);
    return removed.length > 0;
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

  try {
    // Get all keys matching prefix using storage helper
    const matchingKeys = storageKeys(prefix);

    // Remove collected keys using storage helper
    const removed = storageClearKeys(matchingKeys);
    keysCleared.push(...removed);
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
  try {
    const relevantPrefixes = [
      ANALYTICS_STORAGE_KEYS.cachePrefix,
      ANALYTICS_STORAGE_KEYS.performancePrefix,
    ];

    const exactKeys = [
      ANALYTICS_STORAGE_KEYS.analyticsConfig,
      ANALYTICS_STORAGE_KEYS.analyticsProfiles,
      STORAGE_KEYS.AI_METRICS,
    ];

    let count = 0;

    // Get all keys using storage helper
    const allKeys = storageKeys();

    allKeys.forEach(key => {
      const hasRelevantPrefix = relevantPrefixes.some(prefix => key.includes(prefix));
      const isExactMatch = exactKeys.includes(key);

      if (hasRelevantPrefix || isExactMatch) {
        count++;
      }
    });

    return count;
  } catch (e) {
    logger.warn('[localStorageCleaner] getAnalyticsCacheCount failed', e as Error);
    return 0;
  }
}
