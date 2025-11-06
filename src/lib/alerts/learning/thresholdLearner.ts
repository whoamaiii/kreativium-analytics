import { AlertTelemetryEntry, ThresholdOverride } from '@/lib/alerts/types';
import { safeGet, safeSet } from '@/lib/storage';
import { getDefaultDetectorThreshold } from '@/lib/alerts/constants';

export interface ThresholdFeedbackSample {
  relevant?: boolean;
  predictedRelevance?: number;
  thresholdApplied?: number;
  rating?: number;
  createdAt?: string;
}

export interface ThresholdLearningUpdate {
  detectorType: string;
  baselineThreshold: number;
  samples: ThresholdFeedbackSample[];
}

const STORAGE_INDEX_KEY = 'alerts:thresholdOverrides:index';

function readJSON<T>(key: string): T | null {
  try {
    const raw = safeGet(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON<T>(key: string, value: T): void {
  try {
    safeSet(key, JSON.stringify(value));
  } catch {
    // ignore persistence failures
  }
}

function detectorKey(detectorType: string): string {
  return `alerts:thresholdOverrides:${detectorType}`;
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export class ThresholdLearner {
  private readonly targetPpv = 0.7;

  private readonly epsilon = 0.1;

  private readonly minSamples = 10;

  private readonly step = 0.05;

  getTargetPpv(): number {
    return this.targetPpv;
  }

  updateFromFeedback(update: ThresholdLearningUpdate): ThresholdOverride | null {
    const { detectorType, samples } = update;
    if (!detectorType || !samples?.length) {
      return null;
    }

    if (samples.length < this.minSamples) {
      return this.getThresholdOverride(detectorType);
    }

    const stats = this.summarise(samples);
    const currentOverride = this.getThresholdOverride(detectorType);
    const currentAdjustment = currentOverride?.adjustmentValue ?? 0;
    const resolvedBaseline = this.resolveBaseline(detectorType, update.baselineThreshold);
    const nextAdjustment = this.optimizeForPPV({
      currentAdjustment,
      ppv: stats.ppv,
      falsePositiveRate: stats.falsePositiveRate,
      sampleSize: samples.length,
    });

    if (Math.abs(nextAdjustment - currentAdjustment) < 0.001) {
      return currentOverride;
    }

    const override: ThresholdOverride = {
      detectorType,
      adjustmentValue: parseFloat(nextAdjustment.toFixed(4)),
      confidenceLevel: clamp(stats.feedbackRatio, 0.4, 0.99),
      lastUpdatedAt: new Date().toISOString(),
      sampleSize: samples.length,
      ppv: stats.ppv,
      falsePositiveRate: stats.falsePositiveRate,
      baselineThreshold: resolvedBaseline,
    } as ThresholdOverride;

    this.persist(detectorType, override);
    return override;
  }

  getThresholdOverrides(): Record<string, ThresholdOverride> {
    const index = this.readIndex();
    return index.reduce<Record<string, ThresholdOverride>>((acc, type) => {
      const override = this.getThresholdOverride(type);
      if (override) acc[type] = override;
      return acc;
    }, {});
  }

  getThresholdOverride(detectorType: string): ThresholdOverride | null {
    if (!detectorType) return null;
    return readJSON<ThresholdOverride>(detectorKey(detectorType));
  }

  optimizeForPPV(input: {
    currentAdjustment: number;
    ppv: number;
    falsePositiveRate: number;
    sampleSize: number;
  }): number {
    const { currentAdjustment, ppv, falsePositiveRate, sampleSize } = input;
    const explore = Math.random() < this.epsilon;
    let direction = 0;

    if (explore) {
      direction = Math.random() < 0.5 ? -1 : 1;
    } else if (ppv < this.targetPpv - 0.03) {
      direction = 1; // tighten threshold to boost precision
    } else if (ppv > this.targetPpv + 0.1) {
      direction = -1; // loosen to regain sensitivity
    } else if (falsePositiveRate > 0.35) {
      direction = 1;
    }

    if (direction === 0) {
      return currentAdjustment;
    }

    const scale = sampleSize >= 25 ? 1 : 0.5;
    const delta = this.step * direction * scale;
    return clamp(currentAdjustment + delta, -0.25, 0.25);
  }

  private summarise(samples: ThresholdFeedbackSample[]): {
    ppv: number;
    falsePositiveRate: number;
    feedbackRatio: number;
  } {
    const totals = samples.reduce(
      (acc, sample) => {
        if (sample.relevant === true) acc.positives += 1;
        if (sample.relevant === false) acc.negatives += 1;
        if (sample.rating !== undefined) acc.ratings += 1;
        return acc;
      },
      { positives: 0, negatives: 0, ratings: 0 },
    );

    const considered = totals.positives + totals.negatives;
    const ppv = considered > 0 ? totals.positives / considered : 0;
    const falsePositiveRate = considered > 0 ? totals.negatives / considered : 0;
    const feedbackRatio = samples.length > 0 ? considered / samples.length : 0;

    return {
      ppv,
      falsePositiveRate,
      feedbackRatio,
    };
  }

  private persist(detectorType: string, override: ThresholdOverride): void {
    writeJSON(detectorKey(detectorType), override);
    const index = new Set(this.readIndex());
    index.add(detectorType);
    writeJSON(STORAGE_INDEX_KEY, Array.from(index));
  }

  private resolveBaseline(detectorType: string, candidate?: number): number {
    if (typeof candidate === 'number' && candidate > 0) return candidate;
    return getDefaultDetectorThreshold(detectorType);
  }

  private readIndex(): string[] {
    return readJSON<string[]>(STORAGE_INDEX_KEY) ?? [];
  }

  static buildSamplesFromTelemetry(entries: AlertTelemetryEntry[], detectorType: string): ThresholdFeedbackSample[] {
    return entries
      .filter((entry) => (entry.detectorTypes ?? []).includes(detectorType))
      .map((entry) => ({
        relevant: entry.feedback?.relevant,
        predictedRelevance: entry.predictedRelevance,
        thresholdApplied: entry.thresholdAdjustments?.[detectorType]?.appliedThreshold,
        rating: entry.feedback?.rating,
        createdAt: entry.createdAt,
      }));
  }
}

export default ThresholdLearner;
