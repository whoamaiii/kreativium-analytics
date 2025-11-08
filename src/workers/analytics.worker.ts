/**
 * @file src/workers/analytics.worker.ts
 * 
 * This is a web worker dedicated to performing heavy analytics computations
 * in a background thread, ensuring the main UI thread remains responsive.
 * It listens for messages containing student data, runs a series of analyses,
 * and posts the results back to the main thread.
 */
import { PatternResult, CorrelationResult } from '@/lib/patternAnalysis';
import { PredictiveInsight, AnomalyDetection } from '@/lib/enhancedPatternAnalysis';
import { TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';
import {
  AnalyticsData,
  AnalyticsResults,
  AnalyticsConfiguration,
  WorkerCacheEntry,
  AnalyticsWorkerMessage,
  WorkerIncomingMessage,
  isInsightsWorkerTask,
  isCacheControlMessage,
  isGameEventMessage,
  isGameSessionMessage,
  isAnalyticsDataMessage,
} from '@/types/analytics';
import { createCachedPatternAnalysis } from '@/lib/cachedPatternAnalysis';
import { logger } from '@/lib/logger';
import { generateInsightsFromWorkerInputs } from '@/lib/insights';
import { computeInsights } from '@/lib/insights/unified';
import { ANALYTICS_CONFIG, analyticsConfig } from '@/lib/analyticsConfig';
import { generateAnalyticsSummary } from '@/lib/analyticsSummary';
import { AlertDetectionEngine } from '@/lib/alerts/engine';
import { BaselineService } from '@/lib/alerts/baseline';
import type { AlertEvent } from '@/lib/alerts/types';

// Type-safe wrapper for worker postMessage
function sendMessage(message: AnalyticsWorkerMessage): void {
  self.postMessage(message);
}

// Worker cache TTL source: cache.ttl from central analytics config (ms). Safe fallback applied.
let workerCacheTTL = (ANALYTICS_CONFIG.cache.ttl ?? 300_000); // default from config, safe fallback 300s
// Worker cache max size source: cache.maxSize from central analytics config. Safe fallback applied.
let workerCacheMaxSize = (ANALYTICS_CONFIG.cache.maxSize ?? 200); // soft cap, overridden by config if provided
const insertionOrder: string[] = []; // FIFO order for eviction

// Create a simple cache implementation for the worker
const workerCache = {
  storage: new Map<string, WorkerCacheEntry>(),
  
  get(key: string): unknown | undefined {
    const entry = this.storage.get(key);
    if (entry && entry.expires > Date.now()) {
      return entry.data;
    }
    // Expired or missing: ensure removal
    this.storage.delete(key);
    return undefined;
  },
  
  set(key: string, value: unknown, tags: string[] = []): void {
    // Insert/update
    if (!this.storage.has(key)) {
      insertionOrder.push(key);
    }
    this.storage.set(key, {
      data: value,
      expires: Date.now() + workerCacheTTL,
      tags
    });
    // Evict oldest until under max size
    while (insertionOrder.length > workerCacheMaxSize) {
      const oldestKey = insertionOrder.shift();
      if (oldestKey) {
        this.storage.delete(oldestKey);
      }
    }
  },
  
  has(key: string): boolean {
    return this.get(key) !== undefined;
  },
  
  invalidateByTag(tag: string): number {
    let count = 0;
    for (const [key, entry] of this.storage.entries()) {
      if (entry.tags && entry.tags.includes(tag)) {
        this.storage.delete(key);
        count++;
      }
    }
    if (count > 0) {
      // Rebuild insertion order without deleted keys
      const remaining = insertionOrder.filter(k => this.storage.has(k));
      insertionOrder.length = 0;
      insertionOrder.push(...remaining);
    }
    return count;
  },

  clearAll(): number {
    const count = this.storage.size;
    this.storage.clear();
    insertionOrder.length = 0;
    return count;
  },

  clearByStudentId(studentId: string): number {
    return this.invalidateByTag(`student-${studentId}`);
  },

  clearByPattern(pattern: RegExp): number {
    let count = 0;
    for (const key of Array.from(this.storage.keys())) {
      if (pattern.test(key)) {
        this.storage.delete(key);
        count++;
      }
    }
    const remaining = insertionOrder.filter(k => this.storage.has(k));
    insertionOrder.length = 0;
    insertionOrder.push(...remaining);
    return count;
  },

  getStats(): { size: number } {
    return { size: this.storage.size };
  },

  // Utilities required by CachedPatternAnalysisEngine
  getDataFingerprint(data: unknown): string {
    const stringify = (obj: unknown): string => {
      if (obj === null || obj === undefined) return 'null';
      if (typeof obj !== 'object') return String(obj);
      if (Array.isArray(obj)) return `[${obj.map(stringify).join(',')}]`;
      const rec = obj as Record<string, unknown>;
      const keys = Object.keys(rec).sort();
      return `{${keys.map(k => `${k}:${stringify(rec[k])}`).join(',')}}`;
    };
    const str = stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  },

  createKey(prefix: string, params: Record<string, unknown>): string {
    const sorted = Object.keys(params).sort().map(k => `${k}:${JSON.stringify(params[k])}`).join(':');
    return `${prefix}:${sorted}`;
  },
  
};

// Create cached pattern analysis instance
const cachedAnalysis = createCachedPatternAnalysis(workerCache);

const baselineService = new BaselineService();
const alertDetectionEngine = new AlertDetectionEngine({ baselineService });

function extractStudentId(data: AnalyticsData): string | null {
  const entryId = data.entries?.[0]?.studentId;
  if (entryId) return entryId;
  const emotionId = data.emotions?.[0]?.studentId;
  if (emotionId) return emotionId;
  const sensoryId = data.sensoryInputs?.[0]?.studentId;
  if (sensoryId) return sensoryId;
  return null;
}

function runAlertDetection(data: AnalyticsData, opts?: { prewarm?: boolean }): AlertEvent[] {
  try {
    const studentId = extractStudentId(data);
    if (!studentId) return [];
    const baseline = baselineService.updateBaseline({
      studentId,
      emotions: data.emotions,
      sensory: data.sensoryInputs,
      tracking: data.entries,
    });
    return alertDetectionEngine.runDetection({
      studentId,
      emotions: data.emotions,
      sensory: data.sensoryInputs,
      tracking: data.entries,
      baseline,
      now: new Date(),
    }).map((alert) => ({
      ...alert,
      metadata: {
        ...(alert.metadata ?? {}),
        prewarm: opts?.prewarm ?? false,
      },
    }));
  } catch (error) {
    try {
      logger.warn('[analytics.worker] Alert detection failed', error as Error);
    } catch {
      /* noop */
    }
    return [];
  }
}

/**
 * Compute a stable hash for the subset of config that affects analysis output.
 */
const getConfigHash = (cfg: AnalyticsConfiguration | null): string => {
  if (!cfg) return 'no-config';
  const subset = {
    patternAnalysis: cfg.patternAnalysis,
    enhancedAnalysis: cfg.enhancedAnalysis,
    timeWindows: cfg.timeWindows,
    alertSensitivity: cfg.alertSensitivity
  };
  // Reuse workerCache fingerprint utility by temporary object
  const stringify = (obj: unknown): string => {
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj !== 'object') return String(obj);
    if (Array.isArray(obj)) return `[${obj.map(stringify).join(',')}]`;
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    return `{${keys.map(k => `${k}:${stringify((obj as Record<string, unknown>)[k])}`).join(',')}}`;
  };
  const str = stringify(subset);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

// Outgoing message queue to avoid flooding the main thread with messages
const outgoingQueue: AnalyticsWorkerMessage[] = [];
let flushScheduled = false;
const enqueueMessage = (msg: AnalyticsWorkerMessage) => {
  outgoingQueue.push(msg);
  if (!flushScheduled) {
    flushScheduled = true;
    setTimeout(() => {
      try {
        while (outgoingQueue.length) {
          const message = outgoingQueue.shift();
          if (message) sendMessage(message);
        }
      } finally {
        flushScheduled = false;
      }
    }, 30);
  }
};

// Configuration passed from main thread
let currentConfig: AnalyticsConfiguration | null = null;

// Types are now imported from @/types/analytics
export type { AnalyticsData, AnalyticsResults } from '@/types/analytics';


/**
 * Main message handler for the worker.
 * This function is triggered when the main thread calls `worker.postMessage()`.
 * It orchestrates the analysis process and posts the results back.
 */
export async function handleMessage(e: MessageEvent<WorkerIncomingMessage>) {
  const msg = e.data;

  // Handle game event telemetry
  if (isGameEventMessage(msg)) {
    try {
      const ev = msg.payload;
      const key = `game:event:count:${ev.kind}`;
      const prev = (workerCache.get(key) as number | undefined) ?? 0;
      workerCache.set(key, prev + 1, ['game-events'], 300000);
    } catch {}
    return;
  }

  // Handle game session summary
  if (isGameSessionMessage(msg)) {
    try {
      const key = 'game:session:last';
      workerCache.set(key, msg.payload, ['game-session'], 600000);
      // Optionally surface via alerts channel for UI hooks wanting summaries quickly
      enqueueMessage({ type: 'alerts', payload: { alerts: [], prewarm: true } });
    } catch {}
    return;
  }

  // Handle cache control commands
  if (isCacheControlMessage(msg)) {
    try {
      if (msg.type === 'CACHE/CLEAR_ALL') {
        const patternsCleared = (() => { try { return cachedAnalysis.invalidateAllCache(); } catch { return 0; } })();
        const cacheCleared = workerCache.clearAll();
        enqueueMessage({ type: 'CACHE/CLEAR_DONE', payload: { scope: 'all', patternsCleared, cacheCleared, stats: workerCache.getStats() } });
      } else if (msg.type === 'CACHE/CLEAR_STUDENT') {
        const patternsCleared = (() => { try { return cachedAnalysis.invalidateStudentCache(msg.studentId); } catch { return 0; } })();
        const cacheCleared = workerCache.clearByStudentId(msg.studentId);
        enqueueMessage({ type: 'CACHE/CLEAR_DONE', payload: { scope: 'student', studentId: msg.studentId, patternsCleared, cacheCleared, stats: workerCache.getStats() } });
      } else if (msg.type === 'CACHE/CLEAR_PATTERNS') {
        const patternsCleared = (() => { try { return cachedAnalysis.invalidateAllCache(); } catch { return 0; } })();
        enqueueMessage({ type: 'CACHE/CLEAR_DONE', payload: { scope: 'patterns', patternsCleared, stats: workerCache.getStats() } });
      }
    } catch (err) {
      try { logger.error('[analytics.worker] Cache clear command failed', err as Error); } catch {}
    }
    return;
  }

  // Parse message into AnalyticsData
  let filteredData: AnalyticsData;
  let isPrewarm = false;

  if (isInsightsWorkerTask(msg)) {
    // Typed task envelope from buildInsightsTask
    const { inputs, config, prewarm } = msg.payload;
    isPrewarm = !!prewarm;
    filteredData = {
      entries: inputs.entries,
      emotions: inputs.emotions,
      sensoryInputs: inputs.sensoryInputs,
      goals: inputs.goals ?? [],
      cacheKey: msg.cacheKey,
      config: config ?? null,
    };
    // Optionally honor ttlSeconds from task by updating per-message TTL
    if (typeof msg.ttlSeconds === 'number' && msg.ttlSeconds > 0) {
      workerCacheTTL = Math.max(1000, Math.floor(msg.ttlSeconds * 1000));
    }
  } else if (isAnalyticsDataMessage(msg)) {
    // Legacy direct data posting
    filteredData = msg;
  } else {
    // Unknown message type - ignore
    return;
  }

  // Diagnostic log: message received - use cache to limit verbosity
  try {
    const logKey = `worker_msg_${filteredData.cacheKey || 'nocache'}_${new Date().getMinutes()}`;
    if (!workerCache.has(logKey)) {
      logger.debug('[analytics.worker] onmessage', {
        hasConfig: !!filteredData.config,
        cacheKey: filteredData.cacheKey ?? null,
        entries: filteredData.entries.length,
        emotions: filteredData.emotions.length,
        sensory: filteredData.sensoryInputs.length,
        goals: filteredData.goals?.length ?? 0,
      });
      workerCache.set(logKey, true, ['logging']);
    }
  } catch (e) {
    try { logger.warn('[analytics.worker] Diagnostic logging failed', e as Error); } catch {}
  }

  // Update configuration if provided
  if (filteredData.config) {
    currentConfig = filteredData.config;
    if (typeof currentConfig.cache?.ttl === 'number' && currentConfig.cache.ttl > 0) {
      workerCacheTTL = currentConfig.cache.ttl;
    }
    if (typeof currentConfig.cache?.maxSize === 'number' && currentConfig.cache.maxSize > 0) {
      workerCacheMaxSize = currentConfig.cache.maxSize;
      // Trim immediately if oversize
      while (insertionOrder.length > workerCacheMaxSize) {
        const oldestKey = insertionOrder.shift();
        if (oldestKey) {
          workerCache.storage.delete(oldestKey);
        }
      }
    }
  }

// Early exit only when absolutely no data is present.
// Previously, we exited when emotions and sensoryInputs were empty, which
// incorrectly skipped correlation analysis based solely on tracking entries.
// Now we require that all sources are empty before returning.
  if (
    (filteredData.emotions?.length ?? 0) === 0 &&
    (filteredData.sensoryInputs?.length ?? 0) === 0 &&
    (filteredData.entries?.length ?? 0) === 0
  ) {
    enqueueMessage({
      type: 'complete',
      cacheKey: filteredData.cacheKey ?? undefined,
      payload: {
        patterns: [],
        correlations: [],
        predictiveInsights: [],
        anomalies: [],
        insights: [],
        cacheKey: filteredData.cacheKey ?? undefined,
        updatedCharts: ['insightList']
      },
      chartsUpdated: ['insightList']
    });
    return;
  }

try {
// Use configured time window or default from central config
    // Analysis window source: timeWindows.defaultAnalysisDays from runtime config; fallback to defaults.
    // This avoids hardcoding and keeps behavior environment-tunable (Task 8, rule j9uS...).
    const timeWindow = currentConfig?.timeWindows?.defaultAnalysisDays ?? ANALYTICS_CONFIG.timeWindows.defaultAnalysisDays;

    // Progress heartbeat: start
    enqueueMessage({ type: 'progress', cacheKey: filteredData.cacheKey, progress: { stage: 'start', percent: 5 } });

    const emotionPatterns = filteredData.emotions.length > 0
      ? cachedAnalysis.analyzeEmotionPatterns(filteredData.emotions, timeWindow)
      : [];
    const sensoryPatterns = filteredData.sensoryInputs.length > 0
      ? cachedAnalysis.analyzeSensoryPatterns(filteredData.sensoryInputs, timeWindow)
      : [];
    
    const patterns = [...emotionPatterns, ...sensoryPatterns];

    // Send partial update for patterns
    enqueueMessage({
      type: 'partial',
      cacheKey: filteredData.cacheKey,
      payload: {
        patterns,
        cacheKey: filteredData.cacheKey,
        updatedCharts: ['patternHighlights']
      },
      chartsUpdated: ['patternHighlights'],
      progress: { stage: 'patterns', percent: 30 }
    });

    let correlations: CorrelationResult[] = [];
    // Correlation threshold source: analytics.MIN_TRACKING_FOR_CORRELATION from runtime config.
    const minForCorrelation = currentConfig?.analytics?.MIN_TRACKING_FOR_CORRELATION ?? ANALYTICS_CONFIG.analytics.MIN_TRACKING_FOR_CORRELATION;
    if (filteredData.entries.length >= minForCorrelation) {
      correlations = cachedAnalysis.analyzeEnvironmentalCorrelations(filteredData.entries);
    }

    // Send partial update for correlations
    enqueueMessage({
      type: 'partial',
      cacheKey: filteredData.cacheKey,
      payload: {
        correlations,
        environmentalCorrelations: correlations,
        cacheKey: filteredData.cacheKey,
        updatedCharts: ['correlationMatrix']
      },
      chartsUpdated: ['correlationMatrix'],
      progress: { stage: 'correlations', percent: 55 }
    });

    let predictiveInsights: PredictiveInsight[] = [];
    let anomalies: AnomalyDetection[] = [];
    // Enhanced analysis threshold source: analytics.MIN_TRACKING_FOR_ENHANCED from runtime config.
    const minForEnhanced = currentConfig?.analytics?.MIN_TRACKING_FOR_ENHANCED ?? ANALYTICS_CONFIG.analytics.MIN_TRACKING_FOR_ENHANCED;
    if (filteredData.entries.length >= minForEnhanced) {
      predictiveInsights = await cachedAnalysis.generatePredictiveInsights(
        filteredData.emotions,
        filteredData.sensoryInputs,
        filteredData.entries,
        filteredData.goals ?? []
      );

      // Send partial update for predictive insights
      enqueueMessage({
        type: 'partial',
        cacheKey: filteredData.cacheKey,
        payload: {
          predictiveInsights,
          cacheKey: filteredData.cacheKey,
          updatedCharts: ['predictiveTimeline']
        },
        chartsUpdated: ['predictiveTimeline'],
        progress: { stage: 'predictiveInsights', percent: 75 }
      });

      anomalies = cachedAnalysis.detectAnomalies(
        filteredData.emotions,
        filteredData.sensoryInputs,
        filteredData.entries
      );

      // Send partial update for anomalies
      enqueueMessage({
        type: 'partial',
        cacheKey: filteredData.cacheKey,
        payload: {
          anomalies,
          cacheKey: filteredData.cacheKey,
          updatedCharts: ['anomalyTimeline']
        },
        chartsUpdated: ['anomalyTimeline'],
        progress: { stage: 'anomalies', percent: 85 }
      });
    }

    // Final compute via unified pipeline (ensures consistent goal handling)
    const unified = await computeInsights({
      entries: filteredData.entries,
      emotions: filteredData.emotions,
      sensoryInputs: filteredData.sensoryInputs,
      goals: filteredData.goals ?? [],
    }, { config: currentConfig ?? undefined });

    const results: AnalyticsResults = {
      ...unified,
      suggestedInterventions: unified.suggestedInterventions ?? [],
      cacheKey: filteredData.cacheKey,
      updatedCharts: ['insightList']
    };

    const detectionAlerts = runAlertDetection(filteredData, { prewarm: isPrewarm });
    const detectionStudentId = extractStudentId(filteredData);
    if (detectionAlerts.length) {
      enqueueMessage({
        type: 'alerts',
        cacheKey: filteredData.cacheKey,
        payload: {
          alerts: detectionAlerts,
          studentId: detectionStudentId ?? undefined,
          prewarm: isPrewarm,
        },
      });
    }

    // Post the final results back to the main thread.
    const completePayload: AnalyticsResults & { prewarm?: boolean } = { ...results, prewarm: isPrewarm };
    enqueueMessage({
      type: 'complete',
      cacheKey: filteredData.cacheKey,
      payload: completePayload,
      chartsUpdated: ['insightList'],
      progress: { stage: 'complete', percent: 100 },
    });

  } catch (error) {
    try {
    logger.error('[analytics.worker] error', error);
    } catch (e) {
      /* ignore logging failure */
    }
    logger.error('Error in analytics worker:', error);
    // Post an error message back to the main thread for graceful error handling.
    // Include empty results to prevent UI errors
    enqueueMessage({
      type: 'error',
      cacheKey: filteredData.cacheKey,
      error: 'Failed to analyze data.',
      payload: {
        patterns: [],
        correlations: [],
        predictiveInsights: [],
        anomalies: [],
        insights: ['An error occurred during analysis. Please try again.'],
        cacheKey: filteredData.cacheKey,
        updatedCharts: ['insightList']
      },
      chartsUpdated: ['insightList']
    });
  }
}

// Attach the handler to self.onmessage for the worker context
if (typeof self !== 'undefined' && 'onmessage' in self) {
  // Global safety nets to surface runtime failures without crashing silently
  try {
    self.addEventListener('error', (e: ErrorEvent) => {
      try {
        sendMessage({
          type: 'error',
          error: e.message,
          cacheKey: undefined,
          payload: {
            patterns: [],
            correlations: [],
            predictiveInsights: [],
            anomalies: [],
            insights: ['Worker runtime error encountered.'],
            suggestedInterventions: [],
            updatedCharts: ['insightList'],
          },
        });
      } catch (err) { try { logger.warn('[analytics.worker] Failed to post error message', err as Error); } catch {} }
    });

    self.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
      const msg = typeof e?.reason === 'string' ? e.reason : (e?.reason?.message ?? 'Unhandled rejection in worker');
      try {
        sendMessage({
          type: 'error',
          error: String(msg),
          cacheKey: undefined,
          payload: {
            patterns: [],
            correlations: [],
            predictiveInsights: [],
            anomalies: [],
            insights: ['Worker unhandled rejection.'],
            suggestedInterventions: [],
            updatedCharts: ['insightList'],
          },
        });
      } catch (err) { try { logger.warn('[analytics.worker] Failed to post rejection message', err as Error); } catch {} }
    });
  } catch (e) { try { logger.warn('[analytics.worker] Failed to setup error handlers', e as Error); } catch {} }

  // Signal readiness so main thread can flush any queued tasks
  try {
    sendMessage({ type: 'progress', progress: { stage: 'ready', percent: 1 } });
  } catch (e) { try { logger.warn('[analytics.worker] Failed to post ready signal', e as Error); } catch {} }

  self.onmessage = handleMessage;
}
