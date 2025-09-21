import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logger } from '@/lib/logger';

export interface UseSyncedPatternParamsOptions {
  debounceMs?: number;
  patternIdKey?: string; // defaults to 'patternId'
  explainKey?: string; // defaults to 'explain'
}

export interface UseSyncedPatternParamsReturn {
  patternId: string | null;
  explain: boolean;
  setPatternId: (next: string | null) => void;
  setExplain: (next: boolean) => void;
  clearPatternParams: () => void;
}

function readBoolean(val: string | null | undefined): boolean {
  if (!val) return false;
  const lower = String(val).toLowerCase();
  return lower === '1' || lower === 'true';
}

function normalizePatternId(val: string | null | undefined): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * useSyncedPatternParams
 * - Manages pattern deep-link parameters in URL: `patternId` and `explain`
 * - Reads initial values from URL and keeps them in sync with state
 * - Writes updates to URL using history.replaceState with debouncing
 * - Syncs with back/forward navigation via popstate
 */
export function useSyncedPatternParams(options: UseSyncedPatternParamsOptions = {}): UseSyncedPatternParamsReturn {
  const { debounceMs = 150, patternIdKey = 'patternId', explainKey = 'explain' } = options;

  const getFromLocation = useCallback((): { id: string | null; explain: boolean } => {
    try {
      const params = new URLSearchParams(window.location.search);
      const id = normalizePatternId(params.get(patternIdKey));
      const ex = readBoolean(params.get(explainKey));
      try { logger.debug('[useSyncedPatternParams] Read from URL', { id, ex, patternIdKey, explainKey }); } catch {}
      return { id, explain: ex };
    } catch {
      return { id: null, explain: false };
    }
  }, [patternIdKey, explainKey]);

  const [{ id, explain }, setState] = useState<{ id: string | null; explain: boolean }>(() => getFromLocation());

  // Sync with back/forward navigation
  useEffect(() => {
    const onPop = () => {
      const next = getFromLocation();
      try { logger.debug('[useSyncedPatternParams] popstate -> sync', { next }); } catch {}
      setState(next);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [getFromLocation]);

  // Debounced URL writer supporting both params at once
  const debounceTimer = useRef<number | undefined>(undefined);
  const writeToUrl = useCallback((next: { id: string | null; explain: boolean }) => {
    const doWrite = () => {
      try {
        const url = new URL(window.location.href);
        if (next.id) url.searchParams.set(patternIdKey, next.id); else url.searchParams.delete(patternIdKey);
        if (next.explain) url.searchParams.set(explainKey, '1'); else url.searchParams.delete(explainKey);
        window.history.replaceState(window.history.state, '', url.toString());
        try { logger.debug('[useSyncedPatternParams] URL sync via history.replaceState', { patternId: next.id, explain: next.explain, patternIdKey, explainKey }); } catch {}
      } catch {
        // never throw in URL sync
      }
    };
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(doWrite, debounceMs);
  }, [debounceMs, explainKey, patternIdKey]);

  const setPatternId = useCallback((next: string | null) => {
    setState((prev) => {
      const normalized = normalizePatternId(next);
      const merged = { id: normalized, explain: prev.explain && !!normalized };
      writeToUrl(merged);
      return merged;
    });
  }, [writeToUrl]);

  const setExplain = useCallback((next: boolean) => {
    setState((prev) => {
      const merged = { id: prev.id, explain: !!next && !!prev.id };
      writeToUrl(merged);
      return merged;
    });
  }, [writeToUrl]);

  const clearPatternParams = useCallback(() => {
    setState((prev) => {
      const merged = { id: null, explain: false };
      writeToUrl(merged);
      return merged;
    });
  }, [writeToUrl]);

  // Cleanup pending debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        try { window.clearTimeout(debounceTimer.current); } catch {}
        debounceTimer.current = undefined;
      }
    };
  }, []);

  return useMemo(() => ({
    patternId: id,
    explain,
    setPatternId,
    setExplain,
    clearPatternParams,
  }), [id, explain, setPatternId, setExplain, clearPatternParams]);
}

export type { UseSyncedPatternParamsReturn as SyncedPatternParams };


