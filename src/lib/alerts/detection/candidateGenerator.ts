import { StudentBaseline } from '@/lib/alerts/baseline';
import {
  AlertKind,
  AlertMetadata,
  DetectorResult,
  ThresholdAdjustmentTrace,
  ThresholdOverride,
  isValidDetectorResult,
} from '@/lib/alerts/types';
import { detectEWMATrend, TrendPoint } from '@/lib/alerts/detectors/ewma';
import { detectCUSUMShift } from '@/lib/alerts/detectors/cusum';
import { detectBetaRateShift } from '@/lib/alerts/detectors/betaRate';
import { detectAssociation } from '@/lib/alerts/detectors/association';
import type { AssociationDetectorInput } from '@/lib/alerts/detectors/association';
import { detectBurst, BurstEvent } from '@/lib/alerts/detectors/burst';
import type { EmotionEntry, Goal, Intervention, SensoryEntry, TrackingEntry } from '@/types/student';
import { normalizeTimestamp, truncateSeries } from '@/lib/alerts/utils';
import { logger } from '@/lib/logger';

/**
 * Alert candidate structure representing a potential alert before final scoring.
 * Contains all detector results, metadata, and experimental context.
 */
export interface AlertCandidate {
  kind: AlertKind;
  label: string;
  detectors: DetectorResult[];
  detectorTypes: string[];
  series: TrendPoint[];
  lastTimestamp: number;
  tier: number;
  metadata: AlertMetadata;
  thresholdAdjustments?: Record<string, ThresholdAdjustmentTrace>;
  experimentKey?: string;
  experimentVariant?: string;
}

/**
 * Association dataset with time series data for correlation analysis.
 */
export interface AssociationDataset extends AssociationDetectorInput {
  timestamps: number[];
}

/**
 * Context for threshold application including experiment tracking.
 */
export interface ApplyThresholdContext {
  experimentKey: string;
  variant: string;
  overrides: Record<string, ThresholdOverride>;
  thresholdTraces: Record<string, ThresholdAdjustmentTrace>;
}

/**
 * Configuration for CUSUM detector.
 */
export interface CusumConfig {
  kFactor: number;
  decisionInterval: number;
}

/**
 * Detector function type for safe execution wrapping.
 */
type DetectorFunction = () => DetectorResult | null | undefined;

/**
 * Optional Tau-U detector dependency signature.
 */
export type TauUDetectorFunction = (args: { intervention: Intervention; goal: Goal | null }) => DetectorResult | null;

/**
 * CandidateGenerator
 *
 * Extracts alert candidate generation logic from AlertDetectionEngine.
 * Responsible for building candidate alerts across all detection types:
 * - Emotion (EWMA, CUSUM)
 * - Sensory (Beta-binomial rate shift)
 * - Association (noise-emotion correlation)
 * - Burst (high-intensity episodes)
 * - Intervention outcomes (Tau-U)
 *
 * Each candidate includes detector results, metadata, and experimental context
 * for downstream scoring and alert construction.
 */
export class CandidateGenerator {
  private readonly cusumConfig: CusumConfig;
  private readonly seriesLimit: number;
  private readonly tauUDetector?: TauUDetectorFunction;
  private readonly baselineThresholds: Record<string, number>;

  constructor(opts?: {
    cusumConfig?: CusumConfig;
    seriesLimit?: number;
    tauUDetector?: TauUDetectorFunction;
    baselineThresholds?: Record<string, number>;
  }) {
    this.cusumConfig = opts?.cusumConfig ?? { kFactor: 0.5, decisionInterval: 5 };
    this.seriesLimit = opts?.seriesLimit ?? 90;
    this.tauUDetector = opts?.tauUDetector;
    this.baselineThresholds = opts?.baselineThresholds ?? {};
  }

