# CandidateGenerator Integration Plan

## Executive Summary

**Objective**: Replace AlertDetectionEngine's candidate building methods with CandidateGenerator module

**Impact**: Remove ~452 lines of duplicated code from engine.ts (832 lines → ~380 lines, 54% reduction)

**Risk Level**: LOW - The implementations are nearly identical with only architectural differences

**Complexity**: MEDIUM - Requires understanding dependency injection pattern used by CandidateGenerator

---

## Current State Analysis

### AlertDetectionEngine (engine.ts) - 832 lines

**Candidate Building Methods (274 lines total):**
- `buildEmotionCandidates()` - Lines 215-282 (68 lines)
- `buildSensoryCandidates()` - Lines 284-337 (54 lines)
- `buildAssociationCandidates()` - Lines 339-375 (37 lines)
- `buildBurstCandidates()` - Lines 377-410 (34 lines)
- `detectInterventionOutcomes()` - Lines 412-492 (81 lines)

**Data Building Methods (136 lines total):**
- `buildEmotionSeries()` - Lines 610-628 (19 lines)
- `buildSensoryAggregates()` - Lines 631-657 (27 lines)
- `buildAssociationDataset()` - Lines 660-715 (56 lines)
- `buildBurstEvents()` - Lines 717-750 (34 lines)

**Helper Methods (42 lines total):**
- `computeDetectionQuality()` - Lines 753-761 (9 lines)
- `safeDetect()` - Lines 795-802 (8 lines)
- `lookupEmotionBaseline()` - Lines 804-814 (11 lines)
- `lookupSensoryBaseline()` - Lines 816-829 (14 lines)

**Methods to KEEP (engine-specific):**
- `resolveExperimentKey()` - Lines 494-508
- `createThresholdContext()` - Lines 510-532
- `applyThreshold()` - Lines 534-586
- `buildAlert()` - Lines 588-607
- `computeSeriesStats()` - Lines 767-792 (NOT in CandidateGenerator)

---

## CandidateGenerator API Analysis

### File: `/home/user/kreativium-analytics/src/lib/alerts/detection/candidateGenerator.ts` (676 lines)

### Constructor Signature

```typescript
constructor(opts?: {
  cusumConfig?: CusumConfig;
  seriesLimit?: number;
  tauUDetector?: TauUDetectorFunction;
  baselineThresholds?: Record<string, number>;
})
```

**Configuration Needed:**
- `cusumConfig` - Engine has this at `this.cusumConfig`
- `seriesLimit` - Engine has this at `this.seriesLimit`
- `tauUDetector` - Engine has this at `this.tauUDetector`
- `baselineThresholds` - Engine has this at `this.baselineThresholds`

### Public Methods - Candidate Building

All methods use **dependency injection pattern** - they require `applyThreshold` and `createThresholdContext` to be passed as parameters:

```typescript
buildEmotionCandidates(args: {
  emotionSeries: Map<string, TrendPoint[]>;
  baseline?: StudentBaseline | null;
  studentId: string;
  thresholdOverrides: Record<string, ThresholdOverride>;
  nowTs: number;
  applyThreshold: (detectorType, result, context) => DetectorResult | null;
  createThresholdContext: (kind, studentId, overrides) => ApplyThresholdContext;
}): AlertCandidate[]
```

**Same pattern for:**
- `buildSensoryCandidates(args)` - Lines 193-256
- `buildAssociationCandidates(args)` - Lines 262-308
- `buildBurstCandidates(args)` - Lines 314-357
- `detectInterventionOutcomes(args)` - Lines 364-457

### Public Methods - Data Building

Simple pass-through with NO dependencies on engine state:

```typescript
buildEmotionSeries(emotions: EmotionEntry[]): Map<string, TrendPoint[]>
buildSensoryAggregates(sensory: SensoryEntry[]): Map<...>
buildAssociationDataset(tracking: TrackingEntry[]): AssociationDataset | null
buildBurstEvents(emotions: EmotionEntry[], sensory: SensoryEntry[]): BurstEvent[]
```

### Private Helper Methods

Identical to engine:
- `computeDetectionQuality()` - Lines 619-627
- `safeDetect()` - Lines 633-640
- `lookupEmotionBaseline()` - Lines 646-656
- `lookupSensoryBaseline()` - Lines 662-675

---

## Key Architectural Differences

### Dependency Injection Pattern

**Engine Approach (Current):**
```typescript
// Engine has applyThreshold and createThresholdContext as instance methods
private buildEmotionCandidates(args) {
  const context = this.createThresholdContext(...);  // Direct call
  const ewma = this.applyThreshold(..., context);    // Direct call
}
```

**CandidateGenerator Approach:**
```typescript
// Generator receives these as function parameters
buildEmotionCandidates(args: {
  applyThreshold: (detectorType, result, context) => DetectorResult | null;
  createThresholdContext: (kind, studentId, overrides) => ApplyThresholdContext;
  // ... other args
}) {
  const context = args.createThresholdContext(...);  // Injected function
  const ewma = args.applyThreshold(..., context);    // Injected function
}
```

