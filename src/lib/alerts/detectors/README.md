# Detectors: EWMA, CUSUM, Beta Rate, Association, and Burst

This module provides statistically robust detectors for trend and shift detection in educational data streams. It includes EWMA (Exponentially Weighted Moving Average) for gradual trends, CUSUM (Cumulative Sum) for small persistent shifts, a beta-binomial rate detector for event rate increases, an association detector using Fisher's exact test with log-odds, and a burst detector for clustered event episodes.

## Algorithms

- EWMA: Uses robust baseline (median/IQR via MAD) and control limits ±z·σ_EWMA, where σ_EWMA = σ0·sqrt(λ/(2-λ)). Defaults λ=0.2. Sustained criterion defaults to 3 of last 5 points beyond limits.
- CUSUM (one-sided): Reference value k = kFactor·σ (default 0.5σ), decision interval h = H·σ with H ~ 5 by default and mild adaptation via tuning utilities.
- Beta Rate: Bayesian beta-binomial posterior using prior `Beta(α0,β0)` (Jeffreys 0.5,0.5 fallback). Alerts when P(rate > baseline + Δ) ≥ 0.9. Includes credible interval via normal approximation to Beta(a,b).
- Association: Fisher’s exact test (two-tailed) on 2x2 contingency with log-odds and 95% CI; optional Pearson correlation for paired time series. Confidence is driven by `1 - pValueExact` combined with correlation/CI evidence.
- Burst: Sliding window scan for densest cluster with `minEvents` within `windowMinutes`, computing duration, intensity, density, and optional cross-correlation from paired values. Confidence scales with density, event count above threshold, and correlation strength.

## False Alert Rate Target

- Target: ≤ 1 false alert per 14 student-days. With 24 samples/day, this approximates ≤ 1 per 336 points.
- EWMA control multiplier z is set to Φ⁻¹(1 − 1/(2N)) with N=336 by default, then optionally adjusted by baseline quality.
- CUSUM decision interval multiplier H is derived heuristically to match stability near the target while allowing k-factor flexibility.
- Beta Rate respects minimum support (trials ≥ 5) and uses Δ to control sensitivity; posterior probability threshold 0.9 maintains stability.
- Association enforces support ≥ 5 and uses exact p-values; CI must exclude 0 on log-odds to proceed.
- Burst enforces `minEvents` and favors sustained density over isolated spikes.

## Adaptive Thresholds

Integrate baseline quality to adapt sensitivity:
- Lower quality (<0.6) → increase thresholds up to ~25% to reduce false alerts.
- High quality (>0.9) → small relaxation (≤5%).

## Usage

```ts
import { detectEWMATrend } from '@/lib/alerts/detectors/ewma';
import { detectCUSUMShift } from '@/lib/alerts/detectors/cusum';
import { detectBetaRateShift } from '@/lib/alerts/detectors/betaRate';
import { detectAssociation } from '@/lib/alerts/detectors/association';
import { detectBurst } from '@/lib/alerts/detectors/burst';

const ewma = detectEWMATrend(series, {
  lambda: 0.2,
  baselineMedian,
  baselineIqr,
  targetFalseAlertsPerN: 336,
  baselineQualityScore: baseline?.quality?.reliabilityScore,
});

const cusum = detectCUSUMShift(series, {
  baselineMean,
  baselineSigma,
  kFactor: 0.5,
  targetFalseAlertsPerN: 336,
});

const betaRate = detectBetaRateShift({
  successes,
  trials,
  baselinePrior: { alpha: 0.5, beta: 0.5 },
  delta: 0.1,
  minSupport: 5,
});

const assoc = detectAssociation({
  label: 'Factor X ↔ Outcome Y',
  contingency: { a, b, c, d },
  seriesX,
  seriesY,
  minSupport: 5,
});

const burst = detectBurst(events, { windowMinutes: 15, minEvents: 3 });
```

All detectors return a `DetectorResult` with `score`, `confidence`, `impactHint`, and `sources`. EWMA includes a CI for the EWMA mean; Beta Rate includes a 95% credible interval; Association includes exact p-value and log-odds CI; Burst includes episode details and cross-correlation if available.

## Testing & Validation

- Synthetic generators in `__tests__/syntheticData.ts` produce baseline, step changes, trends, seasonal patterns, rate data, contingency tables, correlated series, and burst events.
- Unit tests cover EWMA, CUSUM, Beta Rate, Association (Fisher exact + CI), and Burst detectors.
- Validation suite includes Monte Carlo Type I error checks, calibration of beta-binomial posterior, and burst false positive sanity on Poisson-like backgrounds.
- Performance tests benchmark all detectors on large inputs.

## Parameter Guidance

- λ (EWMA): 0.1–0.3 for educational trends; higher λ reacts faster but increases false positives.
- kFactor (CUSUM): 0.4–0.6 balances sensitivity and robustness for small shifts.
- Beta Rate: Δ in 0.05–0.15 typical; `minSupport ≥ 5`. Use Jeffreys prior if baseline unknown.
- Association: prefer exact Fisher p-values; require `minSupport ≥ 5`. Correlate paired time series when available.
- Burst: `windowMinutes` 10–30, `minEvents` 3–8; include paired values to boost confidence when correlated.

## Notes

- Robust baselines (median/MAD→IQR) are used to mitigate outliers.
- Performance scales linearly with series length; 5k points evaluate in <50 ms on modern hardware.

References: Montgomery, Statistical Quality Control; Basseville & Nikiforov, Detection of Abrupt Changes.
