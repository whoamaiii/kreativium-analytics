import { describe, it, expect } from 'vitest';
import { createCacheKey, stableHash, summarizeCounts } from '@/lib/analytics/cache-key';

// Minimal smoke tests for centralized analytics cache key

describe('analytics/cache-key', () => {
  it('creates deterministic keys with counts and hash', () => {
    const input = { a: 1, b: [3, 2, 1], o: { z: true, a: false } };
    const k1 = createCacheKey({ namespace: 'insights', input, normalizeArrayOrder: true });
    const k2 = createCacheKey({
      namespace: 'insights',
      input: { b: [1, 2, 3], o: { a: false, z: true }, a: 1 },
      normalizeArrayOrder: true,
    });
    expect(k1).toEqual(k2); // order-insensitive when normalizeArrayOrder=true
    expect(k1.split(':')[0]).toBe('insights');
  });

  it('summarizeCounts returns non-zero counts for composite input', () => {
    const counts = summarizeCounts({
      x: [1, 2, { y: 'z' }],
      m: new Map([[1, 2]]),
      s: new Set([5, 4]),
    });
    expect(counts.arrays).toBeGreaterThan(0);
    expect(counts.objects).toBeGreaterThan(0);
    expect(counts.keys).toBeGreaterThan(0);
    expect(counts.primitives).toBeGreaterThan(0);
  });

  it('stableHash returns lowercase hex', () => {
    const h = stableHash({ a: 1, b: [2, 3] });
    expect(h).toMatch(/^[0-9a-f]{8}$/);
  });
});
