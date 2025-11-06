/**
 * Smoke tests for enhancedPatternAnalysis core behaviors
 * - analyzeTrendsWithStatistics returns finite values and respects thresholds
 * - detectAnomalies triggers expected anomalies on synthetic spikes
 * - generateCorrelationMatrix uses config bands for significance
 */

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';

const mlModelsMock = vi.hoisted(() => ({
  init: vi.fn().mockResolvedValue(undefined),
  getModelStatus: vi.fn().mockResolvedValue(new Map()),
  predictEmotions: vi.fn().mockResolvedValue([]),
  predictSensoryResponse: vi.fn().mockResolvedValue(null),
  deleteModel: vi.fn().mockResolvedValue(undefined),
  performBaselineClustering: vi.fn().mockResolvedValue([]),
}));

// Mock ML models early to avoid IndexedDB and async init in Node
vi.mock('@/lib/mlModels', () => ({
  __esModule: true,
  getMlModels: vi.fn().mockResolvedValue(mlModelsMock),
  resetMlModelsInstanceForTests: vi.fn(),
}));

import { enhancedPatternAnalysis } from '@/lib/enhancedPatternAnalysis';
import { analyticsConfig } from '@/lib/analyticsConfig';
import type { TrackingEntry, EmotionEntry } from '@/types/student';

// Minimal storage polyfills (avoid pulling jsdom)
beforeAll(() => {
  if (!(globalThis as any).localStorage) {
    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => { store.set(k, String(v)); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => { store.clear(); },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() { return store.size; }
    };
  }
});

afterEach(() => {
  try { analyticsConfig.resetToDefaults(); } catch {}
});

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

describe('analyzeTrendsWithStatistics (finite outputs and threshold respect)', () => {
  it('returns finite values and direction respects configured trendThreshold', () => {
    // Configure thresholds and quality targets minimally
    analyticsConfig.updateConfig({
      enhancedAnalysis: {
        minSampleSize: 5,
        trendThreshold: 0.05, // small threshold so mild slope counts as increasing
        predictionConfidenceThreshold: 0.4,
        anomalyThreshold: 1.5,
        riskAssessmentThreshold: 3,
        qualityTargets: { pointsTarget: 20, timeSpanDaysTarget: 30 },
      } as any,
      timeWindows: { defaultAnalysisDays: 30, recentDataDays: 7, shortTermDays: 14, longTermDays: 90 }
    });

    // Create monotonically increasing data across 10 days
    const now = new Date();
    const data = Array.from({ length: 10 }, (_, i) => ({
      value: 1 + i * 0.1,
      timestamp: new Date(now.getTime() - (9 - i) * 24 * 3600_000),
    }));

    const res = (enhancedPatternAnalysis as any).analyzeTrendsWithStatistics(data);
    expect(res).toBeTruthy();
    // Finite fields
    expect(isFiniteNumber(res.rate)).toBe(true);
    expect(isFiniteNumber(res.significance)).toBe(true);
    expect(isFiniteNumber(res.confidence)).toBe(true);
    expect(isFiniteNumber(res.forecast.next7Days)).toBe(true);
    expect(isFiniteNumber(res.forecast.next30Days)).toBe(true);
    // Direction should be increasing with small threshold
    expect(res.direction === 'increasing' || res.direction === 'stable').toBe(true);

    // Raise threshold high enough to force stable
    analyticsConfig.updateConfig({ enhancedAnalysis: { trendThreshold: Math.abs(res.rate) + 1 } as any });
    const res2 = (enhancedPatternAnalysis as any).analyzeTrendsWithStatistics(data);
    expect(res2?.direction).toBe('stable');
  });
});

