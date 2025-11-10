import { BaselineService, StudentBaseline } from '@/lib/alerts/baseline';
import { AlertPolicies } from '@/lib/alerts/policies';
import {
  AlertEvent,
  AlertKind,
  AlertMetadata,
  AlertStatus,
  ThresholdOverride,
} from '@/lib/alerts/types';
import { TrendPoint } from '@/lib/alerts/detectors/ewma';
import { ThresholdLearner } from '@/lib/alerts/learning/thresholdLearner';
import { ABTestingService } from '@/lib/alerts/experiments/abTesting';
import type { EmotionEntry, Goal, Intervention, SensoryEntry, TrackingEntry } from '@/types/student';
import { generateSparklineData } from '@/lib/chartUtils';
import { DEFAULT_DETECTOR_THRESHOLDS, getDefaultDetectorThreshold } from '@/lib/alerts/constants';
import { logger } from '@/lib/logger';
import { buildAlertId, truncateSeries } from '@/lib/alerts/utils';
import { computeRecencyScore, severityFromScore, rankSources } from '@/lib/alerts/scoring';
import { MAX_ALERT_SERIES_LENGTH } from '@/constants/analytics';
import { ANALYTICS_CONFIG } from '@/lib/analyticsConfig';
import {
  CandidateGenerator,
  AlertCandidate,
  ApplyThresholdContext,
  TauUDetectorFunction,
} from './candidateGenerator';
import { DetectorResult, isValidDetectorResult } from '../types';

/**
 * Input payload for the alert detection pipeline.
 * Provide raw student-centric streams and optional precomputed baseline.
 */
export interface DetectionInput {
  studentId: string;
  emotions: EmotionEntry[];
  sensory: SensoryEntry[];
  tracking: TrackingEntry[];
  baseline?: StudentBaseline | null;
  now?: Date;
  interventions?: Intervention[];
  goals?: Goal[];
}

/**
 * DetectionOrchestrator
 *
 * Orchestrates the complete alert detection pipeline:
 * 1. Input validation
 * 2. Baseline retrieval with fallback
 * 3. Data series construction (emotion, sensory, association, burst)
 * 4. Candidate generation across all detection types
 * 5. Threshold application with A/B testing
 * 6. Alert scoring and finalization
 * 7. Deduplication and governance
 *
 * Scoring formula (aggregate alert score):
 *   0.4 * impact + 0.25 * confidence + 0.2 * recency + 0.15 * tier
 *
 * Integration points:
 * - BaselineService: Emotion/sensory/environment baselines with robust fallbacks
 * - ABTestingService: Threshold variant experimentation
 * - ThresholdLearner: Adaptive threshold adjustments
 * - AlertPolicies: Deduplication and throttling
 * - CandidateGenerator: All detector execution and candidate building
 *
 * Usage:
 * ```typescript
 * const orchestrator = new DetectionOrchestrator();
 * const alerts = orchestrator.orchestrateDetection({
 *   studentId,
 *   emotions,
 *   sensory,
 *   tracking,
 *   baseline: optionalBaseline,
 *   now: new Date(),
 *   interventions,
 *   goals,
 * });
 * ```
 */
export class DetectionOrchestrator {
  private readonly baselineService: BaselineService;
  private readonly policies: AlertPolicies;
  private readonly learner: ThresholdLearner;
  private readonly experiments: ABTestingService;
  private readonly candidateGenerator: CandidateGenerator;
  private readonly baselineThresholds: Record<string, number>;
  private readonly seriesLimit: number;

