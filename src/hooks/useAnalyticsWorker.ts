// Cache key computation is centralized via buildInsightsCacheKey

/**
 * @file src/hooks/useAnalyticsWorker.ts
 * 
 * This hook encapsulates the logic for interacting with the analytics web worker.
 * It simplifies the process of creating, communicating with, and terminating the worker,
 * providing a clean, React-friendly interface for components to offload heavy computations.
 * Now enhanced with performance caching to avoid redundant calculations.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { AnalyticsData, AnalyticsResults, AnalyticsWorkerMessage } from '@/types/analytics';
import { usePerformanceCache } from './usePerformanceCache';
import { analyticsConfig } from '@/lib/analyticsConfig';
import { getValidatedConfig, validateAnalyticsRuntimeConfig } from '@/lib/analyticsConfigValidation';
import { buildInsightsCacheKey, buildInsightsTask } from '@/lib/analyticsManager';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { diagnostics } from '@/lib/diagnostics';
import { analyticsWorkerFallback } from '@/lib/analyticsWorkerFallback';
import { POC_MODE, DISABLE_ANALYTICS_WORKER } from '@/lib/env';
import type { Student, Goal } from '@/types/student';
import type { AnalyticsResultsAI } from '@/lib/analysis';
import { analyticsManager } from '@/lib/analyticsManager';
import { dataStorage } from '@/lib/dataStorage';
import { analyticsCoordinator } from '@/lib/analyticsCoordinator';
import { AnalyticsPrecomputationManager } from '@/lib/analyticsPrecomputation';
import { deviceConstraints } from '@/lib/deviceConstraints';

// -----------------------------------------------------------------------------
// Module-level singleton to prevent duplicate workers across multiple consumers
// -----------------------------------------------------------------------------
interface WorkerSingleton {
  worker: Worker | null;
  refs: number;
  ready: boolean;
  circuitUntil: number; // epoch ms; when > now, do not attempt worker usage
}

const singleton: WorkerSingleton = {
  worker: null,
  refs: 0,
  ready: false,
  circuitUntil: 0,
};

function nowMs(): number { return Date.now(); }
function isCircuitOpen(): boolean { return nowMs() < singleton.circuitUntil; }
function openCircuit(ms: number): void { singleton.circuitUntil = nowMs() + Math.max(0, ms); }

// Shared once-per-key dedupe for user-facing notifications
import { doOnce } from '@/lib/rateLimit';

// Queue tasks until worker signals ready
const pendingTasks: MessageEvent['data'][] = [];
// Per-hook cleanup stack (listeners, timers)
const cleanupFns: Array<() => void> = [];

function flushQueuedTasks(): void {
  if (!singleton.worker || !singleton.ready) return;
  while (pendingTasks.length) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (singleton.worker as any).postMessage(pendingTasks.shift());
    } catch (e) {
      // If posting fails, stop flushing to avoid spin
      break;
    }
  }
}

async function ensureWorkerInitialized(): Promise<Worker | null> {
  if (POC_MODE || DISABLE_ANALYTICS_WORKER) return null;
  if (singleton.worker) return singleton.worker;
  if (isCircuitOpen()) return null;

  try {
    const mod = await import('@/workers/analytics.worker?worker');
    const WorkerCtor = (mod as unknown as { default: { new(): Worker } }).default;
    const worker = new WorkerCtor();

    // Attach handlers once at creation time
    worker.onmessage = (event: MessageEvent<AnalyticsWorkerMessage>) => {
      // Any message implies liveness; mark ready when first progress received or on any first message
      if (!singleton.ready) {
        const msg = event.data as AnalyticsWorkerMessage | undefined;
        if (!msg || msg.type === 'progress' || msg.type === 'partial' || msg.type === 'complete' || msg.type === 'error') {
          singleton.ready = true;
          flushQueuedTasks();
        }
      }
    };

    worker.onerror = (error: ErrorEvent) => {
      logger.error('[useAnalyticsWorker] Worker runtime error, switching to fallback', error);
      try {
        worker.terminate();
      } catch { /* noop */ }
      singleton.worker = null;
      singleton.ready = false;
      // Open circuit for 60s to avoid thrash
      openCircuit(60_000);
      // One-time user-facing toast per cooldown window (localized elsewhere if needed)
      doOnce('analytics_worker_failure', 60_000, () => {
        // i18n keys under analytics:worker
        try {
          // Dynamically import to avoid pulling react-i18next into this hook directly
          import('@/hooks/useTranslation').then(({ useTranslation }) => {
            const { t } = useTranslation('analytics');
            toast({
              title: t('worker.fallbackTitle'),
              description: t('worker.fallbackDescription'),
            });
          }).catch(() => {
            // Fallback to English strings if i18n not ready here
            toast({
              title: 'Analytics running in fallback mode',
              description: 'Background worker failed. Using safe fallback to keep the UI responsive.',
            });
          });
        } catch {
          toast({
            title: 'Analytics running in fallback mode',
            description: 'Background worker failed. Using safe fallback to keep the UI responsive.',
          });
        }
      });
    };

    singleton.worker = worker;
    singleton.ready = false; // will flip true on first onmessage
    logger.info('[useAnalyticsWorker] Analytics worker initialized successfully');
    return worker;
  } catch (error) {
    logger.error('[useAnalyticsWorker] Failed to initialize worker', error as Error);
    singleton.worker = null;
    // Shorter circuit on init failure
    openCircuit(15_000);
    return null;
  }
}

