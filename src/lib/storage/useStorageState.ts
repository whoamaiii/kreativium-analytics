/**
 * @file Type-safe localStorage hook with cross-tab synchronization
 *
 * Provides a React hook that works like useState but persists to localStorage.
 * Eliminates the need for manual try-catch blocks and JSON serialization.
 *
 * Features:
 * - Type-safe with TypeScript generics
 * - Automatic JSON serialization/deserialization
 * - Cross-tab synchronization via storage events
 * - Graceful error handling (never crashes on quota/access issues)
 * - Custom serializer support for complex types
 * - SSR-safe (works in non-browser environments)
 *
 * @example
 * // Basic usage
 * const [theme, setTheme] = useStorageState('app:theme', 'light')
 *
 * @example
 * // With validation
 * const [mode, setMode] = useStorageState('game:mode', 'easy', {
 *   deserialize: (value) => {
 *     const parsed = JSON.parse(value)
 *     return ['easy', 'medium', 'hard'].includes(parsed) ? parsed : 'easy'
 *   }
 * })
 *
 * @example
 * // With custom serializer
 * const [date, setDate] = useStorageState('last-visit', new Date(), {
 *   serialize: (date) => date.toISOString(),
 *   deserialize: (str) => new Date(str)
 * })
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { logger } from '@/lib/logger'

/**
 * Options for customizing storage behavior
 */
export interface StorageOptions<T> {
  /**
   * Storage backend to use (default: localStorage)
   * Can be sessionStorage or a custom Storage implementation
   */
  storage?: Storage

  /**
   * Custom serializer (default: JSON.stringify)
   * Use for types that need special handling (Date, Map, Set, etc.)
   */
  serialize?: (value: T) => string

  /**
   * Custom deserializer (default: JSON.parse)
   * Use for validation or type coercion
   */
  deserialize?: (value: string) => T

  /**
   * Error handler called when storage operations fail
   * Useful for logging or fallback behavior
   */
  onError?: (error: unknown, operation: 'load' | 'save' | 'sync') => void

  /**
   * Whether to sync state across browser tabs (default: true)
   * Uses storage events to keep state in sync
   */
  syncTabs?: boolean
}

/**
 * Type-safe localStorage hook that works like useState
 *
 * @param key - Storage key (should be from STORAGE_KEYS for type safety)
 * @param defaultValue - Initial value if key doesn't exist in storage
 * @param options - Optional configuration for storage behavior
 * @returns [state, setState] tuple identical to useState
 *
 * @example
 * const [count, setCount] = useStorageState('counter', 0)
 * setCount(count + 1) // Updates both state and localStorage
 *
 * @example
 * const [user, setUser] = useStorageState('user', null, {
 *   onError: (error) => console.error('Storage failed:', error)
 * })
 */
