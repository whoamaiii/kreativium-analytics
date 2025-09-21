import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mocks
vi.mock('@/lib/insights/unified', () => ({
  computeInsights: vi.fn(async () => ({
    patterns: [],
    correlations: [],
    environmentalCorrelations: [],
    predictiveInsights: [],
    anomalies: [],
    insights: ['ok'],
    suggestedInterventions: [],
    confidence: 1,
    hasMinimumData: true,
  }))
}));

vi.mock('@/lib/alertSystem', () => ({
  alertSystem: { generateAlertsForStudent: vi.fn().mockResolvedValue(undefined) }
}));

// Provide a simple in-memory dataStorage mock
vi.mock('@/lib/dataStorage', () => {
  const trackingByStudent = new Map<string, any[]>();
  const goalsByStudent = new Map<string, any[]>();
  const students: any[] = [
    { id: 's1', name: 'Alice' },
    { id: 's2', name: 'Bob' },
  ];
  return {
    dataStorage: {
      getStudents: () => students.slice(),
      getTrackingEntriesForStudent: (id: string) => trackingByStudent.get(id) ?? [],
      getEntriesForStudent: (id: string) => trackingByStudent.get(id) ?? [],
      getGoalsForStudent: (id: string) => goalsByStudent.get(id) ?? [],
      saveTrackingEntry: (entry: any) => {
        const list = trackingByStudent.get(entry.studentId) ?? [];
        list.push(entry);
        trackingByStudent.set(entry.studentId, list);
      }
    },
    IDataStorage: {} as any,
    __reset: () => {
      trackingByStudent.clear();
      goalsByStudent.clear();
    }
  };
});

// Control analytics configuration and TTL
vi.mock('@/lib/analyticsConfig', async (orig) => {
  const mod: any = await orig();
  const DEFAULT = mod.DEFAULT_ANALYTICS_CONFIG;
  const cfg = { ...DEFAULT, cache: { ...DEFAULT.cache, ttl: 10_000 } }; // 10s TTL default
  return {
    ...mod,
    analyticsConfig: {
      getConfig: vi.fn(() => ({ ...cfg })),
    },
    DEFAULT_ANALYTICS_CONFIG: cfg,
  };
});

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), configure: vi.fn(),
  }
}));

import { analyticsManager } from '@/lib/analyticsManager';
import { analyticsConfig, DEFAULT_ANALYTICS_CONFIG } from '@/lib/analyticsConfig';
import { computeInsights } from '@/lib/insights/unified';
import { logger } from '@/lib/logger';

// Minimal localStorage polyfill for profile persistence in tests
function setupLocalStorage() {
  const store = new Map<string, string>();
  // @ts-expect-error Test installs minimal localStorage polyfill for browser-like behavior
  global.localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; }
  } as any;
}

describe('analyticsManager.getStudentAnalytics', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    setupLocalStorage();
    vi.clearAllMocks();
    const storageModule: any = await import('@/lib/dataStorage');
    storageModule.__reset?.();
    analyticsManager.clearCache();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns expected shape for getStudentAnalytics', async () => {
    const student = { id: 's1', name: 'Alice' } as any;

    // Seed some simple tracking data via dataStorage mock
    const { dataStorage }: any = await import('@/lib/dataStorage');
    const entry = { id: 't1', studentId: 's1', timestamp: new Date(), emotions: [], sensoryInputs: [] };
    dataStorage.saveTrackingEntry(entry);

    const result = await analyticsManager.getStudentAnalytics(student);
    expect(result).toMatchObject({
      patterns: expect.any(Array),
      correlations: expect.any(Array),
      environmentalCorrelations: expect.any(Array),
      predictiveInsights: expect.any(Array),
      anomalies: expect.any(Array),
      insights: expect.any(Array),
      suggestedInterventions: expect.any(Array),
    });

    // No direct delegation assertions here; covered by orchestrator tests
  });

  it('uses TTL from analyticsConfig by default and serves cached results within TTL', async () => {
    const student = { id: 's1', name: 'Alice' } as any;
    const r1 = await analyticsManager.getStudentAnalytics(student);
    const r2 = await analyticsManager.getStudentAnalytics(student);
    // Cached within TTL should return the same object reference
    expect(r2).toBe(r1);

    // Advance time just under TTL
    vi.advanceTimersByTime(9999);
    const r3 = await analyticsManager.getStudentAnalytics(student);
    expect(r3).toBe(r1);

    // After TTL, it should recompute
    vi.advanceTimersByTime(2);
    const r4 = await analyticsManager.getStudentAnalytics(student);
    expect(r4).not.toBe(r1);
  });

  it('returns minimal safe result and logs once on compute error; no throw', async () => {
    (computeInsights as any).mockRejectedValueOnce(new Error('boom'));

    const student = { id: 's1', name: 'Alice' } as any;
    const res = await analyticsManager.getStudentAnalytics(student);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(res.patterns).toEqual([]);
    expect(res.correlations).toEqual([]);
    expect(res.environmentalCorrelations).toEqual([]);
    expect(res.predictiveInsights).toEqual([]);
    expect(res.anomalies).toEqual([]);
    expect(Array.isArray(res.suggestedInterventions)).toBe(true);
    expect(res.error).toBeTruthy();
  });

  it('uses DEFAULT_ANALYTICS_CONFIG TTL when analyticsConfig.getConfig throws', async () => {
    // Make analyticsConfig.getConfig throw
    (analyticsConfig.getConfig as any).mockImplementationOnce(() => { throw new Error('config failed'); });

    const student = { id: 's1', name: 'Alice' } as any;
    const r1 = await analyticsManager.getStudentAnalytics(student);

    // Within default TTL window (from DEFAULT_ANALYTICS_CONFIG mocked value), second call should be cached
    const r2 = await analyticsManager.getStudentAnalytics(student);
    expect(r2).toBe(r1);

    // After default TTL elapses, recompute once
    vi.advanceTimersByTime(DEFAULT_ANALYTICS_CONFIG.cache.ttl + 1);
    const r3 = await analyticsManager.getStudentAnalytics(student);
    expect(r3).not.toBe(r1);
  });
});
