/**
 * @file React hooks for accessing storage data reactively.
 *
 * These hooks use useSyncExternalStore to subscribe to storage changes
 * and automatically re-render when data changes.
 */

import { useMemo, useSyncExternalStore } from 'react';
import type { Alert, Goal, Student, UUID } from '@/lib/storage/types';
import { storageService } from '@/lib/storage/storageService';
import { subscribeStorageEvent } from '@/lib/storage/storageEvents';

const createCachedSnapshot = <T>(getValue: () => T): (() => T) => {
  let lastSignature: string | null = null;
  let lastValue: T;
  let hasValue = false;

  return () => {
    const value = getValue();
    try {
      const signature = JSON.stringify(value);
      if (hasValue && signature === lastSignature) {
        return lastValue;
      }
      lastSignature = signature;
      lastValue = value;
      hasValue = true;
      return value;
    } catch {
      lastSignature = null;
      lastValue = value;
      hasValue = true;
      return value;
    }
  };
};

const useLocalStore = <T>(subscribe: (cb: () => void) => () => void, getSnapshot: () => T) =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

// Students ------------------------------------------------------------------

const snapshotStudents = createCachedSnapshot(() => storageService.listStudents());

export const useStudents = (): Student[] =>
  useLocalStore((cb) => subscribeStorageEvent('students', cb), snapshotStudents);

export const useStudent = (studentId?: UUID): Student | undefined => {
  const students = useStudents();
  return useMemo(() => students.find((student) => student.id === studentId), [students, studentId]);
};

// Goals ---------------------------------------------------------------------

const snapshotGoals = createCachedSnapshot(() => storageService.listGoals());

export const useGoals = (): Goal[] =>
  useLocalStore((cb) => subscribeStorageEvent('goals', cb), snapshotGoals);

export const useGoalsByStudent = (studentId: UUID | undefined): Goal[] => {
  const goals = useGoals();
  return useMemo(() => goals.filter((goal) => goal.studentId === studentId), [goals, studentId]);
};

// Alerts --------------------------------------------------------------------

const snapshotAlerts = createCachedSnapshot(() => storageService.listAlerts());

export const useStorageAlerts = (): Alert[] =>
  useLocalStore((cb) => subscribeStorageEvent('alerts', cb), snapshotAlerts);

export const useAlertsByStudent = (studentId: UUID | undefined): Alert[] => {
  const alerts = useStorageAlerts();
  return useMemo(
    () => alerts.filter((alert) => alert.studentId === studentId),
    [alerts, studentId],
  );
};



