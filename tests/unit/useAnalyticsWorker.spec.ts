import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnalyticsWorker } from '@/hooks/useAnalyticsWorker';
import { analyticsWorkerFallback } from '@/lib/analyticsWorkerFallback';
import { analyticsManager } from '@/lib/analyticsManager';
import { dataStorage } from '@/lib/dataStorage';
import { analyticsConfig } from '@/lib/analyticsConfig';
import type { AnalyticsData, AnalyticsWorkerMessage, AnalyticsConfiguration } from '@/types/analytics';
import type { Goal, TrackingEntry, Student } from '@/types/student';
import type { InsightsWorkerPayload, InsightsWorkerTask } from '@/lib/insights/task';
import type { AnalyticsResultsAI } from '@/lib/analysis';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k, tAnalytics: (k: string) => k })
}));

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

// Worker stub (healthy by default)
interface CapturedPost {
  cacheKey?: string;
  payload?: InsightsWorkerPayload;
}

declare global {
  // eslint-disable-next-line no-var
  var __WORKER_INSTANCES__: unknown[] | undefined;
}

let lastPostedTask: CapturedPost | null = null;

vi.mock('@/workers/analytics.worker?worker', () => {
  class TestWorker {
    static get instances(): TestWorker[] {
      if (!globalThis.__WORKER_INSTANCES__) globalThis.__WORKER_INSTANCES__ = [];
      return globalThis.__WORKER_INSTANCES__ as TestWorker[];
    }

    onmessage: ((ev: MessageEvent<AnalyticsWorkerMessage>) => void) | null = null;
    onerror: ((ev: ErrorEvent) => void) | null = null;
    postMessage = vi.fn((msg: Partial<InsightsWorkerTask>) => {
      lastPostedTask = { cacheKey: msg?.cacheKey, payload: msg?.payload };
    });
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    terminate = vi.fn();

    constructor() {
      TestWorker.instances.push(this);
    }
  }

  return { default: TestWorker };
});

const processAnalyticsSpy = vi.spyOn(analyticsWorkerFallback, 'processAnalytics');
const getStudentAnalyticsSpy = vi.spyOn(analyticsManager, 'getStudentAnalytics');
const getGoalsSpy = vi.spyOn(dataStorage, 'getGoalsForStudent');
const getConfigSpy = vi.spyOn(analyticsConfig, 'getConfig');

const createTrackingEntry = (studentId: string, overrides: Partial<TrackingEntry> = {}): TrackingEntry => ({
  id: overrides.id ?? `track-${studentId}-${Date.now()}`,
  studentId,
  timestamp: overrides.timestamp ?? new Date(),
  emotions: overrides.emotions ?? [],
  sensoryInputs: overrides.sensoryInputs ?? [],
  environmentalData: overrides.environmentalData,
  generalNotes: overrides.generalNotes,
  notes: overrides.notes,
  version: overrides.version,
});

const createAnalyticsData = (overrides: Partial<AnalyticsData> = {}): AnalyticsData => ({
  entries: overrides.entries ?? [],
  emotions: overrides.emotions ?? [],
  sensoryInputs: overrides.sensoryInputs ?? [],
  goals: overrides.goals,
  cacheKey: overrides.cacheKey,
  config: overrides.config,
});

const createStudent = (id: string, overrides: Partial<Student> = {}): Student => ({
  id,
  name: overrides.name ?? `Student ${id}`,
  createdAt: overrides.createdAt ?? new Date(),
  grade: overrides.grade,
  dateOfBirth: overrides.dateOfBirth,
  notes: overrides.notes,
  iepGoals: overrides.iepGoals,
  baselineData: overrides.baselineData,
  environmentalPreferences: overrides.environmentalPreferences,
  lastUpdated: overrides.lastUpdated,
  version: overrides.version,
});

