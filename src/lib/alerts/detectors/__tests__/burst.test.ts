import { describe, it, expect } from 'vitest';
import { detectBurst } from '@/lib/alerts/detectors/burst';
import { isValidDetectorResult } from '@/lib/alerts/types';
import { generateBurstEvents } from './syntheticData';

describe('Burst detector (sliding window clustering)', () => {
  it('detects clustered high-intensity events', () => {
    const events = generateBurstEvents({ n: 60, cluster: true, windowMinutes: 15, seed: 1111, clusterCount: 25, backgroundCount: 20 });
    const res = detectBurst(events, { windowMinutes: 15, minEvents: 3, label: 'Cluster' });
    expect(res).not.toBeNull();
    expect(isValidDetectorResult(res)).toBeTruthy();
    expect(res!.confidence).toBeGreaterThan(0.6);
  });

  it('does not alert for sparse background (no cluster)', () => {
    const events = generateBurstEvents({ n: 40, cluster: false, windowMinutes: 15, seed: 2222, backgroundCount: 40 });
    const res = detectBurst(events, { windowMinutes: 15, minEvents: 5, label: 'No cluster' });
    expect(res).toBeNull();
  });

  it('confidence scales with minEvents and window size', () => {
    const events = generateBurstEvents({ n: 80, cluster: true, windowMinutes: 20, seed: 3333, clusterCount: 35, backgroundCount: 30 });
    const r1 = detectBurst(events, { windowMinutes: 20, minEvents: 3 });
    const r2 = detectBurst(events, { windowMinutes: 20, minEvents: 8 });
    const c1 = r1 ? r1.confidence : 0;
    const c2 = r2 ? r2.confidence : 0;
    expect(c1).toBeGreaterThanOrEqual(c2);
  });
});




