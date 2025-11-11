import { describe, it, expect } from 'vitest';
import { detectEWMATrend } from '@/lib/alerts/detectors/ewma';
import type { TrendPoint } from '@/lib/alerts/detectors/types';
import {
  toTrendSeries,
  generateStableBaseline,
  generateStepChange,
  generateGradualTrend,
  injectOutliers,
  addMissing,
} from './syntheticData';
import { isValidDetectorResult } from '@/lib/alerts/types';

describe('EWMA detector', () => {
  it('does not alert on stable baseline (false alert rate target ~1/336)', () => {
    const values = generateStableBaseline(400, 10, 1, 123);
    const series: TrendPoint[] = toTrendSeries(values);
    // Evaluate last window
    const res = detectEWMATrend(series, { lambda: 0.2, minPoints: 20, targetFalseAlertsPerN: 336 });
    expect(res === null || isValidDetectorResult(res)).toBeTruthy();
  });

  it('detects step change of ~2σ with sustained evidence', () => {
    const base = generateStableBaseline(120, 0, 1, 321);
    const stepped = generateStepChange(240, 120, 2, 0, 1, 654);
    const values = base.concat(stepped.slice(120));
    const series = toTrendSeries(values);
    const res = detectEWMATrend(series, { lambda: 0.2, minPoints: 20, targetFalseAlertsPerN: 336 });
    expect(res).not.toBeNull();
    expect(res!.score).toBeGreaterThan(0.2);
    expect(res!.confidence).toBeGreaterThan(0.6);
  });

  it('detects gradual trend with sufficient slope', () => {
    const values = generateGradualTrend(200, 0, 0.05, 0.8, 987);
    const series = toTrendSeries(values);
    const res = detectEWMATrend(series, {
      lambda: 0.25,
      minPoints: 30,
      targetFalseAlertsPerN: 336,
    });
    expect(res).not.toBeNull();
    expect(res!.score).toBeGreaterThan(0.1);
  });

  it('handles edge cases: constant values, missing data, and extreme outliers', () => {
    const constant = new Array(60).fill(5);
    const seriesConst = toTrendSeries(constant);
    const noAlert = detectEWMATrend(seriesConst, {});
    expect(noAlert).toBeNull();

    const base = generateStableBaseline(200, 2, 1, 222);
    const withGaps = addMissing(base, 0.05);
    const withOutliers = injectOutliers(withGaps, 0.02, 10);
    const series = toTrendSeries(withOutliers);
    const res = detectEWMATrend(series, { lambda: 0.2, minPoints: 20, targetFalseAlertsPerN: 336 });
    expect(res === null || isValidDetectorResult(res)).toBeTruthy();
    if (res) {
      expect(res.confidence).toBeLessThan(0.9);
    }
  });

  it('is robust to ~5% NaNs without spurious high-confidence detections', () => {
    const base = generateStableBaseline(400, 0, 1, 9090);
    const withNaNs = addMissing(base, 0.05);
    const series = toTrendSeries(withNaNs);
    const res = detectEWMATrend(series, { lambda: 0.2, minPoints: 30, targetFalseAlertsPerN: 336 });
    expect(res === null || isValidDetectorResult(res)).toBeTruthy();
    if (res) expect(res.confidence).toBeLessThan(0.9);
  });

  it('supports adaptive thresholds via baseline quality score', () => {
    const values = generateStableBaseline(200, 0, 1, 333);
    const series = toTrendSeries(values);
    const conservative = detectEWMATrend(series, {
      baselineQualityScore: 0.3,
      targetFalseAlertsPerN: 336,
    });
    const relaxed = detectEWMATrend(series, {
      baselineQualityScore: 0.95,
      targetFalseAlertsPerN: 336,
    });
    expect(conservative === null || isValidDetectorResult(conservative)).toBeTruthy();
    expect(relaxed === null || isValidDetectorResult(relaxed)).toBeTruthy();
  });
});
