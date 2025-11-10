import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildInsightsCacheKey, buildInsightsTask } from '@/lib/insights/task';

vi.mock('@/lib/analyticsConfig', async (orig) => {
  const mod: any = await orig();
  const DEFAULT = mod.DEFAULT_ANALYTICS_CONFIG;
  const cfg = { ...DEFAULT, cache: { ...DEFAULT.cache, ttl: 300_000 } }; // 5 minutes
  return {
    ...mod,
    analyticsConfig: {
      getConfig: vi.fn(() => ({ ...cfg })),
    },
    DEFAULT_ANALYTICS_CONFIG: cfg,
  };
});

describe('buildInsightsCacheKey', () => {
  it('is stable across reordering of inputs and includes structural counts via createCacheKey', () => {
    const inputsA = {
      entries: [
        { id: 't1', timestamp: new Date('2025-01-02T00:00:00Z'), value: 1 },
        { id: 't2', timestamp: new Date('2025-01-03T00:00:00Z'), value: 2 },
      ] as any[],
      emotions: [
        {
          id: 'e1',
          studentId: 's1',
          emotion: 'happy',
          intensity: 3,
          timestamp: new Date('2025-01-01T00:00:00Z'),
        },
        {
          id: 'e2',
          studentId: 's1',
          emotion: 'sad',
          intensity: 2,
          timestamp: new Date('2025-01-04T00:00:00Z'),
        },
      ] as any[],
      sensoryInputs: [
        {
          id: 's1',
          studentId: 's1',
          sense: 'visual',
          response: 'seeking',
          intensity: 3,
          timestamp: new Date('2025-01-05T00:00:00Z'),
        },
      ] as any[],
      goals: [{ id: 'g1' }] as any[],
    };

    const inputsB = {
      entries: inputsA.entries.slice().reverse(),
      emotions: inputsA.emotions.slice().reverse(),
      sensoryInputs: inputsA.sensoryInputs.slice(),
      goals: inputsA.goals?.slice(),
    } as any;

    const keyA = buildInsightsCacheKey(inputsA, {});
    const keyB = buildInsightsCacheKey(inputsB, {});

    expect(keyA).toBe(keyB);
    // Ensure the key has the expected colon-separated parts and includes counts prefix markers
    const parts = keyA.split(':');
    // namespace + 5 count parts + hash => at least 7 parts
    expect(parts.length).toBeGreaterThanOrEqual(7);
    expect(parts[0]).toBe('insights');
    expect(parts.slice(1, 6).every((p) => /^[ciokp]\d+$/.test(p))).toBe(true);
  });

  it('produces different keys when counts differ', () => {
    const base = {
      entries: [{ id: 't1', timestamp: new Date(), value: 1 }] as any[],
      emotions: [] as any[],
      sensoryInputs: [] as any[],
    };
    const k1 = buildInsightsCacheKey(base as any, {});
    const k2 = buildInsightsCacheKey(
      {
        ...base,
        entries: base.entries.concat({ id: 't2', timestamp: new Date(), value: 2 } as any),
      } as any,
      {},
    );
    expect(k1).not.toBe(k2);
  });
});

describe('buildInsightsTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a consistent task envelope with cacheKey, ttlSeconds, and tags', () => {
    const inputs = { entries: [], emotions: [], sensoryInputs: [] } as any;
    const task = buildInsightsTask(inputs, { tags: ['custom'] });

    expect(task.type).toBe('Insights/Compute');
    expect(typeof task.cacheKey).toBe('string');
    expect(task.cacheKey.length).toBeGreaterThan(10);
    expect(task.ttlSeconds).toBeGreaterThan(0);
    expect(task.tags).toEqual(expect.arrayContaining(['insights', 'v2', 'custom']));
    expect(task.payload).toEqual(expect.objectContaining({ inputs }));
  });

  it('honors TTL override in options', () => {
    const inputs = { entries: [], emotions: [], sensoryInputs: [] } as any;
    const task = buildInsightsTask(inputs, { ttlSeconds: 42 });
    expect(task.ttlSeconds).toBe(42);
  });
});