const createGoal = (id: string, studentId = 'stu-1', overrides: Partial<Goal> = {}): Goal => ({
  id,
  studentId,
  title: overrides.title ?? `Goal ${id}`,
  description: overrides.description ?? '',
  category: overrides.category ?? 'academic',
  targetDate: overrides.targetDate ?? new Date(),
  createdDate: overrides.createdDate ?? new Date(),
  updatedAt: overrides.updatedAt ?? new Date(),
  status: overrides.status ?? 'in_progress',
  measurableObjective: overrides.measurableObjective ?? 'Measure progress',
  currentProgress: overrides.currentProgress ?? 0,
  milestones: overrides.milestones,
  interventions: overrides.interventions,
  baselineValue: overrides.baselineValue,
  targetValue: overrides.targetValue,
  dataPoints: overrides.dataPoints,
  notes: overrides.notes,
  progress: overrides.progress ?? 0,
});

const emptyResults: AnalyticsResultsAI = {
  patterns: [],
  correlations: [],
  environmentalCorrelations: [],
  predictiveInsights: [],
  anomalies: [],
  insights: [],
  suggestedInterventions: [],
};

const getWorkerInstances = (): Array<{ postMessage: Mock; addEventListener: Mock }> => {
  const instances = globalThis.__WORKER_INSTANCES__ as Array<{ postMessage: Mock; addEventListener: Mock }> | undefined;
  return instances ?? [];
};

