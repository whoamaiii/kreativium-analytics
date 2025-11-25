/**
 * @file Storage Migration Script
 *
 * Migrates data from the old `sensoryTracker_*` storage keys to the new
 * `kreativium.local::*` namespace. This ensures backward compatibility
 * while consolidating to a single storage system.
 *
 * The migration is idempotent - it will only run once and mark itself complete.
 */

import { logger } from '@/lib/logger';

// New storage namespace and keys
const STORAGE_NAMESPACE = 'kreativium.local';
const NEW_KEYS = {
  version: `${STORAGE_NAMESPACE}::version`,
  students: `${STORAGE_NAMESPACE}::students`,
  sessions: `${STORAGE_NAMESPACE}::sessions`,
  goals: `${STORAGE_NAMESPACE}::goals`,
  alerts: `${STORAGE_NAMESPACE}::alerts`,
  xp: `${STORAGE_NAMESPACE}::xp`,
  settings: `${STORAGE_NAMESPACE}::settings`,
} as const;

// Old storage keys that need migration
const OLD_KEYS = {
  students: 'sensoryTracker_students',
  entries: 'sensoryTracker_entries',
  goals: 'sensoryTracker_goals',
  alerts: 'sensoryTracker_alerts',
  pinnedAlerts: 'sensoryTracker_pinnedAlerts',
  interventions: 'sensoryTracker_interventions',
  correlations: 'sensoryTracker_correlations',
  dataVersion: 'sensoryTracker_dataVersion',
  preferences: 'sensoryTracker_preferences',
  analyticsProfiles: 'sensoryTracker_analyticsProfiles',
} as const;

const MIGRATION_KEY = `${STORAGE_NAMESPACE}::migration_v1`;

export interface MigrationResult {
  migrated: string[];
  skipped: string[];
  errors: string[];
  alreadyComplete: boolean;
}

/**
 * Check if storage is available (SSR safety)
 */
function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Migrate data from old storage keys to new namespace.
 *
 * This function:
 * 1. Checks if migration has already been completed
 * 2. Maps old keys to new keys
 * 3. Only migrates if the new key doesn't already have data (no overwrite)
 * 4. Marks migration as complete when done
 *
 * @returns MigrationResult with details of what was migrated
 */
export function migrateStorage(): MigrationResult {
  const result: MigrationResult = {
    migrated: [],
    skipped: [],
    errors: [],
    alreadyComplete: false,
  };

  // SSR safety check
  if (!isStorageAvailable()) {
    result.skipped.push('Storage not available (SSR)');
    return result;
  }

  // Check if already migrated
  try {
    if (localStorage.getItem(MIGRATION_KEY) === 'complete') {
      result.alreadyComplete = true;
      return result;
    }
  } catch (e) {
    result.errors.push(`Failed to check migration status: ${e}`);
    return result;
  }

  // Define mappings from old keys to new keys
  const mappings: Array<{ old: string; new: string; transform?: (data: string) => string }> = [
    { old: OLD_KEYS.students, new: NEW_KEYS.students },
    { old: OLD_KEYS.entries, new: NEW_KEYS.sessions }, // entries -> sessions
    { old: OLD_KEYS.goals, new: NEW_KEYS.goals },
    { old: OLD_KEYS.alerts, new: NEW_KEYS.alerts },
  ];

  // Execute migrations
  for (const mapping of mappings) {
    try {
      const oldData = localStorage.getItem(mapping.old);

      if (!oldData) {
        result.skipped.push(`${mapping.old} (no data)`);
        continue;
      }

      // Check if new key already has data (don't overwrite)
      const existingNewData = localStorage.getItem(mapping.new);
      if (existingNewData) {
        result.skipped.push(`${mapping.old} -> ${mapping.new} (new key already has data)`);
        continue;
      }

      // Apply transformation if provided, otherwise copy as-is
      const newData = mapping.transform ? mapping.transform(oldData) : oldData;

      localStorage.setItem(mapping.new, newData);
      result.migrated.push(`${mapping.old} -> ${mapping.new}`);
    } catch (e) {
      result.errors.push(`Failed to migrate ${mapping.old}: ${e}`);
    }
  }

  // Mark migration as complete
  try {
    localStorage.setItem(MIGRATION_KEY, 'complete');
  } catch (e) {
    result.errors.push(`Failed to mark migration complete: ${e}`);
  }

  return result;
}

/**
 * Run migration and log results.
 * Safe to call multiple times - will only migrate once.
 */
export function runStorageMigration(): void {
  try {
    const result = migrateStorage();

    if (result.alreadyComplete) {
      // Silent - migration already done
      return;
    }

    if (result.migrated.length > 0) {
      logger.info('[Storage Migration] Migrated keys:', { keys: result.migrated });
    }

    if (result.skipped.length > 0) {
      logger.debug('[Storage Migration] Skipped keys:', { keys: result.skipped });
    }

    if (result.errors.length > 0) {
      logger.error('[Storage Migration] Errors:', { errors: result.errors });
    }
  } catch (error) {
    logger.error('[Storage Migration] Failed to run migration', { error });
  }
}

/**
 * Check if migration has been completed.
 */
export function isMigrationComplete(): boolean {
  if (!isStorageAvailable()) {
    return false;
  }
  try {
    return localStorage.getItem(MIGRATION_KEY) === 'complete';
  } catch {
    return false;
  }
}

/**
 * Reset migration status (for testing only).
 * This allows the migration to run again.
 */
export function resetMigration(): void {
  if (!isStorageAvailable()) {
    return;
  }
  try {
    localStorage.removeItem(MIGRATION_KEY);
  } catch {
    // Ignore errors
  }
}



