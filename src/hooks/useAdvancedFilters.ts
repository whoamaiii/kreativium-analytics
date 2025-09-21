import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FilterCriteria } from '@/lib/filterUtils';

// Local storage key for persistence
const STORAGE_KEY = 'analytics_advanced_filters';

// Default values for all criteria. Time range excluded from UI but kept in state.
const defaultCriteria: FilterCriteria = {
  dateRange: { start: null, end: null },
  emotions: { types: [], intensityRange: [0, 5], includeTriggers: [], excludeTriggers: [] },
  sensory: { types: [], responses: [], intensityRange: [0, 5] },
  environmental: {
    locations: [],
    activities: [],
    conditions: { noiseLevel: [0, 10], temperature: [15, 30], lighting: [] },
    weather: [],
    timeOfDay: [],
  },
  patterns: { anomaliesOnly: false, minConfidence: 0, patternTypes: [] },
  realtime: false,
};

export interface UseAdvancedFiltersReturn {
  draft: FilterCriteria;
  applied: FilterCriteria;
  setDraft: (updater: (prev: FilterCriteria) => FilterCriteria) => void;
  applyFilters: () => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  activeCounts: {
    emotions: number;
    sensory: number;
    environmental: number;
    patterns: number;
    advanced: number;
    total: number;
  };
  modifiedSinceApply: boolean;
}

function safeLoadFromStorage(): Partial<FilterCriteria> | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function safeSaveToStorage(criteria: FilterCriteria): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(criteria));
  } catch {
    // ignore persistence errors
  }
}

function mergeWithDefaults(partial: Partial<FilterCriteria> | null | undefined): FilterCriteria {
  if (!partial) return { ...defaultCriteria };
  return {
    dateRange: {
      start: partial.dateRange?.start ? new Date(partial.dateRange.start) : null,
      end: partial.dateRange?.end ? new Date(partial.dateRange.end) : null,
    },
    emotions: {
      types: partial.emotions?.types ?? [],
      intensityRange: partial.emotions?.intensityRange ?? [0, 5],
      includeTriggers: partial.emotions?.includeTriggers ?? [],
      excludeTriggers: partial.emotions?.excludeTriggers ?? [],
    },
    sensory: {
      types: partial.sensory?.types ?? [],
      responses: partial.sensory?.responses ?? [],
      intensityRange: partial.sensory?.intensityRange ?? [0, 5],
    },
    environmental: {
      locations: partial.environmental?.locations ?? [],
      activities: partial.environmental?.activities ?? [],
      conditions: {
        noiseLevel: partial.environmental?.conditions?.noiseLevel ?? [0, 10],
        temperature: partial.environmental?.conditions?.temperature ?? [15, 30],
        lighting: partial.environmental?.conditions?.lighting ?? [],
      },
      weather: partial.environmental?.weather ?? [],
      timeOfDay: partial.environmental?.timeOfDay ?? [],
    },
    patterns: {
      anomaliesOnly: partial.patterns?.anomaliesOnly ?? false,
      minConfidence: partial.patterns?.minConfidence ?? 0,
      patternTypes: partial.patterns?.patternTypes ?? [],
    },
    realtime: partial.realtime ?? false,
  };
}

function countActive(criteria: FilterCriteria): {
  emotions: number; sensory: number; environmental: number; patterns: number; advanced: number; total: number;
} {
  let emotions = 0;
  if (criteria.emotions.types.length > 0) emotions++;
  const [emin, emax] = criteria.emotions.intensityRange;
  if (emin !== defaultCriteria.emotions.intensityRange[0] || emax !== defaultCriteria.emotions.intensityRange[1]) emotions++;
  if (criteria.emotions.includeTriggers.length > 0 || criteria.emotions.excludeTriggers.length > 0) emotions++;

  let sensory = 0;
  if (criteria.sensory.types.length > 0) sensory++;
  const [smin, smax] = criteria.sensory.intensityRange;
  if (smin !== defaultCriteria.sensory.intensityRange[0] || smax !== defaultCriteria.sensory.intensityRange[1]) sensory++;
  if (criteria.sensory.responses.length > 0) sensory++;

  let environmental = 0;
  if (criteria.environmental.locations.length > 0) environmental++;
  if (criteria.environmental.activities.length > 0) environmental++;
  const [nmin, nmax] = criteria.environmental.conditions.noiseLevel;
  if (nmin !== defaultCriteria.environmental.conditions.noiseLevel[0] || nmax !== defaultCriteria.environmental.conditions.noiseLevel[1]) environmental++;
  const [tmin, tmax] = criteria.environmental.conditions.temperature;
  if (tmin !== defaultCriteria.environmental.conditions.temperature[0] || tmax !== defaultCriteria.environmental.conditions.temperature[1]) environmental++;
  if (criteria.environmental.conditions.lighting.length > 0) environmental++;
  if (criteria.environmental.weather.length > 0) environmental++;
  if (criteria.environmental.timeOfDay.length > 0) environmental++;

  let patterns = 0;
  if (criteria.patterns.anomaliesOnly) patterns++;
  if (criteria.patterns.minConfidence !== defaultCriteria.patterns.minConfidence) patterns++;
  if (criteria.patterns.patternTypes.length > 0) patterns++;

  let advanced = 0;
  if (criteria.realtime) advanced++;

  const total = emotions + sensory + environmental + patterns + advanced;
  return { emotions, sensory, environmental, patterns, advanced, total };
}

export function useAdvancedFilters(initial?: Partial<FilterCriteria>): UseAdvancedFiltersReturn {
  const initialLoaded = useRef<boolean>(false);
  const [applied, setApplied] = useState<FilterCriteria>(() => {
    const fromStorage = safeLoadFromStorage();
    const merged = mergeWithDefaults(fromStorage ?? initial);
    return merged;
  });
  const [draft, setDraftState] = useState<FilterCriteria>(() => applied);

  useEffect(() => {
    // On first mount only, if an explicit initial was provided and storage was empty, merge it
    if (initialLoaded.current) return;
    initialLoaded.current = true;
    if (initial) {
      const merged = mergeWithDefaults({ ...applied, ...initial });
      setApplied(merged);
      setDraftState(merged);
    }
  }, [initial]);

  const setDraft = useCallback((updater: (prev: FilterCriteria) => FilterCriteria) => {
    setDraftState(prev => updater(prev));
  }, []);

  const applyFilters = useCallback(() => {
    setApplied(prev => {
      const next = { ...draft };
      safeSaveToStorage(next);
      return next;
    });
  }, [draft]);

  const resetFilters = useCallback(() => {
    setApplied(defaultCriteria);
    setDraftState(defaultCriteria);
    safeSaveToStorage(defaultCriteria);
  }, []);

  const activeCounts = useMemo(() => countActive(draft), [draft]);
  const hasActiveFilters = activeCounts.total > 0;

  const modifiedSinceApply = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(applied);
  }, [draft, applied]);

  return {
    draft,
    applied,
    setDraft,
    applyFilters,
    resetFilters,
    hasActiveFilters,
    activeCounts,
    modifiedSinceApply,
  };
}