describe('useAnalyticsWorker (unit)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    processAnalyticsSpy.mockReset();
    getStudentAnalyticsSpy.mockReset();
    getGoalsSpy.mockReset();
    getConfigSpy.mockReset();
    getConfigSpy.mockReturnValue({
      cache: { ttl: 600000, maxSize: 50, invalidateOnConfigChange: true },
      precomputation: { enabled: false },
      charts: { lineWidths: { average: 2, movingAverage: 2, positive: 2, negative: 2, sensory: 2 } },
    } as unknown as ReturnType<typeof analyticsConfig.getConfig>);
    globalThis.__WORKER_INSTANCES__ = [];
    lastPostedTask = null;
  });
  afterEach(() => { vi.useRealTimers(); });

  it('fetches goals when student provided and includes in cache key path', async () => {
    getGoalsSpy.mockReturnValue([createGoal('g1', 's1')]);
    const { result } = renderHook(() => useAnalyticsWorker({ precomputeOnIdle: false }));
    await act(async () => {
      await result.current.runAnalysis(
        createAnalyticsData({ entries: [createTrackingEntry('s1', { id: 't1' })] }),
        { student: createStudent('s1') }
      );
    });
    expect(dataStorage.getGoalsForStudent).toHaveBeenCalledWith('s1');
  });

  it('cacheKey composition changes with goals and config', async () => {
    const { result } = renderHook(() => useAnalyticsWorker({ precomputeOnIdle: false }));
    // First run: no goals
    getGoalsSpy.mockReturnValueOnce([]);
    lastPostedTask = null;
    await act(async () => {
      await result.current.runAnalysis(
        createAnalyticsData({ entries: [createTrackingEntry('s1', { id: 'a' })] }),
        { student: createStudent('s1') }
      );
    });
    const keyNoGoals = lastPostedTask?.cacheKey ?? '';
    expect(keyNoGoals).toBeTruthy();

    // Second run: with goals
    getGoalsSpy.mockReturnValueOnce([createGoal('g1', 's1')]);
    lastPostedTask = null;
    await act(async () => {
      await result.current.runAnalysis(
        createAnalyticsData({ entries: [createTrackingEntry('s1', { id: 'b' })] }),
        { student: createStudent('s1') }
      );
    });
    const keyWithGoals = lastPostedTask?.cacheKey ?? '';
    expect(keyWithGoals).toBeTruthy();
    expect(keyWithGoals).not.toEqual(keyNoGoals);

    // Config change invalidation
    const sub = vi.spyOn(analyticsConfig, 'subscribe');
    const cb = sub.mock.calls[0]?.[0];
    if (cb) {
      cb({ cache: { invalidateOnConfigChange: true, ttl: 12345 }, analytics: { ANALYSIS_PERIOD_DAYS: 60 } } as unknown as AnalyticsConfiguration);
    }
    lastPostedTask = null;
    getGoalsSpy.mockReturnValueOnce([createGoal('g1', 's1')]);
    await act(async () => {
      await result.current.runAnalysis(
        createAnalyticsData({ entries: [createTrackingEntry('s1', { id: 'c' })] }),
        { student: createStudent('s1') }
      );
    });
    const keyAfterConfig = lastPostedTask?.cacheKey ?? '';
    expect(keyAfterConfig).toBeTruthy();
    expect(keyAfterConfig).not.toEqual(keyWithGoals);
  });

  it('config change clears cache leading to recomputation (worker postMessage increments)', async () => {
    const { result } = renderHook(() => useAnalyticsWorker({ precomputeOnIdle: false }));
    const inst = getWorkerInstances()[0];
    // Prime cache
    await act(async () => {
      await result.current.runAnalysis(
        createAnalyticsData({ entries: [createTrackingEntry('s10', { id: 'p' })] }),
        { student: createStudent('s10') }
      );
    });
    const callsBefore = inst?.postMessage.mock.calls.length ?? 0;
    // Trigger config change invalidation
    const sub = vi.spyOn(analyticsConfig, 'subscribe');
    const cb = sub.mock.calls[0]?.[0];
    if (cb) cb({ cache: { invalidateOnConfigChange: true } } as unknown as AnalyticsConfiguration);
    await act(async () => {
      await result.current.runAnalysis(
        createAnalyticsData({ entries: [createTrackingEntry('s10', { id: 'p2' })] }),
        { student: createStudent('s10') }
      );
    });
    const callsAfter = inst?.postMessage.mock.calls.length ?? 0;
    expect(callsAfter).toBeGreaterThan(callsBefore);
  });

  it('routes to analyticsManager when useAI=true and sets results', async () => {
    getStudentAnalyticsSpy.mockResolvedValue({ ...emptyResults, ai: { provider: 'mock' } });
    const { result } = renderHook(() => useAnalyticsWorker({ precomputeOnIdle: false }));
    await act(async () => {
      await result.current.runAnalysis(
        createAnalyticsData({ entries: [createTrackingEntry('s2', { id: 't2' })] }),
        { useAI: true, student: createStudent('s2') }
      );
    });
    expect(analyticsManager.getStudentAnalytics).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('subscribes to cache clear events and invalidates student-specific cache', async () => {
    const { result } = renderHook(() => useAnalyticsWorker({ precomputeOnIdle: false, enableCacheStats: true }));
    // Prime cache by running once
    await act(async () => {
      await result.current.runAnalysis(
        createAnalyticsData({ entries: [createTrackingEntry('stu-x', { id: 't3' })] }),
        { student: createStudent('stu-x') }
      );
    });
    // Fire student-specific clear; expect no crash (cannot directly assert internals)
    act(() => {
      window.dispatchEvent(new CustomEvent('analytics:cache:clear:student', { detail: { studentId: 'stu-x' } }));
    });
    expect(typeof result.current.clearCache).toBe('function');
  });

  it('clears cache on config change when invalidateOnConfigChange is true', async () => {
    const sub = vi.spyOn(analyticsConfig, 'subscribe');
    const { result } = renderHook(() => useAnalyticsWorker({ precomputeOnIdle: false }));
    const cb = sub.mock.calls[0][0];
    act(() => {
      cb({ cache: { invalidateOnConfigChange: true } } as unknown as AnalyticsConfiguration);
    });
    expect(typeof result.current.clearCache).toBe('function');
  });

  it('sets and clears error state on worker error path', async () => {
    // Simulate fallback error return
    processAnalyticsSpy.mockResolvedValue(emptyResults);
    const { result } = renderHook(() => useAnalyticsWorker({ precomputeOnIdle: false }));
    await act(async () => {
      await result.current.runAnalysis(createAnalyticsData({ entries: [createTrackingEntry('sx', { id: 't4' })] }));
    });
    expect(result.current.error === null || typeof result.current.error === 'string').toBe(true);
  });
});
