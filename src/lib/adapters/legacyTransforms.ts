/**
 * @file Transforms between legacy TrackingEntry and new TrackingSession types.
 */

import type {
  EmotionEntry as LegacyEmotionEntry,
  EnvironmentalEntry as LegacyEnvironmentalEntry,
  SensoryEntry as LegacySensoryEntry,
  TrackingEntry,
} from '@/types/student';
import type {
  EmotionEntry as SessionEmotionEntry,
  EnvironmentalEntry as SessionEnvironmentalEntry,
  SensoryEntry as SessionSensoryEntry,
  TrackingSession,
} from '@/lib/storage/types';

const parseIso = (iso?: string): Date => {
  if (!iso) return new Date();
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return new Date();
  return new Date(ms);
};

const clampIntensity = (value?: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 3;
  return Math.min(5, Math.max(1, Math.round(value)));
};

const fallbackId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `legacy_${Math.random().toString(36).slice(2, 10)}`;
};

const ensureIsoString = (value?: Date | string): string => {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  const parsed = parseIso(value as string);
  return parsed.toISOString();
};

const toLegacyEmotion = (
  emotion: SessionEmotionEntry,
  studentId: string,
): LegacyEmotionEntry => ({
  id: emotion.id,
  studentId,
  emotion: emotion.label,
  intensity: emotion.intensity,
  duration:
    typeof emotion.durationSeconds === 'number'
      ? Math.max(0, Math.round(emotion.durationSeconds / 60))
      : undefined,
  timestamp: parseIso(emotion.timestamp),
  context: emotion.context,
  trigger: emotion.trigger,
  notes: emotion.context,
});

const toLegacySensory = (
  sensory: SessionSensoryEntry,
  studentId: string,
): LegacySensoryEntry => ({
  id: sensory.id,
  studentId,
  sensoryType: sensory.sense,
  type: sensory.sense,
  input: sensory.description,
  response: sensory.response ?? sensory.description,
  intensity: sensory.intensity,
  timestamp: parseIso(sensory.timestamp),
  notes: sensory.description,
});

const toLegacyEnvironment = (
  environment?: SessionEnvironmentalEntry,
  fallbackTimestamp?: string,
): LegacyEnvironmentalEntry | undefined => {
  if (!environment) return undefined;

  const roomConditions = {
    temperature: environment.temperatureC,
    lighting: environment.lighting,
    noiseLevel: environment.noiseLevel,
  };
  const hasRoomConditions = Object.values(roomConditions).some(
    (value) => typeof value !== 'undefined',
  );

  return {
    id: environment.id,
    timestamp: parseIso(environment.timestamp ?? fallbackTimestamp),
    location: environment.location,
    socialContext: environment.socialContext,
    roomConditions: hasRoomConditions ? roomConditions : undefined,
    notes: environment.notes,
  };
};

export const convertSessionToLegacyEntry = (session: TrackingSession): TrackingEntry => {
  const timestamp = parseIso(session.endedAt ?? session.updatedAt ?? session.startedAt);
  return {
    id: session.id,
    studentId: session.studentId,
    timestamp,
    emotions: session.emotions.map((emotion) => toLegacyEmotion(emotion, session.studentId)),
    sensoryInputs: session.sensory.map((sensory) => toLegacySensory(sensory, session.studentId)),
    environmentalData: toLegacyEnvironment(session.environment, session.updatedAt),
    generalNotes: session.notes,
    notes: session.notes,
  };
};

const convertLegacyEmotionToSession = (
  emotion: LegacyEmotionEntry,
  fallbackTimestamp: Date,
): SessionEmotionEntry => ({
  id: emotion.id ?? fallbackId(),
  label: emotion.emotion ?? 'ukjent',
  intensity: clampIntensity(emotion.intensity),
  durationSeconds:
    typeof emotion.duration === 'number' && !Number.isNaN(emotion.duration)
      ? Math.max(1, Math.round(emotion.duration)) * 60
      : undefined,
  context: emotion.context,
  trigger: emotion.trigger ?? emotion.triggers?.[0],
  timestamp: ensureIsoString(emotion.timestamp ?? fallbackTimestamp),
});

