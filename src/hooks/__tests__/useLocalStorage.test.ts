import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useLocalStorage,
  isString,
  isNumber,
  isBoolean,
  isStringArray,
  isNumberArray,
  oneOf,
} from '../useLocalStorage';

describe('useLocalStorage Hook', () => {
  const TEST_KEY = 'test-key';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('returns initial value when localStorage is empty', () => {
      const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'initial'));

      expect(result.current[0]).toBe('initial');
    });

    it('returns parsed value from localStorage when it exists', () => {
      localStorage.setItem(TEST_KEY, JSON.stringify('stored-value'));

      const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'initial'));

      expect(result.current[0]).toBe('stored-value');
    });

    it('handles complex initial values', () => {
      const complexValue = {
        user: { id: 1, name: 'Test' },
        settings: { theme: 'dark', notifications: true },
        data: [1, 2, 3],
      };

      const { result } = renderHook(() => useLocalStorage(TEST_KEY, complexValue));

      expect(result.current[0]).toEqual(complexValue);
    });

    it('uses lazy initial value function', () => {
      const expensiveInit = vi.fn(() => ({ computed: true }));

      const { result } = renderHook(() => useLocalStorage(TEST_KEY, expensiveInit));

      expect(expensiveInit).toHaveBeenCalledTimes(1);
      expect(result.current[0]).toEqual({ computed: true });
    });
  });

  describe('Setting values', () => {
    it('updates value and localStorage', () => {
      const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'initial'));

      act(() => {
        result.current[1]('updated');
      });

      expect(result.current[0]).toBe('updated');
      expect(localStorage.getItem(TEST_KEY)).toBe(JSON.stringify('updated'));
    });

    it('handles function updates', () => {
      const { result } = renderHook(() => useLocalStorage(TEST_KEY, 0));

      act(() => {
        result.current[1]((prev) => prev + 1);
      });

      expect(result.current[0]).toBe(1);

      act(() => {
        result.current[1]((prev) => prev * 2);
      });

      expect(result.current[0]).toBe(2);
    });

    it('stores complex objects correctly', () => {
      const { result } = renderHook(() =>
        useLocalStorage<{ count: number; items: string[] }>(TEST_KEY, { count: 0, items: [] }),
      );

      const newValue = { count: 5, items: ['a', 'b', 'c'] };

      act(() => {
        result.current[1](newValue);
      });

      expect(result.current[0]).toEqual(newValue);
      expect(JSON.parse(localStorage.getItem(TEST_KEY)!)).toEqual(newValue);
    });

    it('handles null and undefined values', () => {
      const { result } = renderHook(() => useLocalStorage<string | null>(TEST_KEY, null));

      expect(result.current[0]).toBeNull();

      act(() => {
        result.current[1]('value');
      });

      expect(result.current[0]).toBe('value');

      act(() => {
        result.current[1](null);
      });

      expect(result.current[0]).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('falls back to initial value on parse error', () => {
      localStorage.setItem(TEST_KEY, 'invalid-json{');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'fallback'));

      expect(result.current[0]).toBe('fallback');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('handles localStorage quota exceeded', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'initial'));

      act(() => {
        result.current[1]('new-value');
      });

      // Value should still update in state even if localStorage fails
      expect(result.current[0]).toBe('new-value');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      setItemSpy.mockRestore();
    });

    it('handles localStorage not available', () => {
      const originalLocalStorage = global.localStorage;
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true,
      });

      const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'default'));

      expect(result.current[0]).toBe('default');

      act(() => {
        result.current[1]('updated');
      });

      expect(result.current[0]).toBe('updated');

      global.localStorage = originalLocalStorage;
    });
  });

  describe('Synchronization', () => {
    it('syncs across multiple hooks with same key', () => {
      const { result: hook1 } = renderHook(() => useLocalStorage(TEST_KEY, 'initial'));

      const { result: hook2 } = renderHook(() => useLocalStorage(TEST_KEY, 'initial'));

      act(() => {
        hook1.current[1]('updated-from-hook1');
      });

      // Both hooks should have the updated value
      expect(hook1.current[0]).toBe('updated-from-hook1');
      expect(hook2.current[0]).toBe('updated-from-hook1');
    });

    it('responds to storage events from other tabs', () => {
      const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'initial'));

      // Simulate storage event from another tab
      act(() => {
        localStorage.setItem(TEST_KEY, JSON.stringify('from-other-tab'));
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: TEST_KEY,
            newValue: JSON.stringify('from-other-tab'),
            storageArea: localStorage,
          }),
        );
      });

      expect(result.current[0]).toBe('from-other-tab');
    });

    it('ignores storage events for different keys', () => {
      const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'initial'));

      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'different-key',
            newValue: JSON.stringify('other-value'),
            storageArea: localStorage,
          }),
        );
      });

      expect(result.current[0]).toBe('initial');
    });

    it('handles storage clear events', () => {
      localStorage.setItem(TEST_KEY, JSON.stringify('stored'));

      const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'default'));

      expect(result.current[0]).toBe('stored');

      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: null,
            newValue: null,
            storageArea: localStorage,
          }),
        );
      });

      expect(result.current[0]).toBe('default');
    });
  });

  describe('Type safety', () => {
    it('maintains type through operations', () => {
      interface User {
        id: number;
        name: string;
        preferences: {
          theme: 'light' | 'dark';
          notifications: boolean;
        };
      }

      const defaultUser: User = {
        id: 1,
        name: 'Test',
        preferences: {
          theme: 'light',
          notifications: true,
        },
      };

      const { result } = renderHook(() => useLocalStorage<User>('user', defaultUser));

      expect(result.current[0].id).toBe(1);
      expect(result.current[0].preferences.theme).toBe('light');

      act(() => {
        result.current[1]((prev) => ({
          ...prev,
          preferences: {
            ...prev.preferences,
            theme: 'dark',
          },
        }));
      });

      expect(result.current[0].preferences.theme).toBe('dark');
    });
  });

  describe('Cleanup', () => {
    it('removes event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useLocalStorage(TEST_KEY, 'value'));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('does not cause unnecessary re-renders', () => {
      const renderSpy = vi.fn();

      const { result, rerender } = renderHook(() => {
        renderSpy();
        return useLocalStorage(TEST_KEY, 'initial');
      });

      // Initial render
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Setting same value should not trigger re-render
      act(() => {
        result.current[1]('initial');
      });

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Setting different value should trigger re-render
      act(() => {
        result.current[1]('updated');
      });

      expect(renderSpy).toHaveBeenCalledTimes(2);

      // Re-rendering parent should not reset value
      rerender();
      expect(result.current[0]).toBe('updated');
    });
  });

  describe('Validator functionality', () => {
    type PracticeMode = 'easy' | 'medium' | 'hard';

    it('uses default value when validator rejects stored value', () => {
      // Store invalid value
      localStorage.setItem(TEST_KEY, JSON.stringify('invalid-mode'));

      const isPracticeMode = (v: unknown): v is PracticeMode =>
        typeof v === 'string' && ['easy', 'medium', 'hard'].includes(v);

      const { result } = renderHook(() =>
        useLocalStorage<PracticeMode>(TEST_KEY, 'medium', isPracticeMode),
      );

      expect(result.current[0]).toBe('medium');
    });

    it('accepts valid stored value that passes validation', () => {
      // Store valid value
      localStorage.setItem(TEST_KEY, JSON.stringify('hard'));

      const isPracticeMode = (v: unknown): v is PracticeMode =>
        typeof v === 'string' && ['easy', 'medium', 'hard'].includes(v);

      const { result } = renderHook(() =>
        useLocalStorage<PracticeMode>(TEST_KEY, 'medium', isPracticeMode),
      );

      expect(result.current[0]).toBe('hard');
    });

    it('validates values from storage events', () => {
      const isPracticeMode = (v: unknown): v is PracticeMode =>
        typeof v === 'string' && ['easy', 'medium', 'hard'].includes(v);

      const { result } = renderHook(() =>
        useLocalStorage<PracticeMode>(TEST_KEY, 'medium', isPracticeMode),
      );

      // Valid storage event
      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: TEST_KEY,
            newValue: JSON.stringify('easy'),
            storageArea: localStorage,
          }),
        );
      });

      expect(result.current[0]).toBe('easy');

      // Invalid storage event - should fall back to default
      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: TEST_KEY,
            newValue: JSON.stringify('invalid'),
            storageArea: localStorage,
          }),
        );
      });

      expect(result.current[0]).toBe('medium');
    });

    it('works without validator (backward compatible)', () => {
      localStorage.setItem(TEST_KEY, JSON.stringify('any-value'));

      const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'default'));

      expect(result.current[0]).toBe('any-value');
    });
  });

  describe('Type guard helpers', () => {
    describe('isString', () => {
      it('validates strings correctly', () => {
        expect(isString('hello')).toBe(true);
        expect(isString('')).toBe(true);
        expect(isString(123)).toBe(false);
        expect(isString(null)).toBe(false);
        expect(isString(undefined)).toBe(false);
        expect(isString({})).toBe(false);
      });
    });

    describe('isNumber', () => {
      it('validates numbers correctly', () => {
        expect(isNumber(123)).toBe(true);
        expect(isNumber(0)).toBe(true);
        expect(isNumber(-42.5)).toBe(true);
        expect(isNumber('123')).toBe(false);
        expect(isNumber(null)).toBe(false);
        expect(isNumber(NaN)).toBe(true); // NaN is technically a number type
      });
    });

    describe('isBoolean', () => {
      it('validates booleans correctly', () => {
        expect(isBoolean(true)).toBe(true);
        expect(isBoolean(false)).toBe(true);
        expect(isBoolean(1)).toBe(false);
        expect(isBoolean('true')).toBe(false);
        expect(isBoolean(null)).toBe(false);
      });
    });

    describe('isStringArray', () => {
      it('validates string arrays correctly', () => {
        expect(isStringArray(['a', 'b', 'c'])).toBe(true);
        expect(isStringArray([])).toBe(true);
        expect(isStringArray(['a', 1, 'c'])).toBe(false);
        expect(isStringArray([1, 2, 3])).toBe(false);
        expect(isStringArray('not-array')).toBe(false);
        expect(isStringArray(null)).toBe(false);
      });
    });

    describe('isNumberArray', () => {
      it('validates number arrays correctly', () => {
        expect(isNumberArray([1, 2, 3])).toBe(true);
        expect(isNumberArray([])).toBe(true);
        expect(isNumberArray([1, '2', 3])).toBe(false);
        expect(isNumberArray(['a', 'b'])).toBe(false);
        expect(isNumberArray('not-array')).toBe(false);
        expect(isNumberArray(null)).toBe(false);
      });
    });

    describe('oneOf', () => {
      it('creates validator for allowed values', () => {
        const isTheme = oneOf(['light', 'dark', 'auto'] as const);

        expect(isTheme('light')).toBe(true);
        expect(isTheme('dark')).toBe(true);
        expect(isTheme('auto')).toBe(true);
        expect(isTheme('invalid')).toBe(false);
        expect(isTheme(null)).toBe(false);
        expect(isTheme(123)).toBe(false);
      });

      it('works with numbers', () => {
        const isValidPort = oneOf([80, 443, 8080, 8443] as const);

        expect(isValidPort(80)).toBe(true);
        expect(isValidPort(443)).toBe(true);
        expect(isValidPort(9000)).toBe(false);
        expect(isValidPort('80')).toBe(false);
      });

      it('can be used with useLocalStorage', () => {
        type Theme = 'light' | 'dark' | 'auto';
        const isTheme = oneOf<Theme>(['light', 'dark', 'auto'] as const);

        localStorage.setItem(TEST_KEY, JSON.stringify('dark'));

        const { result } = renderHook(() => useLocalStorage<Theme>(TEST_KEY, 'light', isTheme));

        expect(result.current[0]).toBe('dark');

        // Try to set invalid value manually in localStorage
        act(() => {
          window.dispatchEvent(
            new StorageEvent('storage', {
              key: TEST_KEY,
              newValue: JSON.stringify('invalid-theme'),
              storageArea: localStorage,
            }),
          );
        });

        // Should fall back to default
        expect(result.current[0]).toBe('light');
      });
    });
  });

  describe('Remove value functionality', () => {
    it('removes value from localStorage and resets to default', () => {
      const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'default-value'));

      // Set a value
      act(() => {
        result.current[1]('stored-value');
      });

      expect(result.current[0]).toBe('stored-value');
      expect(localStorage.getItem(TEST_KEY)).toBe(JSON.stringify('stored-value'));

      // Remove value
      act(() => {
        result.current[2](); // Third element is removeValue
      });

      expect(result.current[0]).toBe('default-value');
      expect(localStorage.getItem(TEST_KEY)).toBeNull();
    });

    it('removes value and uses lazy initial value', () => {
      const lazyInit = vi.fn(() => ({ computed: 'lazy-value' }));

      const { result } = renderHook(() => useLocalStorage(TEST_KEY, lazyInit));

      // Set a value
      act(() => {
        result.current[1]({ computed: 'new-value' });
      });

      expect(result.current[0]).toEqual({ computed: 'new-value' });

      // Remove value - should call lazy init again
      act(() => {
        result.current[2]();
      });

      expect(result.current[0]).toEqual({ computed: 'lazy-value' });
      expect(lazyInit).toHaveBeenCalled();
    });
  });
});
