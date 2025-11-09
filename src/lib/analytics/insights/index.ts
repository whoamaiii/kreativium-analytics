/**
 * Insights Module
 *
 * Centralized module for insights computation and orchestration.
 * Provides the main entry point for computing insights from tracking data,
 * along with helper functions for cache key generation and task building.
 *
 * @module insights
 */

export {
  getInsights,
  buildInsightsCacheKey,
  buildInsightsTask,
} from './insightsOrchestrator';

// Re-export types for convenience
export type { InsightsOptions, AnalyticsResult } from '@/types/insights';
export type { ComputeInsightsInputs } from '@/lib/insights/unified';
export type { InsightsWorkerTask, InsightsWorkerPayload } from '@/lib/insights/task';
