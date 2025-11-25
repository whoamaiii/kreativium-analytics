import { alertSystem } from '@/lib/alertSystem';
import { safeGet, safeSet } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { AlertEvent, AlertWithGovernance } from '@/lib/alerts/types';
import {
  alertHistoryToAlertEvent,
  alertEventToAlertHistory,
  triggerAlertToAlertEvent,
  backupLegacyAlerts,
} from '@/lib/alerts/adapters';

function alertsKey(studentId: string): string {
  return `alerts:list:${studentId}`;
}

const LEGACY_STORAGE_KEY = 'sensoryTracker_alerts';
const MIGRATION_STATUS_KEY = 'alerts:migration:status';
const BRIDGE_VERSION = 1;

type MigrationStatus = {
  version: number;
  completedAt?: string;
  errors?: string[];
  migratedStudents?: string[];
  hadLegacy?: boolean;
};

function parseJSON<T>(raw: string | null): T | null {
  try {
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    // @silent-ok: JSON parse errors are non-fatal, return null to signal invalid data
    return null;
  }
}

function readNew(studentId: string): AlertEvent[] {
  const raw = safeGet(alertsKey(studentId));
  const parsed = parseJSON<AlertEvent[]>(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function writeNew(studentId: string, events: AlertEvent[]): void {
  try {
    safeSet(alertsKey(studentId), JSON.stringify(events));
  } catch (err) {
    // @silent-ok: storage errors are non-fatal; logger may also fail if storage is unavailable
    logger.warn('[AlertSystemBridge] Failed to persist new alerts', err as Error);
  }
}

function dispatchAlertsUpdated(studentId?: string): void {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('alerts:updated', { detail: { studentId } }));
    }
  } catch {
    // @silent-ok: event dispatch failures are non-fatal, UI will update on next poll
  }
}

export class AlertSystemBridge {
  public detectLegacyPresent(): boolean {
    try {
      return !!safeGet(LEGACY_STORAGE_KEY);
    } catch {
      // @silent-ok: storage access errors are non-fatal, assume no legacy data
      return false;
    }
  }

  public convertLegacyToNew(studentId?: string): AlertEvent[] {
    try {
      const legacy = studentId
        ? alertSystem.getStudentAlerts(studentId)
        : alertSystem.getAllAlerts();
      const mapped = legacy.map(alertHistoryToAlertEvent);
      if (studentId) return mapped.filter((e) => e.studentId === studentId);
      return mapped;
    } catch (err) {
      // @silent-ok: conversion errors are non-fatal, return empty array
      logger.error('[AlertSystemBridge] convertLegacyToNew failed', err as Error);
      return [];
    }
  }

  public migrateStorageFormat(studentId?: string): {
    ok: boolean;
    added: number;
    hadLegacy: boolean;
    error?: string;
  } {
    const statusRaw = safeGet(MIGRATION_STATUS_KEY);
    const status = parseJSON<MigrationStatus>(statusRaw) ?? { version: BRIDGE_VERSION };
    const hadLegacy = this.detectLegacyPresent();
    if (!hadLegacy) {
      // Nothing to migrate
      return { ok: true, added: 0, hadLegacy: false };
    }

    try {
      // Backup legacy payload for rollback/debug
      backupLegacyAlerts();
    } catch {
      // @silent-ok: backup failure is non-fatal, migration can proceed without it
    }

    try {
      let totalAdded = 0;
      const migrateFor = (sid: string) => {
        const legacyNew = this.convertLegacyToNew(sid);
        if (!legacyNew.length) return 0;
        const current = readNew(sid);
        const dedupMap = new Map<string, AlertEvent>([...current.map((e) => [e.id, e])]);
        for (const e of legacyNew) {
          if (!dedupMap.has(e.id)) dedupMap.set(e.id, e);
        }
        const combined = Array.from(dedupMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        writeNew(sid, combined);
        return combined.length - current.length;
      };

      if (studentId) {
        totalAdded += migrateFor(studentId);
        status.migratedStudents = Array.from(
          new Set([...(status.migratedStudents ?? []), studentId]),
        );
      } else {
        // Best-effort: infer student ids from legacy entries
        const all = this.convertLegacyToNew();
        const byStudent = new Map<string, AlertEvent[]>();
        for (const e of all) {
          const arr = byStudent.get(e.studentId) ?? [];
          arr.push(e);
          byStudent.set(e.studentId, arr);
        }
        byStudent.forEach((_list, sid) => {
          totalAdded += migrateFor(sid);
        });
        status.migratedStudents = Array.from(byStudent.keys());
      }

      status.version = BRIDGE_VERSION;
      status.completedAt = new Date().toISOString();
      status.hadLegacy = true;
      safeSet(MIGRATION_STATUS_KEY, JSON.stringify(status));

      try {
        dispatchAlertsUpdated(studentId);
      } catch {
        // @silent-ok: event dispatch failure is non-fatal, UI will update on next poll
      }
      return { ok: true, added: totalAdded, hadLegacy: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      status.errors = Array.from(new Set([...(status.errors ?? []), msg]));
      safeSet(MIGRATION_STATUS_KEY, JSON.stringify(status));
      // @silent-ok: migration errors are logged but non-fatal
      logger.error('[AlertSystemBridge] migrateStorageFormat failed', err as Error);
      return { ok: false, added: 0, hadLegacy: hadLegacy, error: msg };
    }
  }

  public syncLegacyAlerts(studentId: string): { added: number } {
    try {
      const legacy = this.convertLegacyToNew(studentId);
      if (!legacy.length) return { added: 0 };
      const current = readNew(studentId);
      if (!current.length) {
        writeNew(studentId, legacy.slice(0, 200));
        dispatchAlertsUpdated(studentId);
        return { added: legacy.length };
      }
      const map = new Map<string, AlertEvent>(current.map((e) => [e.id, e]));
      let added = 0;
      for (const e of legacy) {
        if (!map.has(e.id)) {
          map.set(e.id, e);
          added += 1;
        }
      }
      if (added > 0) {
        const combined = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        writeNew(studentId, combined.slice(0, 200));
        dispatchAlertsUpdated(studentId);
      }
      return { added };
    } catch (err) {
      // @silent-ok: sync errors are non-fatal, will retry on next poll
      logger.warn('[AlertSystemBridge] syncLegacyAlerts failed', err as Error);
      return { added: 0 };
    }
  }

  public syncNewToLegacy(studentId: string): { ok: boolean } {
    try {
      // Bidirectional compatibility: reflect new alerts back into a migrated mirror
      const events = readNew(studentId);
      const legacyMirror = events.map((e) => alertEventToAlertHistory(e));
      safeSet('sensoryTracker_alerts_v2', JSON.stringify(legacyMirror));
      return { ok: true };
    } catch (err) {
      // @silent-ok: legacy sync errors are non-fatal, new format is authoritative
      logger.warn('[AlertSystemBridge] syncNewToLegacy failed', err as Error);
      return { ok: false };
    }
  }

  public startLegacyPolling(studentId: string, intervalMs = 10000): () => void {
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      try {
        const { added } = this.syncLegacyAlerts(studentId);
        if (added > 0) dispatchAlertsUpdated(studentId);
      } catch {
        // @silent-ok: poll tick errors are non-fatal, will retry on next tick
      }
      if (!stopped) {
        setTimeout(tick, intervalMs);
      }
    };
    setTimeout(tick, intervalMs);
    return () => {
      stopped = true;
    };
  }
}

export default AlertSystemBridge;
