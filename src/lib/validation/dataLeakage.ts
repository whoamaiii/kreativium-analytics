/*
 * Data Leakage Detection Utilities
 * --------------------------------
 * Provides a DataLeakageDetector with:
 * - Train/Test split integrity validation (overlap, duplicates)
 * - Temporal leakage detection for time-series (global and per-entity)
 * - Feature contamination checks (target in features, future-labelled columns, high correlation, near-identity)
 * - Centralized logging of detected risks
 * - Strict vs permissive modes controlling error throwing vs warnings
 *
 * Usage example:
 * const detector = new DataLeakageDetector({ mode: 'strict', temporal: { timeColumn: 'timestamp', entityColumn: 'studentId' } });
 * const report = detector.analyze(records, { trainIndex, testIndex, targetKey: 'label' });
 * // In strict mode, high-risk issues will throw; otherwise, report.issues contains details.
 */

import { logger } from '@/lib/logger';
import { pearsonCorrelation } from '@/lib/statistics';

export type StrictnessMode = 'strict' | 'permissive';

export interface DataLeakageDetectorConfig {
  mode?: StrictnessMode;
  thresholds?: {
    highCorrelation?: number; // correlation considered suspicious
    nearIdentityFraction?: number; // fraction of rows equal feature==target considered near-identity
  };
  temporal?: {
    timeColumn: string; // required to enable temporal checks
    entityColumn?: string; // optional: per-entity temporal validation when present
    allowTrainAfterTest?: boolean; // if true, only warn when train has future relative to test
  };
}

export type Severity = 'low' | 'medium' | 'high';

export type LeakageType =
  | 'SPLIT_OVERLAP'
  | 'SPLIT_DUPLICATES'
  | 'TEMPORAL_GLOBAL'
  | 'TEMPORAL_PER_ENTITY'
  | 'TARGET_IN_FEATURES'
  | 'FUTURE_NAMED_FEATURE'
  | 'HIGH_CORRELATION_FEATURE'
  | 'NEAR_IDENTITY_FEATURE';

export interface LeakageIssue {
  type: LeakageType;
  severity: Severity;
  message: string;
  details?: Record<string, unknown>;
}

export interface LeakageReport {
  issues: LeakageIssue[];
  hasHighRisk: boolean;
  summary: string[];
}

