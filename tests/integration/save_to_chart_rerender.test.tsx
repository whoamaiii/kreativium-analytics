import React, { useEffect, useMemo, useState } from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TrendsChart } from '@/components/charts/TrendsChart';
import { saveTrackingEntry } from '@/lib/tracking/saveTrackingEntry';
import { analyticsCoordinator } from '@/lib/analyticsCoordinator';
import { useAnalyticsWorker } from '@/hooks/useAnalyticsWorker';
import { dataStorage } from '@/lib/dataStorage';
import type { AnalyticsData, AnalyticsWorkerMessage } from '@/types/analytics';
import type { InsightsWorkerTask } from '@/lib/insights/task';
import type { Student, TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k, tAnalytics: (k: string) => k })
}));

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
  escalationPattern: overrides.escalationPattern,
  trigger: overrides.trigger,
});

const createSensoryEntry = (overrides: Partial<SensoryEntry> = {}): SensoryEntry => ({
  id: overrides.id ?? `sensory-${Math.random()}`,
  response: overrides.response ?? 'neutral',
  timestamp: overrides.timestamp ?? new Date(),
  studentId: overrides.studentId,
  sensoryType: overrides.sensoryType,
  type: overrides.type,
  input: overrides.input,
  intensity: overrides.intensity,
  location: overrides.location,
  notes: overrides.notes,
  environment: overrides.environment,
  context: overrides.context,
  copingStrategies: overrides.copingStrategies,
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

// ECharts container can render without actual canvas in jsdom
vi.mock('@/components/charts/EChartContainer', () => ({
  EChartContainer: ({ option }: any) => {
    const series = Array.isArray(option?.series) ? option.series : [];
    const seriesHash = JSON.stringify(series.map((s: any) => s?.data ?? []));
    return <div data-testid="echart-container" data-series-hash={seriesHash} />;
  }
}));

// Mock worker to immediately complete
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

type TrackingEntry = { id: string; studentId: string; timestamp: Date; emotions: Array<{ intensity: number }>; sensoryInputs: unknown[] };

function deriveChartData(entries: TrackingEntry[]) {
  // Very simple daily aggregation: average intensity per day, counts for others
  const byDate = new Map<string, { sum: number; count: number; sensory: number }>();
  entries.forEach(e => {
    const d = e.timestamp.toISOString().slice(0,10);
    const avg = e.emotions.length ? e.emotions.reduce((s, x) => s + (x.intensity || 0), 0) / e.emotions.length : 0;
    const prev = byDate.get(d) || { sum: 0, count: 0, sensory: 0 };
    byDate.set(d, { sum: prev.sum + avg, count: prev.count + 1, sensory: prev.sensory + (e.sensoryInputs?.length || 0) });
  });
  return Array.from(byDate.entries()).map(([date, v]) => ({
    date,
    timestamp: new Date(date),
    emotionCount: v.count,
    avgEmotionIntensity: v.count ? Number((v.sum / v.count).toFixed(2)) : 0,
    positiveEmotions: 0.5 * v.count,
    negativeEmotions: 0.25 * v.count,
    sensorySeekingCount: 0,
    sensoryAvoidingCount: 0,
    totalSensoryInputs: v.sensory,
  }));
}

function Dashboard({ initialEntries, studentId }: { initialEntries: TrackingEntry[]; studentId: string }) {
  const [entries, setEntries] = useState<TrackingEntry[]>(initialEntries);
  const data = useMemo<AnalyticsData>(() => ({ entries, emotions: [], sensoryInputs: [] }), [entries]);
  const { runAnalysis } = useAnalyticsWorker({ precomputeOnIdle: false });

  useEffect(() => {
    runAnalysis(data, { student: createStudent(studentId) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(entries), studentId]);

  useEffect(() => {
    const handler = (evt: Event) => {
      const det = (evt as CustomEvent<{ studentId?: string }>).detail;
      if (!det || det.studentId === studentId) {
        try {
          const next = (dataStorage.getEntriesForStudent(studentId) || []) as TrackingEntry[];
          setEntries(next);
          runAnalysis(createAnalyticsData(next), { student: createStudent(studentId) });
        } catch { /* noop */ }
      }
    };
    window.addEventListener('analytics:cache:clear', handler as EventListener);
    window.addEventListener('analytics:cache:clear:student', handler as EventListener);
    return () => {
      window.removeEventListener('analytics:cache:clear', handler as EventListener);
      window.removeEventListener('analytics:cache:clear:student', handler as EventListener);
    };
  }, [runAnalysis, studentId]);

  const chartData = useMemo(() => deriveChartData(entries), [entries]);
  return <TrendsChart chartData={chartData} selectedChartType="line" />;
}

describe('Integration: save → analytics → chart rerender', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('rerenders chart after save triggers invalidation', async () => {
    const studentId = 'stu-1';
    const initialEntries: TrackingEntry[] = [
      createTrackingEntry('t0', studentId, {
        timestamp: new Date('2025-01-01T00:00:00Z'),
        emotions: [createEmotionEntry({ intensity: 4, timestamp: new Date('2025-01-01T00:00:00Z'), studentId, emotion: 'calm' })],
        sensoryInputs: [],
      }),
    ];

    const spy = vi.spyOn(analyticsCoordinator, 'broadcastCacheClear');
    render(<Dashboard initialEntries={initialEntries} studentId={studentId} />);
    const elBefore = await screen.findByTestId('echart-container');
    const beforeHash = String(elBefore.getAttribute('data-series-hash'));

    await act(async () => {
      await saveTrackingEntry(
        createTrackingEntry('t1', studentId, {
          timestamp: new Date('2025-01-02T00:00:00Z'),
          emotions: [createEmotionEntry({ intensity: 6, timestamp: new Date('2025-01-02T00:00:00Z'), studentId, emotion: 'calm' })],
          sensoryInputs: [createSensoryEntry({ id: 's', studentId, timestamp: new Date('2025-01-02T00:00:00Z') })],
        })
      );
      await Promise.resolve();
    });
    expect(spy).toHaveBeenCalledWith(studentId);

    // Allow the handler to refetch and re-run analysis
    await act(async () => { await Promise.resolve(); });
    const elAfter = await screen.findByTestId('echart-container');
    const afterHash = String(elAfter.getAttribute('data-series-hash'));
    expect(afterHash).not.toEqual(beforeHash);
  });
});
