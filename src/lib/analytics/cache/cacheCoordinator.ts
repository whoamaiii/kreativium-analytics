/**
 * Cache Coordinator Module
 *
 * @module cacheCoordinator
 *
 * @description Orchestrates cache clearing operations across multiple cache systems.
 * This module provides a unified API for clearing caches at different levels:
 * manager-level TTL cache, analytics profiles, worker caches, and localStorage.
 *
 * **Cache Systems Coordinated**:
 * 1. **Manager TTL Cache**: Deprecated in-memory cache (Map-based)
 * 2. **Analytics Profiles**: Student analytics configurations and metadata
 * 3. **Worker Caches**: Web worker internal caches via event broadcast
 * 4. **Hook Caches**: React hook-level caches via event broadcast
 * 5. **LocalStorage**: Persisted cache entries and configurations
 * 6. **AI Metrics**: LLM usage tracking and performance metrics
 *
 * **Coordination Strategy**:
 * - Fail-soft: Individual system failures don't stop others
 * - Sequential: Operations run in defined order
 * - Comprehensive: All cache layers cleared in single operation
 * - Observable: Detailed summaries of clearing operations
 *
 * **Event Broadcasting**:
 * Uses analyticsCoordinator to broadcast cache clear events to:
 * - Web workers (via worker message handlers)
 * - React hooks (via useAnalyticsWorker, usePerformanceCache)
 * - Other listeners subscribed to cache clear events
 */

import { logger } from '@/lib/logger';
import { AnalyticsWorkerCoordinator } from '@/lib/analyticsCoordinator';
import { clearAnalyticsLocalStorage, type LocalStorageClearResult } from './localStorageCleaner';

/**
 * Summary of cache clearing operations across all systems.
 *
 * @interface CacheClearSummary
 */
export interface CacheClearSummary {
  /** Whether manager TTL cache was cleared */
  managerCacheCleared?: boolean;
  /** Number of profiles before clearing */
  profilesBefore?: number;
  /** Number of profiles cleared */
  profilesCleared?: number;
  /** Whether AI metrics were reset */
  aiMetricsReset?: boolean;
  /** LocalStorage clearing details */
  localStorage?: LocalStorageClearResult;
  /** Any errors encountered (non-fatal) */
  errors?: string[];
}

/**
 * Result of a cache clearing operation.
 *
 * @interface CacheClearResult
 * @property {boolean} ok - Whether operation completed successfully
 * @property {CacheClearSummary} summary - Detailed summary of operations
 */
export interface CacheClearResult {
  ok: boolean;
  summary: CacheClearSummary;
}

/**
 * Result of student-specific cache clearing.
 *
 * @interface StudentCacheClearResult
 * @property {boolean} ok - Whether operation completed successfully
 * @property {string} studentId - The student ID that was cleared
 */
export interface StudentCacheClearResult {
  ok: boolean;
  studentId: string;
}

/**
 * Clear the deprecated manager TTL cache.
 *
 * @function clearManagerCache
 * @param {Map<string, any>} analyticsCache - The manager's TTL cache Map
 * @param {string} [studentId] - Optional student ID for targeted clearing
 * @returns {boolean} True if cache was cleared
 *
 * @description Clears the manager-level TTL cache (deprecated).
 *
 * **Clearing Modes**:
 * - **Targeted**: Clear only specified student's cache entry
 * - **Global**: Clear entire cache Map
 *
 * **Deprecation Notice**:
 * This cache is deprecated. New code should use:
 * - `useAnalyticsWorker` hook for worker-based caching
 * - `usePerformanceCache` hook for hook-level caching
 *
 * @deprecated Manager TTL cache will be removed in future release.
 *
 * @example
 * ```typescript
 * // Clear specific student
 * clearManagerCache(cache, 'student-123');
 *
 * // Clear entire cache
 * clearManagerCache(cache);
 * ```
 */
export function clearManagerCache(analyticsCache: Map<string, any>, studentId?: string): boolean {
  try {
    if (studentId) {
      analyticsCache.delete(studentId);
    } else {
      analyticsCache.clear();
    }
    return true;
  } catch (e) {
    logger.warn('[cacheCoordinator] clearManagerCache failed', e as Error);
    return false;
  }
}

