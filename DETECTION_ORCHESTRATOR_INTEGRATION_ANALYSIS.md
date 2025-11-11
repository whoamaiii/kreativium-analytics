# DetectionOrchestrator Integration Analysis

**Agent**: Agent 3 - DetectionOrchestrator Integration Analysis **Date**: 2025-11-09 **Status**:
Analysis Complete - Ready for Implementation

---

## Executive Summary

**Recommendation**: **Full Replacement** of AlertDetectionEngine.runDetection() with
DetectionOrchestrator

**Migration Complexity**: **Medium** (Architectural alignment needed)

**Key Finding**: DetectionOrchestrator and AlertDetectionEngine implement **duplicate pipelines**
with different architectures. DetectionOrchestrator properly delegates to extracted modules
(CandidateGenerator), while AlertDetectionEngine has inline implementations. However,
DetectionOrchestrator does NOT use the extracted resultAggregator and alertFinalizer modules,
creating architectural inconsistency.

---

## 1. Current runDetection() Method Breakdown

### AlertDetectionEngine.runDetection() (Lines 151-213)

**File**: `/home/user/kreativium-analytics/src/lib/alerts/engine.ts`

```typescript
runDetection(input: DetectionInput): AlertEvent[] {
  const now = input.now ?? new Date();
  const nowTs = now.getTime();
  if (!input.studentId) return [];

  const thresholdOverrides = this.learner.getThresholdOverrides();
  const baseline = input.baseline ?? this.baselineService.getEmotionBaseline(input.studentId);

  // Stage 1: Build data series (INLINE - Lines 160-163)
  const emotionSeries = this.buildEmotionSeries(input.emotions);
  const sensoryAgg = this.buildSensoryAggregates(input.sensory);
  const associationDataset = this.buildAssociationDataset(input.tracking);
  const burstEvents = this.buildBurstEvents(input.emotions, input.sensory);

  // Stage 2: Build candidates (INLINE - Lines 165-195)
  const emotionCandidates = this.buildEmotionCandidates({...});
  const sensoryCandidates = this.buildSensoryCandidates({...});
  const associationCandidates = this.buildAssociationCandidates({...});
  const burstCandidates = this.buildBurstCandidates({...});
  const tauCandidates = this.detectInterventionOutcomes(input, thresholdOverrides, nowTs);

  // Stage 3: Aggregate candidates (Lines 197-203)
  const candidates = [...emotionCandidates, ...sensoryCandidates, ...associationCandidates, ...burstCandidates, ...tauCandidates];

  // Stage 4: Build alerts (USES EXTRACTED MODULES - Lines 205)
  const alerts = candidates.map((candidate) => this.buildAlert(candidate, input.studentId, nowTs));

  // Stage 5: Deduplication (Lines 207-209)
  const deduped = this.policies.deduplicateAlerts(alerts).map(({ governance, ...event }) => ({ ...event }));

  return deduped;
}
```

**Architecture**:

- **Data Building**: 428 lines of inline methods (buildEmotionSeries, buildSensoryAggregates, etc.)
- **Candidate Generation**: 280+ lines of inline methods (buildEmotionCandidates,
  buildSensoryCandidates, etc.)
- **Alert Building**: Uses extracted modules (aggregateDetectorResults, finalizeAlertEvent)
- **Total Engine Size**: 833 lines

**Dependencies**:

- BaselineService (instance)
- AlertPolicies (instance)
- ThresholdLearner (instance)
- ABTestingService (instance)
- CUSUM config (instance)
- Tau-U detector (optional dependency injection)

---

## 2. DetectionOrchestrator Capabilities Analysis

### DetectionOrchestrator.orchestrateDetection() (Lines 135-230)

**File**: `/home/user/kreativium-analytics/src/lib/alerts/detection/detectionOrchestrator.ts`

