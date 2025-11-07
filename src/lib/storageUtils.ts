/**
 * Utility functions for managing localStorage
 */
import { logger } from '@/lib/logger';
import { MAX_LOCAL_STORAGE_BYTES } from '@/config/storage';
import { safeJsonParse, safeJsonStringify, safeLocalStorageGet, safeLocalStorageSet, tryCatchSync } from '@/lib/utils/errorHandling';

export const storageUtils = {
  /**
   * Check available storage space
   */
  getStorageInfo(): { used: number; available: boolean } {
    let used = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }
    return {
      used,
      available: used < MAX_LOCAL_STORAGE_BYTES // 5MB approximate limit
    };
  },

  /**
   * Clear old tracking data to free up space
   */
  clearOldTrackingData(daysToKeep: number = 30): void {
    const result = tryCatchSync(() => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Clear old tracking entries
      const entriesKey = 'sensoryTracker_entries';
      const entriesData = safeLocalStorageGet(entriesKey, '', 'storageUtils.clearOldTracking');
      if (entriesData) {
        const entries = safeJsonParse<Array<{ timestamp: string | Date }>>(entriesData, [], 'storageUtils.parseEntries');
        const filteredEntries = entries.filter((entry) => {
          const entryDate = new Date(entry.timestamp);
          return entryDate > cutoffDate;
        });
        const json = safeJsonStringify(filteredEntries, '[]', 'storageUtils.stringifyEntries');
        safeLocalStorageSet(entriesKey, json, 'storageUtils.saveFilteredEntries');
      }

      // Clear old alerts
      const alertsKey = 'sensoryTracker_alerts';
      const alertsData = safeLocalStorageGet(alertsKey, '', 'storageUtils.clearOldAlerts');
      if (alertsData) {
        const alerts = safeJsonParse<Array<{ timestamp: string | Date }>>(alertsData, [], 'storageUtils.parseAlerts');
        const filteredAlerts = alerts.filter((alert) => {
          const alertDate = new Date(alert.timestamp);
          return alertDate > cutoffDate;
        });
        const json = safeJsonStringify(filteredAlerts, '[]', 'storageUtils.stringifyAlerts');
        safeLocalStorageSet(alertsKey, json, 'storageUtils.saveFilteredAlerts');
      }
    }, 'storageUtils.clearOldTrackingData');

    if (!result.success) {
      logger.error('Error clearing old data:', result.error);
    }
  },

  /**
   * Compress data before storing
   */
  compressData(data: unknown): string {
    // Remove unnecessary whitespace from JSON
    return safeJsonStringify(data, '{}', 'storageUtils.compressData');
  },

  /**
   * Safe storage with quota handling
   */
  safeSetItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      if (e instanceof DOMException && (
        e.code === 22 || // Quota exceeded
        e.code === 1014 || // NS_ERROR_DOM_QUOTA_REACHED (Firefox)
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      )) {
        // Try to clear old data and retry
        this.clearOldTrackingData();

        try {
          localStorage.setItem(key, value);
        } catch (retryError) {
          // If still failing, clear all non-essential data
          this.clearNonEssentialData();
          localStorage.setItem(key, value);
        }
      } else {
        throw e;
      }
    }
  },

  /**
   * Clear non-essential data when storage is full
   */
  clearNonEssentialData(): void {
    const essentialKeys = [
      'sensoryTracker_students',
      'sensoryTracker_goals',
      'sensoryTracker_dataVersion'
    ];

    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key) && 
          key.startsWith('sensoryTracker_') && 
          !essentialKeys.includes(key)) {
        localStorage.removeItem(key);
      }
    }
  }
};
