import { useMemo } from 'react';
import { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import { FilterCriteria, applyFilters } from '@/lib/filterUtils';
import { HighlightState, TimeRange } from './useVisualizationState';
import { subDays } from 'date-fns';
import { logger } from '@/lib/logger';

const parseTimestamp = (entry: { timestamp: string | Date }): Date | null => {
  if (entry.timestamp instanceof Date) {
    return entry.timestamp;
  }
  if (typeof entry.timestamp === 'string') {
    const date = new Date(entry.timestamp);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
};

export const useFilteredData = (
  emotions: EmotionEntry[],
  sensoryInputs: SensoryEntry[],
  trackingEntries: TrackingEntry[],
  selectedTimeRange: TimeRange,
  filterCriteria: FilterCriteria,
  highlightState: HighlightState,
) => {
  const filteredData = useMemo(() => {
    try {
      const now = new Date();
      const cutoff =
        selectedTimeRange === '7d'
          ? subDays(now, 7)
          : selectedTimeRange === '30d'
            ? subDays(now, 30)
            : selectedTimeRange === '90d'
              ? subDays(now, 90)
              : null;

      let filteredEmotions = Array.isArray(emotions)
        ? cutoff
          ? emotions.filter((e) => {
              const timestamp = parseTimestamp(e);
              return timestamp && timestamp >= cutoff;
            })
          : emotions
        : [];
      let filteredSensory = Array.isArray(sensoryInputs)
        ? cutoff
          ? sensoryInputs.filter((s) => {
              const timestamp = parseTimestamp(s);
              return timestamp && timestamp >= cutoff;
            })
          : sensoryInputs
        : [];
      let filteredTracking = Array.isArray(trackingEntries)
        ? cutoff
          ? trackingEntries.filter((t) => {
              const timestamp = parseTimestamp(t);
              return timestamp && timestamp >= cutoff;
            })
          : trackingEntries
        : [];

      const normalizeFilterResult = <T>(
        original: T[],
        result: unknown,
        key: 'emotions' | 'sensoryInputs' | 'trackingEntries',
      ): T[] => {
        if (Array.isArray(result)) return result as T[];
        if (
          result &&
          typeof result === 'object' &&
          Array.isArray(
            (result as Record<'emotions' | 'sensoryInputs' | 'trackingEntries', unknown[]>)[key],
          )
        ) {
          return (result as Record<'emotions' | 'sensoryInputs' | 'trackingEntries', T[]>)[key];
        }
        return original;
      };

      const emoRes = applyFilters(filteredEmotions, filterCriteria, (e) => e, undefined, undefined);
      filteredEmotions = normalizeFilterResult(filteredEmotions, emoRes, 'emotions');

      const senRes = applyFilters(filteredSensory, filterCriteria, undefined, (s) => s, undefined);
      filteredSensory = normalizeFilterResult(filteredSensory, senRes, 'sensoryInputs');

      const trkRes = applyFilters(
        filteredTracking,
        filterCriteria,
        (t) => t?.emotions?.[0] || null,
        (t) => t?.sensoryInputs?.[0] || null,
        (t) => t?.environmentalData || null,
      );
      filteredTracking = normalizeFilterResult(filteredTracking, trkRes, 'trackingEntries');

      if (highlightState.type && highlightState.id) {
        const related = new Set(highlightState.relatedIds);
        filteredEmotions = filteredEmotions.filter(
          (e) => e?.id === highlightState.id || related.has(e?.id),
        );
        filteredSensory = filteredSensory.filter(
          (s) => s?.id === highlightState.id || related.has(s?.id),
        );
        filteredTracking = filteredTracking.filter(
          (t) => t?.id === highlightState.id || related.has(t?.id),
        );
      }

      const parsedEmotions = filteredEmotions
        .map((e) => {
          const ts = parseTimestamp(e);
          return ts ? { ...e, timestamp: ts } : null;
        })
        .filter((e): e is EmotionEntry => e !== null);

      const parsedSensory = filteredSensory
        .map((s) => {
          const ts = parseTimestamp(s);
          return ts ? { ...s, timestamp: ts } : null;
        })
        .filter((s): s is SensoryEntry => s !== null);

      const parsedTracking = filteredTracking
        .map((t) => {
          const ts = parseTimestamp(t);
          return ts ? { ...t, timestamp: ts } : null;
        })
        .filter((t): t is TrackingEntry => t !== null);

      return {
        emotions: parsedEmotions,
        sensoryInputs: parsedSensory,
        trackingEntries: parsedTracking,
      };
    } catch (error) {
      logger.error('useFilteredData failed', { error });
      return { emotions: [], sensoryInputs: [], trackingEntries: [] };
    }
  }, [emotions, sensoryInputs, trackingEntries, selectedTimeRange, filterCriteria, highlightState]);

  return filteredData;
};
