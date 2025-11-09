import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { ALERTS_UPDATED_EVENT, readStoredAlerts, writeStoredAlerts } from '@/lib/analytics/workerManager';
import type { AnalyticsResults, AnalyticsWorkerMessage } from '@/types/analytics';
import type { AnalyticsResultsAI } from '@/lib/analysis';
import type { AlertEvent, AlertWithGovernance, ThresholdAdjustmentTrace } from '@/lib/alerts/types';
import type { AlertPolicies } from '@/lib/alerts/policies';
import type { AlertTelemetryService } from '@/lib/alerts/telemetry';
import { logger } from '@/lib/logger';
import { alertPerf } from '@/lib/alerts/performance';
import {
  parseWorkerResponse,
  isAlertsResponse,
  isCompleteResponse,
  isErrorResponse,
  isPartialResponse,
  isProgressResponse,
  type WorkerResponseMessage,
} from '@/types/worker-messages';
import {
  safeGetStringMetadata,
  safeGetArrayMetadata,
  safeGetObjectMetadata,
} from '@/lib/utils/config-accessors';

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
  data: WorkerResponseMessage,
  ctx: WorkerMessageHandlerContext,
  log: LoggerInstance
) => {
  // Type guard ensures data.type === 'alerts' and payload is properly typed
  if (!isAlertsResponse(data)) {
    log.warn('[workerMessageHandlers] handleAlertsMessage called with non-alerts message');
    return;
  }

  const payload = data.payload;
  if (!Array.isArray(payload.alerts) || payload.alerts.length === 0) {
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
      // Use type-safe metadata accessors instead of unsafe casts
      const metadata = alert.metadata;
      const thresholdAdjustments = safeGetObjectMetadata<Record<string, ThresholdAdjustmentTrace>>(metadata, 'thresholdTrace');
      const detectorTypes = safeGetArrayMetadata<string>(metadata, 'detectorTypes');
      const experimentKey = safeGetStringMetadata(metadata, 'experimentKey');
      const experimentVariant = safeGetStringMetadata(metadata, 'experimentVariant');

      ctx.telemetryService.logAlertCreated(alert, {
        predictedRelevance: alert.confidence,
        detectorTypes,
        experimentKey,
        experimentVariant,
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
  data: WorkerResponseMessage,
  ctx: WorkerMessageHandlerContext
) => {
  // Type guard ensures data.type === 'complete' and payload is properly typed
  if (!isCompleteResponse(data)) {
    logger.warn('[workerMessageHandlers] handleCompleteMessage called with non-complete message');
    return;
  }

  const cacheKeyFromMsg = data.cacheKey || data.payload.cacheKey;
  const prewarmFlag = data.payload.prewarm === true;
  const shouldUpdateUi = !!cacheKeyFromMsg && cacheKeyFromMsg === ctx.activeCacheKeyRef.current && !prewarmFlag;

  if (cacheKeyFromMsg && data.payload) {
    try {
      const storedTags = ctx.cacheTagsRef.current.get(cacheKeyFromMsg);
      const derivedTags = storedTags && storedTags.length
        ? storedTags
        : ctx.buildCacheTags({ data: data.payload as AnalyticsResults });
      const tags = Array.from(new Set([...(derivedTags ?? []), 'worker']));
      ctx.cache.set(cacheKeyFromMsg, data.payload as unknown as AnalyticsResultsAI, tags);
    } catch {
      /* noop */
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
  data: WorkerResponseMessage,
  ctx: WorkerMessageHandlerContext
) => {
  // Type guard ensures data.type === 'error' and error field is present
  if (!isErrorResponse(data)) {
    logger.warn('[workerMessageHandlers] handleErrorMessage called with non-error message');
    return;
  }

  if (data.cacheKey) {
    ctx.cacheTagsRef.current.delete(data.cacheKey);
  }
  ctx.setIsAnalyzing(false);
  ctx.setError(data.error || 'Analytics worker error');
  ctx.setResults((prev) => prev ?? ({
    patterns: [],
    correlations: [],
    environmentalCorrelations: [],
    predictiveInsights: [],
    anomalies: [],
    insights: ['Analytics temporarily unavailable.'],
    suggestedInterventions: [],
  } as AnalyticsResultsAI));
};

export const createWorkerMessageHandlers = (
  ctx: WorkerMessageHandlerContext,
  customLogger?: LoggerInstance
): WorkerMessageHandlers => {
  const log = ensureLogger(customLogger);

  const onMessage = (event: MessageEvent<AnalyticsWorkerMessage>) => {
    // Parse and validate incoming message with runtime type guards
    const data = parseWorkerResponse(event.data);
    if (!data) {
      log.warn('[workerMessageHandlers] Received invalid worker response message', { data: event.data });
      return;
    }

    if (!ctx.isWorkerReady()) {
      ctx.markWorkerReady();
      ctx.setWorkerReady(true);
    }

    if (ctx.watchdogRef.current) {
      clearTimeout(ctx.watchdogRef.current);
      ctx.watchdogRef.current = null;
    }

    try {
      // Use discriminated union for type-safe message handling
      if (isAlertsResponse(data)) {
        handleAlertsMessage(data, ctx, log);
      } else if (isCompleteResponse(data)) {
        handleCompleteMessage(data, ctx);
      } else if (isErrorResponse(data)) {
        handleErrorMessage(data, ctx);
      } else if (isPartialResponse(data)) {
        // Partial updates not currently handled in UI
        log.debug('[workerMessageHandlers] Received partial update', { chartsUpdated: data.chartsUpdated });
      } else if (isProgressResponse(data)) {
        // Progress updates not currently handled in UI
        log.debug('[workerMessageHandlers] Received progress update', { progress: data.progress });
      } else {
        // Other message types (e.g., CACHE/CLEAR_DONE, game events) - log and ignore
        log.debug('[workerMessageHandlers] Received non-analytics message', { type: data.type });
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
