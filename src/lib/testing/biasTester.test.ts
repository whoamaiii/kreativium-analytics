import { describe, it, expect } from 'vitest';
import {
  evaluateFairness,
  isWithinFairnessTolerance,
  type ClassificationRecord,
} from './biasTester';

function buildBalancedDataset(): ClassificationRecord[] {
  const records: ClassificationRecord[] = [];

  for (let i = 0; i < 200; i++) {
    const actual: 0 | 1 = i % 2 === 0 ? 1 : 0;
    const predicted: 0 | 1 = actual;
    records.push({ group: 'A', actual, predicted, score: predicted ? 0.8 : 0.2 });
  }

  for (let i = 0; i < 200; i++) {
    const actual: 0 | 1 = i % 2 === 0 ? 1 : 0;
    const predicted: 0 | 1 = actual;
    records.push({ group: 'B', actual, predicted, score: predicted ? 0.78 : 0.22 });
  }

  return records;
}

function buildBiasedDataset(): ClassificationRecord[] {
  const records: ClassificationRecord[] = [];

  for (let i = 0; i < 200; i++) {
    const actual: 0 | 1 = i % 3 === 0 ? 1 : 0;
    const predicted: 0 | 1 = actual;
    records.push({ group: 'A', actual, predicted });
  }

  for (let i = 0; i < 200; i++) {
    const actual: 0 | 1 = i % 3 === 0 ? 1 : 0;
    const predicted: 0 | 1 = actual === 1 && i % 4 !== 0 ? 0 : 1;
    records.push({ group: 'B', actual, predicted });
  }

  return records;
}

describe('biasTester', () => {
  it('flags parity issues when disparities exceed tolerance', () => {
    const evaluation = evaluateFairness(buildBiasedDataset(), { tolerance: 0.05 });
    expect(evaluation.flaggedMetrics).toContain('equalizedOddsDiff');
    expect(evaluation.metrics.demographicParityDiff).toBeGreaterThan(0);
  });

  it('recognises balanced datasets as within tolerance', () => {
    const records = buildBalancedDataset();
    const evaluation = evaluateFairness(records, { tolerance: 0.05 });
    expect(evaluation.flaggedMetrics).toHaveLength(0);
    expect(isWithinFairnessTolerance(records, 0.05)).toBe(true);
  });
});
