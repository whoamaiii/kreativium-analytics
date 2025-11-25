/**
 * Analytics Metrics Module
 *
 * @module analytics/metrics
 *
 * @description Comprehensive metrics tracking for the analytics system.
 * Tracks performance, usage, and health metrics across all analytics components.
 *
 * **Metric Categories**:
 * - Performance: Latency, throughput, queue depths
 * - Cache: Hit rates, eviction counts, memory usage
 * - Worker: Message counts, processing times, errors
 * - Analysis: Pattern counts, correlation strengths, insights generated
 */

import { logger } from '@/lib/logger';

/**
 * Metric point with timestamp
 */
interface MetricPoint {
  value: number;
  timestamp: number;
}

/**
 * Rolling window statistics
 */
interface RollingStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Analytics metrics snapshot
 */
export interface AnalyticsMetricsSnapshot {
  timestamp: number;
  uptime: number;

  // Analysis metrics
  analysis: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    avgDurationMs: number;
    byEngine: {
      heuristic: { count: number; avgMs: number };
      llm: { count: number; avgMs: number };
    };
  };

  // Cache metrics
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    evictions: number;
    size: number;
    memoryEstimateKb: number;
  };

  // Worker metrics
  worker: {
    messagesProcessed: number;
    messagesQueued: number;
    avgProcessingMs: number;
    errors: number;
    restarts: number;
  };

  // Pattern analysis metrics
  patterns: {
    emotionPatternsFound: number;
    sensoryPatternsFound: number;
    correlationsFound: number;
    avgConfidence: number;
    avgProcessingMs: number;
  };

  // Alert metrics
  alerts: {
    generated: number;
    deduplicated: number;
    delivered: number;
    avgLatencyMs: number;
  };

  // Latency percentiles
  latency: RollingStats;
}

/**
 * Internal metrics state
 */
interface MetricsState {
  startTime: number;
  analysis: {
    total: number;
    successful: number;
    failed: number;
    heuristicCount: number;
    heuristicTotalMs: number;
    llmCount: number;
    llmTotalMs: number;
  };
  cache: {
    hits: number;
    misses: number;
    evictions: number;
    size: number;
    memoryEstimateKb: number;
  };
  worker: {
    messagesProcessed: number;
    messagesQueued: number;
    totalProcessingMs: number;
    errors: number;
    restarts: number;
  };
  patterns: {
    emotionPatternsFound: number;
    sensoryPatternsFound: number;
    correlationsFound: number;
    totalConfidence: number;
    confidenceCount: number;
    totalProcessingMs: number;
    processingCount: number;
  };
  alerts: {
    generated: number;
    deduplicated: number;
    delivered: number;
    totalLatencyMs: number;
  };
  latencySamples: MetricPoint[];
}

// Rolling window size for latency samples
const LATENCY_WINDOW_SIZE = 1000;
const LATENCY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

