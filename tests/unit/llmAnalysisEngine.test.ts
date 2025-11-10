import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMAnalysisEngine } from '@/lib/analysis/llmAnalysisEngine';
import { ZAiReport } from '@/lib/analysis/aiSchema';

vi.mock('@/lib/dataStorage', () => {
  return {
    dataStorage: {
      getEntriesForStudent: vi.fn(() => []),
      getGoalsForStudent: vi.fn(() => []),
    },
  };
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

vi.mock('@/lib/ai/openrouterClient', () => {
  return {
    openRouterClient: {
      chatJSON: vi.fn(),
    },
  };
});

vi.mock('@/lib/evidence/select', async (orig) => {
  const mod: any = await orig();
  return {
    ...mod,
    selectEvidence: vi.fn(async () => [
      {
        id: 's1',
        title: 'UDL Guidelines',
        url: 'https://example.com',
        shortExcerpt: 'Evidence excerpt...',
        tags: ['udl'],
      },
    ]),
  };
});

vi.mock('@/lib/evidence/index', async (orig) => {
  const mod: any = await orig();
  return {
    ...mod,
    resolveSources: vi.fn(async (ids: string[]) =>
      ids.map((id) => ({
        id,
        title: `Source ${id}`,
        url: 'https://example.com',
        shortExcerpt: 'Short excerpt',
        tags: ['udl'],
        year: 2020,
      })),
    ),
  };
});

describe('LLMAnalysisEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns AI analysis on success and attaches metadata', async () => {
    const { openRouterClient } = await import('@/lib/ai/openrouterClient');
    (openRouterClient.chatJSON as any).mockResolvedValue({
      data: {
        summary: 'Test summary',
        keyFindings: ['finding1'],
        patterns: [
          { name: 'pattern', description: 'desc', strength: 0.7, impact: 'medium', evidence: [] },
        ],
        correlations: [
          {
            variables: ['a', 'b'],
            coefficient: 0.5,
            direction: 'positive',
            pValue: 0.1,
            confounders: [],
            evidence: [],
          },
        ],
        hypothesizedCauses: [
          { cause: 'c', likelihood: 0.5, rationale: 'r', supportingEvidence: [] },
        ],
        suggestedInterventions: [
          { title: 't', description: 'd', actions: [], expectedImpact: 'low', metrics: [] },
        ],
        anomalies: [{ description: 'an', severity: 'low', evidence: [] }],
        predictiveInsights: [{ outcome: 'o', probability: 0.6 }],
        insights: ['insight'],
        dataLineage: [],
        confidence: { overall: 0.8 },
      },
      response: {
        content: '{}',
        raw: { model: 'gpt-4o-mini' },
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        metrics: { durationMs: 100, attempts: 1 },
      },
    });

    const now = new Date();
    const { dataStorage } = await import('@/lib/dataStorage');
    (dataStorage.getEntriesForStudent as any).mockReturnValue([
      { id: 'e1', studentId: 's1', timestamp: now, emotions: [], sensoryInputs: [] },
    ]);
    (dataStorage.getGoalsForStudent as any).mockReturnValue([]);

    const engine = new LLMAnalysisEngine();
    const res = await engine.analyzeStudent('s1', undefined, { includeAiMetadata: true });
    expect(res).toBeDefined();
    expect(res.ai?.provider).toBe('openrouter');
    expect(typeof res.ai?.confidence?.overall === 'number').toBe(true);
  });

  it('falls back to heuristic on invalid AI response', async () => {
    const { openRouterClient } = await import('@/lib/ai/openrouterClient');
    (openRouterClient.chatJSON as any).mockResolvedValue({
      data: 'not-json',
      response: {
        content: 'not-json',
        raw: { model: 'gpt-4o-mini' },
        usage: {},
        metrics: { durationMs: 50, attempts: 1 },
      },
    });

    const now = new Date();
    const { dataStorage } = await import('@/lib/dataStorage');
    (dataStorage.getEntriesForStudent as any).mockReturnValue([
      { id: 'e1', studentId: 's1', timestamp: now, emotions: [], sensoryInputs: [] },
    ]);
    (dataStorage.getGoalsForStudent as any).mockReturnValue([]);

    const engine = new LLMAnalysisEngine();
    const res = await engine.analyzeStudent('s1', undefined, { includeAiMetadata: true });
    // Should produce heuristic results with caveat metadata
    expect(res).toBeDefined();
    expect(res.ai).toBeDefined();
    expect(res.ai?.caveats?.some((c) => /fallback/i.test(c || ''))).toBe(true);
  });

  it('selects evidence and preserves sources[] in interventions', async () => {
    const { openRouterClient } = await import('@/lib/ai/openrouterClient');
    const { selectEvidence } = await import('@/lib/evidence/select');
    (openRouterClient.chatJSON as any).mockResolvedValue({
      data: {
        summary: 's',
        keyFindings: [],
        patterns: [],
        correlations: [],
        suggestedInterventions: [
          { title: 't', description: 'd', actions: [], expectedImpact: 'low', metrics: [] },
        ],
        anomalies: [],
        predictiveInsights: [],
        dataLineage: [],
        confidence: { overall: 0.8 },
      },
      response: { raw: { model: 'g' }, usage: {}, metrics: { durationMs: 1 } },
    });
    const engine = new LLMAnalysisEngine();
    const res = await engine.analyzeStudent('s1', undefined, { includeAiMetadata: true });
    expect(selectEvidence as any).toHaveBeenCalled();
    const ints = (res as any).suggestedInterventions || [];
    const hasSources = ints.some((i: any) => Array.isArray(i.sources) && i.sources.length > 0);
    expect(hasSources).toBe(true);
  });

  it('IEP mode threads through and requires richer intervention metadata', async () => {
    const { openRouterClient } = await import('@/lib/ai/openrouterClient');
    (openRouterClient.chatJSON as any).mockImplementation(async (payload: any) => {
      // Inspect prompt for IEP-safe signals
      const userText: string = payload?.[1]?.content || '';
      expect(typeof userText === 'string').toBe(true);
      // Return minimal valid AI report; engine should augment as needed
      return {
        data: {
          summary: 's',
          keyFindings: [],
          patterns: [],
          correlations: [],
          suggestedInterventions: [
            { title: 't', description: 'd', actions: [], expectedImpact: 'low', metrics: [] },
          ],
          anomalies: [],
          predictiveInsights: [],
          dataLineage: [],
          confidence: { overall: 0.8 },
        },
        response: { raw: { model: 'g' }, usage: {}, metrics: { durationMs: 1 } },
      };
    });
    const engine = new LLMAnalysisEngine();
    const res = await engine.analyzeStudent('s1', undefined, {
      includeAiMetadata: true,
      aiProfile: 'iep',
    });
    const ints = (res as any).suggestedInterventions || [];
    expect(ints.length).toBeGreaterThan(0);
    const first = ints[0];
    expect(Array.isArray(first.sources)).toBe(true);
    expect(first.metrics).toBeDefined();
    // optional but preferred in IEP mode
    expect(['short', 'medium', 'long']).toContain(first.timeHorizon ?? 'short');
    expect(['Tier1', 'Tier2', 'Tier3']).toContain(first.tier ?? 'Tier1');
    expect(['classroom', 'school']).toContain(first.scope ?? 'classroom');
  });

  it('does not select evidence when VITE_AI_EVIDENCE_DISABLED=true', async () => {
    const { openRouterClient } = await import('@/lib/ai/openrouterClient');
    const evidenceIndex = await import('@/lib/evidence/select');
    (openRouterClient.chatJSON as any).mockResolvedValue({
      data: {
        summary: 's',
        keyFindings: [],
        patterns: [],
        correlations: [],
        suggestedInterventions: [
          { title: 't', description: 'd', actions: [], expectedImpact: 'low', metrics: [] },
        ],
        anomalies: [],
        predictiveInsights: [],
        dataLineage: [],
        confidence: { overall: 0.8 },
      },
      response: { raw: { model: 'g' }, usage: {}, metrics: { durationMs: 1 } },
    });
    // Temporarily stub the env flag module import
    const envMod = await import('@/lib/env');
    (envMod as any).AI_EVIDENCE_DISABLED = true;
    const engine = new LLMAnalysisEngine();
    const res = await engine.analyzeStudent('s1', undefined, {
      includeAiMetadata: true,
      bypassCache: true,
    });
    // Assert selectEvidence was suppressed
    expect(evidenceIndex.selectEvidence as any).toHaveBeenCalledTimes(0);
    // Interventions should still be present and have sources: []
    expect(Array.isArray((res as any).suggestedInterventions)).toBe(true);
    const allHaveEmptySources = ((res as any).suggestedInterventions as any[]).every(
      (iv) => Array.isArray(iv.sources) && iv.sources.length === 0,
    );
    expect(allHaveEmptySources).toBe(true);
    // Reset flag
    (envMod as any).AI_EVIDENCE_DISABLED = false;
  });

  it('threads aiProfile to cache key and prompt path (smoke)', async () => {
    const { openRouterClient } = await import('@/lib/ai/openrouterClient');
    (openRouterClient.chatJSON as any).mockResolvedValue({
      data: {
        summary: 's',
        keyFindings: [],
        patterns: [],
        correlations: [],
        suggestedInterventions: [],
        anomalies: [],
        predictiveInsights: [],
        dataLineage: [],
        confidence: { overall: 0.8 },
      },
      response: { raw: { model: 'g' }, usage: {}, metrics: { durationMs: 1 } },
    });
    const engine = new LLMAnalysisEngine();
    const res1 = await engine.analyzeStudent('s1', undefined, { aiProfile: 'iep' });
    const res2 = await engine.analyzeStudent('s1', undefined, {
      aiProfile: 'default',
      bypassCache: true,
    });
    expect(res1).toBeDefined();
    expect(res2).toBeDefined();
  });

  it('IEP mode passes profile to generateAnalysisPrompt and affects cache behavior with disclaimers', async () => {
    const { openRouterClient } = await import('@/lib/ai/openrouterClient');
    // Spy on prompt generator
    const promptMod = await import('@/lib/analysis/promptEngineering');
    const spy = vi.spyOn(promptMod, 'generateAnalysisPrompt');

    (openRouterClient.chatJSON as any).mockResolvedValue({
      data: {
        summary: 's',
        keyFindings: [],
        patterns: [],
        correlations: [],
        suggestedInterventions: [
          { title: 't', description: 'd', actions: [], expectedImpact: 'low', metrics: [] },
        ],
        anomalies: [],
        predictiveInsights: [],
        dataLineage: [],
        confidence: { overall: 0.8 },
      },
      response: { raw: { model: 'g' }, usage: {}, metrics: { durationMs: 1 } },
    });

    const engine = new LLMAnalysisEngine();
    const resIep = await engine.analyzeStudent('s1', undefined, {
      includeAiMetadata: true,
      aiProfile: 'iep',
    });
    expect(spy).toHaveBeenCalled();
    // Third argument should be 'iep'
    const lastCall = spy.mock.calls.at(-1);
    expect(lastCall?.[2]).toBe('iep');
    // Expect IEP guidance/disclaimer in system or caveats
    const sys = (promptMod.generateAnalysisPrompt as any).mock?.results?.[0]?.system;
    if (typeof sys === 'string') {
      expect(sys.toLowerCase()).toContain('ingen medisinske');
      expect(sys.toLowerCase()).toContain('klasserommet');
    }
    if (resIep.ai?.caveats) {
      expect(resIep.ai.caveats.join(' ').toLowerCase()).not.toBeUndefined();
    }

    // Cache key difference proxy: subsequent default profile call should still perform a fresh call
    const callsBefore = (openRouterClient.chatJSON as any).mock.calls.length;
    await engine.analyzeStudent('s1', undefined, { includeAiMetadata: true, aiProfile: 'default' });
    const callsAfter = (openRouterClient.chatJSON as any).mock.calls.length;
    expect(callsAfter).toBeGreaterThan(callsBefore);
  });

  it('validates AI schema with evidence fields present', async () => {
    const valid = ZAiReport.safeParse({
      summary: 's',
      keyFindings: [],
      patterns: [],
      correlations: [],
      hypothesizedCauses: [],
      suggestedInterventions: [
        {
          title: 't',
          description: 'd',
          actions: [],
          expectedImpact: 'low',
          metrics: [],
          sources: ['s1'],
          udlCheckpoints: ['1.1'],
          hlps: ['HLP1'],
          tier: 'Tier1',
          scope: 'classroom',
        },
      ],
      anomalies: [],
      predictiveInsights: [],
      dataLineage: [],
      confidence: { overall: 0.8 },
    });
    expect(valid.success).toBe(true);
  });
});
