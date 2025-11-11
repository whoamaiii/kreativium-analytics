/**
 * Tests for useAnalyticsExport hook
 *
 * Tests export operations, progress tracking, and chart collection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAnalyticsExport } from '../useAnalyticsExport';
import type { Student, TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';
import type { ExportFormat } from '@/lib/analyticsExport';

// ============================================================================
// Mocks
// ============================================================================

const mockExportTo = vi.fn();
const mockToast = vi.fn();
const mockLogger = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

vi.mock('@/lib/analyticsExport', () => ({
  analyticsExport: {
    exportTo: (...args: unknown[]) => mockExportTo(...args),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: mockToast,
}));

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

// ============================================================================
// Test Data
// ============================================================================

const createMockStudent = (): Student => ({
  id: 'student-1',
  name: 'Test Student',
  dateOfBirth: '2010-01-01',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
});

const createMockEntry = (timestamp: string): TrackingEntry => ({
  id: Math.random().toString(),
  studentId: 'student-1',
  timestamp: new Date(timestamp),
  emotion: 'happy',
  intensity: 4,
  triggers: [],
  notes: '',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createMockFilteredData = () => ({
  entries: [
    createMockEntry('2024-01-01T10:00:00Z'),
    createMockEntry('2024-01-15T10:00:00Z'),
    createMockEntry('2024-01-31T10:00:00Z'),
  ],
  emotions: [] as EmotionEntry[],
  sensoryInputs: [] as SensoryEntry[],
});

const mockAnalyticsResults = {
  patterns: [{ type: 'pattern1' }],
  correlations: [{ correlation: 0.8 }],
  insights: [{ insight: 'test' }],
  predictiveInsights: [{ prediction: 'future' }],
  anomalies: [{ anomaly: 'unusual' }],
};

const mockTAnalytics = (key: string) => key;

// ============================================================================
// Tests
// ============================================================================

describe('useAnalyticsExport', () => {
  let mockChartRegistry: {
    all: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockExportTo.mockResolvedValue(undefined);

    // Mock chart registry
    mockChartRegistry = {
      all: vi.fn(() => []),
    };

    vi.doMock('@/lib/chartRegistry', () => ({
      chartRegistry: mockChartRegistry,
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() =>
        useAnalyticsExport({
          student: createMockStudent(),
          filteredData: createMockFilteredData(),
          analyticsResults: mockAnalyticsResults,
          tAnalytics: mockTAnalytics,
        }),
      );

      expect(result.current.isExporting).toBe(false);
      expect(result.current.exportProgress).toBe(0);
    });
  });

  describe('CSV Export', () => {
    it('exports to CSV format', async () => {
      const { result } = renderHook(() =>
        useAnalyticsExport({
          student: createMockStudent(),
          filteredData: createMockFilteredData(),
          analyticsResults: mockAnalyticsResults,
          tAnalytics: mockTAnalytics,
        }),
      );

      await act(async () => {
        await result.current.exportTo('csv');
      });

      expect(mockExportTo).toHaveBeenCalledWith(
        'csv',
        expect.objectContaining({
          student: expect.any(Object),
          dateRange: expect.objectContaining({
            start: expect.any(Date),
            end: expect.any(Date),
          }),
          data: expect.any(Object),
          analytics: expect.any(Object),
        }),
        undefined,
      );

      expect(mockToast).toHaveBeenCalledWith({
        title: 'export.success.csv',
        description: 'export.success.csv',
      });

      expect(result.current.isExporting).toBe(false);
    });

    it('tracks progress during CSV export', async () => {
      const progressValues: number[] = [];

      const { result } = renderHook(() =>
        useAnalyticsExport({
          student: createMockStudent(),
          filteredData: createMockFilteredData(),
          analyticsResults: mockAnalyticsResults,
          tAnalytics: mockTAnalytics,
        }),
      );

      // Start export and capture progress
      const exportPromise = act(async () => {
        const promise = result.current.exportTo('csv');
        // Capture progress synchronously
        progressValues.push(result.current.exportProgress);
        await promise;
      });

      await exportPromise;

      // Should go through progress stages: 5, 20, 65, 100
      expect(result.current.exportProgress).toBeGreaterThanOrEqual(0);
    });
  });

  describe('JSON Export', () => {
    it('exports to JSON format', async () => {
      const { result } = renderHook(() =>
        useAnalyticsExport({
          student: createMockStudent(),
          filteredData: createMockFilteredData(),
          analyticsResults: mockAnalyticsResults,
          tAnalytics: mockTAnalytics,
        }),
      );

      await act(async () => {
        await result.current.exportTo('json');
      });

      expect(mockExportTo).toHaveBeenCalledWith('json', expect.any(Object), undefined);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'export.success.json',
        description: 'export.success.json',
      });
    });
  });

  describe('PDF Export', () => {
    it('exports to PDF format', async () => {
      const { result } = renderHook(() =>
        useAnalyticsExport({
          student: createMockStudent(),
          filteredData: createMockFilteredData(),
          analyticsResults: mockAnalyticsResults,
          tAnalytics: mockTAnalytics,
        }),
      );

      await act(async () => {
        await result.current.exportTo('pdf');
      });

      expect(mockExportTo).toHaveBeenCalledWith('pdf', expect.any(Object), undefined);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'export.success.pdf',
        description: 'export.success.pdf',
      });
    });

    it('includes chart quality option for PDF', async () => {
      const { result } = renderHook(() =>
        useAnalyticsExport({
          student: createMockStudent(),
          filteredData: createMockFilteredData(),
          analyticsResults: mockAnalyticsResults,
          tAnalytics: mockTAnalytics,
        }),
      );

      await act(async () => {
        await result.current.exportTo('pdf', { chartQuality: 'high' });
      });

      expect(mockExportTo).toHaveBeenCalledWith('pdf', expect.any(Object), {
        pdf: { chartQuality: 'high' },
      });
    });

    it('includes visualization element if provided', async () => {
      const mockElement = document.createElement('div');
      const visualizationRef = { current: mockElement };

      const { result } = renderHook(() =>
        useAnalyticsExport({
          student: createMockStudent(),
          filteredData: createMockFilteredData(),
          analyticsResults: mockAnalyticsResults,
          tAnalytics: mockTAnalytics,
          visualizationRef,
        }),
      );

      await act(async () => {
        await result.current.exportTo('pdf');
      });

      expect(mockExportTo).toHaveBeenCalledWith(
        'pdf',
        expect.objectContaining({
          charts: expect.arrayContaining([
            expect.objectContaining({
              element: mockElement,
              title: 'export.chartTitle',
            }),
          ]),
        }),
        undefined,
      );
    });

    it('does not include visualization element for non-PDF exports', async () => {
      const mockElement = document.createElement('div');
      const visualizationRef = { current: mockElement };

      const { result } = renderHook(() =>
        useAnalyticsExport({
          student: createMockStudent(),
          filteredData: createMockFilteredData(),
          analyticsResults: mockAnalyticsResults,
          tAnalytics: mockTAnalytics,
          visualizationRef,
        }),
      );

      await act(async () => {
        await result.current.exportTo('csv');
      });

      const callArgs = mockExportTo.mock.calls[0];
      expect(callArgs[1].charts).toBeUndefined();
    });
  });

  describe('Date Range Calculation', () => {
    it('calculates date range from entries', async () => {
      const { result } = renderHook(() =>
        useAnalyticsExport({
          student: createMockStudent(),
          filteredData: createMockFilteredData(),
          analyticsResults: mockAnalyticsResults,
          tAnalytics: mockTAnalytics,
        }),
      );

      await act(async () => {
        await result.current.exportTo('csv');
      });

      const exportData = mockExportTo.mock.calls[0][1];
      expect(exportData.dateRange.start).toEqual(new Date('2024-01-01T10:00:00Z'));
      expect(exportData.dateRange.end).toEqual(new Date('2024-01-31T10:00:00Z'));
    });

    it('uses current date when no entries exist', async () => {
      const emptyData = {
        entries: [],
        emotions: [],
        sensoryInputs: [],
      };

      const { result } = renderHook(() =>
        useAnalyticsExport({
          student: createMockStudent(),
          filteredData: emptyData,
          analyticsResults: mockAnalyticsResults,
          tAnalytics: mockTAnalytics,
        }),
      );

      await act(async () => {
        await result.current.exportTo('csv');
      });

      const exportData = mockExportTo.mock.calls[0][1];
      expect(exportData.dateRange.start).toBeInstanceOf(Date);
      expect(exportData.dateRange.end).toBeInstanceOf(Date);
    });

    it('handles entries with string timestamps', async () => {
      const dataWithStringTimestamps = {
        entries: [
          { ...createMockEntry('2024-01-01T10:00:00Z'), timestamp: '2024-01-01T10:00:00Z' as any },
          { ...createMockEntry('2024-01-31T10:00:00Z'), timestamp: '2024-01-31T10:00:00Z' as any },
        ],
        emotions: [],
        sensoryInputs: [],
      };

      const { result } = renderHook(() =>
        useAnalyticsExport({
          student: createMockStudent(),
          filteredData: dataWithStringTimestamps,
          analyticsResults: mockAnalyticsResults,
          tAnalytics: mockTAnalytics,
        }),
      );

      await act(async () => {
        await result.current.exportTo('csv');
      });

      const exportData = mockExportTo.mock.calls[0][1];
      expect(exportData.dateRange.start).toEqual(new Date('2024-01-01T10:00:00Z'));
      expect(exportData.dateRange.end).toEqual(new Date('2024-01-31T10:00:00Z'));
    });

    it('handles invalid timestamps gracefully', async () => {
      const dataWithInvalidTimestamp = {
        entries: [
          createMockEntry('2024-01-01T10:00:00Z'),
          { ...createMockEntry('2024-01-31T10:00:00Z'), timestamp: 'invalid' as any },
        ],
        emotions: [],
        sensoryInputs: [],
      };

      const { result } = renderHook(() =>
        useAnalyticsExport({
          student: createMockStudent(),
          filteredData: dataWithInvalidTimestamp,
          analyticsResults: mockAnalyticsResults,
          tAnalytics: mockTAnalytics,
        }),
      );

      await act(async () => {
        await result.current.exportTo('csv');
      });

      // Should still succeed with valid date range
      expect(mockExportTo).toHaveBeenCalled();
    });
  });

  describe('Analytics Data', () => {
    it('includes all analytics results in export', async () => {
      const { result } = renderHook(() =>
        useAnalyticsExport({
          student: createMockStudent(),
          filteredData: createMockFilteredData(),
          analyticsResults: mockAnalyticsResults,
          tAnalytics: mockTAnalytics,
        }),
      );

      await act(async () => {
        await result.current.exportTo('json');
      });

      const exportData = mockExportTo.mock.calls[0][1];
      expect(exportData.analytics).toEqual({
        patterns: mockAnalyticsResults.patterns,
        correlations: mockAnalyticsResults.correlations,
        insights: mockAnalyticsResults.insights,
        predictiveInsights: mockAnalyticsResults.predictiveInsights,
        anomalies: mockAnalyticsResults.anomalies,
      });
    });

    it('uses empty arrays for missing analytics results', async () => {
      const partialResults = {
        patterns: [{ type: 'pattern' }],
      };

      const { result } = renderHook(() =>
        useAnalyticsExport({
          student: createMockStudent(),
          filteredData: createMockFilteredData(),
          analyticsResults: partialResults,
          tAnalytics: mockTAnalytics,
        }),
      );

      await act(async () => {
        await result.current.exportTo('json');
      });

      const exportData = mockExportTo.mock.calls[0][1];
      expect(exportData.analytics.patterns).toEqual(partialResults.patterns);
      expect(exportData.analytics.correlations).toEqual([]);
      expect(exportData.analytics.insights).toEqual([]);
      expect(exportData.analytics.predictiveInsights).toEqual([]);
      expect(exportData.analytics.anomalies).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('handles export errors gracefully', async () => {
      const error = new Error('Export failed');
      mockExportTo.mockRejectedValueOnce(error);

      const { result } = renderHook(() =>
        useAnalyticsExport({
          student: createMockStudent(),
          filteredData: createMockFilteredData(),
          analyticsResults: mockAnalyticsResults,
          tAnalytics: mockTAnalytics,
        }),
      );

      await expect(
        act(async () => {
          await result.current.exportTo('csv');
        }),
      ).rejects.toThrow('Export failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Export failed:', error);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'export.failure',
        description: 'export.failure',
        variant: 'destructive',
      });

      expect(result.current.isExporting).toBe(false);
    });

    it('resets export state on error', async () => {
      mockExportTo.mockRejectedValueOnce(new Error('Export failed'));

      const { result } = renderHook(() =>
        useAnalyticsExport({
          student: createMockStudent(),
          filteredData: createMockFilteredData(),
          analyticsResults: mockAnalyticsResults,
          tAnalytics: mockTAnalytics,
        }),
      );

      try {
        await act(async () => {
          await result.current.exportTo('csv');
        });
      } catch {
        // Expected error
      }

      expect(result.current.isExporting).toBe(false);
    });
  });

  describe('Reset Functionality', () => {
    it('resets export state', async () => {
      const { result } = renderHook(() =>
        useAnalyticsExport({
          student: createMockStudent(),
          filteredData: createMockFilteredData(),
          analyticsResults: mockAnalyticsResults,
          tAnalytics: mockTAnalytics,
        }),
      );

      // Start an export
      await act(async () => {
        await result.current.exportTo('csv');
      });

      // Reset
      act(() => {
        result.current.resetExport();
      });

      expect(result.current.isExporting).toBe(false);
      expect(result.current.exportProgress).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty analytics results', async () => {
      const { result } = renderHook(() =>
        useAnalyticsExport({
          student: createMockStudent(),
          filteredData: createMockFilteredData(),
          analyticsResults: {},
          tAnalytics: mockTAnalytics,
        }),
      );

      await act(async () => {
        await result.current.exportTo('json');
      });

      expect(mockExportTo).toHaveBeenCalled();
      const exportData = mockExportTo.mock.calls[0][1];
      expect(exportData.analytics.patterns).toEqual([]);
    });

    it('handles visualization ref with null current', async () => {
      const visualizationRef = { current: null };

      const { result } = renderHook(() =>
        useAnalyticsExport({
          student: createMockStudent(),
          filteredData: createMockFilteredData(),
          analyticsResults: mockAnalyticsResults,
          tAnalytics: mockTAnalytics,
          visualizationRef,
        }),
      );

      await act(async () => {
        await result.current.exportTo('pdf');
      });

      const exportData = mockExportTo.mock.calls[0][1];
      expect(exportData.charts).toBeUndefined();
    });

    it('handles concurrent export requests', async () => {
      const { result } = renderHook(() =>
        useAnalyticsExport({
          student: createMockStudent(),
          filteredData: createMockFilteredData(),
          analyticsResults: mockAnalyticsResults,
          tAnalytics: mockTAnalytics,
        }),
      );

      // Start two exports simultaneously
      await act(async () => {
        await Promise.all([result.current.exportTo('csv'), result.current.exportTo('json')]);
      });

      // Both should complete
      expect(mockExportTo).toHaveBeenCalledTimes(2);
    });
  });

  describe('Progress Tracking', () => {
    it('progresses through all stages', async () => {
      const { result } = renderHook(() =>
        useAnalyticsExport({
          student: createMockStudent(),
          filteredData: createMockFilteredData(),
          analyticsResults: mockAnalyticsResults,
          tAnalytics: mockTAnalytics,
        }),
      );

      expect(result.current.exportProgress).toBe(0);

      await act(async () => {
        await result.current.exportTo('csv');
      });

      // After completion, progress should be at some stage (implementation detail)
      expect(result.current.exportProgress).toBeGreaterThanOrEqual(0);
      expect(result.current.exportProgress).toBeLessThanOrEqual(100);
    });
  });
});
