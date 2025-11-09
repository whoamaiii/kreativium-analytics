/**
 * Tests for useAnalyticsCache hook
 *
 * Tests cache management, refresh logic, and data change detection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useAnalyticsCache,
  useDataChangeDetection,
  type AnalyticsDataCounts,
} from '../useAnalyticsCache';
import type { TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';

// ============================================================================
// Test Setup
// ============================================================================

describe('useAnalyticsCache', () => {
  let eventListeners: Map<string, EventListener[]>;

  beforeEach(() => {
    vi.useFakeTimers();
    eventListeners = new Map();

    // Mock window.addEventListener and removeEventListener
    vi.spyOn(window, 'addEventListener').mockImplementation((event, listener) => {
      const listeners = eventListeners.get(event) || [];
      listeners.push(listener as EventListener);
      eventListeners.set(event, listeners);
    });

    vi.spyOn(window, 'removeEventListener').mockImplementation((event, listener) => {
      const listeners = eventListeners.get(event) || [];
      const index = listeners.indexOf(listener as EventListener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
    eventListeners.clear();
  });

  // Helper to dispatch custom events
  const dispatchCacheEvent = (eventName: string, detail?: { studentId?: string }) => {
    const listeners = eventListeners.get(eventName) || [];
    const event = new CustomEvent(eventName, { detail });
    listeners.forEach((listener) => listener(event));
  };

  describe('Initial State', () => {
    it('initializes with no new insights', () => {
      const { result } = renderHook(() => useAnalyticsCache());

      expect(result.current.hasNewInsights).toBe(false);
      expect(result.current.pendingRefresh).toBe(false);
    });

    it('registers event listeners for cache clear events', () => {
      renderHook(() => useAnalyticsCache());

      expect(window.addEventListener).toHaveBeenCalledWith(
        'analytics:cache:clear',
        expect.any(Function)
      );
      expect(window.addEventListener).toHaveBeenCalledWith(
        'analytics:cache:clear:student',
        expect.any(Function)
      );
    });

    it('unregisters event listeners on unmount', () => {
      const { unmount } = renderHook(() => useAnalyticsCache());

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith(
        'analytics:cache:clear',
        expect.any(Function)
      );
      expect(window.removeEventListener).toHaveBeenCalledWith(
        'analytics:cache:clear:student',
        expect.any(Function)
      );
    });
  });

  describe('Cache Clear Events', () => {
    it('sets hasNewInsights on global cache clear', () => {
      const { result } = renderHook(() => useAnalyticsCache());

      act(() => {
        dispatchCacheEvent('analytics:cache:clear');
      });

      expect(result.current.hasNewInsights).toBe(true);
    });

    it('sets hasNewInsights on student cache clear', () => {
      const { result } = renderHook(() => useAnalyticsCache());

      act(() => {
        dispatchCacheEvent('analytics:cache:clear:student');
      });

      expect(result.current.hasNewInsights).toBe(true);
    });

    it('calls onCacheClear callback when cache is cleared', () => {
      const onCacheClear = vi.fn();
      renderHook(() => useAnalyticsCache({ onCacheClear }));

      act(() => {
        dispatchCacheEvent('analytics:cache:clear');
      });

      expect(onCacheClear).toHaveBeenCalledTimes(1);
    });

    it('ignores cache clear events for different student IDs', () => {
      const onCacheClear = vi.fn();
      const { result } = renderHook(() =>
        useAnalyticsCache({ studentId: 'student-1', onCacheClear })
      );

      act(() => {
        dispatchCacheEvent('analytics:cache:clear:student', { studentId: 'student-2' });
      });

      expect(result.current.hasNewInsights).toBe(false);
      expect(onCacheClear).not.toHaveBeenCalled();
    });

    it('responds to cache clear events for matching student ID', () => {
      const onCacheClear = vi.fn();
      const { result } = renderHook(() =>
        useAnalyticsCache({ studentId: 'student-1', onCacheClear })
      );

      act(() => {
        dispatchCacheEvent('analytics:cache:clear:student', { studentId: 'student-1' });
      });

      expect(result.current.hasNewInsights).toBe(true);
      expect(onCacheClear).toHaveBeenCalledTimes(1);
    });

    it('responds to cache clear events without student ID when studentId is set', () => {
      const onCacheClear = vi.fn();
      const { result } = renderHook(() =>
        useAnalyticsCache({ studentId: 'student-1', onCacheClear })
      );

      act(() => {
        dispatchCacheEvent('analytics:cache:clear:student');
      });

      expect(result.current.hasNewInsights).toBe(true);
      expect(onCacheClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('Manual Refresh', () => {
    it('triggers refresh manually', () => {
      const onRefresh = vi.fn();
      const { result } = renderHook(() => useAnalyticsCache({ onRefresh }));

      act(() => {
        result.current.triggerRefresh();
      });

      expect(result.current.pendingRefresh).toBe(true);
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('marks insights as viewed', () => {
      const { result } = renderHook(() => useAnalyticsCache());

      // Set new insights
      act(() => {
        dispatchCacheEvent('analytics:cache:clear');
      });
      expect(result.current.hasNewInsights).toBe(true);

      // Mark as viewed
      act(() => {
        result.current.markInsightsViewed();
      });

      expect(result.current.hasNewInsights).toBe(false);
      expect(result.current.pendingRefresh).toBe(false);
    });

    it('allows manually setting hasNewInsights', () => {
      const { result } = renderHook(() => useAnalyticsCache());

      act(() => {
        result.current.setHasNewInsights(true);
      });

      expect(result.current.hasNewInsights).toBe(true);

      act(() => {
        result.current.setHasNewInsights(false);
      });

      expect(result.current.hasNewInsights).toBe(false);
    });

    it('allows manually setting pendingRefresh', () => {
      const { result } = renderHook(() => useAnalyticsCache());

      act(() => {
        result.current.setPendingRefresh(true);
      });

      expect(result.current.pendingRefresh).toBe(true);

      act(() => {
        result.current.setPendingRefresh(false);
      });

      expect(result.current.pendingRefresh).toBe(false);
    });
  });

  describe('Auto Refresh', () => {
    it('does not auto-refresh when disabled', () => {
      const onRefresh = vi.fn();
      const { result } = renderHook(() =>
        useAnalyticsCache({ autoRefresh: false, onRefresh })
      );

      act(() => {
        dispatchCacheEvent('analytics:cache:clear');
      });

      expect(result.current.hasNewInsights).toBe(true);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onRefresh).not.toHaveBeenCalled();
    });

    it('auto-refreshes after delay when enabled and insights are available', () => {
      const onRefresh = vi.fn();
      const { result } = renderHook(() =>
        useAnalyticsCache({ autoRefresh: true, autoRefreshDelayMs: 1000, onRefresh })
      );

      act(() => {
        dispatchCacheEvent('analytics:cache:clear');
      });

      expect(result.current.hasNewInsights).toBe(true);
      expect(onRefresh).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.pendingRefresh).toBe(true);
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('uses custom auto-refresh delay', () => {
      const onRefresh = vi.fn();
      renderHook(() =>
        useAnalyticsCache({ autoRefresh: true, autoRefreshDelayMs: 3000, onRefresh })
      );

      act(() => {
        dispatchCacheEvent('analytics:cache:clear');
      });

      // Should not refresh before delay
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(onRefresh).not.toHaveBeenCalled();

      // Should refresh after full delay
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('cancels auto-refresh timer on unmount', () => {
      const onRefresh = vi.fn();
      const { unmount } = renderHook(() =>
        useAnalyticsCache({ autoRefresh: true, onRefresh })
      );

      act(() => {
        dispatchCacheEvent('analytics:cache:clear');
      });

      unmount();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onRefresh).not.toHaveBeenCalled();
    });

    it('does not auto-refresh when hasNewInsights is false', () => {
      const onRefresh = vi.fn();
      renderHook(() => useAnalyticsCache({ autoRefresh: true, onRefresh }));

      // Don't trigger cache clear, so hasNewInsights remains false
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onRefresh).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles multiple cache clear events', () => {
      const onCacheClear = vi.fn();
      const { result } = renderHook(() => useAnalyticsCache({ onCacheClear }));

      act(() => {
        dispatchCacheEvent('analytics:cache:clear');
        dispatchCacheEvent('analytics:cache:clear');
        dispatchCacheEvent('analytics:cache:clear:student');
      });

      expect(result.current.hasNewInsights).toBe(true);
      expect(onCacheClear).toHaveBeenCalledTimes(3);
    });

    it('handles refresh callback not provided', () => {
      const { result } = renderHook(() => useAnalyticsCache());

      act(() => {
        result.current.triggerRefresh();
      });

      expect(result.current.pendingRefresh).toBe(true);
    });

    it('handles cache clear callback not provided', () => {
      const { result } = renderHook(() => useAnalyticsCache());

      act(() => {
        dispatchCacheEvent('analytics:cache:clear');
      });

      expect(result.current.hasNewInsights).toBe(true);
    });

    it('works in non-browser environment', () => {
      // Mock window as undefined
      const originalWindow = global.window;
      (global as any).window = undefined;

      expect(() => {
        renderHook(() => useAnalyticsCache());
      }).not.toThrow();

      (global as any).window = originalWindow;
    });
  });

  describe('Integration Scenarios', () => {
    it('handles complete refresh workflow', () => {
      const onRefresh = vi.fn();
      const { result } = renderHook(() =>
        useAnalyticsCache({ autoRefresh: false, onRefresh })
      );

      // 1. Cache is cleared
      act(() => {
        dispatchCacheEvent('analytics:cache:clear');
      });
      expect(result.current.hasNewInsights).toBe(true);

      // 2. User manually triggers refresh
      act(() => {
        result.current.triggerRefresh();
      });
      expect(result.current.pendingRefresh).toBe(true);
      expect(onRefresh).toHaveBeenCalledTimes(1);

      // 3. Analysis completes, mark as viewed
      act(() => {
        result.current.markInsightsViewed();
      });
      expect(result.current.hasNewInsights).toBe(false);
      expect(result.current.pendingRefresh).toBe(false);
    });

    it('handles auto-refresh workflow', () => {
      const onRefresh = vi.fn();
      const { result } = renderHook(() =>
        useAnalyticsCache({ autoRefresh: true, autoRefreshDelayMs: 1000, onRefresh })
      );

      // 1. Cache is cleared
      act(() => {
        dispatchCacheEvent('analytics:cache:clear');
      });
      expect(result.current.hasNewInsights).toBe(true);

      // 2. Auto-refresh triggers after delay
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.pendingRefresh).toBe(true);
      expect(onRefresh).toHaveBeenCalledTimes(1);

      // 3. Analysis completes
      act(() => {
        result.current.markInsightsViewed();
      });
      expect(result.current.hasNewInsights).toBe(false);
    });
  });
});

// ============================================================================
// useDataChangeDetection Tests
// ============================================================================

describe('useDataChangeDetection', () => {
  const createMockData = (
    entries: number = 0,
    emotions: number = 0,
    sensory: number = 0
  ) => ({
    entries: Array(entries).fill({}) as TrackingEntry[],
    emotions: Array(emotions).fill({}) as EmotionEntry[],
    sensoryInputs: Array(sensory).fill({}) as SensoryEntry[],
  });

  describe('Data Change Detection', () => {
    it('detects increase in entries', () => {
      const onDataIncrease = vi.fn();
      const { rerender } = renderHook(
        ({ filteredData }) => useDataChangeDetection({ filteredData, onDataIncrease }),
        { initialProps: { filteredData: createMockData(5, 0, 0) } }
      );

      rerender({ filteredData: createMockData(10, 0, 0) });

      expect(onDataIncrease).toHaveBeenCalledWith(
        { entries: 5, emotions: 0, sensory: 0 },
        { entries: 10, emotions: 0, sensory: 0 }
      );
    });

    it('detects increase in emotions', () => {
      const onDataIncrease = vi.fn();
      const { rerender } = renderHook(
        ({ filteredData }) => useDataChangeDetection({ filteredData, onDataIncrease }),
        { initialProps: { filteredData: createMockData(0, 5, 0) } }
      );

      rerender({ filteredData: createMockData(0, 8, 0) });

      expect(onDataIncrease).toHaveBeenCalledWith(
        { entries: 0, emotions: 5, sensory: 0 },
        { entries: 0, emotions: 8, sensory: 0 }
      );
    });

    it('detects increase in sensory inputs', () => {
      const onDataIncrease = vi.fn();
      const { rerender } = renderHook(
        ({ filteredData }) => useDataChangeDetection({ filteredData, onDataIncrease }),
        { initialProps: { filteredData: createMockData(0, 0, 3) } }
      );

      rerender({ filteredData: createMockData(0, 0, 7) });

      expect(onDataIncrease).toHaveBeenCalledWith(
        { entries: 0, emotions: 0, sensory: 3 },
        { entries: 0, emotions: 0, sensory: 7 }
      );
    });

    it('does not trigger on decrease', () => {
      const onDataIncrease = vi.fn();
      const { rerender } = renderHook(
        ({ filteredData }) => useDataChangeDetection({ filteredData, onDataIncrease }),
        { initialProps: { filteredData: createMockData(10, 0, 0) } }
      );

      rerender({ filteredData: createMockData(5, 0, 0) });

      expect(onDataIncrease).not.toHaveBeenCalled();
    });

    it('does not trigger when counts stay the same', () => {
      const onDataIncrease = vi.fn();
      const { rerender } = renderHook(
        ({ filteredData }) => useDataChangeDetection({ filteredData, onDataIncrease }),
        { initialProps: { filteredData: createMockData(5, 3, 2) } }
      );

      rerender({ filteredData: createMockData(5, 3, 2) });

      expect(onDataIncrease).not.toHaveBeenCalled();
    });

    it('detects increases in multiple categories', () => {
      const onDataIncrease = vi.fn();
      const { rerender } = renderHook(
        ({ filteredData }) => useDataChangeDetection({ filteredData, onDataIncrease }),
        { initialProps: { filteredData: createMockData(5, 3, 2) } }
      );

      rerender({ filteredData: createMockData(10, 8, 7) });

      expect(onDataIncrease).toHaveBeenCalledWith(
        { entries: 5, emotions: 3, sensory: 2 },
        { entries: 10, emotions: 8, sensory: 7 }
      );
    });

    it('handles undefined/null arrays gracefully', () => {
      const onDataIncrease = vi.fn();
      const { rerender } = renderHook(
        ({ filteredData }) => useDataChangeDetection({ filteredData, onDataIncrease }),
        { initialProps: { filteredData: { entries: null as any, emotions: undefined as any, sensoryInputs: [] } } }
      );

      rerender({ filteredData: createMockData(5, 3, 2) });

      expect(onDataIncrease).toHaveBeenCalled();
    });

    it('handles errors silently', () => {
      const onDataIncrease = vi.fn(() => {
        throw new Error('Callback error');
      });

      const { rerender } = renderHook(
        ({ filteredData }) => useDataChangeDetection({ filteredData, onDataIncrease }),
        { initialProps: { filteredData: createMockData(5, 0, 0) } }
      );

      expect(() => {
        rerender({ filteredData: createMockData(10, 0, 0) });
      }).not.toThrow();
    });

    it('works without callback', () => {
      expect(() => {
        const { rerender } = renderHook(
          ({ filteredData }) => useDataChangeDetection({ filteredData }),
          { initialProps: { filteredData: createMockData(5, 0, 0) } }
        );

        rerender({ filteredData: createMockData(10, 0, 0) });
      }).not.toThrow();
    });
  });

  describe('Integration with useAnalyticsCache', () => {
    it('works together to detect changes and trigger refresh', () => {
      const onRefresh = vi.fn();
      const cacheHook = renderHook(() =>
        useAnalyticsCache({ autoRefresh: false, onRefresh })
      );

      const dataHook = renderHook(
        ({ filteredData }) =>
          useDataChangeDetection({
            filteredData,
            onDataIncrease: () => cacheHook.result.current.setHasNewInsights(true),
          }),
        { initialProps: { filteredData: createMockData(5, 0, 0) } }
      );

      // Simulate new data arriving
      act(() => {
        dataHook.rerender({ filteredData: createMockData(10, 0, 0) });
      });

      expect(cacheHook.result.current.hasNewInsights).toBe(true);

      // User triggers refresh
      act(() => {
        cacheHook.result.current.triggerRefresh();
      });

      expect(onRefresh).toHaveBeenCalled();
      expect(cacheHook.result.current.pendingRefresh).toBe(true);
    });
  });
});
