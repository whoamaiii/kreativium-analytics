/*
  Phase 3 Alert Domain Model Extensions
  Extends the alert schema with adaptive learning, calibration, and experimentation primitives.
*/

import type { TriggerAlert } from '../patternAnalysis';
import type { AlertHistoryEntry as LegacyAlertHistoryEntry } from '../alertSystem';

export enum AlertKind {
  Safety = 'safety',
  BehaviorSpike = 'behavior_spike',
  ContextAssociation = 'context_association',
  InterventionDue = 'intervention_due',
  DataQuality = 'data_quality',
  ImprovementNoted = 'improvement_noted',
  PatternDetected = 'pattern_detected',
}

export enum AlertSeverity {
  Critical = 'critical',
  Important = 'important',
  Moderate = 'moderate',
  Low = 'low',
}

/**
 * Alert lifecycle transitions progress as new → acknowledged → in_progress → resolved/snoozed/dismissed.
 */
export enum AlertStatus {
  New = 'new',
  Acknowledged = 'acknowledged',
  InProgress = 'in_progress',
  Resolved = 'resolved',
  Snoozed = 'snoozed',
  Dismissed = 'dismissed',
}

export enum SourceType {
  PatternEngine = 'pattern_engine',
  TeacherAction = 'teacher_action',
  Sensor = 'sensor',
  Manual = 'manual',
  Baseline = 'baseline',
  Policy = 'policy',
}

/**
 * Ranked source references (S1-S3) provide provenance for alert decisions and scoring.
 */
export type AlertSource = {
  id?: string;
  type: SourceType;
  label?: string;
  details?: Record<string, unknown>;
};

export interface SourceRef extends AlertSource {
  name?: string;
  confidence?: number;
  evidence?: string;
  parameters?: Record<string, unknown>;
}

export type AlertActionKind =
  | 'acknowledge'
  | 'snooze'
  | 'resolve'
  | 'open_details'
  | 'custom';

export interface AlertAction {
  id: string;
  label: string;
  kind: AlertActionKind;
  data?: Record<string, unknown>;
}

export interface TauUPhaseSummary {
  count: number;
  mean: number;
  median: number;
  values: number[];
}

export interface TauUInterpretation {
  headline: string;
  summary: string;
  recommendations: string[];
}

export interface TauUResult {
  effectSize: number;
  pValue: number;
  outcome: 'improving' | 'worsening' | 'no_change';
  comparisons: number;
  trendAdjustment: number;
  ties: number;
  improvementProbability: number;
  phaseA: TauUPhaseSummary;
  phaseB: TauUPhaseSummary;
  interpretation: TauUInterpretation;
}

