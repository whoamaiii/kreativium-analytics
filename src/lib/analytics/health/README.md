# Health Score Calculator Module

## Overview

The Health Score Calculator is a pure, testable function extracted from the Analytics Manager that
calculates an "analytics health score" (0-100) based on the completeness, quality, and confidence of
analytics results.

## Module Structure

```
src/lib/analytics/health/
├── healthScoreCalculator.ts       (333 lines) - Core calculation logic
├── healthScoreCalculator.test.ts  (354 lines) - Comprehensive test suite
├── index.ts                       (10 lines)  - Module exports
└── README.md                                  - This documentation
```

## Function Signature

```typescript
export function calculateHealthScore(
  results: AnalyticsResultsCompat,
  config?: AnalyticsConfiguration,
): number;
```

### Parameters

- **results** (`AnalyticsResultsCompat`): Analytics results containing:
  - `patterns`: Array of detected patterns
  - `correlations`: Array of correlation analyses
  - `predictiveInsights`: Array of predictions
  - `anomalies`: Array of detected anomalies
  - `ai`: Optional AI metadata (provider, confidence, lineage, caveats)
  - `hasMinimumData`: Optional flag for data sufficiency
  - `confidence`: Optional overall confidence score (0-1)

- **config** (`AnalyticsConfiguration`, optional): Analytics configuration with custom weights
  - If omitted, uses `ANALYTICS_CONFIG.healthScore` defaults

### Returns

- `number`: Health score from 0 to 100

## Algorithm

### Base Components (100 points total)

The score starts with five weighted components:

| Component        | Default Weight | Awarded When                                             |
| ---------------- | -------------- | -------------------------------------------------------- |
| **Patterns**     | 20             | `results.patterns.length > 0`                            |
| **Correlations** | 20             | `results.correlations.length > 0`                        |
| **Predictions**  | 20             | `results.predictiveInsights.length > 0`                  |
| **Anomalies**    | 20             | `results.anomalies.length > 0`                           |
| **Minimum Data** | 20             | `hasMinimumData === true` or patterns/correlations exist |

### Confidence Scaling

```typescript
baseScore = sum(awarded components)
scaledScore = round(baseScore * confidence)
```

**Confidence Priority:**

1. AI confidence: `results.ai.confidence.overall` (preferred)
2. Heuristic confidence: `results.confidence`
3. Default: `1.0` (full confidence)

### AI Quality Bonuses (up to +11 points)

**Provider Bonus:**

- **+5 points**: Successful AI (non-heuristic, no fallback)
- **+2 points**: AI with fallback to heuristic
- **+0 points**: Pure heuristic or no AI

**Data Lineage Bonus:**

- **+3 points**: 3+ lineage entries
- **+2 points**: 2 lineage entries
- **+1 point**: 1 lineage entry
- **+0 points**: No lineage

### Normalization

```typescript
finalScore = max(0, min(100, scaledScore + bonuses));
```

## Dependencies

```typescript
// Type dependencies
import type { AnalyticsResultsCompat } from '@/lib/analytics/types';
import type { AnalyticsConfiguration } from '@/types/analytics';

// Configuration dependency
import { ANALYTICS_CONFIG } from '@/lib/analyticsConfig';
```

### Type Chain

```
AnalyticsResultsCompat
  └─ AnalyticsResults (from @/types/analytics)
      ├─ PatternResult[]
      ├─ CorrelationResult[]
      ├─ PredictiveInsight[]
      ├─ AnomalyDetection[]
      └─ AiMetadata (optional)
```

## Usage Examples

### Basic Usage

```typescript
import { calculateHealthScore } from '@/lib/analytics/health';

// After analytics processing
const results = await runAnalytics(student);
const healthScore = calculateHealthScore(results);

console.log(`Health Score: ${healthScore}/100`);
```

### With Custom Configuration

```typescript
import { calculateHealthScore } from '@/lib/analytics/health';
import { analyticsConfig } from '@/lib/analyticsConfig';

const config = analyticsConfig.getConfig();
const score = calculateHealthScore(results, config);
```

### In Profile Update Flow

```typescript
import { calculateHealthScore } from '@/lib/analytics/health';

const profile: StudentAnalyticsProfile = {
  studentId: student.id,
  analyticsHealthScore: calculateHealthScore(results),
  lastAnalyzedAt: new Date(),
  isInitialized: true,
  analyticsConfig: {
    /* ... */
  },
  minimumDataRequirements: {
    /* ... */
  },
};

saveProfile(profile);
```

