/**
 * @file Analytics Hooks Index
 *
 * Re-exports all analytics-related hooks for convenient imports.
 *
 * Primary hook: useAnalyticsOrchestrator (or useAnalyticsWorker for backward compat)
 * Sub-hooks: Individual focused hooks for specific functionality
 */

// Main orchestrator hook (primary export)
export { useAnalyticsOrchestrator } from './useAnalyticsOrchestrator';
export type {
  UseAnalyticsOrchestratorOptions,
  UseAnalyticsOrchestratorReturn,
} from './useAnalyticsOrchestrator';

// Sub-hooks for granular usage
export { useWorkerLifecycle } from './useWorkerLifecycle';
export type { UseWorkerLifecycleOptions, UseWorkerLifecycleReturn } from './useWorkerLifecycle';

export { useAlertsHealth } from './useAlertsHealth';
export type { UseAlertsHealthOptions, UseAlertsHealthReturn } from './useAlertsHealth';

export { useCacheTags } from './useCacheTags';
export type { UseCacheTagsOptions, UseCacheTagsReturn } from './useCacheTags';

export { useCacheEvents } from './useCacheEvents';
export type { UseCacheEventsOptions } from './useCacheEvents';

export { usePrecomputation } from './usePrecomputation';
export type {
  UsePrecomputationOptions,
  UsePrecomputationReturn,
  PrecomputeStatus,
} from './usePrecomputation';

// Backward compatibility alias
export { useAnalyticsOrchestrator as useAnalyticsWorker } from './useAnalyticsOrchestrator';
