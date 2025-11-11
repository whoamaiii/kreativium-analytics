import { describe, it, expect, vi, beforeEach } from 'vitest';

// We'll dynamically import the module under test after setting up provider
const MODULE_PATH = '@/lib/evidence/index';

type EvidenceSource = {
  id: string;
  title: string;
  url: string;
  shortExcerpt: string;
  tags: string[];
  gradeBands?: string[];
  year?: number;
  publisher?: string;
  evidenceLevel?: string;
  loc?: string;
};

function makeValidData(): EvidenceSource[] {
  return [
    {
      id: 'UDL-GUIDELINES-CAST',
      title: 'UDL Guidelines by CAST',
      url: 'https://udlguidelines.cast.org',
      shortExcerpt:
        'Universal Design for Learning guidelines and checkpoints for flexible learning.',
      tags: ['udl'],
      gradeBands: ['k-3', '4-6'],
      year: 2018,
      publisher: 'CAST',
      evidenceLevel: 'moderate',
    },
    {
      id: 'WWC-READ-PHONICS-2016',
      title: 'WWC Foundational Skills to Support Reading',
      url: 'https://ies.ed.gov/ncee/wwc/PracticeGuide/21',
      shortExcerpt:
        'Phonics and foundational reading skills evidence-based practices for K-3 literacy instruction.',
      tags: ['reading'],
      gradeBands: ['k-3'],
      year: 2016,
      publisher: 'IES',
      evidenceLevel: 'strong',
    },
    {
      id: 'ASHA-AAC-OVERVIEW',
      title: 'ASHA Augmentative and Alternative Communication',
      url: 'https://www.asha.org/public/speech/disorders/aac/',
      shortExcerpt: 'Overview of AAC systems and strategies to support communication needs.',
      tags: ['aac'],
      gradeBands: ['4-6', '7-9'],
      year: 2020,
      publisher: 'ASHA',
      evidenceLevel: 'emerging',
    },
  ];
}

async function importFresh() {
  return await import(MODULE_PATH);
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('evidence loader and resolver', () => {
  it('caches only on success and returns defensive clones', async () => {
    const importCount = { n: 0 };
    const VALID = makeValidData();

    const mod = await importFresh();
    mod.__setEvidenceJsonProvider(async () => {
      importCount.n += 1;
      return { default: VALID };
    });

    const a = await mod.loadEvidenceSources();
    const b = await mod.loadEvidenceSources();

    expect(importCount.n).toBe(1);
    expect(a).toEqual(VALID);
    expect(b).toEqual(VALID);
    expect(a).not.toBe(b);

    a.push({
      id: 'MUT-1',
      title: 'Mutated',
      url: 'https://example.com',
      shortExcerpt: 'This should not persist.',
      tags: ['udl'],
    });
    a[0].tags.push('reading');

    const c = await mod.loadEvidenceSources();
    expect(c).toEqual(VALID);
    expect(c).not.toBe(a);
  });

  it('does not cache failures: validation error then success', async () => {
    // invalid: shortExcerpt too short and invalid tag
    let mod = await importFresh();
    mod.__setEvidenceJsonProvider(async () => ({
      default: [
        {
          id: 'BAD',
          title: 'Bad',
          url: 'https://example.com',
          shortExcerpt: 'too short',
          tags: ['invalid_tag'],
        },
      ],
    }));

    const first = await mod.loadEvidenceSources();
    expect(first).toEqual([]);

    vi.resetModules();
    mod = await importFresh();
    const importCount = { n: 0 };
    const VALID = makeValidData();
    mod.__setEvidenceJsonProvider(async () => {
      importCount.n += 1;
      return { default: VALID };
    });

    const second = await mod.loadEvidenceSources();
    expect(second).toEqual(VALID);
    expect(importCount.n).toBe(1);
  });

  it('does not cache failures: import error then success', async () => {
    let mod = await importFresh();
    mod.__setEvidenceJsonProvider(async () => {
      throw new Error('boom');
    });

    const first = await mod.loadEvidenceSources();
    expect(first).toEqual([]);

    vi.resetModules();
    mod = await importFresh();
    const importCount = { n: 0 };
    const VALID = makeValidData();
    mod.__setEvidenceJsonProvider(async () => {
      importCount.n += 1;
      return { default: VALID };
    });

    const second = await mod.loadEvidenceSources();
    expect(second).toEqual(VALID);
    expect(importCount.n).toBe(1);
  });

  it('resolveSources preserves order, dedupes, and matches case-insensitively', async () => {
    const VALID = makeValidData();
    const mod = await importFresh();
    mod.__setEvidenceJsonProvider(async () => ({ default: VALID }));

    const ids = [
      'wwc-read-phonics-2016',
      'udl-guidelines-cast',
      'UDL-GUIDELINES-CAST',
      'ASHA-AAC-OVERVIEW',
    ];
    const resolved = await mod.resolveSources(ids);
    expect(resolved.map((r) => r.id)).toEqual([
      'WWC-READ-PHONICS-2016',
      'UDL-GUIDELINES-CAST',
      'ASHA-AAC-OVERVIEW',
    ]);
  });

  it('deduplicates concurrent loads (single import) and returns identical data', async () => {
    const importCount = { n: 0 };
    const VALID = makeValidData();
    const mod = await importFresh();
    mod.__setEvidenceJsonProvider(async () => {
      importCount.n += 1;
      return { default: VALID };
    });

    const [a, b, c] = await Promise.all([
      mod.loadEvidenceSources(),
      mod.loadEvidenceSources(),
      mod.loadEvidenceSources(),
    ]);

    expect(importCount.n).toBe(1);
    expect(a).toEqual(VALID);
    expect(b).toEqual(VALID);
    expect(c).toEqual(VALID);
  });

  it('caches valid empty dataset', async () => {
    const importCount = { n: 0 };
    const mod = await importFresh();
    mod.__setEvidenceJsonProvider(async () => {
      importCount.n += 1;
      return { default: [] };
    });

    const a = await mod.loadEvidenceSources();
    const b = await mod.loadEvidenceSources();

    expect(a).toEqual([]);
    expect(b).toEqual([]);
    expect(importCount.n).toBe(1);
  });
});
