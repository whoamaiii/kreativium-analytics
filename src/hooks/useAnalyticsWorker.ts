// Cache key computation is centralized via buildInsightsCacheKey

/**
 * @file src/hooks/useAnalyticsWorker.ts
 *
 * Integration overview: Detection Engine → Analytics Worker → UI
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
 *
 * - Alert governance and deduplication are applied before persisting and notifying,
 *   ensuring stable user experience across rapid incoming events.
 *
 * Performance & health:
 * - Latency metrics are recorded for alert processing, sparkline generation and
 *   UI updates (see src/lib/alerts/performance.ts).
 * - A periodic health check publishes `alerts:health` with simple status when
 *   no alert activity has been observed recently, enabling light-touch monitoring.
 *
 * Troubleshooting (summary):
 * - If worker initialization fails: a circuit breaker opens briefly and a
 *   fallback path computes analytics synchronously to keep UI responsive.
 * - If alerts messages arrive without studentId, they are ignored and a warning
 *   is logged.
 * - If the worker becomes unresponsive, a watchdog triggers fallback processing
 *   and resets the worker reference.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AnalyticsData, AnalyticsResults, AnalyticsWorkerMessage } from '@/types/analytics';
import { usePerformanceCache } from './usePerformanceCache';
import { analyticsConfig } from '@/lib/analyticsConfig';
import {
  getValidatedConfig,
  validateAnalyticsRuntimeConfig,
} from '@/lib/analyticsConfigValidation';
import { buildInsightsCacheKey, buildInsightsTask } from '@/lib/analyticsManager';
import { logger } from '@/lib/logger';
import { toast } from '@/hooks/use-toast';
import { diagnostics } from '@/lib/diagnostics';
import { analyticsWorkerFallback } from '@/lib/analyticsWorkerFallback';
import { POC_MODE, DISABLE_ANALYTICS_WORKER } from '@/lib/env';
import type { Student, Goal, EmotionEntry, SensoryEntry } from '@/types/student';
import type { AnalyticsResultsAI } from '@/lib/analysis';
import { analyticsManager } from '@/lib/analyticsManager';
import { AnalyticsPrecomputationManager } from '@/lib/analyticsPrecomputation';
import { deviceConstraints } from '@/lib/deviceConstraints';
import { AlertPolicies } from '@/lib/alerts/policies';
import { AlertTelemetryService } from '@/lib/alerts/telemetry';
import { alertPerf } from '@/lib/alerts/performance';
import { createRunAnalysis } from '@/lib/analytics/runAnalysisTask';
import { ANALYTICS_CACHE_TTL_MS } from '@/constants/analytics';
import {
  ALERTS_HEALTH_EVENT,
  ensureWorkerInitialized,
  getWorkerInstance,
  isCircuitOpen,
  isWorkerReady,
  markWorkerReady,
  queuePendingTask,
  releaseWorker,
  retainWorker,
} from '@/lib/analytics/workerManager';
import { createWorkerMessageHandlers } from '@/lib/analytics/workerMessageHandlers';
import { legacyAnalyticsAdapter } from '@/lib/adapters/legacyAnalyticsAdapter';
import type { ComputeInsightsInputs } from '@/lib/insights/unified';

// Shared once-per-key dedupe for user-facing notifications
import { doOnce } from '@/lib/rateLimit';

const telemetryService = new AlertTelemetryService();

const hasAnalyticsEntries = (
  payload: AnalyticsData | AnalyticsResults,
): payload is AnalyticsData => {
  return typeof payload === 'object' && payload !== null && 'entries' in payload;
};

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

interface CachedAnalyticsWorkerOptions {
  cacheTTL?: number;
  enableCacheStats?: boolean;
  precomputeOnIdle?: boolean;
  // Optional injection for tests or advanced cache control
  extractTagsFromData?: (data: AnalyticsData | AnalyticsResults) => string[];
}

interface UseAnalyticsWorkerReturn {
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
  // Optional precomputation status/controls
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
 * @hook useAnalyticsWorker
 *
 * A custom hook to manage the analytics web worker with integrated caching.
 *
 * @param options Configuration options for caching and precomputation
 * @returns {object} An object containing:
 *  - `results`: The latest analysis results received from the worker or cache.
 *  - `isAnalyzing`: A boolean flag indicating if an analysis is currently in progress.
 *  - `error`: Any error message returned from the worker.
 *  - `runAnalysis`: A function to trigger a new analysis by posting data to the worker.
 *  - `cacheStats`: Performance statistics about cache usage (if enabled).
 *  - `clearCache`: Function to clear the analytics cache.
 *  - `invalidateCache`: Function to invalidate cache entries by tag or pattern.
 */
