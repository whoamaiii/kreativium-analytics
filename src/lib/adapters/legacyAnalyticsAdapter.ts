/**
 * @file Legacy analytics adapter.
 *
 * Provides synchronous adapters that expose storageService data using the legacy
 * analytics shapes (Student/Goal/TrackingEntry). This keeps analytics and AI
 * code paths consistent while the rest of the app migrates to the new models.
 */

import type { Goal, Student, TrackingEntry } from '@/types/student';
import type { TrackingSession } from '@/lib/storage/types';
import { storageService } from '@/lib/storage/storageService';
import { convertLocalGoalToLegacy, convertLocalStudentToLegacy } from './legacyConverters';
import { convertSessionToLegacyEntry } from './legacyTransforms';
import { logger } from '@/lib/logger';

const sortEntriesDesc = (entries: TrackingEntry[]): TrackingEntry[] =>
  [...entries].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

const mapSessionsToEntries = (sessions: TrackingSession[]): TrackingEntry[] => {
  const entries: TrackingEntry[] = [];
  sessions.forEach((session) => {
    if (session.status !== 'completed') return;
    try {
      entries.push(convertSessionToLegacyEntry(session));
    } catch (error) {
      logger.error('[legacyAnalyticsAdapter] Failed to convert session', {
        sessionId: session.id,
        error,
      });
    }
  });
  return sortEntriesDesc(entries);
};

const mapStudents = (): Student[] => {
  const students = storageService.listStudents();
  return students.map((student) => convertLocalStudentToLegacy(student) as Student);
};

const findStudent = (studentId: string): Student | null => {
  const student = storageService.listStudents().find((s) => s.id === studentId);
  if (!student) return null;
  return convertLocalStudentToLegacy(student) as Student;
};

const mapGoals = (studentId?: string): Goal[] => {
  const goals = storageService.listGoals(studentId);
  return goals.map((goal) => convertLocalGoalToLegacy(goal) as Goal);
};

export const legacyAnalyticsAdapter = {
  listStudents: (): Student[] => mapStudents(),
  getStudentById: (studentId: string): Student | null => findStudent(studentId),
  listGoals: (): Goal[] => mapGoals(),
  listGoalsForStudent: (studentId: string): Goal[] => mapGoals(studentId),
  listTrackingEntries: (): TrackingEntry[] =>
    mapSessionsToEntries(storageService.listSessions()),
  listTrackingEntriesForStudent: (studentId: string): TrackingEntry[] =>
    mapSessionsToEntries(storageService.listSessionsForStudent(studentId)),
};

export type LegacyAnalyticsAdapter = typeof legacyAnalyticsAdapter;