```typescript
orchestrateDetection(input: DetectionInput): AlertEvent[] {
  const now = input.now ?? new Date();
  const nowTs = now.getTime();
  if (!input.studentId) return [];

  const thresholdOverrides = this.learner.getThresholdOverrides();
  const baseline = input.baseline ?? this.baselineService.getEmotionBaseline(input.studentId);

  // Stage 1: Build data series (DELEGATES TO CandidateGenerator - Lines 151-154)
  const emotionSeries = this.candidateGenerator.buildEmotionSeries(input.emotions);
  const sensoryAgg = this.candidateGenerator.buildSensoryAggregates(input.sensory);
  const associationDataset = this.candidateGenerator.buildAssociationDataset(input.tracking);
  const burstEvents = this.candidateGenerator.buildBurstEvents(input.emotions, input.sensory);

  // Stage 2: Build candidates (DELEGATES TO CandidateGenerator - Lines 157-203)
  const emotionCandidates = this.candidateGenerator.buildEmotionCandidates({
    emotionSeries,
    baseline,
    studentId: input.studentId,
    thresholdOverrides,
    nowTs,
    applyThreshold: this.applyThreshold.bind(this),
    createThresholdContext: this.createThresholdContext.bind(this),
  });
  // ... similar for sensory, association, burst, tau

  // Stage 3: Aggregate candidates (Lines 206-212)
  const candidates = [...emotionCandidates, ...sensoryCandidates, ...associationCandidates, ...burstCandidates, ...tauCandidates];

  // Stage 4: Build alerts (INLINE - Lines 215)
  const alerts = candidates.map((candidate) => this.buildAlert(candidate, input.studentId, nowTs));

  // Stage 5: Deduplication (Lines 218-220)
  const deduped = this.policies.deduplicateAlerts(alerts).map(({ governance, ...event }) => ({ ...event }));

  return deduped;
}
```

**Architecture**:

- **Data Building**: Delegates to CandidateGenerator (677 lines)
- **Candidate Generation**: Delegates to CandidateGenerator with dependency injection
- **Alert Building**: INLINE implementation (Lines 376-442) - does NOT use
  resultAggregator/alertFinalizer
- **Total Orchestrator Size**: 479 lines

**Dependencies**:

- BaselineService (optional, defaults to new instance)
- AlertPolicies (optional, defaults to new instance)
- ThresholdLearner (optional, defaults to new instance)
- ABTestingService (optional, defaults to new instance)
- CandidateGenerator (optional, defaults to new instance with config)
- Series limit (optional, defaults to MAX_ALERT_SERIES_LENGTH)
- Tau-U detector (optional dependency injection)

**Key Strength**: Proper dependency injection pattern allows testing and configuration flexibility

---

## 3. Architectural Comparison

### Pipeline Stage Comparison

| Stage                    | AlertDetectionEngine         | DetectionOrchestrator           | Ideal Architecture             |
| ------------------------ | ---------------------------- | ------------------------------- | ------------------------------ |
| **Data Series Building** | Inline methods (160 lines)   | Delegates to CandidateGenerator | ✅ CandidateGenerator          |
| **Candidate Generation** | Inline methods (280 lines)   | Delegates to CandidateGenerator | ✅ CandidateGenerator          |
| **Result Aggregation**   | Uses resultAggregator module | INLINE in buildAlert            | ❌ Should use resultAggregator |
| **Alert Finalization**   | Uses alertFinalizer module   | INLINE in buildAlert            | ❌ Should use alertFinalizer   |
| **Threshold Management** | Inline methods (70 lines)    | Inline methods (70 lines)       | ⚠️ Both inline (acceptable)    |
| **Deduplication**        | AlertPolicies                | AlertPolicies                   | ✅ AlertPolicies               |

### Code Duplication Analysis

**Duplicate Implementations**:

1. **Data Series Builders** (4 methods):
   - `buildEmotionSeries()`: Engine has inline (18 lines), Orchestrator delegates to
     CandidateGenerator (18 lines)
   - `buildSensoryAggregates()`: Engine has inline (25 lines), Orchestrator delegates to
     CandidateGenerator (25 lines)
   - `buildAssociationDataset()`: Engine has inline (54 lines), Orchestrator delegates to
     CandidateGenerator (54 lines)
   - `buildBurstEvents()`: Engine has inline (32 lines), Orchestrator delegates to
     CandidateGenerator (32 lines)

2. **Candidate Builders** (5 methods):
   - `buildEmotionCandidates()`: Engine has inline (65 lines), Orchestrator delegates to
     CandidateGenerator (77 lines)
   - `buildSensoryCandidates()`: Engine has inline (52 lines), Orchestrator delegates to
     CandidateGenerator (43 lines)
   - `buildAssociationCandidates()`: Engine has inline (37 lines), Orchestrator delegates to
     CandidateGenerator (30 lines)
   - `buildBurstCandidates()`: Engine has inline (27 lines), Orchestrator delegates to
     CandidateGenerator (27 lines)
   - `detectInterventionOutcomes()`: Engine has inline (80 lines), Orchestrator delegates to
     CandidateGenerator (75 lines)

