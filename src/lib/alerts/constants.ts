import { AlertKind, AlertSettings, AlertSeverity, AlertStatus } from './types';

export const DEFAULT_DETECTOR_THRESHOLDS: Record<string, number> = {
  ewma: 0.6,
  cusum: 0.55,
  beta: 0.5,
  association: 0.5,
  burst: 0.6,
  tauU: 0.5,
};

export function getDefaultDetectorThreshold(detectorType: string): number {
  return DEFAULT_DETECTOR_THRESHOLDS[detectorType] ?? 0.5;
}

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  studentId: '__global__',
  quietHours: {
    start: '22:00',
    end: '07:00',
  },
  dailyCaps: {
    critical: 1,
    important: 2,
    moderate: 4,
    low: Number.MAX_SAFE_INTEGER,
  },
  sensitivityByKind: {
    [AlertKind.Safety]: 'high',
    [AlertKind.BehaviorSpike]: 'medium',
    [AlertKind.ContextAssociation]: 'medium',
    [AlertKind.InterventionDue]: 'medium',
    [AlertKind.DataQuality]: 'low',
    [AlertKind.ImprovementNoted]: 'low',
    [AlertKind.PatternDetected]: 'medium',
  },
  snoozePreferences: {
    defaultHours: 24,
    dontShowAgainDays: 7,
  },
};

export const DEDUPE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const THROTTLE_BACKOFF_BASE = 2;
export const MAX_THROTTLE_DELAY_MS = 6 * 60 * 60 * 1000; // 6 hours

export const MAX_SOURCES_PER_ALERT = 3;
export const MIN_CONFIDENCE_THRESHOLD = 0.1;

export const SOURCE_RANKING_WEIGHTS = {
  impact: 0.5,
  confidence: 0.3,
  recency: 0.2,
};

export const MIN_ALERT_CONFIDENCE = 0.0;
export const MAX_ALERT_CONFIDENCE = 1.0;

export const REQUIRED_ALERT_FIELDS = [
  'id',
  'studentId',
  'kind',
  'severity',
  'status',
  'confidence',
  'createdAt',
];

export const VALID_STATUS_TRANSITIONS: Record<AlertStatus, AlertStatus[]> = {
  [AlertStatus.New]: [
    AlertStatus.Acknowledged,
    AlertStatus.InProgress,
    AlertStatus.Resolved,
    AlertStatus.Snoozed,
    AlertStatus.Dismissed,
  ],
  [AlertStatus.Acknowledged]: [
    AlertStatus.InProgress,
    AlertStatus.Resolved,
    AlertStatus.Snoozed,
    AlertStatus.Dismissed,
  ],
  [AlertStatus.InProgress]: [
    AlertStatus.Resolved,
    AlertStatus.Snoozed,
    AlertStatus.Dismissed,
  ],
  [AlertStatus.Resolved]: [],
  [AlertStatus.Snoozed]: [
    AlertStatus.InProgress,
    AlertStatus.Resolved,
    AlertStatus.Dismissed,
  ],
  [AlertStatus.Dismissed]: [],
};

export const TERMINAL_STATUSES: AlertStatus[] = [
  AlertStatus.Resolved,
  AlertStatus.Snoozed,
  AlertStatus.Dismissed,
];

export const SEVERITY_LIMITS: Record<AlertSeverity, number> = {
  [AlertSeverity.Critical]: 1,
  [AlertSeverity.Important]: 2,
  [AlertSeverity.Moderate]: 4,
  [AlertSeverity.Low]: Number.MAX_SAFE_INTEGER,
};