function retainWorker(): void {
  singleton.refs += 1;
}

function releaseWorker(): void {
  singleton.refs = Math.max(0, singleton.refs - 1);
  if (singleton.refs === 0 && singleton.worker) {
    try {
      logger.debug('[useAnalyticsWorker] Terminating analytics worker');
      singleton.worker.terminate();
    } catch { /* noop */ }
    singleton.worker = null;
    singleton.ready = false;
  }
}

// Define CacheStats type if not imported from usePerformanceCache
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
  runAnalysis: (data: AnalyticsData, options?: { useAI?: boolean; student?: Student; prewarm?: boolean }) => Promise<void>;
  precomputeCommonAnalytics: (dataProvider: () => AnalyticsData[], options?: { student?: Student }) => void;
  invalidateCacheForStudent: (studentId: string) => void;
  clearCache: () => void;
  cacheStats: CacheStats | null;
  cacheSize: number;
  // Optional precomputation status/controls
  precomputeEnabled?: boolean;
  precomputeStatus?: { enabled: boolean; queueSize: number; isProcessing: boolean; processedCount: number } | null;
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
export const useAnalyticsWorker = (options: CachedAnalyticsWorkerOptions = {}): UseAnalyticsWorkerReturn => {
  // Resolve defaults from runtime analyticsConfig with safe fallbacks
  const liveCfgRaw = (() => { try { return analyticsConfig.getConfig(); } catch { return null; } })();
  const { config: liveCfg } = validateAnalyticsRuntimeConfig(liveCfgRaw ?? undefined);
  const resolvedTtl = typeof options.cacheTTL === 'number'
    ? options.cacheTTL
    : (liveCfg?.cache?.ttl ?? 300_000); // default 300s in ms
  const {
    cacheTTL = resolvedTtl,
    enableCacheStats = false,
    precomputeOnIdle = false
  } = options;

  const workerRef = useRef<Worker | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [results, setResults] = useState<AnalyticsResultsAI | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idleCallbackRef = useRef<number | null>(null);
  const [isWorkerReady, setIsWorkerReady] = useState<boolean>(false);
  const activeCacheKeyRef = useRef<string | null>(null);
  const cacheTagsRef = useRef<Map<string, string[]>>(new Map());
  const precompManagerRef = useRef<AnalyticsPrecomputationManager | null>(null);
  const [precomputeStatus, setPrecomputeStatus] = useState<{ enabled: boolean; queueSize: number; isProcessing: boolean; processedCount: number } | null>(null);

  // Initialize performance cache with appropriate settings
  const cache = usePerformanceCache<AnalyticsResults>({
    maxSize: (liveCfg?.cache?.maxSize ?? 50), // Use runtime config; fallback to 50
    ttl: cacheTTL,
    enableStats: enableCacheStats,
    versioning: true // Enable versioning to invalidate on data structure changes
  });

  /**
   * Extracts tags from analytics data for cache invalidation
   * Allow override via options for testing
   */
  const defaultExtractTagsFromData = useCallback((data: AnalyticsData | AnalyticsResults): string[] => {
    const tags: string[] = ['analytics'];
    
    // Add student-specific tags if available
    if ('entries' in data && (data as any).entries?.length > 0) {
      const studentIds = Array.from(new Set((data as any).entries.map((e: any) => e.studentId)));
      tags.push(...studentIds.map(id => `student-${id}`));
    }

    // Add date-based tags for time-sensitive invalidation
    const now = new Date();
    tags.push(`analytics-${now.getFullYear()}-${now.getMonth() + 1}`);
    
    return tags;
  }, []);
  const extractTagsFn = options.extractTagsFromData ?? defaultExtractTagsFromData;

  const buildCacheTags = useCallback(({ data, goals, studentId, includeAiTag }: { data: AnalyticsData | AnalyticsResults; goals?: Goal[]; studentId?: string | number; includeAiTag?: boolean }): string[] => {
    const tagsFromData = extractTagsFn({ ...data, goals } as AnalyticsData) ?? [];
    const tagSet = new Set<string>(tagsFromData);

    (goals ?? []).forEach(goal => {
      const goalId = (goal as Goal)?.id;
      if (goalId) tagSet.add(`goal-${goalId}`);
      const goalStudentId = (goal as Goal)?.studentId;
      if (goalStudentId) tagSet.add(`student-${goalStudentId}`);
    });

    if (studentId !== undefined && studentId !== null) {
      tagSet.add(`student-${studentId}`);
    }

    if (includeAiTag) {
      tagSet.add('ai');
    }

    return Array.from(tagSet);
  }, [extractTagsFn]);

  useEffect(() => {
    let isMounted = true; // Race condition guard

    const init = async () => {
      if (POC_MODE || DISABLE_ANALYTICS_WORKER) {
        workerRef.current = null;
        setIsWorkerReady(false);
        // Inform user once per minute if worker is disabled via flag
        if (DISABLE_ANALYTICS_WORKER) {
          doOnce('analytics_worker_disabled', 60_000, () => {
            try {
              import('@/hooks/useTranslation').then(({ useTranslation }) => {
                const { t } = useTranslation('analytics');
                toast({
                  title: t('worker.disabledTitle'),
                  description: t('worker.disabledDescription'),
                });
              }).catch(() => {
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
        setIsWorkerReady(false);
        return;
      }
      retainWorker();
      const worker = await ensureWorkerInitialized();
      if (!isMounted) {
        releaseWorker();
        return;
      }
      workerRef.current = worker;
      setIsWorkerReady(!!(singleton.ready && worker));

      // Attach per-hook message listener to consume results
      if (worker) {
        const onMessage = (event: MessageEvent<AnalyticsWorkerMessage>) => {
          const data = event.data as AnalyticsWorkerMessage | undefined;
          if (!data) return;
          // Any inbound message means the worker is alive
          if (!singleton.ready) {
            singleton.ready = true;
            flushQueuedTasks();
          }

          // Reset watchdog on any message
          if (watchdogRef.current) {
            clearTimeout(watchdogRef.current);
            watchdogRef.current = null;
          }

          // Handle message types
          try {
            switch (data.type) {
              case 'partial':
                // For now, do not merge partials into results to avoid flicker; could add later
                break;
              case 'complete':
                {
                  const cacheKeyFromMsg = (data.cacheKey || (data.payload as any)?.cacheKey) as string | undefined;
                  const prewarmFlag = ((data.payload as any)?.prewarm === true);
                  const shouldUpdateUi = !!cacheKeyFromMsg && cacheKeyFromMsg === activeCacheKeyRef.current && !prewarmFlag;
                  // Always populate local cache when possible
                  if (cacheKeyFromMsg && data.payload) {
                    try {
                      const storedTags = cacheTagsRef.current.get(cacheKeyFromMsg);
                      const derivedTags = storedTags && storedTags.length
                        ? storedTags
                        : buildCacheTags({ data: data.payload as AnalyticsResults });
                      const tags = Array.from(new Set([...(derivedTags ?? []), 'worker']));
                      cache.set(cacheKeyFromMsg, data.payload as unknown as AnalyticsResultsAI, tags);
                    } catch { /* noop */ }
                    cacheTagsRef.current.delete(cacheKeyFromMsg);
                  }
                  if (shouldUpdateUi) {
                    setResults(data.payload as unknown as AnalyticsResultsAI);
                    setError(null);
                    setIsAnalyzing(false);
                  }
                }
                break;
              case 'error':
                if (data.cacheKey) {
                  cacheTagsRef.current.delete(data.cacheKey);
                }
                setIsAnalyzing(false);
                setError(typeof (data as any).error === 'string' ? (data as any).error : 'Analytics worker error');
                // Provide minimal safe results to prevent UI crashes per rules
                setResults((prev) => prev ?? ({
                  patterns: [], correlations: [], environmentalCorrelations: [], predictiveInsights: [], anomalies: [], insights: ['Analytics temporarily unavailable.']
                } as AnalyticsResultsAI));
                break;
              case 'progress':
                // No-op: used for readiness/heartbeat
                break;
              default:
                break;
            }
          } catch (e) {
            logger.error('[useAnalyticsWorker] Failed handling worker message', e as Error);
          }
        };

        const onMessageError = (evt: MessageEvent) => {
          logger.error('[useAnalyticsWorker] messageerror from analytics worker', evt);
        };

        worker.addEventListener('message', onMessage as EventListener);
        worker.addEventListener('messageerror', onMessageError as EventListener);

        // Cleanup these listeners if this hook unmounts while worker persists
        cleanupFns.push(() => {
          try {
            worker.removeEventListener('message', onMessage as EventListener);
            worker.removeEventListener('messageerror', onMessageError as EventListener);
          } catch { /* noop */ }
        });
      }
    };

    init();

    return () => {
      isMounted = false;
      // Local cleanup only; singleton handles actual termination when refs reach 0
      if (idleCallbackRef.current) {
        cancelIdleCallback(idleCallbackRef.current);
        idleCallbackRef.current = null;
      }
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
      // Run any per-hook cleanup fns (like removing event listeners)
      while (cleanupFns.length) {
        try { (cleanupFns.pop() as () => void)(); } catch { /* noop */ }
      }
      releaseWorker();
    };
  // Stable on mount; do not re-init on cache identity churn
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Creates a cache key based on the analytics data using centralized helper
   */
  const createCacheKey = useCallback((data: AnalyticsData, goals?: Goal[]): string => {
    // Map AnalyticsData to ComputeInsightsInputs structure expected by cache key builder
    const inputs = {
      entries: data.entries,
      emotions: data.emotions,
      sensoryInputs: data.sensoryInputs,
      ...(goals && goals.length ? { goals: goals.map(g => ({ id: (g as any).id })) as unknown as Goal[] } : {}),
    } as unknown as { entries: unknown[]; emotions: unknown[]; sensoryInputs: unknown[] };

    // Use live runtime config to ensure keys align across app and worker
    const cfg = getValidatedConfig();

    return buildInsightsCacheKey(inputs as any, { config: cfg });
  }, []);

  /**
   * Sends data to the worker to start a new analysis, checking cache first.
   * Supports AI analysis via analyticsManager when requested.
   */
  const runAnalysis = useCallback(async (data: AnalyticsData, options?: { useAI?: boolean; student?: Student; prewarm?: boolean }) => {
    const prewarm = (options as any)?.prewarm === true;
    const aiRequested = options?.useAI === true;
    const resolvedStudentId = (() => {
      if (options?.student?.id) return options.student.id;
      return (data.entries?.[0]?.studentId) || (data.emotions?.[0]?.studentId as any) || (data.sensoryInputs?.[0]?.studentId as any) || undefined;
    })();

    // Fetch goals when student context is provided (before cache key for correctness)
    const goals = (() => {
      if (!resolvedStudentId) return undefined;
      try {
        return dataStorage.getGoalsForStudent(resolvedStudentId) ?? [];
      } catch {
        return undefined;
      }
    })();
    const cacheKey = `${createCacheKey({ ...data, goals }, goals)}|ai=${aiRequested ? '1' : '0'}`;
    if (!prewarm) {
      activeCacheKeyRef.current = cacheKey;
    }
    
    // Check cache first
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      // Reduce logging verbosity - only log on first hit per key
      if (!cache.get(`_logged_${cacheKey}`)) {
        try {
          logger.debug('[useAnalyticsWorker] cache hit', { cacheKey });
          cache.set(`_logged_${cacheKey}`, true, ['logging'], 60000); // Log once per minute max
        } catch (err) {
          /* noop */
        }
      }
      setResults(cachedResult as AnalyticsResultsAI);
      setError(null);
      return;
    }

    const cacheTags = buildCacheTags({ data, goals, studentId: resolvedStudentId, includeAiTag: aiRequested });

    // AI path: bypass worker and use analyticsManager with runtime toggle
    if (aiRequested) {
      setIsAnalyzing(true);
      setError(null);
      try {
        let studentObj: Student | undefined = options?.student;
        if (!studentObj) {
          const first = data.entries?.[0];
          if (first?.studentId) {
            studentObj = { id: first.studentId, name: 'Student', createdAt: new Date() } as Student;
          }
        }
        if (!studentObj) throw new Error('Missing student context for AI analysis');

        const res = await analyticsManager.getStudentAnalytics(studentObj, { useAI: true });
        if (!prewarm) setResults(res as AnalyticsResultsAI);
        cache.set(cacheKey, res as AnalyticsResultsAI, cacheTags);
      } catch (err) {
        logger.error('[useAnalyticsWorker] AI analysis path failed', err);
        setError('AI analysis failed. Falling back to standard analytics.');
        try {
          const res = await analyticsWorkerFallback.processAnalytics({ ...(data as any), goals } as any, { useAI: false, student: options?.student });
          if (!prewarm) setResults(res as AnalyticsResultsAI);
          cache.set(cacheKey, res as AnalyticsResultsAI, cacheTags);
        } catch (fallbackError) {
          logger.error('[useAnalyticsWorker] Fallback after AI failure also failed', fallbackError);
          if (!prewarm) setResults({
            patterns: [],
            correlations: [],
            environmentalCorrelations: [],
            predictiveInsights: [],
            anomalies: [],
            insights: ['Analytics temporarily unavailable.']
          } as AnalyticsResultsAI);
        }
      } finally {
        if (!prewarm) setIsAnalyzing(false);
      }
      return;
    }

    // If no worker available, use fallback
    if (!workerRef.current || DISABLE_ANALYTICS_WORKER) {
      // Only log fallback mode once per session
      if (!cache.get('_logged_fallback_mode')) {
        logger.debug('[useAnalyticsWorker] No worker available, using fallback');
        cache.set('_logged_fallback_mode', true, ['logging'], 3600000); // Log once per hour
      }
      if (!prewarm) setIsAnalyzing(true);
      setError(null);
      
      try {
        const results = await analyticsWorkerFallback.processAnalytics({ ...(data as any), goals } as any, { useAI: options?.useAI, student: options?.student });
        // Prewarm path does not update UI
        if (!prewarm) setResults(results as AnalyticsResultsAI);
        // Cache the results
        cache.set(cacheKey, results as AnalyticsResultsAI, cacheTags);
        cacheTagsRef.current.delete(cacheKey);
      } catch (error) {
        logger.error('[useAnalyticsWorker] Fallback failed', error);
        setError('Analytics processing failed. Please try again.');
        // Set minimal results to prevent UI crash
        if (!prewarm) setResults({
          patterns: [],
          correlations: [],
          environmentalCorrelations: [],
          predictiveInsights: [],
          anomalies: [],
          insights: ['Analytics temporarily unavailable.']
        } as AnalyticsResultsAI);
      } finally {
        if (!prewarm) setIsAnalyzing(false);
      }
      return;
    }

    // If not in cache, proceed with worker analysis
    if (!prewarm) setIsAnalyzing(true);
    setError(null);
    if (!prewarm) setResults(null);

    // Start watchdog timeout to prevent indefinite spinner
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
    // Determine timeout from config if available; fallback to 15s minimum 3s
    const cfg = getValidatedConfig();
    // Clamp watchdog timeout to a sane upper bound to avoid indefinite spinners.
    // Use config ttl as a hint but never exceed 20s; keep a 5s lower bound.
    const hint = cfg?.cache?.ttl ?? 15000;
    const timeoutMs = Math.min(20000, Math.max(5000, hint));
    watchdogRef.current = setTimeout(async () => {
      try {
        logger.error('[useAnalyticsWorker] watchdog timeout: worker did not respond, attempting fallback');
      } catch {
        /* noop */
      }
      diagnostics.logWorkerTimeout('analytics', timeoutMs);
      
      // Terminate unresponsive worker
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      
      // Attempt fallback processing
      try {
        const fallbackResults = await analyticsWorkerFallback.processAnalytics({ ...data, goals } as AnalyticsData, { useAI: options?.useAI, student: options?.student });
        if (!prewarm) setResults(fallbackResults as AnalyticsResultsAI);
        cache.set(cacheKey, fallbackResults as AnalyticsResultsAI, cacheTags);
        cacheTagsRef.current.delete(cacheKey);
        setError('Worker timeout - results computed using fallback mode.');
      } catch (fallbackError) {
        logger.error('[useAnalyticsWorker] Fallback failed after watchdog timeout', fallbackError);
        setError('Analytics processing failed. Please try again.');
        // Set minimal results to prevent UI crash
        if (!prewarm) setResults({
          patterns: [],
          correlations: [],
          environmentalCorrelations: [],
          predictiveInsights: [],
          anomalies: [],
          insights: ['Analytics temporarily unavailable.']
        } as AnalyticsResultsAI);
      } finally {
        if (!prewarm) setIsAnalyzing(false);
      }
    }, timeoutMs);
    
    // Get current configuration (validated)
    const config = getValidatedConfig();

    // Rate limit worker posting logs
    const logKey = `_logged_worker_post_${new Date().getMinutes()}`;
    if (!cache.get(logKey)) {
      try {
        logger.debug('[useAnalyticsWorker] posting to worker (runAnalysis)', { hasConfig: !!config, cacheKey });
        cache.set(logKey, true, ['logging'], 60000); // Log at most once per minute
      } catch {
        /* noop */
      }
    }
    
    // Send data to worker with cache key and configuration
    try {
      // Build typed Insights task with centralized key, ttl, and tags
      const inputs = {
        entries: data.entries,
        emotions: data.emotions,
        sensoryInputs: data.sensoryInputs,
        ...(goals ? { goals } : {}),
      } as const;
      const task = buildInsightsTask(inputs, {
        config,
        // Propagate tags derived from inputs so worker-side caches can invalidate by tag
        tags: cacheTags,
        prewarm,
      });

      // Rate limit WORKER_MESSAGE logs
      const workerLogKey = `_logged_worker_message_${cacheKey}_${new Date().getMinutes()}`;
      if (!cache.get(workerLogKey)) {
        logger.debug('[WORKER_MESSAGE] Sending Insights/Compute task to analytics worker', {
          cacheKey: task.cacheKey,
          ttlSeconds: task.ttlSeconds,
          tagCount: task.tags?.length ?? 0,
          emotionsCount: data.emotions?.length || 0,
          sensoryInputsCount: data.sensoryInputs?.length || 0,
          entriesCount: data.entries?.length || 0
        });
        cache.set(workerLogKey, true, ['logging'], 60000); // Log once per minute per cache key
      }

      // If worker not available or circuit is open, queue or fallback
      if (!workerRef.current || isCircuitOpen()) {
        // If no worker at all, route to fallback immediately (do not queue unbounded)
        if (!singleton.worker) {
          throw new Error('Worker unavailable or circuit open');
        }
      }

      cacheTagsRef.current.set(cacheKey, cacheTags);

      // If worker exists but is not ready yet, queue the task
      if (workerRef.current && !singleton.ready) {
        pendingTasks.push(task as unknown as MessageEvent['data']);
      } else if (workerRef.current) {
        workerRef.current.postMessage(task);
      } else {
        throw new Error('Worker reference missing');
      }
    } catch (postErr) {
      logger.error('[WORKER_MESSAGE] Failed to post message to worker, falling back to sync', { error: postErr });
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
      
      // Fallback to synchronous processing
      try {
        const fallbackResults = await analyticsWorkerFallback.processAnalytics({ ...data, goals } as AnalyticsData, { useAI: options?.useAI, student: options?.student });
        if (!prewarm) setResults(fallbackResults as AnalyticsResultsAI);
        cache.set(cacheKey, fallbackResults as AnalyticsResultsAI, cacheTags);
        cacheTagsRef.current.delete(cacheKey);
        setError(null);
      } catch (fallbackError) {
        logger.error('[useAnalyticsWorker] Fallback processing failed after worker post error', fallbackError);
        setError('Analytics processing failed.');
      } finally {
        if (!prewarm) setIsAnalyzing(false);
      }
    }
  }, [cache, createCacheKey, buildCacheTags]);

  /**
   * Pre-compute analytics for common queries during idle time.
   * Note: When a student is provided, their goals are fetched and included to align with on-demand analytics.
   */
  const precomputeCommonAnalytics = useCallback((dataProvider: () => AnalyticsData[], options?: { student?: Student }) => {
    const pc = liveCfg?.precomputation;
    if (!pc || !pc.enabled) return;

    const schedule = async () => {
      try {
        const allowed = await deviceConstraints.canPrecompute(pc);
        if (!allowed) return;
      } catch { /* noop */ }

      const dataSets = dataProvider();
      const student = options?.student;
      dataSets.forEach((data, index) => {
        setTimeout(() => {
          // Route through runAnalysis to ensure caching and goal inclusion; mark as prewarm
          runAnalysis(data, { student, prewarm: true }).catch(() => { /* noop */ });
        }, index * (pc.taskStaggerDelay ?? 100));
      });
    };

    if (pc.precomputeOnlyWhenIdle && 'requestIdleCallback' in window) {
      idleCallbackRef.current = requestIdleCallback(() => { schedule(); }, { timeout: pc.idleTimeout ?? 5000 });
    } else {
      setTimeout(schedule, pc.idleTimeout ?? 1000);
    }
  }, [liveCfg, runAnalysis]);

  /**
   * Invalidate cache entries for a specific student
   */
  const invalidateCacheForStudent = useCallback((studentId: string) => {
    cache.invalidateByTag(`student-${studentId}`);
  }, [cache]);

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
        const pc = newConfig.precomputation as any;
        if (pc && precompManagerRef.current) {
          if (pc.enabled) {
            precompManagerRef.current.resume();
          } else {
            precompManagerRef.current.stop();
          }
          setPrecomputeStatus(precompManagerRef.current.getStatus());
        }
      } catch { /* noop */ }
    });

    return unsubscribe;
  }, [clearCache]);

  /**
   * Subscribe to analyticsCoordinator cache clear events so this hook-level cache
   * acts as the primary cache responding to global/student invalidations.
   */
  useEffect(() => {
    const onClearAll = () => {
      try { clearCache(); } catch { /* noop */ }
    };
    const onClearStudent = (evt: Event) => {
      try {
        const detail = (evt as CustomEvent).detail as { studentId?: string } | undefined;
        if (detail?.studentId) {
          invalidateCacheForStudent(detail.studentId);
        } else {
          clearCache();
        }
      } catch { /* noop */ }
    };

    try {
      if (typeof window !== 'undefined') {
        window.addEventListener('analytics:cache:clear', onClearAll as EventListener);
        window.addEventListener('analytics:cache:clear:student', onClearStudent as EventListener);
        cleanupFns.push(() => {
          try {
            window.removeEventListener('analytics:cache:clear', onClearAll as EventListener);
            window.removeEventListener('analytics:cache:clear:student', onClearStudent as EventListener);
          } catch { /* noop */ }
        });
      }
    } catch { /* noop */ }

    return () => {
      try {
        if (typeof window !== 'undefined') {
          window.removeEventListener('analytics:cache:clear', onClearAll as EventListener);
          window.removeEventListener('analytics:cache:clear:student', onClearStudent as EventListener);
        }
      } catch { /* noop */ }
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
        runAnalysis(data, { prewarm: true }).catch(() => { /* noop */ });
      });
    }

    // Kick off scheduling based on current data
    try {
      const entries = dataStorage.getTrackingEntries();
      const emotions = entries.flatMap(e => (e.emotions || []).map(em => ({ ...em, studentId: em.studentId ?? e.studentId })));
      const sensoryInputs = entries.flatMap(e => (e.sensoryInputs || []).map(s => ({ ...s, studentId: s.studentId ?? e.studentId })));
      precompManagerRef.current.schedulePrecomputation(entries, emotions as any, sensoryInputs as any);
      setPrecomputeStatus(precompManagerRef.current.getStatus());
    } catch { /* noop */ }

    return () => {
      try { precompManagerRef.current?.stop(); } catch { /* noop */ }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveCfg?.precomputation?.enabled, isWorkerReady]);

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
    startPrecomputation: () => { try { precompManagerRef.current?.resume(); setPrecomputeStatus(precompManagerRef.current?.getStatus() ?? null); } catch { /* noop */ } },
    stopPrecomputation: () => { try { precompManagerRef.current?.stop(); setPrecomputeStatus(precompManagerRef.current?.getStatus() ?? null); } catch { /* noop */ } },
  };
};
