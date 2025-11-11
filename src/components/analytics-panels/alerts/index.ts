/**
 * @file Alerts components barrel export
 *
 * Centralized export for all alert-related components and utilities.
 * Provides clean imports for consumers.
 */

// Utility functions
export { getSeverityIcon, getStatusIcon, getSeverityBadgeVariant } from './utils/alertIcons';
export {
  formatConfidence,
  formatAlertDate,
  formatAlertDateTime,
  formatAlertKind,
  formatAlertSources,
  getAlertSummary,
  formatTimeWindow,
  truncateText,
} from './utils/alertFormatters';

// Leaf components
export { AlertSearchBar } from './AlertSearchBar';
export { AlertFilterControls } from './AlertFilterControls';
export { AlertBulkActionBar } from './AlertBulkActionBar';
export { AlertListItem } from './AlertListItem';
export { PinnedAlertCard } from './PinnedAlertCard';

// Composite components
export { AlertGroupSection } from './AlertGroupSection';
export { PinnedAlertsRail } from './PinnedAlertsRail';
export { AlertsFilterPanel } from './AlertsFilterPanel';

// Complex composite components
export { AlertDetailsDialog } from './AlertDetailsDialog';
export { AlertsByGroupView } from './AlertsByGroupView';
export type { GroupedAlerts } from './AlertsByGroupView';

// Re-export types
export type { AlertSearchBarProps } from './AlertSearchBar';
export type { AlertFilterControlsProps } from './AlertFilterControls';
export type { AlertBulkActionBarProps } from './AlertBulkActionBar';
export type { AlertListItemProps } from './AlertListItem';
export type { PinnedAlertCardProps } from './PinnedAlertCard';
export type { AlertGroupSectionProps } from './AlertGroupSection';
export type { PinnedAlertsRailProps } from './PinnedAlertsRail';
export type { AlertsFilterPanelProps } from './AlertsFilterPanel';
export type { AlertDetailsDialogProps } from './AlertDetailsDialog';
export type { AlertsByGroupViewProps } from './AlertsByGroupView';
