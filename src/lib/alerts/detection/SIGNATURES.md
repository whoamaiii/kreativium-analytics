# Alert Detection Module - Function Signatures

## Result Aggregator (`resultAggregator.ts`)

### Core Functions

```typescript
/**
 * Aggregate multiple detector results into a single composite result.
 * Uses weighted formula: 0.4·impact + 0.25·confidence + 0.2·recency + 0.15·tier
 */
function aggregateDetectorResults(
  detectorResults: DetectorResult[],
  lastTimestamp: number,
  tier: number,
  nowTs: number,
  weights?: AggregationWeights
): AggregatedResult

/**
 * Filter detector results to only valid ones using type guards.
 */
function filterValidResults(
  detectorResults: DetectorResult[]
): DetectorResult[]

/**
 * Combine detector scores using maximum aggregation.
 */
function combineDetectorScores(
  detectorResults: DetectorResult[]
): { impact: number; confidence: number }

/**
 * Calculate aggregate confidence with tier adjustment.
 * Formula: min(1, baseConfidence × (1 + tierBoost))
 * where tierBoost = (tier - 0.5) × 0.3
 */
function calculateAggregateConfidence(
  baseConfidence: number,
  tier: number
): number

/**
 * Compute detection quality metrics for diagnostics.
 */
function computeDetectionQuality(
  detectorResults: DetectorResult[],
  seriesLength: number
): {
  validDetectors: number;
  avgConfidence: number;
  seriesLength: number;
}
```

### Types

```typescript
interface AggregatedResult {
  impact: number;              // Max detector score (0-1)
  confidence: number;          // Max detector confidence (0-1)
  recency: number;             // Time-decay score (0-1)
  tierScore: number;           // Detection quality tier (0-1)
  aggregateScore: number;      // Weighted final score (0-1)
  rankedSources: AlertSource[]; // Top 3 sources
  scoreBreakdown: {
    impact: number;
    confidence: number;
    recency: number;
    tier: number;
  };
}

interface AggregationWeights {
  impact: number;     // Default: 0.4
  confidence: number; // Default: 0.25
  recency: number;    // Default: 0.2
  tier: number;       // Default: 0.15
}
```

## Alert Finalizer (`alertFinalizer.ts`)

### Core Functions

```typescript
/**
 * Finalize alert event from candidate and aggregated results.
 * Constructs complete AlertEvent with metadata, governance, and visualization.
 */
function finalizeAlertEvent(
  candidate: AlertCandidate,
  aggregated: AggregatedResult,
  studentId: string,
  config: FinalizationConfig
): AlertEvent

/**
 * Batch finalize multiple alert candidates with deduplication.
 */
function batchFinalizeAlerts(
  candidates: AlertCandidate[],
  aggregatedResults: AggregatedResult[],
  studentId: string,
  config: FinalizationConfig
): AlertEvent[]

/**
 * Apply governance policies (deduplication key calculation).
 */
function applyPolicies(
  alert: Omit<AlertEvent, 'dedupeKey'>,
  policies: AlertPolicies
): AlertEvent

/**
 * Enrich metadata with scores, thresholds, experiments, and diagnostics.
 */
function enrichWithMetadata(
  baseMetadata: AlertMetadata,
  aggregated: AggregatedResult,
  sparkline: { values: number[]; timestamps: number[] },
  candidate: AlertCandidate,
  seriesStats: SeriesStats
): AlertMetadata

/**
 * Generate sparkline visualization data from time series.
 */
function generateSparkline(
  series: TrendPoint[],
  limit: number
): { values: number[]; timestamps: number[] }

/**
 * Compute lightweight series statistics for diagnostics.
 */
function computeSeriesStats(
  series: TrendPoint[]
): SeriesStats
```

### Types

```typescript
interface AlertCandidate {
  kind: AlertKind;
  label: string;
  lastTimestamp: number;
  tier: number;
  metadata: AlertMetadata;
  series: TrendPoint[];
  thresholdAdjustments?: Record<string, ThresholdAdjustmentTrace>;
  experimentKey?: string;
  experimentVariant?: string;
  detectorTypes?: string[];
}

interface FinalizationConfig {
  seriesLimit: number;      // Max sparkline points
  policies: AlertPolicies;  // For dedupeKey calculation
}

interface SeriesStats {
  min: number;
  max: number;
  mean: number;
  variance: number; // Sample variance
}
```

## Aggregation Algorithm Details

### Weighted Scoring Formula

