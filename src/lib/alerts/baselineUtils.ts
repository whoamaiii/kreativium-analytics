import { huberRegression, mad, median, pearsonCorrelation, zScoresMedian } from '@/lib/statistics';
import type {
  AssessBaselineQuality,
  BaselineQualityMetrics,
  BaselineValidationResult,
  ConfidenceInterval,
  DetectBaselineShift,
  DetectOutliers,
  StudentBaseline,
  TrendAnalysisResult,
} from '@/lib/alerts/types';

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function calculateConfidenceInterval(
  values: number[],
  level: number = 0.95,
  center: 'median' | 'mean' = 'median',
): ConfidenceInterval {
  const v = values.filter((x) => Number.isFinite(x));
  const n = v.length;
  if (n === 0) return { lower: 0, upper: 0, level, n };

  const z =
    level >= 0.999
      ? 3.29
      : level >= 0.995
        ? 2.81
        : level >= 0.99
          ? 2.58
          : level >= 0.975
            ? 1.96
            : 1.96;
  const c = center === 'median' ? median(v) : v.reduce((a, b) => a + b, 0) / n;
  const scale = mad(v, 'normal');
  const se = n > 0 ? (1.2533 * (scale || 1e-9)) / Math.sqrt(n) : 0; // approx SE(median)
  return { lower: c - z * se, upper: c + z * se, level, n };
}

export function detectTrendInBaseline(timestamps: number[], values: number[]): TrendAnalysisResult {
  if (!timestamps.length || !values.length) {
    return { slope: 0, intercept: 0, iterations: 0, converged: false };
  }
  const n = Math.min(timestamps.length, values.length);
  const t0 = timestamps[0];
  const days: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const dtMs = timestamps[i] - t0;
    days[i] = dtMs / 86_400_000; // ms -> days
  }
  const ys = values.slice(0, n);
  const res = huberRegression(days, ys);
  return {
    slope: res.slope,
    intercept: res.intercept,
    iterations: res.iterations,
    converged: res.converged,
  };
}

export const assessDataQuality: DetectOutliers = (values: number[], zThreshold: number = 3.5) => {
  const zs = zScoresMedian(values);
  const outlierIndices: number[] = [];
  const cleaned: number[] = [];
  for (let i = 0; i < zs.length; i++) {
    const v = values[i];
    if (!Number.isFinite(v)) continue;
    if (Math.abs(zs[i]) > zThreshold) {
      outlierIndices.push(i);
    } else {
      cleaned.push(v);
    }
  }
  return { cleaned, outlierIndices };
};

export function correlateFactors(x: number[], y: number[]): number {
  return pearsonCorrelation(x, y);
}

export const validateDataSufficiency = (
  sessions: number,
  uniqueDays: number,
  minSessions: number,
  minUniqueDays: number,
): BaselineValidationResult => {
  const reasons: string[] = [];
  if (sessions < minSessions) reasons.push(`insufficient_sessions:${sessions}<${minSessions}`);
  if (uniqueDays < minUniqueDays) reasons.push(`insufficient_days:${uniqueDays}<${minUniqueDays}`);
  return {
    isSufficient: sessions >= minSessions || uniqueDays >= minUniqueDays,
    minSessions,
    minUniqueDays,
    sessions,
    uniqueDays,
    reasons: reasons.length ? reasons : undefined,
  };
};

export const validateBaselineStability: DetectBaselineShift = (series) => {
  const { timestamps, values } = series;
  if (!timestamps.length || !values.length || timestamps.length !== values.length)
    return { shifted: false, score: 0 };
  // Comment 7: guard for low-variance or short series
  if (timestamps.length < 3) return { shifted: false, score: 0 };
  const scale = mad(values, 'normal');
  if (!scale || scale < 1e-8) return { shifted: false, score: 0 };
  const trend = detectTrendInBaseline(timestamps, values);
  const slopePerScale = Math.abs(trend.slope) / scale;
  const score = clamp01(Math.min(1, slopePerScale / 0.2)); // heuristic scaling
  return { shifted: score > 0.5, score, trend };
};

export const assessBaselineQuality: AssessBaselineQuality = (
  baseline: StudentBaseline,
): BaselineQualityMetrics => {
  const keys = Object.keys(baseline.emotion ?? {});
  let total = 0;
  let outliers = 0;
  const outlierCountsByKey: Record<string, number> = {};

  keys.forEach((key) => {
    const stats = baseline.emotion[key];
    if (!stats) return;
    const values: number[] = (stats as any).__values ?? []; // optional hidden hook if attached by caller
    if (!values?.length) return;
    const result = assessDataQuality(values);
    total += values.length;
    outliers += result.outlierIndices.length;
    outlierCountsByKey[key] = result.outlierIndices.length;
  });

  const outlierRate = total > 0 ? outliers / total : 0;
  const suff = baseline.sampleInfo
    ? validateDataSufficiency(
        baseline.sampleInfo.sessions,
        baseline.sampleInfo.uniqueDays,
        Math.min(...baseline.sampleInfo.windows) > 0 ? 10 : 10,
        Math.min(...baseline.sampleInfo.windows) > 0 ? 7 : 7,
      )
    : undefined;

  // Simple reliability heuristic: start from sufficiency and penalize outliers
  const suffScore = suff?.isSufficient ? 0.8 : 0.4;
  const reliabilityScore = clamp01(suffScore * (1 - 0.5 * outlierRate));

  return {
    reliabilityScore,
    outlierRate,
    outlierCountsByKey,
    dataSufficiency: suff,
  };
};

export function generateBaselineReport(baseline: StudentBaseline): string {
  const lines: string[] = [];
  lines.push(`Baseline for student ${baseline.studentId} at ${baseline.updatedAt}`);
  lines.push(`Windows: ${baseline.sampleInfo.windows.join(', ')}`);
  lines.push(`Sessions: ${baseline.sampleInfo.sessions}, Days: ${baseline.sampleInfo.uniqueDays}`);
  const emotions = Object.keys(baseline.emotion).length;
  const sensory = Object.keys(baseline.sensory).length;
  const env = Object.keys(baseline.environment).length;
  lines.push(`Emotion keys: ${emotions}, Sensory keys: ${sensory}, Environmental keys: ${env}`);
  if (baseline.quality?.reliabilityScore !== undefined) {
    lines.push(`Reliability: ${(baseline.quality.reliabilityScore * 100).toFixed(0)}%`);
  }
  return lines.join('\n');
}

export function optimizeWindowSizes(valuesPerDay: number[]): number[] {
  const n = valuesPerDay.length;
  if (n < 14) return [7, 14, 30];
  if (n < 30) return [7, 14, 30];
  return [7, 14, 30];
}

export function mergeBaselines(a: StudentBaseline, b: StudentBaseline): StudentBaseline {
  const newer = new Date(a.updatedAt) >= new Date(b.updatedAt) ? a : b;
  const older = newer === a ? b : a;
  return {
    ...newer,
    emotion: { ...older.emotion, ...newer.emotion },
    sensory: { ...older.sensory, ...newer.sensory },
    environment: { ...older.environment, ...newer.environment },
  };
}
