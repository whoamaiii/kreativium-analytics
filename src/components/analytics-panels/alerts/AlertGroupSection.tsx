/**
 * @file Alert group section component
 *
 * Displays a collapsible group of alerts organized by:
 * - Severity (critical, important, moderate, low)
 * - Source (EWMA, CUSUM, Beta, etc.)
 * - Status (new, acknowledged, in_progress, resolved, snoozed)
 *
 * Each group has a header with icon, label, and count badge,
 * plus a list of alert items when expanded.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Info } from 'lucide-react';
import { AlertSeverity, AlertWithGovernance, AlertStatus } from '@/lib/alerts/types';
import { getSeverityIcon, getSeverityBadgeVariant } from './utils/alertIcons';
import { AlertListItem } from './AlertListItem';
import { useTranslation } from '@/hooks/useTranslation';

export interface AlertGroupSectionProps {
  /** Group type (severity, source, or status) */
  groupType: 'severity' | 'source' | 'status';

  /** Group key (e.g., 'critical' for severity, 'ewma' for source) */
  groupKey: string;

  /** Alerts in this group */
  alerts: AlertWithGovernance[];

  /** Whether this group is collapsed */
  isCollapsed: boolean;

  /** Callback when collapse state changes */
  onToggleCollapse: () => void;

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
 * Collapsible section displaying a group of alerts
 *
 * Renders different header styles based on group type:
 * - Severity: Uses severity icon and color-coded badge
 * - Source/Status: Uses info icon with secondary badge
 *
 * Contains a list of AlertListItem components when expanded.
 *
 * @example
 * <AlertGroupSection
 *   groupType="severity"
 *   groupKey="critical"
 *   alerts={criticalAlerts}
 *   isCollapsed={collapsed[AlertSeverity.Critical]}
 *   onToggleCollapse={() => toggleCollapsed(AlertSeverity.Critical)}
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
export const AlertGroupSection: React.FC<AlertGroupSectionProps> = ({
  groupType,
  groupKey,
  alerts,
  isCollapsed,
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
  const { tAnalytics } = useTranslation();

  // Get display label for group
  const getGroupLabel = () => {
    if (groupType === 'severity' || groupType === 'status') {
      return groupKey.charAt(0).toUpperCase() + groupKey.slice(1);
    }
    return groupKey; // Source type labels are already formatted
  };

  // Get icon for group header
  const getGroupIcon = () => {
    if (groupType === 'severity') {
      return getSeverityIcon(groupKey as AlertSeverity);
    }
    return <Info className="h-4 w-4" />;
  };

  // Get badge variant for group header
  const getBadgeVariant = () => {
    if (groupType === 'severity') {
      return getSeverityBadgeVariant(groupKey as AlertSeverity);
    }
    return 'secondary';
  };

  const label = getGroupLabel();
  const icon = getGroupIcon();
  const badgeVariant = getBadgeVariant();

  return (
    <Collapsible open={!isCollapsed} onOpenChange={onToggleCollapse}>
      {/* Group header */}
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" aria-expanded={!isCollapsed}>
            <span className="flex items-center gap-2">
              {icon}
              <span className="capitalize">{label}</span>
              <Badge variant={badgeVariant}>{alerts.length}</Badge>
            </span>
          </Button>
        </CollapsibleTrigger>
      </div>

      {/* Alert list */}
      <CollapsibleContent>
        {alerts.length === 0 ? (
          <div className="text-sm text-muted-foreground mt-2">
            {String(tAnalytics('alerts.none'))}
          </div>
        ) : (
          <ul className="mt-3 space-y-2" aria-label={`Alerts list for ${label}`}>
            {alerts.map((alert) => (
              <AlertListItem
                key={alert.id}
                alert={alert}
                isSelected={selectedIds.has(alert.id)}
                isPinned={pinnedIds.has(alert.id)}
                onToggleSelection={onToggleSelection}
                onTogglePin={onTogglePin}
                onAcknowledge={onAcknowledge}
                onSnooze={onSnooze}
                onResolve={onResolve}
                onOpenDetails={onOpenDetails}
              />
            ))}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

AlertGroupSection.displayName = 'AlertGroupSection';
