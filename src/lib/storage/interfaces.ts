import type { Student, TrackingEntry, Goal } from '@/types/student';

/**
 * Storage contract used by analytics orchestration layers.
 * Implemented by the new local analytics adapter backed by storageService.
 */
export interface IDataStorage {
  getStudents(): Student[];
  getTrackingEntriesForStudent(studentId: string): TrackingEntry[];
  getEntriesForStudent(studentId: string): TrackingEntry[];
  getGoalsForStudent(studentId: string): Goal[];
  saveTrackingEntry(entry: TrackingEntry): void;
  deleteTrackingEntry(entryId: string): void;
  getGoals(): Goal[];
}
