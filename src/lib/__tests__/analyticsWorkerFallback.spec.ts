import { describe, it, expect, vi, beforeEach } from 'vitest';

import { analyticsWorkerFallback } from '@/lib/analyticsWorkerFallback';
import { analyticsManager } from '@/lib/analyticsManager';
import type { AnalyticsData } from '@/types/analytics';

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

vi.mock('@/lib/patternAnalysis', () => ({
  patternAnalysis: {
    analyzeEmotionPatterns: vi.fn(() => [{ kind: 'emotion', label: 'happy' }]),
    analyzeSensoryPatterns: vi.fn(() => [{ kind: 'sensory', label: 'calm' }]),
    analyzeEnvironmentalCorrelations: vi.fn(() => [{ variable: 'noise', strength: 0.3 }]),
  }
}));

vi.mock('@/lib/enhancedPatternAnalysis', () => ({
  enhancedPatternAnalysis: {
    generatePredictiveInsights: vi.fn(async () => [{ title: 'Trend' }]),
    detectAnomalies: vi.fn(() => [{ id: 'a1', score: 2 }]),
  }
}));

vi.mock('@/lib/analyticsManager', () => ({
  analyticsManager: {
    getStudentAnalytics: vi.fn(async (_student: any, opts: { useAI?: boolean }) => ({
      patterns: [], correlations: [], environmentalCorrelations: [], predictiveInsights: [], anomalies: [], insights: [], suggestedInterventions: [], ai: opts?.useAI ? { provider: 'mock', model: 'x', latencyMs: 1 } : undefined,
    })),
  },
}));

describe('analyticsWorkerFallback.processAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeData(partial?: Partial<AnalyticsData>): AnalyticsData {
    return {
      entries: [],
      emotions: [],
      sensoryInputs: [],
      ...partial,
    } as AnalyticsData;
  }

  it('returns complete AnalyticsResults shape including suggestedInterventions', async () => {
    const results = await analyticsWorkerFallback.processAnalytics(makeData());
    expect(Array.isArray(results.suggestedInterventions)).toBe(true);
    expect(Array.isArray(results.environmentalCorrelations)).toBe(true);
  });

  it('handles various data scenarios without breaking result shape', async () => {
    const results = await analyticsWorkerFallback.processAnalytics(makeData({
      emotions: [{ id: 'e1', timestamp: new Date(), emotion: 'joy' } as any],
      sensoryInputs: [{ id: 's1', timestamp: new Date(), response: 'seeking' } as any],
      entries: [
        { id: 't1', studentId: 's1', timestamp: new Date(), emotions: [], sensoryInputs: [] } as any,
        { id: 't2', studentId: 's1', timestamp: new Date(), emotions: [], sensoryInputs: [] } as any,
        { id: 't3', studentId: 's1', timestamp: new Date(), emotions: [], sensoryInputs: [] } as any,
      ],
    }));
    expect(Array.isArray(results.patterns)).toBe(true);
    expect(Array.isArray(results.correlations)).toBe(true);
    expect(Array.isArray(results.environmentalCorrelations)).toBe(true);
    expect(Array.isArray(results.predictiveInsights)).toBe(true);
    expect(Array.isArray(results.anomalies)).toBe(true);
    expect(Array.isArray(results.insights)).toBe(true);
    expect(Array.isArray(results.suggestedInterventions)).toBe(true);
  });

  it('preserves result shape when internal analysis throws', async () => {
    const { patternAnalysis } = await import('@/lib/patternAnalysis');
    (patternAnalysis.analyzeEmotionPatterns as any).mockImplementationOnce(() => { throw new Error('boom'); });
    const results = await analyticsWorkerFallback.processAnalytics(makeData({ emotions: [{ id: 'e1', timestamp: new Date(), emotion: 'joy' } as any] }));
    expect(Array.isArray(results.suggestedInterventions)).toBe(true);
  });

  it('includes goals when provided to enhanced analysis', async () => {
    const { enhancedPatternAnalysis } = await import('@/lib/enhancedPatternAnalysis');
    const data = makeData({
      emotions: [{ id: 'e1', timestamp: new Date(), emotion: 'joy' } as any],
      sensoryInputs: [{ id: 's1', timestamp: new Date(), response: 'seeking' } as any],
      entries: [
        { id: 't1', studentId: 's1', timestamp: new Date(), emotions: [], sensoryInputs: [] } as any,
        { id: 't2', studentId: 's1', timestamp: new Date(), emotions: [], sensoryInputs: [] } as any,
      ],
      goals: [{ id: 'g1' }] as any,
    });
    await analyticsWorkerFallback.processAnalytics(data);
    expect((enhancedPatternAnalysis.generatePredictiveInsights as any)).toHaveBeenCalled();
    const args = (enhancedPatternAnalysis.generatePredictiveInsights as any).mock.calls[0];
    expect(Array.isArray(args[3])).toBe(true);
    expect(args[3][0]).toEqual({ id: 'g1' });
  });

  it('respects runtime useAI option via analyticsManager routing', async () => {
    const studentId = 'stu-1';
    const data = makeData({
      entries: [{ id: 't1', studentId, timestamp: new Date(), emotions: [], sensoryInputs: [] } as any],
    });
    await analyticsWorkerFallback.processAnalytics(data, { useAI: true });
    expect(analyticsManager.getStudentAnalytics).toHaveBeenCalledWith(expect.objectContaining({ id: studentId }), { useAI: true });
  });

  it('queues multiple requests and processes sequentially (async queue)', async () => {
    const p1 = analyticsWorkerFallback.processAnalytics(makeData());
    const p2 = analyticsWorkerFallback.processAnalytics(makeData({ emotions: [{ id: 'e1', timestamp: new Date(), emotion: 'joy' } as any] }));
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(Array.isArray(r1.patterns)).toBe(true);
    expect(Array.isArray(r2.patterns)).toBe(true);
  });

  it('derives student from data when not provided to manager routing', async () => {
    const studentId = 'stu-2';
    const data = makeData({
      entries: [{ id: 't1', studentId, timestamp: new Date(), emotions: [], sensoryInputs: [] } as any],
    });
    await analyticsWorkerFallback.processAnalytics(data, { useAI: false });
    expect(analyticsManager.getStudentAnalytics).toHaveBeenCalledWith(expect.objectContaining({ id: studentId }), { useAI: false });
  });
});