3. **Alert Building**:
   - Engine: Uses `aggregateDetectorResults` + `finalizeAlertEvent` (extracted modules) ✅
   - Orchestrator: Inline implementation (66 lines) ❌

4. **Threshold Management** (3 methods):
   - Both have identical `applyThreshold()`, `createThresholdContext()`, `resolveExperimentKey()`
     implementations

5. **Helper Methods**:
   - Both have `computeSeriesStats()` (identical)
   - Engine has `computeDetectionQuality()`, `safeDetect()`, `lookupEmotionBaseline()`,
     `lookupSensoryBaseline()`
   - Orchestrator has these in CandidateGenerator

**Total Duplication**: ~550 lines of duplicate code across Engine and CandidateGenerator

---

## 4. Integration Feasibility Assessment

### Option A: Full Replacement (RECOMMENDED)

Replace AlertDetectionEngine.runDetection() with DetectionOrchestrator.orchestrateDetection()

**Feasibility**: ✅ **HIGH** - API signatures are identical

**Input/Output Compatibility**:

```typescript
// Both accept identical input
interface DetectionInput {
  studentId: string;
  emotions: EmotionEntry[];
  sensory: SensoryEntry[];
  tracking: TrackingEntry[];
  baseline?: StudentBaseline | null;
  now?: Date;
  interventions?: Intervention[];
  goals?: Goal[];
}

// Both return identical output
return type: AlertEvent[]
```

**Constructor Compatibility**:

```typescript
// Engine constructor
constructor(opts?: {
  baselineService?: BaselineService;
  policies?: AlertPolicies;
  cusumConfig?: { kFactor: number; decisionInterval: number };
  learner?: ThresholdLearner;
  experiments?: ABTestingService;
  seriesLimit?: number;
  tauUDetector?: (args: { intervention: Intervention; goal: Goal | null }) => DetectorResult | null;
})

// Orchestrator constructor - MORE FLEXIBLE
constructor(opts?: {
  baselineService?: BaselineService;
  policies?: AlertPolicies;
  learner?: ThresholdLearner;
  experiments?: ABTestingService;
  candidateGenerator?: CandidateGenerator;  // Extra flexibility
  seriesLimit?: number;
  tauUDetector?: TauUDetectorFunction;
})
```

**Required Changes**:

1. Replace `runDetection()` with `orchestrateDetection()` (or add alias)
2. Update buildAlert to use resultAggregator + alertFinalizer (avoid duplication)
3. Remove duplicate data series and candidate generation methods from Engine

---

### Option B: Thin Wrapper (NOT RECOMMENDED)

Keep runDetection() as thin wrapper around DetectionOrchestrator

**Feasibility**: ✅ **HIGH** but creates unnecessary indirection

**Implementation**:

```typescript
class AlertDetectionEngine {
  private orchestrator: DetectionOrchestrator;

  constructor(opts) {
    this.orchestrator = new DetectionOrchestrator(opts);
  }

  runDetection(input: DetectionInput): AlertEvent[] {
    return this.orchestrator.orchestrateDetection(input);
  }
}
```

**Problems**:

- Adds unnecessary layer of indirection
- Maintains two classes for same functionality
- Confusing for developers (which one to use?)
- Doesn't remove duplication

---

## 5. Dependency Injection Requirements

### Current State

**AlertDetectionEngine** (tight coupling):

```typescript
constructor(opts) {
  this.baselineService = opts?.baselineService ?? new BaselineService();
  this.policies = opts?.policies ?? new AlertPolicies();
  this.learner = opts?.learner ?? new ThresholdLearner();
  this.experiments = opts?.experiments ?? new ABTestingService();
  // No candidate generator - all inline
}
```

**DetectionOrchestrator** (proper DI):

```typescript
constructor(opts) {
  this.baselineService = opts?.baselineService ?? new BaselineService();
  this.policies = opts?.policies ?? new AlertPolicies();
  this.learner = opts?.learner ?? new ThresholdLearner();
  this.experiments = opts?.experiments ?? new ABTestingService();
  this.candidateGenerator = opts?.candidateGenerator ?? new CandidateGenerator({
    cusumConfig,
    seriesLimit: this.seriesLimit,
    tauUDetector: opts?.tauUDetector,
    baselineThresholds: this.baselineThresholds,
  });
}
```

