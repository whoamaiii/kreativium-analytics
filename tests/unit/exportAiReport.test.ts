import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AnalyticsResultsAI } from '@/lib/analysis/analysisEngine';
import type { InterventionResult } from '@/types/analytics';

vi.mock('@/lib/evidence', async (orig) => {
  const mod = await (orig() as Promise<typeof import('@/lib/evidence')>);
  return {
    ...mod,
    resolveSources: vi.fn(async (ids: string[]) => ids.map((id) => ({ id, title: `Source ${id}`, url: 'https://example.com', shortExcerpt: 'Excerpt', tags: ['udl'], year: 2021 }))),
  } satisfies typeof mod;
});

const createAnalyticsResult = (overrides: Partial<AnalyticsResultsAI> = {}): AnalyticsResultsAI => ({
  patterns: [],
  correlations: [],
  environmentalCorrelations: [],
  predictiveInsights: [],
  anomalies: [],
  insights: [],
  suggestedInterventions: [],
  ...overrides,
});

const createIntervention = (overrides: Partial<InterventionResult> = {}): InterventionResult => ({
  title: 'Intervention',
  description: 'Description',
  actions: [],
  expectedImpact: undefined,
  timeHorizon: undefined,
  metrics: [],
  confidence: undefined,
  sources: [],
  udlCheckpoints: [],
  hlps: [],
  tier: undefined,
  scope: undefined,
  ...overrides,
});

describe('exportAiReport.formatAiReportText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes inline sources and a Källor section', async () => {
    const { formatAiReportText } = await import('@/lib/ai/exportAiReport');
    const result = createAnalyticsResult({
      suggestedInterventions: [
        createIntervention({
          title: 'Intervention A',
          description: 'Desc',
          metrics: ['M1'],
          sources: ['s1', 's2'],
          tier: 'Tier1',
          scope: 'classroom',
        }),
      ],
    });
    const text = await formatAiReportText(result, { includeMetadata: false, locale: 'sv' });
    expect(text).toMatch(/\[Källor: Source s1, Source s2\]/);
    expect(text).toMatch(/# Källor/);
    expect(text).toMatch(/• Source s1/);
  });

  it('omits sources section gracefully when resolve fails', async () => {
    const evidence = await import('@/lib/evidence');
    vi.mocked(evidence.resolveSources).mockImplementationOnce(async () => { throw new Error('fail'); });
    const { formatAiReportText } = await import('@/lib/ai/exportAiReport');
    const result = createAnalyticsResult({
      suggestedInterventions: [
        createIntervention({
          title: 'Intervention A',
          description: 'Desc',
          metrics: ['M1'],
          sources: ['s1'],
        }),
      ],
    });
    const text = await formatAiReportText(result, { includeMetadata: false, locale: 'sv' });
    expect(text).not.toMatch(/# Källor/);
  });

  it('handles interventions without sources and omits inline [Källor: ...] labels', async () => {
    const { formatAiReportText } = await import('@/lib/ai/exportAiReport');
    const result = createAnalyticsResult({
      suggestedInterventions: [
        createIntervention({
          title: 'Intervention A',
          description: 'Desc',
          metrics: ['M1'],
          sources: [],
        }),
      ],
    });
    const text = await formatAiReportText(result, { includeMetadata: false, locale: 'sv' });
    expect(text).not.toMatch(/\[Källor:/);
    expect(text).not.toMatch(/# Källor/);
  });
});

