import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ExplorePreset } from '@/types/analytics';
import { logger } from '@/lib/logger';

const VALID_PRESETS: ReadonlyArray<ExplorePreset> = ['charts', 'patterns', 'correlations'] as const;

function isValidPreset(value: string | null | undefined): value is ExplorePreset {
  if (!value) return false;
  const lower = value.toLowerCase();
  return (VALID_PRESETS as readonly string[]).includes(lower);
}

function normalizePreset(value: string | null | undefined, fallback: ExplorePreset): ExplorePreset {
  if (!value) return fallback;
  const lower = value.toLowerCase();
  const ok = (VALID_PRESETS as readonly string[]).includes(lower);
  const finalPreset = (ok ? lower : fallback) as ExplorePreset;
  if (lower !== finalPreset) {
    try { logger.debug('[useSyncedExplorePreset] Normalized invalid preset', { from: value, to: finalPreset }); } catch {}
  }
  return finalPreset;
}

export interface UseSyncedExplorePresetOptions {
  debounceMs?: number;
  paramKey?: string; // defaults to 'preset'
  defaultPreset?: ExplorePreset; // defaults to 'charts'
}

export type UseSyncedExplorePresetReturn = [ExplorePreset, Dispatch<SetStateAction<ExplorePreset>>];

/**
 * useSyncedExplorePreset
 * - Reads initial preset from the URL (?preset=...)
 * - Validates against ExplorePreset and falls back to 'charts'
 * - Writes changes to URL using history.replaceState to avoid extra renders
 * - Debounces writes to avoid spamming history on quick toggles
 * - Keeps state in sync with back/forward navigation via popstate
 */
export function useSyncedExplorePreset(options: UseSyncedExplorePresetOptions = {}): UseSyncedExplorePresetReturn {
  const { debounceMs = 150, paramKey = 'preset', defaultPreset = 'charts' } = options;

  const getPresetFromLocation = useCallback((): ExplorePreset => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlValue = params.get(paramKey);
      const preset = normalizePreset(urlValue, defaultPreset);
      try { logger.debug('[useSyncedExplorePreset] Read preset from URL', { preset, paramKey }); } catch {}
      return preset;
    } catch {
      return defaultPreset;
    }
  }, [defaultPreset, paramKey]);

  const [preset, setPreset] = useState<ExplorePreset>(() => getPresetFromLocation());

  // Sync with back/forward navigation
  useEffect(() => {
    const onPop = () => {
      const next = getPresetFromLocation();
      try { logger.debug('[useSyncedExplorePreset] popstate -> sync preset', { preset: next, paramKey }); } catch {}
      setPreset(next);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [getPresetFromLocation, paramKey]);

  // Debounced URL writer
  const debounceTimer = useRef<number | undefined>(undefined);
  const writeToUrl = useCallback((nextPreset: ExplorePreset) => {
    const doWrite = () => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set(paramKey, nextPreset);
        window.history.replaceState(window.history.state, '', url.toString());
        try { logger.debug('[useSyncedExplorePreset] URL sync via history.replaceState', { preset: nextPreset, paramKey }); } catch {}
      } catch {
        // no-op: never throw from URL sync
      }
    };
    if (debounceTimer.current) {
      window.clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = window.setTimeout(doWrite, debounceMs);
  }, [debounceMs, paramKey]);

  // When preset changes (from UI), write to URL
  useEffect(() => {
    writeToUrl(preset);
  }, [preset, writeToUrl]);

  // Cleanup any pending debounce timer on unmount to avoid post-unmount URL writes
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        try { window.clearTimeout(debounceTimer.current); } catch {}
        debounceTimer.current = undefined;
      }
    };
  }, []);

  return [preset, setPreset];
}

export { VALID_PRESETS, isValidPreset, normalizePreset };


