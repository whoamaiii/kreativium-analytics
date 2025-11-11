/**
 * @file Pinned alerts rail component
 *
 * Right sidebar displaying pinned alerts for quick access.
 * Features:
 * - Collapsible on mobile, always visible on desktop (lg+)
 * - Clear all pinned alerts button with confirmation dialog
 * - List of pinned alert cards with inline actions
 * - Empty state when no alerts are pinned
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle } from 'lucide-react';
import { AlertWithGovernance } from '@/lib/alerts/types';
import { PinnedAlertCard } from './PinnedAlertCard';
import { useTranslation } from '@/hooks/useTranslation';

export interface PinnedAlertsRailProps {
  /** Pinned alerts to display */
  pinnedAlerts: AlertWithGovernance[];

  /** Whether the rail is expanded */
  isOpen: boolean;

  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;

  /** Whether clear confirmation dialog is open */
  clearDialogOpen: boolean;

  /** Callback when clear dialog state changes */
  onClearDialogChange: (open: boolean) => void;

  /** Callback to clear all pinned alerts */
  onClearAll: () => void;

  /** Callback to unpin a single alert */
  onUnpin: (id: string) => void;

  /** Record of viewed pinned alerts */
  viewedPinned: Record<string, boolean>;

  /** Callback when alert is marked as viewed */
  onMarkViewed: (id: string) => void;

  /** Currently selected alert for resolve dialog */
  selectedForResolve: AlertWithGovernance | null;

  /** Callback when resolve dialog state changes */
  onResolveDialogChange: (alert: AlertWithGovernance, open: boolean) => void;

  /** Current resolve notes text */
  resolveNotes: string;

  /** Callback when resolve notes change */
  onResolveNotesChange: (notes: string) => void;

  /** Whether resolve operation is in progress */
  isResolving: boolean;

  /** Callback when resolve is confirmed */
  onResolve: () => void;
}

/**
 * Right rail component for pinned alerts
 *
 * Provides quick access to important alerts that users want to keep visible.
 * Responsive design: collapsible on mobile, always visible on desktop.
 *
 * @example
 * <PinnedAlertsRail
 *   pinnedAlerts={pinnedAlerts}
 *   isOpen={pinnedOpen}
 *   onOpenChange={setPinnedOpen}
 *   clearDialogOpen={clearDialogOpen}
 *   onClearDialogChange={setClearDialogOpen}
 *   onClearAll={clearPinnedAlerts}
 *   onUnpin={unpinAlert}
 *   viewedPinned={viewedPinned}
 *   onMarkViewed={handleMarkViewed}
 *   selectedForResolve={selectedForResolve}
 *   onResolveDialogChange={(alert, open) => setSelectedForResolve(open ? alert : null)}
 *   resolveNotes={resolveNotes}
 *   onResolveNotesChange={setResolveNotes}
 *   isResolving={isResolving}
 *   onResolve={handleResolve}
 * />
 */
export const PinnedAlertsRail: React.FC<PinnedAlertsRailProps> = ({
  pinnedAlerts,
  isOpen,
  onOpenChange,
  clearDialogOpen,
  onClearDialogChange,
  onClearAll,
  onUnpin,
  viewedPinned,
  onMarkViewed,
  selectedForResolve,
  onResolveDialogChange,
  resolveNotes,
  onResolveNotesChange,
  isResolving,
  onResolve,
}) => {
  const { tAnalytics, tCommon } = useTranslation();

  return (
    <aside className="space-y-4" aria-label={String(tAnalytics('aria.alerts.pinnedAlertsRail'))}>
      <Card>
        <Collapsible open={isOpen} onOpenChange={onOpenChange}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{String(tAnalytics('alerts.pinnedAlerts'))}</CardTitle>
              <div className="flex items-center gap-2">
                {/* Clear all button with confirmation dialog */}
                <Dialog open={clearDialogOpen} onOpenChange={onClearDialogChange}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" disabled={pinnedAlerts.length === 0}>
                      {String(tAnalytics('alerts.actions.clearAllPinned'))}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {String(tAnalytics('dialogs.alerts.confirmClearPinnedTitle'))}
                      </DialogTitle>
                      <DialogDescription>
                        {String(tAnalytics('dialogs.alerts.confirmClearPinnedDescription'))}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => onClearDialogChange(false)}>
                        {String(tCommon('cancel'))}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          onClearAll();
                          onClearDialogChange(false);
                        }}
                      >
                        {String(tAnalytics('alerts.actions.clearAllPinned'))}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Mobile toggle */}
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden" aria-expanded={isOpen}>
                    {String(tAnalytics('alerts.pinnedAlerts'))}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>

          {/* Always visible on desktop, collapsible on mobile */}
          <CollapsibleContent
            forceMount
            className="data-[state=closed]:hidden lg:data-[state=closed]:block"
          >
            <CardContent>
              {pinnedAlerts.length === 0 ? (
                /* Empty state */
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>{String(tAnalytics('alerts.noPinnedAlerts'))}</span>
                </div>
              ) : (
                /* Pinned alerts list */
                <ul className="space-y-3">
                  {pinnedAlerts.map((alert) => (
                    <PinnedAlertCard
                      key={alert.id}
                      alert={alert}
                      isViewed={viewedPinned[alert.id] ?? false}
                      isResolveDialogOpen={selectedForResolve?.id === alert.id}
                      resolveNotes={resolveNotes}
                      isResolving={isResolving}
                      onUnpin={onUnpin}
                      onMarkViewed={onMarkViewed}
                      onResolveDialogChange={onResolveDialogChange}
                      onResolveNotesChange={onResolveNotesChange}
                      onResolve={onResolve}
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </aside>
  );
};

PinnedAlertsRail.displayName = 'PinnedAlertsRail';
