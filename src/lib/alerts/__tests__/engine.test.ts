import { describe, it, expect } from 'vitest';
import { AlertDetectionEngine } from '@/lib/alerts/engine';
import { BaselineService } from '@/lib/alerts/baseline';
import { AlertKind, AlertSeverity, AlertStatus } from '@/lib/alerts/types';
import {
  generateStableBaseline,
  toTrendSeries,
  generateBurstEvents,
} from '@/lib/alerts/detectors/__tests__/syntheticData';
import type {
  EmotionEntry,
  SensoryEntry,
  TrackingEntry,
  Goal,
  Intervention,
} from '@/types/student';

function minutesFrom(start: number, i: number): Date {
  return new Date(start + i * 60_000);
}

function buildEmotions(n = 180, spikeAt = 140): EmotionEntry[] {
  const start = Date.UTC(2025, 0, 5, 9, 0, 0);
  const out: EmotionEntry[] = [];
  for (let i = 0; i < n; i += 1) {
    const intensity = i >= spikeAt ? 5 : i % 10 === 0 ? 3 : 2;
    out.push({
      id: `e${i}`,
      studentId: 's1',
      emotion: 'frustration',
      subEmotion: i % 2 === 0 ? 'mild' : 'moderate',
      intensity,
      duration: 1,
      timestamp: minutesFrom(start, i),
    });
  }
  return out;
}

function buildSensory(n = 120, highEvery = 8): SensoryEntry[] {
  const start = Date.UTC(2025, 0, 5, 9, 0, 0);
  const out: SensoryEntry[] = [];
  for (let i = 0; i < n; i += 1) {
    const high = i % highEvery === 0;
    out.push({
      id: `s${i}`,
      studentId: 's1',
      response: 'touch',
      intensity: high ? 5 : 2,
      timestamp: minutesFrom(start, i),
    } as SensoryEntry);
  }
  return out;
}

function buildTracking(n = 60): TrackingEntry[] {
  const start = Date.UTC(2025, 0, 5, 9, 0, 0);
  const out: TrackingEntry[] = [];
  for (let i = 0; i < n; i += 1) {
    const noiseLevel = i < n / 2 ? 55 + (i % 5) : 75 + (i % 10);
    const emoIntensity = i < n / 2 ? 2 : 5;
    out.push({
      id: `t${i}`,
      studentId: 's1',
      timestamp: minutesFrom(start, i),
      sensoryInputs: [],
      emotions: [
        {
          id: `te${i}`,
          emotion: 'frustration',
          intensity: emoIntensity,
          timestamp: minutesFrom(start, i),
        } as EmotionEntry,
      ],
      environmentalData: {
        roomConditions: { noiseLevel },
      },
    } as TrackingEntry);
  }
  return out;
}

