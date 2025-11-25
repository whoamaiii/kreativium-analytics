/**
 * @file Local analytics data storage adapter.
 *
 * Implements IDataStorage interface using the new storage service.
 */

import type { Goal, Student, TrackingEntry } from '@/types/student';
import type { IDataStorage } from '@/lib/storage/interfaces';
import { storageService } from '@/lib/storage/storageService';
import { convertLegacyEntryToSession } from './legacyTransforms';
import { legacyAnalyticsAdapter } from './legacyAnalyticsAdapter';

class LocalAnalyticsDataStorage implements IDataStorage {
  getStudents(): Student[] {
    return legacyAnalyticsAdapter.listStudents();
  }

  getTrackingEntriesForStudent(studentId: string): TrackingEntry[] {
    return legacyAnalyticsAdapter.listTrackingEntriesForStudent(studentId);
  }

  getEntriesForStudent(studentId: string): TrackingEntry[] {
    return this.getTrackingEntriesForStudent(studentId);
  }

  getGoalsForStudent(studentId: string): Goal[] {
    return legacyAnalyticsAdapter.listGoalsForStudent(studentId);
  }

  saveTrackingEntry(entry: TrackingEntry): void {
    const session = convertLegacyEntryToSession(entry);
    storageService.saveSession(session);
  }

  deleteTrackingEntry(entryId: string): void {
    storageService.deleteSession(entryId);
  }

  getGoals(): Goal[] {
    return legacyAnalyticsAdapter.listGoals();
  }
}

export const localAnalyticsDataStorage = new LocalAnalyticsDataStorage();



