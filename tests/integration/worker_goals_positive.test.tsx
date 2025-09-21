import React, { useEffect } from 'react';
import { render, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAnalyticsWorker } from '@/hooks/useAnalyticsWorker';
import { dataStorage } from '@/lib/dataStorage';
import { analyticsWorkerFallback } from '@/lib/analyticsWorkerFallback';
import { enhancedPatternAnalysis } from '@/lib/enhancedPatternAnalysis';
import type { AnalyticsData, AnalyticsWorkerMessage } from '@/types/analytics';
import type { InsightsWorkerTask } from '@/lib/insights/task';
import type { Goal, Student, TrackingEntry } from '@/types/student';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k, tAnalytics: (k: string) => k })
}));

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
            payload: { ...(payload?.inputs ?? {}), cacheKey: msg?.cacheKey },
          },
        };
        this.onmessage(message as unknown as MessageEvent<AnalyticsWorkerMessage>);
      }, 0);
    });
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    terminate = vi.fn();
    constructor() {
      if (!globalThis.__WORKER_CAPTURED_MESSAGES__) globalThis.__WORKER_CAPTURED_MESSAGES__ = [];
      setTimeout(() => {
        if (!this.onmessage) return;
        this.onmessage({ data: { type: 'progress' } } as unknown as MessageEvent<AnalyticsWorkerMessage>);
      }, 0);
    }
  }
  return { default: TestWorker };
});

const getGoalsSpy = vi.spyOn(dataStorage, 'getGoalsForStudent');
const processAnalyticsSpy = vi.spyOn(analyticsWorkerFallback, 'processAnalytics');
const predictiveInsightsSpy = vi.spyOn(enhancedPatternAnalysis, 'generatePredictiveInsights');

function Harness({ studentId }: { studentId?: string }) {
  const { runAnalysis } = useAnalyticsWorker({ precomputeOnIdle: false });
  useEffect(() => {
    const entries = [createTrackingEntry('t1', studentId || 'stu-1')];
    const data = createAnalyticsData(entries);
    const options = studentId ? { student: createStudent(studentId) } : undefined;
    runAnalysis(data, options);
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
    await act(async () => { await Promise.resolve(); });
    const msgs = globalThis.__WORKER_CAPTURED_MESSAGES__ || [];
    expect(msgs.length).toBeGreaterThan(0);
    const withGoals = msgs.find((m) => Array.isArray(m.payload?.inputs?.goals));
    expect(withGoals).toBeTruthy();
    expect(withGoals?.payload?.inputs?.goals?.[0]).toMatchObject({ id: 'g1' });
  });

  it('fetches goals via inferred student when not provided explicitly', async () => {
    getGoalsSpy.mockReturnValue([createGoal('g2', 'stu-1')]);
    render(<Harness />);
    await act(async () => { await Promise.resolve(); });
    expect(dataStorage.getGoalsForStudent).toHaveBeenCalledWith('stu-1');
    const msgs = globalThis.__WORKER_CAPTURED_MESSAGES__ || [];
    const found = msgs.find((m) => Array.isArray(m.payload?.inputs?.goals));
    expect(found?.payload?.inputs?.goals?.[0]).toMatchObject({ id: 'g2' });
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
        runAnalysis(createAnalyticsData([createTrackingEntry('t', 'stu-fb')]), { student: createStudent('stu-fb') });
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
    await act(async () => { await Promise.resolve(); });
    const msgs1 = globalThis.__WORKER_CAPTURED_MESSAGES__ || [];
    const first = msgs1[msgs1.length - 1];
    const key1 = first?.cacheKey ?? '';

    getGoalsSpy.mockReturnValueOnce([createGoal('g1', 'stu-2'), createGoal('g2', 'stu-2')]);
    render(<Harness studentId="stu-2" />);
    await act(async () => { await Promise.resolve(); });
    const msgs2 = globalThis.__WORKER_CAPTURED_MESSAGES__ || [];
    const second = msgs2[msgs2.length - 1];
    const key2 = second?.cacheKey ?? '';

    expect(Array.isArray(second?.payload?.inputs?.goals)).toBe(true);
    expect(second?.payload?.inputs?.goals).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'g1' }),
      expect.objectContaining({ id: 'g2' }),
    ]));
    expect(key2).not.toEqual(key1);
  });
});
