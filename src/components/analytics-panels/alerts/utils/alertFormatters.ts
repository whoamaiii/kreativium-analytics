/**
 * @file Alert formatting utilities
 *
 * Provides consistent formatting functions for alert data display.
 * Handles dates, confidence scores, source labels, and other data transformations.
 */

import { AlertWithGovernance, AlertKind } from '@/lib/alerts/types';

/**
 * Format a confidence value as a percentage string
 *
 * @param confidence - Confidence value (0-1)
 * @returns Formatted percentage (e.g., "87%")
 *
 * @example
 * formatConfidence(0.8734) // "87%"
 * formatConfidence(0.5) // "50%"
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Format an alert creation date for display
 *
 * @param dateString - ISO date string
 * @param locale - Optional locale (defaults to browser locale)
 * @returns Formatted date string
 *
 * @example
 * formatAlertDate("2024-01-15T10:30:00Z") // "1/15/2024"
 */
export function formatAlertDate(dateString: string, locale?: string): string {
  try {
    return new Date(dateString).toLocaleDateString(locale);
  } catch {
    return dateString;
  }
}

/**
 * Format an alert creation date with time for detailed views
 *
 * @param dateString - ISO date string
 * @param locale - Optional locale (defaults to browser locale)
 * @returns Formatted date and time string
 *
 * @example
 * formatAlertDateTime("2024-01-15T10:30:00Z") // "1/15/2024, 10:30 AM"
 */
export function formatAlertDateTime(dateString: string, locale?: string): string {
  try {
    return new Date(dateString).toLocaleString(locale);
  } catch {
    return dateString;
  }
}

/**
 * Format alert kind for display (converts enum to readable text)
 *
 * @param kind - Alert kind enum value
 * @returns Human-readable kind string
 *
 * @example
 * formatAlertKind(AlertKind.BehaviorSpike) // "Behavior Spike"
 * formatAlertKind(AlertKind.ContextAssociation) // "Context Association"
 */
export function formatAlertKind(kind: AlertKind): string {
  return String(kind)
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format alert sources for compact display
 * Shows primary source and count of additional sources
 *
 * @param alert - Alert with sources
 * @returns Formatted source string
 *
 * @example
 * formatAlertSources(alert) // "EWMA + 2 more"
 * formatAlertSources(alertWithOneSource) // "CUSUM"
 */
export function formatAlertSources(alert: AlertWithGovernance): string {
  if (!alert.sources || alert.sources.length === 0) {
    return 'Unknown';
  }

  const primary = alert.sources[0]?.label ?? alert.sources[0]?.type ?? 'Unknown';

  if (alert.sources.length === 1) {
    return primary;
  }

  return `${primary} + ${alert.sources.length - 1} more`;
}

/**
 * Get a concise summary of the alert for display
 * Falls back through metadata.summary -> kind formatting
 *
 * @param alert - Alert object
 * @returns Summary string
 *
 * @example
 * getAlertSummary(alert) // "Behavior spike detected in aggression"
 */
export function getAlertSummary(alert: AlertWithGovernance): string {
  return alert.metadata?.summary ?? formatAlertKind(alert.kind);
}

/**
 * Format time window in hours to human-readable string
 *
 * @param hours - Time window in hours
 * @returns Human-readable time window
 *
 * @example
 * formatTimeWindow(24) // "Last 24h"
 * formatTimeWindow(168) // "Last 7d"
 * formatTimeWindow(0) // "All time"
 */
export function formatTimeWindow(hours: number | undefined): string {
  if (!hours || hours === 0) {
    return 'All time';
  }

  if (hours < 24) {
    return `Last ${hours}h`;
  }

  const days = Math.round(hours / 24);
  return `Last ${days}d`;
}

/**
 * Truncate text to a maximum length with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text
 *
 * @example
 * truncateText("This is a very long alert message", 20) // "This is a very long..."
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - 3) + '...';
}