### Testing Custom Scenarios

```typescript
import { calculateHealthScore } from '@/lib/analytics/health';

// Test high-quality AI scenario
const mockResults: AnalyticsResultsCompat = {
  patterns: [{ type: 'emotion-sensory', description: '...' }],
  correlations: [{ factor1: 'emotion', factor2: 'sensory', coefficient: 0.85 }],
  predictiveInsights: [{ prediction: '...', confidence: 0.9 }],
  anomalies: [{ type: 'spike', severity: 'high' }],
  insights: [],
  suggestedInterventions: [],
  hasMinimumData: true,
  ai: {
    provider: 'openai/gpt-4',
    confidence: { overall: 0.92 },
    caveats: [],
    dataLineage: ['entry1', 'entry2', 'entry3', 'entry4'],
  },
};

const score = calculateHealthScore(mockResults);
// Expected: 100 (92 scaled + 5 AI + 3 lineage = 100 clamped)
```

## Test Coverage

The included test suite (`healthScoreCalculator.test.ts`) covers:

### Base Component Scoring

- Empty results → 0 score
- Individual components (patterns, correlations, predictions, anomalies)
- Minimum data explicit vs. inferred
- All components combined → 100 score

### Confidence Scaling

- Various confidence factors (0, 0.5, 1.0)
- AI confidence priority over heuristic
- Default confidence when missing
- Edge cases (negative, zero)

### AI Quality Bonuses

- Successful AI (+5)
- AI with fallback (+2)
- Heuristic only (+0)
- Data lineage bonuses (0-3 points)

### Score Normalization

- Maximum clamping to 100
- Minimum clamping to 0
- Overflow scenarios

### Custom Configuration

- Custom weight distribution
- Config override behavior

### Real-World Scenarios

- High-quality AI analysis
- Sparse heuristic data
- AI with fallback

## Migration Notes

This function was extracted from `AnalyticsManagerService.calculateHealthScore()` (lines 393-435 in
`analyticsManager.ts`).

### Why Extract?

1. **Single Responsibility**: Separates scoring logic from analytics orchestration
2. **Testability**: Pure function with no side effects
3. **Reusability**: Can be used independently of AnalyticsManager
4. **Maintainability**: Easier to understand and modify
5. **Type Safety**: Explicit dependencies and return types

### Differences from Original

1. **Public Export**: Function is now publicly accessible
2. **Config Injection**: Config is optional parameter (was internal access)
3. **Documentation**: Comprehensive JSDoc with examples
4. **Tests**: Dedicated test suite for all scenarios

### Next Steps

After extraction, the original `analyticsManager.ts` should be updated to:

```typescript
import { calculateHealthScore } from '@/lib/analytics/health';

// In AnalyticsManagerService
private calculateHealthScore(results: AnalyticsResultsCompat): number {
  const liveCfg = (() => {
    try { return analyticsConfig.getConfig(); }
    catch { return null; }
  })();
  return calculateHealthScore(results, liveCfg ?? undefined);
}
```

Or replace the method entirely and call the function directly.

## Future Enhancements

Potential improvements for future iterations:

1. **Weighted Categories**: Allow custom weight distribution per student
2. **Time Decay**: Factor in data recency for health score
3. **Thresholds**: Configurable thresholds for "healthy" ranges
4. **Breakdowns**: Return detailed component breakdown with score
5. **History Tracking**: Track health score trends over time
6. **Alerts**: Trigger notifications on significant score changes
7. **Visualization**: Health score gauge/chart components

## Performance Considerations

- **Complexity**: O(1) - constant time (no loops, just conditional checks)
- **Memory**: Minimal - no allocations, pure calculation
- **Side Effects**: None - pure function
- **Cacheable**: Results are deterministic for given inputs

## Contributing

When modifying this module:

1. Maintain pure function design (no side effects)
2. Preserve backward compatibility in scoring algorithm
3. Update tests for any algorithm changes
4. Document new components or bonuses in JSDoc
5. Add test cases for edge cases
6. Update this README for significant changes

## See Also

- **Analytics Manager**: `/src/lib/analyticsManager.ts`
- **Analytics Types**: `/src/types/analytics.ts`
- **Analytics Config**: `/src/lib/analyticsConfig.ts`
- **Student Profiles**: `/src/lib/analyticsProfiles.ts`