  constructor(opts?: {
    baselineService?: BaselineService;
    policies?: AlertPolicies;
    learner?: ThresholdLearner;
    experiments?: ABTestingService;
    candidateGenerator?: CandidateGenerator;
    seriesLimit?: number;
    tauUDetector?: TauUDetectorFunction;
  }) {
    this.baselineService = opts?.baselineService ?? new BaselineService();
    this.policies = opts?.policies ?? new AlertPolicies();
    this.learner = opts?.learner ?? new ThresholdLearner();
    this.experiments = opts?.experiments ?? new ABTestingService();
    this.baselineThresholds = { ...DEFAULT_DETECTOR_THRESHOLDS };
    this.seriesLimit = Math.max(10, Math.min(365, opts?.seriesLimit ?? MAX_ALERT_SERIES_LENGTH));

    // Create candidate generator with configuration
    const cusumConfig = {
      kFactor: ANALYTICS_CONFIG.alerts?.cusum?.kFactor ?? 0.5,
      decisionInterval: ANALYTICS_CONFIG.alerts?.cusum?.decisionInterval ?? 5,
    };

    this.candidateGenerator = opts?.candidateGenerator ?? new CandidateGenerator({
      cusumConfig,
      seriesLimit: this.seriesLimit,
      tauUDetector: opts?.tauUDetector,
      baselineThresholds: this.baselineThresholds,
    });
  }

  /**
   * Orchestrate the full detection pipeline for a single student.
   *
   * Pipeline stages:
   * 1. Validate input and retrieve baseline
   * 2. Build time series and datasets from raw entries
   * 3. Generate candidates via CandidateGenerator (runs all detectors)
   * 4. Apply thresholds with A/B testing integration
   * 5. Build and score alert events
   * 6. Apply deduplication policies
   * 7. Return ranked, policy-governed alerts
   *
   * @param input - Detection input with student data and optional baseline
   * @returns Array of ranked, deduplicated AlertEvent records
   */
  orchestrateDetection(input: DetectionInput): AlertEvent[] {
    const now = input.now ?? new Date();
    const nowTs = now.getTime();

    // Stage 1: Validate input
    if (!input.studentId) return [];

    try {
      logger.debug?.('[DetectionOrchestrator] orchestrateDetection:start', { studentId: input.studentId });
    } catch {}

    // Stage 2: Retrieve baseline and threshold overrides
    const thresholdOverrides = this.learner.getThresholdOverrides();
    const baseline = input.baseline ?? this.baselineService.getEmotionBaseline(input.studentId);

    // Stage 3: Build data series and datasets
    const emotionSeries = this.candidateGenerator.buildEmotionSeries(input.emotions);
    const sensoryAgg = this.candidateGenerator.buildSensoryAggregates(input.sensory);
    const associationDataset = this.candidateGenerator.buildAssociationDataset(input.tracking);
    const burstEvents = this.candidateGenerator.buildBurstEvents(input.emotions, input.sensory);

    // Stage 4: Generate candidates across all detection types
    const emotionCandidates = this.candidateGenerator.buildEmotionCandidates({
      emotionSeries,
      baseline,
      studentId: input.studentId,
      thresholdOverrides,
      nowTs,
      applyThreshold: this.applyThreshold.bind(this),
      createThresholdContext: this.createThresholdContext.bind(this),
    });

    const sensoryCandidates = this.candidateGenerator.buildSensoryCandidates({
      sensoryAggregates: sensoryAgg,
      baseline,
      studentId: input.studentId,
      thresholdOverrides,
      nowTs,
      applyThreshold: this.applyThreshold.bind(this),
      createThresholdContext: this.createThresholdContext.bind(this),
    });

    const associationCandidates = this.candidateGenerator.buildAssociationCandidates({
      dataset: associationDataset,
      studentId: input.studentId,
      thresholdOverrides,
      nowTs,
      applyThreshold: this.applyThreshold.bind(this),
      createThresholdContext: this.createThresholdContext.bind(this),
    });

    const burstCandidates = this.candidateGenerator.buildBurstCandidates({
      burstEvents,
      studentId: input.studentId,
      thresholdOverrides,
      nowTs,
      applyThreshold: this.applyThreshold.bind(this),
      createThresholdContext: this.createThresholdContext.bind(this),
    });

    const tauCandidates = this.candidateGenerator.detectInterventionOutcomes({
      interventions: input.interventions ?? [],
      goals: input.goals ?? [],
      studentId: input.studentId,
      thresholdOverrides,
      nowTs,
      applyThreshold: this.applyThreshold.bind(this),
      createThresholdContext: this.createThresholdContext.bind(this),
    });

    // Stage 5: Aggregate all candidates
    const candidates: AlertCandidate[] = [
      ...emotionCandidates,
      ...sensoryCandidates,
      ...associationCandidates,
      ...burstCandidates,
      ...tauCandidates,
    ];

    // Stage 6: Build alert events from candidates
    const alerts = candidates.map((candidate) => this.buildAlert(candidate, input.studentId, nowTs));

    // Stage 7: Apply deduplication and return final alerts
    const deduped = this.policies
      .deduplicateAlerts(alerts)
      .map(({ governance, ...event }) => ({ ...event }));

    try {
      logger.debug?.('[DetectionOrchestrator] orchestrateDetection:end', {
        studentId: input.studentId,
        alerts: deduped.length
      });
    } catch {}

    return deduped;
  }

