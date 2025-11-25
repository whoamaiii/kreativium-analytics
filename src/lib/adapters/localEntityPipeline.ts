/**
 * @file Pipeline for syncing local storage to legacy storage keys.
 */

import { storageService } from '@/lib/storage/storageService';
import {
  convertLocalAlertToLegacy,
  convertLocalGoalToLegacy,
  convertLocalStudentToLegacy,
} from './legacyConverters';
import { safeSet } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { logger } from '@/lib/logger';
import type { Alert as LegacyAlert, Goal as LegacyGoal, Student as LegacyStudent } from '@/types/student';

const persist = (key: string, payload: unknown, label: string) => {
  try {
    safeSet(key, JSON.stringify(payload));
  } catch (error) {
    logger.error('[localEntityPipeline] Failed to persist legacy mirror', { key, label, error });
  }
};

export const syncLocalStudentsToLegacy = () => {
  try {
    const students = storageService.listStudents();
    const legacyStudents: LegacyStudent[] = students.map(
      (student) => convertLocalStudentToLegacy(student) as LegacyStudent,
    );
    persist(STORAGE_KEYS.STUDENTS, legacyStudents, 'students');
  } catch (error) {
    logger.error('[localEntityPipeline] Failed to sync students', { error });
  }
};

export const syncLocalGoalsToLegacy = () => {
  try {
    const goals = storageService.listGoals();
    const legacyGoals: LegacyGoal[] = goals.map(
      (goal) => convertLocalGoalToLegacy(goal) as LegacyGoal,
    );
    persist(STORAGE_KEYS.GOALS, legacyGoals, 'goals');
  } catch (error) {
    logger.error('[localEntityPipeline] Failed to sync goals', { error });
  }
};

export const syncLocalAlertsToLegacy = () => {
  try {
    const alerts = storageService.listAlerts();
    const legacyAlerts: LegacyAlert[] = alerts.map(
      (alert) => convertLocalAlertToLegacy(alert) as LegacyAlert,
    );
    persist(STORAGE_KEYS.ALERTS, legacyAlerts, 'alerts');
  } catch (error) {
    logger.error('[localEntityPipeline] Failed to sync alerts', { error });
  }
};



