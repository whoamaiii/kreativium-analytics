import React, { useEffect } from 'react';
import { render, act, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';

import type { AnalyticsData, AnalyticsWorkerMessage } from '@/types/analytics';
import type { InsightsWorkerTask } from '@/lib/insights/task';
import type { Goal, Student, TrackingEntry, EmotionEntry } from '@/types/student';
import type { AnalyticsResultsAI } from '@/lib/analysis';
import { useAnalyticsWorker } from '@/hooks/useAnalyticsWorker';
import { analyticsWorkerFallback } from '@/lib/analyticsWorkerFallback';
import { analyticsManager } from '@/lib/analyticsManager';
import { resetWorkerManagerForTests } from '@/lib/analytics/workerManager';
import { legacyAnalyticsAdapter } from '@/new/analytics/legacyAnalyticsAdapter';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Mocks & Test Worker Harness
// ---------------------------------------------------------------------------

// i18n/Toast mocks used by useAnalyticsWorker toast pathway
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    tAnalytics: (k: string) => k,
    tStudent: (k: string) => k,
    tCommon: (k: string) => k,
  }),
}));

vi.mock('sonner', () => ({
  toast: vi.fn(),
}));

const createGoal = (id: string, studentId = 's1', overrides: Partial<Goal> = {}): Goal => ({
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

const createEmotionEntry = (overrides: Partial<EmotionEntry> = {}): EmotionEntry => ({
  id: overrides.id ?? `emotion-${Math.random()}`,
  emotion: overrides.emotion ?? 'calm',
  intensity: overrides.intensity ?? 1,
  timestamp: overrides.timestamp ?? new Date(),
  studentId: overrides.studentId,
  subEmotion: overrides.subEmotion,
  duration: overrides.duration,
  notes: overrides.notes,
  triggers: overrides.triggers,
  context: overrides.context,
  trigger: overrides.trigger,
  escalationPattern: overrides.escalationPattern,
});

const createTrackingEntry = (
  id: string,
  studentId: string,
  overrides: Partial<TrackingEntry> = {},
): TrackingEntry => ({
  id,
  studentId,
  timestamp: overrides.timestamp ?? new Date(),
  emotions: overrides.emotions ?? [],
  sensoryInputs: overrides.sensoryInputs ?? [],
  environmentalData: overrides.environmentalData,
  generalNotes: overrides.generalNotes,
  notes: overrides.notes,
  version: overrides.version,
});

const baseResults: AnalyticsResultsAI = {
  patterns: [],
  correlations: [],
  environmentalCorrelations: [],
  predictiveInsights: [],
  anomalies: [],
  insights: [],
  suggestedInterventions: [],
};

const toastMock = toast as unknown as Mock;

const getWorkerInstances = (): Array<{ postMessage: Mock }> => {
  const instances = globalThis.__WORKER_INSTANCES__ as Array<{ postMessage: Mock }> | undefined;
  return instances ?? [];
};

const advanceTimersAndFlush = async (ms?: number) => {
  if (typeof ms === 'number') {
    await act(async () => {
      vi.advanceTimersByTime(ms);
    });
  }
  await act(async () => {
    vi.runOnlyPendingTimers();
  });
  await flushMicrotasks();
};

const flushMicrotasks = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const WORKER_SUITE_TIMEOUT = 40_000;

// Make worker import controllable per test via globals
declare global {
  var __WORKER_THROW_CONSTRUCTOR__: boolean | undefined;

  var __WORKER_BEHAVIOR__: 'error' | 'timeout' | 'readySoon' | undefined;

  var __WORKER_INSTANCES__: any[] | undefined;

  var __WORKER_CTOR_CALLS__: number | undefined;
}

vi.mock('@/workers/analytics.worker?worker', () => {
  class TestWorker {
    static get instances() {
      if (!globalThis.__WORKER_INSTANCES__) globalThis.__WORKER_INSTANCES__ = [];
      return globalThis.__WORKER_INSTANCES__!;
    }
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onerror: ((ev: ErrorEvent) => void) | null = null;
    postMessage = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    terminate = vi.fn();
    constructor() {
      globalThis.__WORKER_CTOR_CALLS__ = (globalThis.__WORKER_CTOR_CALLS__ || 0) + 1;
      if (globalThis.__WORKER_THROW_CONSTRUCTOR__) {
        throw new Error('ctor fail');
      }
      TestWorker.instances.push(this);
      const bh = globalThis.__WORKER_BEHAVIOR__;
      if (bh === 'error') {
        setTimeout(() => {
          this.onerror && this.onerror(new ErrorEvent('error', { message: 'boom' }));
        }, 0);
      } else if (bh === 'readySoon') {
        setTimeout(() => {
          if (!this.onmessage) return;
          this.onmessage({
            data: { type: 'progress' },
          } as unknown as MessageEvent<AnalyticsWorkerMessage>);
        }, 0);
      } else {
        // 'timeout' => do nothing
      }
    }
  }
  return { default: TestWorker };
});

// Spy targets
const processAnalyticsSpy = vi.spyOn(analyticsWorkerFallback, 'processAnalytics');
const getStudentAnalyticsSpy = vi.spyOn(analyticsManager, 'getStudentAnalytics');
const getGoalsSpy = vi.spyOn(legacyAnalyticsAdapter, 'listGoalsForStudent');

// Harness component that triggers runAnalysis on mount and whenever inputs change
function Harness({
  data,
  options,
  onUpdate,
}: {
  data: AnalyticsData;
  options?: { useAI?: boolean; student?: Student };
  onUpdate?: (payload: { error: string | null }) => void;
}) {
  const { runAnalysis, error } = useAnalyticsWorker({ precomputeOnIdle: false });
  useEffect(() => {
    runAnalysis(
      data,
      options || {
        student: { id: 's1', name: 'Test Student', createdAt: new Date() } as any,
        useAI: false,
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), JSON.stringify(options)]);
  useEffect(() => {
    onUpdate?.({ error });
  }, [error, onUpdate]);
  return <div data-testid="status">{error || 'ok'}</div>;
}

function makeData(partial?: Partial<AnalyticsData>): AnalyticsData {
  return {
    entries: [],
    emotions: [],
    sensoryInputs: [],
    ...partial,
  } as AnalyticsData;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  processAnalyticsSpy.mockReset();
  getStudentAnalyticsSpy.mockReset();
  getGoalsSpy.mockReset();
  toastMock.mockReset();
  resetWorkerManagerForTests();
  globalThis.__WORKER_THROW_CONSTRUCTOR__ = false;
  globalThis.__WORKER_BEHAVIOR__ = undefined;
  globalThis.__WORKER_INSTANCES__ = [];
  globalThis.__WORKER_CTOR_CALLS__ = 0;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Integration: worker unavailability scenarios', () => {
  it(
    'falls back when worker initialization fails and opens circuit',
    async () => {
      globalThis.__WORKER_THROW_CONSTRUCTOR__ = true;
      processAnalyticsSpy.mockResolvedValue(baseResults);

      render(<Harness data={makeData()} />);
      await flushMicrotasks();
    expect(analyticsWorkerFallback.processAnalytics).toHaveBeenCalledTimes(1);

    // Trigger a second run quickly (circuit open window)
    render(
      <Harness
        data={makeData({
          emotions: [createEmotionEntry({ id: 'e1', emotion: 'joy', intensity: 5 })],
        })}
      />,
    );
    await flushMicrotasks();
    expect(analyticsWorkerFallback.processAnalytics).toHaveBeenCalledTimes(2);
    // Worker constructor attempted once during initial init effect
      expect(globalThis.__WORKER_CTOR_CALLS__).toBe(1);
    },
    WORKER_SUITE_TIMEOUT,
  );

  it(
    'handles worker runtime error via onerror and uses fallback',
    async () => {
      globalThis.__WORKER_BEHAVIOR__ = 'error';
      processAnalyticsSpy.mockResolvedValue(baseResults);

      render(<Harness data={makeData({ entries: [createTrackingEntry('t1', 's1')] })} />);
      await flushMicrotasks();
      expect(analyticsWorkerFallback.processAnalytics).toHaveBeenCalledTimes(1);
    },
    WORKER_SUITE_TIMEOUT,
  );

  it(
    'triggers watchdog timeout and sets fallback error',
    async () => {
      globalThis.__WORKER_BEHAVIOR__ = 'timeout';
      processAnalyticsSpy.mockResolvedValue(baseResults);
      render(
        <Harness
          data={makeData({ entries: [createTrackingEntry('t1', 's1')] })}
        />,
      );
      // watchdog upper bound is ~20s; advance past it with margin
      await advanceTimersAndFlush(35_000);
      await flushMicrotasks();
      expect(analyticsWorkerFallback.processAnalytics).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toMatch(/timeout/i);
      });
    },
    WORKER_SUITE_TIMEOUT,
  );

  it(
    'includes goals in fallback computations',
    async () => {
      globalThis.__WORKER_THROW_CONSTRUCTOR__ = true; // force fallback path
      getGoalsSpy.mockReturnValue([createGoal('g1', 'stu-1')]);
      processAnalyticsSpy.mockImplementation(async (data: AnalyticsData) => {
        expect(Array.isArray(data.goals)).toBe(true);
        expect(data.goals?.[0]).toMatchObject({ id: 'g1' });
      return baseResults;
    });
    render(
      <Harness
        data={makeData({ entries: [createTrackingEntry('t1', 'stu-1')] })}
        options={{ student: createStudent('stu-1', { name: 'S' }) }}
      />,
    );
    await flushMicrotasks();
    await flushMicrotasks();
      expect(analyticsWorkerFallback.processAnalytics).toHaveBeenCalledTimes(1);
    },
    WORKER_SUITE_TIMEOUT,
  );

  it(
    'respects configuration: routes AI preference to analyticsManager when useAI=true',
    async () => {
      globalThis.__WORKER_THROW_CONSTRUCTOR__ = true; // still fine; AI path bypasses
      getStudentAnalyticsSpy.mockResolvedValue({
        ...baseResults,
        ai: { provider: 'mock', model: 'x', latencyMs: 1 },
      });
    render(
      <Harness
        data={makeData({ entries: [createTrackingEntry('t1', 'stu-2')] })}
        options={{ useAI: true, student: createStudent('stu-2', { name: 'S2' }) }}
      />,
    );
    await flushMicrotasks();
    expect(analyticsManager.getStudentAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'stu-2' }),
      { useAI: true },
    );
      expect(analyticsWorkerFallback.processAnalytics).not.toHaveBeenCalled();
    },
    WORKER_SUITE_TIMEOUT,
  );

  it(
    'processes queued tasks when worker becomes ready',
    async () => {
      globalThis.__WORKER_BEHAVIOR__ = 'readySoon';
      // Let fallback resolve just in case, but we expect worker to receive a postMessage
      processAnalyticsSpy.mockResolvedValue(baseResults);
      render(
        <Harness
        data={makeData({
          entries: [createTrackingEntry('t1', 's1')],
          emotions: [createEmotionEntry({ id: 'e1', emotion: 'joy', intensity: 5 })],
        })}
      />,
    );
    await flushMicrotasks();
    // After readySoon, at least one worker instance should exist and have received a postMessage
    await waitFor(() => {
      expect(getWorkerInstances()[0]).toBeTruthy();
    });
      const inst = getWorkerInstances()[0]!;
      // Allow time for queue flush
      await advanceTimersAndFlush(5);
      expect(inst.postMessage).toHaveBeenCalled();
    },
    WORKER_SUITE_TIMEOUT,
  );

  it(
    'recovers after circuit breaker cooldown',
    async () => {
      // Step 1: runtime error opens 60s circuit
      globalThis.__WORKER_BEHAVIOR__ = 'error';
      render(<Harness data={makeData({ entries: [createTrackingEntry('t1', 's1')] })} />);
      await flushMicrotasks();
      const ctorCallsBefore = globalThis.__WORKER_CTOR_CALLS__ || 0;

    // Step 2: within cooldown, no new worker attempts on remount/trigger
    cleanup();
    render(<Harness data={makeData({ entries: [createTrackingEntry('t2', 's1')] })} />);
    await flushMicrotasks();
    const ctorCallsDuring = globalThis.__WORKER_CTOR_CALLS__ || 0;
    expect(ctorCallsDuring).toBe(ctorCallsBefore); // no new attempt while circuit open

    // Step 3: advance time beyond 60s, set behavior to readySoon => should attempt again
    await advanceTimersAndFlush(61_000);
    cleanup();
    globalThis.__WORKER_BEHAVIOR__ = 'readySoon';
    render(<Harness data={makeData({ entries: [createTrackingEntry('t3', 's1')] })} />);
    await flushMicrotasks();
      const ctorCallsAfter = globalThis.__WORKER_CTOR_CALLS__ || 0;
      expect(ctorCallsAfter).toBeGreaterThan(ctorCallsDuring);
    },
    WORKER_SUITE_TIMEOUT,
  );

  it(
    'rate-limits user-facing failure toast to once per minute',
    async () => {
      // Simulate worker runtime error to trigger toast path guarded by doOnce('analytics_worker_failure', 60_000, ...)
      globalThis.__WORKER_BEHAVIOR__ = 'error';
      toastMock.mockReset();

    // First mount -> should toast
    render(<Harness data={makeData({ entries: [createTrackingEntry('t1', 's1')] })} />);
    await advanceTimersAndFlush();
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledTimes(1);
    });

    // Second mount within same minute -> should not toast again
    cleanup();
    render(<Harness data={makeData({ entries: [createTrackingEntry('t2', 's1')] })} />);
    await advanceTimersAndFlush();
    expect(toastMock).toHaveBeenCalledTimes(1);

    // Advance beyond 60s -> should toast again
    await advanceTimersAndFlush(61_000);
    cleanup();
    render(<Harness data={makeData({ entries: [createTrackingEntry('t3', 's1')] })} />);
    await advanceTimersAndFlush();
      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledTimes(2);
      });
    },
    WORKER_SUITE_TIMEOUT,
  );
});
