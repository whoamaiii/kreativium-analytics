# Alert Detection Module - Integration Guide

## Overview

This module provides clean separation of concerns for alert result aggregation and finalization,
extracted from the monolithic `AlertDetectionEngine.buildAlert()` method.

## Architecture

### Result Aggregation (`resultAggregator.ts`)

Handles detector result processing and score combination:

- **Validation**: Filter invalid detector results
- **Aggregation**: Combine scores using weighted formula (0.4·impact + 0.25·confidence +
  0.2·recency + 0.15·tier)
- **Source Ranking**: Identify top 3 sources by score·confidence weighting
- **Quality Metrics**: Compute detection quality diagnostics

### Alert Finalization (`alertFinalizer.ts`)

Handles alert event construction and enrichment:

- **ID Generation**: Stable, collision-resistant alert IDs
- **Severity Mapping**: Score → severity tier classification
- **Metadata Enrichment**: Scores, thresholds, experiments, statistics
- **Sparkline Generation**: Compact visualization data
- **Policy Application**: Deduplication key calculation

## Usage in AlertDetectionEngine

### Before (Monolithic)

```typescript
private buildAlert(candidate: AlertCandidate, studentId: string, nowTs: number): AlertEvent {
  // 60+ lines of inline aggregation and finalization logic
  const detectors = candidate.detectors;
  const impact = Math.max(...detectors.map((d) => d.score ?? 0), 0);
  const confidence = Math.max(...detectors.map((d) => d.confidence ?? 0), 0);
  const recency = computeRecencyScore(candidate.lastTimestamp, nowTs);
  const tierScore = Math.max(0, Math.min(1, candidate.tier));
  const aggregateScore = Math.min(
    1,
    (0.4 * impact) + (0.25 * confidence) + (0.2 * recency) + (0.15 * tierScore),
  );

  const severity = severityFromScore(aggregateScore);
  const id = buildAlertId(studentId, candidate.kind, candidate.label, candidate.lastTimestamp);
  const sparkline = generateSparklineData(truncateSeries(candidate.series, this.seriesLimit));

  // ... 40+ more lines of metadata construction and policy application
}
```

### After (Modular)

```typescript
import { aggregateDetectorResults, finalizeAlertEvent } from '@/lib/alerts/detection';

private buildAlert(candidate: AlertCandidate, studentId: string, nowTs: number): AlertEvent {
  // Step 1: Aggregate detector results
  const aggregated = aggregateDetectorResults(
    candidate.detectors,
    candidate.lastTimestamp,
    candidate.tier,
    nowTs,
  );

  // Step 2: Finalize alert event
  return finalizeAlertEvent(
    candidate,
    aggregated,
    studentId,
    {
      seriesLimit: this.seriesLimit,
      policies: this.policies,
    },
  );
}
```

## Integration Steps

### 1. Import Detection Modules

```typescript
// At top of engine.ts
import {
  aggregateDetectorResults,
  finalizeAlertEvent,
  type AggregatedResult,
} from '@/lib/alerts/detection';
```

### 2. Update AlertCandidate Interface

Move the AlertCandidate interface to the detection module or ensure it matches:

```typescript
// Already defined in alertFinalizer.ts
interface AlertCandidate {
  kind: AlertKind;
  label: string;
  detectors: DetectorResult[];
  detectorTypes: string[];
  series: TrendPoint[];
  lastTimestamp: number;
  tier: number;
  metadata: AlertMetadata;
  thresholdAdjustments?: Record<string, ThresholdAdjustmentTrace>;
  experimentKey?: string;
  experimentVariant?: string;
}
```

### 3. Simplify buildAlert Method

```typescript
private buildAlert(candidate: AlertCandidate, studentId: string, nowTs: number): AlertEvent {
  // Aggregate detector results using weighted formula
  const aggregated = aggregateDetectorResults(
    candidate.detectors,
    candidate.lastTimestamp,
    candidate.tier,
    nowTs,
  );

  // Finalize alert event with metadata enrichment and policies
  return finalizeAlertEvent(
    candidate,
    aggregated,
    studentId,
    {
      seriesLimit: this.seriesLimit,
      policies: this.policies,
    },
  );
}
```

### 4. Remove Inline Computation Methods (Optional)

The following methods can be removed from engine.ts as they're now in the detection modules:

- `computeDetectionQuality()` → `detection.computeDetectionQuality()`
- `computeSeriesStats()` → `detection.computeSeriesStats()`

