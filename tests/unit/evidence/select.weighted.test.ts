import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { __setEvidenceJsonProvider } from '@/lib/evidence/index';
import { DomainTag, EvidenceLevel } from '@/lib/evidence/types';
import { selectEvidence } from '@/lib/evidence/select';
import { selectEvidenceWeighted } from '@/lib/evidence/select';

describe('evidence selection - weighted and top-K fallback', () => {
  beforeEach(() => {
    const sources = [
      {
        id: 's_behavior_1',
        title: 'Behavior Strategies Overview',
        url: 'https://example.org/behavior',
        shortExcerpt:
          'Evidence-based behavior strategies for classroom management and positive outcomes.',
        tags: [DomainTag.Behavior],
        year: 2020,
        evidenceLevel: EvidenceLevel.Moderate,
      },
      {
        id: 's_udl_1',
        title: 'UDL Core Principles',
        url: 'https://example.org/udl',
        shortExcerpt:
          'Universal Design for Learning principles applied to diverse learning environments.',
        tags: [DomainTag.UDL],
        year: 2022,
        evidenceLevel: EvidenceLevel.Strong,
      },
      {
        id: 's_math_1',
        title: 'Math Fluency Interventions',
        url: 'https://example.org/math',
        shortExcerpt:
          'Interventions focused on math fluency and number sense for struggling learners.',
        tags: [DomainTag.Math],
        year: 2023,
        evidenceLevel: EvidenceLevel.Strong,
      },
    ];
    __setEvidenceJsonProvider(() => Promise.resolve(sources));
  });

  afterEach(() => {
    // reset provider/caches to avoid leaking between tests
    __setEvidenceJsonProvider(null);
  });

  it('biases selection towards higher-weighted goal domains', async () => {
    const weighted = [
      { tag: DomainTag.Behavior, weight: 0.6 },
      { tag: DomainTag.UDL, weight: 0.2 },
      { tag: DomainTag.Math, weight: 0.1 },
    ];

    const results = await selectEvidenceWeighted(weighted, 2);
    expect(results.length).toBeGreaterThan(0);
    // Highest weight (Behavior) should rank first despite lower evidence level
    expect(results[0].id).toBe('s_behavior_1');
    // Next selected likely includes a framework like UDL or top remaining
    const ids = results.map((r) => r.id);
    expect(ids).toContain('s_udl_1');
  });

  it('preserves bias using top-K tags with legacy selectEvidence', async () => {
    // Only pass the top tag (Behavior) to simulate Approach A fallback
    const results = await selectEvidence([DomainTag.Behavior], 1);
    expect(results.length).toBe(1);
    expect(results[0].tags).toContain(DomainTag.Behavior);
    expect(results[0].id).toBe('s_behavior_1');
  });
});
