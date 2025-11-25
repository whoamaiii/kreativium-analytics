/**
 * @file useAnalyticsWorker.ts
 *
 * Re-exports from the split analytics hooks for backward compatibility.
 *
 * The original 726-line hook has been split into focused sub-hooks:
 * - useWorkerLifecycle: Worker initialization, ready state, cleanup
 * - useAlertsHealth: Health monitoring for alerts integration
 * - useCacheTags: Cache key generation and tag building
 * - useCacheEvents: Cache event subscriptions
 * - usePrecomputation: Precomputation scheduling and management
 * - useAnalyticsOrchestrator: Main orchestrator combining all sub-hooks
 *
 * Import from '@/hooks/analytics' for granular access to individual hooks.
 */

// Re-export the main orchestrator as useAnalyticsWorker for backward compat
export { useAnalyticsOrchestrator as useAnalyticsWorker } from './analytics';
export type {
  UseAnalyticsOrchestratorOptions as CachedAnalyticsWorkerOptions,
  UseAnalyticsOrchestratorReturn as UseAnalyticsWorkerReturn,
} from './analytics';

// Also export the orchestrator under its proper name
export { useAnalyticsOrchestrator } from './analytics';
