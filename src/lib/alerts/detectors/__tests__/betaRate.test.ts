import { describe, it, expect } from 'vitest';
import { detectBetaRateShift } from '@/lib/alerts/detectors/betaRate';
import { isValidDetectorResult } from '@/lib/alerts/types';
import { generateBetaRateData, zeroRateCase, perfectRateCase } from './syntheticData';

describe('Beta-binomial rate detector', () => {
  it('does not alert on stable baseline rates (no shift)', () => {
    const sample = generateBetaRateData({
      trials: 200,
      baselineRate: 0.2,
      shift: 0,
      priorWeight: 80,
      seed: 1001,
    });
    const res = detectBetaRateShift({
      successes: sample.successes,
      trials: sample.trials,
      baselinePrior: sample.baselinePrior,
      delta: 0.1,
      minSupport: 5,
      label: 'Stable rate',
    });
    expect(res).toBeNull();
  });

  it('alerts on significant rate increase above baseline + Δ with high probability', () => {
    const sample = generateBetaRateData({
      trials: 300,
      baselineRate: 0.2,
      shift: 0.15,
      priorWeight: 50,
      seed: 2002,
    });
    const res = detectBetaRateShift({
      successes: sample.successes,
      trials: sample.trials,
      baselinePrior: sample.baselinePrior,
      delta: 0.1,
      minSupport: 5,
      label: 'Shifted rate',
    });
    expect(res).not.toBeNull();
    expect(isValidDetectorResult(res)).toBeTruthy();
    expect(res!.confidence).toBeGreaterThanOrEqual(0.9);
    expect(res!.score).toBeGreaterThan(0.3);
  });

  it('enforces minimum support (trials < 5 → no alert)', () => {
    const sample = generateBetaRateData({
      trials: 4,
      baselineRate: 0.2,
      shift: 0.3,
      priorWeight: 10,
      seed: 3003,
    });
    const res = detectBetaRateShift({
      successes: sample.successes,
      trials: sample.trials,
      baselinePrior: sample.baselinePrior,
      delta: sample.delta || 0.1,
      minSupport: 5,
      label: 'Insufficient support',
    });
    expect(res).toBeNull();
  });

  it('handles edge cases: zero successes and perfect rates without crashing', () => {
    const zero = zeroRateCase();
    const rZero = detectBetaRateShift({ ...zero, delta: 0.1, minSupport: 5, label: 'Zero rate' });
    expect(rZero === null || isValidDetectorResult(rZero)).toBeTruthy();

    const perfect = perfectRateCase();
    const rPerf = detectBetaRateShift({
      ...perfect,
      delta: 0.05,
      minSupport: 5,
      label: 'Perfect rate',
    });
    expect(rPerf === null || isValidDetectorResult(rPerf)).toBeTruthy();
  });

  it('respects Jeffreys prior fallback when prior absent or non-positive', () => {
    // Use jeffreys flag to construct such a sample
    const sample = generateBetaRateData({
      trials: 150,
      baselineRate: 0.4,
      shift: 0.2,
      jeffreys: true,
      seed: 4004,
    });
    // Pass an invalid prior to trigger fallback inside detector
    const res = detectBetaRateShift({
      successes: sample.successes,
      trials: sample.trials,
      baselinePrior: { alpha: 0, beta: 0 },
      delta: 0.1,
      minSupport: 5,
      label: 'Jeffreys fallback',
    });
    expect(res === null || isValidDetectorResult(res)).toBeTruthy();
  });

  it('sensitivity varies with delta: larger delta makes detection harder', () => {
    const base = generateBetaRateData({
      trials: 300,
      baselineRate: 0.25,
      shift: 0.12,
      priorWeight: 40,
      seed: 5005,
    });
    const resLoose = detectBetaRateShift({
      successes: base.successes,
      trials: base.trials,
      baselinePrior: base.baselinePrior,
      delta: 0.08,
      minSupport: 5,
    });
    const resTight = detectBetaRateShift({
      successes: base.successes,
      trials: base.trials,
      baselinePrior: base.baselinePrior,
      delta: 0.15,
      minSupport: 5,
    });
    const cLoose = resLoose ? resLoose.confidence : 0;
    const cTight = resTight ? resTight.confidence : 0;
    expect(cLoose).toBeGreaterThanOrEqual(cTight);
  });
});
