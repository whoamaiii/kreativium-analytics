/**
 * @file Alert icon utilities
 *
 * Provides consistent icon mapping for alert severities and statuses.
 * Centralizes icon selection logic to ensure visual consistency across the UI.
 */

import { AlertTriangle, Info, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { AlertSeverity, AlertStatus } from '@/lib/alerts/types';

/**
 * Get the appropriate icon component for an alert severity level
 *
 * @param severity - The alert severity level
 * @returns React icon component with appropriate styling
 *
 * @example
 * const icon = getSeverityIcon(AlertSeverity.Critical);
 * // Returns: <AlertTriangle className="h-4 w-4 text-destructive" />
 */
export function getSeverityIcon(severity: AlertSeverity) {
  switch (severity) {
    case AlertSeverity.Critical:
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case AlertSeverity.Important:
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case AlertSeverity.Moderate:
      return <AlertTriangle className="h-4 w-4 text-info" />;
    case AlertSeverity.Low:
    default:
      return <Info className="h-4 w-4 text-muted-foreground" />;
  }
}

/**
 * Get the appropriate icon component for an alert status
 *
 * @param status - The alert status
 * @returns React icon component with appropriate styling
 *
 * @example
 * const icon = getStatusIcon(AlertStatus.Resolved);
 * // Returns: <CheckCircle className="h-4 w-4 text-success" />
 */
export function getStatusIcon(status: AlertStatus) {
  switch (status) {
    case AlertStatus.Resolved:
      return <CheckCircle className="h-4 w-4 text-success" />;
    case AlertStatus.InProgress:
      return <Clock className="h-4 w-4 text-info" />;
    case AlertStatus.Snoozed:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    case AlertStatus.Acknowledged:
      return <Info className="h-4 w-4 text-info" />;
    case AlertStatus.New:
    default:
      return <AlertCircle className="h-4 w-4 text-warning" />;
  }
}

/**
 * Get severity badge variant for consistent styling
 *
 * @param severity - The alert severity level
 * @returns Badge variant string
 */
export function getSeverityBadgeVariant(severity: AlertSeverity): 'destructive' | 'default' | 'secondary' | 'outline' {
  switch (severity) {
    case AlertSeverity.Critical:
      return 'destructive';
    case AlertSeverity.Important:
      return 'default';
    case AlertSeverity.Moderate:
    case AlertSeverity.Low:
    default:
      return 'secondary';
  }
}
