/**
 * Analytics Cache Management Hook
 *
 * Extracted from AnalyticsDashboard.tsx to separate cache invalidation,
 * refresh logic, and "new insights" detection from UI concerns.
 *
 * This hook consolidates all cache-related operations:
 * - Listening to global cache clear events
 * - Detecting incoming data changes
 * - Managing "new insights available" state
 * - Auto-refresh when insights are available
 * - Manual refresh triggering
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsDataCounts {
  entries: number;
  emotions: number;
  sensory: number;
}

export interface UseAnalyticsCacheOptions {
  /**
   * Student ID to filter cache clear events
   */
  studentId?: string;

  /**
   * Enable automatic refresh when new insights are available
   * @default false
   */
  autoRefresh?: boolean;

  /**
   * Delay in milliseconds before auto-refreshing
   * @default 1200
   */
  autoRefreshDelayMs?: number;

  /**
   * Callback when manual refresh is triggered
   */
  onRefresh?: () => void;

  /**
   * Callback when cache is cleared
   */
  onCacheClear?: () => void;
}

export interface UseAnalyticsCacheReturn {
  /**
   * Whether new insights are available
   */
  hasNewInsights: boolean;

  /**
   * Whether a refresh is currently pending
   */
  pendingRefresh: boolean;

  /**
   * Manually trigger a refresh
   */
  triggerRefresh: () => void;

  /**
   * Mark insights as viewed (clears the "new insights" badge)
   */
  markInsightsViewed: () => void;

  /**
   * Force set the "new insights" state
   */
  setHasNewInsights: (value: boolean) => void;

  /**
   * Set pending refresh state
   */
  setPendingRefresh: (value: boolean) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing analytics cache state and refresh logic
 *
 * @example
 * ```typescript
 * const cache = useAnalyticsCache({
 *   studentId: student.id,
 *   autoRefresh: true,
 *   onRefresh: () => runAnalysis(data),
 * });
 *
 * // Show badge when new insights are available
 * {cache.hasNewInsights && <Badge>New insights</Badge>}
 *
 * // Manual refresh button
 * <Button onClick={cache.triggerRefresh}>Refresh</Button>
 * ```
 */
export function useAnalyticsCache(options: UseAnalyticsCacheOptions = {}): UseAnalyticsCacheReturn {
  const {
    studentId,
    autoRefresh = false,
    autoRefreshDelayMs = 1200,
    onRefresh,
    onCacheClear,
  } = options;

  const [hasNewInsights, setHasNewInsights] = useState(false);
  const [pendingRefresh, setPendingRefresh] = useState(false);

  /**
   * Handle cache clear events from the global event bus
   */
  const handleCacheClear = useCallback(
    (event: Event) => {
      const customEvent = event as CustomEvent<{ studentId?: string } | undefined>;
      const targetStudentId = customEvent.detail?.studentId;

      // If event specifies a student ID, only respond if it matches
      if (targetStudentId && studentId && targetStudentId !== studentId) {
        return;
      }

      setHasNewInsights(true);

      if (onCacheClear) {
        onCacheClear();
      }
    },
    [studentId, onCacheClear],
  );

  /**
   * Listen for global and student-specific cache clear events
   */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handler = (event: Event) => handleCacheClear(event);

    window.addEventListener('analytics:cache:clear', handler);
    window.addEventListener('analytics:cache:clear:student', handler);

    return () => {
      window.removeEventListener('analytics:cache:clear', handler);
      window.removeEventListener('analytics:cache:clear:student', handler);
    };
  }, [handleCacheClear]);

  /**
   * Manually trigger a refresh
   */
  const triggerRefresh = useCallback(() => {
    setPendingRefresh(true);

    if (onRefresh) {
      onRefresh();
    }
  }, [onRefresh]);

  /**
   * Auto-refresh when enabled and new insights are available
   */
  useEffect(() => {
    if (!autoRefresh || !hasNewInsights) return undefined;

    const timeoutId = window.setTimeout(() => {
      setPendingRefresh(true);

      if (onRefresh) {
        onRefresh();
      }
    }, autoRefreshDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [autoRefresh, hasNewInsights, autoRefreshDelayMs, onRefresh]);

  /**
   * Mark insights as viewed
   */
  const markInsightsViewed = useCallback(() => {
    setHasNewInsights(false);
    setPendingRefresh(false);
  }, []);

  return {
    hasNewInsights,
    pendingRefresh,
    triggerRefresh,
    markInsightsViewed,
    setHasNewInsights,
    setPendingRefresh,
  };
}

// ============================================================================
// Data Change Detection Hook
// ============================================================================

export interface UseDataChangeDetectionOptions {
  /**
   * Filtered data to monitor for changes
   */
  filteredData: {
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
  };

  /**
   * Callback when data increases (new entries detected)
   */
  onDataIncrease?: (prev: AnalyticsDataCounts, next: AnalyticsDataCounts) => void;
}

/**
 * Hook for detecting when new data arrives
 *
 * Tracks entry counts and calls onDataIncrease when counts go up.
 * This is useful for showing "new insights available" indicators.
 *
 * @example
 * ```typescript
 * useDataChangeDetection({
 *   filteredData,
 *   onDataIncrease: (prev, next) => {
 *     cache.setHasNewInsights(true);
 *   },
 * });
 * ```
 */
export function useDataChangeDetection(options: UseDataChangeDetectionOptions): void {
  const { filteredData, onDataIncrease } = options;

  const prevCountsRef = useRef<AnalyticsDataCounts>({
    entries: 0,
    emotions: 0,
    sensory: 0,
  });

  useEffect(() => {
    try {
      const prev = prevCountsRef.current;
      const next: AnalyticsDataCounts = {
        entries: filteredData.entries?.length || 0,
        emotions: filteredData.emotions?.length || 0,
        sensory: filteredData.sensoryInputs?.length || 0,
      };

      // Only trigger on increase (new data arrived)
      if (
        next.entries > prev.entries ||
        next.emotions > prev.emotions ||
        next.sensory > prev.sensory
      ) {
        if (onDataIncrease) {
          onDataIncrease(prev, next);
        }
      }

      prevCountsRef.current = next;
    } catch {
      // Ignore errors in data change detection
    }
  }, [
    filteredData.entries?.length,
    filteredData.emotions?.length,
    filteredData.sensoryInputs?.length,
    onDataIncrease,
  ]);
}
