/**
 * @file Storage keys for the unified Kreativium storage service.
 *
 * All keys use the `kreativium.local::` namespace to avoid conflicts
 * with legacy `sensoryTracker_*` keys.
 */

export const STORAGE_NAMESPACE = 'kreativium.local';

export const STORAGE_KEYS = {
  version: `${STORAGE_NAMESPACE}::version`,
  students: `${STORAGE_NAMESPACE}::students`,
  sessions: `${STORAGE_NAMESPACE}::sessions`,
  goals: `${STORAGE_NAMESPACE}::goals`,
  alerts: `${STORAGE_NAMESPACE}::alerts`,
  xp: `${STORAGE_NAMESPACE}::xp`,
  settings: `${STORAGE_NAMESPACE}::settings`,
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];



