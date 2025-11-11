/**
 * TTL Cache Feature Flag Module
 *
 * @deprecated This module manages the deprecated manager-level TTL cache feature.
 * The manager-level TTL cache is being phased out in favor of hook-level caching
 * (useAnalyticsWorker + usePerformanceCache) with worker-internal caching.
 *
 * @module ttlCache
 *
 * **Migration Path**:
 * - New code should use useAnalyticsWorker hook with usePerformanceCache
 * - Worker-level caching handles TTL internally
 * - This module exists to isolate legacy TTL cache for eventual removal
 *
 * **Feature Flags**:
 * - `analyticsConfig.cache.disableManagerTTLCache` (boolean)
 * - `analyticsConfig.cache.disableManagerTTL` (boolean, alternate key)
 * - `VITE_DISABLE_MANAGER_TTL_CACHE` environment variable ("1" | "true" | "yes")
 *
 * @see useAnalyticsWorker for modern caching approach
 * @see usePerformanceCache for hook-level cache management
 */

import { analyticsConfig, ANALYTICS_CONFIG } from '@/lib/analyticsConfig';

/**
 * Check if the manager-level TTL cache is disabled via feature flags.
 *
 * @function isManagerTtlCacheDisabled
 * @returns {boolean} True if the manager TTL cache should be disabled
 *
 * @description Checks multiple sources for TTL cache disable flag:
 *
 * **Priority Order**:
 * 1. Runtime analytics config: `cache.disableManagerTTLCache` or `cache.disableManagerTTL`
 * 2. Environment variable: `VITE_DISABLE_MANAGER_TTL_CACHE`
 * 3. Default: false (TTL cache enabled for backward compatibility)
 *
 * **Environment Variable Values**:
 * - "1", "true", "yes" (case-insensitive) → disabled
 * - Any other value → enabled
 *
 * **Error Handling**:
 * - Config access failures → continue to env check
 * - Env access failures → return false (enabled)
 * - Fail-soft ensures cache availability
 *
 * @example
 * ```typescript
 * if (!isManagerTtlCacheDisabled()) {
 *   // Use manager TTL cache
 *   const cached = analyticsCache.get(studentId);
 * } else {
 *   // Skip manager TTL cache, rely on hook-level caching
 *   logger.info('Manager TTL cache disabled');
 * }
 * ```
 *
 * @deprecated This function will be removed when manager TTL cache is fully deprecated.
 * Use hook-level caching instead.
 */
export function isManagerTtlCacheDisabled(): boolean {
  // Check runtime config first (highest priority)
  try {
    const cfg = (() => {
      try {
        return analyticsConfig.getConfig();
      } catch {
        return null;
      }
    })();

    // Support both disableManagerTTLCache and disableManagerTTL keys
    const cfgFlag =
      (cfg?.cache as any)?.disableManagerTTLCache === true ||
      (cfg?.cache as any)?.disableManagerTTL === true;

    if (cfgFlag) {
      return true;
    }
  } catch {
    // Config access failed, continue to environment check
  }

  // Check environment variable (fallback)
  try {
    const env: Record<string, unknown> = (import.meta as any)?.env ?? {};
    const raw = (env.VITE_DISABLE_MANAGER_TTL_CACHE ?? '').toString().toLowerCase();
    return raw === '1' || raw === 'true' || raw === 'yes';
  } catch {
    // Environment access failed, default to enabled
  }

  return false;
}

/**
 * Get the TTL (Time To Live) value from analytics configuration.
 *
 * @function getTtlMs
 * @returns {number} TTL in milliseconds
 *
 * @description Retrieves the cache TTL from configuration with safe fallback.
 *
 * **Sources**:
 * 1. Runtime config: `analyticsConfig.cache.ttl`
 * 2. Default config: `ANALYTICS_CONFIG.cache.ttl`
 *
 * **Default Value**: Typically 5 minutes (300000ms)
 *
 * @example
 * ```typescript
 * const ttl = getTtlMs();
 * const cacheAge = Date.now() - cachedTimestamp.getTime();
 * const isExpired = cacheAge >= ttl;
 * ```
 *
 * @deprecated This function supports the deprecated manager TTL cache.
 * Use hook-level cache TTL configuration instead.
 */
export function getTtlMs(): number {
  try {
    const liveCfg = (() => {
      try {
        return analyticsConfig.getConfig();
      } catch {
        return null;
      }
    })();
    return liveCfg?.cache?.ttl ?? ANALYTICS_CONFIG.cache.ttl;
  } catch {
    return ANALYTICS_CONFIG.cache.ttl;
  }
}

/**
 * Check if a cached entry is still valid based on TTL.
 *
 * @function isCacheValid
 * @param {Date} cachedTimestamp - When the cache entry was created
 * @param {number} [customTtlMs] - Optional custom TTL in milliseconds
 * @returns {boolean} True if cache is still valid
 *
 * @description Validates cache freshness using TTL comparison.
 *
 * **Validation Logic**:
 * - Calculate age: `now - cachedTimestamp`
 * - Compare against TTL: `age < ttl`
 * - Returns false if timestamp is invalid
 *
 * @example
 * ```typescript
 * const cached = analyticsCache.get(studentId);
 * if (cached && isCacheValid(cached.timestamp)) {
 *   return cached.results;
 * }
 * ```
 *
 * @deprecated This function supports the deprecated manager TTL cache.
 * Use hook-level cache validation instead.
 */
export function isCacheValid(cachedTimestamp: Date, customTtlMs?: number): boolean {
  try {
    const now = new Date();
    const cacheAge = now.getTime() - cachedTimestamp.getTime();
    const ttl = customTtlMs ?? getTtlMs();
    return cacheAge < ttl;
  } catch {
    return false;
  }
}