export function useStorageState<T>(
  key: string,
  defaultValue: T,
  options: StorageOptions<T> = {}
): [T, (value: T | ((prev: T) => T)) => void] {
  const {
    storage = typeof window !== 'undefined' ? window.localStorage : undefined,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    onError,
    syncTabs = true,
  } = options

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true)

  // Initialize state from storage or default value
  const [state, setState] = useState<T>(() => {
    // SSR safety: return default if no storage available
    if (!storage) {
      return defaultValue
    }

    try {
      const stored = storage.getItem(key)
      if (stored !== null) {
        return deserialize(stored)
      }
    } catch (error) {
      logger.warn(`[useStorageState] Failed to load "${key}" from storage`, error)
      onError?.(error, 'load')
    }

    return defaultValue
  })

  // Memoized setter that updates both state and storage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      if (!isMountedRef.current) {
        return // Don't update if component unmounted
      }

      setState((prev) => {
        // Resolve function-based updates
        const nextValue = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value

        // Persist to storage
        if (storage) {
          try {
            const serialized = serialize(nextValue)
            storage.setItem(key, serialized)
          } catch (error) {
            logger.error(`[useStorageState] Failed to save "${key}" to storage`, error)
            onError?.(error, 'save')
          }
        }

        return nextValue
      })
    },
    [key, serialize, storage, onError]
  )

  // Sync state across browser tabs using storage events
  useEffect(() => {
    if (!storage || !syncTabs || typeof window === 'undefined') {
      return
    }

    const handleStorageChange = (e: StorageEvent) => {
      // Only respond to changes to our key from other tabs
      if (e.key !== key || e.storageArea !== storage) {
        return
      }

      try {
        if (e.newValue !== null && isMountedRef.current) {
          const newValue = deserialize(e.newValue)
          setState(newValue)
        } else if (e.newValue === null && isMountedRef.current) {
          // Key was deleted in another tab
          setState(defaultValue)
        }
      } catch (error) {
        logger.warn(`[useStorageState] Failed to sync "${key}" from other tab`, error)
        onError?.(error, 'sync')
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key, defaultValue, deserialize, storage, syncTabs, onError])

  // Track mount status
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  return [state, setValue]
}

/**
 * Hook for sessionStorage (same API as useStorageState)
 * Data persists only for the current browser session
 *
 * @example
 * const [tempData, setTempData] = useSessionState('temp', null)
 */
export function useSessionState<T>(
  key: string,
  defaultValue: T,
  options: Omit<StorageOptions<T>, 'storage' | 'syncTabs'> = {}
): [T, (value: T | ((prev: T) => T)) => void] {
  return useStorageState(key, defaultValue, {
    ...options,
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    syncTabs: false, // sessionStorage doesn't sync across tabs
  })
}

/**
 * Hook for boolean flags in localStorage
 * Convenience wrapper with optimized serialization
 *
 * @example
 * const [isDarkMode, setIsDarkMode] = useStorageFlag('darkMode', false)
 * setIsDarkMode(true)
 */
export function useStorageFlag(
  key: string,
  defaultValue: boolean,
  options: Omit<StorageOptions<boolean>, 'serialize' | 'deserialize'> = {}
): [boolean, (value: boolean | ((prev: boolean) => boolean)) => void] {
  return useStorageState(key, defaultValue, {
    ...options,
    serialize: (value) => String(value),
    deserialize: (value) => value === 'true',
  })
}

/**
 * Utility to remove an item from storage
 * Useful for "clear" or "reset" functionality
 *
 * @example
 * const removeUser = useStorageRemove('user')
 * removeUser() // Clears the 'user' key from localStorage
 */
export function useStorageRemove(
  key: string,
  options: Pick<StorageOptions<unknown>, 'storage'> = {}
): () => void {
  const storage = options.storage || (typeof window !== 'undefined' ? window.localStorage : undefined)

  return useCallback(() => {
    if (!storage) {
      return
    }

    try {
      storage.removeItem(key)
    } catch (error) {
      logger.error(`[useStorageRemove] Failed to remove "${key}" from storage`, error)
    }
  }, [key, storage])
}

/**
 * Get all keys matching a prefix
 * Useful for cleanup or migration operations
 *
 * @example
 * const analyticsKeys = getStorageKeys('analytics:')
 * // Returns: ['analytics:cache', 'analytics:config', ...]
 */
export function getStorageKeys(
  prefix?: string,
  storage: Storage = typeof window !== 'undefined' ? window.localStorage : ({} as Storage)
): string[] {
  if (!storage.length) {
    return []
  }

  const keys: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key && (!prefix || key.startsWith(prefix))) {
      keys.push(key)
    }
  }
  return keys
}

/**
 * Clear all storage keys matching a prefix
 * Useful for logout or reset functionality
 *
 * @example
 * clearStorageKeys('user:') // Clears all user-related data
 */
export function clearStorageKeys(
  prefix: string,
  storage: Storage = typeof window !== 'undefined' ? window.localStorage : ({} as Storage)
): void {
  const keys = getStorageKeys(prefix, storage)
  keys.forEach((key) => {
    try {
      storage.removeItem(key)
    } catch (error) {
      logger.warn(`Failed to clear storage key: ${key}`, error)
    }
  })
}
