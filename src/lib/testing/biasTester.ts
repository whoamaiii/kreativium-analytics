/** @file For bias detection and testing. */
/**
 * Bias/fairness utilities for quick parity checks in unit tests.
 *
 * These helpers operate on simple binary-classification outcomes and calculate
 * the fairness metrics highlighted in the Sensory Compass compliance strategy:
 * demographic parity (predicted positive rate parity) and equalized odds
 * (parity across true/false positive rates). The calculators purposefully avoid
 * heavy statistical tooling so that tests can run inside Vitest without
 * pulling additional dependencies.
 */

type BinaryLabel = 0 | 1;

/**
 * Minimal record describing a single model outcome.
 *
 * - `group` represents a protected/demographic class label.
 * - `actual` and `predicted` are binary outcomes (0/1).
 * - `score` is optional for callers who have calibrated probabilities; it is
 *   only used when computing calibration deltas.
 */
export interface ClassificationRecord {
  group: string;
  actual: BinaryLabel;
  predicted: BinaryLabel;
  score?: number;
}

/**
 * Aggregated per-group statistics derived from the classification records.
 */
export interface GroupStats {
  support: number;
  positives: number;
  negatives: number;
  predictedPositives: number;
  predictedNegatives: number;
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
  predictedPositiveRate: number;
  actualPositiveRate: number;
  truePositiveRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  accuracy: number;
  averageScore?: number;
}

/**
 * Core fairness metrics we report back to tests/higher-level tooling.
 */
export interface FairnessMetrics {
  demographicParityDiff: number;
  demographicParityRatio?: number;
  equalOpportunityDiff: number;
  equalizedOddsDiff: number;
  averageOddsDiff: number;
  maxFalsePositiveGap: number;
  calibrationDiff?: number;
}

export interface FairnessEvaluation {
  metrics: FairnessMetrics;
  byGroup: Record<string, GroupStats>;
  flaggedMetrics: string[];
}

function safeDivide(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return 0;
  return denominator === 0 ? 0 : numerator / denominator;
}

function computeGroupStats(records: ClassificationRecord[]): Record<string, GroupStats> {
  const stats: Record<string, GroupStats> = {};

  for (const record of records) {
    const { group, actual, predicted, score } = record;
    if (!(group in stats)) {
      stats[group] = {
        support: 0,
        positives: 0,
        negatives: 0,
        predictedPositives: 0,
        predictedNegatives: 0,
        truePositives: 0,
        trueNegatives: 0,
        falsePositives: 0,
        falseNegatives: 0,
        predictedPositiveRate: 0,
        actualPositiveRate: 0,
        truePositiveRate: 0,
        falsePositiveRate: 0,
        falseNegativeRate: 0,
        accuracy: 0,
        averageScore: undefined,
      };
    }

    const entry = stats[group];
    entry.support += 1;
    entry.positives += actual === 1 ? 1 : 0;
    entry.negatives += actual === 0 ? 1 : 0;
    entry.predictedPositives += predicted === 1 ? 1 : 0;
    entry.predictedNegatives += predicted === 0 ? 1 : 0;

    if (actual === 1 && predicted === 1) entry.truePositives += 1;
    if (actual === 0 && predicted === 0) entry.trueNegatives += 1;
    if (actual === 0 && predicted === 1) entry.falsePositives += 1;
    if (actual === 1 && predicted === 0) entry.falseNegatives += 1;

    if (typeof score === 'number') {
      entry.averageScore = (entry.averageScore ?? 0) + score;
    }
  }

  for (const group of Object.keys(stats)) {
    const entry = stats[group];
    entry.predictedPositiveRate = safeDivide(entry.predictedPositives, entry.support);
    entry.actualPositiveRate = safeDivide(entry.positives, entry.support);
    entry.truePositiveRate = safeDivide(entry.truePositives, entry.positives);
    entry.falsePositiveRate = safeDivide(entry.falsePositives, entry.negatives);
    entry.falseNegativeRate = safeDivide(entry.falseNegatives, entry.positives);
    entry.accuracy = safeDivide(entry.truePositives + entry.trueNegatives, entry.support);
    if (typeof entry.averageScore === 'number') {
      entry.averageScore = safeDivide(entry.averageScore, entry.support);
    }
  }

  return stats;
}

function differenceRange(values: number[]): number {
  if (values.length === 0) return 0;
  const max = Math.max(...values);
  const min = Math.min(...values);
  return max - min;
}

function ratioRange(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (min === 0) return undefined;
  return max / min;
}

function computeCalibrationDiff(groups: Record<string, GroupStats>): number | undefined {
  const deltas: number[] = [];
  for (const stats of Object.values(groups)) {
    if (typeof stats.averageScore !== 'number') continue;
    deltas.push(Math.abs(stats.averageScore - stats.actualPositiveRate));
  }
  if (deltas.length === 0) return undefined;
  return Math.max(...deltas);
}

/**
 * Evaluate fairness metrics across demographic groups.
 *
 * @param records Array of classification records.
 * @param options.tolerance Optional threshold above which metrics are flagged.
 */
export function evaluateFairness(
  records: ClassificationRecord[],
  options?: { tolerance?: number }
): FairnessEvaluation {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('evaluateFairness requires at least one classification record.');
  }

  const byGroup = computeGroupStats(records);

  const predictedRates = Object.values(byGroup).map((g) => g.predictedPositiveRate);
  const truePositiveRates = Object.values(byGroup).map((g) => g.truePositiveRate);
  const falsePositiveRates = Object.values(byGroup).map((g) => g.falsePositiveRate);

  const demographicParityDiff = differenceRange(predictedRates);
  const demographicParityRatio = ratioRange(predictedRates);
  const equalOpportunityDiff = differenceRange(truePositiveRates);
  const maxFalsePositiveGap = differenceRange(falsePositiveRates);
  const equalizedOddsDiff = Math.max(equalOpportunityDiff, maxFalsePositiveGap);

  const avgOddsPerGroup = Object.values(byGroup).map(
    (g) => (g.truePositiveRate + g.falsePositiveRate) / 2
  );
  const averageOddsDiff = differenceRange(avgOddsPerGroup);

  const calibrationDiff = computeCalibrationDiff(byGroup);

  const metrics: FairnessMetrics = {
    demographicParityDiff,
    demographicParityRatio,
    equalOpportunityDiff,
    equalizedOddsDiff,
    averageOddsDiff,
    maxFalsePositiveGap,
    calibrationDiff,
  };

  const tolerance = options?.tolerance ?? 0.1;
  const flaggedMetrics = Object.entries(metrics)
    .filter(([key, value]) => {
      if (value === undefined) return false;
      if (typeof value !== 'number') return false;
      if (key === 'demographicParityRatio') {
        return Math.abs(value - 1) > tolerance;
      }
      return value > tolerance;
    })
    .map(([key]) => key);

  return { metrics, byGroup, flaggedMetrics };
}

/**
 * Convenience helper that mimics the legacy unit-test assertion behaviour.
 * It returns `true` if the fairness metrics stay within the provided tolerance.
 */
export function isWithinFairnessTolerance(
  records: ClassificationRecord[],
  tolerance = 0.1
): boolean {
  const evaluation = evaluateFairness(records, { tolerance });
  return evaluation.flaggedMetrics.length === 0;
}
