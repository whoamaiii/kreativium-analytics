import { useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import type { AlertWithGovernance } from '@/lib/alerts/types';

interface UseAlertBulkActionsArgs {
  alerts: AlertWithGovernance[];
  activeAlerts: AlertWithGovernance[];
  sourceFilters: string[];
  sourceLabelFilters: string[];
  acknowledge: (id: string) => void;
  resolve: (id: string) => void;
  snooze: (id: string) => void;
}

export interface AlertBulkActions {
  acknowledgeByConfidence: (threshold: number) => void;
  acknowledgeBySource: (type: string) => void;
  resolveBySourceType: (type: string) => void;
  snoozeSimilar: () => void;
  acknowledgeByLabel: (label: string) => void;
}

export const useAlertBulkActions = ({
  alerts,
  activeAlerts,
  sourceFilters,
  sourceLabelFilters,
  acknowledge,
  resolve,
  snooze,
}: UseAlertBulkActionsArgs): AlertBulkActions => {
  const acknowledgeByConfidence = useCallback((threshold: number) => {
    const targets = activeAlerts.filter((alert) => (alert.confidence ?? 0) >= threshold);
    if (!targets.length) {
      toast.info(`No alerts at or above ${Math.round(threshold * 100)}% confidence`);
      return;
    }
    targets.forEach((alert) => {
      try { acknowledge(alert.id); } catch { /* noop */ }
    });
    toast.success(`Acknowledged ${targets.length} alert${targets.length === 1 ? '' : 's'} ≥ ${Math.round(threshold * 100)}% confidence`);
  }, [activeAlerts, acknowledge]);

  const acknowledgeBySource = useCallback((type: string) => {
    const targets = alerts.filter((alert) => (alert.sources ?? []).some((source) => source.type === type));
    if (!targets.length) {
      toast.info(`No alerts for source ${type}`);
      return;
    }
    targets.forEach((alert) => {
      try { acknowledge(alert.id); } catch { /* noop */ }
    });
    toast.success(`Acknowledged ${targets.length} alert${targets.length === 1 ? '' : 's'} from ${type}`);
  }, [alerts, acknowledge]);

  const resolveBySourceType = useCallback((type: string) => {
    const targets = alerts.filter((alert) => (alert.sources ?? []).some((source) => source.type === type));
    if (!targets.length) {
      toast.info(`No alerts for source ${type}`);
      return;
    }
    targets.forEach((alert) => {
      try { resolve(alert.id); } catch { /* noop */ }
    });
    toast.success(`Resolved ${targets.length} alert${targets.length === 1 ? '' : 's'} from ${type}`);
  }, [alerts, resolve]);

  const snoozeSimilar = useCallback(() => {
    const label = sourceLabelFilters[0];
    const type = sourceFilters[0];
    const targets = alerts.filter((alert) => {
      const sources = alert.sources ?? [];
      if (label) return sources.some((source) => (source.label ?? source.type) === label);
      if (type) return sources.some((source) => source.type === type);
      return false;
    });
    if (!targets.length) {
      toast.info('No similar alerts to snooze');
      return;
    }
    targets.forEach((alert) => { try { snooze(alert.id); } catch { /* noop */ } });
    toast.success(`Snoozed ${targets.length} alerts`);
  }, [alerts, sourceFilters, sourceLabelFilters, snooze]);

  const acknowledgeByLabel = useCallback((label: string) => {
    const targets = alerts.filter((alert) => (alert.sources ?? []).some((source) => (source.label ?? source.type) === label));
    if (!targets.length) {
      toast.info(`No alerts for ${label}`);
      return;
    }
    targets.forEach((alert) => {
      try { acknowledge(alert.id); } catch { /* noop */ }
    });
    toast.success(`Acknowledged ${targets.length} alert${targets.length === 1 ? '' : 's'} for ${label}`);
  }, [alerts, acknowledge]);

  return {
    acknowledgeByConfidence,
    acknowledgeBySource,
    resolveBySourceType,
    snoozeSimilar,
    acknowledgeByLabel,
  };
};
