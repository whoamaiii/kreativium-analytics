/**
 * @file Alert list item component
 *
 * Displays a single alert in the main list with:
 * - Checkbox for bulk selection
 * - Governance badges (dedup, throttled, quiet, snoozed, capped)
 * - AlertCard component for alert details
 * - Pin/Unpin button
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pin, PinOff } from 'lucide-react';
import { AlertWithGovernance } from '@/lib/alerts/types';
import { AlertCard } from '@/components/alerts/AlertCard';
import { useTranslation } from '@/hooks/useTranslation';

export interface AlertListItemProps {
  /** The alert to display */
  alert: AlertWithGovernance;

  /** Whether this alert is currently selected */
  isSelected: boolean;

  /** Whether this alert is pinned */
  isPinned: boolean;

  /** Callback when selection checkbox is toggled */
  onToggleSelection: (id: string) => void;

  /** Callback when pin button is clicked */
  onTogglePin: (id: string) => void;

  /** Callback when acknowledge button is clicked */
  onAcknowledge: (id: string) => void;

  /** Callback when snooze button is clicked */
  onSnooze: (id: string) => void;

  /** Callback when resolve button is clicked */
  onResolve: (id: string) => void;

  /** Callback when "View Details" is clicked */
  onOpenDetails: (id: string) => void;
}

/**
 * Individual alert list item with selection, governance badges, and actions
 *
 * Wraps AlertCard with additional UI chrome for list display:
 * - Checkbox for bulk operations
 * - Governance badges showing alert processing state
 * - Pin/unpin button for quick access rail
 *
 * @example
 * <AlertListItem
 *   alert={alert}
 *   isSelected={selectedIds.has(alert.id)}
 *   isPinned={pinnedIds.has(alert.id)}
 *   onToggleSelection={toggleSelection}
 *   onTogglePin={togglePin}
 *   onAcknowledge={acknowledge}
 *   onSnooze={snooze}
 *   onResolve={resolve}
 *   onOpenDetails={handleOpenDetails}
 * />
 */
export const AlertListItem: React.FC<AlertListItemProps> = ({
  alert,
  isSelected,
  isPinned,
  onToggleSelection,
  onTogglePin,
  onAcknowledge,
  onSnooze,
  onResolve,
  onOpenDetails,
}) => {
  const { tAnalytics } = useTranslation();

  return (
    <li className="flex items-start gap-2">
      {/* Selection checkbox */}
      <input
        type="checkbox"
        className="mt-3"
        aria-label={`Select alert ${alert.id}`}
        checked={isSelected}
        onChange={() => onToggleSelection(alert.id)}
      />

      {/* Alert content */}
      <div className="flex-1 min-w-0">
        {/* Governance badges */}
        {alert.governance && (
          <div className="mb-1 flex flex-wrap gap-1">
            {alert.governance.deduplicated && <Badge variant="outline">dedup</Badge>}
            {alert.governance.throttled && <Badge variant="outline">throttled</Badge>}
            {alert.governance.quietHours && <Badge variant="outline">quiet</Badge>}
            {alert.governance.snoozed && <Badge variant="outline">snoozed</Badge>}
            {alert.governance.capExceeded && <Badge variant="outline">capped</Badge>}
          </div>
        )}

        {/* Alert card */}
        <AlertCard
          alert={alert}
          onAcknowledge={onAcknowledge}
          onSnooze={onSnooze}
          onResolve={onResolve}
          onOpenDetails={onOpenDetails}
          sparklineOptions={{}}
        />
      </div>

      {/* Pin/Unpin button */}
      <div className="shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTogglePin(alert.id)}
          aria-label={String(
            isPinned ? tAnalytics('aria.alerts.unpinButton') : tAnalytics('aria.alerts.pinButton'),
          )}
          title={String(isPinned ? tAnalytics('alerts.unpinAlert') : tAnalytics('alerts.pinAlert'))}
        >
          {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </Button>
      </div>
    </li>
  );
};

AlertListItem.displayName = 'AlertListItem';
