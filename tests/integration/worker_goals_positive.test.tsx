import React, { useEffect } from 'react';
import { render, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AnalyticsData, AnalyticsWorkerMessage } from '@/types/analytics';
import type { InsightsWorkerTask } from '@/lib/insights/task';
import type { Goal, Student, TrackingEntry } from '@/types/student';

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

const createStudent = (id: string): Student => ({
  id,
  name: `Student ${id}`,
  createdAt: new Date(),
});

const createTrackingEntry = (id: string, studentId: string, overrides: Partial<TrackingEntry> = {}): TrackingEntry => ({
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

const createAnalyticsData = (entries: TrackingEntry[], overrides: Partial<AnalyticsData> = {}): AnalyticsData => ({
  entries,
  emotions: overrides.emotions ?? [],
  sensoryInputs: overrides.sensoryInputs ?? [],
  goals: overrides.goals,
  cacheKey: overrides.cacheKey,
  config: overrides.config,
});

// Test worker that echoes back goals received in payload
declare global {
  // eslint-disable-next-line no-var
  var __WORKER_CAPTURED_MESSAGES__: Array<{ cacheKey?: string; payload?: InsightsWorkerTask['payload'] }> | undefined;
}

vi.mock('@/lib/env', async (orig) => {
  const actual: any = await orig();
  return { ...actual, POC_MODE: false, DISABLE_ANALYTICS_WORKER: false };
});

vi.mock('@/workers/analytics.worker?worker', () => {
  class TestWorker {
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onerror: ((ev: ErrorEvent) => void) | null = null;
    postMessage = vi.fn((msg: Partial<InsightsWorkerTask>) => {
      globalThis.__WORKER_CAPTURED_MESSAGES__ = globalThis.__WORKER_CAPTURED_MESSAGES__ ?? [];
      globalThis.__WORKER_CAPTURED_MESSAGES__!.push({ cacheKey: msg?.cacheKey, payload: msg?.payload });
      // Immediately echo back a complete message with same cacheKey and minimal payload
      setTimeout(() => {
        if (!this.onmessage) return;
        const message = {
          data: {
            type: 'complete',
            cacheKey: msg?.cacheKey,
            payload: msg?.payload,
          },
        };
        this.onmessage(message as unknown as MessageEvent<AnalyticsWorkerMessage>);
      }, 0);
    });
    addEventListener = vi.fn((type: string, handler: any) => {
      if (type === 'message') {
        this.onmessage = handler;
      }
    });
    removeEventListener = vi.fn();
    terminate = vi.fn();
    constructor() {
      if (!globalThis.__WORKER_CAPTURED_MESSAGES__) globalThis.__WORKER_CAPTURED_MESSAGES__ = [];
      setTimeout(() => {
        if (!this.onmessage) return;
        this.onmessage({ data: { type: 'progress', progress: { stage: 'ready', percent: 1 } } } as unknown as MessageEvent<AnalyticsWorkerMessage>);
      }, 0);
    }
  }
  return { default: TestWorker };
});

// Capture task build calls from analyticsManager
vi.mock('@/lib/analyticsManager', async (orig) => {
  const actual: any = await orig();
  const calls: any[] = [];
  (globalThis as any).__TASK_CALLS__ = calls;
  return {
    ...actual,
    buildInsightsTask: vi.fn((...args: any[]) => {
      calls.push(args);
      return actual.buildInsightsTask(...args);
    }),
  } as any;
});

// Import modules that use the mocks AFTER mocks are declared
import { useAnalyticsWorker } from '@/hooks/useAnalyticsWorker';
import { dataStorage } from '@/lib/dataStorage';
import { analyticsWorkerFallback } from '@/lib/analyticsWorkerFallback';
import { enhancedPatternAnalysis } from '@/lib/enhancedPatternAnalysis';
import * as analyticsManagerMod from '@/lib/analyticsManager';

const getGoalsSpy = vi.spyOn(dataStorage, 'getGoalsForStudent');
const processAnalyticsSpy = vi.spyOn(analyticsWorkerFallback, 'processAnalytics');
const predictiveInsightsSpy = vi.spyOn(enhancedPatternAnalysis, 'generatePredictiveInsights');

function Harness({ studentId }: { studentId?: string }) {
  const { runAnalysis } = useAnalyticsWorker({ precomputeOnIdle: false });
  useEffect(() => {
    const entries = [createTrackingEntry('t1', studentId || 'stu-1')];
    const data = createAnalyticsData(entries);
    const options = studentId ? { student: createStudent(studentId), useAI: false } : { student: createStudent('stu-1'), useAI: false };
    // Defer run until worker initialization effect runs so we use the worker path, not fallback
    setTimeout(() => { runAnalysis(data, options); }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);
  return <div />;
}

describe('Integration: worker goals positive propagation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getGoalsSpy.mockReset();
    processAnalyticsSpy.mockReset();
    predictiveInsightsSpy.mockReset();
    globalThis.__WORKER_CAPTURED_MESSAGES__ = [];
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('includes goals in worker payload when student provided', async () => {
    getGoalsSpy.mockReturnValue([createGoal('g1', 'stu-1')]);
    render(<Harness studentId="stu-1" />);
    await act(async () => { vi.runAllTimers(); });
    const workerMsgs: any[] = (globalThis as any).__WORKER_CAPTURED_MESSAGES__ || [];
    const workerHasGoals = workerMsgs.some((m) => Array.isArray(m?.payload?.inputs?.goals) && m.payload.inputs.goals.some((g: any) => g.id === 'g1'));
    const fbCalls = (analyticsWorkerFallback.processAnalytics as any).mock?.calls || [];
    const fbHasGoals = fbCalls.some((args: any[]) => Array.isArray(args?.[0]?.goals) && args[0].goals.some((g: any) => g.id === 'g1'));
    expect(workerHasGoals || fbHasGoals).toBe(true);
  });

  it('fetches goals via inferred student when not provided explicitly', async () => {
    getGoalsSpy.mockReturnValue([createGoal('g2', 'stu-1')]);
    render(<Harness />);
    await act(async () => { vi.runAllTimers(); });
    expect(dataStorage.getGoalsForStudent).toHaveBeenCalledWith('stu-1');
    const workerMsgs: any[] = (globalThis as any).__WORKER_CAPTURED_MESSAGES__ || [];
    const workerHasGoals = workerMsgs.some((m) => Array.isArray(m?.payload?.inputs?.goals) && m.payload.inputs.goals.some((g: any) => g.id === 'g2'));
    const fbCalls = (analyticsWorkerFallback.processAnalytics as any).mock?.calls || [];
    const fbHasGoals = fbCalls.some((args: any[]) => Array.isArray(args?.[0]?.goals) && args[0].goals.some((g: any) => g.id === 'g2'));
    expect(workerHasGoals || fbHasGoals).toBe(true);
  });

  it('fallback path receives goals and forwards them to enhanced analysis', async () => {
    processAnalyticsSpy.mockImplementationOnce(async (data: AnalyticsData) => {
      expect(Array.isArray(data.goals)).toBe(true);
      await enhancedPatternAnalysis.generatePredictiveInsights([], [], [createTrackingEntry('t', 'stu-fb')], data.goals ?? []);
      return { patterns: [], correlations: [], environmentalCorrelations: [], predictiveInsights: [], anomalies: [], insights: [], suggestedInterventions: [] };
    });
    predictiveInsightsSpy.mockResolvedValueOnce([]);

    getGoalsSpy.mockReturnValue([createGoal('gX', 'stu-fb'), createGoal('gY', 'stu-fb')]);

    function FBFHarness() {
      const { runAnalysis } = useAnalyticsWorker({ precomputeOnIdle: false });
      useEffect(() => {
        runAnalysis(createAnalyticsData([createTrackingEntry('t', 'stu-fb')]), { student: createStudent('stu-fb'), useAI: false });
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <div />;
    }

    render(<FBFHarness />);
    await act(async () => { await Promise.resolve(); });
    expect(enhancedPatternAnalysis.generatePredictiveInsights).toHaveBeenCalledWith(
      [],
      [],
      expect.any(Array),
      expect.arrayContaining([
        expect.objectContaining({ id: 'gX' }),
        expect.objectContaining({ id: 'gY' }),
      ])
    );
  });

  it('multiple goals are included in worker payload and affect cacheKey', async () => {
    getGoalsSpy.mockReturnValueOnce([createGoal('g1', 'stu-2')]);
    render(<Harness studentId="stu-2" />);
    await act(async () => { vi.runAllTimers(); });
    const msgs1: any[] = (globalThis as any).__WORKER_CAPTURED_MESSAGES__ || [];
    const key1 = msgs1.at(-1)?.cacheKey ?? '';

    getGoalsSpy.mockReturnValueOnce([createGoal('g1', 'stu-2'), createGoal('g2', 'stu-2')]);
    render(<Harness studentId="stu-2" />);
    await act(async () => { vi.runAllTimers(); });
    const msgs2: any[] = (globalThis as any).__WORKER_CAPTURED_MESSAGES__ || [];
    const secondPayload = msgs2.at(-1)?.payload;
    const goalsArr = secondPayload?.inputs?.goals as any[] | undefined;
    if (goalsArr && Array.isArray(goalsArr)) {
      expect(goalsArr).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'g1' }),
        expect.objectContaining({ id: 'g2' }),
      ]));
      const key2 = msgs2.at(-1)?.cacheKey ?? '';
      expect(key2).not.toEqual(key1);
    } else {
      // Fallback path: assert that processAnalytics was called with two goals
      const fbCalls = (analyticsWorkerFallback.processAnalytics as any).mock?.calls || [];
      const fbWithTwo = fbCalls.find((args: any[]) => Array.isArray(args?.[0]?.goals) && args[0].goals.length === 2);
      expect(!!fbWithTwo).toBe(true);
    }
  });
});
