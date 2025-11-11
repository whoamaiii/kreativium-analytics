/**
 * @file Alert real-time synchronization hook
 *
 * Provides lightweight real-time streaming via custom browser events.
 * Listens for:
 * - `alerts:health` - Health check snapshots from alert system
 * - `alerts:updated` - Alert updates requiring UI refresh
 *
 * Automatically filters updates by student ID when viewing a specific student.
 * Includes performance tracking for UI update latency.
 */

import { useEffect } from 'react';
import { alertPerf } from '@/lib/alerts/performance';

/**
 * Options for real-time alert synchronization
 */
export interface RealtimeSyncOptions {
  /** Callback to refresh alerts from storage */
  onRefresh: () => void;

  /** Current student ID filter (undefined or 'all' for aggregate view) */
  studentId?: string;

  /** Optional callback for health check events */
  onHealthUpdate?: (snapshot: unknown) => void;
}

/**
 * Hook to handle real-time alert updates via browser events
 *
 * Listens to custom events dispatched by the alert system:
 * - `alerts:health` - Periodic health checks with system metrics
 * - `alerts:updated` - Triggered when alerts are added/modified
 *
 * When viewing a specific student, only refreshes on matching student IDs.
 * Tracks UI update performance for monitoring.
 *
 * @param options - Configuration object with refresh callback and filters
 *
 * @example
 * useAlertRealtimeSync({
 *   onRefresh: refresh,
 *   studentId: 'student-123', // Only refresh for this student
 * });
 *
 * @example
 * // Listen to all updates (aggregate view)
 * useAlertRealtimeSync({
 *   onRefresh: refresh,
 *   studentId: 'all',
 * });
 */
export function useAlertRealtimeSync(options: RealtimeSyncOptions): void {
  const { onRefresh, studentId, onHealthUpdate } = options;

  useEffect(() => {
    // SSR safety
    if (typeof window === 'undefined') {
      return undefined;
    }

    /**
     * Handle health check events
     * These are periodic snapshots of alert system health
     */
    const handleHealth = (evt: Event) => {
      try {
        const detail = (evt as CustomEvent).detail as any;
        if (detail?.snapshot && onHealthUpdate) {
          onHealthUpdate(detail.snapshot);
        }
      } catch {
        // Silently ignore malformed health events
      }
    };

    /**
     * Handle alert update events
     * These signal that alerts have been added or modified
     */
    const handleUpdate = (evt: Event) => {
      try {
        const detail = (evt as CustomEvent).detail;
        const eventStudentId = detail?.studentId as string | undefined;

        // Filter by student ID if viewing a specific student
        if (studentId && studentId !== 'all' && eventStudentId && eventStudentId !== studentId) {
          return; // Ignore updates for other students
        }

        // Track UI update performance
        const stopTimer = alertPerf.startTimer();
        onRefresh();
        alertPerf.recordUiUpdate(stopTimer());
      } catch {
        // Fallback: refresh without tracking on error
        onRefresh();
      }
    };

    // Register event listeners
    window.addEventListener('alerts:health', handleHealth as EventListener);
    window.addEventListener('alerts:updated', handleUpdate as EventListener);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('alerts:health', handleHealth as EventListener);
      window.removeEventListener('alerts:updated', handleUpdate as EventListener);
    };
  }, [onRefresh, studentId, onHealthUpdate]);
}
