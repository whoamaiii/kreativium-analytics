/**
 * @file Pinned alert card component
 *
 * Displays a single pinned alert in the right rail with:
 * - Severity icon and summary
 * - Creation date
 * - Source information
 * - Resolved badge if applicable
 * - Unpin button
 * - Mark as viewed button
 * - Quick resolve dialog
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { PinOff, Eye } from 'lucide-react';
import { AlertWithGovernance, AlertStatus } from '@/lib/alerts/types';
import { getSeverityIcon } from './utils/alertIcons';
import { formatAlertDate, formatAlertSources, getAlertSummary } from './utils/alertFormatters';
import { useTranslation } from '@/hooks/useTranslation';

export interface PinnedAlertCardProps {
  /** The pinned alert to display */
  alert: AlertWithGovernance;

  /** Whether this alert has been viewed */
  isViewed: boolean;

  /** Whether resolve dialog is open for this alert */
  isResolveDialogOpen: boolean;

  /** Current resolve notes text */
  resolveNotes: string;

  /** Whether resolve operation is in progress */
  isResolving: boolean;

  /** Callback when unpin button is clicked */
  onUnpin: (id: string) => void;

  /** Callback when mark as viewed button is clicked */
  onMarkViewed: (id: string) => void;

  /** Callback when resolve dialog open state changes */
  onResolveDialogChange: (alert: AlertWithGovernance, open: boolean) => void;

  /** Callback when resolve notes change */
  onResolveNotesChange: (notes: string) => void;

  /** Callback when resolve is confirmed */
  onResolve: () => void;
}

/**
 * Card component for displaying a pinned alert in the rail
 *
 * Provides quick access to important alerts with inline resolve functionality.
 * Includes visual indicators for viewed status and resolved state.
 *
 * @example
 * <PinnedAlertCard
 *   alert={alert}
 *   isViewed={viewedPinned[alert.id] ?? false}
 *   isResolveDialogOpen={selectedForResolve?.id === alert.id}
 *   resolveNotes={resolveNotes}
 *   isResolving={isResolving}
 *   onUnpin={unpinAlert}
 *   onMarkViewed={handleMarkViewed}
 *   onResolveDialogChange={(alert, open) => setSelectedForResolve(open ? alert : null)}
 *   onResolveNotesChange={setResolveNotes}
 *   onResolve={handleResolve}
 * />
 */
export const PinnedAlertCard: React.FC<PinnedAlertCardProps> = ({
  alert,
  isViewed,
  isResolveDialogOpen,
  resolveNotes,
  isResolving,
  onUnpin,
  onMarkViewed,
  onResolveDialogChange,
  onResolveNotesChange,
  onResolve,
}) => {
  const { tAnalytics, tCommon } = useTranslation();

  return (
    <li className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        {/* Alert info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {getSeverityIcon(alert.severity)}
            <span className="text-sm font-medium truncate">{getAlertSummary(alert)}</span>
          </div>

          <div className="text-xs text-muted-foreground mt-1">
            {formatAlertDate(alert.createdAt)}
          </div>

          {/* Source info */}
          {alert.sources && alert.sources.length > 0 && (
            <p className="text-xs text-slate-500">Sources: {formatAlertSources(alert)}</p>
          )}

          {/* Resolved badge */}
          {alert.status === AlertStatus.Resolved && (
            <div className="mt-2">
              <Badge variant="outline">{String(tAnalytics('alerts.resolvedLabel'))}</Badge>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Unpin button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUnpin(alert.id)}
            aria-label={String(tAnalytics('aria.alerts.unpinButton'))}
            title={String(tAnalytics('alerts.unpinAlert'))}
          >
            <PinOff className="h-4 w-4" />
          </Button>

          {/* Mark as viewed button */}
          {!isViewed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMarkViewed(alert.id)}
              aria-label={String(tAnalytics('tabs.alerts'))}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}

          {/* Quick resolve dialog */}
          {alert.status !== AlertStatus.Resolved && (
            <Dialog
              open={isResolveDialogOpen}
              onOpenChange={(open) => onResolveDialogChange(alert, open)}
            >
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  {String(tAnalytics('alerts.resolveTitle'))}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{String(tAnalytics('alerts.resolveTitle'))}</DialogTitle>
                  <DialogDescription>
                    {String(tAnalytics('alerts.resolveDescription'))}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="pinned-resolution-notes"
                      className="text-sm font-medium mb-2 block"
                    >
                      {String(tAnalytics('alerts.resolutionNotes'))}
                    </label>
                    <Textarea
                      id="pinned-resolution-notes"
                      rows={3}
                      value={resolveNotes}
                      onChange={(e) => onResolveNotesChange(e.target.value)}
                      placeholder={String(tAnalytics('alerts.resolutionNotesPlaceholder'))}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onResolveDialogChange(alert, false)}>
                      {String(tCommon('cancel'))}
                    </Button>
                    <Button onClick={onResolve} disabled={isResolving}>
                      {String(tAnalytics('alerts.resolveTitle'))}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </li>
  );
};

PinnedAlertCard.displayName = 'PinnedAlertCard';
