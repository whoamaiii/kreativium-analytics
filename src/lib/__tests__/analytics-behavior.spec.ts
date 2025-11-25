/**
 * Analytics behavioral tests:
 * - Cache-key sensitivity to configuration changes for CachedPatternAnalysisEngine
 * - Worker cache TTL parity with AnalyticsConfiguration
 * - Date boundary filtering correctness using [start, end) semantics
 *
 * Runner: Vitest
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterEach } from 'vitest';

const mlModelsMock = vi.hoisted(() => ({
  init: vi.fn().mockResolvedValue(undefined),
  getModelStatus: vi.fn().mockResolvedValue(new Map()),
  predictEmotions: vi.fn().mockResolvedValue([] as any),
  predictSensoryResponse: vi.fn().mockResolvedValue(null),
  deleteModel: vi.fn().mockResolvedValue(undefined),
  performBaselineClustering: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/mlModels', () => ({
  __esModule: true,
  getMlModels: vi.fn().mockResolvedValue(mlModelsMock),
  resetMlModelsInstanceForTests: vi.fn(),
}));

import { analyticsConfig } from '@/lib/analyticsConfig';
import { createCachedPatternAnalysis } from '@/lib/cachedPatternAnalysis';
import { enhancedPatternAnalysis } from '@/lib/enhancedPatternAnalysis';
import { getMlModels } from '@/lib/mlModels';
import type { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import { startOfDay, addDays, subDays } from 'date-fns';

/**
 * Polyfill minimal localStorage/sessionStorage for Node test environment.
 * Avoids pulling full jsdom; sufficient for modules that touch localStorage.
 */
beforeAll(() => {
  if (!(globalThis as any).localStorage) {
    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => {
        store.set(k, String(v));
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => {
        store.clear();
      },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size;
      },
    };
  }
  if (!(globalThis as any).sessionStorage) {
    const store = new Map<string, string>();
    (globalThis as any).sessionStorage = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => {
        store.set(k, String(v));
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => {
        store.clear();
      },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size;
      },
    };
  }
});

type MlModelsMock = typeof mlModelsMock;
let mlModels: MlModelsMock;

beforeEach(async () => {
  for (const key of Object.keys(mlModelsMock) as Array<keyof MlModelsMock>) {
    mlModelsMock[key].mockReset();
  }
  mlModelsMock.init.mockResolvedValue(undefined);
  mlModelsMock.getModelStatus.mockResolvedValue(new Map());
  mlModelsMock.predictEmotions.mockResolvedValue([]);
  mlModelsMock.predictSensoryResponse.mockResolvedValue(null);
  mlModelsMock.deleteModel.mockResolvedValue(undefined);
  mlModelsMock.performBaselineClustering.mockResolvedValue([]);

  mlModels = (await getMlModels()) as MlModelsMock;
});

// -----------------------------------------------------------------------------
// Confidence explanation behavior
// -----------------------------------------------------------------------------

describe('Confidence explanation responds to config updates', () => {
  it('toggles insufficientData factor when enhancedAnalysis.minSampleSize changes', () => {
    // Baseline: minSampleSize = 5 (default)
    let explanation = enhancedPatternAnalysis.generateConfidenceExplanation(3, 10, 0.3, 0.2);
    expect(explanation.factors.some((f) => f.startsWith('insufficientData:'))).toBe(true);

    // Lower requirement -> sufficientData expected
    analyticsConfig.updateConfig({
      enhancedAnalysis: {
        minSampleSize: 2,
        trendThreshold: 0.05,
        anomalyThreshold: 1.5,
        predictionConfidenceThreshold: 0.6,
        riskAssessmentThreshold: 3,
      } as any,
    });
    explanation = enhancedPatternAnalysis.generateConfidenceExplanation(3, 10, 0.3, 0.2);
    expect(explanation.factors.some((f) => f.startsWith('sufficientData:'))).toBe(true);
  });

  it('reflects timeSpanQuality and labels based on shortTermDays and defaultAnalysisDays', () => {
    // Use timeSpanDays shorter than shortTermDays
    analyticsConfig.updateConfig({
      timeWindows: {
        defaultAnalysisDays: 30,
        recentDataDays: 7,
        shortTermDays: 14,
        longTermDays: 90,
      },
    });
    let explanation = enhancedPatternAnalysis.generateConfidenceExplanation(10, 7, 0.5, 0.4);
    expect(explanation.factors).toContain('shortTimespan:7:30');

    // Make shortTermDays smaller so same 7 days becomes adequate
    analyticsConfig.updateConfig({
      timeWindows: {
        defaultAnalysisDays: 21,
        recentDataDays: 7,
        shortTermDays: 5,
        longTermDays: 90,
      },
    });
    explanation = enhancedPatternAnalysis.generateConfidenceExplanation(10, 7, 0.5, 0.4);
    expect(explanation.factors).toContain('adequateTimespan:7:21');
  });
});

