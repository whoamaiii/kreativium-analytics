import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { safeJsonParse, safeJsonStringify, safeLocalStorageGet, safeLocalStorageSet, safeLocalStorageRemove } from '@/lib/utils/errorHandling';

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T)
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Get from local storage by key
    const item = typeof window !== 'undefined' && window.localStorage
      ? safeLocalStorageGet(key, '', `useLocalStorage.init.${key}`)
      : null;

    // Parse stored json or if none return initialValue (support lazy init)
    if (item) {
      const parsed = safeJsonParse<T>(item, null as any, `useLocalStorage.parse.${key}`);
      if (parsed !== null) return parsed;
    }

    return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
  });

  // Listen for changes to this key in other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        const parsed = e.newValue
          ? safeJsonParse<T>(e.newValue, initialValue, `useLocalStorage.change.${key}`)
          : initialValue;
        setStoredValue(parsed);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    // Allow value to be a function so we have the same API as useState
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    // Save state
    setStoredValue(valueToStore);
    // Save to local storage
    if (typeof window !== 'undefined' && window.localStorage) {
      const json = safeJsonStringify(valueToStore, '{}', `useLocalStorage.set.${key}`);
      safeLocalStorageSet(key, json, `useLocalStorage.set.${key}`);
    }
  };

  const removeValue = () => {
    setStoredValue(initialValue);
    if (typeof window !== 'undefined' && window.localStorage) {
      safeLocalStorageRemove(key, `useLocalStorage.remove.${key}`);
    }
  };

  return [storedValue, setValue, removeValue];
}