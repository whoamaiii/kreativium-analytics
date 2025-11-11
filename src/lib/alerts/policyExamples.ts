import { AlertPolicies } from '@/lib/alerts/policies';
import { PolicyConfigManager } from '@/lib/alerts/policyConfig';
import type { AlertEvent, AlertSettings } from '@/lib/alerts/types';
import { AlertKind, AlertSeverity, AlertStatus } from '@/lib/alerts/types';

export function exampleQuietHoursForDistrict(): AlertSettings {
  const manager = new PolicyConfigManager();
  const base = manager.getDefaultSettings();
  return manager.mergeSettings(base, {
    quietHours: { start: '20:00', end: '07:00', daysOfWeek: [0, 6] },
  });
}

export function exampleSeverityCapsForMiddleSchool(): AlertSettings {
  const manager = new PolicyConfigManager();
  return manager.getPreset('middle');
}

export function exampleDedupInHighActivityClassroom(alerts: AlertEvent[]): AlertEvent[] {
  const policies = new AlertPolicies();
  return policies.deduplicateAlerts(alerts, 60 * 60 * 1000).map(({ governance, ...e }) => e);
}

export function exampleSnoozePlannedIntervention(studentId: string, dedupeKey: string): void {
  const policies = new AlertPolicies();
  // Snooze for the day of intervention
  policies.snooze(studentId, dedupeKey, 24);
}

export function exampleEngineIntegration(
  alerts: AlertEvent[],
  settings: AlertSettings,
): AlertEvent[] {
  const policies = new AlertPolicies();
  const gated: AlertEvent[] = [];
  alerts.forEach((alert) => {
    const { allowed } = policies.canCreateAlert(alert, settings);
    if (allowed) gated.push(alert);
  });
  return gated;
}

export function exampleAlertFactory(
  studentId: string,
  time: Date,
  contextKey: string,
  severity: AlertSeverity,
): AlertEvent {
  return {
    id: 'ex-' + Math.random().toString(36).slice(2),
    studentId,
    kind: AlertKind.BehaviorSpike,
    severity,
    confidence: 0.7,
    status: AlertStatus.New,
    createdAt: time.toISOString(),
    metadata: { contextKey },
  };
}
