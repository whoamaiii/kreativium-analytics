/**
 * @file Storage statistics utilities.
 */

import { storageService } from './storageService';

export interface StorageStats {
  studentsCount: number;
  sessionsCount: number;
  goalsCount: number;
  alertsCount: number;
  totalSize: number;
}

/**
 * Computes aggregate stats for the storage service.
 */
export const getStorageStats = (): StorageStats => {
  const students = storageService.listStudents();
  const sessions = storageService.listSessions();
  const goals = storageService.listGoals();
  const alerts = storageService.listAlerts();
  const footprint = storageService.footprint();
  const totalSize = footprint.reduce((sum, item) => sum + item.bytes, 0);

  return {
    studentsCount: students.length,
    sessionsCount: sessions.length,
    goalsCount: goals.length,
    alertsCount: alerts.length,
    totalSize,
  };
};