export const useAnalyticsWorker = (
  options: CachedAnalyticsWorkerOptions = {},
): UseAnalyticsWorkerReturn => {
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
  const { cacheTTL = resolvedTtl, enableCacheStats = false, precomputeOnIdle = false } = options;

  const workerRef = useRef<Worker | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [results, setResults] = useState<AnalyticsResultsAI | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idleCallbackRef = useRef<number | null>(null);
  const [workerReady, setWorkerReady] = useState<boolean>(false);
  const activeCacheKeyRef = useRef<string | null>(null);
  const cacheTagsRef = useRef<Map<string, string[]>>(new Map());
  const alertPoliciesRef = useRef(new AlertPolicies());
  const precompManagerRef = useRef<AnalyticsPrecomputationManager | null>(null);
  const [precomputeStatus, setPrecomputeStatus] = useState<{
    enabled: boolean;
    queueSize: number;
    isProcessing: boolean;
    processedCount: number;
  } | null>(null);
  const lastAlertsReceivedAtRef = useRef<number>(0);
  const alertsHealthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cleanupStackRef = useRef<Array<() => void>>([]);

  // Initialize performance cache with appropriate settings
  const cache = usePerformanceCache<AnalyticsResults>({
    maxSize: liveCfg?.cache?.maxSize ?? 50, // Use runtime config; fallback to 50
    ttl: cacheTTL,
    enableStats: enableCacheStats,
    versioning: true, // Enable versioning to invalidate on data structure changes
  });

  /**
   * Extracts tags from analytics data for cache invalidation
   * Allow override via options for testing
   */
  const defaultExtractTagsFromData = useCallback(
    (data: AnalyticsData | AnalyticsResults): string[] => {
      const tags: string[] = ['analytics'];

      // Add student-specific tags if available
      if (hasAnalyticsEntries(data) && data.entries.length > 0) {
        const studentIds = Array.from(new Set(data.entries.map((entry) => entry.studentId)));
        tags.push(...studentIds.map((id) => `student-${id}`));
      }

      // Add date-based tags for time-sensitive invalidation
      const now = new Date();
      tags.push(`analytics-${now.getFullYear()}-${now.getMonth() + 1}`);

      return tags;
    },
    [],
  );
  const extractTagsFn = options.extractTagsFromData ?? defaultExtractTagsFromData;

  const buildCacheTags = useCallback(
    ({
      data,
      goals,
      studentId,
      includeAiTag,
    }: {
      data: AnalyticsData | AnalyticsResults;
      goals?: Goal[];
      studentId?: string | number;
      includeAiTag?: boolean;
    }): string[] => {
      const tagsFromData = extractTagsFn({ ...data, ...(goals ? { goals } : {}) }) ?? [];
      const tagSet = new Set<string>(tagsFromData);

      (goals ?? []).forEach((goal) => {
        const goalId = goal.id;
        if (goalId) tagSet.add(`goal-${goalId}`);
        const goalStudentId = goal.studentId;
        if (goalStudentId) tagSet.add(`student-${goalStudentId}`);
      });

      if (studentId !== undefined && studentId !== null) {
        tagSet.add(`student-${studentId}`);
      }

      if (includeAiTag) {
        tagSet.add('ai');
      }

      return Array.from(tagSet);
    },
    [extractTagsFn],
  );

  useEffect(() => {
    let isMounted = true; // Race condition guard

    const init = async () => {
      if (POC_MODE || DISABLE_ANALYTICS_WORKER) {
        workerRef.current = null;
        setWorkerReady(false);
        // Inform user once per minute if worker is disabled via flag
        if (DISABLE_ANALYTICS_WORKER) {
          doOnce('analytics_worker_disabled', 60_000, () => {
            try {
              import('@/hooks/useTranslation')
                .then(({ useTranslation }) => {
                  const { t } = useTranslation('analytics');
                  toast({
                    title: t('worker.disabledTitle'),
                    description: t('worker.disabledDescription'),
                  });
                })
                .catch(() => {
                  toast({
                    title: 'Analytics worker disabled',
                    description: 'Running analytics without a background worker (debug mode).',
                  });
                });
            } catch {
              toast({
                title: 'Analytics worker disabled',
                description: 'Running analytics without a background worker (debug mode).',
              });
            }
          });
        }
        return;
      }
      if (isCircuitOpen()) {
        workerRef.current = null;
        setWorkerReady(false);
        return;
      }
      retainWorker();
      const worker = await ensureWorkerInitialized();
      if (!isMounted) {
        releaseWorker();
        return;
      }
      workerRef.current = worker;
      setWorkerReady(isWorkerReady() && !!worker);

      // Attach per-hook message listener to consume results
      if (worker) {
        const { onMessage, onMessageError } = createWorkerMessageHandlers({
          cache,
          cacheTagsRef,
          activeCacheKeyRef,
          buildCacheTags: ({ data, goals, studentId, includeAiTag }) =>
            buildCacheTags({
              data: data as AnalyticsResults,
              goals: goals as Goal[] | undefined,
              studentId,
              includeAiTag,
            }),
          setResults,
          setError,
          setIsAnalyzing,
          alertPolicies: alertPoliciesRef.current,
          telemetryService,
          lastAlertsReceivedAtRef,
          setWorkerReady,
          markWorkerReady,
          isWorkerReady,
          watchdogRef,
        });

        worker.addEventListener('message', onMessage as EventListener);
        worker.addEventListener('messageerror', onMessageError as EventListener);

        // Expose worker globally for lightweight event streaming from game UI
        try {
          (window as unknown as { __analyticsWorker?: Worker }).__analyticsWorker = worker;
        } catch (e) {
          // @silent-ok: global assignment may fail in restricted contexts (iframes, extensions)
          logger.debug('[useAnalyticsWorker] Could not expose worker globally', { error: e });
        }

        cleanupStackRef.current.push(() => {
          try {
            (window as unknown as { __analyticsWorker?: Worker | null }).__analyticsWorker = null;
          } catch (e) {
            logger.debug('[useAnalyticsWorker] Could not clear global worker reference', { error: e });
          }
          try {
            worker.removeEventListener('message', onMessage as EventListener);
            worker.removeEventListener('messageerror', onMessageError as EventListener);
          } catch (e) {
            logger.warn('[useAnalyticsWorker] Failed to remove worker event listeners', { error: e });
          }
        });
      }
    };

    init();

    return () => {
      isMounted = false;
      // Local cleanup only; worker manager handles actual termination when refs reach 0
      if (idleCallbackRef.current) {
        cancelIdleCallback(idleCallbackRef.current);
        idleCallbackRef.current = null;
      }
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
      // Run any per-hook cleanup fns (like removing event listeners)
      while (cleanupStackRef.current.length) {
        try {
          (cleanupStackRef.current.pop() as () => void)();
        } catch (e) {
          logger.warn('[useAnalyticsWorker] Cleanup function failed', { error: e });
        }
      }
      if (alertsHealthTimerRef.current) {
        clearInterval(alertsHealthTimerRef.current);
        alertsHealthTimerRef.current = null;
      }
      releaseWorker();
    };
    // Stable on mount; do not re-init on cache identity churn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic alerts integration health publication (lightweight)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      if (alertsHealthTimerRef.current) {
        clearInterval(alertsHealthTimerRef.current);
        alertsHealthTimerRef.current = null;
      }
      alertsHealthTimerRef.current = setInterval(() => {
        const now = Date.now();
        const last = lastAlertsReceivedAtRef.current;
        const msSince = last ? now - last : Number.POSITIVE_INFINITY;
        const healthy = Number.isFinite(msSince) ? msSince < 120_000 : false; // consider stale if > 2 minutes
        try {
          window.dispatchEvent(
            new CustomEvent(ALERTS_HEALTH_EVENT, {
              detail: {
                healthy,
                msSinceLastAlert: Number.isFinite(msSince) ? msSince : null,
                snapshot: (() => {
                  try {
                    return alertPerf.snapshot();
                  } catch (e) {
                    logger.debug('[useAnalyticsWorker] Failed to get alertPerf snapshot', { error: e });
                    return null;
                  }
                })(),
              },
            }),
          );
        } catch (e) {
          logger.debug('[useAnalyticsWorker] Failed to dispatch health event', { error: e });
        }
      }, 30_000);
    } catch (e) {
      logger.warn('[useAnalyticsWorker] Failed to set up health timer', { error: e });
    }
    return () => {
      if (alertsHealthTimerRef.current) {
        clearInterval(alertsHealthTimerRef.current);
        alertsHealthTimerRef.current = null;
      }
    };
  }, []);

  /**
   * Creates a cache key based on the analytics data using centralized helper
   */
  const createCacheKey = useCallback((data: AnalyticsData, goals?: Goal[]): string => {
    // Map AnalyticsData to ComputeInsightsInputs structure expected by cache key builder
    const inputs: ComputeInsightsInputs = {
      entries: data.entries,
      emotions: data.emotions,
      sensoryInputs: data.sensoryInputs,
      ...(goals && goals.length ? { goals } : {}),
    };

    // Use live runtime config to ensure keys align across app and worker
    const cfg = getValidatedConfig();

    return buildInsightsCacheKey(inputs, { config: cfg });
  }, []);

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
    [cache, buildCacheTags, createCacheKey],
  );

  /**
   * Pre-compute analytics for common queries during idle time.
   * Note: When a student is provided, their goals are fetched and included to align with on-demand analytics.
   */
  const precomputeCommonAnalytics = useCallback(
    (dataProvider: () => AnalyticsData[], options?: { student?: Student }) => {
      const pc = liveCfg?.precomputation;
      if (!pc || !pc.enabled) return;

      const schedule = async () => {
        try {
          const allowed = await deviceConstraints.canPrecompute(pc);
          if (!allowed) return;
        } catch (e) {
          logger.debug('[useAnalyticsWorker] Device constraint check failed, proceeding anyway', { error: e });
        }

        const dataSets = dataProvider();
        const student = options?.student;
        dataSets.forEach((data, index) => {
          setTimeout(
            () => {
              // Route through runAnalysis to ensure caching and goal inclusion; mark as prewarm
              runAnalysis(data, { student, prewarm: true }).catch((e) => {
                logger.debug('[useAnalyticsWorker] Precomputation failed (non-fatal)', { 
                  error: e, 
                  studentId: student?.id,
                  dataSize: data.entries?.length 
                });
              });
            },
            index * (pc.taskStaggerDelay ?? 100),
          );
        });
      };

      if (pc.precomputeOnlyWhenIdle && 'requestIdleCallback' in window) {
        idleCallbackRef.current = requestIdleCallback(
          () => {
            schedule();
          },
          { timeout: pc.idleTimeout ?? 5000 },
        );
      } else {
        setTimeout(schedule, pc.idleTimeout ?? 1000);
      }
    },
    [liveCfg, runAnalysis],
  );

  /**
   * Invalidate cache entries for a specific student
   */
  const invalidateCacheForStudent = useCallback(
    (studentId: string) => {
      cache.invalidateByTag(`student-${studentId}`);
    },
    [cache],
  );

  /**
   * Invalidate all analytics cache entries
   */
  const clearCache = useCallback(() => {
    cache.clear();
  }, [cache]);

  /**
   * Subscribe to configuration changes to invalidate cache
   */
  useEffect(() => {
    const unsubscribe = analyticsConfig.subscribe((newConfig) => {
      if (newConfig.cache.invalidateOnConfigChange) {
        clearCache();
      }
      // Update precompute manager status on config changes
      try {
        const pc = newConfig.precomputation;
        if (pc && precompManagerRef.current) {
          if (pc.enabled) {
            precompManagerRef.current.resume();
          } else {
            precompManagerRef.current.stop();
          }
          setPrecomputeStatus(precompManagerRef.current.getStatus());
        }
      } catch (e) {
        logger.warn('[useAnalyticsWorker] Failed to update precompute manager on config change', { error: e });
      }
    });

    return unsubscribe;
  }, [clearCache]);

  /**
   * Subscribe to analyticsCoordinator cache clear events so this hook-level cache
   * acts as the primary cache responding to global/student invalidations.
   */
  useEffect(() => {
    const onClearAll = () => {
      try {
        clearCache();
      } catch (e) {
        logger.warn('[useAnalyticsWorker] Failed to clear cache on global event', { error: e });
      }
    };
    const onClearStudent = (evt: Event) => {
      try {
        const detail = (evt as CustomEvent).detail as { studentId?: string } | undefined;
        if (detail?.studentId) {
          invalidateCacheForStudent(detail.studentId);
        } else {
          clearCache();
        }
      } catch (e) {
        logger.warn('[useAnalyticsWorker] Failed to handle student cache clear event', { error: e });
      }
    };

    if (typeof window !== 'undefined') {
      try {
        window.addEventListener('analytics:cache:clear', onClearAll as EventListener);
        window.addEventListener('analytics:cache:clear:student', onClearStudent as EventListener);
        cleanupStackRef.current.push(() => {
          try {
            window.removeEventListener('analytics:cache:clear', onClearAll as EventListener);
            window.removeEventListener(
              'analytics:cache:clear:student',
              onClearStudent as EventListener,
            );
          } catch (e) {
            logger.debug('[useAnalyticsWorker] Failed to remove cache event listeners', { error: e });
          }
        });
      } catch (e) {
        logger.warn('[useAnalyticsWorker] Failed to set up cache event listeners', { error: e });
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        try {
          window.removeEventListener('analytics:cache:clear', onClearAll as EventListener);
          window.removeEventListener(
            'analytics:cache:clear:student',
            onClearStudent as EventListener,
          );
        } catch (e) {
          logger.debug('[useAnalyticsWorker] Failed to remove cache event listeners on cleanup', { error: e });
        }
      }
    };
  }, [clearCache, invalidateCacheForStudent]);

  // Create/teardown precomputation manager
  useEffect(() => {
    const pc = liveCfg?.precomputation;
    if (!pc || !pc.enabled) {
      if (precompManagerRef.current) {
        precompManagerRef.current.stop();
        setPrecomputeStatus(precompManagerRef.current.getStatus());
      }
      return;
    }

    if (!precompManagerRef.current) {
      precompManagerRef.current = new AnalyticsPrecomputationManager((data) => {
        // Use runAnalysis with prewarm flag; student inference occurs within
        runAnalysis(data, { prewarm: true }).catch(() => {
          /* noop */
        });
      });
    }

    // Kick off scheduling based on current data
    try {
      const entries = legacyAnalyticsAdapter.listTrackingEntries();
      const emotions: EmotionEntry[] = entries.flatMap((entry) =>
        (entry.emotions ?? []).map<EmotionEntry>((emotion) => ({
          ...emotion,
          studentId: emotion.studentId ?? entry.studentId,
        })),
      );
      const sensoryInputs: SensoryEntry[] = entries.flatMap((entry) =>
        (entry.sensoryInputs ?? []).map<SensoryEntry>((sensory) => ({
          ...sensory,
          studentId: sensory.studentId ?? entry.studentId,
        })),
      );
      precompManagerRef.current.schedulePrecomputation(entries, emotions, sensoryInputs);
      setPrecomputeStatus(precompManagerRef.current.getStatus());
    } catch (e) {
      logger.warn('[useAnalyticsWorker] Failed to schedule initial precomputation', { error: e });
    }

    return () => {
      try {
        precompManagerRef.current?.stop();
      } catch (e) {
        logger.debug('[useAnalyticsWorker] Failed to stop precompute manager on cleanup', { error: e });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveCfg?.precomputation?.enabled, workerReady]);

  /**
   * Get current cache statistics
   */
  const getCacheStats = useCallback(() => {
    return cache.stats;
  }, [cache]);

  return {
    results,
    isAnalyzing,
    error,
    runAnalysis,
    precomputeCommonAnalytics,
    invalidateCacheForStudent,
    clearCache,
    cacheStats: getCacheStats(),
    cacheSize: cache.size,
    precomputeEnabled: !!liveCfg?.precomputation?.enabled,
    precomputeStatus,
    startPrecomputation: () => {
      try {
        precompManagerRef.current?.resume();
        setPrecomputeStatus(precompManagerRef.current?.getStatus() ?? null);
      } catch (e) {
        logger.warn('[useAnalyticsWorker] Failed to start precomputation', { error: e });
      }
    },
    stopPrecomputation: () => {
      try {
        precompManagerRef.current?.stop();
        setPrecomputeStatus(precompManagerRef.current?.getStatus() ?? null);
      } catch (e) {
        logger.warn('[useAnalyticsWorker] Failed to stop precomputation', { error: e });
      }
    },
  };
};
