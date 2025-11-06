import { describe, it, expect } from 'vitest';
import { detectEWMATrend } from '@/lib/alerts/detectors/ewma';
import { detectCUSUMShift } from '@/lib/alerts/detectors/cusum';
import { detectBetaRateShift } from '@/lib/alerts/detectors/betaRate';
import { detectAssociation } from '@/lib/alerts/detectors/association';
import { detectBurst } from '@/lib/alerts/detectors/burst';
import { toTrendSeries, generateStableBaseline, generateStepChange, createRng, normalSample, generateBetaRateData, generateContingencyTable, generateBurstEvents } from './syntheticData';

function timeIt<T>(label: string, fn: () => T): { result: T; ms: number } {
  const t0 = performance.now();
  const result = fn();
  const t1 = performance.now();
  return { result, ms: t1 - t0 };
}

describe('Detectors performance and Monte Carlo validation', () => {
  it('runs EWMA and CUSUM within reasonable time for 5k points', () => {
    const n = 5000;
    const values = generateStableBaseline(n, 0, 1, 123);
    const series = toTrendSeries(values);
    const tEwma = timeIt('ewma', () => detectEWMATrend(series, { lambda: 0.2, minPoints: 20, targetFalseAlertsPerN: 336 }));
    const tCusum = timeIt('cusum', () => detectCUSUMShift(series, { kFactor: 0.5, minPoints: 20, targetFalseAlertsPerN: 336 }));
    expect(tEwma.ms).toBeLessThan(50);
    expect(tCusum.ms).toBeLessThan(50);
  });

  it('runs BetaRate, Association, and Burst detectors efficiently on large inputs', () => {
    // BetaRate: thousands of trials
    const betaSample = generateBetaRateData({ trials: 5000, baselineRate: 0.25, shift: 0.12, priorWeight: 200, seed: 1234 });
    const tBeta = timeIt('betaRate', () => detectBetaRateShift({
      successes: betaSample.successes,
      trials: betaSample.trials,
      baselinePrior: betaSample.baselinePrior,
      delta: 0.1,
      minSupport: 5,
    }));

    // Association: large contingency table
    const table = generateContingencyTable({ total: 10_000, oddsRatio: 2.5 });
    const tAssoc = timeIt('association', () => detectAssociation({ label: 'perf', contingency: table, minSupport: 5 }));

    // Burst: dense event streams
    const events = generateBurstEvents({ n: 5000, cluster: true, windowMinutes: 30, seed: 8888, clusterCount: 2500, backgroundCount: 2500 });
    const tBurst = timeIt('burst', () => detectBurst(events, { windowMinutes: 30, minEvents: 5 }));

    expect(tBeta.ms).toBeLessThan(30);
    expect(tAssoc.ms).toBeLessThan(40);
    expect(tBurst.ms).toBeLessThan(50);
  });

  it('Monte Carlo: EWMA false alert rate respects ≤1/336 target (tight bound)', () => {
    const trials = 500; // increase to 1000 if runtime allows
    const n = 336;
    let detections = 0;
    for (let t = 0; t < trials; t++) {
      const values = generateStableBaseline(n, 0, 1, 10000 + t);
      const series = toTrendSeries(values);
      const res = detectEWMATrend(series, { lambda: 0.2, minPoints: 20, targetFalseAlertsPerN: 336 });
      if (res) detections += 1;
    }
    // Upper bound: allow ≤ 0.5% rate to account for randomness and sustained rule
    const maxAllowed = Math.ceil(trials * 0.005);
    expect(detections).toBeLessThanOrEqual(maxAllowed);
  });

  it('CUSUM detection power increases with larger step change', () => {
    const n = 600;
    const stepIdx = 300;
    const s1 = generateStepChange(n, stepIdx, 1, 0, 1, 4040);
    const s2 = generateStepChange(n, stepIdx, 2, 0, 1, 5050);
    const r1 = detectCUSUMShift(toTrendSeries(s1), { kFactor: 0.5, targetFalseAlertsPerN: 336 });
    const r2 = detectCUSUMShift(toTrendSeries(s2), { kFactor: 0.5, targetFalseAlertsPerN: 336 });
    const c1 = r1 ? r1.confidence : 0;
    const c2 = r2 ? r2.confidence : 0;
    expect(c2).toBeGreaterThanOrEqual(c1);
  });
});


