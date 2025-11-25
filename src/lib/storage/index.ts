/**
 * @file Storage module exports.
 *
 * This is the unified storage API for Kreativium.
 * Import from '@/lib/storage' for all storage operations.
 */

import { storageUtils } from '@/lib/storageUtils';

// Main service
export { storageService, StorageService, createStudent } from './storageService';
export type { StorageRepositories, SessionStats } from './storageService';

// Types
export type {
  UUID,
  Student,
  EmotionLevel,
  EmotionEntry,
  SensoryEntry,
  EnvironmentalEntry,
  SessionQuality,
  TrackingSession,
  GoalMilestone,
  GoalDataPoint,
  Goal,
  Alert,
  XpSnapshot,
  BackupSnapshot,
} from './types';

// Keys
export { STORAGE_KEYS, STORAGE_NAMESPACE } from './storageKeys';
export type { StorageKey } from './storageKeys';

// Events
export { emitStorageEvent, subscribeStorageEvent } from './storageEvents';

// Migration
export { runStorageMigration, migrateStorage, isMigrationComplete } from './migration';

// Legacy keys (for backward compatibility during migration)
export { STORAGE_KEYS as LEGACY_STORAGE_KEYS } from './keys';

// Storage helpers (for non-React code)
export {
  storageGet,
  storageSet,
  storageRemove,
  storageKeys,
  storageClearPrefix,
  storageClearKeys,
  isStorageAvailable,
} from './storageHelpers';

// Stats
export { getStorageStats } from './storageStats';
export type { StorageStats } from './storageStats';

/**
 * Safe localStorage getter with SSR safety.
 * @deprecated Use storageGet from './storageHelpers' or storageService instead.
 */
export function safeGet(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

/**
 * Safe localStorage setter with quota handling.
 * @deprecated Use storageSet from './storageHelpers' or storageService instead.
 */
export function safeSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') {
      storageUtils.safeSetItem(key, value);
    }
  } catch {
    // Silent failure for backward compatibility
  }
}

