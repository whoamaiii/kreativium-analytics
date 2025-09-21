// src/lib/insights/task.ts
// Builder for Insights worker tasks used by useAnalyticsWorker and other callers.
// - Produces a minimal, typed envelope
// - Generates a stable cache key using central cache-key utilities
// - Resolves TTL from runtime analyticsConfig with safe fallbacks

import type { AnalyticsWorkerTask, AnalyticsConfiguration } from '@/types/analytics';
import type { InsightsOptions } from '@/types/insights';
import type { ComputeInsightsInputs } from '@/lib/insights/unified';
import { analyticsConfig, DEFAULT_ANALYTICS_CONFIG } from '@/lib/analyticsConfig';
import { createCacheKey } from '@/lib/analytics/cache-key';

// Narrow config subset to avoid sending the full config blob to workers
export type InsightsConfigSubset = Pick<
  AnalyticsConfiguration,
  'insights' | 'confidence' | 'analytics' | 'timeWindows'
>;

function pickConfigSubset(cfg: AnalyticsConfiguration | null | undefined): InsightsConfigSubset {
  const base = cfg ?? DEFAULT_ANALYTICS_CONFIG;
  const { insights, confidence, analytics, timeWindows } = base;
  return { insights, confidence, analytics, timeWindows };
}

/**
 * Build a deterministic cache key for Insights computations.
 * Keeps payload minimal by hashing structural summaries rather than raw arrays.
 */
export function buildInsightsCacheKey(inputs: ComputeInsightsInputs, options?: InsightsOptions): string {
  const { entries, emotions, sensoryInputs, goals } = inputs;
  const cfgSubset = pickConfigSubset(options?.config as unknown as AnalyticsConfiguration | undefined);

  // Summarize inputs to keep the key stable and compact
  const summary = {
    counts: {
      entries: entries?.length ?? 0,
      emotions: emotions?.length ?? 0,
      sensory: sensoryInputs?.length ?? 0,
      goals: goals?.length ?? 0,
    },
    latestTimestamps: {
      entries: entries && entries.length ? new Date(Math.max(...entries.map(e => new Date(e.timestamp).getTime()))).toISOString() : null,
      emotions: emotions && emotions.length ? new Date(Math.max(...emotions.map(e => new Date(e.timestamp).getTime()))).toISOString() : null,
      sensory: sensoryInputs && sensoryInputs.length ? new Date(Math.max(...sensoryInputs.map(s => new Date(s.timestamp).getTime()))).toISOString() : null,
    },
    // Include a minimal subset of config that affects computation semantics
    config: cfgSubset,
    // Allow caller to bias cache space via tags in options (not included directly; tags are attached on task)
  } as const;

  return createCacheKey({
    namespace: 'insights',
    input: summary,
    // If array order does not affect semantic result, normalize to reduce key churn
    normalizeArrayOrder: true,
  });
}

function resolveTtlSeconds(options?: InsightsOptions): number {
  if (typeof options?.ttlSeconds === 'number') return options.ttlSeconds;
  try {
    const cfg = analyticsConfig.getConfig();
    const ms = cfg?.cache?.ttl;
    if (typeof ms === 'number' && Number.isFinite(ms)) {
      return Math.max(1, Math.floor(ms / 1000));
    }
  } catch {
    // fall through to default
  }
  // Default to 5 minutes
  return 300;
}

export interface InsightsWorkerPayload {
  inputs: ComputeInsightsInputs;
  config?: InsightsConfigSubset; // minimal subset only
  prewarm?: boolean; // signal to worker/consumers this is a background precompute
}

export type InsightsWorkerTask = Omit<AnalyticsWorkerTask, 'type' | 'payload'> & {
  type: 'Insights/Compute';
  payload: InsightsWorkerPayload;
};

/**
 * Build a typed worker task envelope for Insights computation.
 * - type: "Insights/Compute"
 * - payload: { inputs, configSubsetIfNeeded }
 * - cacheKey: built via buildInsightsCacheKey(inputs, options)
 * - ttlSeconds: resolved from options or runtime config
 * - tags: ["insights", "v2", ...options.tags]
 */
export function buildInsightsTask(inputs: ComputeInsightsInputs, options?: InsightsOptions): InsightsWorkerTask {
  const cacheKey = buildInsightsCacheKey(inputs, options);
  const ttlSeconds = resolveTtlSeconds(options);
  const cfgSubset = options?.config ? pickConfigSubset(options.config as unknown as AnalyticsConfiguration) : undefined;

  const baseTags = ['insights', 'v2'];
  const tags = options?.tags && options.tags.length ? Array.from(new Set([...baseTags, ...options.tags])) : baseTags;

  return {
    type: 'Insights/Compute',
    payload: {
      inputs,
      config: cfgSubset,
      prewarm: options?.prewarm === true ? true : undefined,
    },
    cacheKey,
    ttlSeconds,
    tags,
  };
}
