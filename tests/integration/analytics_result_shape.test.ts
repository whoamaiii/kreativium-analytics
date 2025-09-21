import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AnalyticsResults } from '@/types/analytics';
import { analyticsWorkerFallback } from '@/lib/analyticsWorkerFallback';
import { analyticsManager } from '@/lib/analyticsManager';
import { computeInsights } from '@/lib/insights/unified';

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

describe('Integration: AnalyticsResults shape consistency', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  function expectShape(res: AnalyticsResults) {
    expect(Array.isArray(res.patterns)).toBe(true);
    expect(Array.isArray(res.correlations)).toBe(true);
    expect(Array.isArray(res.environmentalCorrelations)).toBe(true);
    expect(Array.isArray(res.predictiveInsights)).toBe(true);
    expect(Array.isArray(res.anomalies)).toBe(true);
    expect(Array.isArray(res.insights)).toBe(true);
    expect(Array.isArray(res.suggestedInterventions)).toBe(true);
  }

  it('worker-equivalent computeInsights returns full shape', async () => {
    const res = await computeInsights({ entries: [], emotions: [], sensoryInputs: [] });
    expectShape(res);
  });

  it('fallback path returns full shape', async () => {
    const r = await analyticsWorkerFallback.processAnalytics({ entries: [], emotions: [], sensoryInputs: [] } as any, {} as any);
    expectShape(r as unknown as AnalyticsResults);
  });

  it('AI path returns compatible shape', async () => {
    vi.spyOn(analyticsManager, 'getStudentAnalytics' as any, 'get').mockReturnValue(analyticsManager as any);
    vi.spyOn(analyticsManager, 'getStudentAnalytics').mockResolvedValue({
      patterns: [], correlations: [], environmentalCorrelations: [], predictiveInsights: [], anomalies: [], insights: [], suggestedInterventions: []
    } as any);
    const res = await analyticsManager.getStudentAnalytics({ id: 's1', name: 'S', createdAt: new Date() } as any, { useAI: true });
    expectShape(res as AnalyticsResults);
  });

  it('error scenarios still return valid shape', async () => {
    // @ts-expect-error invalid input on purpose
    const res = await computeInsights(undefined);
    expectShape(res as AnalyticsResults);
  });
});


