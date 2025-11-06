import type { AlertHistoryEntry as LegacyAlertHistoryEntry } from '../alertSystem';
import { alertSystem } from '../alertSystem';
import { safeGet, safeSet } from '@/lib/storage';
import {
  AlertEvent,
  AlertHistoryEntry,
  AlertKind,
  AlertSeverity,
  AlertStatus,
  LegacyTriggerAlert,
  SourceRef,
  SourceType,
  isValidAlertEvent,
  isValidDetectorResult,
  isValidSourceRef,
} from './types';
import type { DetectorResult } from './types';

const LEGACY_STORAGE_KEY = 'sensoryTracker_alerts';
const MIGRATED_STORAGE_KEY = 'sensoryTracker_alerts_v2';
const LEGACY_BACKUP_STORAGE_KEY = `${LEGACY_STORAGE_KEY}_backup`;

const legacyTypeToKindMap: Record<LegacyTriggerAlert['type'], AlertKind> = {
  concern: AlertKind.BehaviorSpike,
  improvement: AlertKind.ImprovementNoted,
  pattern: AlertKind.PatternDetected,
};

const severityToDomain: Record<LegacyTriggerAlert['severity'], AlertSeverity> = {
  high: AlertSeverity.Critical,
  medium: AlertSeverity.Important,
  low: AlertSeverity.Low,
};

function mapKindToLegacyType(kind: AlertKind): LegacyTriggerAlert['type'] {
  switch (kind) {
    case AlertKind.ImprovementNoted:
      return 'improvement';
    case AlertKind.PatternDetected:
    case AlertKind.ContextAssociation:
    case AlertKind.DataQuality:
      return 'pattern';
    default:
      return 'concern';
  }
}

function mapSeverityToLegacy(severity: AlertSeverity): LegacyTriggerAlert['severity'] {
  switch (severity) {
    case AlertSeverity.Critical:
      return 'high';
    case AlertSeverity.Moderate:
      return 'medium';
    case AlertSeverity.Important:
      return 'medium';
    default:
      return 'low';
  }
}

function computeDedupeKey(trigger: LegacyTriggerAlert): string {
  return `${trigger.studentId}:${trigger.type}:${trigger.title}`;
}

function extractOriginalSeverityFromDescription(description?: string): AlertSeverity | undefined {
  if (!description || typeof description !== 'string') return undefined;
  const match = description.match(/(?:^|\s\|\s)originalSeverity:\s*(critical|important|moderate|low)\b/i);
  if (!match) return undefined;
  const value = match[1].toLowerCase();
  switch (value) {
    case AlertSeverity.Critical:
      return AlertSeverity.Critical;
    case AlertSeverity.Important:
      return AlertSeverity.Important;
    case AlertSeverity.Moderate:
      return AlertSeverity.Moderate;
    case AlertSeverity.Low:
      return AlertSeverity.Low;
    default:
      return undefined;
  }
}

function deriveConfidence(severity: LegacyTriggerAlert['severity']): number {
  switch (severity) {
    case 'high':
      return 0.9;
    case 'medium':
      return 0.7;
    default:
      return 0.5;
  }
}

function buildSource(trigger: LegacyTriggerAlert): SourceRef {
  return {
    type: SourceType.PatternEngine,
    label: trigger.title,
    name: trigger.title,
    confidence: deriveConfidence(trigger.severity),
    parameters: {
      type: trigger.type,
      dataPoints: trigger.dataPoints,
    },
    evidence: trigger.description,
  };
}

function composeMetadata(trigger: LegacyTriggerAlert): AlertEvent['metadata'] {
  const dedupeKey = computeDedupeKey(trigger);
  return {
    label: trigger.title,
    summary: trigger.description,
    dedupeKey,
    contextKey: trigger.type,
    sparkValues: [trigger.dataPoints],
    experimentVariant: undefined,
    thresholdOverrides: {},
  };
}

export function triggerAlertToAlertEvent(trigger: LegacyTriggerAlert): AlertEvent {
  const kind = legacyTypeToKindMap[trigger.type] ?? AlertKind.BehaviorSpike;
  const severity = extractOriginalSeverityFromDescription(trigger.description) ?? (severityToDomain[trigger.severity] ?? AlertSeverity.Moderate);
  const confidence = deriveConfidence(trigger.severity);

  return {
    id: trigger.id,
    studentId: trigger.studentId,
    kind,
    severity,
    status: AlertStatus.New,
    confidence,
    createdAt: trigger.timestamp.toISOString(),
    dedupeKey: computeDedupeKey(trigger),
    sources: [buildSource(trigger)],
    actions: undefined,
    metadata: composeMetadata(trigger),
  };
}

