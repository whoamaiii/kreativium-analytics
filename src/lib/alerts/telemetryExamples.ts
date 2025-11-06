import { AlertTelemetryService } from '@/lib/alerts/telemetry';
import { WeeklyAlertMetrics } from '@/lib/monitoring/weeklyAlertMetrics';
import type { Student } from '@/types/student';
import type { AlertEvent } from '@/lib/alerts/types';
import { AlertKind, AlertSeverity, AlertStatus } from '@/lib/alerts/types';

// Example: Setting up telemetry for a new student cohort
export function setupTelemetryForCohort(students: Student[], alerts: AlertEvent[]): void {
  const telemetry = new AlertTelemetryService();
  alerts.forEach((alert) => {
    telemetry.logAlertCreated(alert, {
      predictedRelevance: alert.confidence,
      detectorTypes: alert.metadata?.detectorTypes,
      experimentKey: alert.metadata?.experimentKey,
      experimentVariant: alert.metadata?.experimentVariant,
      thresholdAdjustments: alert.metadata?.thresholdTrace,
      metadataSnapshot: alert.metadata,
    });
  });
  const metrics = new WeeklyAlertMetrics({ telemetry });
  metrics.runWeeklyEvaluation({ students });
}

// Example: Analyzing weekly performance
export function analyzeWeeklyPerformance(students: Student[]): { reportJson: string; csv: string } {
  const telemetry = new AlertTelemetryService();
  const metrics = new WeeklyAlertMetrics({ telemetry });
  const report = metrics.runWeeklyEvaluation({ students });
  return {
    reportJson: JSON.stringify(report, null, 2),
    csv: metrics.exportReports('csv'),
  };
}

// Example: A/B testing configuration for threshold tuning
export function simulateABTesting(): void {
  const telemetry = new AlertTelemetryService();
  const now = new Date().toISOString();
  const build = (id: string, variant: 'A' | 'B', confidence: number, relevant?: boolean): AlertEvent => ({
    id,
    studentId: 's-1',
    kind: AlertKind.BehaviorSpike,
    severity: AlertSeverity.Moderate,
    confidence,
    createdAt: now,
    status: AlertStatus.New,
    metadata: { experimentKey: 'exp-threshold', experimentVariant: variant, detectorTypes: ['ewma'] },
  });
  const a1 = build('a1', 'A', 0.6, true);
  const b1 = build('b1', 'B', 0.7, false);
  telemetry.logAlertCreated(a1, { predictedRelevance: a1.confidence, detectorTypes: ['ewma'], experimentKey: 'exp-threshold', experimentVariant: 'A' });
  telemetry.logAlertCreated(b1, { predictedRelevance: b1.confidence, detectorTypes: ['ewma'], experimentKey: 'exp-threshold', experimentVariant: 'B' });
  telemetry.logFeedback(a1.id, { relevant: true, rating: 5 });
  telemetry.logFeedback(b1.id, { relevant: false, rating: 2 });
}

// Example: Monitoring fairness across demographic groups
export function fairnessDashboard(students: Student[]) {
  const metrics = new WeeklyAlertMetrics();
  const report = metrics.runWeeklyEvaluation({ students });
  return report.fairness ?? [];
}

// Example: Privacy-preserving data collection
export function collectWithPrivacy(alert: AlertEvent) {
  const telemetry = new AlertTelemetryService();
  telemetry.logAlertCreated(alert, { predictedRelevance: alert.confidence });
}

// Example: Export data for external analysis
export function exportForAnalysis() {
  const metrics = new WeeklyAlertMetrics();
  return {
    entriesCsv: metrics.exportEntries('csv'),
    reportsJson: metrics.exportReports('json'),
  };
}

// Example: Performance optimization for high volume
export function highVolumeIngest(alerts: AlertEvent[], students: Student[]) {
  const telemetry = new AlertTelemetryService();
  for (let i = 0; i < alerts.length; i += 1) {
    const a = alerts[i];
    telemetry.logAlertCreated(a, { predictedRelevance: a.confidence, detectorTypes: a.metadata?.detectorTypes });
    if (i % 10 === 0) {
      // periodic batch evaluation rather than per-alert heavy operations
      new WeeklyAlertMetrics({ telemetry }).runWeeklyEvaluation({ students });
    }
  }
}


