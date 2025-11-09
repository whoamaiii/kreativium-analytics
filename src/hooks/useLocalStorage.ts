import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

/**
 * Persistent state hook using localStorage with type safety
 *
 * @template T - The type of the value to store
 * @param key - localStorage key
 * @param initialValue - default value if key doesn't exist or validation fails
 * @param validator - optional validator function for type checking stored values
 * @returns [value, setValue, removeValue] tuple
 *
 * @example
 * // Simple usage
 * const [theme, setTheme] = useLocalStorage('theme', 'light');
 *
 * @example
 * // With validator
 * const isPracticeMode = (v: unknown): v is PracticeMode =>
 *   typeof v === 'string' && ['mixed', 'easy', 'hard'].includes(v);
 *
 * const [practice, setPractice, removePractice] = useLocalStorage(
 *   'practice-mode',
 *   'mixed',
 *   isPracticeMode
 * );
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
  validator?: (value: unknown) => value is T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // Helper to get the initial value (supports lazy initialization)
  const getInitialValue = () => {
    return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
  };

  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Get from local storage by key
      const item = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(key) : null;
      // Parse stored json or if none return initialValue (support lazy init)
      if (item) {
        const parsed = JSON.parse(item);
        // Validate parsed value if validator provided
        if (!validator || validator(parsed)) {
          return parsed;
        }
        logger.warn(`localStorage key "${key}" validation failed, using default value`);
      }
      return getInitialValue();
    } catch (error) {
      // If error also return initialValue
      logger.error(`Error reading localStorage key "${key}":`, error);
      return getInitialValue();
    }
  });

  // Listen for changes to this key in other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        try {
          if (e.newValue) {
            const parsed = JSON.parse(e.newValue);
            // Validate parsed value if validator provided
            if (!validator || validator(parsed)) {
              setStoredValue(parsed);
            } else {
              logger.warn(`localStorage key "${key}" validation failed on storage event`);
              setStoredValue(getInitialValue());
            }
          } else {
            setStoredValue(getInitialValue());
          }
        } catch (error) {
          logger.error(`Error parsing localStorage key "${key}" on change:`, error);
          setStoredValue(getInitialValue());
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue, validator]);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      logger.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  const removeValue = () => {
    try {
      setStoredValue(getInitialValue());
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      logger.error(`Error removing localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, removeValue];
}

/**
 * Type guard helpers for common types
 */

export const isString = (value: unknown): value is string => typeof value === 'string';

export const isNumber = (value: unknown): value is number => typeof value === 'number';

export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'number');

/**
 * Create a validator that checks if value is one of the allowed values
 *
 * @example
 * const isTheme = oneOf(['light', 'dark', 'auto'] as const);
 * const [theme, setTheme] = useLocalStorage('theme', 'light', isTheme);
 */
export function oneOf<T extends string | number>(allowedValues: readonly T[]) {
  return (value: unknown): value is T => {
    return allowedValues.includes(value as T);
  };
}