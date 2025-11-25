import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AlertEvent,
  AlertSettings,
  AlertStatus,
  AlertWithGovernance,
} from '@/lib/alerts/types';
import { AlertPolicies } from '@/lib/alerts/policies';
import { BaselineService } from '@/lib/alerts/baseline';
import { AlertTelemetryService } from '@/lib/alerts/telemetry';
import { AlertSystemBridge } from '@/lib/alerts/bridge';
import { safeGet, safeSet } from '@/lib/storage';
import { ALERT_POLL_INTERVAL_MS } from '@/constants/analytics';
import { logger } from '@/lib/logger';

function readStorage<T>(key: string): T | null {
  try {
    const raw = safeGet(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (e) {
    logger.debug('[useAlerts] Failed to read storage', { key, error: e });
    return null;
  }
}

function writeStorage<T>(key: string, value: T): void {
  try {
    const raw = JSON.stringify(value);
    safeSet(key, raw);
  } catch (e) {
    logger.warn('[useAlerts] Failed to write storage', { key, error: e });
  }
}

function alertsKey(studentId: string): string {
  return `alerts:list:${studentId}`;
}

export type UseAlertsOptions = {
  studentId: string;
  aggregate?: boolean;
  settings?: AlertSettings;
  filters?: {
    severity?: string[];
    kinds?: string[];
    timeWindowHours?: number;
  };
};

export function useAlerts({ studentId, aggregate, settings, filters }: UseAlertsOptions) {
  const [alerts, setAlerts] = useState<AlertWithGovernance[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const policiesRef = useRef(new AlertPolicies());
  const baselineRef = useRef(new BaselineService());
  const telemetryRef = useRef(new AlertTelemetryService());
  const bridgeRef = useRef<AlertSystemBridge | null>(null);
  const stopPollingRef = useRef<null | (() => void)>(null);

  const applyGovernance = useCallback(
    (list: AlertEvent[]): AlertWithGovernance[] => {
      const deduped = policiesRef.current.deduplicateAlerts(list);
      const withQuiet = policiesRef.current.applyQuietHours(deduped, settings);
      // Cap enforcement requires counts; approximate with current list order
      const withCaps = policiesRef.current.enforceCapLimits(withQuiet, settings);
      return withCaps.map((a) => ({ ...a, governance: { ...a.governance } }));
    },
    [settings],
  );

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      let raw: AlertEvent[] = [];
      if (aggregate) {
        // Aggregate across all students by scanning keys
        try {
          if (typeof window !== 'undefined') {
            const keys = Object.keys(localStorage).filter((k) => k.startsWith('alerts:list:'));
            const combined: AlertEvent[] = [];
            for (const k of keys) {
              const arr = readStorage<AlertEvent[]>(k) ?? [];
              combined.push(...arr);
            }
            raw = combined;
          } else {
            raw = readStorage<AlertEvent[]>(alertsKey(studentId)) ?? [];
          }
        } catch (e) {
          logger.debug('[useAlerts] Failed to aggregate alerts from localStorage', { error: e });
          raw = readStorage<AlertEvent[]>(alertsKey(studentId)) ?? [];
        }
      } else {
        raw = readStorage<AlertEvent[]>(alertsKey(studentId)) ?? [];
      }

      // If no new-format alerts yet, attempt a one-shot legacy migration for this student
      if (!raw.length) {
        try {
          const bridge = bridgeRef.current ?? new AlertSystemBridge();
          bridgeRef.current = bridge;
          const migrated = bridge.convertLegacyToNew(studentId);
          if (migrated.length) {
            // Persist migrated alerts to new storage format
            writeStorage(alertsKey(studentId), migrated);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('alerts:migration', {
                  detail: { studentId, migrated: migrated.length },
                }),
              );
              window.dispatchEvent(new CustomEvent('alerts:updated', { detail: { studentId } }));
            }
            raw = migrated;
          }
        } catch (e) {
          logger.debug('[useAlerts] Legacy migration failed', { studentId, error: e });
        }
      }
      const now = Date.now();
      const filteredTime = filters?.timeWindowHours
        ? raw.filter(
            (a) =>
              now - new Date(a.createdAt).getTime() <=
              (filters.timeWindowHours as number) * 3600_000,
          )
        : raw;
      const filteredSeverity = filters?.severity?.length
        ? filteredTime.filter((a) => (filters.severity as string[]).includes(a.severity))
        : filteredTime;
      const filteredKinds = filters?.kinds?.length
        ? filteredSeverity.filter((a) => (filters.kinds as string[]).includes(a.kind))
        : filteredSeverity;
      const governed = applyGovernance(filteredKinds);
      setAlerts(governed);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load alerts';
      logger.warn('[useAlerts] Failed to load alerts', { studentId, error: e });
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [studentId, aggregate, filters, applyGovernance]);

  useEffect(() => {
    // load initial and set simple polling for freshness
    load();
    const t = setInterval(load, ALERT_POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [load]);

  // On mount and when studentId changes, attempt automatic migration and start legacy polling
  useEffect(() => {
    const bridge = bridgeRef.current ?? new AlertSystemBridge();
    bridgeRef.current = bridge;

    // Attempt a background migration of any legacy alerts for this student
    try {
      const res = bridge.migrateStorageFormat(aggregate ? undefined : studentId);
      if (res.ok && res.added > 0 && typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('alerts:migration', { detail: { studentId, migrated: res.added } }),
        );
        window.dispatchEvent(new CustomEvent('alerts:updated', { detail: { studentId } }));
      }
    } catch (e) {
      logger.debug('[useAlerts] Storage format migration failed', { studentId, error: e });
    }

    // Start lightweight legacy polling to capture new alerts emitted by pattern engine
    try {
      if (stopPollingRef.current) {
        stopPollingRef.current();
        stopPollingRef.current = null;
      }
      if (!aggregate) {
        stopPollingRef.current = bridge.startLegacyPolling(studentId, 15_000);
      }
    } catch (e) {
      logger.debug('[useAlerts] Failed to start legacy polling', { studentId, error: e });
    }

    return () => {
      try {
        stopPollingRef.current?.();
      } catch (e) {
        // @silent-ok: cleanup failure is non-fatal
        logger.debug('[useAlerts] Cleanup stopPolling failed', { error: e });
      }
      stopPollingRef.current = null;
    };
  }, [studentId, aggregate]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ studentId?: string }>).detail;
      if (aggregate || !detail?.studentId || detail.studentId === studentId) {
        load();
      }
    };
    window.addEventListener('alerts:updated', handler as EventListener);
    return () => {
      window.removeEventListener('alerts:updated', handler as EventListener);
    };
  }, [studentId, aggregate, load]);

  const persist = useCallback(
    (next: AlertEvent[]) => {
      if (!aggregate) {
        writeStorage(alertsKey(studentId), next);
      }
    },
    [studentId, aggregate],
  );

  const acknowledge = useCallback(
    (id: string) => {
      if (!aggregate) {
        setAlerts(() => {
          const raw = readStorage<AlertEvent[]>(alertsKey(studentId)) ?? [];
          const nextRaw = raw.map((a) =>
            a.id === id ? { ...a, status: 'acknowledged' as AlertStatus } : a,
          );
          persist(nextRaw);
          telemetryRef.current.logAlertAcknowledged(id);
          const governed = applyGovernance(nextRaw);
          return governed;
        });
        return;
      }
      // Aggregate mode: update in whichever student list contains the alert
      try {
        if (typeof window !== 'undefined') {
          const keys = Object.keys(localStorage).filter((k) => k.startsWith('alerts:list:'));
          for (const k of keys) {
            const raw = readStorage<AlertEvent[]>(k) ?? [];
            if (raw.some((a) => a.id === id)) {
              const nextRaw = raw.map((a) =>
                a.id === id ? { ...a, status: 'acknowledged' as AlertStatus } : a,
              );
              writeStorage(k, nextRaw);
              telemetryRef.current.logAlertAcknowledged(id);
              break;
            }
          }
          load();
        }
      } catch (e) {
        logger.warn('[useAlerts] Failed to acknowledge alert in aggregate mode', { alertId: id, error: e });
      }
    },
    [studentId, aggregate, persist, applyGovernance, load],
  );

  const snooze = useCallback(
    (id: string, hours = settings?.snoozePreferences?.defaultHours ?? 24) => {
      if (!aggregate) {
        setAlerts(() => {
          const key = alertsKey(studentId);
          const raw = readStorage<AlertEvent[]>(key) ?? [];
          const alert = raw.find((a) => a.id === id);
          if (alert) {
            const dedupeKey = policiesRef.current.calculateDedupeKey(alert);
            policiesRef.current.snooze(studentId, dedupeKey, hours);
          }
          // Persist status update and snooze metadata
          const until = new Date(Date.now() + hours * 3600_000).toISOString();
          const nextRaw = raw.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: 'snoozed' as AlertStatus,
                  metadata: { ...(a.metadata || {}), snoozeUntil: until },
                }
              : a,
          );
          writeStorage(key, nextRaw);
          const governed = applyGovernance(nextRaw);
          return governed;
        });
        return;
      }
      try {
        if (typeof window !== 'undefined') {
          const keys = Object.keys(localStorage).filter((k) => k.startsWith('alerts:list:'));
          for (const k of keys) {
            const raw = readStorage<AlertEvent[]>(k) ?? [];
            if (raw.some((a) => a.id === id)) {
              const alert = raw.find((a) => a.id === id)!;
              const dedupeKey = policiesRef.current.calculateDedupeKey(alert);
              policiesRef.current.snooze(alert.studentId, dedupeKey, hours);
              const until = new Date(Date.now() + hours * 3600_000).toISOString();
              const nextRaw = raw.map((a) =>
                a.id === id
                  ? {
                      ...a,
                      status: 'snoozed' as AlertStatus,
                      metadata: { ...(a.metadata || {}), snoozeUntil: until },
                    }
                  : a,
              );
              writeStorage(k, nextRaw);
              break;
            }
          }
          load();
        }
      } catch (e) {
        logger.warn('[useAlerts] Failed to snooze alert in aggregate mode', { alertId: id, error: e });
      }
    },
    [studentId, aggregate, applyGovernance, settings?.snoozePreferences?.defaultHours, load],
  );

  const resolve = useCallback(
    (id: string, notes?: string, actionId?: string) => {
      if (!aggregate) {
        setAlerts(() => {
          const raw = readStorage<AlertEvent[]>(alertsKey(studentId)) ?? [];
          const nextRaw = raw.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: 'resolved' as AlertStatus,
                  metadata: { ...(a.metadata || {}), resolutionNotes: notes },
                }
              : a,
          );
          persist(nextRaw);
          telemetryRef.current.logAlertResolved(id, { notes, actionId });
          const governed = applyGovernance(nextRaw);
          return governed;
        });
        return;
      }
      try {
        if (typeof window !== 'undefined') {
          const keys = Object.keys(localStorage).filter((k) => k.startsWith('alerts:list:'));
          for (const k of keys) {
            const raw = readStorage<AlertEvent[]>(k) ?? [];
            if (raw.some((a) => a.id === id)) {
              const nextRaw = raw.map((a) =>
                a.id === id
                  ? {
                      ...a,
                      status: 'resolved' as AlertStatus,
                      metadata: { ...(a.metadata || {}), resolutionNotes: notes },
                    }
                  : a,
              );
              writeStorage(k, nextRaw);
              telemetryRef.current.logAlertResolved(id, { notes, actionId });
              break;
            }
          }
          load();
        }
      } catch (e) {
        logger.warn('[useAlerts] Failed to resolve alert in aggregate mode', { alertId: id, error: e });
      }
    },
    [studentId, aggregate, persist, applyGovernance, load],
  );

  const feedback = useCallback(
    (id: string, data: { relevant?: boolean; comment?: string; rating?: number }) => {
      telemetryRef.current.logFeedback(id, data);
    },
    [],
  );

  const refresh = useCallback(() => load(), [load]);

  const filteredSorted = useMemo(() => {
    return [...alerts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [alerts]);

  return {
    alerts: filteredSorted,
    loading,
    error,
    acknowledge,
    snooze,
    resolve,
    feedback,
    refresh,
    // surface services for advanced consumers
    policies: policiesRef.current,
    baseline: baselineRef.current,
    telemetry: telemetryRef.current,
  };
}

export default useAlerts;
