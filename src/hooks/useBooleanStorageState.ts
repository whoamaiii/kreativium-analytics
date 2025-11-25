/**
 * @file Boolean storage state hook with consistent serialization.
 *
 * Extracted from ExplanationTabs.tsx to eliminate code duplication.
 * See CODE_QUALITY_AUDIT.md Section 5 for rationale.
 */

import { useStorageState } from '@/lib/storage/useStorageState';

/**
 * Hook for storing boolean values in localStorage with consistent serialization.
 *
 * Uses '1' and '0' for storage to minimize space and avoid JSON parsing overhead.
 *
 * @param key - The storage key
 * @param defaultValue - The default value (default: false)
 * @returns A tuple of [value, setValue] similar to useState
 *
 * @example
 * const [visited, setVisited] = useBooleanStorageState('page.visited', false);
 * setVisited(true);
 */
export function useBooleanStorageState(
  key: string,
  defaultValue = false,
): [boolean, (value: boolean) => void] {
  return useStorageState<boolean>(key, defaultValue, {
    serialize: (v) => (v ? '1' : '0'),
    deserialize: (v) => v === '1',
  });
}

/**
 * Hook for storing a set of visited keys (for tracking UI exploration).
 *
 * @param baseKey - The base storage key
 * @param keys - Array of sub-keys to track
 * @returns Object with visited status and setters for each key
 *
 * @example
 * const { visited, markVisited } = useVisitedTracking('tabs', ['tab1', 'tab2']);
 * if (!visited.tab1) markVisited('tab1');
 */
export function useVisitedTracking<T extends string>(
  baseKey: string,
  keys: readonly T[],
): {
  visited: Record<T, boolean>;
  markVisited: (key: T) => void;
  resetAll: () => void;
} {
  // Create individual storage states for each key
  const states = Object.fromEntries(
    keys.map((key) => {
      const storageKey = `${baseKey}.visited.${key}`;
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [value, setValue] = useBooleanStorageState(storageKey, false);
      return [key, { value, setValue }];
    }),
  ) as Record<T, { value: boolean; setValue: (v: boolean) => void }>;

  const visited = Object.fromEntries(
    keys.map((key) => [key, states[key].value]),
  ) as Record<T, boolean>;

  const markVisited = (key: T) => {
    states[key].setValue(true);
  };

  const resetAll = () => {
    keys.forEach((key) => states[key].setValue(false));
  };

  return { visited, markVisited, resetAll };
}