  /**
   * Generate emotion alert candidates using EWMA and CUSUM detectors.
   * Runs both detectors on each emotion series and creates candidates for
   * series that trigger at least one detector.
   */
  buildEmotionCandidates(args: {
    emotionSeries: Map<string, TrendPoint[]>;
    baseline?: StudentBaseline | null;
    studentId: string;
    thresholdOverrides: Record<string, ThresholdOverride>;
    nowTs: number;
    applyThreshold: (
      detectorType: string,
      result: DetectorResult | null | undefined,
      context: ApplyThresholdContext,
    ) => DetectorResult | null;
    createThresholdContext: (
      kind: AlertKind,
      studentId: string,
      overrides: Record<string, ThresholdOverride>,
    ) => ApplyThresholdContext;
  }): AlertCandidate[] {
    const { emotionSeries, baseline, studentId, thresholdOverrides, nowTs, applyThreshold, createThresholdContext } = args;
    const candidates: AlertCandidate[] = [];

    emotionSeries.forEach((series, key) => {
      const baselineStats = this.lookupEmotionBaseline(baseline, key);
      const context = createThresholdContext(AlertKind.BehaviorSpike, studentId, thresholdOverrides);
      const detectors: DetectorResult[] = [];
      const detectorTypes: string[] = [];

      const ewmaRaw = this.safeDetect('ewma', () => detectEWMATrend(series, {
        label: `${key} EWMA`,
        baselineMedian: baselineStats?.median,
        baselineIqr: baselineStats?.iqr,
      }));
      const ewma = applyThreshold('ewma', ewmaRaw, context);
      if (ewma) {
        if (isValidDetectorResult(ewma)) detectors.push(ewma);
        detectorTypes.push('ewma');
      }

      const cusumRaw = this.safeDetect('cusum', () => detectCUSUMShift(series, {
        label: `${key} CUSUM`,
        baselineMean: baselineStats?.median,
        baselineSigma: baselineStats?.iqr ? baselineStats.iqr / 1.349 : undefined,
        kFactor: this.cusumConfig.kFactor,
        decisionInterval: this.cusumConfig.decisionInterval,
      }));
      const cusum = applyThreshold('cusum', cusumRaw, context);
      if (cusum) {
        if (isValidDetectorResult(cusum)) detectors.push(cusum);
        detectorTypes.push('cusum');
      }

      if (detectors.length === 0) return;

      const lastTimestamp = series[series.length - 1]?.timestamp ?? nowTs;
      const tier = detectors.length >= 2 ? 1 : 0.8;
      const metadata: AlertMetadata = {
        emotionKey: key,
        detectorCount: detectors.length,
        baselineMedian: baselineStats?.median,
        detectionQuality: this.computeDetectionQuality(detectors, series),
      };

      candidates.push({
        kind: AlertKind.BehaviorSpike,
        label: key,
        detectors,
        detectorTypes,
        series,
        lastTimestamp,
        tier,
        metadata,
        thresholdAdjustments: context.thresholdTraces,
        experimentKey: context.experimentKey,
        experimentVariant: context.variant,
      });
    });

    return candidates;
  }

  /**
   * Generate sensory alert candidates using Beta-binomial rate shift detector.
   * Detects significant changes in high-intensity sensory response rates.
   */
  buildSensoryCandidates(args: {
    sensoryAggregates: Map<string, { successes: number; trials: number; delta: number; series: TrendPoint[] }>;
    baseline?: StudentBaseline | null;
    studentId: string;
    thresholdOverrides: Record<string, ThresholdOverride>;
    nowTs: number;
    applyThreshold: (
      detectorType: string,
      result: DetectorResult | null | undefined,
      context: ApplyThresholdContext,
    ) => DetectorResult | null;
    createThresholdContext: (
      kind: AlertKind,
      studentId: string,
      overrides: Record<string, ThresholdOverride>,
    ) => ApplyThresholdContext;
  }): AlertCandidate[] {
    const { sensoryAggregates, baseline, studentId, thresholdOverrides, nowTs, applyThreshold, createThresholdContext } = args;
    const candidates: AlertCandidate[] = [];

    sensoryAggregates.forEach((agg, key) => {
      const baselineStats = this.lookupSensoryBaseline(baseline, key);
      const context = createThresholdContext(AlertKind.BehaviorSpike, studentId, thresholdOverrides);
      const detectors: DetectorResult[] = [];
      const detectorTypes: string[] = [];

      const betaRaw = this.safeDetect('beta', () => detectBetaRateShift({
        successes: agg.successes,
        trials: agg.trials,
        baselinePrior: baselineStats?.ratePrior ?? { alpha: 1, beta: 1 },
        delta: agg.delta,
        label: `${key} rate shift`,
      }));
      const beta = applyThreshold('beta', betaRaw, context);
      if (!beta) return;
      if (isValidDetectorResult(beta)) detectors.push(beta);
      detectorTypes.push('beta');

      const series: TrendPoint[] = agg.series;
      const lastTimestamp = series[series.length - 1]?.timestamp ?? nowTs;
      const metadata: AlertMetadata = {
        sensoryKey: key,
        successes: agg.successes,
        trials: agg.trials,
        detectionQuality: this.computeDetectionQuality(detectors, series),
      };

      candidates.push({
        kind: AlertKind.BehaviorSpike,
        label: key,
        detectors,
        detectorTypes,
        series,
        lastTimestamp,
        tier: 0.9,
        metadata,
        thresholdAdjustments: context.thresholdTraces,
        experimentKey: context.experimentKey,
        experimentVariant: context.variant,
      });
    });

    return candidates;
  }