**Benefits:**
- Better separation of concerns
- CandidateGenerator doesn't depend on ThresholdLearner or ABTestingService
- Easier to test in isolation
- Engine maintains control over threshold logic

---

## Integration Points

### 1. Constructor Changes

**BEFORE:**
```typescript
constructor(opts?: {
  baselineService?: BaselineService;
  policies?: AlertPolicies;
  cusumConfig?: { kFactor: number; decisionInterval: number };
  learner?: ThresholdLearner;
  experiments?: ABTestingService;
  seriesLimit?: number;
  tauUDetector?: (args: { intervention: Intervention; goal: Goal | null }) => DetectorResult | null;
}) {
  // ... initialization
  this.cusumConfig = { ... };
  this.seriesLimit = ...;
  this.tauUDetector = opts?.tauUDetector;
  this.baselineThresholds = { ...DEFAULT_DETECTOR_THRESHOLDS };
}
```

**AFTER:**
```typescript
private readonly generator: CandidateGenerator;

constructor(opts?: {
  baselineService?: BaselineService;
  policies?: AlertPolicies;
  cusumConfig?: { kFactor: number; decisionInterval: number };
  learner?: ThresholdLearner;
  experiments?: ABTestingService;
  seriesLimit?: number;
  tauUDetector?: (args: { intervention: Intervention; goal: Goal | null }) => DetectorResult | null;
}) {
  // ... existing initialization
  const cusumConfig = {
    kFactor: (opts?.cusumConfig ?? ANALYTICS_CONFIG.alerts?.cusum)?.kFactor ?? 0.5,
    decisionInterval: (opts?.cusumConfig ?? ANALYTICS_CONFIG.alerts?.cusum)?.decisionInterval ?? 5,
  };
  const seriesLimit = Math.max(10, Math.min(365, opts?.seriesLimit ?? MAX_ALERT_SERIES_LENGTH));

  // Initialize generator with engine's configuration
  this.generator = new CandidateGenerator({
    cusumConfig,
    seriesLimit,
    tauUDetector: opts?.tauUDetector,
    baselineThresholds: { ...DEFAULT_DETECTOR_THRESHOLDS },
  });

  // Remove these from engine - now in generator
  // this.cusumConfig = ...;
  // this.seriesLimit = ...;
  // this.tauUDetector = ...;
  // this.baselineThresholds = ...;
}
```

**New Import Required:**
```typescript
import { CandidateGenerator } from '@/lib/alerts/detection/candidateGenerator';
import { MAX_ALERT_SERIES_LENGTH } from '@/constants/analytics';
```

**Imports to REMOVE:**
```typescript
// These are no longer directly used by engine
import { detectEWMATrend, TrendPoint } from '@/lib/alerts/detectors/ewma';
import { detectCUSUMShift } from '@/lib/alerts/detectors/cusum';
import { detectBetaRateShift } from '@/lib/alerts/detectors/betaRate';
import { detectAssociation } from '@/lib/alerts/detectors/association';
import { detectBurst, BurstEvent } from '@/lib/alerts/detectors/burst';
```

**Imports to KEEP:**
```typescript
// Still needed for type exports and interface definitions
import type { TrendPoint } from '@/lib/alerts/detectors/ewma';
import type { BurstEvent } from '@/lib/alerts/detectors/burst';
```

### 2. runDetection Method Changes

**BEFORE (Lines 151-213):**
```typescript
runDetection(input: DetectionInput): AlertEvent[] {
  // ... setup code

  const emotionSeries = this.buildEmotionSeries(input.emotions);
  const sensoryAgg = this.buildSensoryAggregates(input.sensory);
  const associationDataset = this.buildAssociationDataset(input.tracking);
  const burstEvents = this.buildBurstEvents(input.emotions, input.sensory);

  const emotionCandidates = this.buildEmotionCandidates({
    emotionSeries,
    baseline,
    studentId: input.studentId,
    thresholdOverrides,
    nowTs,
  });

  const sensoryCandidates = this.buildSensoryCandidates({
    sensoryAggregates: sensoryAgg,
    baseline,
    studentId: input.studentId,
    thresholdOverrides,
    nowTs,
  });

  // ... more candidates

  const tauCandidates = this.detectInterventionOutcomes(input, thresholdOverrides, nowTs);

  // ... rest of method
}
```

