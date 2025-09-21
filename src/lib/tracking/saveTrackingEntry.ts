import { TrackingEntry, Student } from '@/types/student';
import { dataStorage } from '@/lib/dataStorage';
import { analyticsManager } from '@/lib/analyticsManager';
import { analyticsCoordinator } from '@/lib/analyticsCoordinator';
import { logger } from '@/lib/logger';
import { validateTrackingEntry } from '@/lib/tracking/validation';
import type { TrackingValidationRules } from '@/lib/tracking/validation';

export type SaveTrackingValidationRules = Partial<TrackingValidationRules>;

export interface SaveTrackingResult {
  success: boolean;
  entry?: TrackingEntry;
  errors?: string[];
}

/**
 * Save a tracking entry with unified flow: validate → save → broadcast → trigger analytics
 * Returns a success flag and errors if validation or save fails. Analytics is fire-and-forget.
 */
export async function saveTrackingEntry(
  entry: TrackingEntry,
  validationRules?: SaveTrackingValidationRules
): Promise<SaveTrackingResult> {
  try {
    // 1) Validate
    const validation = validateTrackingEntry(entry, validationRules ?? {});
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    // 2) Save via DataStorageManager (handles indexing and versioning)
    try {
      await Promise.resolve(dataStorage.saveTrackingEntry(entry));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[saveTrackingEntry] Failed to save entry', { error: message, entryId: entry?.id, studentId: entry?.studentId });
      return { success: false, errors: ['Failed to save tracking entry'] };
    }

    // 3) Broadcast cache invalidation (non-throwing)
    try {
      analyticsCoordinator.broadcastCacheClear(entry.studentId);
    } catch (e) {
      // fail-soft
      logger.warn('[saveTrackingEntry] Cache clear broadcast failed', e as Error);
    }

    // 4) Trigger analytics computation (fire-and-forget; do not block UI)
    try {
      const student: Student | null = dataStorage.getStudentById(entry.studentId);
      if (student) {
        // Intentionally not awaited to avoid blocking callers
        Promise.resolve(analyticsManager.triggerAnalyticsForStudent(student)).catch(() => {
          /* swallow to avoid uncaught warnings */
        });
      }
    } catch (e) {
      // fail-soft: analytics trigger should not affect save result
      logger.warn('[saveTrackingEntry] Analytics trigger failed', e as Error);
    }

    // 5) Return success
    return { success: true, entry };
  } catch (e) {
    logger.error('[saveTrackingEntry] Unexpected failure', e as Error);
    return { success: false, errors: ['Unexpected error while saving entry'] };
  }
}