  /**
   * Generate environmental association candidates.
   * Detects correlations between environmental factors (e.g., noise) and emotional responses.
   */
  buildAssociationCandidates(args: {
    dataset: AssociationDataset | null;
    studentId: string;
    thresholdOverrides: Record<string, ThresholdOverride>;
    nowTs: number;
    applyThreshold: (
      detectorType: string,
      result: DetectorResult | null | undefined,
      context: ApplyThresholdContext,
    ) => DetectorResult | null;
    createThresholdContext: (
      kind: AlertKind,
      studentId: string,
      overrides: Record<string, ThresholdOverride>,
    ) => ApplyThresholdContext;
  }): AlertCandidate[] {
    const { dataset, studentId, thresholdOverrides, nowTs, applyThreshold, createThresholdContext } = args;
    if (!dataset) return [];

    const context = createThresholdContext(AlertKind.ContextAssociation, studentId, thresholdOverrides);
    const associationRaw = this.safeDetect('association', () => detectAssociation(dataset));
    const association = applyThreshold('association', associationRaw, context);
    if (!association) return [];

    const series = dataset.seriesX.map((value, idx) => ({
      timestamp: dataset.timestamps[idx] ?? nowTs,
      value,
    }));
    const lastTimestamp = dataset.timestamps[dataset.timestamps.length - 1] ?? nowTs;

    return [{
      kind: AlertKind.ContextAssociation,
      label: dataset.label,
      detectors: [association],
      detectorTypes: ['association'],
      series,
      lastTimestamp,
      tier: 0.85,
      metadata: {
        contingency: dataset.contingency,
        context: dataset.context,
      },
      thresholdAdjustments: context.thresholdTraces,
      experimentKey: context.experimentKey,
      experimentVariant: context.variant,
    }];
  }

  /**
   * Generate burst alert candidates for high-intensity episodes.
   * Detects concentrated periods of intense emotional or sensory activity.
   */
  buildBurstCandidates(args: {
    burstEvents: BurstEvent[];
    studentId: string;
    thresholdOverrides: Record<string, ThresholdOverride>;
    nowTs: number;
    applyThreshold: (
      detectorType: string,
      result: DetectorResult | null | undefined,
      context: ApplyThresholdContext,
    ) => DetectorResult | null;
    createThresholdContext: (
      kind: AlertKind,
      studentId: string,
      overrides: Record<string, ThresholdOverride>,
    ) => ApplyThresholdContext;
  }): AlertCandidate[] {
    const { burstEvents, studentId, thresholdOverrides, nowTs, applyThreshold, createThresholdContext } = args;
    if (!burstEvents.length) return [];

    const context = createThresholdContext(AlertKind.BehaviorSpike, studentId, thresholdOverrides);
    const burstRaw = this.safeDetect('burst', () => detectBurst(burstEvents, { label: 'High-intensity episode' }));
    const burst = applyThreshold('burst', burstRaw, context);
    if (!burst) return [];

    const series: TrendPoint[] = burstEvents.map((evt) => ({ timestamp: evt.timestamp, value: evt.value }));
    const lastTimestamp = burstEvents[burstEvents.length - 1]?.timestamp ?? nowTs;

    return [{
      kind: AlertKind.BehaviorSpike,
      label: 'High intensity burst',
      detectors: [burst],
      detectorTypes: ['burst'],
      series,
      lastTimestamp,
      tier: 1,
      metadata: {
        eventCount: burst.sources?.[0]?.details?.eventCount ?? burstEvents.length,
        detectionQuality: this.computeDetectionQuality([burst], series),
      },
      thresholdAdjustments: context.thresholdTraces,
      experimentKey: context.experimentKey,
      experimentVariant: context.variant,
    }];
  }

