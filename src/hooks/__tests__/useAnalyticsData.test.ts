/**
 * Tests for useAnalyticsData hook
 *
 * Tests data normalization, signature generation, and timestamp coercion.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useAnalyticsData,
  normalizeAnalyticsData,
  generateDataSignature,
  type FilteredData,
} from '../useAnalyticsData';
import type { TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';

// ============================================================================
// Mocks
// ============================================================================

const mockLogger = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

// ============================================================================
// Test Data
// ============================================================================

const createMockEntry = (timestamp: Date | string | number): TrackingEntry => ({
  id: Math.random().toString(),
  studentId: 'student-1',
  timestamp: timestamp as Date,
  emotion: 'happy',
  intensity: 4,
  triggers: [],
  notes: '',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createMockEmotion = (timestamp: Date | string | number): EmotionEntry => ({
  id: Math.random().toString(),
  studentId: 'student-1',
  timestamp: timestamp as Date,
  emotion: 'happy',
  intensity: 4,
  triggers: [],
  notes: '',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createMockSensory = (timestamp: Date | string | number): SensoryEntry => ({
  id: Math.random().toString(),
  studentId: 'student-1',
  timestamp: timestamp as Date,
  type: 'visual',
  intensity: 3,
  response: 'positive',
  notes: '',
  createdAt: new Date(),
  updatedAt: new Date(),
});

// ============================================================================
// Tests
// ============================================================================

describe('useAnalyticsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('normalizes data on mount', () => {
      const filteredData: FilteredData = {
        entries: [createMockEntry('2024-01-01T10:00:00Z')],
        emotions: [createMockEmotion('2024-01-02T10:00:00Z')],
        sensoryInputs: [createMockSensory('2024-01-03T10:00:00Z')],
      };

      const { result } = renderHook(() => useAnalyticsData({ filteredData }));

      expect(result.current.normalizedData.entries).toHaveLength(1);
      expect(result.current.normalizedData.emotions).toHaveLength(1);
      expect(result.current.normalizedData.sensoryInputs).toHaveLength(1);

      // All timestamps should be Date objects
      expect(result.current.normalizedData.entries[0].timestamp).toBeInstanceOf(Date);
      expect(result.current.normalizedData.emotions[0].timestamp).toBeInstanceOf(Date);
      expect(result.current.normalizedData.sensoryInputs[0].timestamp).toBeInstanceOf(Date);
    });

    it('generates data signature', () => {
      const filteredData: FilteredData = {
        entries: [createMockEntry('2024-01-01T10:00:00Z'), createMockEntry('2024-01-31T10:00:00Z')],
        emotions: [createMockEmotion('2024-01-15T10:00:00Z')],
        sensoryInputs: [],
      };

      const { result } = renderHook(() => useAnalyticsData({ filteredData }));

      expect(result.current.dataSignature).toBe(
        `2|1|0|${new Date('2024-01-01T10:00:00Z').getTime()}|${new Date('2024-01-31T10:00:00Z').getTime()}`,
      );
    });
  });

  describe('Timestamp Normalization', () => {
    it('handles Date objects', () => {
      const date = new Date('2024-01-01T10:00:00Z');
      const filteredData: FilteredData = {
        entries: [createMockEntry(date)],
        emotions: [],
        sensoryInputs: [],
      };

      const { result } = renderHook(() => useAnalyticsData({ filteredData }));

      expect(result.current.normalizedData.entries[0].timestamp).toEqual(date);
    });

    it('converts ISO strings to Date objects', () => {
      const isoString = '2024-01-01T10:00:00Z';
      const filteredData: FilteredData = {
        entries: [createMockEntry(isoString)],
        emotions: [],
        sensoryInputs: [],
      };

      const { result } = renderHook(() => useAnalyticsData({ filteredData }));

      expect(result.current.normalizedData.entries[0].timestamp).toEqual(new Date(isoString));
    });

    it('converts Unix timestamps to Date objects', () => {
      const unixTimestamp = 1704106800000; // 2024-01-01T10:00:00Z
      const filteredData: FilteredData = {
        entries: [createMockEntry(unixTimestamp)],
        emotions: [],
        sensoryInputs: [],
      };

      const { result } = renderHook(() => useAnalyticsData({ filteredData }));

      expect(result.current.normalizedData.entries[0].timestamp).toEqual(new Date(unixTimestamp));
    });

    it('handles invalid timestamps with fallback', () => {
      const filteredData: FilteredData = {
        entries: [createMockEntry('invalid-date')],
        emotions: [],
        sensoryInputs: [],
      };

      const { result } = renderHook(() => useAnalyticsData({ filteredData }));

      // Should fallback to current date (valid Date object)
      expect(result.current.normalizedData.entries[0].timestamp).toBeInstanceOf(Date);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('normalizes all entry types', () => {
      const filteredData: FilteredData = {
        entries: [createMockEntry('2024-01-01T10:00:00Z')],
        emotions: [createMockEmotion('2024-01-02T10:00:00Z')],
        sensoryInputs: [createMockSensory('2024-01-03T10:00:00Z')],
      };

      const { result } = renderHook(() => useAnalyticsData({ filteredData }));

      expect(result.current.normalizedData.entries[0].timestamp).toBeInstanceOf(Date);
      expect(result.current.normalizedData.emotions[0].timestamp).toBeInstanceOf(Date);
      expect(result.current.normalizedData.sensoryInputs[0].timestamp).toBeInstanceOf(Date);
    });

    it('preserves other entry properties', () => {
      const entry = createMockEntry('2024-01-01T10:00:00Z');
      const filteredData: FilteredData = {
        entries: [entry],
        emotions: [],
        sensoryInputs: [],
      };

      const { result } = renderHook(() => useAnalyticsData({ filteredData }));

      const normalized = result.current.normalizedData.entries[0];
      expect(normalized.id).toBe(entry.id);
      expect(normalized.studentId).toBe(entry.studentId);
      expect(normalized.emotion).toBe(entry.emotion);
      expect(normalized.intensity).toBe(entry.intensity);
    });
  });

  describe('Data Signature Generation', () => {
    it('changes signature when entry count changes', () => {
      const initialData: FilteredData = {
        entries: [createMockEntry('2024-01-01T10:00:00Z')],
        emotions: [],
        sensoryInputs: [],
      };

      const { result, rerender } = renderHook(
        ({ filteredData }) => useAnalyticsData({ filteredData }),
        { initialProps: { filteredData: initialData } },
      );

      const signature1 = result.current.dataSignature;

      const updatedData: FilteredData = {
        entries: [createMockEntry('2024-01-01T10:00:00Z'), createMockEntry('2024-01-02T10:00:00Z')],
        emotions: [],
        sensoryInputs: [],
      };

      rerender({ filteredData: updatedData });

      const signature2 = result.current.dataSignature;
      expect(signature2).not.toBe(signature1);
    });

    it('changes signature when timestamps change', () => {
      const initialData: FilteredData = {
        entries: [createMockEntry('2024-01-01T10:00:00Z')],
        emotions: [],
        sensoryInputs: [],
      };

      const { result, rerender } = renderHook(
        ({ filteredData }) => useAnalyticsData({ filteredData }),
        { initialProps: { filteredData: initialData } },
      );

      const signature1 = result.current.dataSignature;

      const updatedData: FilteredData = {
        entries: [createMockEntry('2024-12-31T10:00:00Z')],
        emotions: [],
        sensoryInputs: [],
      };

      rerender({ filteredData: updatedData });

      const signature2 = result.current.dataSignature;
      expect(signature2).not.toBe(signature1);
    });

    it('keeps same signature when only object identity changes', () => {
      const entry = createMockEntry('2024-01-01T10:00:00Z');
      const initialData: FilteredData = {
        entries: [entry],
        emotions: [],
        sensoryInputs: [],
      };

      const { result, rerender } = renderHook(
        ({ filteredData }) => useAnalyticsData({ filteredData }),
        { initialProps: { filteredData: initialData } },
      );

      const signature1 = result.current.dataSignature;

      // New object with same data
      const updatedData: FilteredData = {
        entries: [{ ...entry }],
        emotions: [],
        sensoryInputs: [],
      };

      rerender({ filteredData: updatedData });

      const signature2 = result.current.dataSignature;
      expect(signature2).toBe(signature1);
    });

    it('includes counts from all data types', () => {
      const filteredData: FilteredData = {
        entries: [createMockEntry('2024-01-01T10:00:00Z')],
        emotions: [
          createMockEmotion('2024-01-02T10:00:00Z'),
          createMockEmotion('2024-01-03T10:00:00Z'),
        ],
        sensoryInputs: [
          createMockSensory('2024-01-04T10:00:00Z'),
          createMockSensory('2024-01-05T10:00:00Z'),
          createMockSensory('2024-01-06T10:00:00Z'),
        ],
      };

      const { result } = renderHook(() => useAnalyticsData({ filteredData }));

      // Signature should reflect: 1 entry, 2 emotions, 3 sensory
      expect(result.current.dataSignature).toContain('1|2|3|');
    });

    it('handles empty data', () => {
      const filteredData: FilteredData = {
        entries: [],
        emotions: [],
        sensoryInputs: [],
      };

      const { result } = renderHook(() => useAnalyticsData({ filteredData }));

      expect(result.current.dataSignature).toBe('0|0|0|0|0');
    });
  });

  describe('Memoization', () => {
    it('memoizes normalized data when signature unchanged', () => {
      const entry = createMockEntry('2024-01-01T10:00:00Z');
      const initialData: FilteredData = {
        entries: [entry],
        emotions: [],
        sensoryInputs: [],
      };

      const { result, rerender } = renderHook(
        ({ filteredData }) => useAnalyticsData({ filteredData }),
        { initialProps: { filteredData: initialData } },
      );

      const normalized1 = result.current.normalizedData;

      // Rerender with same data (different object identity)
      rerender({ filteredData: { ...initialData } });

      const normalized2 = result.current.normalizedData;

      // Should return same reference due to memoization
      expect(normalized2).toBe(normalized1);
    });

    it('recomputes normalized data when signature changes', () => {
      const initialData: FilteredData = {
        entries: [createMockEntry('2024-01-01T10:00:00Z')],
        emotions: [],
        sensoryInputs: [],
      };

      const { result, rerender } = renderHook(
        ({ filteredData }) => useAnalyticsData({ filteredData }),
        { initialProps: { filteredData: initialData } },
      );

      const normalized1 = result.current.normalizedData;

      // Rerender with different data
      const updatedData: FilteredData = {
        entries: [createMockEntry('2024-01-01T10:00:00Z'), createMockEntry('2024-01-02T10:00:00Z')],
        emotions: [],
        sensoryInputs: [],
      };

      rerender({ filteredData: updatedData });

      const normalized2 = result.current.normalizedData;

      // Should return new reference
      expect(normalized2).not.toBe(normalized1);
    });
  });

  describe('Error Handling', () => {
    it('handles null/undefined arrays', () => {
      const filteredData: FilteredData = {
        entries: null as any,
        emotions: undefined as any,
        sensoryInputs: null as any,
      };

      const { result } = renderHook(() => useAnalyticsData({ filteredData }));

      expect(result.current.normalizedData.entries).toEqual([]);
      expect(result.current.normalizedData.emotions).toEqual([]);
      expect(result.current.normalizedData.sensoryInputs).toEqual([]);
    });

    it('recovers from normalization errors', () => {
      const filteredData: FilteredData = {
        entries: [{ invalid: 'data' } as any],
        emotions: [],
        sensoryInputs: [],
      };

      const { result } = renderHook(() => useAnalyticsData({ filteredData }));

      // Should not crash
      expect(result.current.normalizedData).toBeDefined();
    });

    it('logs errors during normalization', () => {
      const filteredData: FilteredData = {
        entries: [createMockEntry('invalid-timestamp')],
        emotions: [],
        sensoryInputs: [],
      };

      renderHook(() => useAnalyticsData({ filteredData }));

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('normalizeData method', () => {
    it('exposes normalizeData method', () => {
      const filteredData: FilteredData = {
        entries: [createMockEntry('2024-01-01T10:00:00Z')],
        emotions: [],
        sensoryInputs: [],
      };

      const { result } = renderHook(() => useAnalyticsData({ filteredData }));

      expect(typeof result.current.normalizeData).toBe('function');
    });

    it('can manually normalize data', () => {
      const filteredData: FilteredData = {
        entries: [createMockEntry('2024-01-01T10:00:00Z')],
        emotions: [],
        sensoryInputs: [],
      };

      const { result } = renderHook(() => useAnalyticsData({ filteredData }));

      const manuallyNormalized = result.current.normalizeData(filteredData);

      expect(manuallyNormalized.entries[0].timestamp).toBeInstanceOf(Date);
    });
  });
});

// ============================================================================
// Standalone Function Tests
// ============================================================================

describe('normalizeAnalyticsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes all data types', () => {
    const data: FilteredData = {
      entries: [createMockEntry('2024-01-01T10:00:00Z')],
      emotions: [createMockEmotion('2024-01-02T10:00:00Z')],
      sensoryInputs: [createMockSensory('2024-01-03T10:00:00Z')],
    };

    const normalized = normalizeAnalyticsData(data);

    expect(normalized.entries[0].timestamp).toBeInstanceOf(Date);
    expect(normalized.emotions[0].timestamp).toBeInstanceOf(Date);
    expect(normalized.sensoryInputs[0].timestamp).toBeInstanceOf(Date);
  });

  it('handles empty data', () => {
    const data: FilteredData = {
      entries: [],
      emotions: [],
      sensoryInputs: [],
    };

    const normalized = normalizeAnalyticsData(data);

    expect(normalized.entries).toEqual([]);
    expect(normalized.emotions).toEqual([]);
    expect(normalized.sensoryInputs).toEqual([]);
  });

  it('handles errors gracefully', () => {
    const data: FilteredData = {
      entries: null as any,
      emotions: undefined as any,
      sensoryInputs: null as any,
    };

    const normalized = normalizeAnalyticsData(data);

    expect(normalized.entries).toEqual([]);
    expect(normalized.emotions).toEqual([]);
    expect(normalized.sensoryInputs).toEqual([]);
  });
});

describe('generateDataSignature', () => {
  it('generates consistent signatures', () => {
    const data: FilteredData = {
      entries: [createMockEntry('2024-01-01T10:00:00Z'), createMockEntry('2024-01-31T10:00:00Z')],
      emotions: [createMockEmotion('2024-01-15T10:00:00Z')],
      sensoryInputs: [],
    };

    const sig1 = generateDataSignature(data);
    const sig2 = generateDataSignature(data);

    expect(sig1).toBe(sig2);
  });

  it('generates different signatures for different data', () => {
    const data1: FilteredData = {
      entries: [createMockEntry('2024-01-01T10:00:00Z')],
      emotions: [],
      sensoryInputs: [],
    };

    const data2: FilteredData = {
      entries: [createMockEntry('2024-01-01T10:00:00Z'), createMockEntry('2024-01-02T10:00:00Z')],
      emotions: [],
      sensoryInputs: [],
    };

    const sig1 = generateDataSignature(data1);
    const sig2 = generateDataSignature(data2);

    expect(sig1).not.toBe(sig2);
  });

  it('handles empty data', () => {
    const data: FilteredData = {
      entries: [],
      emotions: [],
      sensoryInputs: [],
    };

    const signature = generateDataSignature(data);

    expect(signature).toBe('0|0|0|0|0');
  });

  it('includes first and last timestamps', () => {
    const firstDate = '2024-01-01T10:00:00Z';
    const lastDate = '2024-12-31T10:00:00Z';

    const data: FilteredData = {
      entries: [
        createMockEntry(firstDate),
        createMockEntry('2024-06-15T10:00:00Z'),
        createMockEntry(lastDate),
      ],
      emotions: [],
      sensoryInputs: [],
    };

    const signature = generateDataSignature(data);

    expect(signature).toContain(new Date(firstDate).getTime().toString());
    expect(signature).toContain(new Date(lastDate).getTime().toString());
  });
});