export interface AnalyzeOptions {
  // row-wise records for a tabular dataset
  records: Array<Record<string, unknown>>;
  // zero-based indices of train/test rows (or any unique ids mapping into records index)
  trainIndex: number[];
  testIndex: number[];
  // target (label) column key; if omitted, feature contamination checks are limited to name-based heuristics
  targetKey?: string;
  // subset of feature keys to check. If omitted, all non-target keys present in records[0] are used.
  featureKeys?: string[];
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function toTime(v: unknown): number | null {
  if (v == null) return null;
  if (v instanceof Date) return v.getTime();
  const n = typeof v === 'number' ? v : Date.parse(String(v));
  return Number.isFinite(n) ? n : null;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function getNumericColumn(records: Array<Record<string, unknown>>, key: string): number[] {
  const out: number[] = new Array(records.length);
  for (let i = 0; i < records.length; i++) {
    const val = records[i]?.[key];
    out[i] = isFiniteNumber(val) ? (val as number) : Number.NaN;
  }
  return out;
}

function fractionEqual(a: unknown[], b: unknown[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let eq = 0, total = 0;
  for (let i = 0; i < n; i++) {
    const av = a[i];
    const bv = b[i];
    if (av === undefined || bv === undefined) continue;
    total++;
    if (av === bv) eq++;
  }
  if (total === 0) return 0;
  return eq / total;
}

function pickFeatureKeys(records: Array<Record<string, unknown>>, targetKey?: string, provided?: string[]): string[] {
  if (Array.isArray(provided) && provided.length > 0) return provided;
  const first = records[0] ?? {};
  const keys = Object.keys(first);
  return keys.filter(k => k !== targetKey);
}

function containsLeakNamePattern(name: string): boolean {
  const lowered = name.toLowerCase();
  // Patterns that often indicate leakage (future knowledge or explicit labels)
  const patterns = [
    'target', 'label', 'outcome', 'y', 'groundtruth', 'ground_truth', 'true_', 'future', 't+1', 't+2', 'next', 'leak', 'post', 'after_event'
  ];
  return patterns.some(p => lowered.includes(p));
}

export class DataLeakageDetector {
  private config: Required<DataLeakageDetectorConfig>;

  constructor(config?: DataLeakageDetectorConfig) {
    this.config = {
      mode: config?.mode ?? 'permissive',
      thresholds: {
        highCorrelation: config?.thresholds?.highCorrelation ?? 0.95,
        nearIdentityFraction: config?.thresholds?.nearIdentityFraction ?? 0.98,
      },
      temporal: {
        timeColumn: config?.temporal?.timeColumn ?? ('timestamp' as string),
        entityColumn: config?.temporal?.entityColumn,
        allowTrainAfterTest: config?.temporal?.allowTrainAfterTest ?? false,
      },
    };
  }

  public analyze(records: AnalyzeOptions['records'], opts: Omit<AnalyzeOptions, 'records'>): LeakageReport {
    const issues: LeakageIssue[] = [];

    // 1) Train/Test split validation
    issues.push(...this.validateTrainTestSplit(opts.trainIndex, opts.testIndex));

    // 2) Temporal leakage detection (if time column present in records)
    if (this.config.temporal?.timeColumn) {
      issues.push(...this.detectTemporalLeakage(records, opts.trainIndex, opts.testIndex));
    }

    // 3) Feature contamination checks
    issues.push(...this.checkFeatureContamination(records, opts.trainIndex, opts.testIndex, opts.targetKey, opts.featureKeys));

    // Logging and strict/permissive behavior
    const summary = issues.map(i => `${i.severity.toUpperCase()} ${i.type} – ${i.message}`);
    for (const issue of issues) {
      const payload = { type: issue.type, severity: issue.severity, details: issue.details };
      if (issue.severity === 'high') {
        logger.warn('[DataLeakageDetector] High-risk leakage detected', payload);
      } else if (issue.severity === 'medium') {
        logger.info('[DataLeakageDetector] Potential leakage risk', payload);
      } else {
        logger.debug('[DataLeakageDetector] Informational leakage note', payload);
      }
    }

    const hasHighRisk = issues.some(i => i.severity === 'high');
    if (this.config.mode === 'strict' && hasHighRisk) {
      // Throwing in strict mode to fail fast
      const err = new Error(`High-risk data leakage detected: \n- ${summary.join('\n- ')}`);
      logger.error('[DataLeakageDetector] Strict mode abort due to leakage', { summary });
      throw err;
    }

    return { issues, hasHighRisk, summary };
  }

  public validateTrainTestSplit(trainIndex: number[], testIndex: number[]): LeakageIssue[] {
    const issues: LeakageIssue[] = [];
    const train = unique(trainIndex);
    const test = unique(testIndex);

    // Overlap check
    const testSet = new Set(test);
    const overlap: number[] = [];
    for (const i of train) {
      if (testSet.has(i)) overlap.push(i);
    }
    if (overlap.length > 0) {
      issues.push({
        type: 'SPLIT_OVERLAP',
        severity: 'high',
        message: `Train/Test overlap detected for ${overlap.length} samples. Splits must be disjoint.`,
        details: { overlapCount: overlap.length, sampleIndices: overlap.slice(0, 25) },
      });
    }

    // Duplicates within splits
    if (train.length !== trainIndex.length || test.length !== testIndex.length) {
      const dupTrain = trainIndex.length - train.length;
      const dupTest = testIndex.length - test.length;
      if (dupTrain > 0) {
        issues.push({
          type: 'SPLIT_DUPLICATES',
          severity: 'medium',
          message: `Duplicate entries in train split (${dupTrain}).`,
          details: { duplicateCount: dupTrain, split: 'train' },
        });
      }
      if (dupTest > 0) {
        issues.push({
          type: 'SPLIT_DUPLICATES',
          severity: 'medium',
          message: `Duplicate entries in test split (${dupTest}).`,
          details: { duplicateCount: dupTest, split: 'test' },
        });
      }
    }

    return issues;
  }

  public detectTemporalLeakage(
    records: Array<Record<string, unknown>>,
    trainIndex: number[],
    testIndex: number[]
  ): LeakageIssue[] {
    const issues: LeakageIssue[] = [];
    const timeKey = this.config.temporal.timeColumn;
    const entityKey = this.config.temporal.entityColumn;

    // Global chronology check: max(train.time) should be <= min(test.time)
    const trainTimes: number[] = [];
    const testTimes: number[] = [];
    for (const i of trainIndex) {
      const t = toTime(records[i]?.[timeKey]);
      if (t != null) trainTimes.push(t);
    }
    for (const i of testIndex) {
      const t = toTime(records[i]?.[timeKey]);
      if (t != null) testTimes.push(t);
    }
    if (trainTimes.length > 0 && testTimes.length > 0) {
      const maxTrain = Math.max(...trainTimes);
      const minTest = Math.min(...testTimes);
      if (maxTrain > minTest) {
        issues.push({
          type: 'TEMPORAL_GLOBAL',
          severity: this.config.temporal.allowTrainAfterTest ? 'medium' : 'high',
          message: `Temporal leakage: training data extends (${new Date(maxTrain).toISOString()}) beyond earliest test timestamp (${new Date(minTest).toISOString()}).`,
          details: { maxTrain, minTest },
        });
      }
    }

    // Per-entity chronology check when entity column available
    if (entityKey) {
      const perEntityTrain: Record<string, number> = {};
      const perEntityTest: Record<string, number> = {};

      for (const i of trainIndex) {
        const row = records[i];
        const ent = String(row?.[entityKey] ?? '');
        const t = toTime(row?.[timeKey]);
        if (ent && t != null) perEntityTrain[ent] = Math.max(perEntityTrain[ent] ?? Number.NEGATIVE_INFINITY, t);
      }
      for (const i of testIndex) {
        const row = records[i];
        const ent = String(row?.[entityKey] ?? '');
        const t = toTime(row?.[timeKey]);
        if (ent && t != null) perEntityTest[ent] = Math.min(perEntityTest[ent] ?? Number.POSITIVE_INFINITY, t);
      }

      const offenders: Array<{ entity: string; maxTrain: number; minTest: number }> = [];
      for (const ent of Object.keys(perEntityTrain)) {
        if (perEntityTest[ent] == null) continue; // entity not in test
        const maxT = perEntityTrain[ent];
        const minT = perEntityTest[ent];
        if (maxT > minT) offenders.push({ entity: ent, maxTrain: maxT, minTest: minT });
      }

      if (offenders.length > 0) {
        issues.push({
          type: 'TEMPORAL_PER_ENTITY',
          severity: this.config.temporal.allowTrainAfterTest ? 'medium' : 'high',
          message: `Temporal leakage per-entity: ${offenders.length} entity(ies) have training data after their test start.`,
          details: { offenders: offenders.slice(0, 25) },
        });
      }
    }

    return issues;
  }

  public checkFeatureContamination(
    records: Array<Record<string, unknown>>,
    trainIndex: number[],
    testIndex: number[],
    targetKey?: string,
    featureKeys?: string[]
  ): LeakageIssue[] {
    const issues: LeakageIssue[] = [];
    const features = pickFeatureKeys(records, targetKey, featureKeys);

    // Name-based heuristics
    for (const f of features) {
      if (containsLeakNamePattern(f)) {
        issues.push({
          type: 'FUTURE_NAMED_FEATURE',
          severity: 'high',
          message: `Feature ${f} name suggests potential leakage (future/label-related).`,
          details: { feature: f },
        });
      }
    }

    if (!targetKey) return issues; // cannot proceed with target-based checks

    // Target present as a feature
    if (features.includes(targetKey)) {
      issues.push({
        type: 'TARGET_IN_FEATURES',
        severity: 'high',
        message: `Target key ${targetKey} is present among features.`,
        details: { targetKey },
      });
    }

    // Compute correlations on train subset (numeric only)
    const yAll = records.map(r => r?.[targetKey]);
    const yNum = getNumericColumn(records, targetKey);

    // Extract feature arrays
    for (const f of features) {
      const xAll = records.map(r => r?.[f]);

      // Near-identity check across all rows (handles categorical as well)
      const fracEq = fractionEqual(xAll, yAll);
      if (fracEq >= this.config.thresholds.nearIdentityFraction) {
        issues.push({
          type: 'NEAR_IDENTITY_FEATURE',
          severity: 'high',
          message: `Feature ${f} matches target in ~${Math.round(fracEq * 100)}% of rows.`,
          details: { feature: f, fractionEqual: fracEq },
        });
        // Do not short-circuit; still compute correlation so reports can include both signals when applicable
      }

      // Correlation (only when both columns are numeric)
      const xNum = getNumericColumn(records, f);
      const trainMask = new Set(trainIndex);
      const xTrain: number[] = [];
      const yTrain: number[] = [];
      for (let i = 0; i < records.length; i++) {
        if (trainMask.has(i)) {
          const xv = xNum[i];
          const yv = yNum[i];
          if (Number.isFinite(xv) && Number.isFinite(yv)) {
            xTrain.push(xv);
            yTrain.push(yv);
          }
        }
      }

      if (xTrain.length >= 3 && yTrain.length >= 3) {
        const r = Math.abs(pearsonCorrelation(xTrain, yTrain));
        if (Number.isFinite(r) && r >= (this.config.thresholds.highCorrelation ?? 0.95)) {
          issues.push({
            type: 'HIGH_CORRELATION_FEATURE',
            severity: containsLeakNamePattern(f) ? 'high' : 'medium',
            message: `Feature "${f}" has very high correlation with target on training data (|r|=${r.toFixed(3)}).`,
            details: { feature: f, correlation: r },
          });
        }
      }
    }

    return issues;
  }
}
