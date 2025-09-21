import { describe, it, expect, vi, beforeEach } from 'vitest';

import { computeInsights } from '@/lib/insights/unified';
import type { AnalyticsResults } from '@/types/analytics';

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

vi.mock('@/lib/analyticsConfig', async (orig) => {
  const mod: any = await orig();
  return {
    ...mod,
    analyticsConfig: {
      getConfig: vi.fn(() => mod.DEFAULT_ANALYTICS_CONFIG),
    },
    ANALYTICS_CONFIG: mod.DEFAULT_ANALYTICS_CONFIG,
  };
});

vi.mock('@/lib/patternAnalysis', () => ({
  patternAnalysis: {
    analyzeEmotionPatterns: vi.fn((_emotions: any, _days?: number) => []),
    analyzeSensoryPatterns: vi.fn((_sensory: any, _days?: number) => []),
    analyzeEnvironmentalCorrelations: vi.fn((_entries: any) => []),
  }
}));

vi.mock('@/lib/enhancedPatternAnalysis', () => ({
  enhancedPatternAnalysis: {
    generatePredictiveInsights: vi.fn(async () => []),
    detectAnomalies: vi.fn(() => []),
  }
}));

vi.mock('@/lib/insights', () => ({
  generateInsights: vi.fn(() => []),
  calculateConfidence: vi.fn(() => 0.8),
}));

