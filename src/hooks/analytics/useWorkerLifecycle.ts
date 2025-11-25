/**
 * @file useWorkerLifecycle.ts
 *
 * Hook for managing the analytics web worker lifecycle.
 * Handles initialization, ready state tracking, and cleanup.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ensureWorkerInitialized,
  isCircuitOpen,
  isWorkerReady,
  markWorkerReady,
  releaseWorker,
  retainWorker,
} from '@/lib/analytics/workerManager';
import { POC_MODE, DISABLE_ANALYTICS_WORKER } from '@/lib/env';
import { logger } from '@/lib/logger';
import { toast } from '@/hooks/use-toast';
import { doOnce } from '@/lib/rateLimit';
import { createWorkerMessageHandlers } from '@/lib/analytics/workerMessageHandlers';
import { AlertPolicies } from '@/lib/alerts/policies';
import { AlertTelemetryService } from '@/lib/alerts/telemetry';
import type { AnalyticsResults } from '@/types/analytics';
import type { AnalyticsResultsAI } from '@/lib/analysis';
import type { Goal } from '@/types/student';

interface WorkerMessageHandlerDeps {
  cache: {
    get: (key: string) => AnalyticsResults | undefined;
    set: (key: string, value: AnalyticsResults, tags?: string[]) => void;
    invalidateByTag: (tag: string) => void;
    clear: () => void;
  };
  cacheTagsRef: React.MutableRefObject<Map<string, string[]>>;
  activeCacheKeyRef: React.MutableRefObject<string | null>;
  buildCacheTags: (params: {
    data: AnalyticsResults;
    goals?: Goal[];
    studentId?: string | number;
    includeAiTag?: boolean;
  }) => string[];
  setResults: (results: AnalyticsResultsAI | null) => void;
  setError: (error: string | null) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  lastAlertsReceivedAtRef: React.MutableRefObject<number>;
}

export interface UseWorkerLifecycleOptions {
  handlerDeps: WorkerMessageHandlerDeps;
}

export interface UseWorkerLifecycleReturn {
  workerRef: React.MutableRefObject<Worker | null>;
  watchdogRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  isReady: boolean;
  isDisabled: boolean;
  cleanupFns: React.MutableRefObject<Array<() => void>>;
  setWorkerReady: (ready: boolean) => void;
}

const telemetryService = new AlertTelemetryService();

/**
 * Hook for managing the analytics web worker lifecycle.
 *
 * Handles:
 * - Worker initialization and ready state
 * - Circuit breaker checks
 * - POC mode and disabled worker flags
 * - Message handler attachment
 * - Cleanup on unmount
 */
export function useWorkerLifecycle(
  options: UseWorkerLifecycleOptions,
): UseWorkerLifecycleReturn {
  const { handlerDeps } = options;

  const workerRef = useRef<Worker | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupFns = useRef<Array<() => void>>([]);
  const alertPoliciesRef = useRef(new AlertPolicies());

  const [workerReady, setWorkerReady] = useState(false);

  const isDisabled = POC_MODE || DISABLE_ANALYTICS_WORKER;

  const notifyWorkerDisabled = useCallback(() => {
    doOnce('analytics_worker_disabled', 60_000, () => {
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
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (isDisabled) {
        workerRef.current = null;
        setWorkerReady(false);
        if (DISABLE_ANALYTICS_WORKER) {
          notifyWorkerDisabled();
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

      if (worker) {
        const { onMessage, onMessageError } = createWorkerMessageHandlers({
          cache: handlerDeps.cache,
          cacheTagsRef: handlerDeps.cacheTagsRef,
          activeCacheKeyRef: handlerDeps.activeCacheKeyRef,
          buildCacheTags: ({ data, goals, studentId, includeAiTag }) =>
            handlerDeps.buildCacheTags({
              data: data as AnalyticsResults,
              goals: goals as Goal[] | undefined,
              studentId,
              includeAiTag,
            }),
          setResults: handlerDeps.setResults,
          setError: handlerDeps.setError,
          setIsAnalyzing: handlerDeps.setIsAnalyzing,
          alertPolicies: alertPoliciesRef.current,
          telemetryService,
          lastAlertsReceivedAtRef: handlerDeps.lastAlertsReceivedAtRef,
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
          logger.debug('[useWorkerLifecycle] Could not expose worker globally', { error: e });
        }

        cleanupFns.current.push(() => {
          try {
            (window as unknown as { __analyticsWorker?: Worker | null }).__analyticsWorker = null;
          } catch (e) {
            logger.debug('[useWorkerLifecycle] Could not clear global worker reference', {
              error: e,
            });
          }
          try {
            worker.removeEventListener('message', onMessage as EventListener);
            worker.removeEventListener('messageerror', onMessageError as EventListener);
          } catch (e) {
            logger.warn('[useWorkerLifecycle] Failed to remove worker event listeners', {
              error: e,
            });
          }
        });
      }
    };

    init();

    return () => {
      isMounted = false;
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
      while (cleanupFns.current.length) {
        try {
          (cleanupFns.current.pop() as () => void)();
        } catch (e) {
          logger.warn('[useWorkerLifecycle] Cleanup function failed', { error: e });
        }
      }
      releaseWorker();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDisabled]);

  return {
    workerRef,
    watchdogRef,
    isReady: workerReady,
    isDisabled,
    cleanupFns,
    setWorkerReady,
  };
}
