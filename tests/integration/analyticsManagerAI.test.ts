import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/analysis', () => {
  class HeuristicAnalysisEngine {
    analyzeStudent = vi.fn(async () => ({
      patterns: [],
      correlations: [],
      environmentalCorrelations: [],
      predictiveInsights: [],
      anomalies: [],
      insights: ['heuristic'],
      ai: { provider: 'heuristic' },
    }));
  }
  class LLMAnalysisEngine {
    analyzeStudent = vi.fn(async () => ({
      patterns: [],
      correlations: [],
      environmentalCorrelations: [],
      predictiveInsights: [],
      anomalies: [],
      insights: ['ai'],
      ai: { provider: 'openrouter' },
    }));
  }
  return { HeuristicAnalysisEngine, LLMAnalysisEngine };
});

vi.mock('@/lib/aiConfig', async (orig) => {
  const mod: any = await orig();
  return {
    ...mod,
    loadAiConfig: (overrides?: any) => ({
      ...mod.DEFAULT_AI_CONFIG,
      enabled: true,
      apiKey: 'test-key',
      ...(overrides || {}),
    }),
  };
});

vi.mock('@/lib/analyticsConfig', async (orig) => {
  const mod: any = await orig();
  const cfg = {
    ...mod.DEFAULT_ANALYTICS_CONFIG,
    features: { ...mod.DEFAULT_ANALYTICS_CONFIG.features, aiAnalysisEnabled: true },
  };
  return {
    ...mod,
    analyticsConfig: {
      getConfig: () => cfg,
      subscribe: () => () => {},
    },
  };
});

describe('analyticsManager AI integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses LLM engine when useAI true (runtime priority)', async () => {
    const { analyticsManager } = await import('@/lib/analyticsManager');
    const student = { id: 's1', name: 'S', createdAt: new Date() } as any;
    const res = await analyticsManager.getStudentAnalytics(student, { useAI: true });
    expect(res.ai?.provider).toBe('openrouter');
  });

  it('uses heuristic when useAI false', async () => {
    const { analyticsManager } = await import('@/lib/analyticsManager');
    const student = { id: 's2', name: 'S', createdAt: new Date() } as any;
    const res = await analyticsManager.getStudentAnalytics(student, { useAI: false });
    expect(res.ai?.provider).toBe('heuristic');
  });

  it('runtime toggle overrides config-disabled AI (precedence check)', async () => {
    // Mock analytics config to disable AI analysis
    vi.doMock('@/lib/analyticsConfig', async (orig) => {
      const mod: any = await orig();
      const disabledConfig = {
        ...mod.DEFAULT_ANALYTICS_CONFIG,
        features: {
          ...mod.DEFAULT_ANALYTICS_CONFIG.features,
          aiAnalysisEnabled: false,
        },
      };
      return {
        ...mod,
        analyticsConfig: {
          getConfig: () => disabledConfig,
          subscribe: () => () => {},
        },
      };
    });

    // Re-import with mocked config
    vi.resetModules();
    const { analyticsManager } = await import('@/lib/analyticsManager');

    const student = { id: 's3', name: 'Test Student', createdAt: new Date() } as any;

    // Test that runtime useAI: true overrides config aiAnalysisEnabled: false
    const res = await analyticsManager.getStudentAnalytics(student, { useAI: true });

    // Should use LLM engine despite config being disabled (runtime priority)
    expect(res.ai?.provider).toBe('openrouter');

    // Also test that useAI: false still works with disabled config
    const res2 = await analyticsManager.getStudentAnalytics(student, { useAI: false });
    expect(res2.ai?.provider).toBe('heuristic');
  });
});
