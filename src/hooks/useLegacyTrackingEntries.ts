/**
 * @file Hook to get tracking entries in legacy format.
 */

import { useMemo } from 'react';
import type { TrackingEntry } from '@/types/student';
import type { TrackingSession, UUID } from '@/lib/storage/types';
import { useSessions } from '@/hooks/useSessionTracking';
import { convertSessionToLegacyEntry } from '@/lib/adapters/legacyTransforms';

export interface UseLegacyTrackingEntriesOptions {
  studentId?: UUID;
  statuses?: TrackingSession['status'][];
}

const DEFAULT_STATUSES: TrackingSession['status'][] = ['completed'];

export const useLegacyTrackingEntries = (
  options?: UseLegacyTrackingEntriesOptions,
): TrackingEntry[] => {
  const statuses =
    options?.statuses && options.statuses.length > 0 ? options.statuses : DEFAULT_STATUSES;
  const statusKey = statuses.join('|');
  const allowedStatuses = useMemo(() => new Set(statuses), [statusKey]);
  const sessionFilter = useMemo(
    () => (options?.studentId ? { studentId: options.studentId } : undefined),
    [options?.studentId],
  );
  const sessions = useSessions(sessionFilter);

  return useMemo(() => {
    if (sessions.length === 0) return [];
    return sessions
      .filter((session) => allowedStatuses.has(session.status))
      .map((session) => convertSessionToLegacyEntry(session));
  }, [sessions, allowedStatuses]);
};



