/**
 * @file Storage helper functions for non-React code
 *
 * Provides type-safe storage operations for utility modules and classes
 * that cannot use React hooks. Wraps localStorage/sessionStorage with
 * error handling and SSR safety.
 *
 * For React components, use useStorageState hook instead.
 */

import { logger } from '@/lib/logger'

/** Storage backend interface */
export interface StorageBackend {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  clear(): void
  readonly length: number
  key(index: number): string | null
}

/**
 * Get default localStorage with SSR safety
 */
function getStorage(useSession = false): StorageBackend | null {
  if (typeof window === 'undefined') {
    return null
  }
  return useSession ? window.sessionStorage : window.localStorage
}

/**
 * Safely get an item from storage with JSON parsing
 */
export function storageGet<T>(
  key: string,
  defaultValue: T,
  options: {
    storage?: StorageBackend | null
    deserialize?: (value: string) => T
  } = {}
): T {
  const storage = options.storage ?? getStorage()
  if (!storage) {
    return defaultValue
  }

  try {
    const stored = storage.getItem(key)
    if (stored === null) {
      return defaultValue
    }

    if (options.deserialize) {
      return options.deserialize(stored)
    }

    return JSON.parse(stored) as T
  } catch (error) {
    logger.warn(`[storageHelpers] Failed to get "${key}"`, error)
    return defaultValue
  }
}

/**
 * Safely set an item in storage with JSON serialization
 */
export function storageSet<T>(
  key: string,
  value: T,
  options: {
    storage?: StorageBackend | null
    serialize?: (value: T) => string
  } = {}
): boolean {
  const storage = options.storage ?? getStorage()
  if (!storage) {
    return false
  }

  try {
    const serialized = options.serialize ? options.serialize(value) : JSON.stringify(value)
    storage.setItem(key, serialized)
    return true
  } catch (error) {
    logger.error(`[storageHelpers] Failed to set "${key}"`, error)
    return false
  }
}

/**
 * Safely remove an item from storage
 */
export function storageRemove(
  key: string,
  options: {
    storage?: StorageBackend | null
  } = {}
): boolean {
  const storage = options.storage ?? getStorage()
  if (!storage) {
    return false
  }

  try {
    storage.removeItem(key)
    return true
  } catch (error) {
    logger.warn(`[storageHelpers] Failed to remove "${key}"`, error)
    return false
  }
}

/**
 * Get all keys from storage (or matching a prefix)
 */
export function storageKeys(
  prefix?: string,
  options: {
    storage?: StorageBackend | null
  } = {}
): string[] {
  const storage = options.storage ?? getStorage()
  if (!storage) {
    return []
  }

  try {
    const keys: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key && (!prefix || key.startsWith(prefix) || key.includes(prefix))) {
        keys.push(key)
      }
    }
    return keys
  } catch (error) {
    logger.warn('[storageHelpers] Failed to get storage keys', error)
    return []
  }
}

/**
 * Clear all keys matching a prefix
 */
export function storageClearPrefix(
  prefix: string,
  options: {
    storage?: StorageBackend | null
  } = {}
): string[] {
  const storage = options.storage ?? getStorage()
  if (!storage) {
    return []
  }

  const keysToRemove = storageKeys(prefix, options)
  const removed: string[] = []

  keysToRemove.forEach((key) => {
    try {
      storage.removeItem(key)
      removed.push(key)
    } catch (error) {
      logger.warn(`[storageHelpers] Failed to remove key: ${key}`, error)
    }
  })

  return removed
}

/**
 * Clear multiple specific keys
 */
export function storageClearKeys(
  keys: string[],
  options: {
    storage?: StorageBackend | null
  } = {}
): string[] {
  const storage = options.storage ?? getStorage()
  if (!storage) {
    return []
  }

  const removed: string[] = []
  keys.forEach((key) => {
    try {
      storage.removeItem(key)
      removed.push(key)
    } catch (error) {
      logger.warn(`[storageHelpers] Failed to remove key: ${key}`, error)
    }
  })

  return removed
}

/**
 * Check if storage is available
 */
export function isStorageAvailable(useSession = false): boolean {
  const storage = getStorage(useSession)
  if (!storage) {
    return false
  }

  try {
    const testKey = '__storage_test__'
    storage.setItem(testKey, 'test')
    storage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}
