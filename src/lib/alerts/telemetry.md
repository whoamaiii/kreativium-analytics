## Alert Telemetry System

This document describes the alert telemetry architecture used in Kreativium. The system captures alert lifecycle events, teacher interactions, calibration data, A/B experiments, fairness metrics, and supports adaptive threshold learning. It is privacy-preserving and aligned with GDPR principles.

### Components

- **AlertTelemetryService** (`src/lib/alerts/telemetry.ts`)
  - Tracks lifecycle: creation → acknowledgment → resolution
  - Captures teacher feedback: relevance, rating, comments
  - Persists minimized entries with privacy-preserving `studentHash`
  - Computes weekly summary metrics and runs threshold learning
  - Produces calibration samples and experiment summaries

- **WeeklyAlertMetrics** (`src/lib/monitoring/weeklyAlertMetrics.ts`)
  - Runs weekly evaluations and emits reports
  - Adds calibration metrics (Brier score and reliability)
  - Computes fairness metrics for demographic groups
  - Aggregates threshold learning overrides
  - Persists and lists weekly reports; dispatches update events
  - Enhancements: governance audit log, performance metrics, exports, retention, health checks, historical batch

### Privacy & GDPR

- Telemetry stores a hashed `studentHash` instead of raw `studentId`.
- Only the minimum data required for evaluation is persisted.
- Retention can be managed via `WeeklyAlertMetrics.cleanupRetention(...)` to prune old entries/reports.

### Teacher Interaction Tracking

- `logAlertAcknowledged(alertId)` marks an alert as acknowledged by the teacher.
- `logFeedback(alertId, { relevant, rating, comment })` captures judgement and helpfulness.
- `logAlertResolved(alertId, { notes, actionId })` records final disposition.

### Metrics

- **PPV and False Alerts**: Weekly summaries include `ppvEstimate` and `falseAlertsPerStudentDay`.
- **False Positive Rate**: Weekly summaries include `falsePositiveRate` across labelled feedback.
- **Calibration**: `computeCalibrationMetrics(entries)` returns Brier score and reliability curve.
- **Experiments**: A/B outcomes computed per variant; significance uses a two-proportion z-test.
- **Fairness**: Grouped PPV/FPR/helpfulness by demographic slices (e.g., `grade:X`, `class:Y`).
- **Performance**: Alerts/hour, acknowledgment/resolve rates, and latencies per week.

### Adaptive Threshold Learning

- `generateWeeklyReport()` emits labelled samples to `ThresholdLearner`, which may output per-detector threshold overrides.
- Overrides are aggregated in weekly evaluations and available via `report.thresholdLearning.overrides`.

### Integration Guide

1) Detection Engine → Telemetry
```ts
telemetry.logAlertCreated(alert, {
  predictedRelevance: alert.confidence,
  detectorTypes: alert.metadata?.detectorTypes,
  experimentKey: alert.metadata?.experimentKey,
  experimentVariant: alert.metadata?.experimentVariant,
  thresholdAdjustments: alert.metadata?.thresholdTrace,
  metadataSnapshot: alert.metadata,
});
```

2) UI → Telemetry
```ts
telemetry.logAlertAcknowledged(alert.id);
telemetry.logFeedback(alert.id, { relevant: true, rating: 4, comment: 'Accurate' });
telemetry.logAlertResolved(alert.id, { notes: 'Handled with plan', actionId: 'plan-42' });
telemetry.logAlertSnoozed(alert.id, { until: new Date(Date.now()+24*3600_000).toISOString(), reason: 'Busy period' });
```

3) Weekly Evaluation
```ts
const metrics = new WeeklyAlertMetrics({ telemetry });
const report = metrics.runWeeklyEvaluation({ weekContaining: new Date(), students });
```

### Governance Audit Trail

Use `WeeklyAlertMetrics.logGovernanceDecision` to capture policy decisions (e.g., quiet hours, caps, throttling, deduplication).
```ts
metrics.logGovernanceDecision({ policy: 'quiet_hours', decision: 'suppressed', alertId: 'a1' });
```

### Exports & Retention

- `exportReports('csv' | 'json', range?)` and `exportEntries('csv' | 'json', { start, end }?)` for external analysis.
- `cleanupRetention({ maxEntryAgeDays, maxReports })` for data minimization.

### Health Monitoring

- `getHealthStatus()` returns overall status, last report time, and totals.

### Troubleshooting

- No weekly reports visible: ensure the evaluation ran and storage is not blocked.
- Empty calibration metrics: collect more labelled feedback.
- Experiments not summarized: ensure `experimentKey` and variant are attached at creation.
- Fairness groups absent: pass `students` with demographic fields to `runWeeklyEvaluation`.

### Performance Guidance
### Store Semantics

Weekly reports are persisted by the monitoring service under `alerts:weeklyReports:*` (indexed by `alerts:weeklyReports:index`). Telemetry does not persist report copies. Consumers must use `WeeklyAlertMetrics.listReports()` for canonical listing or `WeeklyAlertMetrics.getReport(weekStartIso)` for direct access. Retention cleanup is handled by `WeeklyAlertMetrics.cleanupRetention(...)` and applies to the canonical weekly reports only.


- Batch UI interactions when possible; avoid synchronous reads after every write.
- Use weekly batch processing for heavy computations.
- Export large datasets in JSON to retain structure and minimize precision loss.


