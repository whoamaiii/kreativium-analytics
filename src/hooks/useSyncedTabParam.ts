import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { TabKey } from '@/types/analytics';
import type { ExplorePreset } from '@/types/analytics';
import { logger } from '@/lib/logger';
import { useUrlSync } from './useUrlSync';

const VALID_TABS: ReadonlyArray<TabKey> = ['overview', 'explore', 'alerts', 'monitoring'] as const;

const LEGACY_TAB_MAP: Record<string, TabKey> = {
  // Previously separate tabs now consolidated under Explore
  charts: 'explore',
  patterns: 'explore',
  correlations: 'explore',
  // Legacy alias previously mapped to charts; now to explore
  visualizations: 'explore',
  // Alerts remains the same
  alerts: 'alerts',
};

// When we redirect legacy tabs to 'explore', suggest a preset to preserve intent
const LEGACY_TAB_TO_SUGGESTED_PRESET: Record<string, ExplorePreset | undefined> = {
  charts: 'charts',
  visualizations: 'charts',
  patterns: 'patterns',
  correlations: 'correlations',
  alerts: undefined,
};

function isValidTab(value: string | null | undefined): value is TabKey {
  if (!value) return false;
  const lower = value.toLowerCase();
  const mapped = LEGACY_TAB_MAP[lower] ?? lower;
  return (VALID_TABS as readonly string[]).includes(mapped);
}

function normalizeTab(
  value: string | null | undefined,
  defaultTab: TabKey,
): { tab: TabKey; legacyFrom?: string; suggestedPreset?: ExplorePreset } {
  if (!value) return { tab: defaultTab };
  const lower = value.toLowerCase();
  const mapped = (LEGACY_TAB_MAP[lower] ?? lower) as string;
  const finalTab = (VALID_TABS as readonly string[]).includes(mapped)
    ? (mapped as TabKey)
    : defaultTab;
  if (lower !== mapped) {
    const suggestedPreset = LEGACY_TAB_TO_SUGGESTED_PRESET[lower];
    try {
      logger.debug('[useSyncedTabParam] Back-compat mapping applied', {
        from: value,
        to: finalTab,
        suggestedPreset,
      });
    } catch {
      // @silent-ok: logger failure is non-critical
    }
    return { tab: finalTab, legacyFrom: lower, suggestedPreset };
  }
  return { tab: finalTab };
}

export interface UseSyncedTabParamOptions {
  // Debounce duration in ms for URL updates
  debounceMs?: number;
  // Query parameter key to use. Defaults to 'tab'.
  paramKey?: string;
  // Default tab when missing/invalid in URL. Defaults to 'overview'.
  defaultTab?: TabKey;
  // Callback invoked when a legacy redirect is applied (e.g., patterns -> explore)
  onLegacyRedirect?: (info: { from: string; to: TabKey; suggestedPreset?: ExplorePreset }) => void;
}

export type UseSyncedTabParamReturn = [TabKey, Dispatch<SetStateAction<TabKey>>];

/**
 * useSyncedTabParam
 * - Reads initial tab from the URL (?tab=...)
 * - Validates against TabKey and falls back to 'overview'
 * - Writes changes to URL using useUrlSync generic hook
 * - Debounces writes to avoid spamming history on quick toggles
 * - Keeps state in sync with back/forward navigation via popstate
 * - Handles legacy tab mappings (e.g., patterns -> explore)
 */
export function useSyncedTabParam(options: UseSyncedTabParamOptions = {}): UseSyncedTabParamReturn {
  const { debounceMs = 150, paramKey = 'tab', defaultTab = 'overview', onLegacyRedirect } = options;

  // Use the generic useUrlSync hook with tab-specific read/write functions
  return useUrlSync<TabKey>({
    defaultValue: defaultTab,
    debounceMs,
    loggerName: 'useSyncedTabParam',
    read: useCallback(
      (params: URLSearchParams): TabKey => {
        const urlValue = params.get(paramKey);
        const normalized = normalizeTab(urlValue, defaultTab);
        const tab = normalized.tab || defaultTab;

        // If we applied a legacy mapping (e.g., patterns -> explore), reflect it in the URL
        if (normalized.legacyFrom) {
          try {
            const url = new URL(window.location.href);
            url.searchParams.set(paramKey, tab);
            if (tab === 'explore' && normalized.suggestedPreset) {
              // Preserve intent: set preset unless it's already explicitly present
              const existingPreset = url.searchParams.get('preset');
              if (!existingPreset) {
                url.searchParams.set('preset', normalized.suggestedPreset);
              }
            }
            const nextState = {
              ...(window.history.state || {}),
              legacyRedirect: {
                fromTab: normalized.legacyFrom,
                toTab: tab,
                suggestedPreset: normalized.suggestedPreset,
              },
            };
            window.history.replaceState(nextState, '', url.toString());
          } catch {
            // @silent-ok: URL update failure is non-critical
          }
          if (typeof onLegacyRedirect === 'function') {
            try {
              onLegacyRedirect({
                from: normalized.legacyFrom,
                to: tab,
                suggestedPreset: normalized.suggestedPreset,
              });
            } catch {
              // @silent-ok: callback failure is non-critical
            }
          }
        }

        return tab;
      },
      [defaultTab, paramKey, onLegacyRedirect],
    ),
    write: useCallback(
      (tab: TabKey, params: URLSearchParams) => {
        params.set(paramKey, tab);
      },
      [paramKey],
    ),
  });
}