const normalizeSense = (value?: string): SessionSensoryEntry['sense'] => {
  if (!value) return 'other';
  const normalized = value.toLowerCase();
  if (
    normalized === 'sight' ||
    normalized === 'sound' ||
    normalized === 'touch' ||
    normalized === 'smell' ||
    normalized === 'taste' ||
    normalized === 'movement' ||
    normalized === 'other'
  ) {
    return normalized;
  }
  return 'other';
};

const convertLegacySensoryToSession = (
  sensory: LegacySensoryEntry,
  fallbackTimestamp: Date,
): SessionSensoryEntry => ({
  id: sensory.id ?? fallbackId(),
  sense: normalizeSense(sensory.sensoryType ?? sensory.type),
  description: sensory.input ?? sensory.response ?? 'Observasjon',
  response: sensory.response ?? sensory.input ?? undefined,
  intensity: typeof sensory.intensity === 'number' ? clampIntensity(sensory.intensity) : undefined,
  timestamp: ensureIsoString(sensory.timestamp ?? fallbackTimestamp),
});

const convertLegacyEnvironmentToSession = (
  environment?: LegacyEnvironmentalEntry,
  fallbackTimestamp?: Date,
): SessionEnvironmentalEntry | undefined => {
  if (!environment) return undefined;
  const room = environment.roomConditions ?? {};
  return {
    id: environment.id ?? fallbackId(),
    timestamp: ensureIsoString(environment.timestamp ?? fallbackTimestamp),
    location: environment.location,
    socialContext: environment.socialContext,
    temperatureC: room.temperature,
    lighting: room.lighting as SessionEnvironmentalEntry['lighting'],
    noiseLevel: typeof room.noiseLevel === 'number' ? clampIntensity(room.noiseLevel) : undefined,
    notes: environment.notes,
  };
};

const computeQuality = (session: TrackingSession) => {
  const slices = [
    session.emotions.length > 0 ? 1 : 0,
    session.sensory.length > 0 ? 1 : 0,
    session.environment ? 1 : 0,
  ];
  const completeness =
    (slices.reduce((sum, piece) => sum + piece, 0) / slices.length) * 100;

  return {
    emotionCount: session.emotions.length,
    sensoryCount: session.sensory.length,
    hasEnvironment: Boolean(session.environment),
    durationMinutes: 0,
    completenessPercent: completeness,
    lastSavedAt: session.updatedAt,
  };
};

export const convertLegacyEntryToSession = (entry: TrackingEntry): TrackingSession => {
  const timestamp = entry.timestamp instanceof Date ? entry.timestamp : parseIso(entry.timestamp);
  const emotions = (entry.emotions || []).map((emotion) =>
    convertLegacyEmotionToSession(emotion, timestamp),
  );
  const sensory = (entry.sensoryInputs || []).map((input) =>
    convertLegacySensoryToSession(input, timestamp),
  );
  const environment = convertLegacyEnvironmentToSession(entry.environmentalData, timestamp);

  const session: TrackingSession = {
    id: entry.id,
    studentId: entry.studentId,
    status: 'completed',
    startedAt: timestamp.toISOString(),
    updatedAt: timestamp.toISOString(),
    endedAt: timestamp.toISOString(),
    autoSaveEnabled: false,
    notes: entry.generalNotes ?? entry.notes,
    emotions,
    sensory,
    environment,
    tags: [],
    quality: {
      emotionCount: 0,
      sensoryCount: 0,
      hasEnvironment: false,
      durationMinutes: 0,
      completenessPercent: 0,
      lastSavedAt: timestamp.toISOString(),
    },
  };

  session.quality = computeQuality(session);
  return session;
};



