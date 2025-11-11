import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { AnalyticsData, AnalyticsResults } from '@/types/analytics';
import type { Goal, Student } from '@/types/student';
import type { AnalyticsResultsAI } from '@/lib/analysis';
import type { CacheStore } from '@/lib/analytics/workerMessageHandlers';

export interface RunAnalysisOptions {
  useAI?: boolean;
  student?: Student;
  prewarm?: boolean;
}

export interface RunAnalysisDeps {
  cache: CacheStore & {
    invalidateByTag?: (tag: string) => void;
    clear?: () => void;
  };
  cacheTagsRef: MutableRefObject<Map<string, string[]>>;
  activeCacheKeyRef: MutableRefObject<string | null>;
  workerRef: MutableRefObject<Worker | null>;
  watchdogRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setResults: Dispatch<SetStateAction<AnalyticsResultsAI | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setIsAnalyzing: Dispatch<SetStateAction<boolean>>;
  createCacheKey: (data: AnalyticsData, goals?: Goal[]) => string;
  buildCacheTags: (args: {
    data: AnalyticsData | AnalyticsResults;
    goals?: Goal[];
    studentId?: string | number;
    includeAiTag?: boolean;
  }) => string[];
  getGoalsForStudent: (studentId: string) => Goal[] | undefined;
  analyticsManager: {
    getStudentAnalytics: (
      student: Student,
      options: { useAI: boolean },
    ) => Promise<AnalyticsResults | AnalyticsResultsAI>;
  };
  analyticsWorkerFallback: {
    processAnalytics: (
      data: AnalyticsData,
      options: { useAI?: boolean; student?: Student },
    ) => Promise<AnalyticsResults>;
  };
  getValidatedConfig: () => any;
  buildInsightsTask: (inputs: Record<string, unknown>, options: Record<string, unknown>) => any;
  queuePendingTask: (task: unknown) => void;
  getWorkerInstance: () => Worker | null;
  isWorkerReady: () => boolean;
  isCircuitOpen: () => boolean;
  workerDisabled: boolean;
  logger: {
    debug: (...args: any[]) => void;
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
  };
  diagnostics: { logWorkerTimeout: (worker: string, timeout: number) => void };
}

const ensureStudent = (data: AnalyticsData, explicit?: Student): Student | undefined => {
  if (explicit?.id) return explicit;
  const entry = data.entries?.[0];
  if (entry?.studentId) {
    return {
      id: entry.studentId,
      name: 'Student',
      createdAt: new Date(),
    } as Student;
  }
  const emotion = data.emotions?.[0];
  if (emotion?.studentId) {
    return {
      id: emotion.studentId,
      name: 'Student',
      createdAt: new Date(),
    } as Student;
  }
  const sensory = data.sensoryInputs?.[0];
  if ((sensory as any)?.studentId) {
    return {
      id: (sensory as any).studentId,
      name: 'Student',
      createdAt: new Date(),
    } as Student;
  }
  return undefined;
};

const setMinimalResults = (setResults: Dispatch<SetStateAction<AnalyticsResultsAI | null>>) => {
  setResults(
    (prev) =>
      prev ??
      ({
        patterns: [],
        correlations: [],
        environmentalCorrelations: [],
        predictiveInsights: [],
        anomalies: [],
        insights: ['Analytics temporarily unavailable.'],
      } as AnalyticsResultsAI),
  );
};

