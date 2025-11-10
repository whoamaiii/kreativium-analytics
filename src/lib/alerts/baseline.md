### Baseline Service (Enhanced)

This document describes the enhanced Baseline Service used by the alert detection engine.

#### Overview

The Baseline Service maintains per-student rolling baselines for:

- Emotion intensities (robust median with MAD-derived IQR)
- Sensory behavior rates (beta-binomial with Jeffreys prior)
- Environmental factors (robust summaries and correlations)

Windows: 7, 14, and 30-day rolling windows. Baselines are persisted per student in localStorage when
available.

#### Statistical Methods

- Robust center and scale: `median()` and `mad()` from `src/lib/statistics.ts`. IQR is approximated
  via `IQR ≈ 1.349 * sigma`, where `sigma = MAD(normal)`.
- Outlier detection: `zScoresMedian()` produces robust z-scores; observations with |z| > 3.5 are
  flagged and excluded from baseline estimates.
- Confidence intervals: Approximate 95% CI for the median using a MAD-based standard error.
- Trend analysis: `huberRegression()` fits a robust linear trend on daily time scale to assess
  baseline stability.
- Environmental correlation: `pearsonCorrelation()` estimates correlation between each factor and
  maximum emotion intensity over the same window.
- Sensory rates: Beta-binomial using Jeffreys prior (0.5, 0.5). Posterior mean and a normal
  approximation credible interval are provided.

#### Data Quality and Validation

- Minimum data requirements: at least 10 sessions or 7 unique days.
- Quality metrics include reliability score, outlier rate, stability score, and sufficiency details.
- Trend-based stability uses the inverse of normalized slope magnitude (Huber regression with MAD
  scale).

#### API

Type signatures are defined in `src/lib/alerts/types.ts`:

- `StudentBaseline` now includes optional `quality: BaselineQualityMetrics`.
- Emotion/environmental stats include confidence intervals and trend/correlation fields.
- Sensory stats include posterior mean and credible intervals.

Primary entry point:

```ts
class BaselineService {
  getBaseline(studentId: string): StudentBaseline | null;
  updateBaseline({ studentId, emotions, sensory, tracking }): StudentBaseline | null;
  // Convenience wrappers returning the full StudentBaseline
  getEmotionBaseline(studentId: string): StudentBaseline | null;
  getSensoryBaseline(studentId: string): StudentBaseline | null;
  getEnvironmentalBaseline(studentId: string): StudentBaseline | null;
}
```

#### Usage Example

```ts
const baseline = new BaselineService().updateBaseline({ studentId, emotions, sensory, tracking });
if (baseline?.quality?.reliabilityScore && baseline.quality.reliabilityScore < 0.5) {
  // handle low-quality baselines
}
```

#### Storage Schema

Baselines are stored under key `alerts:baseline:<studentId>` as a JSON record matching
`StudentBaseline`.

#### Performance Considerations

- Operations are O(n) per window with simple maps and robust statistics.
- Outlier detection and trend fitting are performed on per-key series only when sufficient data is
  available.

#### Troubleshooting

- If baselines are null, ensure minimum data requirements are met and timestamps are valid.
- For missing correlations, verify environmental readings are present and numeric.
