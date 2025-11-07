import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

// Helper to safely check if localStorage is available
function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const test = '__storage_test__';
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T)
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Get from local storage by key
      if (!isLocalStorageAvailable()) {
        return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
      }
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue (support lazy init)
      if (item) return JSON.parse(item);
      return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
    } catch (error) {
      // If error also return initialValue
      logger.warn(`[useLocalStorage] Error reading localStorage key "${key}"`, error as Error);
      return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
    }
  });

  // Listen for changes to this key in other tabs
  useEffect(() => {
    if (!isLocalStorageAvailable()) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        try {
          setStoredValue(e.newValue ? JSON.parse(e.newValue) : (typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue));
        } catch (error) {
          logger.warn(`[useLocalStorage] Error parsing localStorage key "${key}" on change`, error as Error);
          setStoredValue(typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue);
        }
      }
    };

    try {
      window.addEventListener('storage', handleStorageChange);
    } catch (error) {
      logger.warn('[useLocalStorage] Failed to add storage event listener', error as Error);
    }

    return () => {
      try {
        window.removeEventListener('storage', handleStorageChange);
      } catch (error) {
        logger.debug('[useLocalStorage] Failed to remove storage event listener', error as Error);
      }
    };
  }, [key, initialValue]);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      if (isLocalStorageAvailable()) {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      logger.warn(`[useLocalStorage] Error setting localStorage key "${key}"`, error as Error);
    }
  };

  const removeValue = () => {
    try {
      const fallbackValue = typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
      setStoredValue(fallbackValue);
      if (isLocalStorageAvailable()) {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      logger.warn(`[useLocalStorage] Error removing localStorage key "${key}"`, error as Error);
    }
  };

  return [storedValue, setValue, removeValue];
}