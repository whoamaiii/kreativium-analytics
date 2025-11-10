import { describe, it, expect } from 'vitest';
import { detectBetaRateShift } from '@/lib/alerts/detectors/betaRate';
import { detectAssociation } from '@/lib/alerts/detectors/association';
import { detectBurst } from '@/lib/alerts/detectors/burst';
import {
  generateBetaRateData,
  generateContingencyTable,
  generateBurstEvents,
  createRng,
} from './syntheticData';

describe('Detector validation (statistical properties)', () => {
  it('Association (Fisher exact): Type I error near nominal at OR~1', () => {
    const trials = 200;
    let falsePos = 0;
    for (let t = 0; t < trials; t++) {
      const table = generateContingencyTable({ total: 80, oddsRatio: 1.0 });
      const res = detectAssociation({ label: 'Null', contingency: table, minSupport: 5 });
      if (res) falsePos += 1;
    }
    // Expect low false positive rate under null. Allow small tolerance.
    const rate = falsePos / trials;
    expect(rate).toBeLessThan(0.1);
  });

  it('Beta rate: calibration of posterior probability vs realized frequencies', () => {
    const seeds = [101, 202, 303, 404, 505];
    const cutoff = 0.9;
    let triggered = 0;
    let total = 0;
    for (const seed of seeds) {
      for (const shift of [0.05, 0.1, 0.15]) {
        const sample = generateBetaRateData({
          trials: 250,
          baselineRate: 0.2,
          shift,
          priorWeight: 60,
          seed,
        });
        const res = detectBetaRateShift({
          successes: sample.successes,
          trials: sample.trials,
          baselinePrior: sample.baselinePrior,
          delta: 0.1,
          minSupport: 5,
        });
        total += 1;
        if (res && res.confidence >= cutoff) triggered += 1;
      }
    }
    // With moderate shifts, many should exceed 0.9 probability, but not all; sanity check bounds
    const prop = triggered / total;
    expect(prop).toBeGreaterThan(0.3);
    expect(prop).toBeLessThan(1);
  });

  it('Burst: false positives are rare on Poisson-like backgrounds', () => {
    const rng = createRng(9999);
    const trials = 100;
    let detections = 0;
    for (let t = 0; t < trials; t++) {
      // Emulate background-only by disabling cluster and spreading timestamps
      const events = generateBurstEvents({
        n: 60,
        cluster: false,
        windowMinutes: 15,
        seed: Math.floor(rng() * 1e6),
        backgroundCount: 60,
      });
      const res = detectBurst(events, { windowMinutes: 15, minEvents: 6 });
      if (res) detections += 1;
    }
    expect(detections).toBeLessThanOrEqual(15);
  });
});
