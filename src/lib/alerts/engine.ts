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
import type { TrendPoint } from '@/lib/alerts/detectors/ewma';
import type { BurstEvent } from '@/lib/alerts/detectors/burst';
import { ThresholdLearner } from '@/lib/alerts/learning/thresholdLearner';
import { ABTestingService } from '@/lib/alerts/experiments/abTesting';
import type {
  EmotionEntry,
  Goal,
  Intervention,
  SensoryEntry,
  TrackingEntry,
} from '@/types/student';
import { generateSparklineData } from '@/lib/chartUtils';
import { ANALYTICS_CONFIG } from '@/lib/analyticsConfig';
import { DEFAULT_DETECTOR_THRESHOLDS, getDefaultDetectorThreshold } from '@/lib/alerts/constants';
import { logger } from '@/lib/logger';
import { buildAlertId } from '@/lib/alerts/utils';
import { computeRecencyScore, severityFromScore, rankSources } from '@/lib/alerts/scoring';
import {
  aggregateDetectorResults,
  finalizeAlertEvent,
  type AggregatedResult,
} from '@/lib/alerts/detection';
import { CandidateGenerator } from '@/lib/alerts/detection/candidateGenerator';
import { MAX_ALERT_SERIES_LENGTH } from '@/constants/analytics';

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
  private readonly tauUDetector?: (args: {
    intervention: Intervention;
    goal: Goal | null;
  }) => DetectorResult | null;
  private readonly generator: CandidateGenerator;

  constructor(opts?: {
    baselineService?: BaselineService;
    policies?: AlertPolicies;
    cusumConfig?: { kFactor: number; decisionInterval: number };
    learner?: ThresholdLearner;
    experiments?: ABTestingService;
    /** Optional cap applied to series lengths for performance */
    seriesLimit?: number;
    /** Optional Tau-U detector to decouple this engine from Tau-U implementation. */
    tauUDetector?: (args: {
      intervention: Intervention;
      goal: Goal | null;
    }) => DetectorResult | null;
  }) {
    this.baselineService = opts?.baselineService ?? new BaselineService();
    this.policies = opts?.policies ?? new AlertPolicies();
    const configSource = opts?.cusumConfig ?? ANALYTICS_CONFIG.alerts?.cusum;
    const cusumConfig = {
      kFactor: configSource?.kFactor ?? 0.5,
      decisionInterval: configSource?.decisionInterval ?? 5,
    };
    this.cusumConfig = cusumConfig;
    this.learner = opts?.learner ?? new ThresholdLearner();
    this.experiments = opts?.experiments ?? new ABTestingService();
    const seriesLimit = Math.max(10, Math.min(365, opts?.seriesLimit ?? MAX_ALERT_SERIES_LENGTH));
    this.seriesLimit = seriesLimit;
    this.baselineThresholds = { ...DEFAULT_DETECTOR_THRESHOLDS };
    this.tauUDetector = opts?.tauUDetector;

    // Initialize CandidateGenerator with extracted configuration
    this.generator = new CandidateGenerator({
      cusumConfig,
      seriesLimit,
      tauUDetector: opts?.tauUDetector,
      baselineThresholds: { ...DEFAULT_DETECTOR_THRESHOLDS },
    });
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
    try {
      logger.debug?.('[AlertEngine] runDetection:start', { studentId: input.studentId });
    } catch {
      // @silent-ok: logger failure is non-critical
    }

    const thresholdOverrides = this.learner.getThresholdOverrides();
    const baseline = input.baseline ?? this.baselineService.getEmotionBaseline(input.studentId);

    // Delegate data building to generator
    const emotionSeries = this.generator.buildEmotionSeries(input.emotions);
    const sensoryAgg = this.generator.buildSensoryAggregates(input.sensory);
    const associationDataset = this.generator.buildAssociationDataset(input.tracking);
    const burstEvents = this.generator.buildBurstEvents(input.emotions, input.sensory);

    // Delegate candidate building to generator with method injection
    const emotionCandidates = this.generator.buildEmotionCandidates({
      emotionSeries,
      baseline,
      studentId: input.studentId,
      thresholdOverrides,
      nowTs,
      applyThreshold: this.applyThreshold.bind(this),
      createThresholdContext: this.createThresholdContext.bind(this),
    });

    const sensoryCandidates = this.generator.buildSensoryCandidates({
      sensoryAggregates: sensoryAgg,
      baseline,
      studentId: input.studentId,
      thresholdOverrides,
      nowTs,
      applyThreshold: this.applyThreshold.bind(this),
      createThresholdContext: this.createThresholdContext.bind(this),
    });

    const associationCandidates = this.generator.buildAssociationCandidates({
      dataset: associationDataset,
      studentId: input.studentId,
      thresholdOverrides,
      nowTs,
      applyThreshold: this.applyThreshold.bind(this),
      createThresholdContext: this.createThresholdContext.bind(this),
    });

    const burstCandidates = this.generator.buildBurstCandidates({
      burstEvents,
      studentId: input.studentId,
      thresholdOverrides,
      nowTs,
      applyThreshold: this.applyThreshold.bind(this),
      createThresholdContext: this.createThresholdContext.bind(this),
    });

    const tauCandidates = this.generator.detectInterventionOutcomes({
      interventions: input.interventions ?? [],
      goals: input.goals ?? [],
      studentId: input.studentId,
      thresholdOverrides,
      nowTs,
      applyThreshold: this.applyThreshold.bind(this),
      createThresholdContext: this.createThresholdContext.bind(this),
    });

    const candidates: AlertCandidate[] = [
      ...emotionCandidates,
      ...sensoryCandidates,
      ...associationCandidates,
      ...burstCandidates,
      ...tauCandidates,
    ];

    const alerts = candidates.map((candidate) =>
      this.buildAlert(candidate, input.studentId, nowTs),
    );

    const deduped = this.policies
      .deduplicateAlerts(alerts)
      .map(({ governance, ...event }) => ({ ...event }));

    try {
      logger.debug?.('[AlertEngine] runDetection:end', {
        studentId: input.studentId,
        alerts: deduped.length,
      });
    } catch {
      // @silent-ok: logger failure is non-critical
    }
    return deduped;
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
    const baseFromEngine =
      typeof baselineOverride === 'number' && baselineOverride > 0
        ? baselineOverride
        : (this.baselineThresholds[detectorType] ?? defaultBaseline);
    const override = context.overrides[detectorType];
    const baselineFromOverride =
      override?.baselineThreshold && override.baselineThreshold > 0
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
    const adjustedScore =
      safeBase > 0 ? Math.min(1, Math.max(0, result.score / scale)) : result.score;

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
    // Step 1: Aggregate detector results using weighted formula
    const aggregated = aggregateDetectorResults(
      candidate.detectors,
      candidate.lastTimestamp,
      candidate.tier,
      nowTs,
    );

    // Step 2: Finalize alert event with metadata enrichment and policies
    return finalizeAlertEvent(candidate, aggregated, studentId, {
      seriesLimit: this.seriesLimit,
      policies: this.policies,
    });
  }

  /**
   * Compute lightweight series statistics for diagnostics.
   * Returns min, max, mean, and variance (sample) to assist with validation.
   */
  private computeSeriesStats(series: TrendPoint[]): {
    min: number;
    max: number;
    mean: number;
    variance: number;
  } {
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
    return {
      min,
      max,
      mean: Number.isFinite(mean) ? mean : 0,
      variance: Number.isFinite(variance) ? variance : 0,
    };
  }
}

export default AlertDetectionEngine;
