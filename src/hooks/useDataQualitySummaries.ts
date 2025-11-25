import { useMemo } from 'react';
import {
  computeDataQualitySummary,
  type DataQualitySummary,
  type DateRange,
} from '@/lib/analytics/dataQuality';
import { legacyAnalyticsAdapter } from '@/lib/adapters/legacyAnalyticsAdapter';

const DEFAULT_BASELINE_MINIMUM = 5;

export interface UseDataQualitySummariesOptions {
  baselineRange?: DateRange;
  baselineMinimum?: number;
}

export interface DataQualityHookResult {
  current: DataQualitySummary | null;
  baseline: DataQualitySummary | null;
  isBaselineInsufficient: boolean;
}

export const useDataQualitySummaries = (
  studentId: string,
  range?: DateRange,
  options?: UseDataQualitySummariesOptions,
): DataQualityHookResult => {
  const { baselineRange, baselineMinimum = DEFAULT_BASELINE_MINIMUM } = options ?? {};

  const entries = useMemo(() => {
    if (!studentId) return [];
    try {
      return legacyAnalyticsAdapter.listTrackingEntriesForStudent(studentId) ?? [];
    } catch {
      return [];
    }
  }, [studentId]);

  const current = useMemo(() => {
    if (!studentId) return null;
    return computeDataQualitySummary(entries, range);
  }, [entries, range, studentId]);

  const baseline = useMemo(() => {
    if (!studentId || !baselineRange) return null;
    return computeDataQualitySummary(entries, baselineRange);
  }, [baselineRange, entries, studentId]);

  const isBaselineInsufficient = useMemo(() => {
    if (!baseline) return false;
    return baseline.total < baselineMinimum;
  }, [baseline, baselineMinimum]);

  return {
    current,
    baseline,
    isBaselineInsufficient,
  };
};