describe('unified.computeInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns complete AnalyticsResults shape with suggestedInterventions on minimal inputs', async () => {
    const result = await computeInsights({ entries: [], emotions: [], sensoryInputs: [] });
    expect(result).toBeTruthy();
    // Required arrays
    expect(Array.isArray(result.patterns)).toBe(true);
    expect(Array.isArray(result.correlations)).toBe(true);
    expect(Array.isArray(result.environmentalCorrelations)).toBe(true);
    expect(Array.isArray(result.predictiveInsights)).toBe(true);
    expect(Array.isArray(result.anomalies)).toBe(true);
    expect(Array.isArray(result.insights)).toBe(true);
    expect(Array.isArray(result.suggestedInterventions)).toBe(true);
    // Optional metadata presence
    expect(typeof (result as any).confidence === 'number' || typeof (result as any).confidence === 'undefined').toBe(true);
    expect(typeof (result as any).hasMinimumData === 'boolean' || typeof (result as any).hasMinimumData === 'undefined').toBe(true);
  });

  it('propagates goals and custom config but preserves required fields', async () => {
    const result = await computeInsights({
      entries: [],
      emotions: [],
      sensoryInputs: [],
      goals: [{ id: 'g1', title: 'Focus', description: '', createdAt: new Date() } as any]
    }, { config: { insights: { MAX_PATTERNS_TO_SHOW: 10 } } as any });
    expect(Array.isArray(result.suggestedInterventions)).toBe(true);
  });

  it('returns safe minimal shape with suggestedInterventions on invalid input', async () => {
    // @ts-expect-error invalid input on purpose
    const result = await computeInsights(undefined);
    expect((result as AnalyticsResults).patterns).toEqual([]);
    expect((result as AnalyticsResults).suggestedInterventions).toEqual([]);
    expect((result as any).error).toBeTruthy();
  });

  it('passes goals to enhanced analysis and includes config-driven behavior', async () => {
    const { enhancedPatternAnalysis } = await import('@/lib/enhancedPatternAnalysis');
    ;(enhancedPatternAnalysis.generatePredictiveInsights as any).mockImplementation(async (_e, _s, _t, goals) => {
      expect(Array.isArray(goals)).toBe(true);
      expect(goals).toEqual([{ id: 'g1' }]);
      return [{ type: 'prediction', title: 'Goal-aware', description: '', confidence: 0.9, timeframe: 't', recommendations: [] }];
    });

    const entries = [{ id: 't1', studentId: 'stu', timestamp: new Date(), emotions: [], sensoryInputs: [] } as any];
    const result = await computeInsights(
      { entries, emotions: [], sensoryInputs: [], goals: [{ id: 'g1' } as any] },
      { config: { analytics: { MIN_TRACKING_FOR_ENHANCED: 1, ANALYSIS_PERIOD_DAYS: 42 } } as any }
    );
    expect(result.predictiveInsights.length).toBe(1);
    // Ensure analyzeEmotionPatterns received override ANALYSIS_PERIOD_DAYS
    const { patternAnalysis } = await import('@/lib/patternAnalysis');
    expect((patternAnalysis.analyzeEmotionPatterns as any)).toHaveBeenCalledWith([], 42);
  });

  it('respects MIN_TRACKING_FOR_ENHANCED threshold override (no enhanced when below)', async () => {
    const { enhancedPatternAnalysis } = await import('@/lib/enhancedPatternAnalysis');
    const entries = [
      { id: 't1', studentId: 's', timestamp: new Date(), emotions: [], sensoryInputs: [] } as any,
      { id: 't2', studentId: 's', timestamp: new Date(), emotions: [], sensoryInputs: [] } as any,
    ];
    await computeInsights(
      { entries, emotions: [], sensoryInputs: [] },
      { config: { analytics: { MIN_TRACKING_FOR_ENHANCED: 3, ANALYSIS_PERIOD_DAYS: 30 } } as any }
    );
    expect((enhancedPatternAnalysis.generatePredictiveInsights as any)).not.toHaveBeenCalled();
  });

  it('triggers enhanced analysis when entries meet threshold', async () => {
    const { enhancedPatternAnalysis } = await import('@/lib/enhancedPatternAnalysis');
    const entries = [
      { id: 't1', studentId: 's', timestamp: new Date(), emotions: [], sensoryInputs: [] } as any,
      { id: 't2', studentId: 's', timestamp: new Date(), emotions: [], sensoryInputs: [] } as any,
    ];
    await computeInsights(
      { entries, emotions: [], sensoryInputs: [] },
      { config: { analytics: { MIN_TRACKING_FOR_ENHANCED: 2, ANALYSIS_PERIOD_DAYS: 30 } } as any }
    );
    expect((enhancedPatternAnalysis.generatePredictiveInsights as any)).toHaveBeenCalledTimes(1);
  });

  it('is resilient when individual analysis functions throw and preserves result shape', async () => {
    const { patternAnalysis } = await import('@/lib/patternAnalysis');
    const { enhancedPatternAnalysis } = await import('@/lib/enhancedPatternAnalysis');
    ;(patternAnalysis.analyzeEnvironmentalCorrelations as any).mockImplementation(() => { throw new Error('boom'); });
    ;(enhancedPatternAnalysis.generatePredictiveInsights as any).mockImplementation(async () => { throw new Error('fail'); });
    const entries = [
      { id: 't1', studentId: 's', timestamp: new Date(), emotions: [], sensoryInputs: [] } as any,
      { id: 't2', studentId: 's', timestamp: new Date(), emotions: [], sensoryInputs: [] } as any,
    ];
    const result = await computeInsights({ entries, emotions: [], sensoryInputs: [] });
    expect(Array.isArray(result.patterns)).toBe(true);
    expect(Array.isArray(result.correlations)).toBe(true);
    expect(Array.isArray(result.predictiveInsights)).toBe(true);
    expect(Array.isArray(result.anomalies)).toBe(true);
    expect(Array.isArray(result.insights)).toBe(true);
    expect(Array.isArray(result.suggestedInterventions)).toBe(true);
  });

  it('calculates confidence using inputs provided (different scenarios)', async () => {
    const { calculateConfidence } = await import('@/lib/insights');
    // Empty inputs
    await computeInsights({ entries: [], emotions: [], sensoryInputs: [] });
    expect((calculateConfidence as any)).toHaveBeenCalledWith([], [], [], expect.anything());

    // Non-empty inputs
    const emotions = [{ id: 'e1', timestamp: new Date(), emotion: 'happy', intensity: 3 } as any];
    const sensoryInputs = [{ id: 's1', timestamp: new Date(), sensoryType: 'visual', response: 'seeking', intensity: 4 } as any];
    const entries = [{ id: 't1', studentId: 's', timestamp: new Date(), emotions: [], sensoryInputs: [] } as any];
    await computeInsights({ entries, emotions, sensoryInputs });
    expect((calculateConfidence as any)).toHaveBeenCalledWith(emotions, sensoryInputs, entries, expect.anything());
  });
});


