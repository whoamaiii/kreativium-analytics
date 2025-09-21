## Analytics Cache Architecture

This document defines the single source of truth for analytics caching and invalidation across the app.

### Layers

- Primary (UI) cache: `useAnalyticsWorker` + `usePerformanceCache`
  - LRU + TTL + tagging
  - React-friendly; exposes `clearCache()` and `invalidateCacheForStudent(studentId)`
  - Listens to global invalidation events via `analyticsCoordinator`

- Worker cache: internal caches inside `analytics.worker.ts`
  - Responds to cache-control messages (e.g., `CACHE/CLEAR_ALL`, `CACHE/CLEAR_STUDENT`)
  - Optimizes repeat computations in the worker

- Deprecated: Manager TTL cache (`analyticsManager.analyticsCache`)
  - Marked deprecated; warnings added
  - Can be disabled via `VITE_DISABLE_MANAGER_TTL_CACHE=true` or `analyticsConfig.cache.disableManagerTTLCache`

### Invalidation Flow

All data mutations must broadcast an invalidation event:

- Call `analyticsCoordinator.broadcastCacheClear(studentId?)` after successful mutations.
- The following now do this by design:
  - `saveTrackingEntry` unified helper (`src/lib/tracking/saveTrackingEntry.ts`)
  - `dataStorage.saveTrackingEntry` (direct path, legacy/tests/mocks)
  - Realtime inserts in `useRealtimeData` (debounced)

Listeners:

- `useAnalyticsWorker` subscribes to `analytics:cache:clear` and `analytics:cache:clear:student` and clears or invalidates by tag.
- The worker listens for cache-control commands and clears its own caches.

### Responsibilities

- UI components: use `useAnalyticsWorker` for analysis and cached results.
- Manager (`analyticsManager`): orchestration, profiles, and analytics triggering; avoid storing TTL-cached results. The TTL cache is deprecated.
- Storage (`dataStorage`): persist data and broadcast invalidation on write.
- Coordinator (`analyticsCoordinator`): centralized broadcast of invalidation events.

### Migration Path

1. Prefer `useAnalyticsWorker` for fetching analytics; do not rely on `analyticsManager` TTL cache.
2. Disable manager TTL cache in non-prod via `VITE_DISABLE_MANAGER_TTL_CACHE=true` to validate flows.
3. Ensure any new mutators call `analyticsCoordinator.broadcastCacheClear()`.

### Best Practices

- Tag cache entries with `student-${id}` and relevant dimensions.
- Invalidate by tag for targeted refreshes; clear all sparingly.
- Debounce invalidation from high-frequency sources (e.g., realtime streams).

### Common Pitfalls

- Writing directly via storage without broadcasting: fixed by broadcasting in `dataStorage.saveTrackingEntry`.
- Multiple cache layers diverging: treat `useAnalyticsWorker` + worker as the single source of truth.


