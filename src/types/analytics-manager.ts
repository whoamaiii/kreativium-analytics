// src/types/analytics-manager.ts
// Shared types for the thin analytics manager orchestrator
// - No default exports
// - Explicit types only

import type { AnalyticsConfiguration } from '@/lib/analyticsConfig';
import type { AnalyticsData, AnalyticsResults } from '@/types/analytics';

// Public options accepted by analytics orchestrator helpers
export interface InsightsOptions {
  // Optional cache TTL (ms); defaults to analyticsConfig.getConfig().cache.ttl
  ttl?: number;
  // Optional cache tags to help targeted invalidation
  tags?: string[];
  // Optional configuration override; defaults to analyticsConfig.getConfig()
  configOverride?: AnalyticsConfiguration;
  // Optional semantic version for cache key invalidation across algorithm changes
  version?: string;
  // Optional date range to include in cache key
  dateRange?: { from?: Date; to?: Date };
  // Optional cohort id for scoping analytics
  cohortId?: string;
  // Optional feature toggles influencing computation
  toggles?: Record<string, boolean>;
}

// Public alias to keep consumer imports stable and centralized
export type AnalyticsResult = AnalyticsResults;

// Task description for useAnalyticsWorker consumers
export interface AnalyticsWorkerTask {
  key: string; // cache key
  ttl: number; // milliseconds
  tags?: string[];
  data: AnalyticsData; // payload sent to worker
}
