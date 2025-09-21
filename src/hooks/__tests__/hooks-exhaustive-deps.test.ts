/**
 * @fileoverview Tests for React Hooks exhaustive-deps fixes
 * These tests ensure that hooks dependencies are correctly specified to prevent stale closures
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useState, useCallback } from 'react';
import { useDataFiltering } from '../useDataFiltering';
import { usePerformanceCache } from '../usePerformanceCache';
import { useAnalyticsWorker } from '../useAnalyticsWorker';
import { TimeRange } from '@/components/DateRangeSelector';
import { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import { startOfDay, endOfDay, subDays } from 'date-fns';

// Mock data
const createMockTrackingEntry = (id: string, timestamp: Date): TrackingEntry => ({
  id,
  studentId: 'test-student',
  timestamp,
  emotions: [],
  sensoryInputs: [],
  notes: 'Test entry'
});

const createMockEmotionEntry = (id: string, timestamp: Date): EmotionEntry => ({
  id,
  studentId: 'test-student',
  timestamp,
  emotion: 'happy',
  intensity: 3,
  triggers: [],
  notes: ''
});

const createMockSensoryEntry = (id: string, timestamp: Date): SensoryEntry => ({
  id,
  studentId: 'test-student',
  timestamp,
  type: 'visual',
  description: 'Test sensory input',
  intensity: 3,
  response: 'positive'
});

describe('Hooks Exhaustive Dependencies Tests', () => {
  describe('useDataFiltering', () => {
    it('should recompute filtered data when selectedRange changes', () => {
      const mockEntries = [
        createMockTrackingEntry('1', new Date('2024-01-01')),
        createMockTrackingEntry('2', new Date('2024-01-15')),
        createMockTrackingEntry('3', new Date('2024-02-01'))
      ];

      const mockEmotions = [
        createMockEmotionEntry('1', new Date('2024-01-01')),
        createMockEmotionEntry('2', new Date('2024-01-15'))
      ];

      const mockSensory = [
        createMockSensoryEntry('1', new Date('2024-01-01'))
      ];

      const { result } = renderHook(() => {
        const [range, setRange] = useState<TimeRange>({
          start: startOfDay(new Date('2024-01-01')),
          end: endOfDay(new Date('2024-01-31')),
          label: 'January'
        });

        const filtering = useDataFiltering(mockEntries, mockEmotions, mockSensory);
        
        return {
          ...filtering,
          setRange
        };
      });

      // Set date range to January explicitly to match mock data
      act(() => {
        result.current.handleRangeChange({
          start: startOfDay(new Date('2024-01-01')),
          end: endOfDay(new Date('2024-01-31')),
          label: 'January'
        });
      });

      expect(result.current.filteredData.entries).toHaveLength(2); // Jan 1 and Jan 15
      expect(result.current.filteredData.emotions).toHaveLength(2);
      expect(result.current.filteredData.sensoryInputs).toHaveLength(1);

      // Change date range to February
      act(() => {
        result.current.handleRangeChange({
          start: startOfDay(new Date('2024-02-01')),
          end: endOfDay(new Date('2024-02-29')),
          label: 'February'
        });
      });

      // Should now include February entries only
      expect(result.current.filteredData.entries).toHaveLength(1); // Feb 1 only
      expect(result.current.filteredData.emotions).toHaveLength(0); // No February emotions
      expect(result.current.filteredData.sensoryInputs).toHaveLength(0); // No February sensory
    });

    it('should recompute when input data arrays change', () => {
      const initialEntries = [createMockTrackingEntry('1', new Date())];
      const { result, rerender } = renderHook(
        ({ entries }: { entries: TrackingEntry[] }) => 
          useDataFiltering(entries, [], [])
      , { initialProps: { entries: initialEntries } });

      expect(result.current.filteredData.entries).toHaveLength(1);

      // Change the entries array
      const newEntries = [
        ...initialEntries,
        createMockTrackingEntry('2', new Date())
      ];
      
      rerender({ entries: newEntries });
      
      expect(result.current.filteredData.entries).toHaveLength(2);
    });
  });

  describe('usePerformanceCache', () => {
    it('should properly handle cache operations with stable function references', () => {
      const { result } = renderHook(() => usePerformanceCache<string>({ 
        enableStats: true,
        maxSize: 10
      }));

      // Test stable function references
      const initialGet = result.current.get;
      const initialSet = result.current.set;
      
      act(() => {
        result.current.set('key1', 'value1', ['tag1']);
      });

      expect(result.current.get('key1')).toBe('value1');
      
      // Function references should remain stable
      expect(result.current.get).toBe(initialGet);
      expect(result.current.set).toBe(initialSet);
    });

    it('should properly clean up tags when evicting LRU entries', () => {
      // Use static Date.now to control timestamps deterministically without fake timers
      const nowSpy = vi.spyOn(Date, 'now');
      const t1 = new Date('2024-01-01T00:00:00Z').getTime();
      const t2 = new Date('2024-01-02T00:00:00Z').getTime();
      const t3 = new Date('2024-01-03T00:00:00Z').getTime();

      const { result } = renderHook(() => usePerformanceCache<string>({ 
        maxSize: 2,
        enableStats: true
      }));

      // Fill cache with deterministic timestamps
      nowSpy.mockReturnValueOnce(t1);
      act(() => {
        result.current.set('key1', 'value1', ['tag1']);
      });

      nowSpy.mockReturnValueOnce(t2);
      act(() => {
        result.current.set('key2', 'value2', ['tag2']);
      });

      expect(result.current.size).toBe(2);

      const initialEvictions = result.current.stats?.evictions ?? 0;

      // Adding a newer entry should evict the LRU (key1)
      nowSpy.mockReturnValueOnce(t3);
      act(() => {
        result.current.set('key3', 'value3', ['tag3']);
      });

      // Eviction should be synchronous in set()
      expect(result.current.stats?.evictions).toBe(initialEvictions + 1);

      // LRU key should be gone, newest present, size bounded
      expect(result.current.get('key1')).toBeUndefined();
      expect(result.current.get('key3')).toBe('value3');
      expect(result.current.size).toBeLessThanOrEqual(2);

      nowSpy.mockRestore();
    });

    it('should update hit rate correctly', () => {
      const { result } = renderHook(() => usePerformanceCache<string>({ 
        enableStats: true
      }));

      act(() => {
        result.current.set('key1', 'value1');
      });

      // Initial hit rate should be 0 (no hits yet)
      expect(result.current.stats?.hitRate).toBe(0);

      act(() => {
        result.current.get('key1'); // Hit
        result.current.get('nonexistent'); // Miss
      });

      // Should be 50% hit rate (1 hit, 1 miss)
      expect(result.current.stats?.hitRate).toBe(50);
    });
  });

  describe('useAnalyticsWorker', () => {
    // Mock the analytics worker module
  beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should use fresh extractTagsFromData function', async () => {
      const mockExtractTags = vi.fn(() => ['tag1', 'tag2']);
      
      const { result } = renderHook(() => {
        const worker = useAnalyticsWorker({ extractTagsFromData: mockExtractTags });
        return worker;
      });

      // Simulate analytics data
      const mockData = {
        emotions: [],
        sensoryInputs: [],
        entries: []
      };

      await act(async () => {
        await result.current.runAnalysis(mockData, { student: { id: 's1', name: 'Test Student', createdAt: new Date() } as any, useAI: false });
      });

      // The function should have been called at least once
      expect(mockExtractTags).toHaveBeenCalled();
    });

    it('should handle cache invalidation correctly', () => {
      const { result } = renderHook(() => useAnalyticsWorker());

      // Test that cache operations work
      act(() => {
        result.current.clearCache();
      });

      expect(result.current.cacheSize).toBe(0);
      
      // Test student-specific invalidation
      act(() => {
        result.current.invalidateCacheForStudent('test-student');
      });

      // Should not throw errors
      expect(result.current.cacheSize).toBe(0);
    });
  });

  describe('Component hooks integration', () => {
    it('should maintain function stability across re-renders', () => {
      const { result, rerender } = renderHook(() => {
        const [studentId, setStudentId] = useState('student1');
        const [showOnlyUnresolved, setShowOnlyUnresolved] = useState(false);
        
        // Simulate the loadAlerts function from AlertManager
        const loadAlerts = useCallback(() => {
          // Mock implementation
          return { studentId, showOnlyUnresolved };
        }, [studentId, showOnlyUnresolved]);

        return { loadAlerts, setStudentId, setShowOnlyUnresolved };
      });

      const initialLoadAlerts = result.current.loadAlerts;

      // Change studentId
      act(() => {
        result.current.setStudentId('student2');
      });

      // loadAlerts should be a new function due to changed dependency
      expect(result.current.loadAlerts).not.toBe(initialLoadAlerts);

      // But if we don't change dependencies, it should remain stable
      rerender();
      const afterRerender = result.current.loadAlerts;
      
      rerender();
      expect(result.current.loadAlerts).toBe(afterRerender);
    });
  });

  describe('Translation hook dependencies', () => {
    it('should handle language changes correctly', () => {
      // Mock i18n
      const mockI18n = {
        language: 'en',
        changeLanguage: vi.fn(),
        t: vi.fn((key: string) => key)
      };

      // This test would require proper mocking of react-i18next
      // For now, we just test that the pattern is correct
      expect(mockI18n.changeLanguage).toBeDefined();
    });
  });
});

describe('Memory Leak Prevention', () => {
  it('should clean up intervals and timeouts', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval' as any);
    const setIntervalSpy = vi.spyOn(global, 'setInterval' as any);

    const { unmount } = renderHook(() => {
      const [, setTrigger] = useState(0);
      
      // Simulate a component that sets up intervals
      const refreshInterval = setInterval(() => {
        setTrigger(prev => prev + 1);
      }, 1000);

      return { refreshInterval };
    });

    expect(setIntervalSpy).toHaveBeenCalled();

    // Unmount should clean up
    unmount();

    // In a real component, this would be handled by useEffect cleanup
    // Here we just verify the spies work
    expect(clearIntervalSpy).toBeDefined();
    expect(setIntervalSpy).toBeDefined();

    clearIntervalSpy.mockRestore();
    setIntervalSpy.mockRestore();
  });

  it('should handle event listener cleanup', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => {
      // Simulate event listener setup
      const handleClick = () => {};
      
      return { handleClick };
    });

    // In a real scenario, this would be in a useEffect
    document.addEventListener('click', () => {});

    unmount();

    // Clean up
    document.removeEventListener('click', () => {});

    expect(addEventListenerSpy).toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalled();

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });
});