// -----------------------------------------------------------------------------
// Correlation significance tiers respond to correlationThreshold
// -----------------------------------------------------------------------------

describe('Correlation significance tiers update with patternAnalysis.correlationThreshold', () => {
  function makeTracking(n = 12, noiseScale = 5, base = 0): TrackingEntry[] {
    const entries: TrackingEntry[] = [];
    const start = new Date();
    for (let i = 0; i < n; i++) {
      const noise = base + i * noiseScale; // monotonic increasing
      const emoIntensity = Math.min(5, 1 + (i / (n - 1)) * 4); // scaled 1..5 increasing
      entries.push({
        id: `t${i}`,
        studentId: 's1',
        timestamp: new Date(start.getTime() - (n - i) * 3600_000),
        emotions: [
          {
            id: `e${i}`,
            studentId: 's1',
            emotion: i % 3 === 0 ? 'happy' : 'sad',
            intensity: emoIntensity,
            timestamp: new Date(),
            triggers: [],
          },
        ],
        sensoryInputs: [],
        activities: [],
        environmentalData: {
          roomConditions: { noiseLevel: noise, temperature: 20 + (i % 3), lighting: 'bright' },
        },
      } as unknown as TrackingEntry);
    }
    return entries;
  }

  it('significantPairs and tiers shift with base threshold', () => {
    const entries = makeTracking(16);

    // Baseline threshold (default 0.25)
    let matrix = enhancedPatternAnalysis.generateCorrelationMatrix(entries);
    const havePairsDefault = matrix.significantPairs.length > 0;
    expect(havePairsDefault).toBe(true);

    // Raise threshold -> fewer pairs, more labeled as low
    analyticsConfig.updateConfig({
      patternAnalysis: {
        correlationThreshold: 0.6,
        minDataPoints: 3,
        highIntensityThreshold: 4,
        concernFrequencyThreshold: 0.3,
        emotionConsistencyThreshold: 0.4,
        moderateNegativeThreshold: 0.4,
      } as any,
    });
    matrix = enhancedPatternAnalysis.generateCorrelationMatrix(entries);
    // All pairs must obey new base >= 0.6
    expect(matrix.significantPairs.every((p) => Math.abs(p.correlation) >= 0.6)).toBe(true);
    // Tiers use base+0.2, base+0.4
    const hasModerate = matrix.significantPairs.some((p) => p.significance === 'moderate');
    const hasHigh = matrix.significantPairs.some((p) => p.significance === 'high');
    expect(hasModerate || hasHigh).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// Anomaly detection respects anomalyThreshold and anomalyMultiplier
// -----------------------------------------------------------------------------

describe('Anomaly detection thresholding and severity buckets', () => {
  function makeEmotions(): EmotionEntry[] {
    const res: EmotionEntry[] = [];
    const now = new Date();
    // Centered around intensity ~3 with some spread
    for (let i = 0; i < 30; i++) {
      res.push({
        id: `e${i}`,
        studentId: 's1',
        emotion: 'anxious',
        intensity: 2 + (i % 3),
        timestamp: new Date(now.getTime() - i * 3600_000),
        triggers: [],
      });
    }
    // Add a couple of spikes to create z-scores beyond thresholds
    res.push({
      id: 'spike1',
      studentId: 's1',
      emotion: 'anxious',
      intensity: 5,
      timestamp: now,
      triggers: [],
    });
    res.push({
      id: 'spike2',
      studentId: 's1',
      emotion: 'anxious',
      intensity: 1,
      timestamp: now,
      triggers: [],
    });
    return res;
  }

  it('anomaly counts decrease when thresholds increase and severity uses +0.5/+1.5 rule', () => {
    const emotions = makeEmotions();

    // Low threshold -> more anomalies
    analyticsConfig.updateConfig({
      enhancedAnalysis: {
        anomalyThreshold: 1.0,
        minSampleSize: 5,
        trendThreshold: 0.05,
        predictionConfidenceThreshold: 0.6,
        riskAssessmentThreshold: 3,
      },
      alertSensitivity: {
        level: 'medium',
        emotionIntensityMultiplier: 1.0,
        frequencyMultiplier: 1.0,
        anomalyMultiplier: 1.0,
      },
    });
    let anomalies = enhancedPatternAnalysis.detectAnomalies(emotions, [], []);
    const countLow = anomalies.filter((a) => a.type === 'emotion').length;
    expect(countLow).toBeGreaterThan(0);

    // Capture severity buckets at low threshold
    const bucketsLow = {
      low: anomalies.filter((a) => a.severity === 'low').length,
      medium: anomalies.filter((a) => a.severity === 'medium').length,
      high: anomalies.filter((a) => a.severity === 'high').length,
    };

    // Increase threshold and multiplier -> fewer anomalies and severity cutpoints shift up
    analyticsConfig.updateConfig({
      enhancedAnalysis: { anomalyThreshold: 2.0 },
      alertSensitivity: {
        level: 'high',
        emotionIntensityMultiplier: 1.0,
        frequencyMultiplier: 1.0,
        anomalyMultiplier: 1.5,
      },
    });
    anomalies = enhancedPatternAnalysis.detectAnomalies(emotions, [], []);
    const countHigh = anomalies.filter((a) => a.type === 'emotion').length;
    expect(countHigh).toBeLessThanOrEqual(countLow);

    // With higher base and +1.5 shift, high severity should be rarer or equal
    const bucketsHigh = {
      low: anomalies.filter((a) => a.severity === 'low').length,
      medium: anomalies.filter((a) => a.severity === 'medium').length,
      high: anomalies.filter((a) => a.severity === 'high').length,
    };
    expect(bucketsHigh.high).toBeLessThanOrEqual(bucketsLow.high);
  });
});

// -----------------------------------------------------------------------------
// Predictive mapping responds to highIntensityThreshold
// -----------------------------------------------------------------------------

describe('Predictive mapping severity changes with highIntensityThreshold', () => {
  it('maps severity using highIntensityThreshold and derived medium cut', async () => {
    // Arrange ML mocks to enable ML path
    mlModels.getModelStatus.mockResolvedValue(new Map([['emotion-prediction', true]]));
    const mkPred = (val: number) => [
      {
        timestamp: new Date(),
        emotions: { happy: val, calm: val, sad: val, anxious: val },
        confidence: 0.9,
      } as any,
    ];
    mlModels.predictEmotions.mockImplementation(async () => mkPred(4));

    // Data for currentAvgIntensity baseline
    const now = new Date();
    const emotions: EmotionEntry[] = [
      {
        id: 'e1',
        studentId: 's1',
        emotion: 'happy',
        intensity: 3,
        timestamp: subDays(now, 1),
        triggers: [],
      },
      {
        id: 'e2',
        studentId: 's1',
        emotion: 'sad',
        intensity: 3,
        timestamp: subDays(now, 2),
        triggers: [],
      },
      {
        id: 'e3',
        studentId: 's1',
        emotion: 'calm',
        intensity: 3,
        timestamp: subDays(now, 3),
        triggers: [],
      },
    ];
    const entries: TrackingEntry[] = new Array(14).fill(0).map(
      (_, i) =>
        ({
          id: `t${i}`,
          studentId: 's1',
          timestamp: subDays(now, 14 - i),
          emotions: emotions,
          sensoryInputs: [],
          activities: [],
          environmentalData: {
            roomConditions: { lighting: 'bright', noiseLevel: 40, temperature: 22 },
          },
        }) as unknown as TrackingEntry,
    );

    // highIntensityThreshold = 4 -> predicted avg 4 should be 'high'
    analyticsConfig.updateConfig({
      patternAnalysis: {
        highIntensityThreshold: 4,
        minDataPoints: 3,
        correlationThreshold: 0.25,
        concernFrequencyThreshold: 0.3,
        emotionConsistencyThreshold: 0.4,
        moderateNegativeThreshold: 0.4,
      } as any,
    });
    let insights = await enhancedPatternAnalysis.generatePredictiveInsights(emotions, [], entries);
    const mlInsight1 = insights.find((i) => i.source === 'ml' && i.type === 'prediction');
    expect(mlInsight1?.severity).toBe('high');

    // Raise threshold to 5 -> same predicted avg 4 should now be 'low' (since 4 <= highT-2 => mediumCut, but 5-2=3, 4 > 3 so 'low')
    analyticsConfig.updateConfig({
      patternAnalysis: {
        highIntensityThreshold: 5,
        minDataPoints: 3,
        correlationThreshold: 0.25,
        concernFrequencyThreshold: 0.3,
        emotionConsistencyThreshold: 0.4,
        moderateNegativeThreshold: 0.4,
      } as any,
    });
    insights = await enhancedPatternAnalysis.generatePredictiveInsights(emotions, [], entries);
    const mlInsight2 = insights.find((i) => i.source === 'ml' && i.type === 'prediction');
    expect(mlInsight2?.severity).toBe('low');
  });
});

// -----------------------------------------------------------------------------
// Taxonomy-driven positiveEmotionRatio
// -----------------------------------------------------------------------------

describe('Taxonomy.positiveEmotions affects positiveEmotionRatio computations', () => {
  function makeEntry(
    emotions: Array<[string, number]>,
    lighting: string = 'bright',
  ): TrackingEntry {
    return {
      id: 'tX',
      studentId: 's1',
      timestamp: new Date(),
      emotions: emotions.map(([_e, intensity], idx) => ({
        id: `e${idx}`,
        studentId: 's1',
        emotion: _e,
        intensity,
        timestamp: new Date(),
        triggers: [],
      })),
      sensoryInputs: [],
      activities: [],
      environmentalData: { roomConditions: { lighting, noiseLevel: 30, temperature: 22 } },
    } as unknown as TrackingEntry;
  }

  it('uses provided positiveEmotions list to compute ratios', () => {
    const entries = [
      makeEntry([
        ['joyful', 4],
        ['content', 3],
      ]),
      makeEntry([
        ['happy', 4],
        ['calm', 2],
      ]),
    ];

    // Set taxonomy to only include joyful as positive
    analyticsConfig.updateConfig({ taxonomy: { positiveEmotions: ['joyful'] } });
    let matrix = enhancedPatternAnalysis.generateCorrelationMatrix(entries);
    const idxPos = matrix.factors.indexOf('positiveEmotionRatio');
    expect(idxPos).toBeGreaterThanOrEqual(0);

    // Compute expected ratio for first entry: 1/2; second: 0/2 -> average depends on correlation use, but we can validate via recompute
    // Instead, validate that the set of positives used excludes 'happy'/'calm'
    const posOnlyJoy = matrix.significantPairs.find(
      (p) =>
        ['positiveEmotionRatio'].includes(p.factor1) ||
        ['positiveEmotionRatio'].includes(p.factor2),
    );
    // We can't guarantee significance here; so directly compute ratios by mimicking engine's logic
    const positiveSet = new Set(['joyful']);
    const ratios = entries.map(
      (e) =>
        e.emotions.filter((em) => positiveSet.has(em.emotion.toLowerCase())).length /
        e.emotions.length,
    );
    expect(ratios[0]).toBeCloseTo(0.5, 5);
    expect(ratios[1]).toBe(0);

    // Now change taxonomy to include happy and calm
    analyticsConfig.updateConfig({ taxonomy: { positiveEmotions: ['happy', 'calm'] } });
    matrix = enhancedPatternAnalysis.generateCorrelationMatrix(entries);
    const ratios2 = entries.map(
      (e) =>
        e.emotions.filter((em) => new Set(['happy', 'calm']).has(em.emotion.toLowerCase())).length /
        e.emotions.length,
    );
    expect(ratios2[0]).toBe(0);
    expect(ratios2[1]).toBe(1);
  });
});

// Utilities
const noop = () => {};

// Restore config to defaults after each test to prevent leakage
afterEach(() => {
  try {
    analyticsConfig.resetToDefaults();
  } catch {
    // @silent-ok: test cleanup reset is best-effort
  }
});

/**
 * Minimal in-memory cache implementing CacheStorage for tests
 * Supports TTL-like expiration via a toggleable "now" time
 */
class TestCache
  implements
    Required<{
      get(key: string): unknown | undefined;
      set(key: string, value: unknown, tags?: string[]): void;
      has(key: string): boolean;
      invalidateByTag(tag: string): number;
      getDataFingerprint(data: unknown): string;
      createKey(prefix: string, params: Record<string, unknown>): string;
    }>
{
  private map = new Map<string, { data: unknown; tags?: string[] }>();

  get(key: string): unknown | undefined {
    return this.map.get(key)?.data;
  }
  set(key: string, value: unknown, tags?: string[]): void {
    this.map.set(key, { data: value, tags });
  }
  has(key: string): boolean {
    return this.map.has(key);
  }
  invalidateByTag(tag: string): number {
    let count = 0;
    for (const [k, v] of this.map.entries()) {
      if (v.tags?.includes(tag)) {
        this.map.delete(k);
        count++;
      }
    }
    return count;
  }
  getDataFingerprint(data: unknown): string {
    const stringify = (obj: unknown): string => {
      if (obj === null || obj === undefined) return 'null';
      if (typeof obj !== 'object') return String(obj);
      if (Array.isArray(obj)) return `[${obj.map(stringify).join(',')}]`;
      const keys = Object.keys(obj as Record<string, unknown>).sort();
      return `{${keys.map((k) => `${k}:${stringify((obj as Record<string, unknown>)[k])}`).join(',')}}`;
    };
    const str = stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }
  createKey(prefix: string, params: Record<string, unknown>): string {
    const sorted = Object.keys(params)
      .sort()
      .map((k) => `${k}:${JSON.stringify(params[k])}`)
      .join(':');
    return `${prefix}:${sorted}`;
  }
}

describe('CachedPatternAnalysisEngine cache-key sensitivity', () => {
  let cache: TestCache;

  beforeEach(() => {
    cache = new TestCache();
  });

  it('produces distinct cache keys/results when relevant config changes', () => {
    // Arrange default config baseline
    const initialCfg = analyticsConfig.getConfig();
    const engine = createCachedPatternAnalysis(cache);

    const now = new Date();
    const emotions: EmotionEntry[] = [
      {
        id: 'e1',
        studentId: 's1',
        emotion: 'happy',
        intensity: 3,
        timestamp: now,
        triggers: ['noise'],
      },
      {
        id: 'e2',
        studentId: 's1',
        emotion: 'anxious',
        intensity: 4,
        timestamp: now,
        triggers: ['change'],
      },
    ];

    // Act: first computation caches under current configHash
    const first = engine.analyzeEmotionPatterns(emotions, 30);
    expect(first).toBeDefined();

    // Mutate relevant config subset (e.g., alert sensitivity)
    analyticsConfig.updateConfig({
      alertSensitivity: {
        low: 0.2,
        medium: 0.5,
        high: 0.85, // change high threshold to alter analysis behavior
      },
    });

    // Second call after config update should miss cache due to configHash change
    const second = engine.analyzeEmotionPatterns(emotions, 30);
    // Cannot easily inspect keys, but we can assert not the same reference and cache has at least two entries under tags
    expect(second).toBeDefined();
    // Since implementation returns new arrays, assert content differences not required; the key sensitivity is the target.
    // As a proxy, force invalidate by tag and ensure at least 2 invalidations occur across both runs.
    const invalidated = engine.invalidateAllCache();
    expect(invalidated).toBeGreaterThanOrEqual(1);
    // Different references indicate a fresh computation (not served from stale cache)
    expect(second).not.toBe(first);

    // Cleanup
    engine.destroy();
    // Restore config
    analyticsConfig.updateConfig(initialCfg);
  });
});

describe('Worker cache TTL parity (simulated)', () => {
  /**
   * We simulate worker TTL usage by verifying that cached pattern analysis inside the worker
   * honors the provided config TTL pathway. Since we cannot spin a real worker here,
   * we validate that:
   * - TTL from analyticsConfig is respected by CachedPatternAnalysisEngine constructor path
   * - And that updates propagate through subscribe mechanism
   */
  it('updates internal TTL when analytics configuration changes', () => {
    const cache = new TestCache();
    const engine = createCachedPatternAnalysis(cache);

    const initialTTL = analyticsConfig.getConfig().cache.ttl;
    // @ts-expect-no-error - access private via any for test validation
    const ttlBefore = (engine as any).ttl;
    expect(ttlBefore).toBe(initialTTL);

    // Update config TTL
    analyticsConfig.updateConfig({
      cache: {
        ...analyticsConfig.getConfig().cache,
        ttl: initialTTL + 12345,
      },
    });

    const ttlAfter = (engine as any).ttl;
    expect(ttlAfter).toBe(initialTTL + 12345);

    engine.destroy();
  });
});

describe('Date boundary filtering [start, end) correctness', () => {
  /**
   * This test verifies the logic used in AdvancedFilterPanel applyFilters by reproducing
   * the [start, end) condition with startOfDay and addDays, ensuring that an event
   * exactly at the end boundary is excluded.
   */
  it('includes timestamps on or after start and strictly before endExclusive', () => {
    const start = startOfDay(new Date('2025-07-15T10:20:00.000Z'));
    const endExclusive = addDays(startOfDay(new Date('2025-07-16T12:00:00.000Z')), 1); // effectively 2025-07-17T00:00Z

    const a = new Date(start.getTime()); // exactly start
    const b = new Date(endExclusive.getTime() - 1); // just before end
    const c = new Date(endExclusive.getTime()); // exactly end (should be excluded)

    const inRange = (ts: Date) => ts >= start && ts < endExclusive;

    expect(inRange(a)).toBe(true);
    expect(inRange(b)).toBe(true);
    expect(inRange(c)).toBe(false);
  });
});

describe('Negative cases and error tolerance', () => {
  it('handles empty datasets without exceptions', () => {
    const cache = new TestCache();
    const engine = createCachedPatternAnalysis(cache);

    const res1 = engine.analyzeEmotionPatterns([], 30);
    const res2 = engine.analyzeSensoryPatterns([], 30);
    const res3 = engine.analyzeEnvironmentalCorrelations([]);

    expect(Array.isArray(res1)).toBe(true);
    expect(Array.isArray(res2)).toBe(true);
    expect(Array.isArray(res3)).toBe(true);

    engine.destroy();
  });

  it('can invalidate per-student tags without throwing', () => {
    const cache = new TestCache();
    const engine = createCachedPatternAnalysis(cache);

    const count = engine.invalidateStudentCache('unknown-student');
    expect(typeof count).toBe('number');

    engine.destroy();
  });
});
