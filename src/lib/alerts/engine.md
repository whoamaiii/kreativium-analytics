### Alert Detection Engine

The Alert Detection Engine orchestrates multiple statistical detectors (EWMA, CUSUM, beta-binomial
rate, association, burst, and Tau-U) to produce ranked, policy-governed alert events. It integrates
with baselines, experimentation, threshold learning, and governance policies.

### Pipeline Overview

- Build series/datasets from inputs (emotions, sensory, tracking)
- Apply detectors with threshold scaling (baseline defaults → learner overrides → A/B variant)
- Score and rank sources (S1–S3) and construct alert metadata including sparklines
- Apply governance deduplication and return final `AlertEvent[]`

### Scoring Methodology

Aggregate score in [0,1]:

0.4 · impact + 0.25 · confidence + 0.2 · recency + 0.15 · tier

Severity is mapped from aggregate score using calibrated cutpoints (≥0.85 Critical, ≥0.7 Important,
≥0.55 Moderate, else Low).

### Source Attribution (S1–S3)

Detector sources are ranked by (score × confidence). The top three are labeled S1–S3 and embedded in
metadata.

### Integrations

- Baselines via `BaselineService` (emotion/sensory/environment), robust fallbacks (14/7/30 days)
- A/B testing via experimentation service, per-kind variants and audit trail
- Adaptive `ThresholdLearner` providing overrides and adjustment tracing
- `AlertPolicies` for deduplication, caps, quiet hours, snooze, and throttling

### Threshold Learning and Adaptation

Thresholds are derived from defaults, adjusted by the learner, and scaled by the assigned A/B
variant. Adjustment traces are emitted in metadata to support governance and diagnostics.

### Metadata and Sparklines

Alerts include sparkline values/timestamps (truncated to `seriesLimit`), score breakdown, threshold
traces, and ranked sources. Lightweight series stats are included for diagnostics.

### Usage Examples

See `src/lib/alerts/engineExamples.ts` for cohort processing, worker integration, and adaptation
patterns.

### Troubleshooting & Performance

- Ensure sufficient data volume for baselines and association support (≥5)
- Use `seriesLimit` to bound memory and rendering costs; 90–120 recommended
- Validate timestamps and intensities; invalid inputs are ignored safely
- Large datasets: prefer pre-aggregated series and run engine once per student per batch

### References

- Detectors: `src/lib/alerts/detectors/README.md`
- Baselines: `src/lib/alerts/baseline.md` (where applicable) and `src/lib/alerts/baseline.ts`

## Alert Detection Engine

The engine orchestrates multiple statistical detectors to generate actionable, governed alerts from
educational data streams. It integrates baselines, adaptive thresholds, experimentation, and policy
governance.

### Pipeline Overview

- Build series/datasets from `emotions`, `sensory`, and `tracking` entries
- Run detectors: EWMA, CUSUM, Beta-Rate, Association, Burst, Tau-U
- Apply thresholds with A/B variant scaling and learning overrides
- Score candidate alerts and rank sources (S1–S3)
- Construct `AlertEvent` records with metadata and sparklines
- Deduplicate and return governed alerts

### Scoring

Aggregate score combines detection impact, confidence, recency, and tier:

`score = 0.4·impact + 0.25·confidence + 0.2·recency + 0.15·tier`

Severity mapping: Critical ≥ 0.85, Important ≥ 0.7, Moderate ≥ 0.55, else Low.

### Source Attribution

Sources attached by detectors are ranked S1–S3 using weighted `score×confidence`. Top three are
included with `rank` in `details`.

### Integrations

- Baselines via `BaselineService` with robust statistics and quality metrics. See
  `src/lib/alerts/baseline.md`.
- Governance via `AlertPolicies`: deduplication, quiet hours, caps, throttling.
- A/B Testing via `ABTestingService`: threshold scaling per experiment variant.
- Threshold Learning via `ThresholdLearner`: per-detector overrides and adjustment traces.

### Detectors

See `src/lib/alerts/detectors/README.md` for algorithms and parameters.

Detectors return `DetectorResult { score, confidence, impactHint, sources }` and optional `analysis`
fields. The engine validates detector results and applies experiment-aware thresholds.

### Metadata & Sparklines

Each alert includes:

- `sparkValues`/`sparkTimestamps` from truncated series
- `thresholdTrace` and `thresholdOverrides`
- `detectorTypes` used
- Optional domain-specific fields (e.g., Tau-U summaries)
- `detectionScoreBreakdown` and `detectionQuality` diagnostics

### Usage

```ts
import AlertDetectionEngine from '@/lib/alerts/engine';

const engine = new AlertDetectionEngine();
const alerts = engine.runDetection({ studentId, emotions, sensory, tracking });
```

See examples in `src/lib/alerts/engineExamples.ts` for cohort processing, analytics worker
integration, A/B testing, and custom learners.

### Performance

- Series capped with `seriesLimit` (default 90). Configure via constructor.
- Safe detector wrappers prevent pipeline failures; errors are logged.
- Detectors benchmark under 50 ms for 5k points (see performance tests).

### Troubleshooting

- No alerts: check baseline sufficiency and timestamp validity; ensure detectors have minimum
  support.
- Excess alerts: adjust thresholds via learning overrides or experiment variants; review baseline
  quality.
- Missing sources: verify detectors attach `sources` with `type` and optional details.

### Educational Scenarios

- Behavior Spike: EWMA/CUSUM on emotion intensities, Beta-Rate on sensory rates, Burst on clustered
  high-intensity events.
- Context Association: Fisher exact test for environment↔emotion (e.g., noise level).
- Intervention Review: Tau-U outcome analysis for intervention goal linkage.

### References

- Detectors guide: `src/lib/alerts/detectors/README.md`
- Baselines: `src/lib/alerts/baseline.md`
