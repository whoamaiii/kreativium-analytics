/**
 * @file React hooks for session tracking.
 */

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { EmotionEntry, SensoryEntry, EnvironmentalEntry, TrackingSession, UUID } from '@/lib/storage/types';
import { sessionManager, SessionConfig } from '@/lib/tracking/sessionManager';
import { storageService } from '@/lib/storage/storageService';
import { subscribeStorageEvent } from '@/lib/storage/storageEvents';

type SessionFilter = {
  studentId?: UUID;
  status?: TrackingSession['status'];
};

const subscribeSessions = (callback: () => void) => subscribeStorageEvent('sessions', callback);

let lastSessionsCache: TrackingSession[] = [];
let lastSessionsSignature: string | null = null;

const sessionsSnapshot = (): TrackingSession[] => {
  const sessions = storageService.listSessions();
  try {
    const signature = JSON.stringify(sessions);
    if (lastSessionsSignature === signature) {
      return lastSessionsCache;
    }
    lastSessionsSignature = signature;
    lastSessionsCache = sessions;
    return sessions;
  } catch {
    lastSessionsCache = sessions;
    lastSessionsSignature = null;
    return sessions;
  }
};

const filterCache = new Map<string, { source: TrackingSession[]; result: TrackingSession[] }>();

const filterSessions = (sessions: TrackingSession[], filter?: SessionFilter): TrackingSession[] => {
  if (!filter) return sessions;
  const cacheKey = `${filter.studentId ?? 'all'}::${filter.status ?? 'all'}`;
  const cached = filterCache.get(cacheKey);
  if (cached && cached.source === sessions) {
    return cached.result;
  }
  const filtered = sessions.filter((session) => {
    if (filter.studentId && session.studentId !== filter.studentId) return false;
    if (filter.status && session.status !== filter.status) return false;
    return true;
  });
  filterCache.set(cacheKey, { source: sessions, result: filtered });
  return filtered;
};

export const useSessions = (filter?: SessionFilter): TrackingSession[] => {
  const getSnapshot = useCallback(() => filterSessions(sessionsSnapshot(), filter), [filter?.status, filter?.studentId]);
  return useSyncExternalStore(subscribeSessions, getSnapshot, getSnapshot);
};

export const useSession = (sessionId?: UUID): TrackingSession | undefined => {
  const sessions = useSessions();
  return useMemo(() => sessions.find((session) => session.id === sessionId), [sessions, sessionId]);
};

export const useActiveSession = (studentId?: UUID): TrackingSession | undefined => {
  const sessions = useSessions(useMemo(() => ({ studentId }), [studentId]));
  return useMemo(
    () =>
      sessions.find((session) => session.status === 'active' || session.status === 'paused'),
    [sessions],
  );
};

export const useSessionActions = (studentId?: UUID, config?: SessionConfig) => {
  const startSession = useCallback(() => {
    if (!studentId) throw new Error('studentId is required to start a session');
    return sessionManager.startSession(studentId, config);
  }, [studentId, config]);

  const addEmotion = useCallback(
    (sessionId: UUID, entry: Omit<EmotionEntry, 'id' | 'timestamp'>) =>
      sessionManager.addEmotion(sessionId, entry),
    [],
  );

  const removeEmotion = useCallback(
    (sessionId: UUID, emotionId: UUID) => sessionManager.removeEmotion(sessionId, emotionId),
    [],
  );

  const addSensory = useCallback(
    (sessionId: UUID, entry: Omit<SensoryEntry, 'id' | 'timestamp'>) =>
      sessionManager.addSensory(sessionId, entry),
    [],
  );

  const removeSensory = useCallback(
    (sessionId: UUID, sensoryId: UUID) => sessionManager.removeSensory(sessionId, sensoryId),
    [],
  );

  const setEnvironment = useCallback(
    (sessionId: UUID, entry: Omit<EnvironmentalEntry, 'id' | 'timestamp'>) =>
      sessionManager.setEnvironment(sessionId, entry),
    [],
  );

  const setNotes = useCallback(
    (sessionId: UUID, notes: string) => sessionManager.setNotes(sessionId, notes),
    [],
  );

  const pauseSession = useCallback((sessionId: UUID) => sessionManager.pauseSession(sessionId), []);
  const resumeSession = useCallback(
    (sessionId: UUID) => sessionManager.resumeSession(sessionId),
    [],
  );
  const endSession = useCallback(
    (sessionId: UUID, options?: { save?: boolean }) => sessionManager.endSession(sessionId, options),
    [],
  );
  const discardSession = useCallback(
    (sessionId: UUID) => sessionManager.discardSession(sessionId),
    [],
  );
  const validateSession = useCallback(
    (session: TrackingSession) => sessionManager.validateSession(session, config),
    [config],
  );

  return {
    startSession,
    addEmotion,
    removeEmotion,
    addSensory,
    removeSensory,
    setEnvironment,
    setNotes,
    pauseSession,
    resumeSession,
    endSession,
    discardSession,
    validateSession,
  };
};



