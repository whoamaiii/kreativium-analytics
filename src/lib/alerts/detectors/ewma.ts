import { DetectorResult, SourceType } from '@/lib/alerts/types';
import { median, mad } from '@/lib/statistics';
import { logger } from '@/lib/logger';
import {
  adjustMultiplierByBaselineQuality,
  clamp as clampTuning,
  computeEwmaControlMultiplier,
} from '@/lib/alerts/detectors/tuning';
import type { TrendPoint } from '@/lib/alerts/detectors/types';

// Re-export for backward compatibility
export type { TrendPoint };

export interface EWMADetectorOptions {
  lambda?: number;
  minPoints?: number;
  label?: string;
  baselineMedian?: number;
  baselineIqr?: number;
  /** Target false alerts of ~1 per N points (two-sided). Default 336. */
  targetFalseAlertsPerN?: number;
  /** Optional baseline quality score (0-1) to adapt thresholds. */
  baselineQualityScore?: number;
  /** Enable adaptive thresholds based on baseline quality. Default true. */
  adaptive?: boolean;
  /** Override sustained points logic (default: 3 of last 5). */
  sustainedPointsRequired?: number;
  recentWindowSize?: number;
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function detectEWMATrend(
  series: TrendPoint[],
  options: EWMADetectorOptions = {},
): DetectorResult | null {
  const minPoints = Number.isFinite(options.minPoints)
    ? Math.max(5, Math.floor(options.minPoints as number))
    : 8;
  if (!Array.isArray(series) || series.length < minPoints) {
    return null;
  }

  // Parameter validation
  let lambda = options.lambda ?? 0.2;
  if (!Number.isFinite(lambda)) lambda = 0.2;
  lambda = clamp(lambda, 1e-3, 0.9);
  // Build values with finite filtering; track timestamps for completeness
  const rawValues = series.map((p) => p.value);
  const valuesFinite: number[] = [];
  for (let i = 0; i < rawValues.length; i++) {
    const v = rawValues[i];
    if (Number.isFinite(v)) valuesFinite.push(v as number);
  }
  const values = rawValues.map((v) => (Number.isFinite(v) ? (v as number) : NaN));
  if (valuesFinite.length === 0 || valuesFinite.every((v) => v === valuesFinite[0])) {
    return null;
  }

  // Consistent sigma/IQR handling
  const baselineMedian = Number.isFinite(options.baselineMedian)
    ? (options.baselineMedian as number)
    : median(valuesFinite);
  let baselineIqr: number;
  let sigma0: number;
  if (Number.isFinite(options.baselineIqr)) {
    baselineIqr = Math.max(options.baselineIqr as number, 1e-6);
    sigma0 = Math.max(baselineIqr / 1.349, 1e-6);
  } else {
    sigma0 = mad(valuesFinite, 'normal') || 1e-6;
    baselineIqr = sigma0 * 1.349;
  }

  const baseMultiplier = computeEwmaControlMultiplier(options.targetFalseAlertsPerN ?? 336);
  const adaptive = options.adaptive !== false;
  const qualityScore = options.baselineQualityScore;
  const zMultiplier = adaptive
    ? adjustMultiplierByBaselineQuality(baseMultiplier, qualityScore)
    : baseMultiplier;
  const sigmaEwma = sigma0 * Math.sqrt(lambda / (2 - lambda));
  const upperLimit = baselineMedian + zMultiplier * sigmaEwma;
  const lowerLimit = baselineMedian - zMultiplier * sigmaEwma;

  const ewma: number[] = new Array(values.length);
  let prev = baselineMedian;
  for (let i = 0; i < values.length; i++) {
    const x = values[i];
    const xi = Number.isFinite(x) ? (x as number) : prev; // impute non-finite with prev
    prev = lambda * xi + (1 - lambda) * prev;
    ewma[i] = prev;
  }

  const recentWindowSize = Number.isFinite(options.recentWindowSize)
    ? Math.max(3, Math.floor(options.recentWindowSize as number))
    : 5;
  const sustainedRequired = Number.isFinite(options.sustainedPointsRequired)
    ? Math.max(2, Math.floor(options.sustainedPointsRequired as number))
    : 3;
  const recentLength = Math.min(recentWindowSize, ewma.length);
  let upperCount = 0;
  let lowerCount = 0;
  for (let i = ewma.length - recentLength; i < ewma.length; i++) {
    if (ewma[i] > upperLimit) upperCount += 1;
    if (ewma[i] < lowerLimit) lowerCount += 1;
  }

  const sustainedCount = Math.max(upperCount, lowerCount);
  if (sustainedCount < sustainedRequired) {
    return null;
  }

  const direction = upperCount > lowerCount ? 'increase' : 'decrease';
  const latestValue = values[values.length - 1];
  const latestEwma = ewma[ewma.length - 1];
  const zScore = (latestEwma - baselineMedian) / (sigmaEwma || 1);

  const score = clamp(Math.abs(zScore) / Math.max(4, zMultiplier + 1), 0, 1);
  const confidenceBase = 0.6 + (sustainedCount - sustainedRequired) * 0.08;
  const confidence = clamp(confidenceBase + Math.min(0.2, Math.abs(zScore) / 10), 0.6, 0.97);

  const sources = [
    {
      type: SourceType.PatternEngine,
      label: options.label ?? 'EWMA Trend',
      details: {
        lambda,
        baselineMedian,
        baselineIqr,
        sigma0,
        sigmaEwma,
        zMultiplier,
        upperLimit,
        lowerLimit,
        sustainedPoints: sustainedCount,
        direction,
        zScore,
        latestValue,
        ewmaLatest: latestEwma,
      },
    },
  ];

  const impactHint =
    direction === 'increase'
      ? 'Sustained increase relative to baseline'
      : 'Sustained decrease relative to baseline';

  const ciLower = baselineMedian - zMultiplier * (sigmaEwma || 1);
  const ciUpper = baselineMedian + zMultiplier * (sigmaEwma || 1);

  const result: DetectorResult = {
    score,
    confidence,
    impactHint,
    sources,
    thresholdApplied: zMultiplier,
    analysis: {
      ciEwma: { lower: ciLower, upper: ciUpper, level: undefined, n: series.length },
      sustainedWindow: recentWindowSize,
      sustainedRequired,
    },
  };

  logger.debug('EWMA detection evaluated', {
    label: options.label ?? 'EWMA',
    sustainedCount,
    recentWindowSize,
    sustainedRequired,
    zMultiplier,
    qualityScore,
    detected: true,
  });

  return result;
}