/**
 * Broadcast cache clear events to workers and hooks.
 *
 * @function notifyWorkers
 * @param {string} [studentId] - Optional student ID for targeted clearing
 * @returns {boolean} True if notification was sent
 *
 * @description Broadcasts cache clear events via custom events.
 *
 * **Event Types**:
 * - **Student-specific**: `analytics:cache:clear:student` with studentId detail
 * - **Global**: `analytics:cache:clear` (no detail)
 *
 * **Listeners**:
 * - Web workers: Via worker message handlers
 * - React hooks: useAnalyticsWorker, usePerformanceCache
 * - Other components: Custom event listeners
 *
 * **Non-Browser Environments**:
 * - SSR: No-op (window undefined)
 * - Node tests: No-op (gracefully handles)
 *
 * @example
 * ```typescript
 * // Notify for specific student
 * notifyWorkers('student-123');
 *
 * // Notify for all students
 * notifyWorkers();
 * ```
 */
export function notifyWorkers(studentId?: string): boolean {
  try {
    AnalyticsWorkerCoordinator.broadcastCacheClear(studentId);
    return true;
  } catch (e) {
    logger.warn('[cacheCoordinator] notifyWorkers failed', e as Error);
    return false;
  }
}

/**
 * Clear all analytics-related caches across all systems.
 *
 * @async
 * @function clearAllCaches
 * @param {Map<string, any>} analyticsCache - The manager's TTL cache Map
 * @param {boolean} [broadcast=true] - Whether to broadcast clear events
 * @returns {Promise<CacheClearResult>} Summary of clearing operations
 *
 * @description Orchestrates comprehensive cache clearing across all cache layers.
 *
 * **Clearing Sequence**:
 * 1. **Manager TTL Cache**: Clear deprecated Map-based cache
 * 2. **Analytics Profiles**: Clear student analytics configurations
 * 3. **AI Metrics**: Reset LLM usage and performance tracking
 * 4. **Worker Broadcast**: Notify workers/hooks to clear (if enabled)
 * 5. **LocalStorage**: Remove persisted cache entries
 *
 * **Error Handling**:
 * - Each system cleared independently (fail-soft)
 * - Failures logged but don't stop other operations
 * - Summary includes both successes and failures
 * - Overall operation marked failed only if critical errors occur
 *
 * **Broadcasting**:
 * - `broadcast=true` (default): Workers/hooks notified
 * - `broadcast=false`: Local clearing only, no coordination
 *
 * **Performance**:
 * - Async profile operations awaited
 * - LocalStorage cleared synchronously
 * - Total time typically < 50ms
 *
 * @example
 * ```typescript
 * const manager = AnalyticsManagerService.getInstance();
 * const result = await clearAllCaches(manager.analyticsCache);
 *
 * if (result.ok) {
 *   console.log('All caches cleared successfully');
 *   console.log(`Cleared ${result.summary.localStorage?.keysCleared.length} localStorage keys`);
 *   console.log(`Cleared ${result.summary.profilesCleared} profiles`);
 * }
 * ```
 */