export const createRunAnalysis = (deps: RunAnalysisDeps) => {
  const {
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
    getGoalsForStudent,
    analyticsManager,
    analyticsWorkerFallback,
    getValidatedConfig,
    buildInsightsTask,
    queuePendingTask,
    getWorkerInstance,
    isWorkerReady,
    isCircuitOpen,
    workerDisabled,
    logger,
    diagnostics,
  } = deps;

  return async (data: AnalyticsData, options?: RunAnalysisOptions): Promise<void> => {
    const prewarm = options?.prewarm === true;
    const aiRequested = options?.useAI === true;
    const resolvedStudentId = (() => {
      if (options?.student?.id) return options.student.id;
      return (
        data.entries?.[0]?.studentId ||
        (data.emotions?.[0]?.studentId as string | undefined) ||
        ((data.sensoryInputs?.[0] as Record<string, unknown> | undefined)?.studentId as
          | string
          | undefined)
      );
    })();

    const goals = resolvedStudentId ? (getGoalsForStudent(resolvedStudentId) ?? []) : undefined;
    const cacheKey = `${createCacheKey({ ...data, goals } as AnalyticsData, goals)}|ai=${aiRequested ? '1' : '0'}`;
    if (!prewarm) {
      activeCacheKeyRef.current = cacheKey;
    }

    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      if (!cache.get(`_logged_${cacheKey}`)) {
        try {
          logger.debug('[useAnalyticsWorker] cache hit', { cacheKey });
          cache.set(`_logged_${cacheKey}`, true, ['logging'], 60000);
        } catch {
          /* noop */
        }
      }
      setResults(cachedResult as AnalyticsResultsAI);
      setError(null);
      return;
    }

    const cacheTags = buildCacheTags({
      data,
      goals,
      studentId: resolvedStudentId,
      includeAiTag: aiRequested,
    });

    if (aiRequested) {
      setIsAnalyzing(true);
      setError(null);
      try {
        const studentObj = ensureStudent(data, options?.student);
        if (!studentObj) {
          throw new Error('Missing student context for AI analysis');
        }
        const res = await analyticsManager.getStudentAnalytics(studentObj, { useAI: true });
        if (!prewarm) setResults(res as AnalyticsResultsAI);
        cache.set(cacheKey, res as AnalyticsResultsAI, cacheTags);
      } catch (err) {
        logger.error('[useAnalyticsWorker] AI analysis path failed', err);
        setError('AI analysis failed. Falling back to standard analytics.');
        try {
          const res = await analyticsWorkerFallback.processAnalytics(
            { ...(data as any), goals } as any,
            { useAI: false, student: options?.student },
          );
          if (!prewarm) setResults(res as AnalyticsResultsAI);
          cache.set(cacheKey, res as AnalyticsResultsAI, cacheTags);
        } catch (fallbackError) {
          logger.error('[useAnalyticsWorker] Fallback after AI failure also failed', fallbackError);
          if (!prewarm) {
            setMinimalResults(setResults);
          }
        }
      } finally {
        if (!prewarm) setIsAnalyzing(false);
      }
      return;
    }

    if (!workerRef.current || workerDisabled) {
      if (!cache.get('_logged_fallback_mode')) {
        logger.debug('[useAnalyticsWorker] No worker available, using fallback');
        cache.set('_logged_fallback_mode', true, ['logging'], 3600000);
      }
      if (!prewarm) setIsAnalyzing(true);
      setError(null);
      try {
        const results = await analyticsWorkerFallback.processAnalytics(
          { ...(data as any), goals } as any,
          { useAI: options?.useAI, student: options?.student },
        );
        if (!prewarm) setResults(results as AnalyticsResultsAI);
        cache.set(cacheKey, results as AnalyticsResultsAI, cacheTags);
        cacheTagsRef.current.delete(cacheKey);
      } catch (error) {
        logger.error('[useAnalyticsWorker] Fallback failed', error);
        setError('Analytics processing failed. Please try again.');
        if (!prewarm) {
          setMinimalResults(setResults);
        }
      } finally {
        if (!prewarm) setIsAnalyzing(false);
      }
      return;
    }

    if (!prewarm) setIsAnalyzing(true);
    setError(null);
    if (!prewarm) setResults(null);

    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }

    const cfg = getValidatedConfig();
    const hint = cfg?.cache?.ttl ?? 15000;
    const timeoutMs = Math.min(20000, Math.max(5000, hint));
    watchdogRef.current = setTimeout(async () => {
      try {
        logger.error(
          '[useAnalyticsWorker] watchdog timeout: worker did not respond, attempting fallback',
        );
      } catch {
        /* noop */
      }
      diagnostics.logWorkerTimeout('analytics', timeoutMs);

      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }

      try {
        const fallbackResults = await analyticsWorkerFallback.processAnalytics(
          { ...data, goals } as AnalyticsData,
          { useAI: options?.useAI, student: options?.student },
        );
        if (!prewarm) setResults(fallbackResults as AnalyticsResultsAI);
        cache.set(cacheKey, fallbackResults as AnalyticsResultsAI, cacheTags);
        cacheTagsRef.current.delete(cacheKey);
        setError('Worker timeout - results computed using fallback mode.');
      } catch (fallbackError) {
        logger.error('[useAnalyticsWorker] Fallback failed after watchdog timeout', fallbackError);
        setError('Analytics processing failed. Please try again.');
        if (!prewarm) {
          setMinimalResults(setResults);
        }
      } finally {
        if (!prewarm) setIsAnalyzing(false);
      }
    }, timeoutMs);

    const config = getValidatedConfig();
    const logKey = `_logged_worker_post_${new Date().getMinutes()}`;
    if (!cache.get(logKey)) {
      try {
        logger.debug('[useAnalyticsWorker] posting to worker (runAnalysis)', {
          hasConfig: !!config,
          cacheKey,
        });
        cache.set(logKey, true, ['logging'], 60000);
      } catch {
        /* noop */
      }
    }

    try {
      const inputs = {
        entries: data.entries,
        emotions: data.emotions,
        sensoryInputs: data.sensoryInputs,
        ...(goals ? { goals } : {}),
      } as const;
      const task = buildInsightsTask(inputs, {
        config,
        tags: cacheTags,
        prewarm,
      });

      const workerLogKey = `_logged_worker_message_${cacheKey}_${new Date().getMinutes()}`;
      if (!cache.get(workerLogKey)) {
        logger.debug('[WORKER_MESSAGE] Sending Insights/Compute task to analytics worker', {
          cacheKey: task.cacheKey,
          ttlSeconds: task.ttlSeconds,
          tagCount: task.tags?.length ?? 0,
          emotionsCount: data.emotions?.length || 0,
          sensoryInputsCount: data.sensoryInputs?.length || 0,
          entriesCount: data.entries?.length || 0,
        });
        cache.set(workerLogKey, true, ['logging'], 60000);
      }

      if (!workerRef.current || isCircuitOpen()) {
        if (!getWorkerInstance()) {
          throw new Error('Worker unavailable or circuit open');
        }
      }

      cacheTagsRef.current.set(cacheKey, cacheTags);

      if (workerRef.current && !isWorkerReady()) {
        queuePendingTask(task as unknown as MessageEvent['data']);
      } else if (workerRef.current) {
        workerRef.current.postMessage(task);
      } else {
        throw new Error('Worker reference missing');
      }
    } catch (postErr) {
      logger.error('[WORKER_MESSAGE] Failed to post message to worker, falling back to sync', {
        error: postErr,
      });
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }

      try {
        const fallbackResults = await analyticsWorkerFallback.processAnalytics(
          { ...data, goals } as AnalyticsData,
          { useAI: options?.useAI, student: options?.student },
        );
        if (!prewarm) setResults(fallbackResults as AnalyticsResultsAI);
        cache.set(cacheKey, fallbackResults as AnalyticsResultsAI, cacheTags);
        cacheTagsRef.current.delete(cacheKey);
        setError(null);
      } catch (fallbackError) {
        logger.error(
          '[useAnalyticsWorker] Fallback processing failed after worker post error',
          fallbackError,
        );
        setError('Analytics processing failed.');
      } finally {
        if (!prewarm) setIsAnalyzing(false);
      }
    }
  };
};
