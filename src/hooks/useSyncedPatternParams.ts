import { useCallback, useMemo } from 'react';
import { logger } from '@/lib/logger';
import { useUrlSync } from './useUrlSync';

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

interface PatternParams {
  id: string | null;
  explain: boolean;
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
 * - Writes updates to URL using useUrlSync generic hook with debouncing
 * - Syncs with back/forward navigation via popstate
 */
export function useSyncedPatternParams(
  options: UseSyncedPatternParamsOptions = {},
): UseSyncedPatternParamsReturn {
  const { debounceMs = 150, patternIdKey = 'patternId', explainKey = 'explain' } = options;

  const [{ id, explain }, setState] = useUrlSync<PatternParams>({
    defaultValue: { id: null, explain: false },
    debounceMs,
    loggerName: 'useSyncedPatternParams',
    read: useCallback(
      (params: URLSearchParams): PatternParams => {
        const id = normalizePatternId(params.get(patternIdKey));
        const ex = readBoolean(params.get(explainKey));
        return { id, explain: ex };
      },
      [patternIdKey, explainKey],
    ),
    write: useCallback(
      (value: PatternParams, params: URLSearchParams) => {
        if (value.id) {
          params.set(patternIdKey, value.id);
        } else {
          params.delete(patternIdKey);
        }
        if (value.explain) {
          params.set(explainKey, '1');
        } else {
          params.delete(explainKey);
        }
      },
      [patternIdKey, explainKey],
    ),
  });

  const setPatternId = useCallback(
    (next: string | null) => {
      setState((prev) => {
        const normalized = normalizePatternId(next);
        // If patternId is cleared, also clear explain
        return { id: normalized, explain: prev.explain && !!normalized };
      });
    },
    [setState],
  );

  const setExplain = useCallback(
    (next: boolean) => {
      setState((prev) => {
        // Only allow explain=true if patternId exists
        return { id: prev.id, explain: !!next && !!prev.id };
      });
    },
    [setState],
  );

  const clearPatternParams = useCallback(() => {
    setState({ id: null, explain: false });
  }, [setState]);

  return useMemo(
    () => ({
      patternId: id,
      explain,
      setPatternId,
      setExplain,
      clearPatternParams,
    }),
    [id, explain, setPatternId, setExplain, clearPatternParams],
  );
}

export type { UseSyncedPatternParamsReturn as SyncedPatternParams };
