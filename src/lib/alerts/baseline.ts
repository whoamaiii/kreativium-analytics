/*
  BaselineService
  - Maintains per-student rolling baselines for emotion, sensory, and environmental metrics
  - Uses robust statistics (median/IQR) and beta-binomial priors for rate metrics
  - Stores results in localStorage via storageUtils when available
*/

import { safeGet, safeSet } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { mad, median, zScoresMedian, pearsonCorrelation } from '@/lib/statistics';
import {
  calculateConfidenceInterval,
  detectTrendInBaseline,
  assessDataQuality,
  correlateFactors,
  validateDataSufficiency,
  validateBaselineStability,
} from '@/lib/alerts/baselineUtils';
import type { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import type {
  BetaPrior,
  EmotionBaselineStats,
  EnvironmentalBaselineStats,
  SensoryBaselineStats,
  StudentBaseline,
  BaselineQualityMetrics,
  BaselineValidationResult,
} from '@/lib/alerts/types';

function readStorage<T>(key: string): T | null {
  try {
    const raw = safeGet(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage<T>(key: string, value: T): void {
  try {
    const raw = JSON.stringify(value);
    safeSet(key, raw);
  } catch {
    // no-op
  }
}

function toDayString(ts: number | string | Date): string {
  const d = new Date(ts);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

function daysAgo(numDays: number): number {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - numDays);
  return d.getTime();
}

function robustIqrFromMad(values: number[]): number {
  // Approximate IQR using robust sigma from MAD: IQR ≈ 1.349 * sigma
  const sigma = mad(values, 'normal');
  return (sigma || 0) * 1.349;
}

// Types are now sourced from '@/lib/alerts/types'

const MIN_SESSIONS = 10;
const MIN_UNIQUE_DAYS = 7;
const WINDOWS = [7, 14, 30];

function countUniqueDays(dates: (number | string | Date)[]): number {
  const set = new Set(dates.map(toDayString));
  return set.size;
}

function buildBetaPrior(successes: number, trials: number): BetaPrior {
  // Jeffreys prior base (0.5, 0.5) smoothed with observed counts
  const alpha = 0.5 + successes;
  const beta = 0.5 + Math.max(0, trials - successes);
  return { alpha, beta };
}

function betaPosteriorMean(prior: BetaPrior): number {
  const a = prior.alpha;
  const b = prior.beta;
  const denom = a + b;
  if (denom <= 0) return 0;
  return a / denom;
}

function betaPosteriorVariance(prior: BetaPrior): number {
  const a = prior.alpha;
  const b = prior.beta;
  const denom = a + b;
  const denom2 = denom * denom;
  const denom3 = denom2 * (denom + 1);
  if (denom3 <= 0) return 0;
  return (a * b) / denom3;
}

// Helper to extract sensory behavior identifier from SensoryEntry
function getSensoryBehavior(entry: SensoryEntry): string {
  return entry.sensoryType ?? entry.type ?? entry.response ?? 'unknown';
}

function key(studentId: string): string {
  return `alerts:baseline:${studentId}`;
}

export class BaselineService {
  // Comment 5: Consolidated getter returns full StudentBaseline
  getBaseline(studentId: string): StudentBaseline | null {
    return readStorage<StudentBaseline>(key(studentId));
  }

  getEmotionBaseline(studentId: string): StudentBaseline | null {
    return this.getBaseline(studentId);
  }

  getSensoryBaseline(studentId: string): StudentBaseline | null {
    return this.getBaseline(studentId);
  }

  getEnvironmentalBaseline(studentId: string): StudentBaseline | null {
    return this.getBaseline(studentId);
  }

  updateBaseline(params: {
    studentId: string;
    emotions: EmotionEntry[];
    sensory: SensoryEntry[];
    tracking: TrackingEntry[];
  }): StudentBaseline | null {
    const { studentId, emotions, sensory, tracking } = params;
    const allTimestamps: number[] = [
      ...emotions.map((e) => new Date(e.timestamp as unknown as string | number | Date).getTime()),
      ...sensory.map((s) => new Date(s.timestamp as unknown as string | number | Date).getTime()),
      ...tracking.map((t) => new Date(t.timestamp as unknown as string | number | Date).getTime()),
    ].filter((n) => Number.isFinite(n));

    // Comment 4: Use tracking entries as sessions, fallback to unique days across all data
    const sessions = tracking.length > 0 ? tracking.length : countUniqueDays(allTimestamps);
    const uniqueDays = countUniqueDays(allTimestamps);

    const suff: BaselineValidationResult = validateDataSufficiency(
      sessions,
      uniqueDays,
      MIN_SESSIONS,
      MIN_UNIQUE_DAYS,
    );

    if (!suff.isSufficient) {
      logger.info('Baseline skipped due to insufficient data', { studentId, sessions, uniqueDays });
      return null;
    }

    const emotionStats: Record<string, EmotionBaselineStats> = {};
    const sensoryStats: Record<string, SensoryBaselineStats> = {};
    const envStats: Record<string, EnvironmentalBaselineStats> = {};
    const insufficientKeys: string[] = [];

    // Emotion intensity baselines per window using robust statistics with outlier filtering
    WINDOWS.forEach((windowDays) => {
      const cutoff = daysAgo(windowDays);
      const windowed = emotions.filter(
        (e) => new Date(e.timestamp as unknown as string | number | Date).getTime() >= cutoff,
      );
      const grouped = new Map<string, number[]>();
      windowed.forEach((e) => {
        const name = e.emotion ?? 'unknown';
        const val = Number(e.intensity ?? 0);
        const arr = grouped.get(name) ?? [];
        arr.push(val);
        grouped.set(name, arr);
      });
      grouped.forEach((vals, name) => {
        const validVals = vals.filter((v) => Number.isFinite(v));
        const { cleaned, outlierIndices } = assessDataQuality(validVals);
        const tsAll = windowed
          .filter((e) => (e.emotion ?? 'unknown') === name)
          .map((e) => new Date(e.timestamp as unknown as string | number | Date).getTime())
          .filter((t) => Number.isFinite(t));

        // Comment 6: handle empty series after outlier removal
        if (cleaned.length === 0) {
          emotionStats[`${name}:${windowDays}`] = {
            emotion: name,
            median: 0,
            iqr: 0,
            windowDays,
            confidenceInterval: { lower: 0, upper: 0, level: 0.95, n: 0 },
            insufficientData: true,
          } as EmotionBaselineStats;
          insufficientKeys.push(`emotion:${name}:${windowDays}`);
          return;
        }

        const med = median(cleaned);
        const iqr = robustIqrFromMad(cleaned);
        const ci = calculateConfidenceInterval(cleaned, 0.95, 'median');

        // Comment 2: filter timestamps to match cleaned values
        const tsFiltered: number[] = [];
        for (let i = 0; i < tsAll.length; i++) {
          if (!outlierIndices.includes(i)) tsFiltered.push(tsAll[i]!);
        }
        const trend = cleaned.length >= 2 && tsFiltered.length === cleaned.length
          ? detectTrendInBaseline(tsFiltered, cleaned)
          : undefined;

        emotionStats[`${name}:${windowDays}`] = {
          emotion: name,
          median: med,
          iqr,
          windowDays,
          confidenceInterval: ci,
          trend,
        };
        if (outlierIndices.length > 0) {
          logger.debug('Emotion outliers detected', { studentId, name, windowDays, outliers: outlierIndices.length });
        }
      });
    });

    // Sensory behaviors using beta-binomial priors on session/day rates
    WINDOWS.forEach((windowDays) => {
      const cutoff = daysAgo(windowDays);
      const windowedTracking = tracking.filter((t) => new Date(t.timestamp as unknown as string | number | Date).getTime() >= cutoff);
      const windowedSensory = sensory.filter((s) => new Date(s.timestamp as unknown as string | number | Date).getTime() >= cutoff);

      const addBehavior = (set: Set<string>, s: SensoryEntry) => {
        const b = getSensoryBehavior(s);
        if (typeof b === 'string' && b.length) set.add(b);
      };

      const behaviors = new Set<string>();
      if (windowedTracking.length > 0) {
        windowedTracking.forEach((t) => (t.sensoryInputs ?? []).forEach((si) => addBehavior(behaviors, si)));
      } else {
        windowedSensory.forEach((s) => addBehavior(behaviors, s));
      }

      behaviors.forEach((behavior) => {
        let successes = 0;
        let trials = 0;

        if (windowedTracking.length > 0) {
          trials = windowedTracking.length;
          windowedTracking.forEach((t) => {
            const occurred = (t.sensoryInputs ?? []).some((si) => {
              const b = getSensoryBehavior(si);
              return b === behavior;
            });
            if (occurred) successes += 1;
          });
        } else {
          // Fallback to per-day counts from sensory entries
          const byDay = new Map<string, { hasBehavior: boolean }>();
          windowedSensory.forEach((s) => {
            const day = toDayString(s.timestamp as unknown as string | number | Date);
            const b = getSensoryBehavior(s);
            const entry = byDay.get(day) ?? { hasBehavior: false };
            if (b === behavior) entry.hasBehavior = true;
            byDay.set(day, entry);
          });
          trials = byDay.size;
          byDay.forEach((entry) => {
            if (entry.hasBehavior) successes += 1;
          });
        }

        const prior = buildBetaPrior(successes, trials);
        const mean = betaPosteriorMean(prior);
        const variance = betaPosteriorVariance(prior);
        const z = 1.96;
        const std = Math.sqrt(Math.max(0, variance));
        const ci = { lower: Math.max(0, mean - z * std), upper: Math.min(1, mean + z * std), level: 0.95, n: trials };
        sensoryStats[`${behavior}:${windowDays}`] = {
          behavior,
          ratePrior: prior,
          windowDays,
          posteriorMean: mean,
          credibleInterval: ci,
        };
      });
    });

    // Environmental factors as robust summaries per factor key with correlation to max emotion intensity
    WINDOWS.forEach((windowDays) => {
      const cutoff = daysAgo(windowDays);
      const windowed = tracking.filter(
        (t) => new Date(t.timestamp as unknown as string | number | Date).getTime() >= cutoff,
      );
      const factors: Record<string, number[]> = {};
      const factorEmotionMap: Record<string, number[]> = {};
      windowed.forEach((t) => {
        const rc = t.environmentalData?.roomConditions;
        if (!rc) return;
        const mapping: Record<string, number | undefined> = {
          noiseLevel: rc.noiseLevel,
          temperature: rc.temperature,
          humidity: rc.humidity,
          studentCount: t.environmentalData?.classroom?.studentCount,
        };
        const maxEmotion = (t.emotions ?? [])
          .map((e) => Number(e.intensity ?? 0))
          .filter((n) => Number.isFinite(n))
          .reduce((max, val) => Math.max(max, val), 0);
        Object.entries(mapping).forEach(([k, v]) => {
          if (typeof v === 'number' && !Number.isNaN(v)) {
            (factors[k] ||= []).push(v);
            (factorEmotionMap[k] ||= []).push(maxEmotion);
          }
        });
      });
      Object.entries(factors).forEach(([factor, vals]) => {
        const valid = vals.filter((v) => Number.isFinite(v));
        const { cleaned, outlierIndices } = assessDataQuality(valid);

        // Comment 6: handle empty series after outlier removal
        if (cleaned.length === 0) {
          envStats[`${factor}:${windowDays}`] = {
            factor,
            median: 0,
            iqr: 0,
            windowDays,
            confidenceInterval: { lower: 0, upper: 0, level: 0.95, n: 0 },
            insufficientData: true,
          } as EnvironmentalBaselineStats;
          insufficientKeys.push(`environment:${factor}:${windowDays}`);
          return;
        }

        const med = median(cleaned);
        const iqr = robustIqrFromMad(cleaned);
        const ci = calculateConfidenceInterval(cleaned, 0.95, 'median');

        // Comment 1: preserve index alignment for correlation after outlier filtering
        const yAll = factorEmotionMap[factor] ?? [];
        const pairedY: number[] = [];
        for (let i = 0; i < valid.length; i++) {
          if (!outlierIndices.includes(i) && Number.isFinite(yAll[i])) {
            pairedY.push(yAll[i]!);
          }
        }
        const corr = correlateFactors(cleaned, pairedY);

        envStats[`${factor}:${windowDays}`] = {
          factor,
          median: med,
          iqr,
          windowDays,
          confidenceInterval: ci,
          correlationWithEmotion: corr,
        };
      });
    });

    const baseline: StudentBaseline = {
      studentId,
      updatedAt: new Date().toISOString(),
      nextSuggestedUpdateAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      emotion: emotionStats,
      sensory: sensoryStats,
      environment: envStats,
      sampleInfo: {
        sessions,
        uniqueDays,
        windows: WINDOWS,
      },
    };

    // Quality metrics
    try {
      const outlierCounts: Record<string, number> = {};
      let totalValues = 0;
      let totalOutliers = 0;
      Object.entries(emotionStats).forEach(([k, stat]) => {
        const windowDays = stat.windowDays;
        const cutoff = daysAgo(windowDays);
        const relevant = emotions.filter((e) => new Date(e.timestamp as unknown as string | number | Date).getTime() >= cutoff);
        const vals = relevant
          .filter((e) => (e.emotion ?? 'unknown') === stat.emotion)
          .map((e) => Number(e.intensity ?? 0))
          .filter((n) => Number.isFinite(n));
        const zs = zScoresMedian(vals);
        const outliers = zs.filter((z) => Math.abs(z) > 3.5).length;
        outlierCounts[k] = outliers;
        totalValues += vals.length;
        totalOutliers += outliers;
      });
      const outlierRate = totalValues > 0 ? totalOutliers / totalValues : 0;
      const stability = (() => {
        // Use noiseLevel as proxy series if available
        const factorKey = `noiseLevel:${WINDOWS[0]}`;
        const env = envStats[factorKey];
        if (!env) return 1;
        const cutoff = daysAgo(WINDOWS[0]);
        const windowed = tracking.filter((t) => new Date(t.timestamp as unknown as string | number | Date).getTime() >= cutoff);
        const timestamps: number[] = [];
        const values: number[] = [];
        windowed.forEach((t) => {
          const ts = new Date(t.timestamp as unknown as string | number | Date).getTime();
          const val = t.environmentalData?.roomConditions?.noiseLevel;
          if (Number.isFinite(ts) && Number.isFinite(val)) {
            timestamps.push(ts);
            values.push(val as number);
          }
        });
        if (timestamps.length < 3) return 1;
        const st = validateBaselineStability({ timestamps, values });
        return 1 - st.score; // stability is inverse of shift score
      })();
      const reliabilityScore = Math.max(0, Math.min(1, (suff.isSufficient ? 0.8 : 0.4) * (1 - 0.5 * outlierRate) * (0.5 + 0.5 * stability)));
      const quality: BaselineQualityMetrics = {
        reliabilityScore,
        outlierRate,
        outlierCountsByKey: outlierCounts,
        dataSufficiency: suff,
        stabilityScore: stability,
        insufficientKeys: insufficientKeys.length ? insufficientKeys : undefined,
      };
      (baseline as StudentBaseline).quality = quality;
    } catch (err) {
      logger.warn('Baseline quality computation failed', err as Error);
    }

    writeStorage<StudentBaseline>(key(studentId), baseline);
    return baseline;
  }
}

export type { StudentBaseline };

