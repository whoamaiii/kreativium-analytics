import { logger } from '@/lib/logger';
import { toast } from '@/hooks/use-toast';
import { doOnce } from '@/lib/rateLimit';
import { POC_MODE, DISABLE_ANALYTICS_WORKER } from '@/lib/env';
import type { AnalyticsWorkerMessage } from '@/types/analytics';
import { safeGet, safeSet } from '@/lib/storage';

interface WorkerSingleton {
  worker: Worker | null;
  refs: number;
  ready: boolean;
  circuitUntil: number;
}

const workerState: WorkerSingleton = {
  worker: null,
  refs: 0,
  ready: false,
  circuitUntil: 0,
};

const pendingTasks: MessageEvent['data'][] = [];

const nowMs = (): number => Date.now();

export const ALERTS_HEALTH_EVENT = 'alerts:health';
export const ALERTS_UPDATED_EVENT = 'alerts:updated';

export const isCircuitOpen = (): boolean => nowMs() < workerState.circuitUntil;

const openCircuit = (ms: number): void => {
  workerState.circuitUntil = nowMs() + Math.max(0, ms);
};

export const isWorkerReady = (): boolean => workerState.ready;

export const markWorkerReady = (): void => {
  if (!workerState.ready) {
    workerState.ready = true;
    flushQueuedTasks();
  }
};

export const getWorkerInstance = (): Worker | null => workerState.worker;

export const queuePendingTask = (task: MessageEvent['data']): void => {
  pendingTasks.push(task);
};

export const flushQueuedTasks = (): void => {
  if (!workerState.worker || !workerState.ready) return;
  while (pendingTasks.length) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (workerState.worker as any).postMessage(pendingTasks.shift());
    } catch {
      break;
    }
  }
};

export const retainWorker = (): void => {
  workerState.refs += 1;
};

export const releaseWorker = (): void => {
  workerState.refs = Math.max(0, workerState.refs - 1);
  if (workerState.refs === 0 && workerState.worker) {
    try {
      logger.debug?.('[analyticsWorkerManager] Terminating analytics worker');
      workerState.worker.terminate();
    } catch {
      /* noop */
    }
    workerState.worker = null;
    workerState.ready = false;
  }
};

export const ensureWorkerInitialized = async (): Promise<Worker | null> => {
  if (POC_MODE || DISABLE_ANALYTICS_WORKER) return null;
  if (workerState.worker) return workerState.worker;
  if (isCircuitOpen()) return null;

  try {
    const mod = await import('@/workers/analytics.worker?worker');
    const WorkerCtor = (mod as unknown as { default: { new(): Worker } }).default;
    const worker = new WorkerCtor();

    worker.onmessage = (event: MessageEvent<AnalyticsWorkerMessage>) => {
      const msg = event.data as AnalyticsWorkerMessage | undefined;
      if (!workerState.ready) {
        if (!msg || msg.type === 'progress' || msg.type === 'partial' || msg.type === 'complete' || msg.type === 'error') {
          markWorkerReady();
        }
      }
    };

    worker.onerror = (error: ErrorEvent) => {
      logger.error('[analyticsWorkerManager] Worker runtime error, switching to fallback', error);
      try {
        worker.terminate();
      } catch {
        /* noop */
      }
      workerState.worker = null;
      workerState.ready = false;
      openCircuit(60_000);
      doOnce('analytics_worker_failure', 60_000, () => {
        try {
          import('@/hooks/useTranslation').then(({ useTranslation }) => {
            const { t } = useTranslation('analytics');
            toast({
              title: t('worker.fallbackTitle'),
              description: t('worker.fallbackDescription'),
            });
          }).catch(() => {
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

    workerState.worker = worker;
    workerState.ready = false;
    logger.info('[analyticsWorkerManager] Analytics worker initialized successfully');
    return worker;
  } catch (error) {
    logger.error('[analyticsWorkerManager] Failed to initialize worker', error as Error);
    workerState.worker = null;
    workerState.ready = false;
    openCircuit(15_000);
    return null;
  }
};

const alertsStorageKey = (studentId: string): string => `alerts:list:${studentId}`;

export const readStoredAlerts = <T = unknown>(studentId: string): T[] => {
  try {
    const raw = safeGet(alertsStorageKey(studentId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

export const writeStoredAlerts = (studentId: string, alerts: unknown[]): void => {
  try {
    safeSet(alertsStorageKey(studentId), JSON.stringify(alerts));
  } catch (error) {
    logger.warn?.('[analyticsWorkerManager] Failed to persist alerts', error as Error);
  }
};