**Orchestrator Advantage**: Can inject custom CandidateGenerator for testing/customization

---

## 6. Configuration Compatibility

### CUSUM Configuration

**Engine**:

```typescript
this.cusumConfig = {
  kFactor: configSource?.kFactor ?? 0.5,
  decisionInterval: configSource?.decisionInterval ?? 5,
};
// Passed to detectors inline
```

**Orchestrator**:

```typescript
const cusumConfig = {
  kFactor: ANALYTICS_CONFIG.alerts?.cusum?.kFactor ?? 0.5,
  decisionInterval: ANALYTICS_CONFIG.alerts?.cusum?.decisionInterval ?? 5,
};
// Passed to CandidateGenerator constructor
```

**Compatibility**: ✅ IDENTICAL - both read from ANALYTICS_CONFIG.alerts.cusum

### Series Limit

**Engine**:

```typescript
this.seriesLimit = Math.max(10, Math.min(365, opts?.seriesLimit ?? MAX_ALERT_SERIES_LENGTH));
```

**Orchestrator**:

```typescript
this.seriesLimit = Math.max(10, Math.min(365, opts?.seriesLimit ?? MAX_ALERT_SERIES_LENGTH));
```

**Compatibility**: ✅ IDENTICAL

### Baseline Thresholds

**Engine**:

```typescript
this.baselineThresholds = { ...DEFAULT_DETECTOR_THRESHOLDS };
```

**Orchestrator**:

```typescript
this.baselineThresholds = { ...DEFAULT_DETECTOR_THRESHOLDS };
```

**Compatibility**: ✅ IDENTICAL

---

## 7. State Management Differences

### Threshold Context Creation

Both use **identical** implementations:

- `resolveExperimentKey()`: Maps AlertKind → experiment key
- `createThresholdContext()`: Assigns experiment variant, records assignment
- `applyThreshold()`: Applies learning + A/B testing adjustments

**Difference**: NONE - implementations are byte-for-byte identical

### Experiment Assignment

Both use **identical** logic:

```typescript
const existing = this.experiments.getAssignment(experimentKey, studentId);
const variant = existing?.variant ?? this.experiments.getVariant(studentId, experimentKey);
if (!existing || existing.variant !== variant) {
  this.experiments.recordAssignment({...});
}
```

**State Management**: ✅ IDENTICAL

---

## 8. Breaking Changes Analysis

### Public API Changes

**If we replace runDetection with orchestrateDetection**:

```typescript
// Before
const engine = new AlertDetectionEngine();
const alerts = engine.runDetection(input);

// After (Option 1: Rename method)
const engine = new DetectionOrchestrator();
const alerts = engine.orchestrateDetection(input);

// After (Option 2: Add alias - NO BREAKING CHANGE)
class DetectionOrchestrator {
  orchestrateDetection(input) { ... }

  // Backward compatibility alias
  runDetection(input) {
    return this.orchestrateDetection(input);
  }
}
```

**Breaking Change Mitigation**: Add `runDetection()` alias to DetectionOrchestrator

### Import Changes

**Before**:

```typescript
import { AlertDetectionEngine } from '@/lib/alerts/engine';
```

**After**:

```typescript
import { DetectionOrchestrator } from '@/lib/alerts/detection';
// OR for backward compatibility:
import { DetectionOrchestrator as AlertDetectionEngine } from '@/lib/alerts/detection';
```

**Breaking Changes**: ✅ NONE if we export alias from engine.ts

---

## 9. Recommended Integration Approach

### Phase 1: Align DetectionOrchestrator with Extracted Modules

**Problem**: DetectionOrchestrator.buildAlert() is inline (66 lines) instead of using
resultAggregator + alertFinalizer

**Solution**: Update DetectionOrchestrator.buildAlert() to match AlertDetectionEngine pattern:

