import { describe, it, expect } from 'vitest';
import { detectAssociation } from '@/lib/alerts/detectors/association';
import { isValidDetectorResult } from '@/lib/alerts/types';
import { generateContingencyTable, generateCorrelatedSeries } from './syntheticData';

describe('Association detector (Fisher exact + log-odds + correlation)', () => {
  it('alerts on strong association (odds ratio ~4)', () => {
    const table = generateContingencyTable({ total: 200, oddsRatio: 4 });
    const res = detectAssociation({ label: 'Strong OR', contingency: table, minSupport: 5 });
    expect(res).not.toBeNull();
    expect(isValidDetectorResult(res)).toBeTruthy();
    const details = (res!.sources?.[0]?.details ?? {}) as any;
    expect(details.pValueExact).toBeLessThan(0.1);
    expect(res!.confidence).toBeGreaterThan(0.7);
  });

  it('does not alert when association is near null (OR ~1)', () => {
    const table = generateContingencyTable({ total: 200, oddsRatio: 1.0 });
    const res = detectAssociation({ label: 'Null OR', contingency: table, minSupport: 5 });
    expect(res).toBeNull();
  });

  it('enforces minimum support threshold', () => {
    const table = generateContingencyTable({ total: 4, oddsRatio: 4 });
    const res = detectAssociation({ label: 'Low support', contingency: table, minSupport: 5 });
    expect(res).toBeNull();
  });

  it('handles zero-cell cases with continuity adjustment', () => {
    const table = generateContingencyTable({ total: 50, oddsRatio: 8, zeroCells: true });
    const res = detectAssociation({ label: 'Zero cells', contingency: table, minSupport: 5 });
    expect(res === null || isValidDetectorResult(res)).toBeTruthy();
  });

  it('uses Pearson correlation when time series provided', () => {
    const { x, y } = generateCorrelatedSeries(50, 0.7, 1357);
    const table = generateContingencyTable({ total: 200, oddsRatio: 2 });
    const res = detectAssociation({ label: 'With corr', contingency: table, seriesX: x, seriesY: y, minSupport: 5 });
    expect(res).not.toBeNull();
    const details = (res!.sources?.[0]?.details ?? {}) as any;
    expect(Math.abs(details.correlation)).toBeGreaterThan(0.5);
  });
});




