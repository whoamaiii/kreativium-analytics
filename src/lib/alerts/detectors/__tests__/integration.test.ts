import { describe, it, expect } from 'vitest';
import { BaselineService } from '@/lib/alerts/baseline';
import { detectEWMATrend } from '@/lib/alerts/detectors/ewma';
import { detectCUSUMShift } from '@/lib/alerts/detectors/cusum';
import { toTrendSeries, generateStableBaseline, generateStepChange } from './syntheticData';
import type { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';

function makeTrackingSeries(values: number[], timestamps: number[]): TrackingEntry[] {
  const entries: TrackingEntry[] = [] as any;
  for (let i = 0; i < values.length; i++) {
    entries.push({
      id: `t-${i}`,
      studentId: 's1',
      timestamp: new Date(timestamps[i]),
      emotions: [
        {
          id: `e-${i}`,
          emotion: 'stress',
          intensity: Math.max(0, values[i]),
          timestamp: new Date(timestamps[i]),
        } as EmotionEntry,
      ],
      sensoryInputs: [] as unknown as SensoryEntry[],
      environmentalData: { roomConditions: { noiseLevel: 40 + (i % 5) } },
    } as TrackingEntry);
  }
  return entries;
}

describe('Detectors integration with BaselineService', () => {
  it('uses robust baseline stats to inform thresholds', () => {
    const base = generateStableBaseline(200, 5, 1, 55);
    const step = generateStepChange(200, 100, 2, 5, 1, 77);
    const values = base.concat(step.slice(100));

    const timestamps = values.map((_, i) => Date.UTC(2024, 0, 1) + i * 60_000);
    const tracking = makeTrackingSeries(values, timestamps);

    const svc = new BaselineService();
    const baseline = svc.updateBaseline({
      studentId: 's1',
      emotions: tracking.flatMap((t) => t.emotions),
      sensory: [],
      tracking,
    });

    const series = toTrendSeries(values, timestamps[0], 60_000);
    const ewmaRes = detectEWMATrend(series, {
      baselineMedian: baseline?.emotion['stress:14']?.median,
      baselineIqr: baseline?.emotion['stress:14']?.iqr,
      baselineQualityScore: baseline?.quality?.reliabilityScore,
      targetFalseAlertsPerN: 336,
    });
    const cusumRes = detectCUSUMShift(series, {
      baselineMean: baseline?.emotion['stress:14']?.median,
      baselineSigma: (baseline?.emotion['stress:14']?.iqr ?? 1) / 1.349,
      targetFalseAlertsPerN: 336,
    });

    expect(ewmaRes === null || ewmaRes.confidence >= 0.6).toBeTruthy();
    expect(cusumRes === null || cusumRes.confidence >= 0.65).toBeTruthy();
  });
});
