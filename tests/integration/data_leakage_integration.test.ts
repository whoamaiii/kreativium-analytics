import { describe, it, expect } from 'vitest';
import { DataLeakageDetector } from '@/lib/validation/dataLeakage';

// Integration scenario: run leakage detector on a realistic split created from preprocessed/training-like data

describe('Integration: data leakage guards in a real-world-like split', () => {
  it('flags leakage when train and test overlap or chronology is violated', () => {
    const det = new DataLeakageDetector({
      mode: 'permissive',
      temporal: { timeColumn: 't', entityColumn: 'sid', allowTrainAfterTest: false },
    });

    // Create a small dataset mimicking training rows
    const records = [
      { sid: 'S1', t: '2024-01-02T00:00:00Z', x: 0, y: 0 },
      { sid: 'S1', t: '2024-01-03T00:00:00Z', x: 1, y: 1 },
      { sid: 'S1', t: '2024-01-01T00:00:00Z', x: 2, y: 0 },
      { sid: 'S2', t: '2024-01-05T00:00:00Z', x: 3, y: 1 },
      { sid: 'S2', t: '2023-12-31T00:00:00Z', x: 4, y: 0 },
    ];

    // Intentionally create overlap and per-entity temporal violation
    const trainIndex = [0, 1, 3];
    const testIndex = [1, 2, 4];

    const report = det.analyze(records, {
      records,
      trainIndex,
      testIndex,
      targetKey: 'y',
      featureKeys: ['x'],
    });
    expect(report.hasHighRisk).toBe(true);
    expect(report.issues.some((i) => i.type === 'SPLIT_OVERLAP')).toBe(true);
    expect(report.issues.some((i) => i.type === 'TEMPORAL_GLOBAL')).toBe(true);
    expect(report.issues.some((i) => i.type === 'TEMPORAL_PER_ENTITY')).toBe(true);
  });
});
