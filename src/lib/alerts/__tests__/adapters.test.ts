import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AlertHistoryEntry as LegacyAlertHistoryEntry } from '@/lib/alertSystem';
import type { TriggerAlert } from '@/lib/patternAnalysis';

const storage = vi.hoisted(() => new Map<string, string>());
const getAllAlertsMock = vi.hoisted(() => vi.fn<[], LegacyAlertHistoryEntry[]>());

vi.mock('@/lib/storage', () => ({
  safeGet: (key: string) => storage.get(key) ?? null,
  safeSet: (key: string, value: string) => {
    storage.set(key, value);
  },
}));

vi.mock('@/lib/alertSystem', () => ({
  alertSystem: {
    getAllAlerts: getAllAlertsMock,
  },
}));

import {
  alertEventToAlertHistory,
  alertEventToTriggerAlert,
  alertHistoryToAlertEvent,
  backupLegacyAlerts,
  migrateExistingAlerts,
  triggerAlertToAlertEvent,
  validateAlertEvent,
  validateDetectorResult,
  validateSourceRef,
} from '@/lib/alerts/adapters';
import { AlertKind, AlertSeverity, AlertStatus, SourceType } from '@/lib/alerts/types';
import type { AlertEvent, DetectorResult, SourceRef } from '@/lib/alerts/types';

describe('alert adapters', () => {
  const legacyTrigger = (overrides: Partial<TriggerAlert> = {}): TriggerAlert => ({
    id: overrides.id ?? 'trigger-1',
    type: overrides.type ?? 'concern',
    severity: overrides.severity ?? 'high',
    title: overrides.title ?? 'High intensity pattern detected',
    description: overrides.description ?? 'Student exhibits intense responses',
    recommendations: overrides.recommendations ?? ['Check-in with student'],
    timestamp: overrides.timestamp ?? new Date('2024-01-01T00:00:00.000Z'),
    studentId: overrides.studentId ?? 'student-1',
    dataPoints: overrides.dataPoints ?? 5,
  });

  const legacyEntry = (
    overrides: Partial<LegacyAlertHistoryEntry> = {},
  ): LegacyAlertHistoryEntry => ({
    alert: overrides.alert ?? legacyTrigger(overrides.alert as Partial<TriggerAlert>),
    viewed: overrides.viewed ?? true,
    resolved: overrides.resolved ?? false,
    resolvedAt: overrides.resolvedAt,
    resolvedBy: overrides.resolvedBy,
    resolvedNotes: overrides.resolvedNotes,
  });

  beforeEach(() => {
    storage.clear();
    getAllAlertsMock.mockReset();
  });

  it('converts legacy trigger alerts into alert events with provenance', () => {
    const trigger = legacyTrigger({ type: 'concern', severity: 'high' });
    const event = triggerAlertToAlertEvent(trigger);

    expect(event.kind).toBe(AlertKind.BehaviorSpike);
    expect(event.severity).toBe(AlertSeverity.Critical);
    expect(event.status).toBe(AlertStatus.New);
    expect(event.sources?.[0]?.type).toBe(SourceType.PatternEngine);
    expect(event.metadata?.dedupeKey).toContain(trigger.studentId);
    expect(event.metadata?.dedupeKey).toBe(event.dedupeKey);
  });

  it('maps alert history entries to alert events with legacy context', () => {
    const history = legacyEntry({
      resolved: true,
      resolvedAt: new Date('2024-01-02T00:00:00.000Z'),
    });
    const event = alertHistoryToAlertEvent(history);

    expect(event.status).toBe(AlertStatus.Resolved);
    expect(event.metadata?.resolvedAt).toBe('2024-01-02T00:00:00.000Z');
    expect(event.legacy).toEqual(history);
    expect(event.resolvedAt).toBe('2024-01-02T00:00:00.000Z');
  });

  it('produces legacy trigger alerts from modern events', () => {
    const event: AlertEvent = {
      id: 'alert-7',
      studentId: 'student-2',
      kind: AlertKind.ImprovementNoted,
      severity: AlertSeverity.Low,
      status: AlertStatus.Acknowledged,
      confidence: 0.66,
      createdAt: '2024-03-04T10:00:00.000Z',
      metadata: {
        label: 'Improvement observed',
        summary: 'Student shows improved participation',
        sparkValues: [2, 3, 4],
      },
    };

    const trigger = alertEventToTriggerAlert(event);
    expect(trigger.type).toBe('improvement');
    expect(trigger.severity).toBe('low');
    expect(trigger.timestamp).toBeInstanceOf(Date);
    expect(trigger.dataPoints).toBe(3);
  });

  it('preserves domain severity through legacy round-trip using originalSeverity marker', () => {
    const event: AlertEvent = {
      id: 'alert-9',
      studentId: 'student-4',
      kind: AlertKind.BehaviorSpike,
      severity: AlertSeverity.Important,
      status: AlertStatus.New,
      confidence: 0.8,
      createdAt: '2024-03-06T12:00:00.000Z',
      metadata: {
        label: 'Behavior spike',
        summary: 'Sudden spike noted',
        sparkValues: [1, 2, 3, 4],
      },
    };

    const legacyTriggerAlert = alertEventToTriggerAlert(event);
    expect(legacyTriggerAlert.severity).toBe('medium');

    const roundTripped = triggerAlertToAlertEvent(legacyTriggerAlert);
    expect(roundTripped.severity).toBe(AlertSeverity.Important);
  });

  it('derives legacy alert history entries from modern events', () => {
    const event: AlertEvent = {
      id: 'alert-8',
      studentId: 'student-3',
      kind: AlertKind.ContextAssociation,
      severity: AlertSeverity.Important,
      status: AlertStatus.InProgress,
      confidence: 0.58,
      createdAt: '2024-03-05T14:30:00.000Z',
      metadata: {
        summary: 'Association with noisy environments',
      },
    };

    const history = alertEventToAlertHistory(event);
    expect(history.viewed).toBe(true);
    expect(history.resolved).toBe(false);
    expect(history.alert.type).toBe('pattern');
  });

  it('validates structures and throws for malformed inputs', () => {
    const event: AlertEvent = triggerAlertToAlertEvent(legacyTrigger());
    expect(validateAlertEvent(event)).toEqual(event);

    const detector: DetectorResult = { score: 0.4, confidence: 0.8 };
    expect(validateDetectorResult(detector)).toEqual(detector);

    const source: SourceRef = {
      type: SourceType.Manual,
      confidence: 0.9,
      name: 'Manual review',
    };
    expect(validateSourceRef(source)).toEqual(source);

    expect(() => validateAlertEvent({})).toThrow();
    expect(() => validateDetectorResult({ score: 1.5, confidence: 2 })).toThrow();
    expect(() => validateSourceRef({ type: SourceType.Sensor, confidence: 3 })).toThrow();
  });

  it('backs up and migrates legacy alerts safely', () => {
    storage.set('sensoryTracker_alerts', JSON.stringify([legacyEntry()]));
    const backup = backupLegacyAlerts();
    expect(backup).toContain('trigger-1');
    expect(storage.get('sensoryTracker_alerts_backup')).toContain('trigger-1');

    const legacyForMigration = [legacyEntry({ alert: legacyTrigger({ id: 'trigger-2' }) })];
    getAllAlertsMock.mockReturnValueOnce(legacyForMigration);
    const migrated = migrateExistingAlerts();
    expect(migrated).toHaveLength(1);
    expect(storage.get('sensoryTracker_alerts_v2')).toContain('trigger-2');
  });
});
