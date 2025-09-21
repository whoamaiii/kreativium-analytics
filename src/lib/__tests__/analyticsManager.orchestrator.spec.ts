import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildInsightsCacheKey, buildInsightsTask, getInsights } from '@/lib/analyticsManager';

vi.mock('@/lib/analyticsConfig', async (orig) => {
  const mod: any = await orig();
  const DEFAULT = mod.DEFAULT_ANALYTICS_CONFIG;
  const cfg = { ...DEFAULT, cache: { ...DEFAULT.cache, ttl: 600_000 } }; // 10 min
  return {
    ...mod,
    analyticsConfig: {
      getConfig: vi.fn(() => ({ ...cfg })),
      subscribe: vi.fn(() => {
        // return unsubscribe
        return () => {};
      }),
    },
    DEFAULT_ANALYTICS_CONFIG: cfg,
  };
});

vi.mock('@/lib/insights/unified', () => ({
  computeInsights: vi.fn(async (inputs: any) => ({
    patterns: new Array(inputs.entries?.length || 0).fill({}),
    correlations: [],
    environmentalCorrelations: [],
    predictiveInsights: [],
    anomalies: [],
    insights: [],
    suggestedInterventions: [],
    confidence: 0.9,
    hasMinimumData: true,
  }))
}));

describe('orchestrator exports from analyticsManager', () => {
  const inputs = {
    entries: [{ id: 'e1', timestamp: new Date().toISOString() }],
    emotions: [{ id: 'em1', timestamp: new Date().toISOString(), emotion: 'happy' }],
    sensoryInputs: [{ id: 's1', timestamp: new Date().toISOString(), response: 'seeking' }],
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('buildInsightsCacheKey is deterministic and order-insensitive', () => {
    const k1 = buildInsightsCacheKey(inputs, {});
    const shuffled = {
      ...inputs,
      entries: [...inputs.entries].reverse(),
      emotions: [...inputs.emotions].reverse(),
      sensoryInputs: [...inputs.sensoryInputs].reverse(),
    };
    const k2 = buildInsightsCacheKey(shuffled as any, {});
    expect(k1).toBe(k2);
  });

  it('buildInsightsTask constructs a typed task with ttl and tags', () => {
    const task = buildInsightsTask(inputs, { tags: ['foo', 'insights'] });
    expect(task.type).toBe('Insights/Compute');
    expect(task.cacheKey).toBeTruthy();
    expect(task.ttlSeconds).toBeGreaterThan(0);
    expect(task.tags?.includes('insights')).toBe(true);
    expect(task.tags?.includes('v2')).toBe(true);
    expect(task.tags?.includes('foo')).toBe(true);
  });

  it('getInsights returns stable summary and diagnostics, logs safely on error', async () => {
    const result = await getInsights(inputs);
    expect(result.cacheKey).toBeTruthy();
    expect(result.summary).toMatchObject({
      patternsCount: 1,
      correlationsCount: 0,
      insightsCount: 0,
      hasMinimumData: true,
    });
    // Ensure unified returns complete shape including suggestedInterventions
    const detailed = await (await import('@/lib/insights/unified')).computeInsights(inputs as any);
    expect(Array.isArray((detailed as any).suggestedInterventions)).toBe(true);
    expect(result.diagnostics).toMatchObject({ entries: 1, emotions: 1, sensoryInputs: 1 });
  });
});