  /**
   * Detect intervention outcomes using Tau-U analysis.
   * Evaluates intervention effectiveness by comparing baseline and intervention phases.
   * Requires tauUDetector dependency to be provided at construction.
   */
  detectInterventionOutcomes(args: {
    interventions: Intervention[];
    goals: Goal[];
    studentId: string;
    thresholdOverrides: Record<string, ThresholdOverride>;
    nowTs: number;
    applyThreshold: (
      detectorType: string,
      result: DetectorResult | null | undefined,
      context: ApplyThresholdContext,
      baselineOverride?: number,
    ) => DetectorResult | null;
    createThresholdContext: (
      kind: AlertKind,
      studentId: string,
      overrides: Record<string, ThresholdOverride>,
    ) => ApplyThresholdContext;
  }): AlertCandidate[] {
    if (!this.tauUDetector) return [];
    const { interventions, goals, studentId, thresholdOverrides, nowTs, applyThreshold, createThresholdContext } = args;
    if (!interventions.length) return [];

    const goalIndex = new Map<string, Goal>();
    goals.forEach((goal) => goalIndex.set(goal.id, goal));

    const candidates: AlertCandidate[] = [];
    interventions.forEach((intervention) => {
      if (!intervention?.id) return;
      if (intervention.status && intervention.status !== 'active' && intervention.status !== 'completed') return;
      const linkedGoal = goals.find((goal) => (goal.interventions ?? []).includes(intervention.id)) ?? goalIndex.get(intervention.relatedGoals?.[0] ?? '');
      const context = createThresholdContext(AlertKind.InterventionDue, studentId, thresholdOverrides);
      const tauRaw = this.safeDetect('tauU', () => this.tauUDetector!({ intervention, goal: linkedGoal ?? null }));
      const detector = applyThreshold('tauU', tauRaw, context, this.baselineThresholds.tauU);
      if (!detector || !detector.analysis?.tauU) return;
      const tauResult = detector.analysis.tauU;
      if (Math.abs(tauResult.effectSize) < 0.2) return;

      const phaseData = (detector.analysis as Record<string, unknown>)?.phaseData as {
        phaseA: number[];
        phaseB: number[];
        timestampsA: number[];
        timestampsB: number[];
      } | undefined;

      const series: TrendPoint[] = [];
      if (phaseData) {
        phaseData.phaseA.forEach((value, idx) => {
          const ts = Number.isFinite(phaseData.timestampsA?.[idx])
            ? phaseData.timestampsA[idx]
            : nowTs - (phaseData.phaseA.length - idx) * 86_400_000;
          series.push({ timestamp: ts, value });
        });
        phaseData.phaseB.forEach((value, idx) => {
          const ts = Number.isFinite(phaseData.timestampsB?.[idx])
            ? phaseData.timestampsB[idx]
            : nowTs - (phaseData.phaseB.length - idx) * 86_400_000 / 2;
          series.push({ timestamp: ts, value });
        });
      } else {
        const allValues = [...tauResult.phaseA.values, ...tauResult.phaseB.values];
        allValues.forEach((value, idx) => {
          series.push({ timestamp: nowTs - (allValues.length - idx) * 86_400_000, value });
        });
      }

      series.sort((a, b) => a.timestamp - b.timestamp);
      const lastTimestamp = series[series.length - 1]?.timestamp ?? nowTs;
      const metadata: AlertMetadata = {
        interventionId: intervention.id,
        interventionLabel: intervention.title,
        tauU: tauResult,
        detectorCount: 1,
        phaseLabel: tauResult.outcome,
        label: intervention.title,
        detectionQuality: this.computeDetectionQuality([detector], series),
      };

      candidates.push({
        kind: AlertKind.InterventionDue,
        label: intervention.title ?? 'Intervention review',
        detectors: [detector],
        detectorTypes: ['tauU'],
        series,
        lastTimestamp,
        tier: 1,
        metadata,
        thresholdAdjustments: context.thresholdTraces,
        experimentKey: context.experimentKey,
        experimentVariant: context.variant,
      });
    });

    return candidates;
  }

