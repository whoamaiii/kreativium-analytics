/**
 * @file src/lib/alerts/performance.ts
 *
 * Alert system performance monitoring utilities.
 *
 * Captures processing latency, sparkline generation time,
 * UI update responsiveness, memory usage hints, and throughput.
 * Lightweight by design with zero external dependencies.
 */

type NumericSeries = {
  samples: number[];
  maxSize: number;
};

function createSeries(maxSize = 512): NumericSeries {
  return { samples: [], maxSize };
}

function pushSample(series: NumericSeries, value: number): void {
  series.samples.push(value);
  if (series.samples.length > series.maxSize) {
    series.samples.splice(0, series.samples.length - series.maxSize);
  }
}

function percentile(series: NumericSeries, p: number): number | null {
  if (series.samples.length === 0) return null;
  const sorted = [...series.samples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[idx];
}

function average(series: NumericSeries): number | null {
  if (series.samples.length === 0) return null;
  const total = series.samples.reduce((acc, n) => acc + n, 0);
  return total / series.samples.length;
}

interface PerfSnapshot {
  timestamp: number;
  alertsProcessedCount: number;
  alertsProcessingP50: number | null;
  alertsProcessingP95: number | null;
  sparklineGenP50: number | null;
  sparklineGenP95: number | null;
  uiUpdateP50: number | null;
  uiUpdateP95: number | null;
  memoryMB?: number;
  recentThroughputPerMin: number;
}

interface RecordContext {
  count?: number;
}

class AlertPerformanceMonitor {
  private alertsProcessingSeries: NumericSeries = createSeries();
  private sparklineSeries: NumericSeries = createSeries();
  private uiSeries: NumericSeries = createSeries();
  private alertsProcessed = 0;
  private processedTimestamps: number[] = [];
  private lastSnapshot: PerfSnapshot | null = null;

  recordAlertProcessingLatency(ms: number, ctx?: RecordContext): void {
    pushSample(this.alertsProcessingSeries, ms);
    const count = Math.max(1, Math.floor(ctx?.count ?? 1));
    this.alertsProcessed += count;
    const now = Date.now();
    for (let i = 0; i < count; i += 1) this.processedTimestamps.push(now);
    // Trim to last 10 minutes for throughput calc
    const tenMinAgo = now - 10 * 60_000;
    while (this.processedTimestamps.length && this.processedTimestamps[0] < tenMinAgo) {
      this.processedTimestamps.shift();
    }
  }

  recordSparklineGeneration(ms: number): void {
    pushSample(this.sparklineSeries, ms);
  }

  recordUiUpdate(ms: number): void {
    pushSample(this.uiSeries, ms);
  }

  getRecentThroughputPerMin(windowMs = 60_000): number {
    const now = Date.now();
    const since = now - windowMs;
    const count = this.processedTimestamps.filter((t) => t >= since).length;
    return count / (windowMs / 60_000);
  }

  getMemoryEstimateMB(): number | undefined {
    try {
      const anyPerf: any = (globalThis as any).performance;
      if (anyPerf && anyPerf.memory && typeof anyPerf.memory.usedJSHeapSize === 'number') {
        return Math.round((anyPerf.memory.usedJSHeapSize / (1024 * 1024)) * 10) / 10;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  snapshot(): PerfSnapshot {
    const snap: PerfSnapshot = {
      timestamp: Date.now(),
      alertsProcessedCount: this.alertsProcessed,
      alertsProcessingP50: percentile(this.alertsProcessingSeries, 50),
      alertsProcessingP95: percentile(this.alertsProcessingSeries, 95),
      sparklineGenP50: percentile(this.sparklineSeries, 50),
      sparklineGenP95: percentile(this.sparklineSeries, 95),
      uiUpdateP50: percentile(this.uiSeries, 50),
      uiUpdateP95: percentile(this.uiSeries, 95),
      memoryMB: this.getMemoryEstimateMB(),
      recentThroughputPerMin: this.getRecentThroughputPerMin(),
    };
    this.lastSnapshot = snap;
    return snap;
  }

  /**
   * Very lightweight regression detector. Compares latest snapshot with previous
   * and flags if P95 latencies increase more than the given percentage.
   */
  hasLatencyRegression(thresholdPct = 50): boolean {
    if (!this.lastSnapshot) return false;
    const next = this.snapshot();
    const prev = this.lastSnapshot;
    const fields: Array<keyof PerfSnapshot> = [
      'alertsProcessingP95',
      'sparklineGenP95',
      'uiUpdateP95',
    ];
    for (const f of fields) {
      const a = (prev as any)[f] as number | null;
      const b = (next as any)[f] as number | null;
      if (a && b && a > 0) {
        const deltaPct = ((b - a) / a) * 100;
        if (deltaPct >= thresholdPct) return true;
      }
    }
    return false;
  }

  /** Utility timer wrapper for scoped measurements */
  startTimer(): () => number {
    const t0 =
      typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    return () => {
      const t1 =
        typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      return t1 - t0;
    };
  }
}

export const alertPerf = new AlertPerformanceMonitor();

export async function measureAsync<T>(
  label: 'alerts' | 'sparkline' | 'ui',
  fn: () => Promise<T>,
): Promise<T> {
  const stop = alertPerf.startTimer();
  try {
    const result = await fn();
    const ms = stop();
    if (label === 'alerts') alertPerf.recordAlertProcessingLatency(ms);
    else if (label === 'sparkline') alertPerf.recordSparklineGeneration(ms);
    else alertPerf.recordUiUpdate(ms);
    return result;
  } catch (e) {
    // Still record duration to reflect failures in metrics
    const ms = stop();
    if (label === 'alerts') alertPerf.recordAlertProcessingLatency(ms);
    else if (label === 'sparkline') alertPerf.recordSparklineGeneration(ms);
    else alertPerf.recordUiUpdate(ms);
    throw e;
  }
}

export type { PerfSnapshot };