**AFTER:**
```typescript
runDetection(input: DetectionInput): AlertEvent[] {
  // ... setup code (unchanged)

  // Delegate data building to generator
  const emotionSeries = this.generator.buildEmotionSeries(input.emotions);
  const sensoryAgg = this.generator.buildSensoryAggregates(input.sensory);
  const associationDataset = this.generator.buildAssociationDataset(input.tracking);
  const burstEvents = this.generator.buildBurstEvents(input.emotions, input.sensory);

  // Delegate candidate building to generator with method injection
  const emotionCandidates = this.generator.buildEmotionCandidates({
    emotionSeries,
    baseline,
    studentId: input.studentId,
    thresholdOverrides,
    nowTs,
    applyThreshold: this.applyThreshold.bind(this),
    createThresholdContext: this.createThresholdContext.bind(this),
  });

  const sensoryCandidates = this.generator.buildSensoryCandidates({
    sensoryAggregates: sensoryAgg,
    baseline,
    studentId: input.studentId,
    thresholdOverrides,
    nowTs,
    applyThreshold: this.applyThreshold.bind(this),
    createThresholdContext: this.createThresholdContext.bind(this),
  });

  const associationCandidates = this.generator.buildAssociationCandidates({
    dataset: associationDataset,
    studentId: input.studentId,
    thresholdOverrides,
    nowTs,
    applyThreshold: this.applyThreshold.bind(this),
    createThresholdContext: this.createThresholdContext.bind(this),
  });

  const burstCandidates = this.generator.buildBurstCandidates({
    burstEvents,
    studentId: input.studentId,
    thresholdOverrides,
    nowTs,
    applyThreshold: this.applyThreshold.bind(this),
    createThresholdContext: this.createThresholdContext.bind(this),
  });

  const tauCandidates = this.generator.detectInterventionOutcomes({
    interventions: input.interventions ?? [],
    goals: input.goals ?? [],
    studentId: input.studentId,
    thresholdOverrides,
    nowTs,
    applyThreshold: this.applyThreshold.bind(this),
    createThresholdContext: this.createThresholdContext.bind(this),
  });

  // ... rest of method (unchanged)
}
```

**Note on `.bind(this)`:**
- Required because `applyThreshold` and `createThresholdContext` access `this.learner`, `this.experiments`, etc.
- Ensures methods maintain correct `this` context when called from generator

### 3. Methods to DELETE from Engine

**Complete removal of these methods:**

```typescript
// Lines 215-282 - DELETE
private buildEmotionCandidates(args: {...}): AlertCandidate[] { ... }

// Lines 284-337 - DELETE
private buildSensoryCandidates(args: {...}): AlertCandidate[] { ... }

// Lines 339-375 - DELETE
private buildAssociationCandidates(args: {...}): AlertCandidate[] { ... }

// Lines 377-410 - DELETE
private buildBurstCandidates(args: {...}): AlertCandidate[] { ... }

// Lines 412-492 - DELETE
private detectInterventionOutcomes(input, overrides, nowTs): AlertCandidate[] { ... }

// Lines 610-628 - DELETE
private buildEmotionSeries(emotions: EmotionEntry[]): Map<...> { ... }

// Lines 631-657 - DELETE
private buildSensoryAggregates(sensory: SensoryEntry[]): Map<...> { ... }

// Lines 660-715 - DELETE
private buildAssociationDataset(tracking: TrackingEntry[]): AssociationDataset | null { ... }

// Lines 717-750 - DELETE
private buildBurstEvents(emotions, sensory): BurstEvent[] { ... }

// Lines 753-761 - DELETE
private computeDetectionQuality(detectors, series): {...} { ... }

// Lines 795-802 - DELETE
private safeDetect(label: string, fn: DetectorFunction): DetectorResult | null | undefined { ... }

// Lines 804-814 - DELETE
private lookupEmotionBaseline(baseline, key): {...} | null { ... }

// Lines 816-829 - DELETE
private lookupSensoryBaseline(baseline, key): {...} | null { ... }
```

**Total lines removed: ~452 lines**

### 4. Methods to KEEP in Engine

**These methods remain because they depend on engine state:**

```typescript
// Lines 494-508 - KEEP (uses AlertKind enum)
private resolveExperimentKey(kind: AlertKind): string

// Lines 510-532 - KEEP (uses this.experiments)
private createThresholdContext(kind, studentId, overrides): ApplyThresholdContext

// Lines 534-586 - KEEP (uses this.experiments, this.baselineThresholds)
private applyThreshold(detectorType, result, context, baselineOverride?): DetectorResult | null

// Lines 588-607 - KEEP (uses this.seriesLimit, this.policies)
private buildAlert(candidate, studentId, nowTs): AlertEvent

// Lines 767-792 - KEEP (NOT in CandidateGenerator!)
private computeSeriesStats(series: TrendPoint[]): {...}
```

### 5. Interface Changes

