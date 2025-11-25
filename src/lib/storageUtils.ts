/**
 * @file Utility functions for managing localStorage
 *
 * @deprecated This module is deprecated. Use storageService from '@/lib/storage' instead.
 * Kept for backward compatibility during migration.
 */
import { logger } from '@/lib/logger';
import { MAX_LOCAL_STORAGE_BYTES } from '@/config/storage';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { STORAGE_NAMESPACE } from '@/lib/storage/storageKeys';

export const storageUtils = {
  /**
   * Check available storage space
   */
  getStorageInfo(): { used: number; available: boolean } {
    if (typeof window === 'undefined') {
      return { used: 0, available: true };
    }
    let used = 0;
    try {
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          used += localStorage[key].length + key.length;
        }
      }
    } catch (error) {
      logger.warn('[storageUtils] Failed to calculate storage info', { error });
    }
    return {
      used,
      available: used < MAX_LOCAL_STORAGE_BYTES,
    };
  },

  /**
   * Clear old tracking data to free up space.
   * Works with both legacy (sensoryTracker_*) and new (kreativium.local::*) keys.
   */
  clearOldTrackingData(daysToKeep: number = 30): void {
    if (typeof window === 'undefined') return;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Clear old tracking entries (legacy key)
      const entriesKey = STORAGE_KEYS.ENTRIES;
      const entriesData = localStorage.getItem(entriesKey);
      if (entriesData) {
        const entries = JSON.parse(entriesData);
        const filteredEntries = entries.filter((entry: { timestamp: string | Date }) => {
          const entryDate = new Date(entry.timestamp);
          return entryDate > cutoffDate;
        });
        localStorage.setItem(entriesKey, JSON.stringify(filteredEntries));
      }

      // Clear old sessions (new key)
      const sessionsKey = `${STORAGE_NAMESPACE}::sessions`;
      const sessionsData = localStorage.getItem(sessionsKey);
      if (sessionsData) {
        const sessions = JSON.parse(sessionsData);
        const filteredSessions = sessions.filter((session: { updatedAt: string | Date }) => {
          const sessionDate = new Date(session.updatedAt);
          return sessionDate > cutoffDate;
        });
        localStorage.setItem(sessionsKey, JSON.stringify(filteredSessions));
      }

      // Clear old alerts (legacy key)
      const alertsKey = STORAGE_KEYS.ALERTS;
      const alertsData = localStorage.getItem(alertsKey);
      if (alertsData) {
        const alerts = JSON.parse(alertsData);
        const filteredAlerts = alerts.filter((alert: { timestamp?: string | Date; createdAt?: string | Date }) => {
          const alertDate = new Date(alert.createdAt || alert.timestamp || 0);
          return alertDate > cutoffDate;
        });
        localStorage.setItem(alertsKey, JSON.stringify(filteredAlerts));
      }

      // Clear old alerts (new key)
      const newAlertsKey = `${STORAGE_NAMESPACE}::alerts`;
      const newAlertsData = localStorage.getItem(newAlertsKey);
      if (newAlertsData) {
        const alerts = JSON.parse(newAlertsData);
        const filteredAlerts = alerts.filter((alert: { createdAt: string | Date }) => {
          const alertDate = new Date(alert.createdAt);
          return alertDate > cutoffDate;
        });
        localStorage.setItem(newAlertsKey, JSON.stringify(filteredAlerts));
      }
    } catch (error) {
      logger.error('[storageUtils] Error clearing old data:', { error });
    }
  },

  /**
   * Compress data before storing
   */
  compressData(data: unknown): string {
    return JSON.stringify(data);
  },

  /**
   * Safe storage with quota handling
   */
  safeSetItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(key, value);
    } catch (e) {
      if (
        e instanceof DOMException &&
        (e.code === 22 ||
          e.code === 1014 ||
          e.name === 'QuotaExceededError' ||
          e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      ) {
        this.clearOldTrackingData();

        try {
          localStorage.setItem(key, value);
        } catch {
          this.clearNonEssentialData();
          localStorage.setItem(key, value);
        }
      } else {
        throw e;
      }
    }
  },

  /**
   * Clear non-essential data when storage is full.
   * Works with both legacy and new storage namespaces.
   */
  clearNonEssentialData(): void {
    if (typeof window === 'undefined') return;

    const essentialKeys = new Set([
      STORAGE_KEYS.STUDENTS,
      STORAGE_KEYS.GOALS,
      STORAGE_KEYS.DATA_VERSION,
      `${STORAGE_NAMESPACE}::students`,
      `${STORAGE_NAMESPACE}::goals`,
      `${STORAGE_NAMESPACE}::version`,
    ]);

    try {
      for (const key in localStorage) {
        if (
          Object.prototype.hasOwnProperty.call(localStorage, key) &&
          (key.startsWith('sensoryTracker_') || key.startsWith(STORAGE_NAMESPACE)) &&
          !essentialKeys.has(key)
        ) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      logger.warn('[storageUtils] Failed to clear non-essential data', { error });
    }
  },
};
