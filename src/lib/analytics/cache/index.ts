/**
 * Analytics Cache Management Modules
 *
 * @module analytics/cache
 *
 * @description Unified exports for analytics cache management.
 * This module provides a clean API for all cache operations across
 * the analytics system.
 *
 * **Cache Modules**:
 * - `cacheCoordinator`: Cross-system cache orchestration
 * - `localStorageCleaner`: localStorage cache operations
 * - `ttlCache`: Deprecated manager TTL cache utilities
 *
 * **Migration Path**:
 * The manager-level TTL cache is deprecated. New code should:
 * - Use `useAnalyticsWorker` hook for worker-based caching
 * - Use `usePerformanceCache` hook for hook-level caching
 * - Avoid direct manager cache manipulation
 *
 * @example
 * ```typescript
 * import { clearAllCaches, clearStudentCaches } from '@/lib/analytics/cache';
 *
 * // Clear all caches
 * const result = await clearAllCaches(analyticsCache);
 *
 * // Clear student-specific caches
 * await clearStudentCaches('student-123', analyticsCache);
 * ```
 */

// Cache Coordinator - Primary API
export {
  clearAllCaches,
  clearStudentCaches,
  clearManagerCache,
  notifyWorkers,
  type CacheClearResult,
  type CacheClearSummary,
  type StudentCacheClearResult,
} from './cacheCoordinator';

// LocalStorage Cleaner - Utility API
export {
  clearAnalyticsLocalStorage,
  clearSpecificKey,
  clearByPrefix,
  getAnalyticsCacheCount,
  type LocalStorageClearResult,
} from './localStorageCleaner';

// TTL Cache - Deprecated API
export {
  isManagerTtlCacheDisabled,
  getTtlMs,
  isCacheValid,
} from './ttlCache';
