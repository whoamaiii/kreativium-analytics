import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { ALERTS_UPDATED_EVENT, readStoredAlerts, writeStoredAlerts } from '@/lib/analytics/workerManager';
import type { AnalyticsResults, AnalyticsWorkerMessage } from '@/types/analytics';
import type { AnalyticsResultsAI } from '@/lib/analysis';
import type { AlertEvent, AlertWithGovernance, ThresholdAdjustmentTrace } from '@/lib/alerts/types';
import type { AlertPolicies } from '@/lib/alerts/policies';
import type { AlertTelemetryService } from '@/lib/alerts/telemetry';
import { logger } from '@/lib/logger';
import { alertPerf } from '@/lib/alerts/performance';

export interface CacheStore {
  get: (key: string) => unknown;
  set: (key: string, value: unknown, tags?: string[], ttlMs?: number) => void;
}

export interface WorkerMessageHandlerContext {
  cache: CacheStore;
  cacheTagsRef: MutableRefObject<Map<string, string[]>>;
  activeCacheKeyRef: MutableRefObject<string | null>;
  buildCacheTags: (input: { data: AnalyticsResults; goals?: unknown; studentId?: string | number; includeAiTag?: boolean }) => string[];
  setResults: Dispatch<SetStateAction<AnalyticsResultsAI | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setIsAnalyzing: Dispatch<SetStateAction<boolean>>;
  alertPolicies: AlertPolicies;
  telemetryService: AlertTelemetryService;
  lastAlertsReceivedAtRef: MutableRefObject<number>;
  setWorkerReady: (value: boolean) => void;
  markWorkerReady: () => void;
  isWorkerReady: () => boolean;
  watchdogRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

export interface WorkerMessageHandlers {
  onMessage: (event: MessageEvent<AnalyticsWorkerMessage>) => void;
  onMessageError: (event: MessageEvent) => void;
}

const MAX_ALERTS_TO_STORE = 200;

type LoggerInstance = typeof logger;

const ensureLogger = (customLogger?: LoggerInstance) => customLogger ?? logger;

const handleAlertsMessage = (
  data: AnalyticsWorkerMessage,
  ctx: WorkerMessageHandlerContext,
  log: Logger
) => {
  const payload = data.payload as { alerts?: AlertEvent[]; studentId?: string; prewarm?: boolean } | undefined;
  if (!payload || !Array.isArray(payload.alerts) || payload.alerts.length === 0) {
    return;
  }

  const stopTimer = alertPerf.startTimer();
  const targetStudentId = payload.studentId ?? payload.alerts[0]?.studentId;
  if (!targetStudentId) {
    log.warn('[useAnalyticsWorker] Received alerts without studentId');
    return;
  }

  ctx.lastAlertsReceivedAtRef.current = Date.now();
  if (!payload.prewarm) {
    try {
      log.debug('[ALERTS_PIPELINE] inbound', { count: payload.alerts.length, studentId: targetStudentId });
    } catch {
      /* noop */
    }
  }

  const prior = readStoredAlerts<AlertEvent>(targetStudentId);
  const priorMap = new Map(prior.map((alert) => [alert.id, alert]));
  const combined = [...prior, ...payload.alerts];
  const dedupedWithGovernance = ctx.alertPolicies.deduplicateAlerts(combined);
  const deduped: (AlertEvent | AlertWithGovernance)[] = dedupedWithGovernance.map(({ governance, ...alert }) => ({
    ...alert,
    governance: governance
      ? {
          throttled: !!governance.throttled,
          snoozed: !!governance.snoozed,
          quietHours: !!governance.quietHours,
          capExceeded: !!governance.capExceeded,
          deduplicated: !!governance.deduplicated,
        }
      : undefined,
    status: priorMap.get(alert.id)?.status ?? alert.status,
  }));

  deduped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const newAlerts = payload.alerts.filter((alert) => !priorMap.has(alert.id));
  newAlerts.forEach((alert) => {
    try {
      const metadata = (alert.metadata ?? {}) as Record<string, unknown>;
      const thresholdAdjustments = metadata.thresholdTrace as Record<string, ThresholdAdjustmentTrace> | undefined;
      ctx.telemetryService.logAlertCreated(alert, {
        predictedRelevance: alert.confidence,
        detectorTypes: (metadata.detectorTypes as string[]) ?? undefined,
        experimentKey: typeof metadata.experimentKey === 'string' ? (metadata.experimentKey as string) : undefined,
        experimentVariant: typeof metadata.experimentVariant === 'string' ? (metadata.experimentVariant as string) : undefined,
        thresholdAdjustments,
        metadataSnapshot: alert.metadata,
      });
    } catch (logError) {
      log.warn('[useAnalyticsWorker] Failed to log alert telemetry', logError);
    }
  });

  writeStoredAlerts(targetStudentId, deduped.slice(0, MAX_ALERTS_TO_STORE));
  if (!payload.prewarm && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ALERTS_UPDATED_EVENT, { detail: { studentId: targetStudentId } }));
  }

  try {
    alertPerf.recordAlertProcessingLatency(stopTimer(), { count: payload.alerts.length });
  } catch {
    /* noop */
  }
};

