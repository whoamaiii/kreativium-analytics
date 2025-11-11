import { DataLeakageDetector } from '@/lib/validation/dataLeakage';

describe('DataLeakageDetector', () => {
  test('detects overlap and duplicates in splits', () => {
    const det = new DataLeakageDetector({ mode: 'permissive' });
    const records = [{}, {}, {}, {}];
    const train = [0, 1, 1];
    const test = [1, 2, 3];
    const report = det.analyze(records, {
      trainIndex: train,
      testIndex: test,
      targetKey: 'y',
      featureKeys: ['x'],
    });
    expect(report.issues.find((i) => i.type === 'SPLIT_OVERLAP')).toBeTruthy();
    expect(report.issues.filter((i) => i.type === 'SPLIT_DUPLICATES').length).toBeGreaterThan(0);
  });

  test('temporal leakage global and per-entity', () => {
    const det = new DataLeakageDetector({
      mode: 'permissive',
      temporal: { timeColumn: 't', entityColumn: 'id', allowTrainAfterTest: false },
    });
    const records = [
      { id: 'A', t: new Date('2020-01-02').toISOString(), x: 1, y: 0 },
      { id: 'A', t: new Date('2020-01-03').toISOString(), x: 2, y: 1 },
      { id: 'A', t: new Date('2020-01-01').toISOString(), x: 3, y: 1 },
    ];
    const train = [0, 1];
    const test = [2];
    const report = det.analyze(records, {
      trainIndex: train,
      testIndex: test,
      targetKey: 'y',
      featureKeys: ['x'],
    });
    expect(report.issues.some((i) => i.type === 'TEMPORAL_GLOBAL')).toBe(true);
    expect(report.issues.some((i) => i.type === 'TEMPORAL_PER_ENTITY')).toBe(true);
  });

  test('feature contamination: target in features, near-identity and high correlation', () => {
    const det = new DataLeakageDetector({
      mode: 'permissive',
      thresholds: { highCorrelation: 0.9, nearIdentityFraction: 0.95 },
    });
    const records = [
      { x: 0, z: 0, y: 0 },
      { x: 1, z: 1, y: 1 },
      { x: 2, z: 2, y: 2 },
      { x: 3, z: 3, y: 3 },
    ];
    const report = det.analyze(records, {
      records,
      trainIndex: [0, 1, 2],
      testIndex: [3],
      targetKey: 'y',
      featureKeys: ['x', 'y', 'z'],
    });
    expect(report.issues.some((i) => i.type === 'TARGET_IN_FEATURES')).toBe(true);
    expect(report.issues.some((i) => i.type === 'NEAR_IDENTITY_FEATURE')).toBe(true);
    expect(report.issues.some((i) => i.type === 'HIGH_CORRELATION_FEATURE')).toBe(true);
  });

  test('name-based heuristic flags future/label-like feature names', () => {
    const det = new DataLeakageDetector();
    const records = [{ future_value: 1, y: 0 }];
    const report = det.analyze(records, {
      records,
      trainIndex: [0],
      testIndex: [],
      targetKey: 'y',
      featureKeys: ['future_value'],
    });
    expect(report.issues.some((i) => i.type === 'FUTURE_NAMED_FEATURE')).toBe(true);
  });
});
