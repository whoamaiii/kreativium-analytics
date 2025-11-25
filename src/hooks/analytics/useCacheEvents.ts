/**
 * @file useCacheEvents.ts
 *
 * Hook for subscribing to analytics cache events and configuration changes.
 * Handles cache invalidation in response to global events.
 */

import { useEffect, useCallback } from 'react';
import { analyticsConfig } from '@/lib/analyticsConfig';
import { logger } from '@/lib/logger';

export interface UseCacheEventsOptions {
  /**
   * Function to clear all cache entries
   */
  clearCache: () => void;

  /**
   * Function to invalidate cache entries for a specific student
   */
  invalidateCacheForStudent: (studentId: string) => void;

  /**
   * Reference to store cleanup functions
   */
  cleanupFns?: React.MutableRefObject<Array<() => void>>;

  /**
   * Callback when precomputation config changes
   */
  onPrecomputationConfigChange?: (enabled: boolean) => void;
}

/**
 * Hook for subscribing to analytics cache events.
 *
 * Handles:
 * - Global cache clear events (analytics:cache:clear)
 * - Student-specific cache clear events (analytics:cache:clear:student)
 * - Configuration change subscriptions
 */
export function useCacheEvents(options: UseCacheEventsOptions): void {
  const { clearCache, invalidateCacheForStudent, cleanupFns, onPrecomputationConfigChange } =
    options;

  // Subscribe to configuration changes
  useEffect(() => {
    const unsubscribe = analyticsConfig.subscribe((newConfig) => {
      if (newConfig.cache.invalidateOnConfigChange) {
        clearCache();
      }

      try {
        const pc = newConfig.precomputation;
        if (pc && onPrecomputationConfigChange) {
          onPrecomputationConfigChange(pc.enabled);
        }
      } catch (e) {
        logger.warn('[useCacheEvents] Failed to handle precomputation config change', { error: e });
      }
    });

    return unsubscribe;
  }, [clearCache, onPrecomputationConfigChange]);

  // Cache clear event handler
  const handleClearAll = useCallback(() => {
    try {
      clearCache();
    } catch (e) {
      logger.warn('[useCacheEvents] Failed to clear cache on global event', { error: e });
    }
  }, [clearCache]);

  // Student-specific cache clear handler
  const handleClearStudent = useCallback(
    (evt: Event) => {
      try {
        const detail = (evt as CustomEvent).detail as { studentId?: string } | undefined;
        if (detail?.studentId) {
          invalidateCacheForStudent(detail.studentId);
        } else {
          clearCache();
        }
      } catch (e) {
        logger.warn('[useCacheEvents] Failed to handle student cache clear event', { error: e });
      }
    },
    [clearCache, invalidateCacheForStudent],
  );

  // Subscribe to global cache clear events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.addEventListener('analytics:cache:clear', handleClearAll as EventListener);
      window.addEventListener('analytics:cache:clear:student', handleClearStudent as EventListener);

      if (cleanupFns) {
        cleanupFns.current.push(() => {
          try {
            window.removeEventListener('analytics:cache:clear', handleClearAll as EventListener);
            window.removeEventListener(
              'analytics:cache:clear:student',
              handleClearStudent as EventListener,
            );
          } catch (e) {
            logger.debug('[useCacheEvents] Failed to remove cache event listeners', { error: e });
          }
        });
      }
    } catch (e) {
      logger.warn('[useCacheEvents] Failed to set up cache event listeners', { error: e });
    }

    return () => {
      if (typeof window !== 'undefined') {
        try {
          window.removeEventListener('analytics:cache:clear', handleClearAll as EventListener);
          window.removeEventListener(
            'analytics:cache:clear:student',
            handleClearStudent as EventListener,
          );
        } catch (e) {
          logger.debug('[useCacheEvents] Failed to remove cache event listeners on cleanup', {
            error: e,
          });
        }
      }
    };
  }, [handleClearAll, handleClearStudent, cleanupFns]);
}
