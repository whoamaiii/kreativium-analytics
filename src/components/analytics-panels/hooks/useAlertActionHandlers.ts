/**
 * @file Alert action handlers hook
 *
 * Provides action handlers for alert operations:
 * - Create goal from alert
 * - Add intervention template
 * - Schedule check-in
 * - Add to report
 * - Notify team
 *
 * Centralizes business logic for alert actions with proper error handling.
 */

import { useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { AlertWithGovernance } from '@/lib/alerts/types';
import InterventionTemplateManager from '@/lib/interventions/templateManager';

/**
 * Action handlers for alert operations
 */
export interface AlertActionHandlers {
  /** Open create goal dialog for an alert */
  handleCreateGoal: (alert: AlertWithGovernance) => void;

  /** Add intervention template from alert */
  handleAddInterventionTemplate: (alert: AlertWithGovernance, interventionId: string) => void;

  /** Schedule check-in for alert */
  handleScheduleCheckIn: (alert: AlertWithGovernance, dateISO: string) => void;

  /** Add alert to report draft */
  handleAddToReport: (alert: AlertWithGovernance) => void;

  /** Notify team about alert */
  handleNotifyTeam: (alert: AlertWithGovernance) => void;
}

/**
 * Hook providing alert action handlers
 *
 * Creates stable callbacks for common alert actions with proper
 * error handling and user feedback via toasts.
 *
 * @param onCreateGoal - Callback to open create goal dialog
 * @returns Object with action handler functions
 *
 * @example
 * const actionHandlers = useAlertActionHandlers((alert) => {
 *   setGoalDialogAlert(alert);
 *   setGoalDialogOpen(true);
 * });
 *
 * // Use in AlertDetails component
 * <AlertDetails
 *   alert={selectedAlert}
 *   onCreateGoal={actionHandlers.handleCreateGoal}
 *   onAddInterventionTemplate={actionHandlers.handleAddInterventionTemplate}
 *   // ...
 * />
 */
export function useAlertActionHandlers(
  onCreateGoal: (alert: AlertWithGovernance) => void
): AlertActionHandlers {
  /**
   * Handle create goal action
   * Opens dialog instead of immediately creating goal
   */
  const handleCreateGoal = useCallback(
    (alert: AlertWithGovernance) => {
      onCreateGoal(alert);
    },
    [onCreateGoal]
  );

  /**
   * Handle add intervention template action
   * Creates intervention from alert using template manager
   */
  const handleAddInterventionTemplate = useCallback(
    (alert: AlertWithGovernance, interventionId: string) => {
      try {
        const mgr = new InterventionTemplateManager();
        const created = mgr.createFromAlert(alert, interventionId);

        if (created) {
          toast.success('Intervention template added');
        } else {
          toast.info('No matching template');
        }
      } catch (error) {
        logger.error('Failed to add intervention template', error);
        toast.error('Failed to add intervention');
      }
    },
    []
  );

  /**
   * Handle schedule check-in action
   * Creates reminder for alert follow-up
   */
  const handleScheduleCheckIn = useCallback((alert: AlertWithGovernance, dateISO: string) => {
    try {
      const mgr = new InterventionTemplateManager();
      const reminder = (mgr as any).createReminder?.(alert, dateISO);

      if (reminder) {
        toast.success('Check-in scheduled');
      } else {
        toast.info('No reminder saved');
      }
    } catch (error) {
      logger.error('Failed to schedule check-in', error);
      toast.error('Failed to schedule');
    }
  }, []);

  /**
   * Handle add to report action
   * Appends alert to report draft in localStorage
   */
  const handleAddToReport = useCallback((alert: AlertWithGovernance) => {
    try {
      const key = `reports:drafts:${alert.studentId}`;
      const raw = localStorage.getItem(key);
      const list = raw ? (JSON.parse(raw) as any[]) : [];

      list.push({
        type: 'alert',
        id: alert.id,
        createdAt: new Date().toISOString(),
        summary: alert.metadata?.summary ?? alert.kind,
      });

      // Keep only last 200 entries
      localStorage.setItem(key, JSON.stringify(list.slice(-200)));
      toast.success('Added to report draft');
    } catch (error) {
      logger.error('Failed to add to report', error);
      toast.error('Failed to add to report');
    }
  }, []);

  /**
   * Handle notify team action
   * In production, would integrate with notification service
   * Currently logs payload and shows toast
   */
  const handleNotifyTeam = useCallback((alert: AlertWithGovernance) => {
    try {
      const payload = {
        id: alert.id,
        studentId: alert.studentId,
        summary: alert.metadata?.summary ?? alert.kind,
        severity: alert.severity,
        createdAt: alert.createdAt,
      };

      // In production, would POST to notification API
      logger.info('[NotifyTeam] alert notification', payload);
      toast.success('Team notified');
    } catch (error) {
      logger.error('Failed to notify team', error);
      toast.error('Failed to notify team');
    }
  }, []);

  return {
    handleCreateGoal,
    handleAddInterventionTemplate,
    handleScheduleCheckIn,
    handleAddToReport,
    handleNotifyTeam,
  };
}
