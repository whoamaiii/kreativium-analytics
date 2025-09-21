import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveTrackingEntry } from '@/lib/tracking/saveTrackingEntry';
import { dataStorage } from '@/lib/dataStorage';
import { analyticsCoordinator } from '@/lib/analyticsCoordinator';
import { analyticsManager } from '@/lib/analyticsManager';

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

vi.mock('@/lib/dataStorage', async (orig) => {
  const mod: any = await orig();
  return {
    ...mod,
    dataStorage: {
      ...mod.dataStorage,
      saveTrackingEntry: vi.fn(),
      getStudentById: vi.fn(() => ({ id: 'stu-1', name: 'S', createdAt: new Date() })),
      getGoalsForStudent: vi.fn(() => [{ id: 'g1' }]),
    }
  };
});

vi.mock('@/lib/analyticsCoordinator', async (orig) => {
  const mod: any = await orig();
  return {
    ...mod,
    analyticsCoordinator: {
      ...mod.analyticsCoordinator,
      broadcastCacheClear: vi.fn(),
    }
  };
});

vi.mock('@/lib/analyticsManager', async (orig) => {
  const mod: any = await orig();
  return {
    ...mod,
    analyticsManager: {
      ...mod.analyticsManager,
      triggerAnalyticsForStudent: vi.fn(async () => {}),
    }
  };
});

vi.mock('@/lib/tracking/validation', async (orig) => {
  const mod: any = await orig();
  return {
    ...mod,
    validateTrackingEntry: vi.fn((_entry: any, _rules?: any) => ({ isValid: true, errors: [], warnings: [] })),
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
    (dataStorage.saveTrackingEntry as any).mockResolvedValue(undefined);
    const entry = makeEntry();
    const res = await saveTrackingEntry(entry);
    expect(res.success).toBe(true);
    expect(dataStorage.saveTrackingEntry).toHaveBeenCalledWith(entry);
    expect(analyticsCoordinator.broadcastCacheClear).toHaveBeenCalledWith('stu-1');
    expect(analyticsManager.triggerAnalyticsForStudent).toHaveBeenCalledWith({ id: 'stu-1', name: 'S', createdAt: expect.any(Date) });
  });

  it('returns validation errors and does not save when invalid', async () => {
    const { validateTrackingEntry } = await import('@/lib/tracking/validation');
    (validateTrackingEntry as any).mockReturnValueOnce({ isValid: false, errors: ['bad'], warnings: [] });
    const entry = makeEntry();
    const res = await saveTrackingEntry(entry);
    expect(res.success).toBe(false);
    expect(res.errors).toEqual(['bad']);
    expect(dataStorage.saveTrackingEntry).not.toHaveBeenCalled();
  });

  it('handles save failure gracefully and returns error', async () => {
    (dataStorage.saveTrackingEntry as any).mockRejectedValueOnce(new Error('db down'));
    const entry = makeEntry();
    const res = await saveTrackingEntry(entry);
    expect(res.success).toBe(false);
    expect(res.errors).toEqual(['Failed to save tracking entry']);
  });

  it('continues when broadcast throws (fail-soft)', async () => {
    (dataStorage.saveTrackingEntry as any).mockResolvedValue(undefined);
    (analyticsCoordinator.broadcastCacheClear as any).mockImplementation(() => { throw new Error('evt'); });
    const entry = makeEntry();
    const res = await saveTrackingEntry(entry);
    expect(res.success).toBe(true);
    expect(analyticsManager.triggerAnalyticsForStudent).toHaveBeenCalled();
  });

  it('does not block on analytics trigger errors', async () => {
    (dataStorage.saveTrackingEntry as any).mockResolvedValue(undefined);
    (analyticsManager.triggerAnalyticsForStudent as any).mockRejectedValueOnce(new Error('boom'));
    const entry = makeEntry();
    const res = await saveTrackingEntry(entry);
    expect(res.success).toBe(true);
  });

  it('extracts studentId for targeted invalidation', async () => {
    (dataStorage.saveTrackingEntry as any).mockResolvedValue(undefined);
    const entry = makeEntry({ studentId: 'stu-xyz' });
    await saveTrackingEntry(entry);
    expect(analyticsCoordinator.broadcastCacheClear).toHaveBeenCalledWith('stu-xyz');
  });
});




