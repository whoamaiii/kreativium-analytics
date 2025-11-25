import { AlertTelemetryService } from '@/lib/alerts/telemetry';
import type {
  AlertTelemetryEntry,
  WeeklyEvaluationReport,
  CalibrationMetrics,
  ThresholdOverride,
} from '@/lib/alerts/types';
import { ThresholdLearner } from '@/lib/alerts/learning/thresholdLearner';
import type { Student } from '@/types/student';
import { safeGet, safeSet } from '@/lib/storage';
import { hashStudentId } from '@/lib/alerts/utils/hash';

const REPORT_INDEX_KEY = 'alerts:weeklyReports:index';
const GOVERNANCE_AUDIT_KEY = 'alerts:governance:audit';

interface WeeklyAlertMetricsOptions {
  weekContaining?: Date;
  students?: Student[];
  telemetry?: AlertTelemetryService;
  learner?: ThresholdLearner;
}

interface GroupMetrics {
  groupKey: string;
  count: number;
  ppv?: number;
  falsePositiveRate?: number;
  helpfulnessAvg?: number;
}

interface GovernanceDecisionRecord {
  timestamp: string;
  policy: string;
  decision: string;
  alertId?: string;
  studentHash?: string;
  details?: Record<string, unknown>;
}

interface PerformanceMetricsSummary {
  alertsPerHour?: number;
  ackRate?: number;
  resolveRate?: number;
  avgAckLatencyMs?: number;
  avgResolveLatencyMs?: number;
}

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

function reportKey(weekStartIso: string): string {
  return `alerts:weeklyReports:${weekStartIso}`;
}

function toWeekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - day);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

function toWeekEnd(start: Date): Date {
  const end = new Date(start.getTime() + 7 * 24 * 3600_000 - 1);
  return end;
}

// centralized in utils/hash

function calculateGroupMetrics(
  entries: AlertTelemetryEntry[],
  groupKey: string,
): GroupMetrics | null {
  const filtered = entries.filter((entry) => entry.groupAssignments?.includes(groupKey));
  if (!filtered.length) return null;
  const withFeedback = filtered.filter((e) => e.feedback?.relevant !== undefined);
  const positives = withFeedback.filter((e) => e.feedback?.relevant === true).length;
  const negatives = withFeedback.filter((e) => e.feedback?.relevant === false).length;
  const helpfulness = withFeedback
    .map((e) => e.feedback?.rating)
    .filter((rating): rating is number => typeof rating === 'number');

  const ppv = withFeedback.length ? positives / withFeedback.length : undefined;
  const falsePositiveRate = withFeedback.length ? negatives / withFeedback.length : undefined;
  const helpfulnessAvg = helpfulness.length
    ? helpfulness.reduce((sum, value) => sum + value, 0) / helpfulness.length
    : undefined;

  return {
    groupKey,
    count: filtered.length,
    ppv,
    falsePositiveRate,
    helpfulnessAvg,
  };
}

export class WeeklyAlertMetrics {
  private readonly telemetry: AlertTelemetryService;

  private readonly learner: ThresholdLearner;

  constructor(opts?: { telemetry?: AlertTelemetryService; learner?: ThresholdLearner }) {
    this.telemetry = opts?.telemetry ?? new AlertTelemetryService();
    this.learner = opts?.learner ?? new ThresholdLearner();
  }

  runWeeklyEvaluation(options: WeeklyAlertMetricsOptions = {}): WeeklyEvaluationReport {
    const weekContaining = options.weekContaining ?? new Date();
    const weekStart = toWeekStart(weekContaining);
    const weekEnd = toWeekEnd(weekStart);

    const entries = this.telemetry.getEntriesBetween(weekStart, weekEnd);
    const baseReport = this.telemetry.generateWeeklyReport(weekContaining);

    const calibration: CalibrationMetrics = this.telemetry.computeCalibrationMetrics(entries);

    const studentIndex = new Map<string, { grade?: string; classPeriod?: string }>();
    (options.students ?? []).forEach((student) => {
      const hash = hashStudentId(student.id);
      studentIndex.set(hash, {
        grade: student.grade,
        classPeriod: (student as any)?.classPeriod ?? undefined,
      });
    });

    const groupEntries: AlertTelemetryEntry[] = entries.map((entry) => {
      const demographics = studentIndex.get(entry.studentHash);
      const groupAssignments = new Set<string>(entry.groupAssignments ?? []);
      if (demographics?.grade) groupAssignments.add(`grade:${demographics.grade}`);
      if (demographics?.classPeriod) groupAssignments.add(`class:${demographics.classPeriod}`);
      return { ...entry, groupAssignments: Array.from(groupAssignments) };
    });

    const groupKeys = new Set<string>();
    groupEntries.forEach((entry) => {
      (entry.groupAssignments ?? []).forEach((group) => groupKeys.add(group));
    });

    const fairness = Array.from(groupKeys).reduce<GroupMetrics[]>((acc, key) => {
      const metric = calculateGroupMetrics(groupEntries, key);
      if (metric !== null) acc.push(metric);
      return acc;
    }, []);

    const overrides = this.learner.getThresholdOverrides();

    const performance: PerformanceMetricsSummary = this.computePerformanceMetrics(entries);

    const report: WeeklyEvaluationReport = {
      ...baseReport,
      calibration,
      fairness,
      thresholdLearning: {
        overrides: Object.values(overrides) as ThresholdOverride[],
        targetPpv: this.learner.getTargetPpv(),
      },
      experiments: baseReport.experiments ?? [],
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      // Non-breaking optional extensions: performance is present but ignored by consumers
      // expecting the base WeeklyEvaluationReport shape.
      // Cast preserves compatibility while exposing richer data to advanced callers.
      performance,
    } as WeeklyEvaluationReport & { performance?: PerformanceMetricsSummary };

    this.persistReport(report);
    this.dispatchUpdate(report);

    return report;
  }

