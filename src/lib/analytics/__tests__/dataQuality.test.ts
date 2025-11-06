import { describe, expect, it } from 'vitest';
import { computeDataQualitySummary, type DateRange } from '@/lib/analytics/dataQuality';
import type { TrackingEntry } from '@/types/student';

const makeEntry = (overrides: Partial<TrackingEntry>): TrackingEntry => ({
  id: 'entry',
  studentId: 'student-1',
  timestamp: new Date('2024-03-10T09:00:00Z'),
  emotions: [],
  sensoryInputs: [],
  context: [],
  activities: [],
  interventions: [],
  ...overrides,
});

describe('computeDataQualitySummary', () => {
  it('returns neutral summary when no entries are provided', () => {
    const summary = computeDataQualitySummary([]);
    expect(summary.total).toBe(0);
    expect(summary.completeness).toBe(0);
    expect(summary.balance).toBe(0);
    expect(summary.avgIntensity).toBeNull();
  });

  it('computes buckets, completeness, and intensity', () => {
    const entries: TrackingEntry[] = [
      makeEntry({
        timestamp: new Date('2024-03-10T08:00:00Z'),
        emotions: [{ id: 'e1', type: 'happy', intensity: 5, studentId: 'student-1', timestamp: new Date() }],
        sensoryInputs: [{} as any],
      }),
      makeEntry({
        id: 'entry-2',
        timestamp: new Date('2024-03-10T14:00:00Z'),
        emotions: [{ id: 'e2', type: 'calm', intensity: 7, studentId: 'student-1', timestamp: new Date() }],
        sensoryInputs: [{} as any],
      }),
      makeEntry({
        id: 'entry-3',
        timestamp: new Date('2024-03-10T19:00:00Z'),
        emotions: [],
        sensoryInputs: [],
      }),
    ];

    const summary = computeDataQualitySummary(entries);
    expect(summary.total).toBe(3);
    expect(summary.completeness).toBe(67);
    expect(summary.buckets).toEqual({ morning: 1, afternoon: 1, evening: 1 });
    expect(summary.avgIntensity).toBeCloseTo(6);
  });

  it('respects provided date ranges', () => {
    const entries: TrackingEntry[] = [
      makeEntry({ timestamp: new Date('2024-03-01T08:00:00Z'), id: 'entry-1' }),
      makeEntry({ timestamp: new Date('2024-04-01T08:00:00Z'), id: 'entry-2' }),
    ];

    const range: DateRange = { start: new Date('2024-04-01T00:00:00Z'), end: new Date('2024-04-30T23:59:59Z') };
    const summary = computeDataQualitySummary(entries, range);
    expect(summary.total).toBe(1);
    expect(summary.last?.toISOString()).toBe(new Date('2024-04-01T08:00:00Z').toISOString());
  });
});
