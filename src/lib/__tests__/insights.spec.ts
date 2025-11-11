import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateConfidence, generateInsights } from '@/lib/insights';
import { ANALYTICS_CONFIG, analyticsConfig } from '@/lib/analyticsConfig';
import type { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';

// Helper to build timestamps relative to a mocked now
const daysAgo = (n: number, now: Date) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

describe('calculateConfidence', () => {
  const baseCfg = ANALYTICS_CONFIG.confidence;

  beforeEach(() => {
    vi.useFakeTimers();
    // Ensure consistent default config (analyticsConfig may be mutable across tests)
    // Not strictly necessary when passing cfgParam, but keep parity with code paths.
  });

  it('applies component contributions up to thresholds and clamps beyond with 2-decimal rounding', () => {
    const cfg = baseCfg;

    // Exactly reach thresholds
    const emotions: EmotionEntry[] = Array.from({ length: cfg.THRESHOLDS.EMOTION_ENTRIES }).map(
      (_, i) => ({
        id: `e${i}`,
        studentId: 's1',
        emotion: 'happy',
        intensity: 3,
        timestamp: new Date(),
      }),
    );
    const sensory: SensoryEntry[] = Array.from({ length: cfg.THRESHOLDS.SENSORY_ENTRIES }).map(
      (_, i) => ({
        id: `s${i}`,
        studentId: 's1',
        sense: 'visual',
        response: 'seeking',
        intensity: 3,
        timestamp: new Date(),
      }),
    );
    const tracking: TrackingEntry[] = Array.from({ length: cfg.THRESHOLDS.TRACKING_ENTRIES }).map(
      (_, i) =>
        ({
          id: `t${i}`,
          timestamp: new Date(),
          value: i,
        }) as any,
    );

    // No recency boost by setting last entry just outside window
    const now = new Date('2025-01-15T12:00:00.000Z');
    vi.setSystemTime(now);
    tracking[tracking.length - 1].timestamp = daysAgo(
      cfg.THRESHOLDS.DAYS_SINCE_LAST_ENTRY + 1,
      now,
    );

    const scoreAtThresholds = calculateConfidence(emotions, sensory, tracking, cfg);
    const expectedSum = cfg.WEIGHTS.EMOTION + cfg.WEIGHTS.SENSORY + cfg.WEIGHTS.TRACKING; // each capped at 1 * weight
    expect(scoreAtThresholds).toBeCloseTo(expectedSum, 10);

    // Exceed thresholds -> still clamp to 1 * weight each
    const emotions2 = emotions.concat(emotions); // double count intentionally
    const sensory2 = sensory.concat(sensory, sensory); // exceed further
    const tracking2 = tracking.concat(tracking);
    const scoreClamped = calculateConfidence(emotions2, sensory2, tracking2, cfg);
    expect(scoreClamped).toBeCloseTo(expectedSum, 10);

    // Partial contributions
    const halfEmotions: EmotionEntry[] = Array.from({
      length: Math.floor(cfg.THRESHOLDS.EMOTION_ENTRIES / 2),
    }).map((_, i) => ({
      id: `eh${i}`,
      studentId: 's1',
      emotion: 'calm',
      intensity: 2,
      timestamp: now,
    }));
    const partialScore = calculateConfidence(halfEmotions, [], [], cfg);
    const expectedPartial =
      (halfEmotions.length / cfg.THRESHOLDS.EMOTION_ENTRIES) * cfg.WEIGHTS.EMOTION;
    // 2-decimal rounding
    expect(partialScore).toBe(Math.round(expectedPartial * 100) / 100);
  });

  it('toggles recency boost at the exact boundary (exclusive as implemented)', () => {
    const cfg = baseCfg;
    const now = new Date('2025-02-01T00:00:00.000Z');
    vi.setSystemTime(now);

    const emotions: EmotionEntry[] = [];
    const sensory: SensoryEntry[] = [];
    const tracking: TrackingEntry[] = [
      { id: 't1', timestamp: daysAgo(cfg.THRESHOLDS.DAYS_SINCE_LAST_ENTRY, now), value: 1 } as any,
    ];

    // Base (no contributions from counts)
    const baseScore = calculateConfidence([], [], tracking, cfg);

    // Because implementation uses exclusive window (<= days - eps), exactly N days ago should NOT get boost
    // Reconstruct expected without recency boost: only tracking count contribution (1/cfg.THRESHOLDS.TRACKING_ENTRIES)
    const trackingOnly =
      Math.min(tracking.length / cfg.THRESHOLDS.TRACKING_ENTRIES, 1) * cfg.WEIGHTS.TRACKING;
    expect(baseScore).toBe(Math.round(trackingOnly * 100) / 100);

    // Within window (just under threshold) should include boost
    tracking[0].timestamp = daysAgo(cfg.THRESHOLDS.DAYS_SINCE_LAST_ENTRY - 0.0001, now);
    const boosted = calculateConfidence([], [], tracking, cfg);
    const expectedBoosted = Math.min(trackingOnly + cfg.WEIGHTS.RECENCY_BOOST, 1);
    expect(boosted).toBe(Math.round(expectedBoosted * 100) / 100);
  });
});

describe('calculateConfidence edge cases', () => {
  // Use fake timers to align Date.now() inside calculateConfidence with our test timestamps
  vi.useFakeTimers();
  const fixedNow = new Date('2025-02-01T00:00:00.000Z');
  vi.setSystemTime(fixedNow);
  const now = fixedNow.getTime();
  const mkTs = (daysAgo: number) => new Date(now - daysAgo * 24 * 60 * 60 * 1000);

  it('no data returns 0 and rounds/clamps', () => {
    const score = calculateConfidence([], [], [], {
      THRESHOLDS: {
        EMOTION_ENTRIES: 10,
        SENSORY_ENTRIES: 10,
        TRACKING_ENTRIES: 5,
        DAYS_SINCE_LAST_ENTRY: 7,
      },
      WEIGHTS: { EMOTION: 0.3, SENSORY: 0.3, TRACKING: 0.4, RECENCY_BOOST: 0.1 },
    });
    expect(score).toBe(0);
  });

  it('recency boost triggers for strictly less than N days and not at exactly N days', () => {
    const trackingLt = [{ id: 't1', studentId: 's1', timestamp: mkTs(6.9) }];
    const trackingEq = [{ id: 't2', studentId: 's1', timestamp: mkTs(7) }];

    const cfg = {
      THRESHOLDS: {
        EMOTION_ENTRIES: 1,
        SENSORY_ENTRIES: 1,
        TRACKING_ENTRIES: 1,
        DAYS_SINCE_LAST_ENTRY: 7,
      },
      WEIGHTS: { EMOTION: 0, SENSORY: 0, TRACKING: 0, RECENCY_BOOST: 0.5 },
    };

    const scoreLt = calculateConfidence([], [], trackingLt as any, cfg);
    const scoreEq = calculateConfidence([], [], trackingEq as any, cfg);

    expect(scoreLt).toBe(0.5);
    expect(scoreEq).toBe(0);
  });
});

describe('generateInsights (canonical signature)', () => {
  const cfg = ANALYTICS_CONFIG.insights;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-01T00:00:00.000Z'));
  });

  it('returns exact no-data message when there are no tracking entries', () => {
    const insights = generateInsights(
      { patterns: [], correlations: [], predictiveInsights: [] },
      [],
      [],
      cfg,
    );
    expect(insights).toEqual([
      'No tracking data available yet. Start by creating your first tracking session to begin pattern analysis.',
    ]);
  });

  it('includes limited sessions message with dynamic count', () => {
    const entries: TrackingEntry[] = Array.from({
      length: cfg.MIN_SESSIONS_FOR_FULL_ANALYTICS - 1,
    }).map((_, i) => ({ id: `t${i}`, timestamp: new Date(), value: i }) as any);
    const insights = generateInsights(
      { patterns: [], correlations: [], predictiveInsights: [] },
      [],
      entries,
      cfg,
    );
    expect(insights[0]).toBe(
      `Limited data available (${entries.length} sessions). Analytics will improve as more data is collected.`,
    );
  });

  it('filters patterns by threshold and caps max count', () => {
    const patterns = [
      {
        id: 'p1',
        pattern: 'A',
        description: 'High A',
        type: 'emotion',
        confidence: cfg.HIGH_CONFIDENCE_PATTERN_THRESHOLD + 0.01,
        dataPoints: 10,
      },
      {
        id: 'p2',
        pattern: 'B',
        description: 'Low B',
        type: 'emotion',
        confidence: cfg.HIGH_CONFIDENCE_PATTERN_THRESHOLD - 0.01,
        dataPoints: 10,
      },
      {
        id: 'p3',
        pattern: 'C',
        description: 'High C',
        type: 'sensory',
        confidence: cfg.HIGH_CONFIDENCE_PATTERN_THRESHOLD + 0.2,
        dataPoints: 10,
      },
    ] as any;

    const entries: TrackingEntry[] = Array.from({
      length: cfg.MIN_SESSIONS_FOR_FULL_ANALYTICS,
    }).map((_, i) => ({ id: `t${i}`, timestamp: new Date(), value: i }) as any);

    const insights = generateInsights(
      { patterns, correlations: [], predictiveInsights: [] },
      [],
      entries,
      cfg,
    );

    const highOnly = patterns.filter((p) => p.confidence > cfg.HIGH_CONFIDENCE_PATTERN_THRESHOLD);
    const expectedMsgs = highOnly
      .slice(0, cfg.MAX_PATTERNS_TO_SHOW)
      .map(
        (p) => `Pattern detected: ${p.description} (${Math.round(p.confidence * 100)}% confidence)`,
      );

    // Extract only pattern lines from insights (skip limited-data message when present)
    const patternLines = insights.filter((line) => line.startsWith('Pattern detected:'));
    expect(patternLines).toEqual(expectedMsgs);
  });

  it('includes only high-significance correlations and caps max count', () => {
    const correlations = [
      { description: 'Low sig', significance: 'low' },
      { description: 'High 1', significance: 'high' },
      { description: 'High 2', significance: 'high' },
      { description: 'High 3', significance: 'high' },
    ] as any;

    const entries: TrackingEntry[] = Array.from({
      length: cfg.MIN_SESSIONS_FOR_FULL_ANALYTICS,
    }).map((_, i) => ({ id: `t${i}`, timestamp: new Date(), value: i }) as any);

    const insights = generateInsights(
      { patterns: [], correlations, predictiveInsights: [] },
      [],
      entries,
      cfg,
    );

    const corrLines = insights.filter((l) => l.startsWith('Strong correlation found: '));
    const expected = correlations
      .filter((c: any) => c.significance === 'high')
      .slice(0, cfg.MAX_CORRELATIONS_TO_SHOW)
      .map((c: any) => `Strong correlation found: ${c.description}`);
    expect(corrLines).toEqual(expected);
  });

  it('caps predictive insights and formats confidence as percent', () => {
    const predictiveInsights = [
      { description: 'Pred 1', confidence: 0.61 },
      { description: 'Pred 2', confidence: 0.8 },
      { description: 'Pred 3', confidence: 0.9 },
    ];
    const entries: TrackingEntry[] = Array.from({
      length: cfg.MIN_SESSIONS_FOR_FULL_ANALYTICS,
    }).map((_, i) => ({ id: `t${i}`, timestamp: new Date(), value: i }) as any);

    const insights = generateInsights(
      { patterns: [], correlations: [], predictiveInsights },
      [],
      entries,
      cfg,
    );

    const predLines = insights.filter((l) => l.startsWith('Prediction: '));
    const expected = predictiveInsights
      .slice(0, cfg.MAX_PREDICTIONS_TO_SHOW)
      .map(
        (pi) => `Prediction: ${pi.description} (${Math.round(pi.confidence * 100)}% confidence)`,
      );
    expect(predLines).toEqual(expected);
  });

  it('emits emotion trend: positive, negative, and neutral paths based on POSITIVE_EMOTIONS and thresholds', () => {
    const entries: TrackingEntry[] = Array.from({
      length: cfg.MIN_SESSIONS_FOR_FULL_ANALYTICS,
    }).map((_, i) => ({ id: `t${i}`, timestamp: new Date(), value: i }) as any);

    const makeEmotions = (positives: number, total: number): EmotionEntry[] => {
      const posArray = Array.from({ length: positives }).map((_, i) => ({
        id: `ep${i}`,
        studentId: 's1',
        emotion: 'happy',
        intensity: 3,
        timestamp: new Date(),
      }));
      const negArray = Array.from({ length: total - positives }).map((_, i) => ({
        id: `en${i}`,
        studentId: 's1',
        emotion: 'sad',
        intensity: 3,
        timestamp: new Date(),
      }));
      return [...posArray, ...negArray];
    };

    // Positive trend (> POSITIVE_EMOTION_TREND_THRESHOLD)
    const posCount = cfg.RECENT_EMOTION_COUNT;
    const positiveNeeded =
      Math.floor(cfg.RECENT_EMOTION_COUNT * cfg.POSITIVE_EMOTION_TREND_THRESHOLD) + 1;
    const emotionsPositive = makeEmotions(positiveNeeded, posCount);
    const insightsPos = generateInsights(
      { patterns: [], correlations: [], predictiveInsights: [] },
      emotionsPositive,
      entries,
      cfg,
    );
    expect(insightsPos.some((l) => l.startsWith('Positive trend: '))).toBe(true);

    // Negative trend (< NEGATIVE_EMOTION_TREND_THRESHOLD)
    const negativeCap =
      Math.ceil(cfg.RECENT_EMOTION_COUNT * cfg.NEGATIVE_EMOTION_TREND_THRESHOLD) - 1;
    const emotionsNegative = makeEmotions(Math.max(0, negativeCap), cfg.RECENT_EMOTION_COUNT);
    const insightsNeg = generateInsights(
      { patterns: [], correlations: [], predictiveInsights: [] },
      emotionsNegative,
      entries,
      cfg,
    );
    expect(insightsNeg.some((l) => l.startsWith('Consider reviewing strategies'))).toBe(true);

    // Neutral (between thresholds) -> neither positive nor negative message
    const mid = Math.round(
      ((cfg.POSITIVE_EMOTION_TREND_THRESHOLD + cfg.NEGATIVE_EMOTION_TREND_THRESHOLD) / 2) *
        cfg.RECENT_EMOTION_COUNT,
    );
    const emotionsNeutral = makeEmotions(mid, cfg.RECENT_EMOTION_COUNT);
    const insightsNeutral = generateInsights(
      { patterns: [], correlations: [], predictiveInsights: [] },
      emotionsNeutral,
      entries,
      cfg,
    );
    const hasTrend =
      insightsNeutral.some((l) => l.startsWith('Positive trend:')) ||
      insightsNeutral.some((l) => l.startsWith('Consider reviewing strategies'));
    expect(hasTrend).toBe(false);
  });

  it('falls back to monitoring message when nothing else emits', () => {
    const entries: TrackingEntry[] = Array.from({
      length: cfg.MIN_SESSIONS_FOR_FULL_ANALYTICS,
    }).map((_, i) => ({ id: `t${i}`, timestamp: new Date(), value: i }) as any);
    const insights = generateInsights(
      { patterns: [], correlations: [], predictiveInsights: [] },
      [],
      entries,
      cfg,
    );

    // With no patterns, correlations, predictions, and not enough emotions for trend, ensure fallback exists
    expect(insights).toContain(
      'Analytics are active and monitoring patterns. Continue collecting data for more detailed insights.',
    );
  });
});
