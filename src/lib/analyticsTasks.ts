import { buildInsightsCacheKey, buildInsightsTask } from '@/lib/insights/task';
import type { ComputeInsightsInputs } from '@/lib/insights/unified';
import { analyticsConfig, DEFAULT_ANALYTICS_CONFIG } from '@/lib/analyticsConfig';
import type { InsightsOptions } from '@/types/insights';

export type TaskBuilderOptions = InsightsOptions;

export function createInsightsTask(inputs: ComputeInsightsInputs, options?: TaskBuilderOptions) {
  const cfg = (() => { try { return analyticsConfig.getConfig(); } catch { return DEFAULT_ANALYTICS_CONFIG; } })() || DEFAULT_ANALYTICS_CONFIG;
  const ttlMs = cfg?.cache?.ttl ?? DEFAULT_ANALYTICS_CONFIG.cache.ttl;
  const ttlSeconds = typeof options?.ttlSeconds === 'number' ? options.ttlSeconds : Math.max(1, Math.floor(ttlMs / 1000));
  const tags = Array.from(new Set(['insights', 'v2', ...(options?.tags ?? [])]));
  const task = buildInsightsTask(inputs, { ...options, ttlSeconds, tags });
  return task;
}

export function createInsightsCacheKey(inputs: ComputeInsightsInputs, options?: TaskBuilderOptions) {
  return buildInsightsCacheKey(inputs, options);
}

// Re-export types for convenience
export type { ComputeInsightsInputs } from '@/lib/insights/unified';

