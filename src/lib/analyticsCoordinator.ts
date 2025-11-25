/**
 * AnalyticsWorkerCoordinator
 * Centralizes cross-cutting coordination concerns:
 * - Broadcasting cache clear events to workers/hooks
 * - (Future) Posting tasks to analytics web workers
 */
export class AnalyticsWorkerCoordinator {
  static broadcastCacheClear(studentId?: string): void {
    try {
      if (typeof window === 'undefined') return;
      if (studentId) {
        window.dispatchEvent(
          new CustomEvent('analytics:cache:clear:student', { detail: { studentId } }),
        );
      } else {
        window.dispatchEvent(new Event('analytics:cache:clear'));
      }
    } catch {
      // No-op in non-browser environments
    }
  }
}

/**
 * Backwards-compatible coordinator instance used across the app.
 * Provides the same method signature expected by existing imports.
 */
export const analyticsCoordinator = {
  broadcastCacheClear: AnalyticsWorkerCoordinator.broadcastCacheClear,
};
