import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logger } from '@/lib/logger';

const STORAGE_KEY = 'sensoryTracker_pinnedAlerts';

export interface UsePinnedAlertsReturn {
  pinnedIds: Set<string>;
  isPinned: (alertId: string) => boolean;
  pinAlert: (alertId: string) => void;
  unpinAlert: (alertId: string) => void;
  togglePin: (alertId: string) => void;
  clearPinnedAlerts: () => void;
}

function readFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v) => typeof v === 'string' && v.length > 0);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('usePinnedAlerts: failed to read from localStorage', err);
    return [];
  }
}

function writeToStorage(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('usePinnedAlerts: failed to write to localStorage', err);
  }
}

export function usePinnedAlerts(): UsePinnedAlertsReturn {
  const [pinnedIdsSet, setPinnedIdsSet] = useState<Set<string>>(() => new Set(readFromStorage()));
  const isMountedRef = useRef(false);

  // Persist on changes
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    writeToStorage(Array.from(pinnedIdsSet));
  }, [pinnedIdsSet]);

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setPinnedIdsSet(new Set(readFromStorage()));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isPinned = useCallback((alertId: string) => pinnedIdsSet.has(alertId), [pinnedIdsSet]);

  const pinAlert = useCallback((alertId: string) => {
    if (typeof alertId !== 'string' || alertId.trim().length === 0) return;
    setPinnedIdsSet((prev) => {
      if (prev.has(alertId)) return prev;
      const next = new Set(prev);
      next.add(alertId);
      return next;
    });
  }, []);

  const unpinAlert = useCallback((alertId: string) => {
    if (typeof alertId !== 'string' || alertId.trim().length === 0) return;
    setPinnedIdsSet((prev) => {
      if (!prev.has(alertId)) return prev;
      const next = new Set(prev);
      next.delete(alertId);
      return next;
    });
  }, []);

  const togglePin = useCallback((alertId: string) => {
    if (typeof alertId !== 'string' || alertId.trim().length === 0) return;
    setPinnedIdsSet((prev) => {
      const next = new Set(prev);
      if (next.has(alertId)) next.delete(alertId); else next.add(alertId);
      return next;
    });
  }, []);

  const clearPinnedAlerts = useCallback(() => {
    setPinnedIdsSet(new Set());
  }, []);

  const pinnedIds = useMemo(() => pinnedIdsSet, [pinnedIdsSet]);

  return {
    pinnedIds,
    isPinned,
    pinAlert,
    unpinAlert,
    togglePin,
    clearPinnedAlerts,
  };
}

export default usePinnedAlerts;