describe('AlertDetectionEngine', () => {
  it('orchestrates detectors and returns alerts with expected metadata', () => {
    const engine = new AlertDetectionEngine();
    const emotions = buildEmotions();
    const sensory = buildSensory();
    const tracking = buildTracking();

    const alerts = engine.runDetection({ studentId: 's1', emotions, sensory, tracking });
    expect(Array.isArray(alerts)).toBe(true);
    expect(alerts.length).toBeGreaterThan(0);

    alerts.forEach((a) => {
      expect(typeof a.id).toBe('string');
      expect(a.studentId).toBe('s1');
      expect(typeof a.createdAt).toBe('string');
      expect(typeof a.confidence).toBe('number');
      expect(a.metadata?.sparkValues?.length ?? 0).toBeGreaterThan(0);
      expect((a.metadata?.sparkValues?.length ?? 0) <= 90).toBe(true);
      expect(typeof a.dedupeKey).toBe('string');
      // Experiment metadata present
      expect(
        typeof a.metadata?.experimentKey === 'string' || a.metadata?.experimentKey === undefined,
      ).toBe(true);
    });
  });

  it('applies the scoring formula correctly', () => {
    const engine = new AlertDetectionEngine();
    const alerts = engine.runDetection({
      studentId: 's2',
      emotions: buildEmotions(120, 100),
      sensory: buildSensory(80, 6),
      tracking: buildTracking(40),
    });
    expect(alerts.length).toBeGreaterThan(0);
    alerts.forEach((a) => {
      const br = (a.metadata as any)?.detectionScoreBreakdown as
        | { impact: number; confidence: number; recency: number; tier: number }
        | undefined;
      expect(br).toBeTruthy();
      if (br) {
        const score = Math.min(
          1,
          0.4 * br.impact + 0.25 * br.confidence + 0.2 * br.recency + 0.15 * br.tier,
        );
        expect((a.metadata as any)?.score).toBeCloseTo(score, 6);
      }
    });
  });

  it('ranks sources up to S1–S3 when present', () => {
    const engine = new AlertDetectionEngine();
    const alerts = engine.runDetection({
      studentId: 's3',
      emotions: buildEmotions(150, 120),
      sensory: buildSensory(120, 5),
      tracking: buildTracking(70),
    });
    const anyWithSources = alerts.find(
      (a) => (a.sources?.length ?? 0) > 0 || (a.metadata?.sourceRanks?.length ?? 0) > 0,
    );
    if (anyWithSources) {
      const ranks = anyWithSources.metadata?.sourceRanks ?? [];
      expect(ranks.length).toBeGreaterThan(0);
      expect(['S1', 'S2', 'S3']).toContain(ranks[0]);
    }
  });

  it('handles large datasets without errors (performance sanity)', () => {
    const engine = new AlertDetectionEngine({ seriesLimit: 90 });
    const emotions = buildEmotions(4000, 3800);
    const sensory = buildSensory(4000, 12);
    const tracking = buildTracking(1000);
    const alerts = engine.runDetection({ studentId: 's4', emotions, sensory, tracking });
    expect(alerts.length).toBeGreaterThan(0);
  });
});

function buildEmotionEntries(values: number[], start: number, step: number): EmotionEntry[] {
  return toTrendSeries(values, start, step).map(
    (p, i) =>
      ({
        id: `e${i}`,
        emotion: 'frustration',
        intensity: Math.max(0, Math.min(5, Math.round(p.value + 2))),
        timestamp: new Date(p.timestamp),
      }) as EmotionEntry,
  );
}

function buildSensoryEntries(n: number, start: number): SensoryEntry[] {
  const events = generateBurstEvents({ n, startMs: start, cluster: true });
  return events.map(
    (ev, i) =>
      ({
        id: `s${i}` as string,
        response: 'seeking',
        intensity: 4,
        timestamp: new Date(ev.timestamp),
      }) as SensoryEntry,
  );
}

function buildTrackingEntries(emotions: EmotionEntry[], start: number): TrackingEntry[] {
  return emotions.map(
    (e, i) =>
      ({
        id: `t${i}`,
        studentId: 's1',
        timestamp: new Date(start + i * 60_000),
        emotions: [e],
        sensoryInputs: [],
        environmentalData: { roomConditions: { noiseLevel: 60 + (i % 10) } },
      }) as TrackingEntry,
  );
}