```typescript
// Current DetectionOrchestrator.buildAlert (INLINE - Lines 376-442)
private buildAlert(candidate: AlertCandidate, studentId: string, nowTs: number): AlertEvent {
  const detectors = candidate.detectors;
  const impact = Math.max(...detectors.map((d) => d.score ?? 0), 0);
  const confidence = Math.max(...detectors.map((d) => d.confidence ?? 0), 0);
  const recency = computeRecencyScore(candidate.lastTimestamp, nowTs);
  // ... 60 more lines of inline logic
}

// Recommended: Use extracted modules (like AlertDetectionEngine)
private buildAlert(candidate: AlertCandidate, studentId: string, nowTs: number): AlertEvent {
  // Step 1: Aggregate detector results using weighted formula
  const aggregated = aggregateDetectorResults(
    candidate.detectors,
    candidate.lastTimestamp,
    candidate.tier,
    nowTs,
  );

  // Step 2: Finalize alert event with metadata enrichment and policies
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

**Benefits**:

- Removes 60 lines of duplicate code
- Uses extracted, tested modules
- Consistent with AlertDetectionEngine architecture
- Easier to maintain and test

---

### Phase 2: Replace AlertDetectionEngine with DetectionOrchestrator

**Step 2.1**: Update AlertDetectionEngine to wrap DetectionOrchestrator

```typescript
// File: src/lib/alerts/engine.ts

import { DetectionOrchestrator } from '@/lib/alerts/detection/detectionOrchestrator';
import type { DetectionInput } from '@/lib/alerts/detection';

export class AlertDetectionEngine {
  private readonly orchestrator: DetectionOrchestrator;

  constructor(opts) {
    this.orchestrator = new DetectionOrchestrator({
      baselineService: opts?.baselineService,
      policies: opts?.policies,
      learner: opts?.learner,
      experiments: opts?.experiments,
      seriesLimit: opts?.seriesLimit,
      tauUDetector: opts?.tauUDetector,
      candidateGenerator: opts?.candidateGenerator,
    });
  }

  runDetection(input: DetectionInput): AlertEvent[] {
    return this.orchestrator.orchestrateDetection(input);
  }
}

// Export both for backward compatibility
export { DetectionOrchestrator };
export default AlertDetectionEngine;
```

**Step 2.2**: Remove all duplicate methods from AlertDetectionEngine

Delete these methods (now handled by DetectionOrchestrator/CandidateGenerator):

- `buildEmotionSeries()` (18 lines)
- `buildSensoryAggregates()` (25 lines)
- `buildAssociationDataset()` (54 lines)
- `buildBurstEvents()` (32 lines)
- `buildEmotionCandidates()` (65 lines)
- `buildSensoryCandidates()` (52 lines)
- `buildAssociationCandidates()` (37 lines)
- `buildBurstCandidates()` (27 lines)
- `detectInterventionOutcomes()` (80 lines)
- `applyThreshold()` (52 lines)
- `createThresholdContext()` (18 lines)
- `resolveExperimentKey()` (13 lines)
- `buildAlert()` (19 lines)
- `computeDetectionQuality()` (8 lines)
- `computeSeriesStats()` (26 lines)
- `safeDetect()` (8 lines)
- `lookupEmotionBaseline()` (11 lines)
- `lookupSensoryBaseline()` (11 lines)

**Total Lines Removed**: ~556 lines

**New AlertDetectionEngine Size**: ~277 lines → ~30 lines (wrapper only)

**Code Reduction**: **91%**

---

### Phase 3: Deprecation Path (Future)

**6 months after Phase 2**:

1. Mark AlertDetectionEngine as deprecated:

```typescript
/** @deprecated Use DetectionOrchestrator instead. Will be removed in v3.0.0 */
export class AlertDetectionEngine { ... }
```

2. Update all internal usages to DetectionOrchestrator

3. **v3.0.0**: Remove AlertDetectionEngine entirely, keep only DetectionOrchestrator

---

## 10. Integration Code Example

### Updated DetectionOrchestrator.buildAlert()

```typescript
// File: src/lib/alerts/detection/detectionOrchestrator.ts

import { aggregateDetectorResults } from './resultAggregator';
import { finalizeAlertEvent } from './alertFinalizer';

export class DetectionOrchestrator {
  // ... existing code ...

  /**
   * Build alert event from candidate.
   * Uses extracted aggregation and finalization modules for consistency.
   */
  private buildAlert(candidate: AlertCandidate, studentId: string, nowTs: number): AlertEvent {
    // Step 1: Aggregate detector results using weighted formula
    const aggregated = aggregateDetectorResults(
      candidate.detectors,
      candidate.lastTimestamp,
      candidate.tier,
      nowTs,
    );

    // Step 2: Finalize alert event with metadata enrichment and policies
    return finalizeAlertEvent(candidate, aggregated, studentId, {
      seriesLimit: this.seriesLimit,
      policies: this.policies,
    });
  }

