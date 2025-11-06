import { describe, it, expect } from 'vitest';
import { resolveParams } from '@/lib/adaptive/rules';

describe('adaptive rules', () => {
  it('shortens window for fast responses', () => {
    const fast = resolveParams(800, 0.6, 0.2);
    const slow = resolveParams(2600, 0.6, 0.2);
    expect(fast.timeWindowMs).toBeLessThan(slow.timeWindowMs);
  });

  it('increases hold for higher stability', () => {
    const low = resolveParams(1800, 0.4, 0.2);
    const high = resolveParams(1800, 0.8, 0.2);
    expect(high.holdDurationMs).toBeGreaterThan(low.holdDurationMs);
  });
});






