import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();

vi.mock('@/lib/storage', () => ({
  safeGet: (key: string) => store.get(key) ?? null,
  safeSet: (key: string, value: string) => { store.set(key, value); },
}));

import { AlertTelemetryService } from '@/lib/alerts/telemetry';
import { WeeklyAlertMetrics } from '@/lib/monitoring/weeklyAlertMetrics';
import type { AlertTelemetryEntry, AlertEvent } from '@/lib/alerts/types';
import { AlertKind, AlertSeverity, AlertStatus } from '@/lib/alerts/types';
import type { Student } from '@/types/student';

describe('AlertTelemetryService', () => {
  beforeEach(() => {
    store.clear();
  });

  const service = new AlertTelemetryService();

  const baseEntry = (overrides: Partial<AlertTelemetryEntry>): AlertTelemetryEntry => ({
    alertId: overrides.alertId ?? 'a-' + Math.random().toString(36).slice(2),
    studentHash: overrides.studentHash ?? 's1',
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    ...overrides,
  });

  it('computes brier score per-sample for small labelled sets', () => {
    const entries: AlertTelemetryEntry[] = [
      baseEntry({ predictedRelevance: 0.8, feedback: { relevant: true } }),
      baseEntry({ predictedRelevance: 0.2, feedback: { relevant: false } }),
    ];
    const metrics = service.computeCalibrationMetrics(entries);
    expect(metrics.sampleSize).toBe(2);
    expect(metrics.brierScore).toBeCloseTo(0.04, 5);
  });

  it('handles larger sample sets with mixed outcomes', () => {
    const entries: AlertTelemetryEntry[] = [
      baseEntry({ predictedRelevance: 0.9, feedback: { relevant: true } }),
      baseEntry({ predictedRelevance: 0.7, feedback: { relevant: true } }),
      baseEntry({ predictedRelevance: 0.3, feedback: { relevant: false } }),
      baseEntry({ predictedRelevance: 0.4, feedback: { relevant: true } }),
    ];
    const metrics = service.computeCalibrationMetrics(entries);
    // Manual per-sample calculation
    // (0.9-1)^2 + (0.7-1)^2 + (0.3-0)^2 + (0.4-1)^2 = 0.01 + 0.09 + 0.09 + 0.36 = 0.55 => /4 = 0.1375
    expect(metrics.brierScore).toBeCloseTo(0.1375, 5);
    expect(metrics.reliability).toHaveLength(10);
    expect(metrics.sampleSize).toBe(4);
  });

  it('persists telemetry extras when logging alert creation', () => {
    const alert: AlertEvent = {
      id: 'alert-1',
      studentId: 'student-1',
      kind: AlertKind.BehaviorSpike,
      severity: AlertSeverity.Moderate,
      confidence: 0.76,
      createdAt: new Date().toISOString(),
      status: AlertStatus.New,
      metadata: {
        detectorTypes: ['ewma'],
        experimentKey: 'exp-threshold',
        experimentVariant: 'B',
        thresholdTrace: {
          ewma: {
            adjustment: 0.05,
            appliedThreshold: 0.63,
            baselineThreshold: 0.6,
          },
        },
      },
    };

    service.logAlertCreated(alert, {
      predictedRelevance: alert.confidence,
      detectorTypes: ['ewma'],
      experimentKey: 'exp-threshold',
      experimentVariant: 'B',
      thresholdAdjustments: {
        ewma: {
          adjustment: 0.05,
          appliedThreshold: 0.63,
          baselineThreshold: 0.6,
        },
      },
      metadataSnapshot: alert.metadata,
    });

    const entries = service.getEntries();
    expect(entries).toHaveLength(1);
    const [entry] = entries;
    expect(entry.predictedRelevance).toBeCloseTo(0.76);
    expect(entry.detectorTypes).toEqual(['ewma']);
    expect(entry.experimentKey).toBe('exp-threshold');
    expect(entry.experimentVariant).toBe('B');
    expect(entry.thresholdAdjustments?.ewma?.appliedThreshold).toBeCloseTo(0.63);
  });

  it('tracks lifecycle: acknowledge and resolve with notes/action', () => {
    const createdAt = new Date().toISOString();
    const alert: AlertEvent = {
      id: 'lifecycle-1',
      studentId: 's-l1',
      kind: AlertKind.Safety,
      severity: AlertSeverity.Important,
      confidence: 0.55,
      createdAt,
      status: AlertStatus.New,
    };
    service.logAlertCreated(alert);
    service.logAlertAcknowledged(alert.id);
    service.logAlertResolved(alert.id, { notes: 'Checked in', actionId: 'followup' });
    const [entry] = service.getEntries();
    expect(entry.acknowledgedAt).toBeTruthy();
    expect(entry.resolvedAt).toBeTruthy();
    expect(entry.resolutionNotes).toBe('Checked in');
    expect(entry.resolutionActionId).toBe('followup');
  });

  it('captures teacher feedback and ensures privacy via hashed student ids', () => {
    const alert: AlertEvent = {
      id: 'fb-1',
      studentId: 'student-privacy',
      kind: AlertKind.BehaviorSpike,
      severity: AlertSeverity.Moderate,
      confidence: 0.42,
      createdAt: new Date().toISOString(),
      status: AlertStatus.New,
    };
    service.logAlertCreated(alert);
    service.logFeedback(alert.id, { relevant: true, rating: 4, comment: 'Accurate' });
    const [entry] = service.getEntries();
    expect(entry.feedback?.relevant).toBe(true);
    expect(entry.feedback?.rating).toBe(4);
    expect(entry.studentHash).not.toBe(alert.studentId);
  });

  it('computes weekly PPV and false alert estimates', () => {
    const now = new Date('2024-01-04T00:00:00.000Z');
    const telemetry = new AlertTelemetryService();
    const mk = (id: string, relevant?: boolean) => {
      const alert: AlertEvent = {
        id,
        studentId: 's-x',
        kind: AlertKind.PatternDetected,
        severity: AlertSeverity.Low,
        confidence: 0.5,
        createdAt: now.toISOString(),
        status: AlertStatus.New,
      };
      telemetry.logAlertCreated(alert, { predictedRelevance: 0.5 });
      if (relevant !== undefined) telemetry.logFeedback(alert.id, { relevant });
    };
    // 3 labelled: 2 positive, 1 negative; 1 unlabelled
    mk('p1', true);
    mk('p2', true);
    mk('n1', false);
    mk('u1');
    const report = telemetry.generateWeeklyReport(now);
    expect(report.totalCreated).toBe(4);
    expect(report.ppvEstimate).toBeCloseTo(2 / 3, 5);
    expect(report.falsePositiveRate).toBeCloseTo(1 / 3, 5);
  });

  it('analyzes experiments and reports winning variant with significance', () => {
    const telemetry = new AlertTelemetryService();
    const base = new Date('2024-01-11T00:00:00.000Z');
    const create = (id: string, variant: 'A' | 'B', relevant: boolean) => {
      const a: AlertEvent = {
        id,
        studentId: 's-exp',
        kind: AlertKind.ContextAssociation,
        severity: AlertSeverity.Moderate,
        confidence: variant === 'A' ? 0.6 : 0.7,
        createdAt: base.toISOString(),
        status: AlertStatus.New,
        metadata: { experimentKey: 'exp-ppv', experimentVariant: variant, detectorTypes: ['ewma'] },
      };
      telemetry.logAlertCreated(a, { predictedRelevance: a.confidence, detectorTypes: ['ewma'], experimentKey: 'exp-ppv', experimentVariant: variant });
      telemetry.logFeedback(a.id, { relevant });
    };
    for (let i = 0; i < 10; i += 1) create('A' + i, 'A', true);
    for (let i = 0; i < 10; i += 1) create('B' + i, 'B', i < 2); // 2/10 positives
    const report = telemetry.generateWeeklyReport(base);
    const exp = (report.experiments ?? []).find((e) => e.key === 'exp-ppv');
    expect(exp?.winningVariant).toBe('A');
    expect(typeof exp?.significance).toBe('number');
    expect((exp?.significance ?? 0)).toBeGreaterThan(0.8);
  });

  it('computes calibration reliability bins', () => {
    const telemetry = new AlertTelemetryService();
    const t = new Date('2024-01-18T00:00:00.000Z');
    const mk = (p: number, relevant: boolean) => {
      const a: AlertEvent = {
        id: 'c-' + Math.random().toString(36).slice(2),
        studentId: 's-cal',
        kind: AlertKind.DataQuality,
        severity: AlertSeverity.Low,
        confidence: p,
        createdAt: t.toISOString(),
        status: AlertStatus.New,
      };
      telemetry.logAlertCreated(a, { predictedRelevance: p });
      telemetry.logFeedback(a.id, { relevant });
    };
    mk(0.05, false);
    mk(0.25, false);
    mk(0.55, true);
    mk(0.85, true);
    const entries = telemetry.getEntriesBetween(new Date('2024-01-15'), new Date('2024-01-21'));
    const metrics = telemetry.computeCalibrationMetrics(entries);
    expect(metrics.reliability).toHaveLength(10);
    const nonEmpty = metrics.reliability.filter((b) => b.count > 0);
    expect(nonEmpty.length).toBeGreaterThan(0);
  });

  it('produces fairness metrics across demographic groups', () => {
    const telemetry = new AlertTelemetryService();
    const week = new Date('2024-02-01T00:00:00.000Z');
    const mk = (id: string, studentId: string, relevant: boolean) => {
      const alert: AlertEvent = {
        id,
        studentId,
        kind: AlertKind.PatternDetected,
        severity: AlertSeverity.Low,
        confidence: 0.6,
        createdAt: week.toISOString(),
        status: AlertStatus.New,
      };
      telemetry.logAlertCreated(alert, { predictedRelevance: 0.6 });
      telemetry.logFeedback(id, { relevant });
    };
    // Two grades
    mk('g9-p', 's-g9-1', true);
    mk('g9-n', 's-g9-2', false);
    mk('g10-p', 's-g10-1', true);
    const students: Student[] = [
      { id: 's-g9-1', name: 'A', grade: '9', createdAt: new Date() },
      { id: 's-g9-2', name: 'B', grade: '9', createdAt: new Date() },
      { id: 's-g10-1', name: 'C', grade: '10', createdAt: new Date() },
    ];
    const metrics = new WeeklyAlertMetrics({ telemetry });
    const report = metrics.runWeeklyEvaluation({ weekContaining: week, students });
    const fairness = report.fairness ?? [];
    expect(fairness.find((f) => f.groupKey === 'grade:9')?.count).toBeGreaterThan(0);
    expect(fairness.find((f) => f.groupKey === 'grade:10')?.count).toBeGreaterThan(0);
  });

  it('learns thresholds when sufficient feedback is provided', () => {
    const telemetry = new AlertTelemetryService();
    const week = new Date('2024-03-01T00:00:00.000Z');
    for (let i = 0; i < 12; i += 1) {
      const alert: AlertEvent = {
        id: 't' + i,
        studentId: 's-learn',
        kind: AlertKind.PatternDetected,
        severity: AlertSeverity.Moderate,
        confidence: 0.6,
        createdAt: week.toISOString(),
        status: AlertStatus.New,
        metadata: {
          detectorTypes: ['ewma'],
          thresholdTrace: { ewma: { adjustment: 0, appliedThreshold: 0.6, baselineThreshold: 0.55 } },
        },
      };
      telemetry.logAlertCreated(alert, { predictedRelevance: 0.6, detectorTypes: ['ewma'], thresholdAdjustments: { ewma: { adjustment: 0, appliedThreshold: 0.6, baselineThreshold: 0.55 } } });
      telemetry.logFeedback(alert.id, { relevant: i % 3 !== 0 });
    }
    const metrics = new WeeklyAlertMetrics({ telemetry });
    const report = metrics.runWeeklyEvaluation({ weekContaining: week });
    expect((report.thresholdLearning?.overrides ?? []).length).toBeGreaterThan(0);
  });

  it('generates weekly reports and persists them to storage', () => {
    const telemetry = new AlertTelemetryService();
    const week = new Date('2024-04-01T00:00:00.000Z');
    for (let i = 0; i < 5; i += 1) {
      const alert: AlertEvent = {
        id: 'w' + i,
        studentId: 's-week',
        kind: AlertKind.Safety,
        severity: AlertSeverity.Critical,
        confidence: 0.9,
        createdAt: week.toISOString(),
        status: AlertStatus.New,
      };
      telemetry.logAlertCreated(alert, { predictedRelevance: 0.9 });
    }
    const metrics = new WeeklyAlertMetrics({ telemetry });
    const report = metrics.runWeeklyEvaluation({ weekContaining: week });
    const listed = WeeklyAlertMetrics.listReports();
    expect(listed.some((r) => r.weekStart === report.weekStart)).toBe(true);
  });

  it('does not persist telemetry report copies; only canonical weeklyReports are stored', () => {
    const telemetry = new AlertTelemetryService();
    const week = new Date('2024-08-01T00:00:00.000Z');
    for (let i = 0; i < 3; i += 1) {
      const alert: AlertEvent = {
        id: 'nt' + i,
        studentId: 's-no-copy',
        kind: AlertKind.PatternDetected,
        severity: AlertSeverity.Low,
        confidence: 0.5,
        createdAt: week.toISOString(),
        status: AlertStatus.New,
      };
      telemetry.logAlertCreated(alert, { predictedRelevance: 0.5 });
    }
    // Generate via telemetry directly
    telemetry.generateWeeklyReport(week);
    const keysAfterTelemetry = Array.from(store.keys());
    expect(keysAfterTelemetry.some((k) => k.startsWith('alerts:telemetry:report:'))).toBe(false);

    // Run monitoring which persists canonical reports
    const metrics = new WeeklyAlertMetrics({ telemetry });
    metrics.runWeeklyEvaluation({ weekContaining: week });
    const keysAfterMetrics = Array.from(store.keys());
    expect(keysAfterMetrics.some((k) => k.startsWith('alerts:weeklyReports:'))).toBe(true);
  });

  it('records governance audit decisions and supports filtering', () => {
    const metrics = new WeeklyAlertMetrics();
    metrics.logGovernanceDecision({ policy: 'quiet_hours', decision: 'suppressed', alertId: 'qa-1' });
    metrics.logGovernanceDecision({ policy: 'daily_caps', decision: 'blocked', alertId: 'dc-1' });
    const all = metrics.listGovernanceDecisions();
    const quiet = metrics.listGovernanceDecisions({ policy: 'quiet_hours' });
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(quiet.every((r) => r.policy === 'quiet_hours')).toBe(true);
  });

  it('exports reports and entries for external analysis', () => {
    const telemetry = new AlertTelemetryService();
    const metrics = new WeeklyAlertMetrics({ telemetry });
    metrics.runWeeklyEvaluation({ weekContaining: new Date('2024-05-01T00:00:00.000Z') });
    const csv = metrics.exportReports('csv');
    const json = metrics.exportEntries('json');
    expect(csv.split('\n')[0]).toContain('weekStart');
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('computes performance metrics for high-volume telemetry', () => {
    const telemetry = new AlertTelemetryService();
    const start = new Date('2024-06-01T00:00:00.000Z');
    for (let i = 0; i < 100; i += 1) {
      const alert: AlertEvent = {
        id: 'hv' + i,
        studentId: 's-hv',
        kind: AlertKind.PatternDetected,
        severity: AlertSeverity.Low,
        confidence: 0.4,
        createdAt: new Date(start.getTime() + i * 30000).toISOString(), // every 30s
        status: AlertStatus.New,
      };
      telemetry.logAlertCreated(alert, { predictedRelevance: 0.4 });
      if (i % 2 === 0) telemetry.logAlertAcknowledged(alert.id);
      if (i % 3 === 0) telemetry.logAlertResolved(alert.id);
    }
    const metrics = new WeeklyAlertMetrics({ telemetry });
    const report = metrics.runWeeklyEvaluation({ weekContaining: start });
    const perf = (report as any).performance;
    expect(perf.alertsPerHour).toBeGreaterThan(50);
  });

  it('tracks snooze events with until and reason', () => {
    const telemetry = new AlertTelemetryService();
    const a: AlertEvent = {
      id: 'sn-1',
      studentId: 's-sn',
      kind: AlertKind.BehaviorSpike,
      severity: AlertSeverity.Low,
      confidence: 0.3,
      createdAt: new Date('2024-07-01T00:00:00.000Z').toISOString(),
      status: AlertStatus.New,
    };
    telemetry.logAlertCreated(a);
    const until = new Date('2024-07-02T00:00:00.000Z').toISOString();
    telemetry.logAlertSnoozed(a.id, { until, reason: 'Testing window' });
    const [entry] = telemetry.getEntries();
    expect(entry.snoozedAt).toBeTruthy();
    expect(entry.snoozeUntil).toBe(until);
    expect(entry.snoozeReason).toBe('Testing window');
  });

  it('retention cleanup prunes old entries and limits report count', () => {
    const telemetry = new AlertTelemetryService();
    const metrics = new WeeklyAlertMetrics({ telemetry });
    // Old event (> 30 days)
    const old = new Date(Date.now() - 40 * 24 * 3600_000).toISOString();
    telemetry.logAlertCreated({
      id: 'old', studentId: 's-old', kind: AlertKind.DataQuality, severity: AlertSeverity.Low, confidence: 0.1, createdAt: old, status: AlertStatus.New,
    });
    // New event
    telemetry.logAlertCreated({
      id: 'new', studentId: 's-new', kind: AlertKind.DataQuality, severity: AlertSeverity.Low, confidence: 0.1, createdAt: new Date().toISOString(), status: AlertStatus.New,
    });
    metrics.runWeeklyEvaluation();
    metrics.runWeeklyEvaluation({ weekContaining: new Date(Date.now() - 7 * 24 * 3600_000) });
    const before = WeeklyAlertMetrics.listReports().length;
    const result = metrics.cleanupRetention({ maxEntryAgeDays: 30, maxReports: 1 });
    expect(result.prunedEntries).toBeGreaterThanOrEqual(1);
    const after = WeeklyAlertMetrics.listReports().length;
    expect(after).toBeLessThanOrEqual(1);
    expect(before).toBeGreaterThanOrEqual(after);
  });
});