  /**
   * Resolve experiment key based on alert kind.
   * Maps alert types to their corresponding A/B testing experiment keys.
   */
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

  /**
   * Create threshold application context with experiment tracking.
   * Assigns student to experiment variant and records assignment if new.
   */
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

  /**
   * Apply threshold with A/B testing and adaptive learning.
   *
   * Threshold application pipeline:
   * 1. Retrieve default baseline threshold
   * 2. Apply learner adjustment (threshold override)
   * 3. Scale threshold based on experiment variant
   * 4. Normalize detector score relative to adjusted threshold
   * 5. Record adjustment trace for diagnostics
   *
   * @param detectorType - Type of detector (ewma, cusum, beta, etc.)
   * @param result - Raw detector result before threshold application
   * @param context - Threshold context with experiment info and overrides
   * @param baselineOverride - Optional baseline threshold override
   * @returns Adjusted detector result or null if below threshold
   */
  private applyThreshold(
    detectorType: string,
    result: DetectorResult | null | undefined,
    context: ApplyThresholdContext,
    baselineOverride?: number,
  ): DetectorResult | null {
    if (!result) return null;

    // Determine base threshold
    const defaultBaseline = getDefaultDetectorThreshold(detectorType);
    const baseFromEngine = (typeof baselineOverride === 'number' && baselineOverride > 0)
      ? baselineOverride
      : (this.baselineThresholds[detectorType] ?? defaultBaseline);

    // Apply learner override
    const override = context.overrides[detectorType];
    const baselineFromOverride = override?.baselineThreshold && override.baselineThreshold > 0
      ? override.baselineThreshold
      : baseFromEngine;
    const learnerAdjusted = override
      ? baselineFromOverride * (1 + override.adjustmentValue)
      : baseFromEngine;

    // Apply experiment variant scaling
    const applied = this.experiments.getThresholdForVariant(
      context.experimentKey,
      context.variant,
      learnerAdjusted,
      override,
      defaultBaseline,
    );

    // Compute normalized score
    const baseForScale = baselineFromOverride > 0 ? baselineFromOverride : defaultBaseline;
    const safeBase = baseForScale > 0 ? baseForScale : defaultBaseline;
    const safeApplied = applied > 0 ? applied : defaultBaseline;
    const scale = safeBase > 0 ? safeApplied / safeBase : 1;
    const adjustedScore = safeBase > 0 ? Math.min(1, Math.max(0, result.score / scale)) : result.score;

    // Record threshold trace
    context.thresholdTraces[detectorType] = {
      adjustment: safeBase > 0 ? (safeApplied - safeBase) / safeBase : 0,
      appliedThreshold: safeApplied,
      baselineThreshold: safeBase,
    };

    // Enrich analysis with experiment context
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

  /**
   * Build alert event from candidate.
   *
   * Alert construction stages:
   * 1. Extract detector scores (impact, confidence)
   * 2. Compute recency score from last timestamp
   * 3. Calculate aggregate score using weighted formula
   * 4. Determine severity tier
   * 5. Generate sparkline for UI visualization
   * 6. Rank and attribute sources
   * 7. Construct final AlertEvent with metadata
   *
   * Scoring formula:
   *   0.4 * impact + 0.25 * confidence + 0.2 * recency + 0.15 * tier
   */
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
    return {
      min,
      max,
      mean: Number.isFinite(mean) ? mean : 0,
      variance: Number.isFinite(variance) ? variance : 0
    };
  }
}
