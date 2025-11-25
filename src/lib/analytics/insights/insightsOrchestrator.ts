/**
 * Insights Orchestrator Module
 *
 * Provides the main entry point for computing insights from tracking data.
 * This orchestrator handles cache key generation, task building, and insight computation
 * with graceful error handling and diagnostics.
 *
 * @module insightsOrchestrator
 */

import { computeInsights, type ComputeInsightsInputs } from '@/lib/insights/unified';
import { buildInsightsCacheKey, buildInsightsTask } from '@/lib/insights/task';
import { analyticsConfig, DEFAULT_ANALYTICS_CONFIG } from '@/lib/analyticsConfig';
import { logger } from '@/lib/logger';
import type { InsightsOptions, AnalyticsResult } from '@/types/insights';

/**
 * Compute insights and return a minimal, stable AnalyticsResult summary.
 *
 * This function does not perform internal caching; callers should use the cache key
 * and their caching layer of choice (e.g., useAnalyticsWorker + usePerformanceCache).
 *
 * @param {ComputeInsightsInputs} inputs - The tracking data to analyze (entries, emotions, sensory inputs, goals)
 * @param {InsightsOptions} [options] - Optional configuration for TTL, tags, and custom config
 * @returns {Promise<AnalyticsResult>} A stable result envelope with summary, diagnostics, and cache metadata
 *
 * @description
 * **Processing Pipeline**:
 * 1. Generates deterministic cache key from inputs and options
 * 2. Resolves TTL from options or runtime analytics config
 * 3. Computes detailed insights using unified insights engine
 * 4. Summarizes results to avoid large payload arrays
 * 5. Attaches diagnostics and cache metadata
 *
 * **Error Handling**:
 * - Fail-soft: Returns error envelope on failure
 * - Logs detailed error information
 * - Preserves cache key and metadata in error response
 *
 * **Result Summary**:
 * The summary contains counts for:
 * - Patterns identified
 * - Correlations found
 * - Environmental correlations
 * - Predictive insights
 * - Anomalies detected
 * - General insights
 * - Overall confidence score
 * - Minimum data threshold flag
 *
 * @example
 * ```typescript
 * const inputs = { entries, emotions, sensoryInputs, goals };
 * const result = await getInsights(inputs, {
 *   ttlSeconds: 600,
 *   tags: ["student-123"]
 * });
 *
 * logger.info(`Found ${result.summary.patternsCount} patterns`);
 * logger.info(`Cache key: ${result.cacheKey}`);
 * ```
 */
export async function getInsights(
  inputs: ComputeInsightsInputs,
  options?: InsightsOptions,
): Promise<AnalyticsResult> {
  try {
    // Generate cache key for this computation
    const cacheKey = buildInsightsCacheKey(inputs, options);

    // Resolve configuration and TTL
    const cfg =
      (() => {
        try {
          return analyticsConfig.getConfig();
        } catch {
          return DEFAULT_ANALYTICS_CONFIG;
        }
      })() || DEFAULT_ANALYTICS_CONFIG;

    const ttlMs = cfg?.cache?.ttl ?? DEFAULT_ANALYTICS_CONFIG.cache.ttl;
    const ttlSeconds =
      typeof options?.ttlSeconds === 'number'
        ? options.ttlSeconds
        : Math.max(1, Math.floor(ttlMs / 1000));

    // Normalize tags with defaults
    const tags = Array.from(new Set(['insights', 'v2', ...(options?.tags ?? [])]));

    // Build config for computation
    const fullCfg = options?.config ? { config: options.config as any } : { config: cfg as any };

    // Compute detailed insights
    const detailed = await computeInsights(inputs, fullCfg as any);

    // Summarize for stable payloads (avoid large arrays in summary field)
    const summary = {
      patternsCount: detailed.patterns?.length ?? 0,
      correlationsCount: detailed.correlations?.length ?? 0,
      environmentalCorrelationsCount: detailed.environmentalCorrelations?.length ?? 0,
      predictiveInsightsCount: detailed.predictiveInsights?.length ?? 0,
      anomaliesCount: detailed.anomalies?.length ?? 0,
      insightsCount: detailed.insights?.length ?? 0,
      confidence: (detailed as any).confidence,
      hasMinimumData: (detailed as any).hasMinimumData,
    } as Record<string, unknown>;

    // Build result envelope with metadata
    return {
      cacheKey,
      computedAt: new Date().toISOString(),
      ttlSeconds,
      tags,
      summary,
      diagnostics: {
        entries: inputs.entries?.length ?? 0,
        emotions: inputs.emotions?.length ?? 0,
        sensoryInputs: inputs.sensoryInputs?.length ?? 0,
        goals: inputs.goals?.length ?? 0,
      },
    };
  } catch (error) {
    // Fail-soft error handling
    logger.error('[insights.orchestrator] getInsights failed', { error });

    const cacheKey = buildInsightsCacheKey(inputs, options);
    const ttlSeconds = typeof options?.ttlSeconds === 'number' ? options.ttlSeconds : 300;
    const tags = Array.from(new Set(['insights', 'v2', ...(options?.tags ?? [])]));

    return {
      cacheKey,
      computedAt: new Date().toISOString(),
      ttlSeconds,
      tags,
      summary: { error: 'INSIGHTS_COMPUTE_FAILED' },
    };
  }
}

// Re-export helper functions for convenience
export { buildInsightsCacheKey, buildInsightsTask };
