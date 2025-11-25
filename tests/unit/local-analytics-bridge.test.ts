import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { TrackingEntry } from '@/types/student';
import { analyticsManager } from '@/lib/analyticsManager';
import { storageService } from '@/new/storage/storageService';
import { sessionManager } from '@/new/tracking/sessionManager';
import { localAnalyticsDataStorage } from '@/new/analytics/localAnalyticsDataStorage';
import { ensureSessionAnalyticsBridge } from '@/new/analytics/sessionCacheBridge';

ensureSessionAnalyticsBridge();

const createSimpleEntry = (studentId: string): TrackingEntry => ({
  id: `entry-${studentId}-${Date.now()}`,
  studentId,
  timestamp: new Date(),
  emotions: [
    {
      id: `emotion-${studentId}`,
      studentId,
      emotion: 'calm',
      intensity: 3,
      timestamp: new Date(),
    },
  ],
  sensoryInputs: [],
  notes: 'legacy entry',
});

describe('localAnalyticsDataStorage integration', () => {
  beforeEach(() => {
    storageService.clearAll();
    localStorage.clear();
  });

  it('converts saved sessions into legacy tracking entries', () => {
    const student = storageService.upsertStudent({ name: 'Bridge Student' });
    const session = sessionManager.startSession(student.id);
    sessionManager.addEmotion(session.id, { label: 'joyful', intensity: 4 });
    sessionManager.endSession(session.id);

    const entries = localAnalyticsDataStorage.getTrackingEntriesForStudent(student.id);
    expect(entries).toHaveLength(1);
    expect(entries[0].studentId).toBe(student.id);
    expect(entries[0].emotions[0].emotion).toBe('joyful');
  });

  it('persists legacy tracking entries back to storageService', () => {
    const student = storageService.upsertStudent({ name: 'Legacy Writer' });
    const entry = createSimpleEntry(student.id);

    localAnalyticsDataStorage.saveTrackingEntry(entry);
    const sessions = storageService.listSessionsForStudent(student.id);

    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe(entry.id);
  });

  it('deleteTrackingEntry removes the session from storageService', () => {
    const student = storageService.upsertStudent({ name: 'Legacy Deleter' });
    const entry = createSimpleEntry(student.id);

    localAnalyticsDataStorage.saveTrackingEntry(entry);
    expect(storageService.listSessionsForStudent(student.id)).toHaveLength(1);

    localAnalyticsDataStorage.deleteTrackingEntry(entry.id);
    expect(storageService.listSessionsForStudent(student.id)).toHaveLength(0);
  });
});

describe('ensureSessionAnalyticsBridge', () => {
  beforeEach(() => {
    storageService.clearAll();
    localStorage.clear();
  });

  it('clears analytics cache when the session store changes', () => {
    const clearSpy = vi.spyOn(analyticsManager, 'clearCache');

    const student = storageService.upsertStudent({ name: 'Cache Student' });

    sessionManager.startSession(student.id);
    expect(clearSpy).toHaveBeenCalled();

    clearSpy.mockClear();
    const entry = createSimpleEntry(student.id);
    localAnalyticsDataStorage.saveTrackingEntry(entry);
    expect(clearSpy).toHaveBeenCalled();

    clearSpy.mockClear();
    localAnalyticsDataStorage.deleteTrackingEntry(entry.id);
    expect(clearSpy).toHaveBeenCalled();

    clearSpy.mockRestore();
  });
});
