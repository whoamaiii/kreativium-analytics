import { describe, expect, it } from 'vitest';

import {
  AlertKind,
  AlertSeverity,
  AlertStatus,
  SourceType,
  isValidAlertEvent,
  isValidDetectorResult,
  isValidSourceRef,
} from '@/lib/alerts/types';
import type { AlertEvent, DetectorResult, SourceRef } from '@/lib/alerts/types';

describe('alert domain types', () => {
  it('exposes expected AlertKind values', () => {
    expect(AlertKind.Safety).toBe('safety');
    expect(AlertKind.BehaviorSpike).toBe('behavior_spike');
    expect(AlertKind.ContextAssociation).toBe('context_association');
    expect(AlertKind.InterventionDue).toBe('intervention_due');
    expect(AlertKind.DataQuality).toBe('data_quality');
    expect(AlertKind.ImprovementNoted).toBe('improvement_noted');
    expect(AlertKind.PatternDetected).toBe('pattern_detected');
  });

  it('maps severity and status enums to canonical strings', () => {
    expect(AlertSeverity.Critical).toBe('critical');
    expect(AlertSeverity.Important).toBe('important');
    expect(AlertSeverity.Moderate).toBe('moderate');
    expect(AlertSeverity.Low).toBe('low');

    expect(AlertStatus.New).toBe('new');
    expect(AlertStatus.Acknowledged).toBe('acknowledged');
    expect(AlertStatus.InProgress).toBe('in_progress');
    expect(AlertStatus.Resolved).toBe('resolved');
    expect(AlertStatus.Snoozed).toBe('snoozed');
    expect(AlertStatus.Dismissed).toBe('dismissed');
  });

  it('validates well-formed alert events', () => {
    const event: AlertEvent = {
      id: 'alert-1',
      studentId: 'student-1',
      kind: AlertKind.BehaviorSpike,
      severity: AlertSeverity.Moderate,
      status: AlertStatus.New,
      confidence: 0.72,
      createdAt: new Date().toISOString(),
      dedupeKey: 'student-1:concern:alert-1',
      sources: [
        {
          type: SourceType.PatternEngine,
          label: 'Pattern Engine',
          name: 'Pattern Engine',
          confidence: 0.72,
          parameters: { detector: 'ewma' },
        },
      ],
      metadata: {
        dedupeKey: 'student-1:concern:alert-1',
        contextKey: 'concern',
        sparkValues: [3],
        thresholdOverrides: {},
      },
      actions: [
        {
          id: 'open-details',
          label: 'View details',
          kind: 'open_details',
        },
      ],
    };

    expect(isValidAlertEvent(event)).toBe(true);
  });

  it('rejects malformed alert events', () => {
    const invalidEvent = {
      id: 'bad-alert',
      studentId: 'student-2',
      kind: 'unknown',
      severity: 'urgent',
      confidence: 2,
      status: 'new',
      createdAt: 'not-a-date',
    } as unknown;

    expect(isValidAlertEvent(invalidEvent)).toBe(false);
  });

  it('rejects alert events with non-parseable createdAt even if string', () => {
    const event: AlertEvent = {
      id: 'alert-bad-date',
      studentId: 'student-5',
      kind: AlertKind.PatternDetected,
      severity: AlertSeverity.Low,
      status: AlertStatus.New,
      confidence: 0.5,
      createdAt: 'definitely-not-a-date',
    } as unknown as AlertEvent;

    expect(isValidAlertEvent(event)).toBe(false);
  });

  it('validates detector results with optional sources', () => {
    const detector: DetectorResult = {
      score: 0.51,
      confidence: 0.6,
      sources: [
        {
          type: SourceType.Sensor,
          name: 'Heart rate monitor',
          confidence: 0.6,
          evidence: 'Average heart rate 120 bpm',
        },
      ],
    };

    expect(isValidDetectorResult(detector)).toBe(true);
  });

  it('flags detector results that exceed confidence bounds', () => {
    const invalidDetector = {
      score: 1.2,
      confidence: -0.1,
    } as unknown;

    expect(isValidDetectorResult(invalidDetector)).toBe(false);
  });

  it('allows nuanced source references while enforcing bounds', () => {
    const source: SourceRef = {
      type: SourceType.TeacherAction,
      name: 'Manual entry',
      confidence: 0.86,
      evidence: 'Teacher noted repeated refusals to participate',
      parameters: { sessionCount: 4 },
    };

    expect(isValidSourceRef(source)).toBe(true);
  });

  it('rejects source references with invalid confidence', () => {
    const invalidSource = {
      type: SourceType.Sensor,
      confidence: 1.5,
    } as unknown;

    expect(isValidSourceRef(invalidSource)).toBe(false);
  });
});