  /**
   * Build per-emotion intensity series from raw entries.
   * Groups by emotion key, sorts by time, and truncates to series limit.
   */
  buildEmotionSeries(emotions: EmotionEntry[]): Map<string, TrendPoint[]> {
    const map = new Map<string, TrendPoint[]>();
    for (let i = 0; i < emotions.length; i += 1) {
      const entry = emotions[i]!;
      const ts = normalizeTimestamp(entry.timestamp);
      if (ts === null) continue;
      const intensity = Number(entry.intensity);
      if (!Number.isFinite(intensity)) continue;
      const key = entry.emotion || entry.subEmotion || 'unknown';
      const arr = map.get(key) ?? [];
      arr.push({ timestamp: ts, value: intensity });
      map.set(key, arr);
    }
    map.forEach((arr, key) => {
      const sorted = arr.sort((a, b) => a.timestamp - b.timestamp);
      map.set(key, truncateSeries(sorted, this.seriesLimit));
    });
    return map;
  }

  /**
   * Build per-sensory behavior aggregates with success/trial counts.
   * Aggregates by sensory type and tracks high-intensity events (intensity >= 4).
   */
  buildSensoryAggregates(sensory: SensoryEntry[]): Map<string, { successes: number; trials: number; delta: number; series: TrendPoint[] }> {
    const map = new Map<string, { successes: number; trials: number; delta: number; series: TrendPoint[] }>();
    for (let i = 0; i < sensory.length; i += 1) {
      const entry = sensory[i]!;
      const ts = normalizeTimestamp(entry.timestamp);
      if (ts === null) continue;
      const key = entry.response || entry.type || entry.sensoryType || 'sensory';
      const intensity = Number(entry.intensity ?? 1);
      const isHigh = intensity >= 4;
      const current = map.get(key) ?? { successes: 0, trials: 0, delta: 0.1, series: [] };
      current.trials += 1;
      if (isHigh) current.successes += 1;
      current.series.push({ timestamp: ts, value: intensity });
      map.set(key, current);
    }

    map.forEach((agg, key) => {
      agg.series.sort((a, b) => a.timestamp - b.timestamp);
      agg.series = truncateSeries(agg.series, this.seriesLimit);
      if (agg.trials > 0) {
        const highRate = agg.successes / agg.trials;
        agg.delta = Math.max(0.05, Math.min(0.2, highRate - 0.1));
      }
      map.set(key, agg);
    });
    return map;
  }

  /**
   * Build association dataset between noise level and max emotion intensity.
   * Creates a 2x2 contingency table for chi-square association testing.
   */
  buildAssociationDataset(tracking: TrackingEntry[]): AssociationDataset | null {
    if (!tracking.length) return null;
    let highNoiseHighEmotion = 0;
    let highNoiseLowEmotion = 0;
    let lowNoiseHighEmotion = 0;
    let lowNoiseLowEmotion = 0;
    const noiseSeries: number[] = [];
    const emotionSeries: number[] = [];
    const timestamps: number[] = [];

    for (let i = 0; i < tracking.length; i += 1) {
      const entry = tracking[i]!;
      const ts = normalizeTimestamp(entry.timestamp);
      if (ts === null) continue;
      const noise = entry.environmentalData?.roomConditions?.noiseLevel;
      if (!Number.isFinite(noise)) continue;
      const emos = entry.emotions ?? [];
      let maxEmotion = 0;
      for (let j = 0; j < emos.length; j += 1) {
        const v = Number(emos[j]!.intensity);
        if (Number.isFinite(v) && v > maxEmotion) maxEmotion = v;
      }

      const highEmotion = maxEmotion >= 4;
      const highNoise = (noise as number) >= 70;

      if (highNoise && highEmotion) highNoiseHighEmotion += 1;
      else if (highNoise) highNoiseLowEmotion += 1;
      else if (highEmotion) lowNoiseHighEmotion += 1;
      else lowNoiseLowEmotion += 1;

      noiseSeries.push(noise as number);
      emotionSeries.push(maxEmotion);
      timestamps.push(ts);
    }

    const total = highNoiseHighEmotion + highNoiseLowEmotion + lowNoiseHighEmotion + lowNoiseLowEmotion;
    if (total < 5) return null;

    return {
      label: 'Environment association',
      contingency: {
        a: highNoiseHighEmotion,
        b: highNoiseLowEmotion,
        c: lowNoiseHighEmotion,
        d: lowNoiseLowEmotion,
      },
      seriesX: noiseSeries,
      seriesY: emotionSeries,
      timestamps,
      context: {
        factor: 'noiseLevel',
      },
      minSupport: 5,
    };
  }

