/**
 * @file useAnalyticsOrchestrator.ts
 *
 * Main orchestrator hook that combines all analytics sub-hooks.
 * This is the primary hook consumers should use for analytics functionality.
 *
 * Integration overview: Detection Engine -> Analytics Worker -> UI
 *
 * - Detection engine runs in a Web Worker (analytics.worker) and emits messages:
 *   - type "partial" for mid-computation updates
 *   - type "complete" for final analytics results
 *   - type "alerts" for new alert events discovered by detection engine
 *   - type "error" for recoverable errors
 *   - type "progress" as a lightweight heartbeat
 *
 * - This hook manages the worker lifecycle, caches analytics, and bridges alert
 *   events to the UI via a custom DOM event `alerts:updated` so any surface can
 *   react to new alerts in real time without tight coupling.
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import { usePerformanceCache } from '../usePerformanceCache';
import { analyticsConfig } from '@/lib/analyticsConfig';
import { validateAnalyticsRuntimeConfig } from '@/lib/analyticsConfigValidation';
import { createRunAnalysis } from '@/lib/analytics/runAnalysisTask';
import {
  buildInsightsTask,
  analyticsManager,
  buildInsightsCacheKey,
} from '@/lib/analyticsManager';
import { analyticsWorkerFallback } from '@/lib/analyticsWorkerFallback';
import { getValidatedConfig } from '@/lib/analyticsConfigValidation';
import {
  getWorkerInstance,
  isCircuitOpen,
  isWorkerReady,
  queuePendingTask,
} from '@/lib/analytics/workerManager';
import { DISABLE_ANALYTICS_WORKER } from '@/lib/env';
import { logger } from '@/lib/logger';
import { diagnostics } from '@/lib/diagnostics';
import { legacyAnalyticsAdapter } from '@/lib/adapters/legacyAnalyticsAdapter';
import { ANALYTICS_CACHE_TTL_MS } from '@/constants/analytics';

import { useWorkerLifecycle } from './useWorkerLifecycle';
import { useAlertsHealth } from './useAlertsHealth';
import { useCacheTags } from './useCacheTags';
import { useCacheEvents } from './useCacheEvents';
import { usePrecomputation } from './usePrecomputation';

import type { AnalyticsData, AnalyticsResults } from '@/types/analytics';
import type { AnalyticsResultsAI } from '@/lib/analysis';
import type { Student, Goal } from '@/types/student';

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  invalidations: number;
  hitRate: number;
  size: number;
  memoryUsage?: number;
}

export interface UseAnalyticsOrchestratorOptions {
  cacheTTL?: number;
  enableCacheStats?: boolean;
  precomputeOnIdle?: boolean;
  extractTagsFromData?: (data: AnalyticsData | AnalyticsResults) => string[];
}

export interface UseAnalyticsOrchestratorReturn {
  results: AnalyticsResultsAI | null;
  isAnalyzing: boolean;
  error: string | null;
  runAnalysis: (
    data: AnalyticsData,
    options?: { useAI?: boolean; student?: Student; prewarm?: boolean },
  ) => Promise<void>;
  precomputeCommonAnalytics: (
    dataProvider: () => AnalyticsData[],
    options?: { student?: Student },
  ) => void;
  invalidateCacheForStudent: (studentId: string) => void;
  clearCache: () => void;
  cacheStats: CacheStats | null;
  cacheSize: number;
  precomputeEnabled?: boolean;
  precomputeStatus?: {
    enabled: boolean;
    queueSize: number;
    isProcessing: boolean;
    processedCount: number;
  } | null;
  startPrecomputation?: () => void;
  stopPrecomputation?: () => void;
}

/**
 * Main analytics orchestrator hook.
 *
 * Combines:
 * - Worker lifecycle management
 * - Cache management with TTL
 * - Alerts health monitoring
 * - Precomputation scheduling
 * - Cache event subscriptions
 */