export interface AlertMetadata extends Record<string, unknown> {
  label?: string;
  contextKey?: string;
  /**
   * @deprecated Use AlertEvent.dedupeKey instead to avoid drift.
   */
  dedupeKey?: string;
  sparkValues?: number[];
  sparkTimestamps?: number[];
  score?: number;
  recency?: number;
  tier?: number;
  impact?: number;
  summary?: string;
  sourceRanks?: Array<string | number>;
  interventionId?: string;
  interventionLabel?: string;
  phaseLabel?: string;
  tauU?: TauUResult;
  experimentKey?: string;
  experimentVariant?: string;
  thresholdOverrides?: Record<string, number>;
  detectorTypes?: string[];
  thresholdTrace?: Record<string, ThresholdAdjustmentTrace>;
  // Resolution metadata copied from legacy history for convenience
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export interface AlertEvent {
  id: string;
  studentId: string;
  kind: AlertKind;
  severity: AlertSeverity;
  confidence: number; // 0-1 range
  createdAt: string; // ISO timestamp
  status: AlertStatus;
  dedupeKey?: string; // used for throttling/deduplication
  sources?: SourceRef[]; // attribution and provenance
  actions?: AlertAction[]; // UI action affordances
  metadata?: AlertMetadata; // domain-specific extras
}

export type LegacyTriggerAlert = TriggerAlert;

export interface AlertHistoryEntry extends AlertEvent {
  viewedAt?: string | null;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
  legacy?: LegacyAlertHistoryEntry;
}

export interface DetectorAnalysis {
  tauU?: TauUResult;
  interventionId?: string;
  goalId?: string;
  experimentKey?: string;
  experimentVariant?: string;
  [key: string]: unknown;
}

export interface DetectorResult {
  score: number; // 0-1 anomaly or risk score
  confidence: number; // 0-1 confidence in detection
  impactHint?: string; // optional human-readable impact summary
  sources?: SourceRef[];
  thresholdApplied?: number;
  analysis?: DetectorAnalysis;
}

export type QuietHours = {
  start: string; // '22:00'
  end: string; // '07:00'
  timezone?: string;
  daysOfWeek?: number[]; // 0-6, Sunday=0
};

export interface DailyCaps {
  critical: number;
  important: number;
  moderate: number;
  low: number;
}

export interface ThrottleSettings {
  /** Per-severity exponential bases; defaults applied when omitted */
  baseBySeverity?: Partial<Record<AlertSeverity, number>>;
  /** Per-severity max delays in ms; capped by global MAX_THROTTLE_DELAY_MS */
  maxDelayBySeverity?: Partial<Record<AlertSeverity, number>>;
}

export type SensitivityLevel = 'low' | 'medium' | 'high';

export interface AlertSettings {
  studentId: string;
  quietHours?: QuietHours;
  dailyCaps?: DailyCaps; // per-student caps
  sensitivityByKind?: Partial<Record<AlertKind, SensitivityLevel>>;
  snoozePreferences?: {
    defaultHours?: number; // 24-72h typical
    dontShowAgainDays?: number; // e.g., 7 days
  };
  /**
   * Optional throttle configuration. When omitted, defaults are applied:
   * - baseBySeverity: { critical: 1.3, important: 1.6, moderate: 2.0, low: 2.5 }
   * - maxDelayBySeverity: all severities capped by global MAX_THROTTLE_DELAY_MS
   */
  throttle?: ThrottleSettings;
}

export interface ThresholdAdjustmentTrace {
  adjustment: number;
  appliedThreshold: number;
  baselineThreshold?: number;
}

export interface AlertTelemetryEntry {
  alertId: string;
  studentHash: string; // privacy-preserving identifier
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  resolutionActionId?: string;
  snoozedAt?: string;
  snoozeUntil?: string;
  snoozeReason?: string;
  feedback?: {
    relevant?: boolean;
    comment?: string;
    rating?: number; // 1-5 helpfulness score
  };
  predictedRelevance?: number;
  detectorTypes?: string[];
  experimentVariant?: string;
  experimentKey?: string;
  thresholdAdjustments?: Record<string, ThresholdAdjustmentTrace>;
  groupAssignments?: string[];
  metadataSnapshot?: AlertMetadata;
}

export interface AlertTelemetryReport {
  weekStart: string;
  weekEnd: string;
  totalCreated: number;
  totalAcknowledged: number;
  totalResolved: number;
  timeToFirstActionMsAvg?: number;
  completionRate?: number; // resolved / created
  ppvEstimate?: number; // positive predictive value proxy using feedback.relevant
  falseAlertsPerStudentDay?: number;
  falsePositiveRate?: number;
  helpfulnessAvg?: number; // average feedback rating
  experiments?: ExperimentSummary[];
}

export interface ThresholdOverride {
  detectorType: string;
  adjustmentValue: number;
  confidenceLevel: number;
  lastUpdatedAt: string;
  sampleSize?: number;
  ppv?: number;
  falsePositiveRate?: number;
  baselineThreshold?: number;
}

export interface CalibrationReliabilityPoint {
  bucket: number;
  predicted: number;
  actual: number;
  count: number;
}

export interface CalibrationMetrics {
  brierScore?: number;
  reliability: CalibrationReliabilityPoint[];
  sampleSize: number;
}

export interface FairnessMetric {
  groupKey: string;
  count: number;
  ppv?: number;
  falsePositiveRate?: number;
  helpfulnessAvg?: number;
}

export interface ExperimentVariantSummary {
  variant: string;
  ppv?: number;
  samples: number;
  helpfulnessAvg?: number;
}

export interface ExperimentSummary {
  key: string;
  hypothesis?: string;
  startedAt?: string;
  endedAt?: string;
  winningVariant?: string;
  significance?: number;
  variants?: ExperimentVariantSummary[];
}

export interface WeeklyEvaluationReport extends AlertTelemetryReport {
  calibration?: CalibrationMetrics;
  fairness?: FairnessMetric[];
  thresholdLearning?: {
    overrides: ThresholdOverride[];
    targetPpv: number;
  };
  experiments?: ExperimentSummary[];
}

export type GovernanceStatus = {
  throttled?: boolean;
  deduplicated?: boolean;
  /** True when the kept alert had duplicates suppressed in the same window. */
  hasDuplicates?: boolean;
  snoozed?: boolean;
  quietHours?: boolean;
  capExceeded?: boolean;
  nextEligibleAt?: string; // ISO
};

export type AlertWithGovernance = AlertEvent & { governance?: GovernanceStatus };

export function isValidSourceRef(input: unknown): input is SourceRef {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const candidate = input as SourceRef;
  if (!candidate.type || !Object.values(SourceType).includes(candidate.type)) {
    return false;
  }

  if (candidate.confidence !== undefined) {
    if (typeof candidate.confidence !== 'number') {
      return false;
    }

    if (Number.isNaN(candidate.confidence) || candidate.confidence < 0 || candidate.confidence > 1) {
      return false;
    }
  }

  if (candidate.parameters && typeof candidate.parameters !== 'object') {
    return false;
  }

  return true;
}

export function isValidDetectorResult(input: unknown): input is DetectorResult {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const candidate = input as DetectorResult;
  if (typeof candidate.score !== 'number' || Number.isNaN(candidate.score) || candidate.score < 0 || candidate.score > 1) {
    return false;
  }

  if (
    typeof candidate.confidence !== 'number' ||
    Number.isNaN(candidate.confidence) ||
    candidate.confidence < 0 ||
    candidate.confidence > 1
  ) {
    return false;
  }

  if (candidate.sources && (!Array.isArray(candidate.sources) || candidate.sources.some((src) => !isValidSourceRef(src)))) {
    return false;
  }

  return true;
}

export function isValidAlertEvent(input: unknown): input is AlertEvent {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const candidate = input as AlertEvent;
  if (!candidate.id || typeof candidate.id !== 'string') {
    return false;
  }

  if (!candidate.studentId || typeof candidate.studentId !== 'string') {
    return false;
  }

  if (!candidate.kind || !Object.values(AlertKind).includes(candidate.kind)) {
    return false;
  }

  if (!candidate.severity || !Object.values(AlertSeverity).includes(candidate.severity)) {
    return false;
  }

  if (!candidate.status || !Object.values(AlertStatus).includes(candidate.status)) {
    return false;
  }

  if (
    typeof candidate.confidence !== 'number' ||
    Number.isNaN(candidate.confidence) ||
    candidate.confidence < 0 ||
    candidate.confidence > 1
  ) {
    return false;
  }

  if (!candidate.createdAt || typeof candidate.createdAt !== 'string') {
    return false;
  }

  if (Number.isNaN(Date.parse(candidate.createdAt))) {
    return false;
  }

  if (candidate.sources && (!Array.isArray(candidate.sources) || candidate.sources.some((src) => !isValidSourceRef(src)))) {
    return false;
  }

  if (candidate.actions && !Array.isArray(candidate.actions)) {
    return false;
  }

  return true;
}

// ---------------------------------------------
// Baseline domain types (enhancements for Phase 3)
// ---------------------------------------------

export type ConfidenceInterval = {
  lower: number;
  upper: number;
  level?: number; // e.g., 0.95
  n?: number; // sample size used
};

export type BetaPrior = { alpha: number; beta: number };

export interface TrendAnalysisResult {
  slope: number; // per day units when timestamps are in ms
  intercept: number;
  iterations: number;
  converged: boolean;
}

export interface BaselineValidationResult {
  isSufficient: boolean;
  minSessions: number;
  minUniqueDays: number;
  sessions: number;
  uniqueDays: number;
  reasons?: string[];
}

export interface BaselineQualityMetrics {
  reliabilityScore?: number; // 0-1
  outlierRate?: number; // 0-1 across all series
  outlierCountsByKey?: Record<string, number>;
  dataSufficiency?: BaselineValidationResult;
  stabilityScore?: number; // 0-1 inverse of trend magnitude
  notes?: string[];
  confidenceIntervalsByKey?: Record<string, ConfidenceInterval>;
  insufficientKeys?: string[];
}

export interface EmotionBaselineStats {
  emotion: string;
  median: number;
  // Approximated IQR using MAD-based sigma mapping when computed
  iqr: number;
  windowDays: number;
  confidenceInterval?: ConfidenceInterval;
  trend?: TrendAnalysisResult;
  insufficientData?: boolean;
}

export interface SensoryBaselineStats {
  behavior: string; // e.g., seeking/avoiding subtype
  ratePrior: BetaPrior; // beta posterior on observed rates (Jeffreys prior)
  windowDays: number;
  posteriorMean?: number;
  credibleInterval?: ConfidenceInterval;
}

export interface EnvironmentalBaselineStats {
  factor: string; // e.g., class_period, location, noise_level
  median: number;
  iqr: number;
  windowDays: number;
  confidenceInterval?: ConfidenceInterval;
  correlationWithEmotion?: number; // Pearson r with max emotion intensity
  insufficientData?: boolean;
}

export interface StudentBaseline {
  studentId: string;
  updatedAt: string;
  nextSuggestedUpdateAt?: string;
  emotion: Record<string, EmotionBaselineStats>;
  sensory: Record<string, SensoryBaselineStats>;
  environment: Record<string, EnvironmentalBaselineStats>;
  sampleInfo: {
    sessions: number;
    uniqueDays: number;
    windows: number[]; // e.g., [7, 14, 30]
  };
  quality?: BaselineQualityMetrics;
}

// Function type contracts for utilities
export type AssessBaselineQuality = (baseline: StudentBaseline) => BaselineQualityMetrics;
export type ValidateDataSufficiency = (sessions: number, uniqueDays: number, minSessions: number, minUniqueDays: number) => BaselineValidationResult;
export type DetectOutliers = (values: number[], zThreshold?: number) => { cleaned: number[]; outlierIndices: number[] };
export type CompareBaselines = (a: StudentBaseline, b: StudentBaseline) => { similarity: number; drift: number };
export type DetectBaselineShift = (series: { timestamps: number[]; values: number[] }) => { shifted: boolean; score: number; trend?: TrendAnalysisResult };
