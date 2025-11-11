import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { logger } from '@/lib/logger';

/**
 * Configuration for useUrlSync generic hook
 * @template T The type of value being synced to the URL
 */
export interface UseUrlSyncOptions<T> {
  /**
   * Function to read and parse value from URLSearchParams
   * Should return the parsed/validated value or a fallback
   */
  read: (params: URLSearchParams) => T;

  /**
   * Function to write value to URLSearchParams
   * Mutates params in place to represent the value
   */
  write: (value: T, params: URLSearchParams) => void;

  /**
   * Default value when URL param is missing or invalid
   */
  defaultValue: T;

  /**
   * Debounce duration in ms for URL writes (default: 150)
   */
  debounceMs?: number;

  /**
   * Name for debug logging (default: 'useUrlSync')
   */
  loggerName?: string;
}

/**
 * Generic hook for syncing any value to/from URL search parameters
 *
 * Handles:
 * - Reading initial value from URL
 * - Writing value changes back to URL with debouncing
 * - Syncing with browser back/forward navigation
 * - Type-safe state management with generics
 * - Proper cleanup of pending debounced writes
 *
 * @template T The type of value to sync
 * @example
 * ```tsx
 * const [tab, setTab] = useUrlSync({
 *   read: (params) => {
 *     const value = params.get('tab') ?? 'overview';
 *     return validateTab(value);
 *   },
 *   write: (value, params) => params.set('tab', value),
 *   defaultValue: 'overview',
 *   loggerName: 'useSyncedTab',
 * });
 * ```
 */
export function useUrlSync<T>(options: UseUrlSyncOptions<T>): [T, Dispatch<SetStateAction<T>>] {
  const { read, write, defaultValue, debounceMs = 150, loggerName = 'useUrlSync' } = options;

  // Read initial value from current URL
  const getFromLocation = useCallback((): T => {
    try {
      const params = new URLSearchParams(window.location.search);
      const value = read(params);
      try {
        logger.debug(`[${loggerName}] Read from URL`, { value });
      } catch {}
      return value;
    } catch {
      return defaultValue;
    }
  }, [read, defaultValue, loggerName]);

  const [value, setValue] = useState<T>(() => getFromLocation());

  // Sync with back/forward navigation
  useEffect(() => {
    const onPop = () => {
      const next = getFromLocation();
      try {
        logger.debug(`[${loggerName}] popstate -> sync`, { value: next });
      } catch {}
      setValue(next);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [getFromLocation, loggerName]);

  // Debounced URL writer
  const debounceTimer = useRef<number | undefined>(undefined);
  const writeToUrl = useCallback(
    (nextValue: T) => {
      const doWrite = () => {
        try {
          const url = new URL(window.location.href);
          write(nextValue, url.searchParams);
          window.history.replaceState(window.history.state, '', url.toString());
          try {
            logger.debug(`[${loggerName}] URL sync via history.replaceState`, {
              value: nextValue,
            });
          } catch {}
        } catch {
          // no-op: never throw in URL sync
        }
      };
      if (debounceTimer.current) {
        window.clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = window.setTimeout(doWrite, debounceMs);
    },
    [debounceMs, write, loggerName],
  );

  // When value changes (from UI), write to URL
  useEffect(() => {
    writeToUrl(value);
  }, [value, writeToUrl]);

  // Cleanup any pending debounce on unmount to avoid post-unmount writes
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        try {
          window.clearTimeout(debounceTimer.current);
        } catch {}
        debounceTimer.current = undefined;
      }
    };
  }, []);

  return [value, setValue];
}
