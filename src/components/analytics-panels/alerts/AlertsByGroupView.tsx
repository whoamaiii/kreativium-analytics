/**
 * @file Alerts by group view component
 *
 * Renders alerts organized into collapsible groups based on:
 * - Severity (critical, important, moderate, low)
 * - Source (EWMA, CUSUM, Beta, etc.)
 * - Status (new, acknowledged, in_progress, resolved, snoozed)
 *
 * Handles different rendering logic for each group mode.
 */

import React from 'react';
import { AlertSeverity, AlertWithGovernance } from '@/lib/alerts/types';
import { AlertGroupSection } from './AlertGroupSection';

export interface GroupedAlerts {
  bySeverity: Record<AlertSeverity, AlertWithGovernance[]>;
  bySource: Record<string, AlertWithGovernance[]>;
  byStatus: Record<string, AlertWithGovernance[]>;
}

export interface AlertsByGroupViewProps {
  /** Group mode (severity, source, or status) */
  groupMode: 'severity' | 'source' | 'status';

  /** Grouped alerts data */
  grouped: GroupedAlerts;

  /** Collapsed state for each group */
  collapsed: Record<AlertSeverity, boolean>;

  /** Callback to toggle collapse state */
  onToggleCollapse: (severity: AlertSeverity) => void;

  /** Set of selected alert IDs */
  selectedIds: Set<string>;

  /** Set of pinned alert IDs */
  pinnedIds: Set<string>;

  /** Callback when selection is toggled */
  onToggleSelection: (id: string) => void;

  /** Callback when pin is toggled */
  onTogglePin: (id: string) => void;

  /** Callback to acknowledge alert */
  onAcknowledge: (id: string) => void;

  /** Callback to snooze alert */
  onSnooze: (id: string) => void;

  /** Callback to resolve alert */
  onResolve: (id: string) => void;

  /** Callback to open alert details */
  onOpenDetails: (id: string) => void;
}

/**
 * View component rendering alerts in collapsible groups
 *
 * Dynamically renders groups based on groupMode:
 * - severity: Ordered by severity level (critical → low)
 * - source: Groups by alert source type
 * - status: Groups by alert status
 *
 * Each group uses AlertGroupSection for consistent rendering.
 *
 * @example
 * <AlertsByGroupView
 *   groupMode="severity"
 *   grouped={grouped}
 *   collapsed={collapsed}
 *   onToggleCollapse={toggleCollapsed}
 *   selectedIds={selectedIds}
 *   pinnedIds={pinnedIds}
 *   onToggleSelection={toggleSelection}
 *   onTogglePin={togglePin}
 *   onAcknowledge={acknowledge}
 *   onSnooze={snooze}
 *   onResolve={resolve}
 *   onOpenDetails={handleOpenDetails}
 * />
 */
export const AlertsByGroupView: React.FC<AlertsByGroupViewProps> = ({
  groupMode,
  grouped,
  collapsed,
  onToggleCollapse,
  selectedIds,
  pinnedIds,
  onToggleSelection,
  onTogglePin,
  onAcknowledge,
  onSnooze,
  onResolve,
  onOpenDetails,
}) => {
  // Severity sections in priority order
  const severitySections: AlertSeverity[] = [
    AlertSeverity.Critical,
    AlertSeverity.Important,
    AlertSeverity.Moderate,
    AlertSeverity.Low,
  ];

  return (
    <div className="flex flex-wrap gap-3" role="group" aria-label="Alerts by group">
      {/* Group by severity */}
      {groupMode === 'severity' &&
        severitySections.map((severity) => (
          <AlertGroupSection
            key={severity}
            groupType="severity"
            groupKey={severity}
            alerts={grouped.bySeverity[severity]}
            isCollapsed={collapsed[severity]}
            onToggleCollapse={() => onToggleCollapse(severity)}
            selectedIds={selectedIds}
            pinnedIds={pinnedIds}
            onToggleSelection={onToggleSelection}
            onTogglePin={onTogglePin}
            onAcknowledge={onAcknowledge}
            onSnooze={onSnooze}
            onResolve={onResolve}
            onOpenDetails={onOpenDetails}
          />
        ))}

      {/* Group by source */}
      {groupMode === 'source' &&
        Object.entries(grouped.bySource).map(([source, alerts]) => (
          <AlertGroupSection
            key={source}
            groupType="source"
            groupKey={source}
            alerts={alerts}
            isCollapsed={false} // Source groups default to expanded
            onToggleCollapse={() => {}} // No collapse state for source mode
            selectedIds={selectedIds}
            pinnedIds={pinnedIds}
            onToggleSelection={onToggleSelection}
            onTogglePin={onTogglePin}
            onAcknowledge={onAcknowledge}
            onSnooze={onSnooze}
            onResolve={onResolve}
            onOpenDetails={onOpenDetails}
          />
        ))}

      {/* Group by status */}
      {groupMode === 'status' &&
        Object.entries(grouped.byStatus).map(([status, alerts]) => (
          <AlertGroupSection
            key={status}
            groupType="status"
            groupKey={status}
            alerts={alerts}
            isCollapsed={false} // Status groups default to expanded
            onToggleCollapse={() => {}} // No collapse state for status mode
            selectedIds={selectedIds}
            pinnedIds={pinnedIds}
            onToggleSelection={onToggleSelection}
            onTogglePin={onTogglePin}
            onAcknowledge={onAcknowledge}
            onSnooze={onSnooze}
            onResolve={onResolve}
            onOpenDetails={onOpenDetails}
          />
        ))}
    </div>
  );
};

AlertsByGroupView.displayName = 'AlertsByGroupView';
