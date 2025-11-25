/**
 * @file Alert backoff configuration constants.
 *
 * Documents the backoff multipliers used in alert suppression.
 * See CODE_QUALITY_AUDIT.md Section 5 for rationale.
 */

import { AlertSeverity } from '@/lib/alerts/types';

/**
 * Backoff multipliers by alert severity.
 *
 * Lower values = faster re-alert (critical issues need immediate attention)
 * Higher values = more suppression (low priority can wait longer)
 *
 * The multiplier is applied to the base backoff duration to determine
 * how long to wait before re-alerting for the same condition.
 *
 * Example: If base duration is 1 hour:
 * - Critical (1.3x): ~1h 18min between alerts
 * - Important (1.6x): ~1h 36min between alerts
 * - Moderate (2.0x): ~2h between alerts
 * - Low (2.5x): ~2h 30min between alerts
 */
export const ALERT_BACKOFF_MULTIPLIERS = {
  /**
   * Critical alerts should re-alert quickly since they indicate
   * urgent conditions requiring immediate attention.
   */
  CRITICAL: 1.3,

  /**
   * Important alerts need attention but can have slightly longer
   * backoff than critical issues.
   */
  IMPORTANT: 1.6,

  /**
   * Moderate alerts are noteworthy patterns that don't require
   * immediate action. Standard backoff is appropriate.
   */
  MODERATE: 2.0,

  /**
   * Low priority alerts are informational. Longer backoff prevents
   * notification fatigue for non-urgent items.
   */
  LOW: 2.5,
} as const;

/**
 * Type-safe lookup for backoff multiplier by severity.
 */
export function getBackoffMultiplier(severity: AlertSeverity): number {
  const severityToMultiplier: Record<AlertSeverity, number> = {
    [AlertSeverity.Critical]: ALERT_BACKOFF_MULTIPLIERS.CRITICAL,
    [AlertSeverity.Important]: ALERT_BACKOFF_MULTIPLIERS.IMPORTANT,
    [AlertSeverity.Moderate]: ALERT_BACKOFF_MULTIPLIERS.MODERATE,
    [AlertSeverity.Low]: ALERT_BACKOFF_MULTIPLIERS.LOW,
  };
  return severityToMultiplier[severity] ?? ALERT_BACKOFF_MULTIPLIERS.MODERATE;
}

/**
 * Base backoff durations in milliseconds.
 */
export const ALERT_BACKOFF_BASE = {
  /** Minimum backoff duration: 5 minutes */
  MIN_MS: 5 * 60 * 1000,
  /** Default backoff duration: 1 hour */
  DEFAULT_MS: 60 * 60 * 1000,
  /** Maximum backoff duration: 24 hours */
  MAX_MS: 24 * 60 * 60 * 1000,
} as const;

/**
 * Alert deduplication window in milliseconds.
 */
export const ALERT_DEDUP_WINDOW = {
  /** Short window for rapid-fire alerts: 30 seconds */
  SHORT_MS: 30 * 1000,
  /** Standard window: 5 minutes */
  STANDARD_MS: 5 * 60 * 1000,
  /** Extended window: 30 minutes */
  EXTENDED_MS: 30 * 60 * 1000,
} as const;
