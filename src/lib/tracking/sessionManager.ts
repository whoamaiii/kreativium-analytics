/**
 * @file Session Manager for tracking sessions.
 */

import {
  EmotionEntry,
  EnvironmentalEntry,
  SensoryEntry,
  SessionQuality,
  TrackingSession,
  UUID,
} from '@/lib/storage/types';
import { storageService, StorageService } from '@/lib/storage/storageService';

const minutesBetween = (startIso: string, endIso: string): number => {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 60000));
};

const nowIso = (): string => new Date().toISOString();

const createId = (): UUID => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sess_${Math.random().toString(36).slice(2, 11)}`;
};

const createSessionQuality = (session: TrackingSession): SessionQuality => {
  const durationMinutes = minutesBetween(session.startedAt, session.updatedAt);
  const hasEnvironment = Boolean(session.environment);
  const completenessPieces = [
    session.emotions.length > 0 ? 1 : 0,
    session.sensory.length > 0 ? 1 : 0,
    hasEnvironment ? 1 : 0,
  ];
  const completenessPercent =
    (completenessPieces.reduce((sum, piece) => sum + piece, 0) / completenessPieces.length) * 100;
  return {
    emotionCount: session.emotions.length,
    sensoryCount: session.sensory.length,
    hasEnvironment,
    durationMinutes,
    completenessPercent,
    lastSavedAt: session.quality.lastSavedAt ?? session.startedAt,
  };
};

export interface SessionConfig {
  autoSaveIntervalMs?: number;
  minEmotionEntries?: number;
  minSensoryEntries?: number;
  minDurationMinutes?: number;
}

const DEFAULT_CONFIG: Required<SessionConfig> = {
  autoSaveIntervalMs: 60_000,
  minEmotionEntries: 1,
  minSensoryEntries: 0,
  minDurationMinutes: 0,
};

export interface SessionValidationResult {
  isValid: boolean;
  issues: string[];
}

export class TrackingSessionManager {
  constructor(private readonly storage: StorageService = storageService) {}

  listSessions(status?: TrackingSession['status']): TrackingSession[] {
    const sessions = this.storage.listSessions();
    return status ? sessions.filter((session) => session.status === status) : sessions;
  }

  getSession(sessionId: UUID): TrackingSession | undefined {
    return this.storage.listSessions().find((session) => session.id === sessionId);
  }

  startSession(studentId: UUID, config: SessionConfig = {}): TrackingSession {
    const now = nowIso();
    const session: TrackingSession = {
      id: createId(),
      studentId,
      status: 'active',
      startedAt: now,
      updatedAt: now,
      autoSaveEnabled: true,
      notes: '',
      emotions: [],
      sensory: [],
      tags: [],
      quality: {
        emotionCount: 0,
        sensoryCount: 0,
        hasEnvironment: false,
        durationMinutes: 0,
        completenessPercent: 0,
        lastSavedAt: now,
      },
    };
    this.storage.saveSession(session);
    this.persistConfig(studentId, config);
    return session;
  }

  addEmotion(sessionId: UUID, input: Omit<EmotionEntry, 'id' | 'timestamp'>): TrackingSession {
    return this.updateSession(sessionId, (session) => {
      const entry: EmotionEntry = { id: createId(), timestamp: nowIso(), ...input };
      session.emotions = [...session.emotions, entry];
      return session;
    });
  }

  removeEmotion(sessionId: UUID, emotionId: UUID): TrackingSession {
    return this.updateSession(sessionId, (session) => {
      session.emotions = session.emotions.filter((emotion) => emotion.id !== emotionId);
      return session;
    });
  }

  addSensory(sessionId: UUID, input: Omit<SensoryEntry, 'id' | 'timestamp'>): TrackingSession {
    return this.updateSession(sessionId, (session) => {
      const entry: SensoryEntry = { id: createId(), timestamp: nowIso(), ...input };
      session.sensory = [...session.sensory, entry];
      return session;
    });
  }

  removeSensory(sessionId: UUID, sensoryId: UUID): TrackingSession {
    return this.updateSession(sessionId, (session) => {
      session.sensory = session.sensory.filter((item) => item.id !== sensoryId);
      return session;
    });
  }

  setEnvironment(sessionId: UUID, environment: Omit<EnvironmentalEntry, 'id' | 'timestamp'>) {
    return this.updateSession(sessionId, (session) => {
      session.environment = { id: createId(), timestamp: nowIso(), ...environment };
      return session;
    });
  }

  setNotes(sessionId: UUID, notes: string): TrackingSession {
    return this.updateSession(sessionId, (session) => {
      session.notes = notes;
      return session;
    });
  }

  pauseSession(sessionId: UUID): TrackingSession {
    return this.updateSession(sessionId, (session) => {
      session.status = 'paused';
      return session;
    });
  }

  resumeSession(sessionId: UUID): TrackingSession {
    return this.updateSession(sessionId, (session) => {
      session.status = 'active';
      return session;
    });
  }

  endSession(sessionId: UUID, { save = true } = {}): TrackingSession {
    return this.updateSession(sessionId, (session) => {
      session.status = save ? 'completed' : 'discarded';
      session.endedAt = nowIso();
      return session;
    });
  }

  discardSession(sessionId: UUID): void {
    this.storage.deleteSession(sessionId);
  }

  validateSession(session: TrackingSession, config: SessionConfig = {}): SessionValidationResult {
    const { minEmotionEntries, minSensoryEntries, minDurationMinutes } = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    const issues: string[] = [];
    if (session.emotions.length < minEmotionEntries) {
      issues.push(`Legg til minst ${minEmotionEntries} følelsesregistrering(er).`);
    }
    if (session.sensory.length < minSensoryEntries) {
      issues.push(`Legg til minst ${minSensoryEntries} sanseobservasjon(er).`);
    }
    const duration = minutesBetween(session.startedAt, session.updatedAt);
    if (duration < minDurationMinutes) {
      issues.push(`Økten bør vare minst ${minDurationMinutes} minutter (nå ${duration}).`);
    }
    return { isValid: issues.length === 0, issues };
  }

  getConfig(studentId: UUID): SessionConfig {
    const settings = this.storage.getSettings<Record<string, unknown>>();
    const key = `sessionConfig:${studentId}`;
    return (settings[key] as SessionConfig) ?? {};
  }

  private persistConfig(studentId: UUID, config: SessionConfig): void {
    const settings = this.storage.getSettings<Record<string, unknown>>();
    const key = `sessionConfig:${studentId}`;
    settings[key] = { ...DEFAULT_CONFIG, ...config };
    this.storage.saveSettings(settings);
  }

  private updateSession(
    sessionId: UUID,
    mutator: (session: TrackingSession) => TrackingSession,
  ): TrackingSession {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    const updated = mutator({ ...session });
    updated.updatedAt = nowIso();
    updated.quality = {
      ...createSessionQuality(updated),
      lastSavedAt: nowIso(),
    };
    this.storage.saveSession(updated);
    return updated;
  }
}

export const sessionManager = new TrackingSessionManager();



