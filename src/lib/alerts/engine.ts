import { BaselineService, StudentBaseline } from '@/lib/alerts/baseline';
import { AlertPolicies } from '@/lib/alerts/policies';
import {
  AlertEvent,
  AlertKind,
  AlertMetadata,
  AlertSeverity,
  AlertSource,
  AlertStatus,
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
import { ThresholdLearner } from '@/lib/alerts/learning/thresholdLearner';
import { ABTestingService } from '@/lib/alerts/experiments/abTesting';
import type { EmotionEntry, Goal, Intervention, SensoryEntry, TrackingEntry } from '@/types/student';
import { generateSparklineData } from '@/lib/chartUtils';
import { ANALYTICS_CONFIG } from '@/lib/analyticsConfig';
import { DEFAULT_DETECTOR_THRESHOLDS, getDefaultDetectorThreshold } from '@/lib/alerts/constants';
import { logger } from '@/lib/logger';
import { normalizeTimestamp, buildAlertId, truncateSeries } from '@/lib/alerts/utils';
import { computeRecencyScore, severityFromScore, rankSources } from '@/lib/alerts/scoring';

/**
 * Input payload for the alert detection pipeline.
 *
 * Provide raw student-centric streams and optional precomputed baseline.
 * Supplying `now` is useful in tests to stabilize recency scoring.
 */
interface DetectionInput {
  studentId: string;
  emotions: EmotionEntry[];
  sensory: SensoryEntry[];
  tracking: TrackingEntry[];
  baseline?: StudentBaseline | null;
  now?: Date;
  interventions?: Intervention[];
  goals?: Goal[];
}

interface AlertCandidate {
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

interface AssociationDataset extends AssociationDetectorInput {
  timestamps: number[];
}

interface ApplyThresholdContext {
  experimentKey: string;
  variant: string;
  overrides: Record<string, ThresholdOverride>;
  thresholdTraces: Record<string, ThresholdAdjustmentTrace>;
}

/**
 * AlertDetectionEngine
 *
 * Orchestrates multiple statistical detectors (EWMA, CUSUM, beta-binomial, association,
 * burst, Tau-U) to produce ranked, policy-governed alert events for a given student.
 *
 * Scoring formula used to derive aggregate alert score:
 *   0.4 * impact + 0.25 * confidence + 0.2 * recency + 0.15 * tier
 *
 * Integration points:
 * - Baselines via BaselineService (emotion/sensory/environment) with robust fallbacks
 * - A/B experimentation via ABTestingService for threshold variants
 * - Adaptive threshold learning via ThresholdLearner (overrides and adjustment tracing)
 * - Governance via AlertPolicies (deduplication and throttling handled downstream)
 * - Sparkline generation for quick UI visualization
 *
 * Usage example:
 *
 * const engine = new AlertDetectionEngine();
 * const alerts = engine.runDetection({
 *   studentId,
 *   emotions,
 *   sensory,
 *   tracking,
 *   baseline: optionalBaseline,
 *   now: new Date(),
 *   interventions,
 *   goals,
 * });
 */
export class AlertDetectionEngine {
  private readonly baselineService: BaselineService;
  private readonly policies: AlertPolicies;
  private readonly cusumConfig: { kFactor: number; decisionInterval: number };
  private readonly learner: ThresholdLearner;
  private readonly experiments: ABTestingService;
  private readonly baselineThresholds: Record<string, number>;
  private readonly seriesLimit: number;
  /** Optional Tau-U detector dependency; when absent, intervention analysis is skipped. */
  private readonly tauUDetector?: (args: { intervention: Intervention; goal: Goal | null }) => DetectorResult | null;

  constructor(opts?: {
    baselineService?: BaselineService;
    policies?: AlertPolicies;
    cusumConfig?: { kFactor: number; decisionInterval: number };
    learner?: ThresholdLearner;
    experiments?: ABTestingService;
    /** Optional cap applied to series lengths for performance */
    seriesLimit?: number;
    /** Optional Tau-U detector to decouple this engine from Tau-U implementation. */
    tauUDetector?: (args: { intervention: Intervention; goal: Goal | null }) => DetectorResult | null;
  }) {
    this.baselineService = opts?.baselineService ?? new BaselineService();
    this.policies = opts?.policies ?? new AlertPolicies();
    const configSource = opts?.cusumConfig ?? ANALYTICS_CONFIG.alerts?.cusum;
    this.cusumConfig = {
      kFactor: configSource?.kFactor ?? 0.5,
      decisionInterval: configSource?.decisionInterval ?? 5,
    };
    this.learner = opts?.learner ?? new ThresholdLearner();
    this.experiments = opts?.experiments ?? new ABTestingService();
    this.baselineThresholds = { ...DEFAULT_DETECTOR_THRESHOLDS };
    this.seriesLimit = Math.max(10, Math.min(365, opts?.seriesLimit ?? MAX_ALERT_SERIES_LENGTH));
    this.tauUDetector = opts?.tauUDetector;
  }

  /**
   * Run the full detection pipeline for a single student.
   * - Builds series and datasets
   * - Runs detectors with threshold application and experiment variant scaling
   * - Scores, ranks sources, and constructs AlertEvent records
   * - Applies governance (deduplication) and returns final events
   */
  runDetection(input: DetectionInput): AlertEvent[] {
    const now = input.now ?? new Date();
    const nowTs = now.getTime();
    if (!input.studentId) return [];
    try { logger.debug?.('[AlertEngine] runDetection:start', { studentId: input.studentId }); } catch {}

    const thresholdOverrides = this.learner.getThresholdOverrides();
    const baseline = input.baseline ?? this.baselineService.getEmotionBaseline(input.studentId);

    const emotionSeries = this.buildEmotionSeries(input.emotions);
    const sensoryAgg = this.buildSensoryAggregates(input.sensory);
    const associationDataset = this.buildAssociationDataset(input.tracking);
    const burstEvents = this.buildBurstEvents(input.emotions, input.sensory);

    const emotionCandidates = this.buildEmotionCandidates({
      emotionSeries,
      baseline,
      studentId: input.studentId,
      thresholdOverrides,
      nowTs,
    });

    const sensoryCandidates = this.buildSensoryCandidates({
      sensoryAggregates: sensoryAgg,
      baseline,
      studentId: input.studentId,
      thresholdOverrides,
      nowTs,
    });

    const associationCandidates = this.buildAssociationCandidates({
      dataset: associationDataset,
      studentId: input.studentId,
      thresholdOverrides,
      nowTs,
    });

    const burstCandidates = this.buildBurstCandidates({
      burstEvents,
      studentId: input.studentId,
      thresholdOverrides,
      nowTs,
    });

    const tauCandidates = this.detectInterventionOutcomes(input, thresholdOverrides, nowTs);

    const candidates: AlertCandidate[] = [
      ...emotionCandidates,
      ...sensoryCandidates,
      ...associationCandidates,
      ...burstCandidates,
      ...tauCandidates,
    ];

    const alerts = candidates.map((candidate) => this.buildAlert(candidate, input.studentId, nowTs));

    const deduped = this.policies
      .deduplicateAlerts(alerts)
      .map(({ governance, ...event }) => ({ ...event }));

    try { logger.debug?.('[AlertEngine] runDetection:end', { studentId: input.studentId, alerts: deduped.length }); } catch {}
    return deduped;
  }

  private buildEmotionCandidates(args: {
    emotionSeries: Map<string, TrendPoint[]>;
    baseline?: StudentBaseline | null;
    studentId: string;
    thresholdOverrides: Record<string, ThresholdOverride>;
    nowTs: number;
  }): AlertCandidate[] {
    const { emotionSeries, baseline, studentId, thresholdOverrides, nowTs } = args;
    const candidates: AlertCandidate[] = [];

    emotionSeries.forEach((series, key) => {
      const baselineStats = this.lookupEmotionBaseline(baseline, key);
      const context = this.createThresholdContext(AlertKind.BehaviorSpike, studentId, thresholdOverrides);
      const detectors: DetectorResult[] = [];
      const detectorTypes: string[] = [];

      const ewmaRaw = this.safeDetect('ewma', () => detectEWMATrend(series, {
        label: `${key} EWMA`,
        baselineMedian: baselineStats?.median,
        baselineIqr: baselineStats?.iqr,
      }));
      const ewma = this.applyThreshold('ewma', ewmaRaw, context);
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
      const cusum = this.applyThreshold('cusum', cusumRaw, context);
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

  private buildSensoryCandidates(args: {
    sensoryAggregates: Map<string, { successes: number; trials: number; delta: number; series: TrendPoint[] }>;
    baseline?: StudentBaseline | null;
    studentId: string;
    thresholdOverrides: Record<string, ThresholdOverride>;
    nowTs: number;
  }): AlertCandidate[] {
    const { sensoryAggregates, baseline, studentId, thresholdOverrides, nowTs } = args;
    const candidates: AlertCandidate[] = [];

    sensoryAggregates.forEach((agg, key) => {
      const baselineStats = this.lookupSensoryBaseline(baseline, key);
      const context = this.createThresholdContext(AlertKind.BehaviorSpike, studentId, thresholdOverrides);
      const detectors: DetectorResult[] = [];
      const detectorTypes: string[] = [];

      const betaRaw = this.safeDetect('beta', () => detectBetaRateShift({
        successes: agg.successes,
        trials: agg.trials,
        baselinePrior: baselineStats?.ratePrior ?? { alpha: 1, beta: 1 },
        delta: agg.delta,
        label: `${key} rate shift`,
      }));
      const beta = this.applyThreshold('beta', betaRaw, context);
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

  private buildAssociationCandidates(args: {
    dataset: AssociationDataset | null;
    studentId: string;
    thresholdOverrides: Record<string, ThresholdOverride>;
    nowTs: number;
  }): AlertCandidate[] {
    const { dataset, studentId, thresholdOverrides, nowTs } = args;
    if (!dataset) return [];

    const context = this.createThresholdContext(AlertKind.ContextAssociation, studentId, thresholdOverrides);
    const associationRaw = this.safeDetect('association', () => detectAssociation(dataset));
    const association = this.applyThreshold('association', associationRaw, context);
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

  private buildBurstCandidates(args: {
    burstEvents: BurstEvent[];
    studentId: string;
    thresholdOverrides: Record<string, ThresholdOverride>;
    nowTs: number;
  }): AlertCandidate[] {
    const { burstEvents, studentId, thresholdOverrides, nowTs } = args;
    if (!burstEvents.length) return [];

    const context = this.createThresholdContext(AlertKind.BehaviorSpike, studentId, thresholdOverrides);
    const burstRaw = this.safeDetect('burst', () => detectBurst(burstEvents, { label: 'High-intensity episode' }));
    const burst = this.applyThreshold('burst', burstRaw, context);
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

  private detectInterventionOutcomes(
    input: DetectionInput,
    overrides: Record<string, ThresholdOverride>,
    nowTs: number,
  ): AlertCandidate[] {
    if (!this.tauUDetector) return [];
    const interventions = input.interventions ?? [];
    if (!interventions.length) return [];
    const goals = input.goals ?? [];
    const goalIndex = new Map<string, Goal>();
    goals.forEach((goal) => goalIndex.set(goal.id, goal));

    const candidates: AlertCandidate[] = [];
    interventions.forEach((intervention) => {
      if (!intervention?.id) return;
      if (intervention.status && intervention.status !== 'active' && intervention.status !== 'completed') return;
      const linkedGoal = goals.find((goal) => (goal.interventions ?? []).includes(intervention.id)) ?? goalIndex.get(intervention.relatedGoals?.[0] ?? '');
      const context = this.createThresholdContext(AlertKind.InterventionDue, input.studentId, overrides);
      const tauRaw = this.safeDetect('tauU', () => this.tauUDetector!({ intervention, goal: linkedGoal ?? null }));
      const detector = this.applyThreshold('tauU', tauRaw, context, this.baselineThresholds.tauU);
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

  private resolveExperimentKey(kind: AlertKind): string {
    switch (kind) {
      case AlertKind.BehaviorSpike:
        return 'alerts.thresholds.behavior';
      case AlertKind.ContextAssociation:
        return 'alerts.thresholds.context';
      case AlertKind.InterventionDue:
        return 'alerts.thresholds.intervention';
      case AlertKind.DataQuality:
        return 'alerts.thresholds.dataquality';
      case AlertKind.Safety:
      default:
        return 'alerts.thresholds.global';
    }
  }

  private createThresholdContext(
    kind: AlertKind,
    studentId: string,
    overrides: Record<string, ThresholdOverride>,
  ): ApplyThresholdContext {
    const experimentKey = this.resolveExperimentKey(kind);
    const existing = this.experiments.getAssignment(experimentKey, studentId);
    const variant = existing?.variant ?? this.experiments.getVariant(studentId, experimentKey);
    if (!existing || existing.variant !== variant) {
      this.experiments.recordAssignment({
        experimentKey,
        studentId,
        variant,
        assignedAt: new Date().toISOString(),
      });
    }
    return {
      experimentKey,
      variant,
      overrides,
      thresholdTraces: {},
    };
  }

  private applyThreshold(
    detectorType: string,
    result: DetectorResult | null | undefined,
    context: ApplyThresholdContext,
    baselineOverride?: number,
  ): DetectorResult | null {
    if (!result) return null;
    const defaultBaseline = getDefaultDetectorThreshold(detectorType);
    const baseFromEngine = (typeof baselineOverride === 'number' && baselineOverride > 0)
      ? baselineOverride
      : (this.baselineThresholds[detectorType] ?? defaultBaseline);
    const override = context.overrides[detectorType];
    const baselineFromOverride = override?.baselineThreshold && override.baselineThreshold > 0
      ? override.baselineThreshold
      : baseFromEngine;
    const learnerAdjusted = override
      ? baselineFromOverride * (1 + override.adjustmentValue)
      : baseFromEngine;
    const applied = this.experiments.getThresholdForVariant(
      context.experimentKey,
      context.variant,
      learnerAdjusted,
      override,
      defaultBaseline,
    );
    const baseForScale = baselineFromOverride > 0 ? baselineFromOverride : defaultBaseline;
    const safeBase = baseForScale > 0 ? baseForScale : defaultBaseline;
    const safeApplied = applied > 0 ? applied : defaultBaseline;
    const scale = safeBase > 0 ? safeApplied / safeBase : 1;
    const adjustedScore = safeBase > 0 ? Math.min(1, Math.max(0, result.score / scale)) : result.score;

    context.thresholdTraces[detectorType] = {
      adjustment: safeBase > 0 ? (safeApplied - safeBase) / safeBase : 0,
      appliedThreshold: safeApplied,
      baselineThreshold: safeBase,
    };

    const analysis = {
      ...(result.analysis ?? {}),
      detectorType,
      experimentKey: context.experimentKey,
      experimentVariant: context.variant,
    };

    const adjusted: DetectorResult = {
      ...result,
      score: adjustedScore,
      thresholdApplied: applied,
      analysis,
    };
    if (!isValidDetectorResult(adjusted)) return null;
    return adjusted;
  }

  private buildAlert(candidate: AlertCandidate, studentId: string, nowTs: number): AlertEvent {
    const detectors = candidate.detectors;
    const impact = Math.max(...detectors.map((d) => d.score ?? 0), 0);
    const confidence = Math.max(...detectors.map((d) => d.confidence ?? 0), 0);
    const recency = computeRecencyScore(candidate.lastTimestamp, nowTs);
    const tierScore = Math.max(0, Math.min(1, candidate.tier));
    const aggregateScore = Math.min(
      1,
      (0.4 * impact) + (0.25 * confidence) + (0.2 * recency) + (0.15 * tierScore),
    );

    const severity = severityFromScore(aggregateScore);
    const id = buildAlertId(studentId, candidate.kind, candidate.label, candidate.lastTimestamp);
    const sparkline = generateSparklineData(truncateSeries(candidate.series, this.seriesLimit));

    const topSources = rankSources(detectors);

    const thresholdOverridesRecord = candidate.thresholdAdjustments
      ? Object.fromEntries(
        Object.entries(candidate.thresholdAdjustments).map(([detectorType, trace]) => [detectorType, trace.adjustment]),
      )
      : undefined;

    const metadata: AlertMetadata = {
      label: candidate.label,
      contextKey: candidate.label,
      ...candidate.metadata,
      sparkValues: sparkline.values,
      sparkTimestamps: sparkline.timestamps,
      score: aggregateScore,
      recency,
      tier: candidate.tier,
      impact,
      summary: candidate.detectors[0]?.impactHint ?? candidate.label,
      sourceRanks: topSources.map((s) => (s.details as Record<string, unknown>)?.rank ?? null).filter(Boolean),
      thresholdOverrides: thresholdOverridesRecord,
      experimentKey: candidate.experimentKey,
      experimentVariant: candidate.experimentVariant,
      detectorTypes: candidate.detectorTypes,
      thresholdTrace: candidate.thresholdAdjustments,
      detectionScoreBreakdown: { impact, confidence, recency, tier: tierScore },
      seriesStats: this.computeSeriesStats(candidate.series),
    };

    return {
      id,
      studentId,
      kind: candidate.kind,
      severity,
      confidence,
      createdAt: new Date(candidate.lastTimestamp || nowTs).toISOString(),
      status: AlertStatus.New,
      dedupeKey: this.policies.calculateDedupeKey({
        id,
        studentId,
        kind: candidate.kind,
        severity,
        confidence,
        createdAt: new Date(candidate.lastTimestamp || nowTs).toISOString(),
        status: AlertStatus.New,
        sources: topSources,
        metadata,
      } as AlertEvent),
      sources: topSources,
      metadata,
    };
  }

  /** Build per-emotion intensity series from raw entries, sorted and truncated. */
  private buildEmotionSeries(emotions: EmotionEntry[]): Map<string, TrendPoint[]> {
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

  /** Build per-sensory behavior aggregates and series with beta prior deltas. */
  private buildSensoryAggregates(sensory: SensoryEntry[]): Map<string, { successes: number; trials: number; delta: number; series: TrendPoint[] }> {
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

  /** Build association dataset between noise level and max emotion intensity per tracking entry. */
  private buildAssociationDataset(tracking: TrackingEntry[]): AssociationDataset | null {
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

  private buildBurstEvents(emotions: EmotionEntry[], sensory: SensoryEntry[]): BurstEvent[] {
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

  /** Compute lightweight detection quality metrics for diagnostics and analytics. */
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
   * Compute lightweight series statistics for diagnostics.
   * Returns min, max, mean, and variance (sample) to assist with validation.
   */
  private computeSeriesStats(series: TrendPoint[]): { min: number; max: number; mean: number; variance: number } {
    if (!series.length) return { min: 0, max: 0, mean: 0, variance: 0 };
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let sum = 0;
    for (let i = 0; i < series.length; i += 1) {
      const v = Number(series[i]!.value);
      if (!Number.isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
    }
    const n = series.length;
    const mean = n > 0 ? sum / n : 0;
    let acc = 0;
    for (let i = 0; i < series.length; i += 1) {
      const v = Number(series[i]!.value);
      if (!Number.isFinite(v)) continue;
      const d = v - mean;
      acc += d * d;
    }
    const variance = n > 1 ? acc / (n - 1) : 0;
    if (!Number.isFinite(min)) min = 0;
    if (!Number.isFinite(max)) max = 0;
    return { min, max, mean: Number.isFinite(mean) ? mean : 0, variance: Number.isFinite(variance) ? variance : 0 };
  }

  /** Wrap a detector call to ensure errors are logged without disrupting the pipeline. */
  private safeDetect(label: string, fn: () => DetectorResult | null | undefined): DetectorResult | null | undefined {
    try {
      return fn();
    } catch (err) {
      logger.warn?.(`Detector '${label}' failed`, { error: (err as Error)?.message });
      return null;
    }
  }

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

export default AlertDetectionEngine;
