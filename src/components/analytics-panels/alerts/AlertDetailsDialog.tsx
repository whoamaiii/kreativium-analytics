/**
 * @file Alert details dialog component
 *
 * Modal dialog displaying comprehensive alert information with action buttons.
 * Wraps the AlertDetails component with dialog UI and action handlers.
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDetails } from '@/components/alerts/AlertDetails';
import { AlertWithGovernance } from '@/lib/alerts/types';
import { AlertActionHandlers } from '../hooks/useAlertActionHandlers';

export interface AlertDetailsDialogProps {
  /** Whether the dialog is open */
  open: boolean;

  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;

  /** Alert to display details for (null when dialog is closed) */
  alert: AlertWithGovernance | null;

  /** Action handlers for alert operations */
  actionHandlers: AlertActionHandlers;

  /** Callback to submit feedback on alert */
  onSubmitFeedback: (alertId: string, data: any) => void;
}

/**
 * Dialog for viewing alert details and taking actions
 *
 * Displays comprehensive information about an alert including:
 * - Alert metadata and summary
 * - Source information and confidence
 * - Action buttons (create goal, add intervention, schedule check-in, etc.)
 * - Feedback form
 *
 * @example
 * <AlertDetailsDialog
 *   open={detailsOpen}
 *   onOpenChange={setDetailsOpen}
 *   alert={selectedForDetails}
 *   actionHandlers={actionHandlers}
 *   onSubmitFeedback={feedback}
 * />
 */
export const AlertDetailsDialog: React.FC<AlertDetailsDialogProps> = ({
  open,
  onOpenChange,
  alert,
  actionHandlers,
  onSubmitFeedback,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alert details</DialogTitle>
        </DialogHeader>
        {alert && (
          <AlertDetails
            alert={alert}
            onCreateGoal={actionHandlers.handleCreateGoal}
            onAddInterventionTemplate={actionHandlers.handleAddInterventionTemplate}
            onScheduleCheckIn={actionHandlers.handleScheduleCheckIn}
            onAddToReport={actionHandlers.handleAddToReport}
            onNotifyTeam={actionHandlers.handleNotifyTeam}
            onSubmitFeedback={onSubmitFeedback}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

AlertDetailsDialog.displayName = 'AlertDetailsDialog';