**KEEP these interfaces in engine.ts** (they're used by engine methods):

```typescript
// Line 42-51 - KEEP
interface DetectionInput { ... }

// Lines 53-65 - KEEP (used by buildAlert)
interface AlertCandidate { ... }

// Lines 67-69 - KEEP (used by buildAssociationDataset reference)
interface AssociationDataset extends AssociationDetectorInput {
  timestamps: number[];
}

// Lines 71-76 - KEEP (used by createThresholdContext)
interface ApplyThresholdContext { ... }
```

**Note:** CandidateGenerator has its own copies of these interfaces. The duplication is intentional for module independence.

---

## Step-by-Step Integration Plan

### Phase 1: Add CandidateGenerator Import and Instance

**Step 1.1**: Add imports (after line 1)
```typescript
import { CandidateGenerator } from '@/lib/alerts/detection/candidateGenerator';
import { MAX_ALERT_SERIES_LENGTH } from '@/constants/analytics';
```

**Step 1.2**: Add generator field to class (after line 108)
```typescript
export class AlertDetectionEngine {
  private readonly baselineService: BaselineService;
  private readonly policies: AlertPolicies;
  private readonly cusumConfig: { kFactor: number; decisionInterval: number };
  private readonly learner: ThresholdLearner;
  private readonly experiments: ABTestingService;
  private readonly baselineThresholds: Record<string, number>;
  private readonly seriesLimit: number;
  private readonly tauUDetector?: (args: { intervention: Intervention; goal: Goal | null }) => DetectorResult | null;
  private readonly generator: CandidateGenerator;  // ADD THIS
```

**Step 1.3**: Initialize generator in constructor (replace lines 130-141)
```typescript
constructor(opts?: { ... }) {
  this.baselineService = opts?.baselineService ?? new BaselineService();
  this.policies = opts?.policies ?? new AlertPolicies();
  const configSource = opts?.cusumConfig ?? ANALYTICS_CONFIG.alerts?.cusum;
  const cusumConfig = {
    kFactor: configSource?.kFactor ?? 0.5,
    decisionInterval: configSource?.decisionInterval ?? 5,
  };
  this.learner = opts?.learner ?? new ThresholdLearner();
  this.experiments = opts?.experiments ?? new ABTestingService();
  const seriesLimit = Math.max(10, Math.min(365, opts?.seriesLimit ?? MAX_ALERT_SERIES_LENGTH));

  // Initialize generator with configuration
  this.generator = new CandidateGenerator({
    cusumConfig,
    seriesLimit,
    tauUDetector: opts?.tauUDetector,
    baselineThresholds: { ...DEFAULT_DETECTOR_THRESHOLDS },
  });
}
```

### Phase 2: Update runDetection Method

**Step 2.1**: Replace data building calls (lines 160-163)

**BEFORE:**
```typescript
const emotionSeries = this.buildEmotionSeries(input.emotions);
const sensoryAgg = this.buildSensoryAggregates(input.sensory);
const associationDataset = this.buildAssociationDataset(input.tracking);
const burstEvents = this.buildBurstEvents(input.emotions, input.sensory);
```

**AFTER:**
```typescript
const emotionSeries = this.generator.buildEmotionSeries(input.emotions);
const sensoryAgg = this.generator.buildSensoryAggregates(input.sensory);
const associationDataset = this.generator.buildAssociationDataset(input.tracking);
const burstEvents = this.generator.buildBurstEvents(input.emotions, input.sensory);
```

**Step 2.2**: Replace emotion candidates call (lines 165-171)

**BEFORE:**
```typescript
const emotionCandidates = this.buildEmotionCandidates({
  emotionSeries,
  baseline,
  studentId: input.studentId,
  thresholdOverrides,
  nowTs,
});
```

**AFTER:**
```typescript
const emotionCandidates = this.generator.buildEmotionCandidates({
  emotionSeries,
  baseline,
  studentId: input.studentId,
  thresholdOverrides,
  nowTs,
  applyThreshold: this.applyThreshold.bind(this),
  createThresholdContext: this.createThresholdContext.bind(this),
});
```

**Step 2.3**: Replace sensory candidates call (lines 173-179)

**BEFORE:**
```typescript
const sensoryCandidates = this.buildSensoryCandidates({
  sensoryAggregates: sensoryAgg,
  baseline,
  studentId: input.studentId,
  thresholdOverrides,
  nowTs,
});
```

**AFTER:**
```typescript
const sensoryCandidates = this.generator.buildSensoryCandidates({
  sensoryAggregates: sensoryAgg,
  baseline,
  studentId: input.studentId,
  thresholdOverrides,
  nowTs,
  applyThreshold: this.applyThreshold.bind(this),
  createThresholdContext: this.createThresholdContext.bind(this),
});
```

**Step 2.4**: Replace association candidates call (lines 181-186)

**BEFORE:**
```typescript
const associationCandidates = this.buildAssociationCandidates({
  dataset: associationDataset,
  studentId: input.studentId,
  thresholdOverrides,
  nowTs,
});
```

**AFTER:**
```typescript
const associationCandidates = this.generator.buildAssociationCandidates({
  dataset: associationDataset,
  studentId: input.studentId,
  thresholdOverrides,
  nowTs,
  applyThreshold: this.applyThreshold.bind(this),
  createThresholdContext: this.createThresholdContext.bind(this),
});
```

**Step 2.5**: Replace burst candidates call (lines 188-193)

**BEFORE:**
```typescript
const burstCandidates = this.buildBurstCandidates({
  burstEvents,
  studentId: input.studentId,
  thresholdOverrides,
  nowTs,
});
```

**AFTER:**
```typescript
const burstCandidates = this.generator.buildBurstCandidates({
  burstEvents,
  studentId: input.studentId,
  thresholdOverrides,
  nowTs,
  applyThreshold: this.applyThreshold.bind(this),
  createThresholdContext: this.createThresholdContext.bind(this),
});
```

**Step 2.6**: Replace intervention outcomes call (line 195)

**BEFORE:**
```typescript
const tauCandidates = this.detectInterventionOutcomes(input, thresholdOverrides, nowTs);
```

**AFTER:**
```typescript
const tauCandidates = this.generator.detectInterventionOutcomes({
  interventions: input.interventions ?? [],
  goals: input.goals ?? [],
  studentId: input.studentId,
  thresholdOverrides,
  nowTs,
  applyThreshold: this.applyThreshold.bind(this),
  createThresholdContext: this.createThresholdContext.bind(this),
});
```

### Phase 3: Remove Duplicate Methods

**Step 3.1**: Delete candidate building methods
- Remove `buildEmotionCandidates()` (lines 215-282)
- Remove `buildSensoryCandidates()` (lines 284-337)
- Remove `buildAssociationCandidates()` (lines 339-375)
- Remove `buildBurstCandidates()` (lines 377-410)
- Remove `detectInterventionOutcomes()` (lines 412-492)

**Step 3.2**: Delete data building methods
- Remove `buildEmotionSeries()` (lines 610-628)
- Remove `buildSensoryAggregates()` (lines 631-657)
- Remove `buildAssociationDataset()` (lines 660-715)
- Remove `buildBurstEvents()` (lines 717-750)

**Step 3.3**: Delete helper methods
- Remove `computeDetectionQuality()` (lines 753-761)
- Remove `safeDetect()` (lines 795-802)
- Remove `lookupEmotionBaseline()` (lines 804-814)
- Remove `lookupSensoryBaseline()` (lines 816-829)

**Step 3.4**: Keep necessary methods
- KEEP `resolveExperimentKey()` (lines 494-508)
- KEEP `createThresholdContext()` (lines 510-532)
- KEEP `applyThreshold()` (lines 534-586)
- KEEP `buildAlert()` (lines 588-607)
- KEEP `computeSeriesStats()` (lines 767-792)

### Phase 4: Clean Up Imports

**Step 4.1**: Remove unused detector imports
```typescript
// DELETE these (no longer directly used):
import { detectEWMATrend, TrendPoint } from '@/lib/alerts/detectors/ewma';
import { detectCUSUMShift } from '@/lib/alerts/detectors/cusum';
import { detectBetaRateShift } from '@/lib/alerts/detectors/betaRate';
import { detectAssociation } from '@/lib/alerts/detectors/association';
import type { AssociationDetectorInput } from '@/lib/alerts/detectors/association';
import { detectBurst, BurstEvent } from '@/lib/alerts/detectors/burst';
```

**Step 4.2**: Keep type-only imports
```typescript
// KEEP for type definitions:
import type { TrendPoint } from '@/lib/alerts/detectors/ewma';
import type { BurstEvent } from '@/lib/alerts/detectors/burst';
import type { AssociationDetectorInput } from '@/lib/alerts/detectors/association';
```

**Step 4.3**: Remove utility imports no longer needed
```typescript
// DELETE these (generator handles internally):
import { normalizeTimestamp, buildAlertId, truncateSeries } from '@/lib/alerts/utils';

// REPLACE with:
import { buildAlertId } from '@/lib/alerts/utils';
```

---

## Before/After Code Examples

### Constructor - Before/After

**BEFORE:**
```typescript
constructor(opts?: {
  baselineService?: BaselineService;
  policies?: AlertPolicies;
  cusumConfig?: { kFactor: number; decisionInterval: number };
  learner?: ThresholdLearner;
  experiments?: ABTestingService;
  seriesLimit?: number;
  tauUDetector?: (args: { intervention: Intervention; goal: Goal | null }) => DetectorResult | null;
}) {
  this.baselineService = opts?.baselineService ?? new BaselineService();
  this.policies = opts?.policies ?? new AlertPolicies();
  const configSource = opts?.cusumConfig ?? ANALYTICS_CONFIG.alerts?.cusum;
  this.cusumConfig = {
    kFactor: configSource?.kFactor ?? 0.5,
    decisionInterval: configSource?.decisionInterval ?? 5,
  };
  this.learner = opts?.learner ?? new ThresholdLearner();
  this.experiments = opts?.experiments ?? new ABTestingService();
  this.baselineThresholds = { ...DEFAULT_DETECTOR_THRESHOLDS };
  this.seriesLimit = Math.max(10, Math.min(365, opts?.seriesLimit ?? MAX_ALERT_SERIES_LENGTH));
  this.tauUDetector = opts?.tauUDetector;
}
```

**AFTER:**
```typescript
constructor(opts?: {
  baselineService?: BaselineService;
  policies?: AlertPolicies;
  cusumConfig?: { kFactor: number; decisionInterval: number };
  learner?: ThresholdLearner;
  experiments?: ABTestingService;
  seriesLimit?: number;
  tauUDetector?: (args: { intervention: Intervention; goal: Goal | null }) => DetectorResult | null;
}) {
  this.baselineService = opts?.baselineService ?? new BaselineService();
  this.policies = opts?.policies ?? new AlertPolicies();
  const configSource = opts?.cusumConfig ?? ANALYTICS_CONFIG.alerts?.cusum;
  const cusumConfig = {
    kFactor: configSource?.kFactor ?? 0.5,
    decisionInterval: configSource?.decisionInterval ?? 5,
  };
  this.learner = opts?.learner ?? new ThresholdLearner();
  this.experiments = opts?.experiments ?? new ABTestingService();
  const seriesLimit = Math.max(10, Math.min(365, opts?.seriesLimit ?? MAX_ALERT_SERIES_LENGTH));

  // Initialize CandidateGenerator with extracted configuration
  this.generator = new CandidateGenerator({
    cusumConfig,
    seriesLimit,
    tauUDetector: opts?.tauUDetector,
    baselineThresholds: { ...DEFAULT_DETECTOR_THRESHOLDS },
  });
}
```

### runDetection - Key Section Before/After

**BEFORE:**
```typescript
runDetection(input: DetectionInput): AlertEvent[] {
  const now = input.now ?? new Date();
  const nowTs = now.getTime();
  if (!input.studentId) return [];

  const thresholdOverrides = this.learner.getThresholdOverrides();
  const baseline = input.baseline ?? this.baselineService.getEmotionBaseline(input.studentId);

  // Build data structures
  const emotionSeries = this.buildEmotionSeries(input.emotions);
  const sensoryAgg = this.buildSensoryAggregates(input.sensory);
  const associationDataset = this.buildAssociationDataset(input.tracking);
  const burstEvents = this.buildBurstEvents(input.emotions, input.sensory);

  // Build candidates
  const emotionCandidates = this.buildEmotionCandidates({
    emotionSeries,
    baseline,
    studentId: input.studentId,
    thresholdOverrides,
    nowTs,
  });

  const sensoryCandidates = this.buildSensoryCandidates({
    sensoryAggregates: sensoryAgg,
    baseline,
    studentId: input.studentId,
    thresholdOverrides,
    nowTs,
  });

  // ... more candidates

  const tauCandidates = this.detectInterventionOutcomes(input, thresholdOverrides, nowTs);

  const candidates: AlertCandidate[] = [
    ...emotionCandidates,
    ...sensoryCandidates,
    ...associationCandidates,
    ...burstCandidates,
    ...tauCandidates,
  ];

  // ... rest
}
```

**AFTER:**
```typescript
runDetection(input: DetectionInput): AlertEvent[] {
  const now = input.now ?? new Date();
  const nowTs = now.getTime();
  if (!input.studentId) return [];

  const thresholdOverrides = this.learner.getThresholdOverrides();
  const baseline = input.baseline ?? this.baselineService.getEmotionBaseline(input.studentId);

  // Delegate data building to generator
  const emotionSeries = this.generator.buildEmotionSeries(input.emotions);
  const sensoryAgg = this.generator.buildSensoryAggregates(input.sensory);
  const associationDataset = this.generator.buildAssociationDataset(input.tracking);
  const burstEvents = this.generator.buildBurstEvents(input.emotions, input.sensory);

  // Delegate candidate building to generator with method injection
  const emotionCandidates = this.generator.buildEmotionCandidates({
    emotionSeries,
    baseline,
    studentId: input.studentId,
    thresholdOverrides,
    nowTs,
    applyThreshold: this.applyThreshold.bind(this),
    createThresholdContext: this.createThresholdContext.bind(this),
  });

  const sensoryCandidates = this.generator.buildSensoryCandidates({
    sensoryAggregates: sensoryAgg,
    baseline,
    studentId: input.studentId,
    thresholdOverrides,
    nowTs,
    applyThreshold: this.applyThreshold.bind(this),
    createThresholdContext: this.createThresholdContext.bind(this),
  });

  const associationCandidates = this.generator.buildAssociationCandidates({
    dataset: associationDataset,
    studentId: input.studentId,
    thresholdOverrides,
    nowTs,
    applyThreshold: this.applyThreshold.bind(this),
    createThresholdContext: this.createThresholdContext.bind(this),
  });

  const burstCandidates = this.generator.buildBurstCandidates({
    burstEvents,
    studentId: input.studentId,
    thresholdOverrides,
    nowTs,
    applyThreshold: this.applyThreshold.bind(this),
    createThresholdContext: this.createThresholdContext.bind(this),
  });

  const tauCandidates = this.generator.detectInterventionOutcomes({
    interventions: input.interventions ?? [],
    goals: input.goals ?? [],
    studentId: input.studentId,
    thresholdOverrides,
    nowTs,
    applyThreshold: this.applyThreshold.bind(this),
    createThresholdContext: this.createThresholdContext.bind(this),
  });

  const candidates: AlertCandidate[] = [
    ...emotionCandidates,
    ...sensoryCandidates,
    ...associationCandidates,
    ...burstCandidates,
    ...tauCandidates,
  ];

  // ... rest (unchanged)
}
```

---

## Risk Assessment

### LOW RISK ✓

**Reasons:**
1. **Identical Logic**: CandidateGenerator methods are nearly byte-for-byte identical to engine methods
2. **Type Safety**: TypeScript will catch any signature mismatches
3. **Dependency Injection**: Clear separation of concerns reduces coupling
4. **No Behavior Change**: Pure refactoring with no logic modifications
5. **Existing Tests**: Any existing tests for engine should continue to pass

### Potential Issues and Mitigations

**Issue 1: `.bind(this)` overhead**
- **Impact**: Minimal - bind is called once per detection run
- **Mitigation**: None needed - performance impact is negligible
- **Alternative**: Could pass methods as arrow functions if performance becomes concern

**Issue 2: Interface duplication**
- **Status**: `AlertCandidate`, `AssociationDataset`, `ApplyThresholdContext` exist in both files
- **Impact**: None - intentional for module independence
- **Mitigation**: Document this is by design

**Issue 3: Missing type imports**
- **Status**: TrendPoint, BurstEvent still needed for type definitions
- **Impact**: None - import as type-only
- **Mitigation**: Use `import type { ... }` syntax

---

## Test File Updates Required

### CRITICAL: Private Method Tests Will Break

**File**: `/home/user/kreativium-analytics/src/lib/alerts/__tests__/engine.test.ts`

**Lines 252-338**: "AlertDetectionEngine candidate builders" test suite

These tests directly call private methods that will be removed:

```typescript
// Line 257 - calls buildEmotionSeries (will be removed)
const emotionSeries = (engineAny.buildEmotionSeries as ...)(emotions);

// Line 260 - calls buildEmotionCandidates (will be removed)
const candidates = (engineAny.buildEmotionCandidates as ...)({...});

// Line 282 - calls buildSensoryAggregates (will be removed)
const aggregates = (engineAny.buildSensoryAggregates as ...)(sensory);

// Line 293 - calls buildSensoryCandidates (will be removed)
const candidates = (engineAny.buildSensoryCandidates as ...)({...});

// Line 309 - calls buildAssociationDataset (will be removed)
const dataset = (engineAny.buildAssociationDataset as ...)(tracking);

// Line 311 - calls buildAssociationCandidates (will be removed)
const candidates = (engineAny.buildAssociationCandidates as ...)({...});

// Line 326 - calls buildBurstEvents (will be removed)
const events = (engineAny.buildBurstEvents as ...)(emotions, sensory);

// Line 328 - calls buildBurstCandidates (will be removed)
const candidates = (engineAny.buildBurstCandidates as ...)({...});
```

### Test Migration Strategy

**Option A: Delete Implementation Tests (RECOMMENDED)**
- Remove lines 252-338 entirely
- Reasoning: Testing private implementation details is fragile
- Public API tests (lines 71-250) already validate behavior
- CandidateGenerator should have its own unit tests

**Option B: Migrate to CandidateGenerator Tests**
- Create new test file: `candidateGenerator.test.ts`
- Move these tests to test CandidateGenerator directly
- Reasoning: Preserves test coverage but moves to correct location

**Option C: Refactor to Test Public API**
- Rewrite tests to only use `runDetection()` public method
- Assert on result structure instead of intermediate data
- Reasoning: More brittle, less useful

### Recommended Action

**DELETE lines 252-338** from `engine.test.ts` because:

1. **Public API Already Tested**: Lines 71-250 test the full pipeline through `runDetection()`
2. **Better Coverage**: CandidateGenerator module should have its own tests
3. **Avoid Coupling**: Testing private methods creates tight coupling
4. **Implementation Details**: These tests verify HOW not WHAT

**Verification**: After deletion, run existing tests (lines 71-250). They should:
- ✓ Still test emotion detection
- ✓ Still test sensory detection
- ✓ Still test association detection
- ✓ Still test burst detection
- ✓ Validate through public API

---

## Testing Strategy

### Unit Tests

**Test CandidateGenerator integration:**
```typescript
describe('AlertDetectionEngine with CandidateGenerator', () => {
  it('should delegate emotion series building to generator', () => {
    const engine = new AlertDetectionEngine();
    const emotions = [/* test data */];

    // Should call generator's method
    const result = engine.runDetection({
      studentId: 'test',
      emotions,
      sensory: [],
      tracking: [],
    });

    // Verify results match expected structure
    expect(result).toBeDefined();
  });

  it('should pass threshold methods to generator', () => {
    // Test that applyThreshold and createThresholdContext
    // are correctly bound and passed to generator
  });
});
```

### Integration Tests

**Existing tests should pass without modification:**
- Alert detection integration tests (lines 71-250) ✓
- End-to-end detection pipeline tests ✓
- Threshold application tests ✓

**Tests requiring updates:**
- Private method tests (lines 252-338) - DELETE

### Manual Testing

1. Run existing alert detection flows
2. Verify alerts are generated correctly
3. Check threshold application works
4. Validate experiment variant assignment

---

## Estimated Impact

### Lines of Code

**Before:**
- engine.ts: 832 lines

**After:**
- engine.ts: ~380 lines (removal of 452 lines)
- New import: 1 line
- New field: 1 line
- Modified constructor: +10 lines
- Modified runDetection: +12 lines (for bind calls)

**Net change: -428 lines (-51% reduction)**

### File Structure

**Files Modified:**
- `/home/user/kreativium-analytics/src/lib/alerts/engine.ts`

**Files Added:**
- None (CandidateGenerator already exists)

**Files Deleted:**
- None

### Performance Impact

**Expected:** Negligible
- Generator instantiation: Once per engine instance
- `.bind()` calls: 10 per detection run (minimal overhead)
- Method delegation: No additional overhead vs direct calls

---

## Dependencies

### Required Files

✓ `/home/user/kreativium-analytics/src/lib/alerts/detection/candidateGenerator.ts` (exists)
✓ `/home/user/kreativium-analytics/src/constants/analytics.ts` (exists - contains MAX_ALERT_SERIES_LENGTH)

### No Breaking Changes

- Public API of AlertDetectionEngine remains unchanged
- Constructor signature unchanged
- `runDetection()` signature unchanged
- All existing consumers continue to work

---

## Rollback Plan

If integration causes issues:

1. **Revert constructor changes** - remove generator initialization
2. **Revert runDetection changes** - restore `this.build*` calls
3. **Restore deleted methods** - from git history
4. **Remove imports** - remove CandidateGenerator import

**Git revert command:**
```bash
git revert <commit-hash>
```

---

## Success Criteria

✓ All existing tests pass
✓ No runtime errors in alert detection
✓ Code reduction of ~450 lines achieved
✓ No performance degradation
✓ TypeScript compilation successful
✓ No eslint errors

---

## Next Steps for Executor Agent

1. **Phase 1**: Import CandidateGenerator and add generator field
2. **Phase 2**: Update constructor to initialize generator
3. **Phase 3**: Update runDetection method with delegation calls
4. **Phase 4**: Remove duplicate methods (14 methods total)
5. **Phase 5**: Clean up imports
6. **Phase 6**: Update test file - DELETE lines 252-338 from engine.test.ts
7. **Phase 7**: Verify TypeScript compilation
8. **Phase 8**: Run tests
9. **Phase 9**: Document changes in git commit

---

## Notes

- `computeSeriesStats()` is NOT in CandidateGenerator - KEEP in engine
- Interface duplication is intentional for module independence
- `.bind(this)` is necessary because methods access engine's state
- All type exports must use `import type { ... }` for tree-shaking

---

## Appendix: Full Import Changes

### Imports to ADD:
```typescript
import { CandidateGenerator } from '@/lib/alerts/detection/candidateGenerator';
import { MAX_ALERT_SERIES_LENGTH } from '@/constants/analytics';
```

### Imports to REMOVE:
```typescript
import { detectEWMATrend, TrendPoint } from '@/lib/alerts/detectors/ewma';
import { detectCUSUMShift } from '@/lib/alerts/detectors/cusum';
import { detectBetaRateShift } from '@/lib/alerts/detectors/betaRate';
import { detectAssociation } from '@/lib/alerts/detectors/association';
import type { AssociationDetectorInput } from '@/lib/alerts/detectors/association';
import { detectBurst, BurstEvent } from '@/lib/alerts/detectors/burst';
import { normalizeTimestamp, buildAlertId, truncateSeries } from '@/lib/alerts/utils';
```

### Imports to MODIFY:
```typescript
// Change from full import to type-only:
import type { TrendPoint } from '@/lib/alerts/detectors/ewma';
import type { BurstEvent } from '@/lib/alerts/detectors/burst';
import type { AssociationDetectorInput } from '@/lib/alerts/detectors/association';

// Reduce utils import:
import { buildAlertId } from '@/lib/alerts/utils';
```

### Final Import Block:
```typescript
import { BaselineService, StudentBaseline } from '@/lib/alerts/baseline';
import { AlertPolicies } from '@/lib/alerts/policies';
import {
  AlertEvent,
  AlertKind,
  AlertMetadata,
  AlertSeverity,
  AlertSource,
  AlertStatus,
  DetectorResult,
  ThresholdAdjustmentTrace,
  ThresholdOverride,
  isValidDetectorResult,
} from '@/lib/alerts/types';
import type { TrendPoint } from '@/lib/alerts/detectors/ewma';
import type { BurstEvent } from '@/lib/alerts/detectors/burst';
import type { AssociationDetectorInput } from '@/lib/alerts/detectors/association';
import { ThresholdLearner } from '@/lib/alerts/learning/thresholdLearner';
import { ABTestingService } from '@/lib/alerts/experiments/abTesting';
import type { EmotionEntry, Goal, Intervention, SensoryEntry, TrackingEntry } from '@/types/student';
import { generateSparklineData } from '@/lib/chartUtils';
import { ANALYTICS_CONFIG } from '@/lib/analyticsConfig';
import { DEFAULT_DETECTOR_THRESHOLDS, getDefaultDetectorThreshold } from '@/lib/alerts/constants';
import { logger } from '@/lib/logger';
import { buildAlertId } from '@/lib/alerts/utils';
import { computeRecencyScore, severityFromScore, rankSources } from '@/lib/alerts/scoring';
import {
  aggregateDetectorResults,
  finalizeAlertEvent,
  type AggregatedResult,
} from '@/lib/alerts/detection';
import { CandidateGenerator } from '@/lib/alerts/detection/candidateGenerator';
import { MAX_ALERT_SERIES_LENGTH } from '@/constants/analytics';
```

---

**End of Integration Plan**