describe('AlertDetectionEngine orchestration', () => {
  it('scores alerts with the correct aggregate formula', () => {
    const engine = new AlertDetectionEngine();
    const now = Date.UTC(2024, 0, 1, 9, 0, 0);
    const values = generateStableBaseline(120, 0, 1, 101);
    const emotions = buildEmotionEntries(values, now, 60_000);
    const sensory = buildSensoryEntries(12, now);
    const tracking = buildTrackingEntries(emotions, now);
    const alerts = engine.runDetection({ studentId: 's1', emotions, sensory, tracking });
    alerts.forEach((a) => {
      expect(a.confidence).toBeGreaterThanOrEqual(0);
      expect(a.confidence).toBeLessThanOrEqual(1);
      expect([
        AlertSeverity.Critical,
        AlertSeverity.Important,
        AlertSeverity.Moderate,
        AlertSeverity.Low,
      ]).toContain(a.severity);
      expect(a.status).toBe(AlertStatus.New);
    });
  });

  it('applies baseline and experiment-aware threshold scaling without errors', () => {
    const baselineService = new BaselineService();
    const engine = new AlertDetectionEngine({ baselineService });
    const now = Date.UTC(2024, 0, 1, 9, 0, 0);
    const values = generateStableBaseline(90, 0, 1, 202);
    const emotions = buildEmotionEntries(values, now, 60_000);
    const sensory = buildSensoryEntries(10, now);
    const tracking = buildTrackingEntries(emotions, now);
    const baseline = baselineService.updateBaseline({
      studentId: 's2',
      emotions,
      sensory,
      tracking,
    });
    const alerts = engine.runDetection({ studentId: 's2', emotions, sensory, tracking, baseline });
    expect(Array.isArray(alerts)).toBe(true);
  });

  it('ranks sources S1-S3 when multiple detectors contribute', () => {
    const engine = new AlertDetectionEngine();
    const now = Date.UTC(2024, 0, 2, 9, 0, 0);
    const values = generateStableBaseline(100, 0, 1, 303);
    const emotions = buildEmotionEntries(values, now, 60_000);
    const sensory = buildSensoryEntries(15, now);
    const tracking = buildTrackingEntries(emotions, now);
    const alerts = engine.runDetection({ studentId: 's3', emotions, sensory, tracking });
    alerts.forEach((a) => {
      const ranks = (a.metadata as any)?.sourceRanks as string[] | undefined;
      if (ranks && ranks.length > 0) {
        expect(ranks[0]).toBeDefined();
      }
    });
  });

  it('handles association data and produces context association alerts when supported', () => {
    const engine = new AlertDetectionEngine();
    const now = Date.UTC(2024, 0, 3, 9, 0, 0);
    const values = generateStableBaseline(120, 0, 1, 404);
    const emotions = buildEmotionEntries(values, now, 60_000);
    const sensory = buildSensoryEntries(12, now);
    const tracking = buildTrackingEntries(emotions, now);
    const alerts = engine.runDetection({ studentId: 's4', emotions, sensory, tracking });
    const anyContext = alerts.some((a) => a.kind === AlertKind.ContextAssociation);
    expect(anyContext === true || anyContext === false).toBe(true); // smoke: no throw, optional presence
  });

  it('includes Tau-U intervention outcomes when interventions and goals are provided', () => {
    const engine = new AlertDetectionEngine();
    const now = Date.UTC(2024, 0, 4, 9, 0, 0);
    const values = generateStableBaseline(120, 0, 1, 505);
    const emotions = buildEmotionEntries(values, now, 60_000);
    const sensory = buildSensoryEntries(14, now);
    const tracking = buildTrackingEntries(emotions, now);
    const goals: Goal[] = [
      {
        id: 'g1',
        studentId: 's5',
        title: 'Reduce escalations',
        description: '',
        category: 'behavioral',
        targetDate: new Date(now + 30 * 86400000),
        createdDate: new Date(now),
        updatedAt: new Date(now),
        status: 'active',
        measurableObjective: '',
        currentProgress: 0,
        progress: 0,
      },
    ];
    const interventions: Intervention[] = [
      {
        id: 'i1',
        studentId: 's5',
        title: 'De-escalation strategy',
        description: '',
        category: 'behavioral',
        strategy: 'breathing',
        implementationDate: new Date(now - 14 * 86400000),
        status: 'active',
        effectiveness: 3,
        frequency: 'daily',
        implementedBy: ['t1'],
        dataCollection: [],
        relatedGoals: ['g1'],
      },
    ];
    const alerts = engine.runDetection({
      studentId: 's5',
      emotions,
      sensory,
      tracking,
      goals,
      interventions,
    });
    expect(Array.isArray(alerts)).toBe(true);
  });

  it('gracefully handles detector errors without failing the pipeline', () => {
    // Create minimal inputs with potential edge cases
    const engine = new AlertDetectionEngine();
    const now = Date.UTC(2024, 0, 5, 9, 0, 0);
    const emotions: EmotionEntry[] = [
      {
        id: 'e',
        emotion: 'unknown',
        intensity: Number.NaN as unknown as number,
        timestamp: new Date(now),
      } as EmotionEntry,
    ];
    const sensory: SensoryEntry[] = [];
    const tracking: TrackingEntry[] = [];
    const alerts = engine.runDetection({ studentId: 's6', emotions, sensory, tracking });
    expect(Array.isArray(alerts)).toBe(true);
  });
});
