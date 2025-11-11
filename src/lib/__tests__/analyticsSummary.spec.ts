import { describe, it, expect } from 'vitest';
import { generateAnalyticsSummary } from '@/lib/analyticsSummary';
import type { EmotionEntry, TrackingEntry } from '@/types/student';

function makeTs(offsetDays: number): Date {
  const now = Date.now();
  return new Date(now - offsetDays * 24 * 60 * 60 * 1000);
}

describe('generateAnalyticsSummary', () => {
  it('returns minimal summary with empty data', async () => {
    const res = await generateAnalyticsSummary({ entries: [], emotions: [] });
    expect(Array.isArray(res.insights)).toBe(true);
    expect(typeof res.confidence).toBe('number');
    expect(typeof res.computedAt).toBe('string');
  });

  it('uses provided results when available', async () => {
    const emotions: EmotionEntry[] = [
      { emotion: 'happy', intensity: 3, timestamp: makeTs(0) },
      { emotion: 'calm', intensity: 2, timestamp: makeTs(0) },
    ];
    const entries: TrackingEntry[] = [
      { id: 'a', studentId: 's1', timestamp: makeTs(0), emotions, sensoryInputs: [] },
      { id: 'b', studentId: 's1', timestamp: makeTs(1), emotions: [], sensoryInputs: [] },
      { id: 'c', studentId: 's1', timestamp: makeTs(2), emotions: [], sensoryInputs: [] },
      { id: 'd', studentId: 's1', timestamp: makeTs(3), emotions: [], sensoryInputs: [] },
      { id: 'e', studentId: 's1', timestamp: makeTs(4), emotions: [], sensoryInputs: [] },
    ];

    const summary = await generateAnalyticsSummary({
      entries,
      emotions,
      results: { patterns: [], correlations: [] },
    });

    expect(summary.insights.length).toBeGreaterThanOrEqual(1);
    expect(summary.hasMinimumData).toBeTypeOf('boolean');
  });
});

describe('generateAnalyticsSummary thresholds and trends', () => {
  it('adds limited data message below MIN_SESSIONS_FOR_FULL_ANALYTICS', async () => {
    const emotions = [] as any[];
    const entries = [
      { id: 'a', studentId: 's1', timestamp: new Date(), emotions: [], sensoryInputs: [] },
      { id: 'b', studentId: 's1', timestamp: new Date(), emotions: [], sensoryInputs: [] },
    ] as any[];
    const res = await generateAnalyticsSummary({
      entries,
      emotions,
      results: { patterns: [], correlations: [] },
    });
    const hasLimited = res.insights.some((s) => /Limited data available/.test(s));
    expect(hasLimited).toBe(true);
  });

  it('caps items per MAX_*_TO_SHOW', async () => {
    const emotions = [] as any[];
    const entries = new Array(10).fill(0).map((_, i) => ({
      id: String(i),
      studentId: 's1',
      timestamp: new Date(),
      emotions: [],
      sensoryInputs: [],
    })) as any[];
    const patterns = new Array(10)
      .fill(0)
      .map((_, i) => ({ description: `p${i}`, confidence: 0.99 }));
    const correlations = new Array(10)
      .fill(0)
      .map((_, i) => ({ description: `c${i}`, significance: 'high' }));
    const res = await generateAnalyticsSummary({
      entries,
      emotions,
      results: { patterns, correlations },
    });
    // Expect at most 2 patterns and 2 correlations in defaults
    const patternMsgs = res.insights.filter((s) => /Pattern detected:/.test(s));
    const corrMsgs = res.insights.filter((s) => /Strong correlation found:/.test(s));
    expect(patternMsgs.length).toBeLessThanOrEqual(2);
    expect(corrMsgs.length).toBeLessThanOrEqual(2);
  });
});