export function useAnalyticsOrchestrator(
  options: UseAnalyticsOrchestratorOptions = {},
): UseAnalyticsOrchestratorReturn {
  // Resolve defaults from runtime analyticsConfig with safe fallbacks
  const liveCfgRaw = (() => {
    try {
      return analyticsConfig.getConfig();
    } catch {
      return null;
    }
  })();
  const { config: liveCfg } = validateAnalyticsRuntimeConfig(liveCfgRaw ?? undefined);

  const resolvedTtl =
    typeof options.cacheTTL === 'number'
      ? options.cacheTTL
      : (liveCfg?.cache?.ttl ?? ANALYTICS_CACHE_TTL_MS);

  const { cacheTTL = resolvedTtl, enableCacheStats = false } = options;

  // Core state
  const [results, setResults] = useState<AnalyticsResultsAI | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for cache management
  const activeCacheKeyRef = useRef<string | null>(null);
  const cacheTagsRef = useRef<Map<string, string[]>>(new Map());
  const lastAlertsReceivedAtRef = useRef<number>(0);

  // Initialize performance cache
  const cache = usePerformanceCache<AnalyticsResults>({
    maxSize: liveCfg?.cache?.maxSize ?? 50,
    ttl: cacheTTL,
    enableStats: enableCacheStats,
    versioning: true,
  });

  // Cache tagging utilities
  const { createCacheKey, buildCacheTags } = useCacheTags({
    extractTagsFromData: options.extractTagsFromData,
  });

  // Worker lifecycle management
  const { workerRef, watchdogRef, isReady, cleanupFns, setWorkerReady } = useWorkerLifecycle({
    handlerDeps: {
      cache,
      cacheTagsRef,
      activeCacheKeyRef,
      buildCacheTags,
      setResults,
      setError,
      setIsAnalyzing,
      lastAlertsReceivedAtRef,
    },
  });

  // Alerts health monitoring
  useAlertsHealth({
    lastAlertsReceivedAtRef,
  });

  // Cache operations
  const invalidateCacheForStudent = useCallback(
    (studentId: string) => {
      cache.invalidateByTag(`student-${studentId}`);
    },
    [cache],
  );

  const clearCache = useCallback(() => {
    cache.clear();
  }, [cache]);

  // Create runAnalysis function
  const runAnalysis = useMemo(
    () =>
      createRunAnalysis({
        cache,
        cacheTagsRef,
        activeCacheKeyRef,
        workerRef,
        watchdogRef,
        setResults,
        setError,
        setIsAnalyzing,
        createCacheKey,
        buildCacheTags,
        getGoalsForStudent: (studentId: string) => {
          try {
            return legacyAnalyticsAdapter.listGoalsForStudent(studentId) ?? [];
          } catch {
            return [];
          }
        },
        analyticsManager,
        analyticsWorkerFallback,
        getValidatedConfig,
        buildInsightsTask,
        queuePendingTask,
        getWorkerInstance,
        isWorkerReady,
        isCircuitOpen,
        workerDisabled: DISABLE_ANALYTICS_WORKER,
        logger,
        diagnostics,
      }),
    [cache, buildCacheTags, createCacheKey, workerRef, watchdogRef],
  );

  // Precomputation management
  const precomputation = usePrecomputation({
    precomputationConfig: liveCfg?.precomputation,
    workerReady: isReady,
    runAnalysis,
  });

  // Cache events subscription
  useCacheEvents({
    clearCache,
    invalidateCacheForStudent,
    cleanupFns,
    onPrecomputationConfigChange: (enabled) => {
      if (enabled) {
        precomputation.startPrecomputation();
      } else {
        precomputation.stopPrecomputation();
      }
      precomputation.updateStatus();
    },
  });

  // Get cache stats
  const getCacheStats = useCallback(() => {
    return cache.stats;
  }, [cache]);

  return {
    results,
    isAnalyzing,
    error,
    runAnalysis,
    precomputeCommonAnalytics: precomputation.precomputeCommonAnalytics,
    invalidateCacheForStudent,
    clearCache,
    cacheStats: getCacheStats(),
    cacheSize: cache.size,
    precomputeEnabled: precomputation.precomputeEnabled,
    precomputeStatus: precomputation.precomputeStatus,
    startPrecomputation: precomputation.startPrecomputation,
    stopPrecomputation: precomputation.stopPrecomputation,
  };
}
