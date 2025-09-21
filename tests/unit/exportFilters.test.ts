import { describe, it, expect } from 'vitest';
import { computeDateRange, isCustomRangeInvalid } from '@/lib/dateRange';

describe('export filters helpers', () => {
  it('computes relative presets', () => {
    const r7 = computeDateRange('7d');
    expect(r7).toBeTruthy();
    const diffDays = Math.round((r7!.end.getTime() - r7!.start.getTime()) / (1000*60*60*24));
    expect(diffDays).toBeGreaterThanOrEqual(6);
  });

  it('returns undefined for all', () => {
    expect(computeDateRange('all')).toBeUndefined();
  });

  it('validates custom ranges', () => {
    const valid = computeDateRange('custom', '2025-01-01', '2025-01-31');
    expect(valid).toBeTruthy();
    expect(isCustomRangeInvalid('custom', '2025-01-01', '2025-01-31')).toBe(false);
    expect(isCustomRangeInvalid('custom', '', '2025-01-31')).toBe(true);
    expect(isCustomRangeInvalid('custom', '2025-02-01', '2025-01-31')).toBe(true);
  });
});