export async function clearAllCaches(
  analyticsCache: Map<string, any>,
  broadcast = true,
): Promise<CacheClearResult> {
  const summary: CacheClearSummary = {
    errors: [],
  };

  try {
    // 1. Clear manager TTL cache (deprecated)
    try {
      logger.warn(
        '[cacheCoordinator] Clearing deprecated manager TTL cache as part of global cache clear.',
      );
      const cleared = clearManagerCache(analyticsCache);
      summary.managerCacheCleared = cleared;
    } catch (e) {
      const error = e as Error;
      logger.warn('[cacheCoordinator] Manager cache clear failed', error);
      summary.errors?.push(`Manager cache: ${error.message}`);
    }

    // 2. Clear analytics profiles
    try {
      const { clearAllProfiles, getProfileCacheStats } = await import('@/lib/analyticsProfiles');
      const before = getProfileCacheStats().count;
      const cleared = clearAllProfiles();
      summary.profilesBefore = before;
      summary.profilesCleared = cleared;
    } catch (e) {
      const error = e as Error;
      logger.warn('[cacheCoordinator] Profile clearing failed', error);
      summary.errors?.push(`Profiles: ${error.message}`);
    }

    // 3. Reset AI metrics (localStorage-based)
    try {
      const { aiMetrics } = await import('@/lib/ai/metrics');
      aiMetrics.reset();
      summary.aiMetricsReset = true;
    } catch (e) {
      const error = e as Error;
      logger.warn('[cacheCoordinator] AI metrics reset failed', error);
      summary.errors?.push(`AI metrics: ${error.message}`);
    }

    // 4. Broadcast to workers/hooks (if enabled)
    if (broadcast) {
      try {
        notifyWorkers();
      } catch (e) {
        const error = e as Error;
        logger.warn('[cacheCoordinator] Worker notification failed', error);
        summary.errors?.push(`Worker broadcast: ${error.message}`);
      }
    }

    // 5. Clear localStorage entries
    try {
      const localStorageResult = clearAnalyticsLocalStorage();
      summary.localStorage = localStorageResult;
    } catch (e) {
      const error = e as Error;
      logger.warn('[cacheCoordinator] localStorage clearing failed', error);
      summary.errors?.push(`localStorage: ${error.message}`);
    }

    // Clean up empty errors array
    if (summary.errors?.length === 0) {
      delete summary.errors;
    }

    const ok = !summary.errors || summary.errors.length === 0;
    logger.info('[cacheCoordinator] Cleared all analytics caches', { ...summary, ok });

    return { ok, summary };
  } catch (e) {
    logger.error('[cacheCoordinator] clearAllCaches failed catastrophically', e as Error);
    return {
      ok: false,
      summary: {
        ...summary,
        errors: [...(summary.errors || []), `Fatal: ${(e as Error).message}`],
      },
    };
  }
}

/**
 * Clear caches for a specific student across all systems.
 *
 * @async
 * @function clearStudentCaches
 * @param {string} studentId - The student ID to clear caches for
 * @param {Map<string, any>} analyticsCache - The manager's TTL cache Map
 * @returns {Promise<StudentCacheClearResult>} Result of clearing operation
 *
 * @description Clears all cache entries related to a specific student.
 *
 * **Systems Cleared**:
 * 1. **Manager TTL Cache**: Remove student's cache entry
 * 2. **Analytics Profiles**: Clear student's profile cache
 * 3. **Worker/Hook Caches**: Broadcast student-specific clear event
 *
 * **Use Cases**:
 * - Student data updated (new tracking entries)
 * - Student profile changed
 * - Manual cache refresh requested
 * - Analytics re-computation triggered
 *
 * **Broadcasting**:
 * Sends `analytics:cache:clear:student` event with studentId detail.
 * Hooks can listen and clear their student-specific caches.
 *
 * **Validation**:
 * - Returns failure if studentId is empty/invalid
 * - Logs warning for validation failures
 *
 * @example
 * ```typescript
 * const manager = AnalyticsManagerService.getInstance();
 * const result = await clearStudentCaches('student-abc123', manager.analyticsCache);
 *
 * if (result.ok) {
 *   console.log(`Cleared caches for student ${result.studentId}`);
 * }
 * ```
 */
export async function clearStudentCaches(
  studentId: string,
  analyticsCache: Map<string, any>,
): Promise<StudentCacheClearResult> {
  try {
    // Validate input
    if (!studentId || typeof studentId !== 'string') {
      logger.warn('[cacheCoordinator] clearStudentCaches: invalid studentId', { studentId });
      return { ok: false, studentId };
    }

    // 1. Clear manager-level TTL cache
    try {
      logger.warn('[cacheCoordinator] Clearing deprecated manager TTL cache for student', {
        studentId,
      });
      clearManagerCache(analyticsCache, studentId);
    } catch (e) {
      logger.warn('[cacheCoordinator] Manager cache clear failed for student', e as Error);
    }

    // 2. Clear student profile
    try {
      const { clearStudentProfile } = await import('@/lib/analyticsProfiles');
      clearStudentProfile(studentId);
    } catch (e) {
      logger.warn('[cacheCoordinator] clearStudentProfile failed', e as Error);
    }

    // 3. Broadcast to workers/hooks
    try {
      notifyWorkers(studentId);
    } catch (e) {
      logger.warn('[cacheCoordinator] Worker notification failed for student', e as Error);
    }

    logger.info('[cacheCoordinator] Cleared student caches', { studentId });
    return { ok: true, studentId };
  } catch (e) {
    logger.error('[cacheCoordinator] clearStudentCaches failed', { error: e, studentId });
    return { ok: false, studentId };
  }
}
