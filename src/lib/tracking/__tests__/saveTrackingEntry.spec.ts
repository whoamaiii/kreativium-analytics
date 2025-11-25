import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveTrackingEntry } from '@/lib/tracking/saveTrackingEntry';
import { AnalyticsWorkerCoordinator } from '@/lib/analyticsCoordinator';
import { analyticsManager } from '@/lib/analyticsManager';
import { storageService } from '@/lib/storage/storageService';

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/new/storage/storageService', () => ({
  storageService: {
    saveSession: vi.fn(),
    listStudents: vi.fn(() => [
      {
        id: 'stu-1',
        name: 'S',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]),
  },
}));

vi.mock('@/lib/analyticsCoordinator', async (orig) => {
  const mod: any = await orig();
  return {
    ...mod,
    analyticsCoordinator: {
      ...mod.analyticsCoordinator,
      broadcastCacheClear: vi.fn(),
    },
  };
});

vi.mock('@/lib/analyticsManager', async (orig) => {
  const mod: any = await orig();
  return {
    ...mod,
    analyticsManager: {
      ...mod.analyticsManager,
      triggerAnalyticsForStudent: vi.fn(async () => {}),
    },
  };
});

vi.mock('@/lib/tracking/validation', async (orig) => {
  const mod: any = await orig();
  return {
    ...mod,
    validateTrackingEntry: vi.fn((_entry: any, _rules?: any) => ({
      isValid: true,
      errors: [],
      warnings: [],
    })),
  };
});

describe('saveTrackingEntry (unified helper)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeEntry(overrides?: Partial<any>) {
    return {
      id: 't1',
      studentId: 'stu-1',
      timestamp: new Date(),
      emotions: [],
      sensoryInputs: [],
      notes: '',
      ...overrides,
    } as any;
  }

  it('runs validate → save → broadcast → trigger in order on success', async () => {
    (storageService.saveSession as any).mockResolvedValue(undefined);
    const entry = makeEntry();
    const res = await saveTrackingEntry(entry);
    expect(res.success).toBe(true);
    expect(storageService.saveSession).toHaveBeenCalled();
    expect(AnalyticsWorkerCoordinator.broadcastCacheClear).toHaveBeenCalledWith('stu-1');
    expect(analyticsManager.triggerAnalyticsForStudent).toHaveBeenCalledWith({
      id: 'stu-1',
      name: 'S',
      createdAt: expect.any(Date),
    });
  });

  it('returns validation errors and does not save when invalid', async () => {
    const { validateTrackingEntry } = await import('@/lib/tracking/validation');
    (validateTrackingEntry as any).mockReturnValueOnce({
      isValid: false,
      errors: ['bad'],
      warnings: [],
    });
    const entry = makeEntry();
    const res = await saveTrackingEntry(entry);
    expect(res.success).toBe(false);
    expect(res.errors).toEqual(['bad']);
    expect(storageService.saveSession).not.toHaveBeenCalled();
  });

  it('handles save failure gracefully and returns error', async () => {
    (storageService.saveSession as any).mockRejectedValueOnce(new Error('db down'));
    const entry = makeEntry();
    const res = await saveTrackingEntry(entry);
    expect(res.success).toBe(false);
    expect(res.errors).toEqual(['Failed to save tracking entry']);
  });

  it('continues when broadcast throws (fail-soft)', async () => {
    (storageService.saveSession as any).mockResolvedValue(undefined);
    (AnalyticsWorkerCoordinator.broadcastCacheClear as any).mockImplementation(() => {
      throw new Error('evt');
    });
    const entry = makeEntry();
    const res = await saveTrackingEntry(entry);
    expect(res.success).toBe(true);
    expect(analyticsManager.triggerAnalyticsForStudent).toHaveBeenCalled();
  });

  it('does not block on analytics trigger errors', async () => {
    (storageService.saveSession as any).mockResolvedValue(undefined);
    (analyticsManager.triggerAnalyticsForStudent as any).mockRejectedValueOnce(new Error('boom'));
    const entry = makeEntry();
    const res = await saveTrackingEntry(entry);
    expect(res.success).toBe(true);
  });

  it('extracts studentId for targeted invalidation', async () => {
    (storageService.saveSession as any).mockResolvedValue(undefined);
    const entry = makeEntry({ studentId: 'stu-xyz' });
    await saveTrackingEntry(entry);
    expect(AnalyticsWorkerCoordinator.broadcastCacheClear).toHaveBeenCalledWith('stu-xyz');
  });
});