  /**
   * Build burst events by pairing high-intensity emotions with nearby sensory data.
   * Groups events by minute buckets for temporal alignment.
   */
  buildBurstEvents(emotions: EmotionEntry[], sensory: SensoryEntry[]): BurstEvent[] {
    const events: BurstEvent[] = [];
    const sensoryByTime = sensory.reduce<Record<number, SensoryEntry[]>>((acc, entry) => {
      const ts = normalizeTimestamp(entry.timestamp);
      if (ts === null) return acc;
      const bucket = Math.round(ts / 60_000); // minute bucket
      acc[bucket] = acc[bucket] ?? [];
      acc[bucket].push(entry);
      return acc;
    }, {});

    for (let i = 0; i < emotions.length; i += 1) {
      const entry = emotions[i]!;
      const ts = normalizeTimestamp(entry.timestamp);
      if (ts === null) continue;
      const intensity = Number(entry.intensity);
      if (!Number.isFinite(intensity) || intensity < 4) continue;
      const bucket = Math.round(ts / 60_000);
      const nearbySensory = [
        ...(sensoryByTime[bucket] ?? []),
        ...(sensoryByTime[bucket - 1] ?? []),
        ...(sensoryByTime[bucket + 1] ?? []),
      ];
      const paired: number[] = [];
      for (let j = 0; j < nearbySensory.length; j += 1) {
        const n = Number(nearbySensory[j]!.intensity ?? 0);
        if (Number.isFinite(n)) paired.push(n);
      }
      const pairedValue = paired.length ? paired.reduce((sum, val) => sum + val, 0) / paired.length : 0;
      events.push({ timestamp: ts, value: intensity, pairedValue });
    }

    return events.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Compute lightweight detection quality metrics.
   * Returns count of valid detectors, average confidence, and series length.
   */
  private computeDetectionQuality(detectors: DetectorResult[], series: TrendPoint[]): { validDetectors: number; avgConfidence: number; seriesLength: number } {
    const valid = detectors.filter((d) => isValidDetectorResult(d));
    const avgConfidence = valid.length ? valid.reduce((s, d) => s + (d.confidence ?? 0), 0) / valid.length : 0;
    return {
      validDetectors: valid.length,
      avgConfidence,
      seriesLength: series.length,
    };
  }

  /**
   * Wrap detector execution to ensure errors don't disrupt the pipeline.
   * Logs failures and returns null on error (fail-soft philosophy).
   */
  private safeDetect(label: string, fn: DetectorFunction): DetectorResult | null | undefined {
    try {
      return fn();
    } catch (err) {
      logger.warn?.(`Detector '${label}' failed`, { error: (err as Error)?.message });
      return null;
    }
  }

  /**
   * Look up emotion baseline statistics from student baseline.
   * Tries multiple time windows (14, 7, 30 days) in order of preference.
   */
  private lookupEmotionBaseline(baseline: StudentBaseline | null | undefined, key: string): { median: number; iqr: number } | null {
    if (!baseline) return null;
    const windows = [14, 7, 30];
    for (const window of windows) {
      const stats = baseline.emotion?.[`${key}:${window}`];
      if (stats) {
        return { median: stats.median, iqr: stats.iqr };
      }
    }
    return null;
  }

  /**
   * Look up sensory baseline statistics from student baseline.
   * Tries multiple time windows (14, 7, 30 days) in order of preference.
   */
  private lookupSensoryBaseline(
    baseline: StudentBaseline | null | undefined,
    key: string,
  ): { ratePrior: { alpha: number; beta: number } } | null {
    if (!baseline) return null;
    const windows = [14, 7, 30];
    for (const window of windows) {
      const stats = baseline.sensory?.[`${key}:${window}`];
      if (stats) {
        return { ratePrior: stats.ratePrior };
      }
    }
    return null;
  }
}