const handleCompleteMessage = (
  data: AnalyticsWorkerMessage,
  ctx: WorkerMessageHandlerContext
) => {
  // Validate payload exists and is an object
  if (!data.payload || typeof data.payload !== 'object') {
    logger.warn('[workerMessageHandlers] Invalid complete message: missing or invalid payload', {
      hasPayload: !!data.payload,
      payloadType: typeof data.payload
    });
    return;
  }

  // Extract cache key with validation
  const payloadObj = data.payload as Record<string, unknown>;
  const cacheKeyFromMsg = (data.cacheKey || payloadObj?.cacheKey) as string | undefined;
  if (cacheKeyFromMsg && typeof cacheKeyFromMsg !== 'string') {
    logger.warn('[workerMessageHandlers] Invalid cache key type', { cacheKeyType: typeof cacheKeyFromMsg });
    return;
  }

  const prewarmFlag = (payloadObj?.prewarm === true);
  const shouldUpdateUi = !!cacheKeyFromMsg && cacheKeyFromMsg === ctx.activeCacheKeyRef.current && !prewarmFlag;

  if (cacheKeyFromMsg && data.payload) {
    try {
      const storedTags = ctx.cacheTagsRef.current.get(cacheKeyFromMsg);
      const derivedTags = storedTags && storedTags.length
        ? storedTags
        : ctx.buildCacheTags({ data: data.payload as AnalyticsResults });
      const tags = Array.from(new Set([...(derivedTags ?? []), 'worker']));
      ctx.cache.set(cacheKeyFromMsg, data.payload as unknown as AnalyticsResultsAI, tags);
    } catch (error) {
      logger.warn('[workerMessageHandlers] Failed to cache analytics results', {
        cacheKey: cacheKeyFromMsg,
        error
      });
    }
    ctx.cacheTagsRef.current.delete(cacheKeyFromMsg);
  }

  if (shouldUpdateUi) {
    ctx.setResults(data.payload as unknown as AnalyticsResultsAI);
    ctx.setError(null);
    ctx.setIsAnalyzing(false);
  }
};

const handleErrorMessage = (
  data: AnalyticsWorkerMessage,
  ctx: WorkerMessageHandlerContext
) => {
  if (data.cacheKey) {
    ctx.cacheTagsRef.current.delete(data.cacheKey);
  }
  ctx.setIsAnalyzing(false);

  // Extract error message with proper validation
  let errorMessage = 'Analytics worker error';
  const dataObj = data as Record<string, unknown>;
  if ('error' in dataObj && typeof dataObj.error === 'string' && dataObj.error.trim().length > 0) {
    errorMessage = dataObj.error;
  }

  ctx.setError(errorMessage);
  ctx.setResults((prev) => prev ?? ({
    patterns: [],
    correlations: [],
    environmentalCorrelations: [],
    predictiveInsights: [],
    anomalies: [],
    insights: ['Analytics temporarily unavailable.']
  } as AnalyticsResultsAI));
};

export const createWorkerMessageHandlers = (
  ctx: WorkerMessageHandlerContext,
  customLogger?: LoggerInstance
): WorkerMessageHandlers => {
  const log = ensureLogger(customLogger);

  const onMessage = (event: MessageEvent<AnalyticsWorkerMessage>) => {
    const data = event.data as AnalyticsWorkerMessage | undefined;
    if (!data) return;

    if (!ctx.isWorkerReady()) {
      ctx.markWorkerReady();
      ctx.setWorkerReady(true);
    }

    if (ctx.watchdogRef.current) {
      clearTimeout(ctx.watchdogRef.current);
      ctx.watchdogRef.current = null;
    }

    try {
      switch (data.type) {
        case 'partial':
          break;
        case 'alerts':
          handleAlertsMessage(data, ctx, log);
          break;
        case 'complete':
          handleCompleteMessage(data, ctx);
          break;
        case 'error':
          handleErrorMessage(data, ctx);
          break;
        case 'progress':
          break;
        default:
          break;
      }
    } catch (error) {
      log.error('[useAnalyticsWorker] Failed handling worker message', error);
    }
  };

  const onMessageError = (evt: MessageEvent) => {
    log.error('[useAnalyticsWorker] messageerror from analytics worker', evt);
  };

  return {
    onMessage,
    onMessageError,
  };
};