export function alertHistoryToAlertEvent(entry: LegacyAlertHistoryEntry): AlertHistoryEntry {
  const base = triggerAlertToAlertEvent(entry.alert);
  const status = entry.resolved
    ? AlertStatus.Resolved
    : entry.viewed
      ? AlertStatus.Acknowledged
      : AlertStatus.New;

  return {
    ...base,
    status,
    metadata: {
      ...base.metadata,
      resolvedAt: entry.resolvedAt ? entry.resolvedAt.toISOString() : undefined,
      resolvedBy: entry.resolvedBy,
      resolutionNotes: entry.resolvedNotes,
    },
    legacy: entry,
    viewedAt: entry.viewed ? entry.alert.timestamp.toISOString() : undefined,
    resolvedAt: entry.resolvedAt ? entry.resolvedAt.toISOString() : undefined,
    resolutionNotes: entry.resolvedNotes,
  };
}

export function alertEventToTriggerAlert(event: AlertEvent): LegacyTriggerAlert {
  const type = mapKindToLegacyType(event.kind);
  const severity = mapSeverityToLegacy(event.severity);
  const recommendations = Array.isArray(event.metadata?.recommendations)
    ? (event.metadata?.recommendations as string[])
    : event.actions?.map((action) => action.label) ?? [];

  const baseTitle = event.metadata?.label ?? event.metadata?.summary ?? event.kind;
  const baseDescription = event.metadata?.summary ?? event.metadata?.label ?? event.kind;
  const hasOriginal = /(?:^|\s\|\s)originalSeverity:\s*(critical|important|moderate|low)\b/i.test(String(baseDescription));
  const descriptionWithSeverity = hasOriginal ? String(baseDescription) : `${String(baseDescription)} | originalSeverity: ${event.severity}`;

  return {
    id: event.id,
    type,
    severity,
    title: baseTitle as string,
    description: descriptionWithSeverity,
    recommendations,
    timestamp: new Date(event.createdAt),
    studentId: event.studentId,
    dataPoints: event.metadata?.sparkValues?.length ?? 0,
  };
}

export function alertEventToAlertHistory(event: AlertEvent): LegacyAlertHistoryEntry {
  const resolved = [AlertStatus.Resolved, AlertStatus.Dismissed, AlertStatus.Snoozed].includes(event.status);
  const viewed = resolved || [AlertStatus.Acknowledged, AlertStatus.InProgress].includes(event.status);

  const legacy: LegacyAlertHistoryEntry = {
    alert: alertEventToTriggerAlert(event),
    viewed,
    resolved,
    resolvedAt: typeof event.metadata?.resolvedAt === 'string' ? new Date(event.metadata.resolvedAt) : undefined,
    resolvedBy: typeof event.metadata?.resolvedBy === 'string' ? event.metadata.resolvedBy : undefined,
    resolvedNotes: typeof event.metadata?.resolutionNotes === 'string' ? event.metadata.resolutionNotes : undefined,
  };

  return legacy;
}

export function validateAlertEvent(event: unknown): AlertEvent {
  if (!isValidAlertEvent(event)) {
    throw new Error('Invalid AlertEvent: missing required fields or malformed values.');
  }
  return event as AlertEvent;
}

export function validateDetectorResult(result: unknown): DetectorResult {
  if (!isValidDetectorResult(result)) {
    throw new Error('Invalid DetectorResult: expected score and confidence between 0 and 1.');
  }
  return result as DetectorResult;
}

export function validateSourceRef(source: unknown): SourceRef {
  if (!isValidSourceRef(source)) {
    throw new Error('Invalid SourceRef: missing type or confidence out of range.');
  }
  return source as SourceRef;
}

export function backupLegacyAlerts(): string | null {
  const stored = safeGet(LEGACY_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  safeSet(LEGACY_BACKUP_STORAGE_KEY, stored);
  return stored;
}

export function migrateExistingAlerts(): AlertHistoryEntry[] {
  const legacyAlerts = alertSystem.getAllAlerts();
  const migrated = legacyAlerts.map(alertHistoryToAlertEvent);
  safeSet(MIGRATED_STORAGE_KEY, JSON.stringify(migrated));
  return migrated;
}
