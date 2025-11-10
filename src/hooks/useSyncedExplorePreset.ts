import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ExplorePreset } from '@/types/analytics';
import { logger } from '@/lib/logger';
import { useUrlSync } from './useUrlSync';

const VALID_PRESETS: ReadonlyArray<ExplorePreset> = ['charts', 'patterns', 'correlations'] as const;

// Map legacy/alias preset names to current ones
const LEGACY_PRESET_MAP: Record<string, ExplorePreset> = {
  chart: 'charts',
  charts: 'charts',
  graph: 'charts',
  graphs: 'charts',
  visualization: 'charts',
  visualizations: 'charts',
  pattern: 'patterns',
  patterns: 'patterns',
  correlation: 'correlations',
  correlations: 'correlations',
};

// Mirror of the tab->preset intent mapping for legacy redirects
const LEGACY_TAB_TO_SUGGESTED_PRESET: Record<string, ExplorePreset | undefined> = {
  charts: 'charts',
  visualizations: 'charts',
  patterns: 'patterns',
  correlations: 'correlations',
  alerts: undefined,
};

function isValidPreset(value: string | null | undefined): value is ExplorePreset {
  if (!value) return false;
  const lower = value.toLowerCase();
  return (VALID_PRESETS as readonly string[]).includes(lower);
}

function normalizePreset(value: string | null | undefined, fallback: ExplorePreset): ExplorePreset {
  if (!value) return fallback;
  const lower = value.toLowerCase();
  const mapped = (LEGACY_PRESET_MAP[lower] ?? lower) as string;
  const ok = (VALID_PRESETS as readonly string[]).includes(mapped);
  const finalPreset = (ok ? mapped : fallback) as ExplorePreset;
  if (lower !== finalPreset) {
    try { logger.debug('[useSyncedExplorePreset] Normalized/legacy-mapped preset', { from: value, mapped, to: finalPreset }); } catch {}
  }
  return finalPreset;
}

export interface UseSyncedExplorePresetOptions {
  debounceMs?: number;
  paramKey?: string; // defaults to 'preset'
  defaultPreset?: ExplorePreset; // defaults to 'charts'
  tabParamKey?: string; // defaults to 'tab'
  currentTab?: 'overview' | 'explore' | 'alerts' | string; // if provided, overrides URL inference
}

export type UseSyncedExplorePresetReturn = [ExplorePreset, Dispatch<SetStateAction<ExplorePreset>>];

/**
 * useSyncedExplorePreset
 * - Reads initial preset from the URL (?preset=...)
 * - Validates against ExplorePreset and falls back to 'charts'
 * - Writes changes to URL using useUrlSync generic hook
 * - Debounces writes to avoid spamming history on quick toggles
 * - Keeps state in sync with back/forward navigation via popstate
 */
export function useSyncedExplorePreset(options: UseSyncedExplorePresetOptions = {}): UseSyncedExplorePresetReturn {
  const { debounceMs = 150, paramKey = 'preset', defaultPreset = 'charts', tabParamKey = 'tab', currentTab } = options;

  return useUrlSync<ExplorePreset>({
    defaultValue: defaultPreset,
    debounceMs,
    loggerName: 'useSyncedExplorePreset',
    read: useCallback((params: URLSearchParams): ExplorePreset => {
      const urlValue = params.get(paramKey);

      // Check for a legacy tab redirect intent carried via history state
      let suggestedFromLegacy: ExplorePreset | undefined;
      try {
        const state: any = window.history.state || {};
        const legacy = state?.legacyRedirect;
        if (legacy?.toTab === 'explore' && legacy?.suggestedPreset) {
          suggestedFromLegacy = legacy.suggestedPreset as ExplorePreset;
        }
      } catch {}

      // Fallback: infer from current tab param (customizable) if present and legacy-like
      if (!suggestedFromLegacy) {
        const tabRaw = typeof currentTab === 'string' && currentTab.length > 0 ? currentTab : params.get(tabParamKey);
        const tabLower = (tabRaw || '').toLowerCase();
        const maybePreset = LEGACY_TAB_TO_SUGGESTED_PRESET[tabLower];
        if (maybePreset) suggestedFromLegacy = maybePreset;
      }

      const fallbackPreset = suggestedFromLegacy ?? defaultPreset;
      const preset = normalizePreset(urlValue, fallbackPreset);

      // If URL is missing or differs (due to legacy/normalization), conditionally sync it
      const existing = params.get(paramKey);
      const tabParam = (typeof currentTab === 'string' && currentTab.length > 0 ? currentTab : params.get(tabParamKey) || '').toLowerCase();
      const shouldWrite = !!existing || tabParam === 'explore' || !!suggestedFromLegacy;
      if (shouldWrite && (!existing || existing.toLowerCase() !== preset)) {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set(paramKey, preset);
          window.history.replaceState(window.history.state, '', url.toString());
          try { logger.debug('[useSyncedExplorePreset] Applied legacy/normalized preset to URL', { preset, paramKey }); } catch {}
        } catch {}
      }

      return preset;
    }, [defaultPreset, paramKey, tabParamKey, currentTab]),
    write: useCallback((preset: ExplorePreset, params: URLSearchParams) => {
      params.set(paramKey, preset);
    }, [paramKey]),
  });
}

export { VALID_PRESETS, isValidPreset, normalizePreset, LEGACY_PRESET_MAP };
