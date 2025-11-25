/**
 * Analytics Export Management Hook
 *
 * Extracted from AnalyticsDashboard.tsx to separate export operations
 * from UI concerns.
 *
 * This hook consolidates all export-related operations:
 * - Date range calculation from filtered data
 * - Chart collection from registry with filtering
 * - Export data preparation
 * - Progress tracking (5%, 20%, 40%, 65%, 100%)
 * - Format-specific handling (PDF, CSV, JSON)
 * - Error handling and user feedback
 */

import { useState, useCallback, useRef } from 'react';
import { analyticsExport, type ExportFormat } from '@/lib/analyticsExport';
import type { ExportOptions } from '@/components/ExportDialog';
import type { Student, TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';
import { toast } from '@/hooks/useToast';
import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsResults {
  patterns?: unknown[];
  correlations?: unknown[];
  insights?: unknown[];
  predictiveInsights?: unknown[];
  anomalies?: unknown[];
}

export interface ChartExport {
  title: string;
  type?: string;
  dataURL?: string;
  svgString?: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface UseAnalyticsExportOptions {
  /**
   * Student data for export
   */
  student: Student;

  /**
   * Filtered data to export
   */
  filteredData: {
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
  };

  /**
   * Analytics results to include in export
   */
  analyticsResults: AnalyticsResults;

  /**
   * Translation function for analytics messages
   */
  tAnalytics: (key: string, params?: Record<string, unknown>) => string | unknown;

  /**
   * Optional ref to visualization element for PDF export
   */
  visualizationRef?: React.RefObject<HTMLElement>;

  /**
   * Maximum number of charts to include in PDF export
   * @default 6
   */
  maxCharts?: number;
}

export interface UseAnalyticsExportReturn {
  /**
   * Whether export is in progress
   */
  isExporting: boolean;

  /**
   * Current export progress (0-100)
   */
  exportProgress: number;

  /**
   * Execute export operation
   */
  exportTo: (format: ExportFormat, options?: Partial<ExportOptions>) => Promise<void>;

  /**
   * Reset export state
   */
  resetExport: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate date range from filtered data entries
 */
function calculateDateRange(entries: TrackingEntry[]): DateRange {
  if (entries.length === 0) {
    const now = new Date();
    return { start: now, end: now };
  }

  const [firstEntry] = entries;
  const initial =
    firstEntry.timestamp instanceof Date ? firstEntry.timestamp : new Date(firstEntry.timestamp);

  const accumulator = entries.reduce<{ minDate: Date; maxDate: Date }>(
    (acc, entry) => {
      const rawTimestamp =
        entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
      const timestamp = Number.isNaN(rawTimestamp.getTime()) ? acc.minDate : rawTimestamp;

      return {
        minDate: timestamp < acc.minDate ? timestamp : acc.minDate,
        maxDate: timestamp > acc.maxDate ? timestamp : acc.maxDate,
      };
    },
    { minDate: initial, maxDate: initial },
  );

  return { start: accumulator.minDate, end: accumulator.maxDate };
}

/**
 * Check if two date ranges overlap
 */
function dateRangesOverlap(range1: DateRange, range2: DateRange): boolean {
  const start1 = range1.start.getTime();
  const end1 = range1.end.getTime();
  const start2 = range2.start.getTime();
  const end2 = range2.end.getTime();

  return !(end1 < start2 || start1 > end2);
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing analytics export operations
 *
 * @example
 * ```typescript
 * const exportHook = useAnalyticsExport({
 *   student,
 *   filteredData,
 *   analyticsResults: { patterns, correlations, insights },
 *   tAnalytics,
 *   visualizationRef,
 * });
 *
 * // Export to PDF with options
 * await exportHook.exportTo('pdf', { chartQuality: 'high' });
 *
 * // Export to CSV
 * await exportHook.exportTo('csv');
 *
 * // Show progress
 * {exportHook.isExporting && (
 *   <Progress value={exportHook.exportProgress} />
 * )}
 * ```
 */
export function useAnalyticsExport(options: UseAnalyticsExportOptions): UseAnalyticsExportReturn {
  const {
    student,
    filteredData,
    analyticsResults,
    tAnalytics,
    visualizationRef,
    maxCharts = 6,
  } = options;

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Track if component is mounted to avoid state updates after unmount
  const isMountedRef = useRef(true);
  const safeSetExportProgress = useCallback((value: number) => {
    if (isMountedRef.current) {
      setExportProgress(value);
    }
  }, []);

  /**
   * Collect chart exports from registry for PDF export
   */
  const collectChartExports = useCallback(
    async (format: ExportFormat, dateRange: DateRange): Promise<ChartExport[]> => {
      if (format !== 'pdf') return [];

      try {
        const { chartRegistry } = await import('@/lib/chartRegistry');
        const registrations = chartRegistry.all();

        if (registrations.length === 0) {
          toast({
            title: String(tAnalytics('export.noCharts')),
            description: String(tAnalytics('export.noCharts')),
          });
          return [];
        }

        // Filter charts by student ID and date range
        const overlappingCharts = registrations
          .filter((chart) => !chart.studentId || chart.studentId === student.id)
          .filter((chart) => {
            if (!chart.dateRange) return true;
            return dateRangesOverlap(chart.dateRange, dateRange);
          })
          .slice(0, maxCharts);

        safeSetExportProgress(40);

        // Export each chart as image/SVG
        const exports = await Promise.all(
          overlappingCharts.map(async (chart) => {
            const methods = chart.getMethods();
            return {
              title: chart.title,
              type: chart.type,
              dataURL: methods.getImage({ pixelRatio: 2, backgroundColor: '#ffffff' }),
              svgString: methods.getSVG(),
            };
          }),
        );

        const usableExports = exports.filter((item) => item.dataURL || item.svgString);

        if (usableExports.length === 0) {
          toast({
            title: String(tAnalytics('export.noCharts')),
            description: String(tAnalytics('export.noCharts')),
          });
        }

        return usableExports;
      } catch (collectError) {
        logger.error('Failed to collect chart exports', collectError);
        toast({
          title: String(tAnalytics('export.noCharts')),
          description: String(tAnalytics('export.noCharts')),
        });
        return [];
      }
    },
    [student.id, maxCharts, tAnalytics, safeSetExportProgress],
  );

  /**
   * Execute export operation
   */
  const exportTo = useCallback(
    async (format: ExportFormat, opts?: Partial<ExportOptions>): Promise<void> => {
      try {
        setIsExporting(true);
        safeSetExportProgress(5);

        // Calculate date range
        const dateRange = calculateDateRange(filteredData.entries);
        safeSetExportProgress(20);

        // Collect chart exports for PDF
        const chartExports = await collectChartExports(format, dateRange);

        // Prepare export data
        const exportData = {
          student,
          dateRange,
          data: filteredData,
          analytics: {
            patterns: analyticsResults.patterns || [],
            correlations: analyticsResults.correlations || [],
            insights: analyticsResults.insights || [],
            predictiveInsights: analyticsResults.predictiveInsights || [],
            anomalies: analyticsResults.anomalies || [],
          },
          charts:
            format === 'pdf' && visualizationRef?.current
              ? [
                  {
                    element: visualizationRef.current,
                    title: String(tAnalytics('export.chartTitle')),
                  },
                ]
              : undefined,
          chartExports,
        } as const;

        safeSetExportProgress(65);

        // Execute export with format-specific options
        const pdfOptions = opts?.chartQuality
          ? { pdf: { chartQuality: opts.chartQuality } }
          : undefined;
        await analyticsExport.exportTo(format, exportData, pdfOptions);

        safeSetExportProgress(100);

        // Show success message
        const successMessageKey: Record<ExportFormat, string> = {
          pdf: 'export.success.pdf',
          csv: 'export.success.csv',
          json: 'export.success.json',
        };

        toast({
          title: String(tAnalytics(successMessageKey[format])),
          description: String(tAnalytics(successMessageKey[format])),
        });
      } catch (error) {
        logger.error('Export failed:', error);
        toast({
          title: String(tAnalytics('export.failure')),
          description: String(tAnalytics('export.failure')),
          variant: 'destructive',
        });
        throw error; // Re-throw to allow caller to handle
      } finally {
        if (isMountedRef.current) {
          setIsExporting(false);
        }
      }
    },
    [
      filteredData,
      analyticsResults,
      student,
      tAnalytics,
      visualizationRef,
      collectChartExports,
      safeSetExportProgress,
    ],
  );

  /**
   * Reset export state
   */
  const resetExport = useCallback(() => {
    setIsExporting(false);
    setExportProgress(0);
  }, []);

  return {
    isExporting,
    exportProgress,
    exportTo,
    resetExport,
  };
}