class AnalyticsMetricsService {
  private state: MetricsState;
  private listeners: Set<(snapshot: AnalyticsMetricsSnapshot) => void> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): MetricsState {
    return {
      startTime: Date.now(),
      analysis: {
        total: 0,
        successful: 0,
        failed: 0,
        heuristicCount: 0,
        heuristicTotalMs: 0,
        llmCount: 0,
        llmTotalMs: 0,
      },
      cache: {
        hits: 0,
        misses: 0,
        evictions: 0,
        size: 0,
        memoryEstimateKb: 0,
      },
      worker: {
        messagesProcessed: 0,
        messagesQueued: 0,
        totalProcessingMs: 0,
        errors: 0,
        restarts: 0,
      },
      patterns: {
        emotionPatternsFound: 0,
        sensoryPatternsFound: 0,
        correlationsFound: 0,
        totalConfidence: 0,
        confidenceCount: 0,
        totalProcessingMs: 0,
        processingCount: 0,
      },
      alerts: {
        generated: 0,
        deduplicated: 0,
        delivered: 0,
        totalLatencyMs: 0,
      },
      latencySamples: [],
    };
  }

  // Analysis metrics
  recordAnalysisStart(): void {
    this.state.analysis.total++;
  }

  recordAnalysisSuccess(durationMs: number, engine: 'heuristic' | 'llm'): void {
    this.state.analysis.successful++;
    this.addLatencySample(durationMs);

    if (engine === 'heuristic') {
      this.state.analysis.heuristicCount++;
      this.state.analysis.heuristicTotalMs += durationMs;
    } else {
      this.state.analysis.llmCount++;
      this.state.analysis.llmTotalMs += durationMs;
    }
  }

  recordAnalysisFailure(): void {
    this.state.analysis.failed++;
  }

  // Cache metrics
  recordCacheHit(): void {
    this.state.cache.hits++;
  }

  recordCacheMiss(): void {
    this.state.cache.misses++;
  }

  recordCacheEviction(): void {
    this.state.cache.evictions++;
  }

  updateCacheSize(size: number, memoryKb?: number): void {
    this.state.cache.size = size;
    if (memoryKb !== undefined) {
      this.state.cache.memoryEstimateKb = memoryKb;
    }
  }

  // Worker metrics
  recordWorkerMessage(): void {
    this.state.worker.messagesProcessed++;
  }

  recordWorkerProcessing(durationMs: number): void {
    this.state.worker.totalProcessingMs += durationMs;
    this.addLatencySample(durationMs);
  }

  updateWorkerQueue(size: number): void {
    this.state.worker.messagesQueued = size;
  }

  recordWorkerError(): void {
    this.state.worker.errors++;
  }

  recordWorkerRestart(): void {
    this.state.worker.restarts++;
  }

  // Pattern metrics
  recordPatterns(emotion: number, sensory: number): void {
    this.state.patterns.emotionPatternsFound += emotion;
    this.state.patterns.sensoryPatternsFound += sensory;
  }

  recordCorrelations(count: number): void {
    this.state.patterns.correlationsFound += count;
  }

  recordPatternConfidence(confidence: number): void {
    this.state.patterns.totalConfidence += confidence;
    this.state.patterns.confidenceCount++;
  }

  recordPatternProcessing(durationMs: number): void {
    this.state.patterns.totalProcessingMs += durationMs;
    this.state.patterns.processingCount++;
  }

  // Alert metrics
  recordAlertGenerated(): void {
    this.state.alerts.generated++;
  }

  recordAlertDeduplicated(): void {
    this.state.alerts.deduplicated++;
  }

  recordAlertDelivered(latencyMs: number): void {
    this.state.alerts.delivered++;
    this.state.alerts.totalLatencyMs += latencyMs;
  }

  // Latency tracking
  private addLatencySample(durationMs: number): void {
    const now = Date.now();
    this.state.latencySamples.push({ value: durationMs, timestamp: now });

    // Trim old samples
    const cutoff = now - LATENCY_WINDOW_MS;
    while (
      this.state.latencySamples.length > LATENCY_WINDOW_SIZE ||
      (this.state.latencySamples.length > 0 && this.state.latencySamples[0].timestamp < cutoff)
    ) {
      this.state.latencySamples.shift();
    }
  }

  private calculateRollingStats(): RollingStats {
    const samples = this.state.latencySamples;
    if (samples.length === 0) {
      return {
        count: 0,
        sum: 0,
        min: 0,
        max: 0,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const values = samples.map((s) => s.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      sum,
      min: values[0],
      max: values[values.length - 1],
      avg: sum / values.length,
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)],
    };
  }

  // Snapshot generation
  getSnapshot(): AnalyticsMetricsSnapshot {
    const s = this.state;
    const now = Date.now();

    const analysisAvgMs =
      s.analysis.successful > 0
        ? (s.analysis.heuristicTotalMs + s.analysis.llmTotalMs) / s.analysis.successful
        : 0;

    return {
      timestamp: now,
      uptime: now - s.startTime,

      analysis: {
        total: s.analysis.total,
        successful: s.analysis.successful,
        failed: s.analysis.failed,
        successRate: s.analysis.total > 0 ? s.analysis.successful / s.analysis.total : 0,
        avgDurationMs: Math.round(analysisAvgMs),
        byEngine: {
          heuristic: {
            count: s.analysis.heuristicCount,
            avgMs:
              s.analysis.heuristicCount > 0
                ? Math.round(s.analysis.heuristicTotalMs / s.analysis.heuristicCount)
                : 0,
          },
          llm: {
            count: s.analysis.llmCount,
            avgMs:
              s.analysis.llmCount > 0 ? Math.round(s.analysis.llmTotalMs / s.analysis.llmCount) : 0,
          },
        },
      },

      cache: {
        hits: s.cache.hits,
        misses: s.cache.misses,
        hitRate: s.cache.hits + s.cache.misses > 0 ? s.cache.hits / (s.cache.hits + s.cache.misses) : 0,
        evictions: s.cache.evictions,
        size: s.cache.size,
        memoryEstimateKb: s.cache.memoryEstimateKb,
      },

      worker: {
        messagesProcessed: s.worker.messagesProcessed,
        messagesQueued: s.worker.messagesQueued,
        avgProcessingMs:
          s.worker.messagesProcessed > 0
            ? Math.round(s.worker.totalProcessingMs / s.worker.messagesProcessed)
            : 0,
        errors: s.worker.errors,
        restarts: s.worker.restarts,
      },

      patterns: {
        emotionPatternsFound: s.patterns.emotionPatternsFound,
        sensoryPatternsFound: s.patterns.sensoryPatternsFound,
        correlationsFound: s.patterns.correlationsFound,
        avgConfidence:
          s.patterns.confidenceCount > 0
            ? s.patterns.totalConfidence / s.patterns.confidenceCount
            : 0,
        avgProcessingMs:
          s.patterns.processingCount > 0
            ? Math.round(s.patterns.totalProcessingMs / s.patterns.processingCount)
            : 0,
      },

      alerts: {
        generated: s.alerts.generated,
        deduplicated: s.alerts.deduplicated,
        delivered: s.alerts.delivered,
        avgLatencyMs:
          s.alerts.delivered > 0 ? Math.round(s.alerts.totalLatencyMs / s.alerts.delivered) : 0,
      },

      latency: this.calculateRollingStats(),
    };
  }

  // Subscription for real-time updates
  subscribe(callback: (snapshot: AnalyticsMetricsSnapshot) => void): () => void {
    this.listeners.add(callback);

    // Start interval if first listener
    if (this.listeners.size === 1 && !this.intervalId) {
      this.intervalId = setInterval(() => {
        const snapshot = this.getSnapshot();
        this.listeners.forEach((cb) => {
          try {
            cb(snapshot);
          } catch (e) {
            logger.debug('[analyticsMetrics] Listener callback failed', { error: e });
          }
        });
      }, 10000); // Every 10 seconds
    }

    return () => {
      this.listeners.delete(callback);

      // Stop interval if no listeners
      if (this.listeners.size === 0 && this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    };
  }

  // Reset all metrics
  reset(): void {
    this.state = this.createInitialState();
    logger.info('[analyticsMetrics] Metrics reset');
  }
}

// Singleton instance
export const analyticsMetrics = new AnalyticsMetricsService();

/**
 * Convenience function to record a complete analysis cycle
 */
export function recordAnalysisCycle(
  success: boolean,
  durationMs: number,
  engine: 'heuristic' | 'llm',
  patterns?: { emotion: number; sensory: number; correlations: number }
): void {
  analyticsMetrics.recordAnalysisStart();

  if (success) {
    analyticsMetrics.recordAnalysisSuccess(durationMs, engine);
    if (patterns) {
      analyticsMetrics.recordPatterns(patterns.emotion, patterns.sensory);
      analyticsMetrics.recordCorrelations(patterns.correlations);
    }
  } else {
    analyticsMetrics.recordAnalysisFailure();
  }
}