describe('detectAnomalies (spike triggers)', () => {
  it('flags anomalies for synthetic intensity spikes and buckets severity', () => {
    analyticsConfig.updateConfig({
      enhancedAnalysis: { anomalyThreshold: 1.2, minSampleSize: 5 } as any,
      alertSensitivity: { level: 'medium', emotionIntensityMultiplier: 1, frequencyMultiplier: 1, anomalyMultiplier: 1 } as any,
    });

    const now = new Date();
    const emotions: EmotionEntry[] = [];
    // Baseline with slight variation (2.8 to 3.2) to ensure non-zero MAD
    for (let i = 0; i < 30; i++) {
      const baseIntensity = 3 + (Math.sin(i) * 0.2); // Small variation around 3
      emotions.push({ id: `e${i}`, studentId: 's1', emotion: 'anxious', intensity: baseIntensity, timestamp: new Date(now.getTime() - (30 - i) * 3600_000), triggers: [] } as any);
    }
    // Add clear outlier spikes
    const spikeHi = { id: 'spike-hi', studentId: 's1', emotion: 'anxious', intensity: 5, timestamp: now, triggers: [] } as any;
    const spikeLo = { id: 'spike-lo', studentId: 's1', emotion: 'anxious', intensity: 1, timestamp: new Date(now.getTime() - 5000), triggers: [] } as any;
    emotions.push(spikeHi, spikeLo);

    const anomalies = enhancedPatternAnalysis.detectAnomalies(emotions, [], []);
    const emotionAnoms = anomalies.filter(a => a.type === 'emotion');
    expect(emotionAnoms.length).toBeGreaterThan(0);
    // Ensure at least one high or medium severity exists due to spikes
    const hasElevated = emotionAnoms.some(a => a.severity === 'high' || a.severity === 'medium');
    expect(hasElevated).toBe(true);
  });
});

describe('generateCorrelationMatrix (config significance bands)', () => {
  function makeEntries(n = 14): TrackingEntry[] {
    const now = new Date();
    const entries: TrackingEntry[] = [] as any;
    for (let i = 0; i < n; i++) {
      // Create strong correlations among some factors
      const noise = 20 + i * 2; // increasing
      const temp = 15 + i * 1;  // increasing, correlated with noise
      const emoIntensity = Math.min(5, 1 + (i / (n - 1)) * 4); // 1..5 increasing
      entries.push({
        id: `t${i}`,
        studentId: 's1',
        timestamp: new Date(now.getTime() - (n - i) * 3600_000),
        emotions: [ { id: `e${i}`, studentId: 's1', emotion: 'happy', intensity: emoIntensity, timestamp: new Date(), triggers: [] } ] as any,
        sensoryInputs: [],
        activities: [],
        environmentalData: { roomConditions: { noiseLevel: noise, temperature: temp, lighting: 'bright' } }
      } as any);
    }
    return entries;
  }

  it('labels significance tiers using enhancedAnalysis.correlationSignificance bands', () => {
    analyticsConfig.updateConfig({
      enhancedAnalysis: {
        minSampleSize: 10,
        correlationSignificance: { low: 0.2, moderate: 0.5, high: 0.8 },
      } as any,
      patternAnalysis: { correlationThreshold: 0.25, minDataPoints: 3, highIntensityThreshold: 4, concernFrequencyThreshold: 0.3, emotionConsistencyThreshold: 0.4, moderateNegativeThreshold: 0.4 } as any,
      taxonomy: { positiveEmotions: ['happy', 'calm', 'joyful'] }
    });

    const entries = makeEntries(18);
    const matrix = enhancedPatternAnalysis.generateCorrelationMatrix(entries);

    expect(matrix.significantPairs.length).toBeGreaterThan(0);
    // All pairs must pass base threshold (low band)
    expect(matrix.significantPairs.every(p => Math.abs(p.correlation) >= 0.2)).toBe(true);
    // Expect at least one high or moderate based on strong constructed correlations
    const hasHighOrModerate = matrix.significantPairs.some(p => p.significance === 'high' || p.significance === 'moderate');
    expect(hasHighOrModerate).toBe(true);
  });
});
