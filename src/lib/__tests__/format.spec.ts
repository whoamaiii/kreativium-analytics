import { describe, it, expect } from 'vitest';
import { formatPercent, formatFixed } from '@/lib/format';

describe('format helpers', () => {
  it('formatPercent respects digits and locale', () => {
    expect(formatPercent(0.1234, 0, 'en-US')).toBe('12%');
    expect(formatPercent(0.125, 1, 'en-US')).toBe('12.5%');
  });

  it('formatFixed formats with fixed digits', () => {
    expect(formatFixed(12.3456, 2, 'en-US')).toBe('12.35');
    expect(formatFixed(12, 3, 'en-US')).toBe('12.000');
  });

  it('handles non-finite inputs safely', () => {
    expect(() => formatPercent(Number.NaN, 0, 'en-US')).not.toThrow();
    expect(() =>
      formatFixed(Number.POSITIVE_INFINITY as unknown as number, 2, 'en-US'),
    ).not.toThrow();
  });
});
