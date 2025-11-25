/*
  AlertTelemetryService
  - Logs alert lifecycle events and computes weekly evaluation metrics
  - Stores minimized data locally using privacy-preserving student hashes
  - Supports adaptive threshold learning and A/B experiment analysis

  High-level overview
  -------------------
  The AlertTelemetryService is the central client-side telemetry manager for the alerting system.
  It records alert lifecycle transitions (creation → acknowledgment → resolution), teacher feedback,
  and experiment metadata, and persists a minimized view of those events to storage via the safe
  storage utilities. Telemetry is privacy-preserving: only a hashed student identifier is stored.

  Major capabilities
  - Lifecycle tracking: created, acknowledged, resolved timestamps, plus resolution notes/actions
  - Feedback capture: relevance, comment, optional helpfulness rating (1-5)
  - Metrics: PPV estimate, false-alerts-per-student-day, completion rate, time-to-first-action
  - Calibration: Brier score and reliability curve binning (10 buckets)
  - Experiments: A/B variant summaries with two-proportion z-test significance
  - Adaptive learning: emits samples for ThresholdLearner to compute per-detector overrides

  Integration points
  - Detection Engine: call logAlertCreated(...) when an alert is emitted
  - UI/Teacher actions: call logAlertAcknowledged(...), logAlertResolved(...), and logFeedback(...)
  - Weekly jobs: call generateWeeklyReport(...) or use WeeklyAlertMetrics.runWeeklyEvaluation(...)

  Privacy & retention
  - Student identifiers are hashed using a non-cryptographic FNV-like hash into base36.
  - Only telemetry necessary for evaluation and learning is persisted. Do not store raw content.
  - Retention is managed by monitoring services; see WeeklyAlertMetrics.cleanupRetention(...).

  Usage example
  ```ts
  const telemetry = new AlertTelemetryService();
  telemetry.logAlertCreated(alert, {
    predictedRelevance: alert.confidence,
    detectorTypes: alert.metadata?.detectorTypes,
    experimentKey: alert.metadata?.experimentKey,
    experimentVariant: alert.metadata?.experimentVariant,
    thresholdAdjustments: alert.metadata?.thresholdTrace,
    metadataSnapshot: alert.metadata,
  });
  // later in UI
  telemetry.logAlertAcknowledged(alert.id);
  telemetry.logFeedback(alert.id, { relevant: true, rating: 5, comment: 'Helpful' });
  telemetry.logAlertResolved(alert.id, { notes: 'Intervention started', actionId: 'start-plan' });
  // weekly
  const report = telemetry.generateWeeklyReport(new Date());
  ```
*/

import type {
  AlertEvent,
  AlertMetadata,
  AlertTelemetryEntry,
  AlertTelemetryReport,
  CalibrationMetrics,
  ExperimentSummary,
  ThresholdAdjustmentTrace,
  ThresholdOverride,
} from '@/lib/alerts/types';
import { safeGet, safeSet } from '@/lib/storage';
import { hashStudentId } from '@/lib/alerts/utils/hash';
import { logger } from '@/lib/logger';
import { ThresholdLearner } from '@/lib/alerts/learning/thresholdLearner';
import { ABTestingService } from '@/lib/alerts/experiments/abTesting';

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

// moved to shared util: hashStudentId

function rangeToWeek(ts: number): { start: Date; end: Date } {
  const d = new Date(ts);
  const day = d.getUTCDay();
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  const end = new Date(start.getTime() + 7 * 24 * 3600_000 - 1);
  return { start, end };
}

function key(suffix: string): string {
  return `alerts:telemetry:${suffix}`;
}

