/**
 * Analytics Data Normalization Hook
 *
 * Extracted from AnalyticsDashboard.tsx to separate data normalization
 * and signature generation from UI concerns.
 *
 * This hook consolidates data processing operations:
 * - Timestamp normalization (Date objects, strings, numbers)
 * - Data signature generation for change detection
 * - Memoization to prevent unnecessary re-renders
 */

import { useMemo, useCallback } from 'react';
import { logger } from '@/lib/logger';
import type { TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';

// ============================================================================
// Types
// ============================================================================

export interface FilteredData {
  entries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
}

export interface NormalizedData {
  entries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
}

export interface UseAnalyticsDataOptions {
  /**
   * Raw filtered data to normalize
   */
  filteredData: FilteredData;
}

export interface UseAnalyticsDataReturn {
  /**
   * Normalized data with consistent Date objects
   */
  normalizedData: NormalizedData;

  /**
   * Stable signature string for change detection
   * Format: "entries|emotions|sensory|firstTimestamp|lastTimestamp"
   */
  dataSignature: string;

  /**
   * Manually normalize data (exposed for testing/reuse)
   */
  normalizeData: (data: FilteredData) => NormalizedData;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Coerce a timestamp value to a valid Date object
 *
 * Handles:
 * - Date objects (validated)
 * - ISO strings
 * - Unix timestamps (numbers)
 * - Invalid values (returns current date as fallback)
 */
function coerceTimestamp(value: unknown): Date {
  try {
    // Already a valid Date
    if (value instanceof Date && !isNaN(value.getTime())) {
      return value;
    }

    // String or number
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? new Date() : date;
    }

    // Fallback
    return new Date();
  } catch (error) {
    logger.error('Error coercing timestamp:', value, error);
    return new Date();
  }
}

/**
 * Convert a timestamp to milliseconds for signature generation
 */
function timestampToMillis(value: unknown): number {
  try {
    const date = value instanceof Date ? value : new Date(value as string);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  } catch {
    return 0;
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for normalizing analytics data and generating stable signatures
 *
 * Normalizes timestamps to Date objects and generates a stable signature
 * string that only changes when the actual data changes (not just object
 * identity).
 *
 * @example
 * ```typescript
 * const { normalizedData, dataSignature } = useAnalyticsData({
 *   filteredData: { entries, emotions, sensoryInputs },
 * });
 *
 * // Use normalized data for analysis
 * useEffect(() => {
 *   runAnalysis(normalizedData);
 * }, [dataSignature]); // Re-run only when data actually changes
 * ```
 */
export function useAnalyticsData(
  options: UseAnalyticsDataOptions
): UseAnalyticsDataReturn {
  const { filteredData } = options;

  /**
   * Normalize data with consistent timestamps
   */
  const normalizeData = useCallback((data: FilteredData): NormalizedData => {
    try {
      return {
        entries: (data.entries || []).map((entry) => ({
          ...entry,
          timestamp: coerceTimestamp(entry.timestamp),
        })),
        emotions: (data.emotions || []).map((emotion) => ({
          ...emotion,
          timestamp: coerceTimestamp(emotion.timestamp),
        })),
        sensoryInputs: (data.sensoryInputs || []).map((sensory) => ({
          ...sensory,
          timestamp: coerceTimestamp(sensory.timestamp),
        })),
      };
    } catch (error) {
      logger.error('Error normalizing filteredData:', error);
      return {
        entries: [],
        emotions: [],
        sensoryInputs: [],
      };
    }
  }, []);

  /**
   * Generate stable data signature for change detection
   *
   * Signature format: "entriesCount|emotionsCount|sensoryCount|firstMs|lastMs"
   *
   * This allows effects to depend on actual data changes rather than
   * object identity changes from parent re-renders.
   */
  const dataSignature = useMemo(() => {
    const entries = filteredData.entries || [];
    const emotions = filteredData.emotions || [];
    const sensory = filteredData.sensoryInputs || [];

    const firstTimestamp = entries[0]?.timestamp;
    const lastTimestamp =
      entries.length > 0 ? entries[entries.length - 1]?.timestamp : undefined;

    return [
      entries.length,
      emotions.length,
      sensory.length,
      timestampToMillis(firstTimestamp),
      timestampToMillis(lastTimestamp),
    ].join('|');
  }, [filteredData]);

  /**
   * Memoize normalized data based on signature
   *
   * This prevents re-normalization when only object identity changes.
   */
  const normalizedData = useMemo(
    () => normalizeData(filteredData),
    [normalizeData, dataSignature]
  );

  return {
    normalizedData,
    dataSignature,
    normalizeData,
  };
}

// ============================================================================
// Standalone Utilities (for non-hook usage)
// ============================================================================

/**
 * Standalone function to normalize analytics data
 *
 * Use this when you need to normalize data outside of a React component.
 *
 * @example
 * ```typescript
 * const normalized = normalizeAnalyticsData(rawData);
 * ```
 */
export function normalizeAnalyticsData(data: FilteredData): NormalizedData {
  try {
    return {
      entries: (data.entries || []).map((entry) => ({
        ...entry,
        timestamp: coerceTimestamp(entry.timestamp),
      })),
      emotions: (data.emotions || []).map((emotion) => ({
        ...emotion,
        timestamp: coerceTimestamp(emotion.timestamp),
      })),
      sensoryInputs: (data.sensoryInputs || []).map((sensory) => ({
        ...sensory,
        timestamp: coerceTimestamp(sensory.timestamp),
      })),
    };
  } catch (error) {
    logger.error('Error normalizing filteredData:', error);
    return {
      entries: [],
      emotions: [],
      sensoryInputs: [],
    };
  }
}

/**
 * Generate data signature for change detection
 *
 * @example
 * ```typescript
 * const sig1 = generateDataSignature(data1);
 * const sig2 = generateDataSignature(data2);
 * if (sig1 !== sig2) {
 *   // Data changed, re-run analysis
 * }
 * ```
 */
export function generateDataSignature(data: FilteredData): string {
  const entries = data.entries || [];
  const emotions = data.emotions || [];
  const sensory = data.sensoryInputs || [];

  const firstTimestamp = entries[0]?.timestamp;
  const lastTimestamp =
    entries.length > 0 ? entries[entries.length - 1]?.timestamp : undefined;

  return [
    entries.length,
    emotions.length,
    sensory.length,
    timestampToMillis(firstTimestamp),
    timestampToMillis(lastTimestamp),
  ].join('|');
}
