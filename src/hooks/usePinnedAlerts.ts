import { useCallback, useMemo } from 'react';
import { useStorageState } from '@/lib/storage/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage/keys';

export interface UsePinnedAlertsReturn {
  pinnedIds: Set<string>;
  isPinned: (alertId: string) => boolean;
  pinAlert: (alertId: string) => void;
  unpinAlert: (alertId: string) => void;
  togglePin: (alertId: string) => void;
  clearPinnedAlerts: () => void;
}

export function usePinnedAlerts(): UsePinnedAlertsReturn {
  // Use storage hook for automatic persistence and cross-tab sync
  const [pinnedIdsArray, setPinnedIdsArray] = useStorageState<string[]>(
    STORAGE_KEYS.PINNED_ALERTS,
    [],
    {
      deserialize: (value) => {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((v) => typeof v === 'string' && v.length > 0);
      },
    }
  );

  // Convert array to Set for efficient lookups
  const pinnedIdsSet = useMemo(() => new Set(pinnedIdsArray), [pinnedIdsArray]);

  const isPinned = useCallback((alertId: string) => pinnedIdsSet.has(alertId), [pinnedIdsSet]);

  const pinAlert = useCallback(
    (alertId: string) => {
      if (typeof alertId !== 'string' || alertId.trim().length === 0) return;
      setPinnedIdsArray((prev) => {
        if (prev.includes(alertId)) return prev;
        return [...prev, alertId];
      });
    },
    [setPinnedIdsArray]
  );

  const unpinAlert = useCallback(
    (alertId: string) => {
      if (typeof alertId !== 'string' || alertId.trim().length === 0) return;
      setPinnedIdsArray((prev) => {
        if (!prev.includes(alertId)) return prev;
        return prev.filter((id) => id !== alertId);
      });
    },
    [setPinnedIdsArray]
  );

  const togglePin = useCallback(
    (alertId: string) => {
      if (typeof alertId !== 'string' || alertId.trim().length === 0) return;
      setPinnedIdsArray((prev) => {
        if (prev.includes(alertId)) {
          return prev.filter((id) => id !== alertId);
        } else {
          return [...prev, alertId];
        }
      });
    },
    [setPinnedIdsArray]
  );

  const clearPinnedAlerts = useCallback(() => {
    setPinnedIdsArray([]);
  }, [setPinnedIdsArray]);

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