function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly =
    t *
    (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const pdf = Math.exp(-(z * z) / 2) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

/**
 * Optional extras for logAlertCreated to capture model/experiment context for later analysis.
 *
 * - predictedRelevance: model probability for the alert (0-1)
 * - detectorTypes: detectors contributing to the alert (e.g., ['ewma','cusum'])
 * - experimentKey/Variant: A/B test metadata for experiment analysis
 * - thresholdAdjustments: per-detector baseline/applied thresholds for learning
 * - metadataSnapshot: stable snapshot of alert metadata for attribution/analytics
 */
export interface LogCreatedExtras {
  predictedRelevance?: number;
  detectorTypes?: string[];
  experimentKey?: string;
  experimentVariant?: string;
  thresholdAdjustments?: Record<string, ThresholdAdjustmentTrace>;
  metadataSnapshot?: AlertMetadata;
}

/**
 * Telemetry service for alert lifecycle and evaluation analytics.
 *
 * Instances are lightweight and can be created as needed. All state is persisted via
 * safe storage utilities. For advanced weekly reporting and fairness analysis, see
 * WeeklyAlertMetrics which composes this service.
 */
export class AlertTelemetryService {
  private readonly learner: ThresholdLearner;

  private readonly experiments: ABTestingService;

  constructor(opts?: { learner?: ThresholdLearner; experiments?: ABTestingService }) {
    this.learner = opts?.learner ?? new ThresholdLearner();
    this.experiments = opts?.experiments ?? new ABTestingService();
  }

  private readEntries(): AlertTelemetryEntry[] {
    return readStorage<AlertTelemetryEntry[]>(key('events')) ?? [];
  }

  private writeEntries(entries: AlertTelemetryEntry[]): void {
    writeStorage(key('events'), entries);
  }

  private toEntry(alert: AlertEvent, extras?: LogCreatedExtras): AlertTelemetryEntry {
    return {
      alertId: alert.id,
      studentHash: hashStudentId(alert.studentId),
      createdAt: alert.createdAt,
      predictedRelevance: extras?.predictedRelevance,
      detectorTypes: extras?.detectorTypes,
      experimentKey: extras?.experimentKey,
      experimentVariant: extras?.experimentVariant,
      thresholdAdjustments: extras?.thresholdAdjustments,
      metadataSnapshot: extras?.metadataSnapshot ?? alert.metadata,
    };
  }

  /**
   * Record a newly created alert.
   *
   * Example
   * ```ts
   * telemetry.logAlertCreated(alert, { predictedRelevance: alert.confidence });
   * ```
   */
  logAlertCreated(alert: AlertEvent, extras?: LogCreatedExtras): void {
    const entries = this.readEntries();
    entries.push(this.toEntry(alert, extras));
    this.writeEntries(entries);
    try {
      logger.info('alert_created', {
        alertId: alert.id,
        experiment: extras?.experimentKey,
      });
    } catch {}
    try {
      logger.debug('alert_telemetry_captured', {
        alertId: alert.id,
        experiment: extras?.experimentKey,
        variant: extras?.experimentVariant,
        detectors: extras?.detectorTypes,
      });
    } catch {}
  }

  /** Mark an alert as acknowledged by a teacher or system actor. */
  logAlertAcknowledged(alertId: string): void {
    const entries = this.readEntries();
    const e = entries.find((x) => x.alertId === alertId);
    if (e) e.acknowledgedAt = new Date().toISOString();
    this.writeEntries(entries);
    try {
      logger.info('alert_acknowledged', { alertId });
    } catch {}
  }

  /**
   * Mark an alert as resolved with optional notes and action correlation.
   *
   * Example
   * ```ts
   * telemetry.logAlertResolved('alert-1', { notes: 'Intervention initiated', actionId: 'plan-123' });
   * ```
   */
  logAlertResolved(alertId: string, data?: { notes?: string; actionId?: string }): void {
    const entries = this.readEntries();
    const e = entries.find((x) => x.alertId === alertId);
    if (e) {
      e.resolvedAt = new Date().toISOString();
      if (data?.notes) e.resolutionNotes = data.notes;
      if (data?.actionId) e.resolutionActionId = data.actionId;
    }
    this.writeEntries(entries);
    try {
      logger.info('alert_resolved', { alertId });
    } catch {}
  }

  /** Capture teacher feedback for an alert: relevance flag, rating, and comment. */
  logFeedback(
    alertId: string,
    feedback: { relevant?: boolean; comment?: string; rating?: number },
  ): void {
    const entries = this.readEntries();
    const e = entries.find((x) => x.alertId === alertId);
    if (e) e.feedback = feedback;
    this.writeEntries(entries);
    try {
      logger.info('alert_feedback', { alertId, feedback });
    } catch {}
  }

  /** Snooze an alert until a future time with an optional reason. */
  logAlertSnoozed(alertId: string, data?: { until?: string; reason?: string }): void {
    const entries = this.readEntries();
    const e = entries.find((x) => x.alertId === alertId);
    if (e) {
      e.snoozedAt = new Date().toISOString();
      if (data?.until) e.snoozeUntil = data.until;
      if (data?.reason) e.snoozeReason = data.reason;
    }
    this.writeEntries(entries);
    try {
      logger.info('alert_snoozed', {
        alertId,
        until: data?.until,
        reason: data?.reason,
      });
    } catch {}
  }

  /** Return all telemetry entries. Prefer getEntriesBetween for larger datasets. */
  getEntries(): AlertTelemetryEntry[] {
    return this.readEntries();
  }

  /** Return entries created in the inclusive [start, end] UTC window. */
  getEntriesBetween(start: Date, end: Date): AlertTelemetryEntry[] {
    const entries = this.readEntries();
    const startTs = start.getTime();
    const endTs = end.getTime();
    return entries.filter((entry) => {
      const ts = new Date(entry.createdAt).getTime();
      return ts >= startTs && ts <= endTs;
    });
  }

  /** Extract (predicted, actual) pairs from labelled entries for calibration analysis. */
  getCalibrationData(): Array<{ predicted: number; actual: number }> {
    return this.readEntries()
      .map((entry) => {
        if (typeof entry.predictedRelevance !== 'number') return null;
        if (entry.feedback?.relevant === undefined) return null;
        return {
          predicted: entry.predictedRelevance,
          actual: entry.feedback.relevant ? 1 : 0,
        };
      })
      .filter((sample): sample is { predicted: number; actual: number } => !!sample);
  }

  /**
   * Compute summary metrics for the week containing the given date and
   * trigger adaptive threshold learning using the week's labelled samples.
   */
  generateWeeklyReport(weekContaining: Date = new Date()): AlertTelemetryReport {
    const { start, end } = rangeToWeek(weekContaining.getTime());
    const entries = this.getEntriesBetween(start, end);
    const totalCreated = entries.length;
    const totalAcknowledged = entries.filter((e) => e.acknowledgedAt).length;
    const totalResolved = entries.filter((e) => e.resolvedAt).length;
    const times: number[] = entries
      .map((e) => {
        const ackTs = e.acknowledgedAt ? new Date(e.acknowledgedAt).getTime() : Infinity;
        const resTs = e.resolvedAt ? new Date(e.resolvedAt).getTime() : Infinity;
        const first = Math.min(ackTs, resTs);
        return Number.isFinite(first) ? first - new Date(e.createdAt).getTime() : NaN;
      })
      .filter((v) => Number.isFinite(v)) as number[];
    const timeToFirstActionMsAvg = times.length
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : undefined;
    const completionRate = totalCreated ? totalResolved / totalCreated : undefined;
    const feedbacks = entries.map((e) => e.feedback).filter(Boolean) as NonNullable<
      AlertTelemetryEntry['feedback']
    >[];
    const positives = feedbacks.filter((f) => f.relevant === true).length;
    const ppvEstimate = feedbacks.length ? positives / feedbacks.length : undefined;
    const negatives = feedbacks.filter((f) => f.relevant === false).length;
    const falsePositiveRate = feedbacks.length ? negatives / feedbacks.length : undefined;
    const helpfulnessAvg = feedbacks.length
      ? feedbacks.reduce((sum, f) => sum + (f.rating ?? 0), 0) / feedbacks.length
      : undefined;
    const studentDays = new Set(
      entries.map((e) => `${e.studentHash}:${new Date(e.createdAt).toDateString()}`),
    ).size;
    const falseAlertsPerStudentDay = studentDays
      ? (totalCreated - positives) / studentDays
      : undefined;

    const experiments = this.computeExperimentSummaries(entries);
    const report: AlertTelemetryReport = {
      weekStart: start.toISOString(),
      weekEnd: end.toISOString(),
      totalCreated,
      totalAcknowledged,
      totalResolved,
      timeToFirstActionMsAvg,
      completionRate,
      ppvEstimate,
      falseAlertsPerStudentDay,
      falsePositiveRate,
      helpfulnessAvg,
      experiments,
    };

    this.triggerThresholdLearning(entries);
    return report;
  }

  /**
   * Feed labelled samples into the ThresholdLearner and return any computed overrides.
   * Each detector present in the weekly telemetry is evaluated independently.
   */
  triggerThresholdLearning(entries: AlertTelemetryEntry[]): ThresholdOverride[] {
    const overrides: ThresholdOverride[] = [];
    const detectorTypes = new Set<string>();
    entries.forEach((entry) => {
      (entry.detectorTypes ?? []).forEach((detector) => detectorTypes.add(detector));
    });
    detectorTypes.forEach((detectorType) => {
      const samples = ThresholdLearner.buildSamplesFromTelemetry(entries, detectorType);
      if (!samples.length) return;
      const thresholds = entries
        .map((entry) => entry.thresholdAdjustments?.[detectorType]?.baselineThreshold)
        .filter((value): value is number => typeof value === 'number');
      const baseline = thresholds.length
        ? thresholds.reduce((sum, value) => sum + value, 0) / thresholds.length
        : 0;
      const override = this.learner.updateFromFeedback({
        detectorType,
        baselineThreshold: baseline,
        samples,
      });
      if (override) overrides.push(override);
    });
    return overrides;
  }

  /**
   * Compute reliability curve and Brier score from labelled entries.
   *
   * Buckets predictions into deciles [0.0, 0.1, ..., 0.9] with counts and average predicted/actual.
   */
  computeCalibrationMetrics(entries: AlertTelemetryEntry[]): CalibrationMetrics {
    const reliabilityBins = new Array(10)
      .fill(null)
      .map(() => ({ count: 0, predictedSum: 0, actualSum: 0 }));
    let sampleSize = 0;
    let squaredErrorSum = 0;
    entries.forEach((entry) => {
      if (typeof entry.predictedRelevance !== 'number') return;
      if (entry.feedback?.relevant === undefined) return;
      sampleSize += 1;
      const predicted = Math.min(0.999, Math.max(0, entry.predictedRelevance));
      const binIndex = Math.min(9, Math.floor(predicted * 10));
      const bin = reliabilityBins[binIndex];
      bin.count += 1;
      bin.predictedSum += predicted;
      const actual = entry.feedback.relevant ? 1 : 0;
      bin.actualSum += actual;
      const error = predicted - actual;
      squaredErrorSum += error * error;
    });

    const reliability = reliabilityBins.map((bin, idx) => {
      if (bin.count === 0) {
        return { bucket: idx / 10, predicted: 0, actual: 0, count: 0 };
      }
      return {
        bucket: idx / 10,
        predicted: bin.predictedSum / bin.count,
        actual: bin.actualSum / bin.count,
        count: bin.count,
      };
    });

    const brierScore = sampleSize ? squaredErrorSum / sampleSize : undefined;

    return {
      reliability,
      sampleSize,
      brierScore,
    };
  }

  private computeExperimentSummaries(entries: AlertTelemetryEntry[]): ExperimentSummary[] {
    const grouped = new Map<string, AlertTelemetryEntry[]>();
    entries.forEach((entry) => {
      if (!entry.experimentKey) return;
      const keyName = entry.experimentKey;
      const list = grouped.get(keyName) ?? [];
      list.push(entry);
      grouped.set(keyName, list);
    });

    const summaries: ExperimentSummary[] = [];
    grouped.forEach((list, experimentKeyValue) => {
      const variants = new Map<string, AlertTelemetryEntry[]>();
      list.forEach((entry) => {
        const variant = entry.experimentVariant ?? 'A';
        const variantEntries = variants.get(variant) ?? [];
        variantEntries.push(entry);
        variants.set(variant, variantEntries);
      });

      const variantSummaries = Array.from(variants.entries()).map(([variant, variantEntries]) => {
        const withFeedback = variantEntries.filter(
          (entry) => entry.feedback?.relevant !== undefined,
        );
        const positives = withFeedback.filter((entry) => entry.feedback?.relevant === true).length;
        const samples = withFeedback.length;
        const ppv = samples ? positives / samples : undefined;
        const helpfulness = withFeedback
          .map((entry) => entry.feedback?.rating)
          .filter((rating): rating is number => typeof rating === 'number');
        const helpfulnessAvg = helpfulness.length
          ? helpfulness.reduce((sum, value) => sum + value, 0) / helpfulness.length
          : undefined;
        return {
          variant,
          ppv,
          samples,
          helpfulnessAvg,
        };
      });

      let winningVariant: string | undefined;
      let significance: number | undefined;
      if (variantSummaries.length === 2) {
        const [a, b] = variantSummaries;
        if (
          a.samples > 0 &&
          b.samples > 0 &&
          typeof a.ppv === 'number' &&
          typeof b.ppv === 'number'
        ) {
          const positivesA = Math.round(a.ppv * a.samples);
          const positivesB = Math.round(b.ppv * b.samples);
          const pooled = (positivesA + positivesB) / (a.samples + b.samples);
          const denom = Math.sqrt(pooled * (1 - pooled) * (1 / a.samples + 1 / b.samples));
          if (denom > 0) {
            const z = (a.ppv - b.ppv) / denom;
            const pValue = 2 * (1 - normalCdf(Math.abs(z)));
            significance = Math.max(0, Math.min(1, 1 - pValue));
            winningVariant = a.ppv > b.ppv ? a.variant : b.variant;
          }
        }
      }

      const definition = this.experiments.getExperiment(experimentKeyValue);
      summaries.push({
        key: experimentKeyValue,
        hypothesis: definition?.hypothesis,
        startedAt: definition?.startDate,
        endedAt: definition?.endDate,
        variants: variantSummaries,
        winningVariant,
        significance,
      });
    });

    return summaries;
  }
}

export default AlertTelemetryService;
