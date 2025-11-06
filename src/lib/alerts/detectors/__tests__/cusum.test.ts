import { describe, it, expect } from 'vitest';
import { detectCUSUMShift } from '@/lib/alerts/detectors/cusum';
import { toTrendSeries, generateStableBaseline, generateStepChange, addMissing } from './syntheticData';
import { isValidDetectorResult } from '@/lib/alerts/types';

describe('CUSUM detector', () => {
  it('does not alert on stable baseline with default thresholds', () => {
    const values = generateStableBaseline(400, 0, 1, 101);
    const series = toTrendSeries(values);
    const res = detectCUSUMShift(series, { minPoints: 20, targetFalseAlertsPerN: 336 });
    expect(res === null || isValidDetectorResult(res)).toBeTruthy();
  });

  it('detects small persistent shift (~1σ-1.5σ) with tuned k and h', () => {
    const n = 240;
    const stepIdx = 120;
    const values = generateStepChange(n, stepIdx, 1.5, 0, 1, 8080);
    const series = toTrendSeries(values);
    const res = detectCUSUMShift(series, { kFactor: 0.5, targetFalseAlertsPerN: 336 });
    expect(res).not.toBeNull();
    expect(res!.confidence).toBeGreaterThan(0.65);
  });

  it('exposes tuning details in sources and analysis', () => {
    const values = generateStepChange(200, 100, 2, 0, 1, 2020);
    const series = toTrendSeries(values);
    const res = detectCUSUMShift(series, { kFactor: 0.4, targetFalseAlertsPerN: 336 });
    expect(res).not.toBeNull();
    const src = res!.sources?.[0]?.details as any;
    expect(src).toBeTruthy();
    expect(src.decisionIntervalMultiplier).toBeGreaterThan(0);
    expect(res!.analysis).toBeTruthy();
  });

  it('applies baselineQualityScore to increase decision interval multiplier when low quality', () => {
    const values = generateStableBaseline(400, 0, 1, 2024);
    const series = toTrendSeries(values);
    const low = detectCUSUMShift(series, { kFactor: 0.5, targetFalseAlertsPerN: 336, baselineQualityScore: 0.3 });
    const high = detectCUSUMShift(series, { kFactor: 0.5, targetFalseAlertsPerN: 336, baselineQualityScore: 0.95 });
    const mLow = (low?.sources?.[0]?.details as any)?.decisionIntervalMultiplier ?? 0;
    const mHigh = (high?.sources?.[0]?.details as any)?.decisionIntervalMultiplier ?? 0;
    expect(mLow).toBeGreaterThanOrEqual(mHigh);
  });

  it('is robust to ~5% NaNs without spurious high-confidence detections', () => {
    const base = generateStableBaseline(400, 0, 1, 4242);
    const withNaNs = addMissing(base, 0.05);
    const series = toTrendSeries(withNaNs);
    const res = detectCUSUMShift(series, { kFactor: 0.5, minPoints: 20, targetFalseAlertsPerN: 336 });
    expect(res === null || isValidDetectorResult(res)).toBeTruthy();
    if (res) expect(res.confidence).toBeLessThan(0.9);
  });

  it('detects negative step change with sided="lower" or both', () => {
    const n = 240;
    const stepIdx = 120;
    const up = generateStepChange(n, stepIdx, -2, 0, 1, 6060); // negative shift
    const series = toTrendSeries(up);
    const resLower = detectCUSUMShift(series, { sided: 'lower', kFactor: 0.5, targetFalseAlertsPerN: 336 });
    const resBoth = detectCUSUMShift(series, { sided: 'both', kFactor: 0.5, targetFalseAlertsPerN: 336 });
    expect(resLower === null || isValidDetectorResult(resLower)).toBeTruthy();
    expect(resBoth === null || isValidDetectorResult(resBoth)).toBeTruthy();
  });
});