  // Remove computeSeriesStats() - now in alertFinalizer
}
```

**Changes**:

- Remove 66 lines of inline buildAlert logic
- Add 2 import statements
- Replace buildAlert implementation with 2 function calls
- Remove computeSeriesStats (now in alertFinalizer)

**Net Change**: -60 lines

---

### Updated AlertDetectionEngine (Wrapper)

```typescript
// File: src/lib/alerts/engine.ts

import { DetectionOrchestrator, type DetectionInput } from '@/lib/alerts/detection';
import type { AlertEvent } from '@/lib/alerts/types';
import type { BaselineService } from '@/lib/alerts/baseline';
import type { AlertPolicies } from '@/lib/alerts/policies';
import type { ThresholdLearner } from '@/lib/alerts/learning/thresholdLearner';
import type { ABTestingService } from '@/lib/alerts/experiments/abTesting';
import type { CandidateGenerator, TauUDetectorFunction } from '@/lib/alerts/detection';

/**
 * AlertDetectionEngine
 *
 * Orchestrates multiple statistical detectors (EWMA, CUSUM, beta-binomial, association,
 * burst, Tau-U) to produce ranked, policy-governed alert events for a given student.
 *
 * This class now delegates to DetectionOrchestrator for all detection logic.
 * It is maintained for backward compatibility.
 *
 * @deprecated Consider using DetectionOrchestrator directly for better flexibility
 */
export class AlertDetectionEngine {
  private readonly orchestrator: DetectionOrchestrator;

  constructor(opts?: {
    baselineService?: BaselineService;
    policies?: AlertPolicies;
    cusumConfig?: { kFactor: number; decisionInterval: number };
    learner?: ThresholdLearner;
    experiments?: ABTestingService;
    seriesLimit?: number;
    tauUDetector?: TauUDetectorFunction;
    candidateGenerator?: CandidateGenerator;
  }) {
    // Convert cusumConfig to candidateGenerator config if needed
    let candidateGenerator = opts?.candidateGenerator;
    if (!candidateGenerator && opts?.cusumConfig) {
      candidateGenerator = new CandidateGenerator({
        cusumConfig: opts.cusumConfig,
        seriesLimit: opts.seriesLimit,
        tauUDetector: opts.tauUDetector,
      });
    }

    this.orchestrator = new DetectionOrchestrator({
      baselineService: opts?.baselineService,
      policies: opts?.policies,
      learner: opts?.learner,
      experiments: opts?.experiments,
      seriesLimit: opts?.seriesLimit,
      tauUDetector: opts?.tauUDetector,
      candidateGenerator,
    });
  }

  /**
   * Run the full detection pipeline for a single student.
   * Delegates to DetectionOrchestrator.orchestrateDetection()
   */
  runDetection(input: DetectionInput): AlertEvent[] {
    return this.orchestrator.orchestrateDetection(input);
  }
}