```
aggregateScore = min(1, Σ(weight_i × component_i))

where:
  - impact (weight: 0.4)     = max(detector.score)
  - confidence (weight: 0.25) = max(detector.confidence)
  - recency (weight: 0.2)    = exp(-Δhours / 24)
  - tier (weight: 0.15)      = clamped tier value

Example calculation:
  impact = 0.85
  confidence = 0.90
  recency = 0.60 (6 hours ago)
  tier = 1.0 (multiple detectors)

  aggregateScore = 0.4×0.85 + 0.25×0.90 + 0.2×0.60 + 0.15×1.0
                 = 0.34 + 0.225 + 0.12 + 0.15
                 = 0.835 → Severity: Critical
```

### Recency Decay Characteristics

```
Time        Recency Score
------      -------------
0 hours     ~1.00
6 hours     ~0.78
12 hours    ~0.61
24 hours    ~0.37
48 hours    ~0.14
72+ hours   ~0.05 → 0
```

### Severity Mapping

```
Score Range    Severity
-----------    --------
≥ 0.85         Critical
≥ 0.70         Important
≥ 0.55         Moderate
< 0.55         Low
```

## Policy Integration Points

### Deduplication Key

Generated from:
- Student ID
- Alert kind
- Context key (emotion/sensory type or class period)
- UTC hour bucket

Format: `hash(studentId|kind|context|hourKey)` → base36 hash

### Threshold Adjustments

Traces include:
- `adjustment`: Relative change from baseline (-1 to 1+)
- `appliedThreshold`: Final threshold after learning and experiments
- `baselineThreshold`: Original detector default

### Experiment Tracking

Metadata includes:
- `experimentKey`: e.g., "alerts.thresholds.behavior"
- `experimentVariant`: e.g., "control", "variant_a", "variant_b"
- Used for A/B testing threshold configurations

## Metadata Structure

Complete enriched metadata includes:

```typescript
{
  // Identification
  label: string;
  contextKey: string;

  // Scores
  score: number;           // Aggregate score
  impact: number;          // Max detector score
  recency: number;         // Time decay score
  tier: number;            // Detection quality
  confidence: number;      // Max detector confidence

  // Visualization
  sparkValues: number[];
  sparkTimestamps: number[];

  // Provenance
  sourceRanks: string[];   // ['S1', 'S2', 'S3']
  detectorTypes: string[]; // ['ewma', 'cusum', 'beta']

  // Experimentation
  experimentKey?: string;
  experimentVariant?: string;
  thresholdOverrides?: Record<string, number>;
  thresholdTrace?: Record<string, ThresholdAdjustmentTrace>;

  // Diagnostics
  detectionScoreBreakdown: {
    impact: number;
    confidence: number;
    recency: number;
    tier: number;
  };
  seriesStats: {
    min: number;
    max: number;
    mean: number;
    variance: number;
  };

  // Domain-specific (varies by alert kind)
  emotionKey?: string;
  sensoryKey?: string;
  interventionId?: string;
  tauU?: TauUResult;
  // ... etc
}
```

## Usage Examples

### Basic Usage

```typescript
import {
  aggregateDetectorResults,
  finalizeAlertEvent,
  type AggregatedResult,
  type AlertCandidate,
} from '@/lib/alerts/detection';

// 1. Aggregate detector results
const aggregated: AggregatedResult = aggregateDetectorResults(
  candidate.detectors,      // DetectorResult[]
  candidate.lastTimestamp,  // number (ms)
  candidate.tier,           // number (0-1)
  Date.now(),              // number (ms)
);

// 2. Finalize alert event
const alert: AlertEvent = finalizeAlertEvent(
  candidate,               // AlertCandidate
  aggregated,             // AggregatedResult
  'student_123',          // string
  {
    seriesLimit: 100,
    policies: new AlertPolicies(),
  },
);
```

### Custom Weights

```typescript
import type { AggregationWeights } from '@/lib/alerts/detection';

const weights: AggregationWeights = {
  impact: 0.5,      // Emphasize impact
  confidence: 0.3,
  recency: 0.15,
  tier: 0.05,
};

const aggregated = aggregateDetectorResults(
  detectors,
  timestamp,
  tier,
  now,
  weights, // Custom weights
);
```

### Batch Processing

```typescript
import { batchFinalizeAlerts } from '@/lib/alerts/detection';

const alerts = batchFinalizeAlerts(
  [candidate1, candidate2, candidate3],
  [aggregated1, aggregated2, aggregated3],
  'student_123',
  config,
);
```
