/**
 * @file React hooks for data mutation actions.
 */

import { useCallback } from 'react';
import type { Alert, Goal, Student, UUID } from '@/lib/storage/types';
import { storageService } from '@/lib/storage/storageService';
import {
  syncLocalAlertsToLegacy,
  syncLocalGoalsToLegacy,
  syncLocalStudentsToLegacy,
} from '@/lib/adapters/localEntityPipeline';

const nowIso = () => new Date().toISOString();
const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `local_${Math.random().toString(36).slice(2, 11)}`;

export const useStudentActions = () => {
  const upsertStudent = useCallback(
    (student: Partial<Student> & Pick<Student, 'name'> & { id?: UUID }) => {
      const now = nowIso();
      const payload: Student = {
        id: student.id ?? createId(),
        name: student.name,
        avatarUrl: student.avatarUrl,
        gradeLevel: student.gradeLevel,
        dateOfBirth: student.dateOfBirth,
        language: student.language,
        guardians: student.guardians,
        notes: student.notes,
        createdAt: student.createdAt ?? now,
        updatedAt: now,
      };
      const saved = storageService.upsertStudent({ ...payload, ...student, updatedAt: now });
      syncLocalStudentsToLegacy();
      return saved;
    },
    [],
  );

  const deleteStudent = useCallback((studentId: UUID) => {
    storageService.deleteStudent(studentId);
    syncLocalStudentsToLegacy();
  }, []);

  return { upsertStudent, deleteStudent };
};

export const useGoalActions = () => {
  const upsertGoal = useCallback(
    (goal: Goal) => {
      const now = nowIso();
      const saved = storageService.upsertGoal({
        ...goal,
        createdAt: goal.createdAt ?? now,
        updatedAt: now,
      });
      syncLocalGoalsToLegacy();
      return saved;
    },
    [],
  );

  const deleteGoal = useCallback((goalId: UUID) => {
    storageService.deleteGoal(goalId);
    syncLocalGoalsToLegacy();
  }, []);

  return { upsertGoal, deleteGoal };
};

export const useAlertActions = () => {
  const upsertAlert = useCallback(
    (alert: Alert) => {
      const now = nowIso();
      const saved = storageService.upsertAlert({
        ...alert,
        createdAt: alert.createdAt ?? now,
      });
      syncLocalAlertsToLegacy();
      return saved;
    },
    [],
  );

  const deleteAlert = useCallback((alertId: UUID) => {
    storageService.deleteAlert(alertId);
    syncLocalAlertsToLegacy();
  }, []);

  return { upsertAlert, deleteAlert };
};