// Re-export for backward compatibility
export { DetectionOrchestrator };
export type { DetectionInput };
export default AlertDetectionEngine;
```

**Total Size**: ~60 lines (vs 833 lines before)

**Reduction**: **93%**

---

## 11. Migration Complexity Assessment

### Complexity: MEDIUM

**Why Medium and not Low**:

1. Need to update DetectionOrchestrator.buildAlert() to use extracted modules (Phase 1)
2. Need to refactor AlertDetectionEngine to wrapper pattern (Phase 2)
3. Need to update tests to verify behavioral equivalence
4. Need to update any direct imports of AlertDetectionEngine internals

**Why Not High**:

1. Public APIs are identical (no consumer changes needed)
2. No database migrations or data transformations
3. No configuration file changes
4. All dependencies already exist

---

### Migration Steps Checklist

- [ ] **Phase 1: Align DetectionOrchestrator** (2-3 hours)
  - [ ] Update DetectionOrchestrator.buildAlert() to use resultAggregator + alertFinalizer
  - [ ] Remove computeSeriesStats() from DetectionOrchestrator (use alertFinalizer version)
  - [ ] Add imports for aggregateDetectorResults and finalizeAlertEvent
  - [ ] Run tests to verify behavioral equivalence

- [ ] **Phase 2: Refactor AlertDetectionEngine** (1-2 hours)
  - [ ] Convert AlertDetectionEngine to wrapper around DetectionOrchestrator
  - [ ] Remove all inline methods (556 lines)
  - [ ] Update constructor to pass cusumConfig properly
  - [ ] Add re-exports for backward compatibility
  - [ ] Run all AlertDetectionEngine tests

- [ ] **Phase 3: Update Tests** (2-3 hours)
  - [ ] Verify all engine.test.ts tests still pass
  - [ ] Add tests for DetectionOrchestrator.orchestrateDetection()
  - [ ] Add tests for wrapper behavior
  - [ ] Add integration tests comparing Engine vs Orchestrator output

- [ ] **Phase 4: Update Documentation** (1 hour)
  - [ ] Update CLAUDE.md to recommend DetectionOrchestrator
  - [ ] Add migration guide for developers
  - [ ] Update inline documentation

**Total Estimated Time**: 6-9 hours

---

## 12. Benefits vs Risks

### Benefits ✅

1. **Code Reduction**: 91% reduction in AlertDetectionEngine (833 → 60 lines)
2. **Eliminate Duplication**: Remove ~550 lines of duplicate code
3. **Improved Architecture**: Proper separation of concerns via extracted modules
4. **Better Testability**: Each module can be tested independently
5. **Easier Maintenance**: Changes to detection logic only need to happen in one place
6. **Consistent Patterns**: All components use the same extracted modules
7. **Dependency Injection**: Better testing and configuration flexibility
8. **No Breaking Changes**: Wrapper maintains backward compatibility

### Risks ⚠️

1. **Behavioral Differences**: Need to verify DetectionOrchestrator produces identical results
   - **Mitigation**: Comprehensive integration tests comparing outputs
   - **Severity**: Medium - testable and verifiable

2. **Performance Changes**: Additional function call overhead from wrapper
   - **Mitigation**: Modern JS engines optimize this away
   - **Severity**: Low - negligible impact

3. **Test Coverage**: Need to ensure all edge cases are covered
   - **Mitigation**: Run both test suites, add comparison tests
   - **Severity**: Low - existing tests provide coverage

4. **Developer Confusion**: Two ways to do the same thing (during transition)
   - **Mitigation**: Clear documentation, deprecation warnings
   - **Severity**: Low - temporary during migration

5. **Undiscovered Dependencies**: Some code might depend on AlertDetectionEngine internals
   - **Mitigation**: Search codebase for direct method calls before refactoring
   - **Severity**: Medium - requires investigation

---

## 13. Pre-Migration Investigation Needed

Before implementing, investigate:

### 1. Direct Usage of AlertDetectionEngine Internals

Search for direct method calls to private methods:

```bash
# Check if any code accesses AlertDetectionEngine internals
grep -r "engine\.build" src/
grep -r "engine\.detect" src/
grep -r "engine\.apply" src/
grep -r "engine\.create" src/
grep -r "engine\.compute" src/
grep -r "engine\.lookup" src/
```

**Expected**: Only runDetection() should be called externally

### 2. Test Dependencies

Check test files for dependencies on internal methods:

```bash
# Check test files
grep -r "buildEmotionSeries" src/**/*.test.ts
grep -r "buildSensoryAggregates" src/**/*.test.ts
grep -r "applyThreshold" src/**/*.test.ts
```

**Action Needed**: Update tests to use DetectionOrchestrator equivalents

### 3. Performance Benchmarks

If performance tests exist, run before/after comparison:

```bash
npm run test:performance
```

**Expected**: No significant performance regression (<5% acceptable)

---

## 14. Alternative Approaches Considered

### Alternative 1: Keep Both Classes (NOT RECOMMENDED)

**Pros**:

- No migration needed
- No risk of breaking changes

**Cons**:

- Maintains code duplication
- Confuses developers (which one to use?)
- Double maintenance burden
- Architectural inconsistency

**Verdict**: ❌ Defeats purpose of refactoring

---

### Alternative 2: Merge Both into Single Class (NOT RECOMMENDED)

**Pros**:

- Single source of truth
- No wrapper overhead

**Cons**:

- Creates massive monolith class
- Loses modular architecture benefits
- Harder to test individual components
- Reverses the extraction work done in Phase 1

**Verdict**: ❌ Goes against modular design principles

---

### Alternative 3: Gradual Method-by-Method Replacement (NOT RECOMMENDED)

**Pros**:

- Lower risk per change
- Easier to isolate failures

**Cons**:

- Long transition period with mixed architecture
- Partial duplication remains
- More complex to track progress
- Higher total effort (multiple PRs, reviews)

**Verdict**: ❌ Migration is straightforward enough to do in one phase

---

## 15. Recommended Implementation Order

### Sprint 1: Preparation and Alignment

**Week 1**:

1. Run pre-migration investigation (Section 13)
2. Update DetectionOrchestrator.buildAlert() to use extracted modules (Phase 1)
3. Add comprehensive integration tests comparing Engine vs Orchestrator
4. Verify behavioral equivalence

**Deliverables**:

- [ ] DetectionOrchestrator uses resultAggregator + alertFinalizer
- [ ] Integration tests prove equivalence
- [ ] Investigation report on internal method usage

---

### Sprint 2: Refactoring and Migration

**Week 2**:

1. Convert AlertDetectionEngine to wrapper pattern
2. Remove all duplicate methods
3. Update tests to pass with new implementation
4. Add backward compatibility exports

**Deliverables**:

- [ ] AlertDetectionEngine is thin wrapper (~60 lines)
- [ ] All tests pass
- [ ] No breaking changes for consumers
- [ ] Code reduction: 91%

---

### Sprint 3: Documentation and Cleanup

**Week 3**:

1. Update documentation (CLAUDE.md, inline docs)
2. Add migration guide
3. Add deprecation warnings
4. Update any remaining direct usages

**Deliverables**:

- [ ] Updated documentation
- [ ] Migration guide published
- [ ] Deprecation warnings in place
- [ ] All internal code uses DetectionOrchestrator

---

## 16. Success Criteria

### Technical Criteria

- [ ] All existing tests pass without modification
- [ ] DetectionOrchestrator produces byte-identical output to AlertDetectionEngine
- [ ] Code coverage remains at or above current levels
- [ ] No performance regression (within 5%)
- [ ] No breaking changes to public API

### Code Quality Criteria

- [ ] AlertDetectionEngine reduced to <100 lines
- [ ] Zero duplicate code between Engine and Orchestrator
- [ ] All components use extracted modules consistently
- [ ] TypeScript compiles with no errors
- [ ] ESLint passes with no new warnings

### Documentation Criteria

- [ ] CLAUDE.md updated with new patterns
- [ ] Migration guide published
- [ ] Inline documentation complete
- [ ] Deprecation warnings clear and helpful

---

## 17. Conclusion

**Recommended Approach**: Full replacement via wrapper pattern

**Key Actions**:

1. ✅ Update DetectionOrchestrator to use resultAggregator + alertFinalizer (align architecture)
2. ✅ Convert AlertDetectionEngine to thin wrapper around DetectionOrchestrator (eliminate
   duplication)
3. ✅ Maintain backward compatibility via wrapper (zero breaking changes)
4. ⏳ Deprecate AlertDetectionEngine in future release (migration path)

**Benefits**:

- 91% code reduction in AlertDetectionEngine
- Eliminate ~550 lines of duplicate code
- Consistent architecture across all modules
- Better testability and maintainability
- Zero breaking changes

**Complexity**: Medium (6-9 hours implementation + testing)

**Risk Level**: Low (backward compatible, well-tested, straightforward refactoring)

---

## 18. Next Steps for Implementation Agent

The implementation agent (Agent 4) should:

1. **Phase 1** (Priority 1): Update DetectionOrchestrator.buildAlert()
   - Replace inline implementation with aggregateDetectorResults + finalizeAlertEvent
   - Remove computeSeriesStats() method
   - Add necessary imports
   - Verify tests pass

2. **Phase 2** (Priority 2): Convert AlertDetectionEngine to wrapper
   - Create wrapper implementation
   - Remove all duplicate methods
   - Add re-exports for backward compatibility
   - Verify all tests pass

3. **Phase 3** (Priority 3): Add integration tests
   - Test AlertDetectionEngine wrapper behavior
   - Test output equivalence with DetectionOrchestrator
   - Test all edge cases and error conditions

4. **Phase 4** (Priority 4): Update documentation
   - Update CLAUDE.md
   - Add deprecation notices
   - Create migration guide

**Files to Modify**:

- `/home/user/kreativium-analytics/src/lib/alerts/detection/detectionOrchestrator.ts` (Phase 1)
- `/home/user/kreativium-analytics/src/lib/alerts/engine.ts` (Phase 2)
- `/home/user/kreativium-analytics/CLAUDE.md` (Phase 4)

**Files to Create**:

- Integration test file comparing Engine vs Orchestrator outputs

---

**Analysis Complete** ✅

Generated by: Agent 3 - DetectionOrchestrator Integration Analysis Ready for: Agent 4 -
Implementation
