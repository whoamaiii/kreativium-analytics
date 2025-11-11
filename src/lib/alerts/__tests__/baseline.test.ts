import { describe, it, expect, beforeEach } from 'vitest';
import { BaselineService } from '@/lib/alerts/baseline';
import type { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import { median, mad } from '@/lib/statistics';

function makeDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

describe('BaselineService (enhanced)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('skips baseline when insufficient data', () => {
    const svc = new BaselineService();
    const emotions: EmotionEntry[] = [];
    const sensory: SensoryEntry[] = [];
    const tracking: TrackingEntry[] = [] as unknown as TrackingEntry[];
    const res = svc.updateBaseline({ studentId: 's1', emotions, sensory, tracking });
    expect(res).toBeNull();
  });

  it('computes emotion baselines with robust stats and quality', () => {
    const svc = new BaselineService();
    const emotions: EmotionEntry[] = [];
    // 14 days of values with a few outliers
    for (let i = 0; i < 14; i++) {
      const intensity = i === 5 ? 10 : i === 9 ? 0 : 3 + (i % 3);
      emotions.push({
        id: `e${i}`,
        studentId: 's1',
        emotion: 'frustration',
        intensity,
        timestamp: makeDate(14 - i),
      } as EmotionEntry);
    }
    const sensory: SensoryEntry[] = [];
    const tracking: TrackingEntry[] = emotions.map((e, idx) => ({
      id: `t${idx}`,
      studentId: 's1',
      timestamp: e.timestamp,
      emotions: [e],
      sensoryInputs: [],
      environmentalData: {
        roomConditions: { noiseLevel: 60 + (idx % 4) * 5, temperature: 22, humidity: 40 },
      },
    })) as unknown as TrackingEntry[];

    const res = svc.updateBaseline({ studentId: 's1', emotions, sensory, tracking });
    expect(res).not.toBeNull();
    const baseline = res!;
    const key14 = 'frustration:14';
    const stats = baseline.emotion[key14];
    expect(stats).toBeTruthy();
    expect(typeof stats.median).toBe('number');
    expect(typeof stats.iqr).toBe('number');
    expect(stats.windowDays).toBe(14);
    expect(stats.confidenceInterval).toBeTruthy();
    expect(baseline.quality).toBeTruthy();
    expect(baseline.sampleInfo.sessions).toBeGreaterThan(0);
  });

  it('computes sensory beta priors and credible intervals', () => {
    const svc = new BaselineService();
    const emotions: EmotionEntry[] = [];
    const sensory: SensoryEntry[] = [];
    for (let i = 0; i < 20; i++) {
      sensory.push({
        id: `s${i}`,
        response: 'seeking',
        intensity: 4 + (i % 2),
        timestamp: makeDate(10 - (i % 10)),
      } as unknown as SensoryEntry);
    }
    const tracking: TrackingEntry[] = [] as unknown as TrackingEntry[];

    const res = svc.updateBaseline({ studentId: 's2', emotions, sensory, tracking });
    expect(res).not.toBeNull();
    const baseline = res!;
    const k7 = 'seeking:7';
    const s7 = baseline.sensory[k7];
    expect(s7).toBeTruthy();
    expect(s7.ratePrior.alpha).toBeGreaterThan(0);
    expect(s7.posteriorMean).toBeGreaterThanOrEqual(0);
    expect(s7.posteriorMean).toBeLessThanOrEqual(1);
    expect(s7.credibleInterval).toBeTruthy();
  });

  it('computes environmental robust summaries and correlation with emotion', () => {
    const svc = new BaselineService();
    const emotions: EmotionEntry[] = [];
    const sensory: SensoryEntry[] = [];
    const tracking: TrackingEntry[] = [] as unknown as TrackingEntry[];
    for (let i = 0; i < 15; i++) {
      const e: EmotionEntry = {
        id: `e${i}`,
        studentId: 's3',
        emotion: 'anxiety',
        intensity: 2 + (i % 4),
        timestamp: makeDate(15 - i),
      } as EmotionEntry;
      emotions.push(e);
      tracking.push({
        id: `t${i}`,
        studentId: 's3',
        timestamp: e.timestamp,
        emotions: [e],
        sensoryInputs: [],
        environmentalData: {
          roomConditions: {
            noiseLevel: 50 + (i % 6) * 8,
            temperature: 20 + (i % 2),
            humidity: 35 + (i % 3),
          },
        },
      } as unknown as TrackingEntry);
    }
    const res = svc.updateBaseline({ studentId: 's3', emotions, sensory, tracking });
    expect(res).not.toBeNull();
    const envKey = 'noiseLevel:7';
    const env = res!.environment[envKey];
    expect(env).toBeTruthy();
    expect(typeof env.median).toBe('number');
    expect(env.confidenceInterval).toBeTruthy();
    expect(typeof env.correlationWithEmotion).toBe('number');
  });

  it('stores and retrieves baselines per student', () => {
    const svc = new BaselineService();
    const emotions: EmotionEntry[] = [];
    const sensory: SensoryEntry[] = [];
    const tracking: TrackingEntry[] = [] as unknown as TrackingEntry[];
    for (let i = 0; i < 10; i++) {
      emotions.push({
        id: `e${i}`,
        studentId: 's4',
        emotion: 'joy',
        intensity: 3,
        timestamp: makeDate(10 - i),
      } as EmotionEntry);
    }
    const res = svc.updateBaseline({ studentId: 's4', emotions, sensory, tracking });
    expect(res).not.toBeNull();
    const loaded = svc.getEmotionBaseline('s4');
    expect(loaded).not.toBeNull();
    expect(loaded!.studentId).toBe('s4');
  });
});
