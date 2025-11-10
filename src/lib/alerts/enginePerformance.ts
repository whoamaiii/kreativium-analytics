import AlertDetectionEngine from '@/lib/alerts/engine';
import { BaselineService } from '@/lib/alerts/baseline';
import type { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import {
  generateBurstEvents,
  generateStableBaseline,
  toTrendSeries,
} from '@/lib/alerts/detectors/__tests__/syntheticData';

function toDate(ms: number): Date {
  return new Date(ms);
}

function buildEmotions(n: number, startMs: number, spikeAtRatio = 0.9): EmotionEntry[] {
  const spikeAt = Math.max(1, Math.floor(n * spikeAtRatio));
  const out: EmotionEntry[] = new Array(n);
  for (let i = 0; i < n; i += 1) {
    out[i] = {
      id: `e${i}`,
      emotion: 'frustration',
      intensity: i >= spikeAt ? 5 : i % 11 === 0 ? 3 : 2,
      timestamp: toDate(startMs + i * 60_000),
    } as EmotionEntry;
  }
  return out;
}

function buildSensory(n: number, startMs: number): SensoryEntry[] {
  const out: SensoryEntry[] = new Array(n);
  for (let i = 0; i < n; i += 1) {
    out[i] = {
      id: `s${i}`,
      response: 'touch',
      intensity: i % 9 === 0 ? 5 : 2,
      timestamp: toDate(startMs + i * 60_000),
    } as SensoryEntry;
  }
  return out;
}

function buildTracking(n: number, startMs: number): TrackingEntry[] {
  const out: TrackingEntry[] = new Array(n);
  for (let i = 0; i < n; i += 1) {
    const noiseLevel = i < n / 2 ? 55 + (i % 5) : 75 + (i % 10);
    out[i] = {
      id: `t${i}`,
      studentId: 'p',
      timestamp: toDate(startMs + i * 60_000),
      emotions: [
        {
          id: `te${i}`,
          emotion: 'frustration',
          intensity: i < n / 2 ? 2 : 5,
          timestamp: toDate(startMs + i * 60_000),
        } as EmotionEntry,
      ],
      sensoryInputs: [],
      environmentalData: { roomConditions: { noiseLevel } },
    } as TrackingEntry;
  }
  return out;
}

export function benchmarkEngine(
  datasetSizes: { emotions: number; sensory: number; tracking: number },
  iterations = 1,
): { msAvg: number; alertsPerIter: number } {
  const engine = new AlertDetectionEngine({ seriesLimit: 120 });
  const startMs = Date.UTC(2025, 0, 5, 9, 0, 0);
  const emotions = buildEmotions(datasetSizes.emotions, startMs);
  const sensory = buildSensory(datasetSizes.sensory, startMs);
  const tracking = buildTracking(datasetSizes.tracking, startMs);
  let totalMs = 0;
  let lastCount = 0;
  for (let i = 0; i < iterations; i += 1) {
    const t0 = (globalThis.performance?.now?.() as number) ?? Date.now();
    const alerts = engine.runDetection({ studentId: `bench_${i}`, emotions, sensory, tracking });
    const t1 = (globalThis.performance?.now?.() as number) ?? Date.now();
    totalMs += t1 - t0;
    lastCount = alerts.length;
  }
  return { msAvg: totalMs / iterations, alertsPerIter: lastCount };
}

export function scaleTest(
  maxStudents = 50,
  baseSize = { emotions: 600, sensory: 600, tracking: 200 },
): Array<{ students: number; msAvg: number }> {
  const out: Array<{ students: number; msAvg: number }> = [];
  for (let s = 1; s <= maxStudents; s += Math.max(1, Math.floor(maxStudents / 5))) {
    const engine = new AlertDetectionEngine({ seriesLimit: 90 });
    const startMs = Date.UTC(2025, 0, 5, 9, 0, 0);
    const emotions = buildEmotions(baseSize.emotions, startMs);
    const sensory = buildSensory(baseSize.sensory, startMs);
    const tracking = buildTracking(baseSize.tracking, startMs);
    const t0 = (globalThis.performance?.now?.() as number) ?? Date.now();
    for (let i = 0; i < s; i += 1) {
      engine.runDetection({ studentId: `stu_${i}`, emotions, sensory, tracking });
    }
    const t1 = (globalThis.performance?.now?.() as number) ?? Date.now();
    out.push({ students: s, msAvg: (t1 - t0) / s });
  }
  return out;
}

export type EnginePerfResult = {
  studentId: string;
  seriesPoints: number;
  emotionsMs: number;
  sensoryMs: number;
  trackingMs: number;
  totalMs: number;
  alertsCount: number;
  memoryMB?: number;
};

function measure<T>(fn: () => T): { result: T; ms: number } {
  const t0 = performance.now();
  const result = fn();
  const t1 = performance.now();
  return { result, ms: t1 - t0 };
}

export function synthesizeStudentData(points: number): {
  emotions: EmotionEntry[];
  sensory: SensoryEntry[];
  tracking: TrackingEntry[];
} {
  const start = Date.UTC(2024, 0, 1, 9, 0, 0);
  const step = 60_000;
  const values = generateStableBaseline(points, 2, 1, 2025);
  const series = toTrendSeries(values, start, step);

  const emotions: EmotionEntry[] = series.map(
    (p, i) =>
      ({
        id: `e${i}`,
        emotion: 'frustration',
        intensity: Math.max(0, Math.min(5, Math.round(p.value + 2))),
        timestamp: new Date(p.timestamp),
      }) as EmotionEntry,
  );

  const sensoryEvents = generateBurstEvents({
    n: Math.max(5, Math.floor(points / 10)),
    cluster: true,
    startMs: start,
  });
  const sensory: SensoryEntry[] = sensoryEvents.map(
    (ev, i) =>
      ({
        id: `s${i}`,
        response: 'seeking',
        intensity: Math.max(1, Math.min(5, Math.round((ev.pairedValue ?? ev.value) / 2))),
        timestamp: new Date(ev.timestamp),
      }) as SensoryEntry,
  );

  const tracking: TrackingEntry[] = series.map(
    (p, i) =>
      ({
        id: `t${i}`,
        studentId: 'synth',
        timestamp: new Date(p.timestamp),
        emotions: [emotions[i]!],
        sensoryInputs: [],
        environmentalData: { roomConditions: { noiseLevel: 60 + (i % 20) } },
      }) as TrackingEntry,
  );

  return { emotions, sensory, tracking };
}

export function benchmarkEngineDetailed(studentId: string, points: number): EnginePerfResult {
  const engine = new AlertDetectionEngine({ seriesLimit: Math.min(points, 180) });
  const baselineService = new BaselineService();
  const data = synthesizeStudentData(points);

  const emotionsMs = measure(() => engine['buildEmotionSeries'](data.emotions)).ms;
  const sensoryMs = measure(() => engine['buildSensoryAggregates'](data.sensory)).ms;
  const trackingMs = measure(() => engine['buildAssociationDataset'](data.tracking)).ms;
  const total = measure(() =>
    engine.runDetection({ studentId, ...data, baseline: baselineService.getBaseline(studentId) }),
  ).ms;

  const memMB =
    typeof (globalThis as any).performance?.memory?.usedJSHeapSize === 'number'
      ? Math.round(((globalThis as any).performance.memory.usedJSHeapSize / (1024 * 1024)) * 100) /
        100
      : undefined;

  const alertsCount = engine.runDetection({ studentId, ...data }).length;

  return {
    studentId,
    seriesPoints: points,
    emotionsMs,
    sensoryMs,
    trackingMs,
    totalMs: total.ms,
    alertsCount,
    memoryMB: memMB,
  };
}