  private persistReport(report: WeeklyEvaluationReport): void {
    writeJSON(reportKey(report.weekStart), report);
    const index = new Set(readJSON<string[]>(REPORT_INDEX_KEY) ?? []);
    index.add(report.weekStart);
    writeJSON(REPORT_INDEX_KEY, Array.from(index).sort());
  }

  private dispatchUpdate(report: WeeklyEvaluationReport): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('alerts:weeklyReport', { detail: report }));
  }

  static listReports(): WeeklyEvaluationReport[] {
    const index = readJSON<string[]>(REPORT_INDEX_KEY) ?? [];
    return index
      .map((weekStart) => readJSON<WeeklyEvaluationReport>(reportKey(weekStart)))
      .filter((report): report is WeeklyEvaluationReport => !!report)
      .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime());
  }

  // -----------------------------
  // Enhancements: Governance audit
  // -----------------------------
  logGovernanceDecision(record: GovernanceDecisionRecord): void {
    const list = readJSON<GovernanceDecisionRecord[]>(GOVERNANCE_AUDIT_KEY) ?? [];
    list.push({ ...record, timestamp: record.timestamp ?? new Date().toISOString() });
    writeJSON(GOVERNANCE_AUDIT_KEY, list);
  }

  listGovernanceDecisions(filter?: {
    policy?: string;
    alertId?: string;
  }): GovernanceDecisionRecord[] {
    const list = readJSON<GovernanceDecisionRecord[]>(GOVERNANCE_AUDIT_KEY) ?? [];
    if (!filter) return list;
    return list.filter(
      (rec) =>
        (filter.policy ? rec.policy === filter.policy : true) &&
        (filter.alertId ? rec.alertId === filter.alertId : true),
    );
  }

  // ----------------------------------
  // Enhancements: Performance metrics
  // ----------------------------------
  computePerformanceMetrics(entries: AlertTelemetryEntry[]): PerformanceMetricsSummary {
    if (!entries.length) return {};

    let startMs = Number.MAX_VALUE;
    let endMs = 0;
    let ackSum = 0;
    let ackCount = 0;
    let resolveSum = 0;
    let resolveCount = 0;

    for (const e of entries) {
      const createdMs = new Date(e.createdAt).getTime();
      if (createdMs < startMs) startMs = createdMs;
      if (createdMs > endMs) endMs = createdMs;
      if (e.acknowledgedAt) {
        ackSum += new Date(e.acknowledgedAt).getTime() - createdMs;
        ackCount++;
      }
      if (e.resolvedAt) {
        resolveSum += new Date(e.resolvedAt).getTime() - createdMs;
        resolveCount++;
      }
    }

    const hours = Math.max(1, (endMs - startMs) / 3600_000);
    const alertsPerHour = entries.length / hours;
    const ackRate = entries.length ? ackCount / entries.length : undefined;
    const avgAckLatencyMs = ackCount ? Math.round(ackSum / ackCount) : undefined;
    const resolveRate = entries.length ? resolveCount / entries.length : undefined;
    const avgResolveLatencyMs = resolveCount ? Math.round(resolveSum / resolveCount) : undefined;

    return { alertsPerHour, ackRate, resolveRate, avgAckLatencyMs, avgResolveLatencyMs };
  }

  // ----------------------------------
  // Enhancements: Export utilities
  // ----------------------------------
  exportReports(format: 'json' | 'csv' = 'json', range?: { start?: string; end?: string }): string {
    const reports = WeeklyAlertMetrics.listReports().filter(
      (r) =>
        (!range?.start || r.weekStart >= range.start) && (!range?.end || r.weekStart <= range.end),
    );
    if (format === 'json') return JSON.stringify(reports, null, 2);
    const header = [
      'weekStart',
      'weekEnd',
      'totalCreated',
      'totalAcknowledged',
      'totalResolved',
      'ppvEstimate',
      'falseAlertsPerStudentDay',
      'helpfulnessAvg',
    ];
    const rows = reports.map((r) =>
      [
        r.weekStart,
        r.weekEnd,
        r.totalCreated,
        r.totalAcknowledged,
        r.totalResolved,
        r.ppvEstimate ?? '',
        r.falseAlertsPerStudentDay ?? '',
        r.helpfulnessAvg ?? '',
      ].join(','),
    );
    return [header.join(','), ...rows].join('\n');
  }

  exportEntries(format: 'json' | 'csv' = 'json', options?: { start?: Date; end?: Date }): string {
    const start = options?.start ?? new Date(0);
    const end = options?.end ?? new Date();
    const entries = this.telemetry.getEntriesBetween(start, end);
    if (format === 'json') return JSON.stringify(entries, null, 2);
    const header = [
      'alertId',
      'studentHash',
      'createdAt',
      'acknowledgedAt',
      'resolvedAt',
      'predictedRelevance',
      'experimentKey',
      'experimentVariant',
    ];
    const rows = entries.map((e) =>
      [
        e.alertId,
        e.studentHash,
        e.createdAt,
        e.acknowledgedAt ?? '',
        e.resolvedAt ?? '',
        e.predictedRelevance ?? '',
        e.experimentKey ?? '',
        e.experimentVariant ?? '',
      ].join(','),
    );
    return [header.join(','), ...rows].join('\n');
  }

  // ----------------------------------
  // Enhancements: Retention and cleanup
  // ----------------------------------
  cleanupRetention(policy: { maxEntryAgeDays?: number; maxReports?: number }): {
    prunedEntries: number;
    prunedReports: number;
  } {
    let prunedEntries = 0;
    let prunedReports = 0;

    // Prune events by age
    if (policy.maxEntryAgeDays && policy.maxEntryAgeDays > 0) {
      const cutoff = Date.now() - policy.maxEntryAgeDays * 24 * 3600_000;
      const allEntries = this.telemetry.getEntries();
      const kept = allEntries.filter((e) => new Date(e.createdAt).getTime() >= cutoff);
      prunedEntries = allEntries.length - kept.length;
      // Write back pruned events
      // AlertTelemetryService has a private writer; re-persist via storage key contract
      writeJSON('alerts:telemetry:events', kept as unknown as AlertTelemetryEntry[]);
    }

    // Prune reports by count
    if (policy.maxReports && policy.maxReports > 0) {
      const index = readJSON<string[]>(REPORT_INDEX_KEY) ?? [];
      if (index.length > policy.maxReports) {
        const toDelete = index.slice(0, index.length - policy.maxReports);
        toDelete.forEach((wk) =>
          writeJSON(reportKey(wk), null as unknown as WeeklyEvaluationReport),
        );
        const kept = index.slice(index.length - policy.maxReports);
        writeJSON(REPORT_INDEX_KEY, kept);
        prunedReports = toDelete.length;
      }
    }

    return { prunedEntries, prunedReports };
  }

  // ----------------------------------
  // Enhancements: Health monitoring
  // ----------------------------------
  getHealthStatus(): {
    status: 'ok' | 'degraded' | 'empty';
    lastReportAt?: string;
    totals?: { entries: number; reports: number };
  } {
    const entries = this.telemetry.getEntries();
    const reports = WeeklyAlertMetrics.listReports();
    if (entries.length === 0 && reports.length === 0) return { status: 'empty' };
    const lastReportAt = reports.length ? reports[reports.length - 1].weekStart : undefined;
    const status = entries.length > 0 && reports.length > 0 ? 'ok' : 'degraded';
    return { status, lastReportAt, totals: { entries: entries.length, reports: reports.length } };
  }

  // ----------------------------------
  // Enhancements: Historical batch processing
  // ----------------------------------
  runHistoricalBatch(range: {
    start: Date;
    end: Date;
    students?: Student[];
  }): WeeklyEvaluationReport[] {
    const out: WeeklyEvaluationReport[] = [];
    const start = toWeekStart(range.start);
    const end = toWeekStart(range.end);
    for (
      let cursor = new Date(start);
      cursor <= end;
      cursor = new Date(cursor.getTime() + 7 * 24 * 3600_000)
    ) {
      out.push(this.runWeeklyEvaluation({ weekContaining: cursor, students: range.students }));
    }
    return out;
  }

  // ----------------------------------
  // Programmatic accessors (API-style)
  // ----------------------------------
  static getReport(weekStartIso: string): WeeklyEvaluationReport | null {
    return readJSON<WeeklyEvaluationReport>(reportKey(weekStartIso));
  }

  static listReportsRange(range: { start?: string; end?: string }): WeeklyEvaluationReport[] {
    return WeeklyAlertMetrics.listReports().filter(
      (r) =>
        (!range.start || r.weekStart >= range.start) && (!range.end || r.weekStart <= range.end),
    );
  }
}

export function scheduleWeeklyTask(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  let timer = 0;

  const scheduleNext = () => {
    const now = new Date();
    const next = new Date(now);
    const daysUntilSunday = (7 - next.getDay()) % 7;
    next.setDate(next.getDate() + daysUntilSunday);
    next.setHours(2, 0, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 7);
    }
    const delay = next.getTime() - now.getTime();
    timer = window.setTimeout(() => {
      try {
        callback();
      } finally {
        scheduleNext();
      }
    }, delay);
  };

  scheduleNext();
  return () => window.clearTimeout(timer);
}
