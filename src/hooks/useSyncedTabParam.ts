import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { TabKey } from '@/types/analytics';
import { logger } from '@/lib/logger';


const VALID_TABS: ReadonlyArray<TabKey> = ['overview', 'explore', 'alerts'] as const;

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

function isValidTab(value: string | null | undefined): value is TabKey {
  if (!value) return false;
  const lower = value.toLowerCase();
  const mapped = LEGACY_TAB_MAP[lower] ?? lower;
  return (VALID_TABS as readonly string[]).includes(mapped);
}

function normalizeTab(value: string | null | undefined): TabKey {
  if (!value) return 'overview';
  const lower = value.toLowerCase();
  const mapped = (LEGACY_TAB_MAP[lower] ?? lower) as string;
  const finalTab = (VALID_TABS as readonly string[]).includes(mapped) ? (mapped as TabKey) : 'overview';
  if (lower !== finalTab) {
    try { logger.debug('[useSyncedTabParam] Back-compat mapping applied', { from: value, to: finalTab }); } catch {}
  }
  return finalTab;
}

export interface UseSyncedTabParamOptions {
  // Debounce duration in ms for URL updates
  debounceMs?: number;
  // Query parameter key to use. Defaults to 'tab'.
  paramKey?: string;
  // Default tab when missing/invalid in URL. Defaults to 'overview'.
  defaultTab?: TabKey;
}

export type UseSyncedTabParamReturn = [TabKey, Dispatch<SetStateAction<TabKey>>];

/**
 * useSyncedTabParam
 * - Reads initial tab from the URL (?tab=...)
 * - Validates against TabKey and falls back to 'charts'
 * - Writes changes to URL using react-router-dom useSearchParams when available,
 *   otherwise falls back to history.replaceState
 * - Debounces writes to avoid spamming history on quick toggles
 * - Keeps state in sync with back/forward navigation via popstate or router updates
 */
export function useSyncedTabParam(options: UseSyncedTabParamOptions = {}): UseSyncedTabParamReturn {
  const { debounceMs = 150, paramKey = 'tab', defaultTab = 'overview' } = options;

  // Read initial value from current URL
  const getTabFromLocation = useCallback((): TabKey => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlValue = params.get(paramKey);
      const tab = normalizeTab(urlValue) || defaultTab;
      try { logger.debug('[useSyncedTabParam] Read tab from URL', { tab, paramKey }); } catch {}
      return tab;
    } catch {
      return defaultTab;
    }
  }, [defaultTab, paramKey]);

  const [activeTab, setActiveTab] = useState<TabKey>(() => getTabFromLocation());


  // Keep state in sync when user uses back/forward buttons
  useEffect(() => {
    // If using router API, react-router will re-render on location changes and this effect
    // picks up changes by reading window.location, then updates state.
    const onPop = () => {
      const next = getTabFromLocation();
      try { logger.debug('[useSyncedTabParam] popstate -> sync activeTab', { tab: next, paramKey }); } catch {}
      setActiveTab(next);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [getTabFromLocation, paramKey]);


  // Debounced URL writer
  const debounceTimer = useRef<number | undefined>(undefined);

const writeToUrl = useCallback((nextTab: TabKey) => {
    const doWrite = () => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set(paramKey, nextTab);
        window.history.replaceState(window.history.state, '', url.toString());
        try { logger.debug('[useSyncedTabParam] URL sync via history.replaceState', { tab: nextTab, paramKey }); } catch {}
      } catch {
        // no-op: never throw in URL sync
      }
    };

    // Clear previous timer and schedule
    if (debounceTimer.current) {
      window.clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = window.setTimeout(doWrite, debounceMs);
  }, [debounceMs, paramKey]);

  // When activeTab changes (from UI), write to URL
  useEffect(() => {
    writeToUrl(activeTab);
  }, [activeTab, writeToUrl]);

  return [activeTab, setActiveTab];
}
