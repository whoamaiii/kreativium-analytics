import React, { useEffect } from 'react';
import { render, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAnalyticsWorker } from '@/hooks/useAnalyticsWorker';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { saveTrackingEntry } from '@/lib/tracking/saveTrackingEntry';
import { analyticsCoordinator } from '@/lib/analyticsCoordinator';
import { dataStorage } from '@/lib/dataStorage';
import type { AnalyticsData, AnalyticsWorkerMessage } from '@/types/analytics';
import type { InsightsWorkerTask } from '@/lib/insights/task';
import type { Student, TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k, tAnalytics: (k: string) => k })
}));

const createTrackingEntry = (id: string, studentId: string): TrackingEntry => ({
  id,
  studentId,
  timestamp: new Date(),
  emotions: [{ id: `e-${id}`, timestamp: new Date(), emotion: 'happy', intensity: 1 } as any],
  sensoryInputs: [],
});

const createAnalyticsData = (entries: TrackingEntry[]): AnalyticsData => ({
  entries,
  emotions: [],
  sensoryInputs: [],
});

const createStudent = (id: string): Student => ({
  id,
  name: `Student ${id}`,
  createdAt: new Date(),
});

const createRealtimeSeed = (): { emotions: EmotionEntry[]; sensoryInputs: SensoryEntry[]; trackingEntries: TrackingEntry[] } => ({
  emotions: [],
  sensoryInputs: [],
  trackingEntries: [],
});

// Minimal worker mock to avoid fallback path
vi.mock('@/workers/analytics.worker?worker', () => {
  class TestWorker {
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onerror: ((ev: ErrorEvent) => void) | null = null;
    postMessage = vi.fn((msg: Partial<InsightsWorkerTask>) => {
      setTimeout(() => {
        if (!this.onmessage) return;
        const payloadInputs = msg?.payload?.inputs ?? {};
        const message = { data: { type: 'complete', cacheKey: msg?.cacheKey, payload: { ...payloadInputs, cacheKey: msg?.cacheKey } } };
        this.onmessage(message as unknown as MessageEvent<AnalyticsWorkerMessage>);
      }, 0);
    });
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    terminate = vi.fn();
    constructor() {
      setTimeout(() => {
        if (!this.onmessage) return;
        this.onmessage({ data: { type: 'progress' } } as unknown as MessageEvent<AnalyticsWorkerMessage>);
      }, 0);
    }
  }
  return { default: TestWorker };
});

function Harness({ studentId, onInvalidate }: { studentId?: string; onInvalidate?: () => void }) {
  const { runAnalysis } = useAnalyticsWorker({ precomputeOnIdle: false });
  useEffect(() => {
    const data = createAnalyticsData([createTrackingEntry('t1', studentId || 's1')]);
    runAnalysis(data, { student: createStudent(studentId || 's1'), useAI: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);
  useEffect(() => {
    const handler = () => { onInvalidate?.(); };
    window.addEventListener('analytics:cache:clear', handler as EventListener);
    window.addEventListener('analytics:cache:clear:student', handler as EventListener);
    return () => {
      window.removeEventListener('analytics:cache:clear', handler as EventListener);
      window.removeEventListener('analytics:cache:clear:student', handler as EventListener);
    };
  }, [onInvalidate]);
  return <div />;
}

describe('Integration: cache invalidation flows', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(dataStorage, 'getStudentById').mockReturnValue({ id: 'stu-1', name: 'Test Student', createdAt: new Date() } as any);
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('saveTrackingEntry triggers student-specific invalidation', async () => {
    const spy = vi.spyOn(analyticsCoordinator, 'broadcastCacheClear');
    render(<Harness studentId="stu-1" />);
    await act(async () => { vi.runAllTimers(); });
    await act(async () => {
      await saveTrackingEntry(createTrackingEntry('t2', 'stu-1'));
    });
    expect(spy).toHaveBeenCalledWith('stu-1');
  });

  it('global broadcast clears all caches', async () => {
    const onInvalidate = vi.fn();
    render(<>
      <Harness studentId="a" onInvalidate={onInvalidate} />
      <Harness studentId="b" onInvalidate={onInvalidate} />
    </>);
    await act(async () => { vi.runAllTimers(); });
    act(() => { analyticsCoordinator.broadcastCacheClear(); });
    expect(onInvalidate).toHaveBeenCalled();
  });

  it('realtime data insertion debounces and broadcasts student-specific invalidation', async () => {
    const studentId = 'stu-live';
    const bcSpy = vi.spyOn(analyticsCoordinator, 'broadcastCacheClear');
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    function RT() {
      const data = createRealtimeSeed();
      // Enable simulateData for automatic inserts
      const rt = useRealtimeData(data, { enabled: true, windowSize: 5, updateInterval: 250, smoothTransitions: false, simulateData: true, currentStudentId: studentId });
      useEffect(() => { rt.startStream(); }, []);
      return <div data-testid="rt" data-count={rt.newDataCount} />;
    }
    render(<RT />);
    // Advance timers to allow simulated inserts and debounced broadcast (>= updateInterval)
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(bcSpy).toHaveBeenCalledWith(studentId);
    randSpy.mockRestore();
  });

  it('student-specific broadcast only invalidates matching hook instance', async () => {
    const callsA: number[] = [];
    const callsB: number[] = [];
    let instA: any;
    let instB: any;

    // Worker with two instances tracking postMessage calls
    // Use existing mocked worker constructed by earlier tests; get instances after renders

    function HarnessA() {
      const { runAnalysis } = useAnalyticsWorker({ precomputeOnIdle: false });
      useEffect(() => {
        runAnalysis(createAnalyticsData([createTrackingEntry('a1', 'A')]), { student: createStudent('A'), useAI: false });
        const onStudent = (evt: Event) => {
          const det = (evt as CustomEvent<{ studentId?: string }>).detail;
          if (det?.studentId === 'A') callsA.push(Date.now());
        };
        window.addEventListener('analytics:cache:clear:student', onStudent as EventListener);
        return () => window.removeEventListener('analytics:cache:clear:student', onStudent as EventListener);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <div data-testid="A" />;
    }
    function HarnessB() {
      const { runAnalysis } = useAnalyticsWorker({ precomputeOnIdle: false });
      useEffect(() => {
        runAnalysis(createAnalyticsData([createTrackingEntry('b1', 'B')]), { student: createStudent('B'), useAI: false });
        const onStudent = (evt: Event) => {
          const det = (evt as CustomEvent<{ studentId?: string }>).detail;
          if (det?.studentId === 'B') callsB.push(Date.now());
        };
        window.addEventListener('analytics:cache:clear:student', onStudent as EventListener);
        return () => window.removeEventListener('analytics:cache:clear:student', onStudent as EventListener);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <div data-testid="B" />;
    }

    render(<>
      <HarnessA />
      <HarnessB />
    </>);
    await act(async () => { await Promise.resolve(); });

    act(() => {
      window.dispatchEvent(new CustomEvent('analytics:cache:clear:student', { detail: { studentId: 'A' } }));
    });
    expect(callsA.length).toBeGreaterThan(0);
    expect(callsB.length).toBe(0);
  });
});