Keep these if you want to maintain backward compatibility:

```typescript
private computeDetectionQuality(detectors: DetectorResult[], series: TrendPoint[]) {
  return computeDetectionQuality(detectors, series.length);
}

private computeSeriesStats(series: TrendPoint[]) {
  return computeSeriesStats(series);
}
```

## Advanced Usage

### Custom Aggregation Weights

```typescript
import type { AggregationWeights } from '@/lib/alerts/detection';

const customWeights: AggregationWeights = {
  impact: 0.5, // Emphasize impact more
  confidence: 0.3,
  recency: 0.15,
  tier: 0.05,
};

const aggregated = aggregateDetectorResults(
  candidate.detectors,
  candidate.lastTimestamp,
  candidate.tier,
  nowTs,
  customWeights,
);
```

### Batch Processing

```typescript
import { batchFinalizeAlerts } from '@/lib/alerts/detection';

const candidates = [...]; // Multiple candidates
const aggregatedResults = candidates.map(c =>
  aggregateDetectorResults(c.detectors, c.lastTimestamp, c.tier, nowTs)
);

const alerts = batchFinalizeAlerts(
  candidates,
  aggregatedResults,
  studentId,
  { seriesLimit: this.seriesLimit, policies: this.policies },
);
```

### Custom Metadata Enrichment

```typescript
import { enrichWithMetadata, generateSparkline, computeSeriesStats } from '@/lib/alerts/detection';

const sparkline = generateSparkline(candidate.series, 100);
const seriesStats = computeSeriesStats(candidate.series);

const customMetadata = enrichWithMetadata(
  { ...candidate.metadata, customField: 'value' },
  aggregated,
  sparkline,
  candidate,
  seriesStats,
);
```

## Testing

### Unit Tests

```typescript
import { aggregateDetectorResults, filterValidResults } from '@/lib/alerts/detection';

describe('aggregateDetectorResults', () => {
  it('should combine multiple detector scores', () => {
    const results = [
      { score: 0.8, confidence: 0.9, sources: [...] },
      { score: 0.7, confidence: 0.8, sources: [...] },
    ];

    const aggregated = aggregateDetectorResults(
      results,
      Date.now() - 3600000,
      1.0,
      Date.now(),
    );

    expect(aggregated.impact).toBe(0.8); // max score
    expect(aggregated.confidence).toBe(0.9); // max confidence
    expect(aggregated.aggregateScore).toBeGreaterThan(0);
  });

  it('should filter invalid results', () => {
    const results = [
      { score: 0.8, confidence: 0.9 },
      { score: NaN, confidence: 0.5 }, // Invalid
      { score: -1, confidence: 0.7 },  // Invalid
    ];

    const valid = filterValidResults(results);
    expect(valid).toHaveLength(1);
  });
});
```

### Integration Tests

```typescript
import { finalizeAlertEvent } from '@/lib/alerts/detection';
import { AlertPolicies } from '@/lib/alerts/policies';

describe('finalizeAlertEvent', () => {
  it('should create complete alert with dedupeKey', () => {
    const candidate = {
      /* ... */
    };
    const aggregated = {
      /* ... */
    };
    const policies = new AlertPolicies();

    const alert = finalizeAlertEvent(candidate, aggregated, 'student_123', {
      seriesLimit: 100,
      policies,
    });

    expect(alert.id).toMatch(/^alert_/);
    expect(alert.dedupeKey).toBeDefined();
    expect(alert.severity).toBeDefined();
    expect(alert.metadata?.sparkValues).toBeDefined();
  });
});
```

## Migration Checklist

- [ ] Import detection modules into engine.ts
- [ ] Update buildAlert to use aggregateDetectorResults
- [ ] Update buildAlert to use finalizeAlertEvent
- [ ] Run typecheck: `npm run typecheck`
- [ ] Run tests: `npm test -- alerts`
- [ ] Update AlertCandidate interface if needed
- [ ] Remove duplicate helper methods (optional)
- [ ] Update documentation
- [ ] Review and update integration tests

## Benefits

1. **Separation of Concerns**: Clear boundaries between aggregation and finalization
2. **Testability**: Isolated functions easier to unit test
3. **Reusability**: Aggregation logic can be used independently
4. **Maintainability**: Smaller, focused modules easier to understand and modify
5. **Type Safety**: Strong typing throughout the pipeline
6. **Documentation**: Each function well-documented with examples
