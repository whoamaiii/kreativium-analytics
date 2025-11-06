import { DetectorResult, SourceType } from '@/lib/alerts/types';
import { mad, median } from '@/lib/statistics';
import { logger } from '@/lib/logger';
import {
  clamp as clampTuning,
  computeCusumDecisionIntervalMultiplier,
  adjustMultiplierByBaselineQuality,
} from '@/lib/alerts/detectors/tuning';
import type { TrendPoint } from '@/lib/alerts/detectors/types';

export interface CUSUMDetectorOptions {
  baselineMean?: number;
  baselineSigma?: number;
  kFactor?: number;
  decisionInterval?: number;
  label?: string;
  minPoints?: number;
  /** Target false alerts of ~1 per N points (one-sided CUSUM). Default 336. */
  targetFalseAlertsPerN?: number;
  /** Optional baseline quality score (0-1) to adapt thresholds indirectly via decision interval. */
  baselineQualityScore?: number;
  /** Sidedness of detection: 'upper' | 'lower' | 'both' (default 'upper') */
  sided?: 'upper' | 'lower' | 'both';
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function detectCUSUMShift(series: TrendPoint[], options: CUSUMDetectorOptions = {}): DetectorResult | null {
  const minPoints = Number.isFinite(options.minPoints) ? Math.max(5, Math.floor(options.minPoints as number)) : 6;
  if (!Array.isArray(series) || series.length < minPoints) {
    return null;
  }

  // Build finite-filtered values and use NaN sentinel for non-finite
  const rawValues = series.map((p) => p.value);
  const valuesFinite: number[] = [];
  for (let i = 0; i < rawValues.length; i++) if (Number.isFinite(rawValues[i])) valuesFinite.push(rawValues[i] as number);
  const values = rawValues.map((v) => (Number.isFinite(v) ? (v as number) : NaN));
  if (valuesFinite.length === 0 || valuesFinite.every((v) => v === valuesFinite[0])) {
    return null;
  }

  const baselineMean = Number.isFinite(options.baselineMean)
    ? (options.baselineMean as number)
    : median(valuesFinite);
  const sigma = Number.isFinite(options.baselineSigma) && (options.baselineSigma as number) > 0
    ? Math.max(options.baselineSigma as number, 1e-6)
    : Math.max(mad(valuesFinite, 'normal'), 1e-6);

  const kFactor = Number.isFinite(options.kFactor) ? Math.max(0.1, Math.min(options.kFactor as number, 1)) : 0.5;
  const k = kFactor * sigma;
  const hMultiplier = Number.isFinite(options.decisionInterval)
    ? Math.max(1, options.decisionInterval as number)
    : computeCusumDecisionIntervalMultiplier(kFactor, options.targetFalseAlertsPerN ?? 336);
  const qa = options.baselineQualityScore;
  const adjHMultiplier = Number.isFinite(qa) ? adjustMultiplierByBaselineQuality(hMultiplier, qa) : hMultiplier;
  const h = adjHMultiplier * sigma;

  // Sidedness handling
  const sided = options.sided ?? 'upper';
  let cusumU = 0;
  let cusumL = 0;
  let maxCusumU = 0;
  let maxCusumL = 0;
  let exceedIndexU = -1;
  let exceedIndexL = -1;

  for (let i = 0; i < values.length; i++) {
    const x = values[i];
    if (!Number.isFinite(x)) continue; // skip non-finite entries
    if (sided === 'upper' || sided === 'both') {
      cusumU = Math.max(0, cusumU + ((x as number) - (baselineMean + k)));
      if (cusumU > maxCusumU) {
        maxCusumU = cusumU;
        exceedIndexU = i;
      }
    }
    if (sided === 'lower' || sided === 'both') {
      cusumL = Math.max(0, cusumL + ((baselineMean - k) - (x as number)));
      if (cusumL > maxCusumL) {
        maxCusumL = cusumL;
        exceedIndexL = i;
      }
    }
  }

  let maxCusum = maxCusumU;
  let exceedIndex = exceedIndexU;
  let side: 'upper' | 'lower' = 'upper';
  if (sided === 'lower') {
    maxCusum = maxCusumL;
    exceedIndex = exceedIndexL;
    side = 'lower';
  } else if (sided === 'both') {
    if (maxCusumL > maxCusumU) {
      maxCusum = maxCusumL;
      exceedIndex = exceedIndexL;
      side = 'lower';
    } else {
      maxCusum = maxCusumU;
      exceedIndex = exceedIndexU;
      side = 'upper';
    }
  }

  if (maxCusum <= h || exceedIndex < 0) {
    return null;
  }

  const exceedValue = values[exceedIndex];
  const thresholdRatio = maxCusum / h;
  const score = clamp((thresholdRatio - 1) / 2, 0, 1);
  const confidence = clamp(0.65 + Math.log1p(Math.max(0, thresholdRatio - 1)) * 0.2, 0.65, 0.98);

  return {
    score,
    confidence,
    impactHint: 'Sustained small shift detected via CUSUM',
    sources: [
      {
        type: SourceType.PatternEngine,
        label: options.label ?? 'CUSUM Shift',
        details: {
          baselineMean,
          sigma,
          kFactor,
          referenceValue: k,
          decisionInterval: h,
          decisionIntervalMultiplier: adjHMultiplier,
          maxCusum,
          exceedIndex,
          exceedTimestamp: series[exceedIndex]?.timestamp,
          exceedValue,
          thresholdRatio,
          side,
        },
      },
    ],
    thresholdApplied: adjHMultiplier,
    analysis: {
      exceedIndex,
      exceedValue,
      cusumMax: maxCusum,
      side,
    },
  };

  logger.debug('CUSUM detection evaluated', {
    label: options.label ?? 'CUSUM',
    kFactor,
    hMultiplier: adjHMultiplier,
    sigma,
    thresholdRatio,
    side,
    detected: true,
  });
}
