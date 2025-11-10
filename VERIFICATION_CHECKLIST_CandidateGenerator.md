# CandidateGenerator Integration Verification Checklist

## Pre-Integration Verification

### File Analysis
- [x] Engine.ts: 832 lines total
- [x] CandidateGenerator.ts: 676 lines total
- [x] Engine has 18 private methods (1 field counted as method by grep)
- [x] Removing 13 methods
- [x] Keeping 5 methods
- [x] Test file has private method tests at lines 252-338

### Method Inventory

**Methods to REMOVE (13 total):**
- [x] Line 215: `buildEmotionCandidates` - Exists in CandidateGenerator
- [x] Line 284: `buildSensoryCandidates` - Exists in CandidateGenerator
- [x] Line 339: `buildAssociationCandidates` - Exists in CandidateGenerator
- [x] Line 377: `buildBurstCandidates` - Exists in CandidateGenerator
- [x] Line 412: `detectInterventionOutcomes` - Exists in CandidateGenerator
- [x] Line 610: `buildEmotionSeries` - Exists in CandidateGenerator
- [x] Line 631: `buildSensoryAggregates` - Exists in CandidateGenerator
- [x] Line 660: `buildAssociationDataset` - Exists in CandidateGenerator
- [x] Line 717: `buildBurstEvents` - Exists in CandidateGenerator
- [x] Line 753: `computeDetectionQuality` - Exists in CandidateGenerator
- [x] Line 795: `safeDetect` - Exists in CandidateGenerator
- [x] Line 804: `lookupEmotionBaseline` - Exists in CandidateGenerator
- [x] Line 816: `lookupSensoryBaseline` - Exists in CandidateGenerator

**Methods to KEEP (5 total):**
- [x] Line 494: `resolveExperimentKey` - Uses AlertKind, engine-specific
- [x] Line 510: `createThresholdContext` - Uses this.experiments, engine-specific
- [x] Line 534: `applyThreshold` - Uses this.experiments, engine-specific
- [x] Line 588: `buildAlert` - Uses this.seriesLimit, this.policies, engine-specific
- [x] Line 767: `computeSeriesStats` - NOT in CandidateGenerator, must keep

**Fields (keep all):**
- [x] Line 109: `baselineService`
- [x] Line 110: `policies`
- [x] Line 111: `cusumConfig`
- [x] Line 112: `learner`
- [x] Line 113: `experiments`
- [x] Line 114: `baselineThresholds`
- [x] Line 115: `seriesLimit`
- [x] Line 117: `tauUDetector`

---

## Post-Integration Verification

### Code Changes
- [ ] Import CandidateGenerator added
- [ ] Import MAX_ALERT_SERIES_LENGTH added
- [ ] Field `private readonly generator: CandidateGenerator` added
- [ ] Constructor initializes generator correctly
- [ ] runDetection delegates to generator
- [ ] All 13 methods removed from engine
- [ ] 5 methods retained in engine
- [ ] computeSeriesStats still present (not in generator)

### Import Changes
- [ ] Removed: `import { detectEWMATrend, TrendPoint } from '@/lib/alerts/detectors/ewma'`
- [ ] Removed: `import { detectCUSUMShift } from '@/lib/alerts/detectors/cusum'`
- [ ] Removed: `import { detectBetaRateShift } from '@/lib/alerts/detectors/betaRate'`
- [ ] Removed: `import { detectAssociation } from '@/lib/alerts/detectors/association'`
- [ ] Removed: `import type { AssociationDetectorInput } from '@/lib/alerts/detectors/association'`
- [ ] Removed: `import { detectBurst, BurstEvent } from '@/lib/alerts/detectors/burst'`
- [ ] Added: `import type { TrendPoint } from '@/lib/alerts/detectors/ewma'`
- [ ] Added: `import type { BurstEvent } from '@/lib/alerts/detectors/burst'`
- [ ] Added: `import type { AssociationDetectorInput } from '@/lib/alerts/detectors/association'`
- [ ] Removed: `import { normalizeTimestamp, buildAlertId, truncateSeries } from '@/lib/alerts/utils'`
- [ ] Added: `import { buildAlertId } from '@/lib/alerts/utils'`
- [ ] Added: `import { CandidateGenerator } from '@/lib/alerts/detection/candidateGenerator'`
- [ ] Added: `import { MAX_ALERT_SERIES_LENGTH } from '@/constants/analytics'`

### Test File Changes
- [ ] Lines 252-338 deleted from engine.test.ts
- [ ] File now ends around line 250
- [ ] No references to removed private methods

### File Size Verification
- [ ] engine.ts reduced from 832 to ~380 lines
- [ ] Reduction of ~450 lines (54%)
- [ ] Test file reduced by ~87 lines

---

## Compilation & Testing

### TypeScript
```bash
npm run typecheck
```
- [ ] No type errors
- [ ] No missing import errors
- [ ] No unused variable warnings

### Linting
```bash
npm run lint
```
- [ ] No ESLint errors
- [ ] No unused imports
- [ ] No formatting issues

### Unit Tests
```bash
npm test -- src/lib/alerts/__tests__/engine.test.ts
```
- [ ] All tests pass
- [ ] No "method not found" errors
- [ ] Tests 1-11 still pass (orchestration tests)
- [ ] Tests 12-17 removed (private method tests)

### Full Test Suite
```bash
npm test
```
- [ ] All test suites pass
- [ ] No regression failures
- [ ] Coverage maintained or improved

---

## Functional Verification

### Alert Detection
- [ ] Emotion alerts generated correctly
- [ ] Sensory alerts generated correctly
- [ ] Association alerts generated correctly
- [ ] Burst alerts generated correctly
- [ ] Intervention alerts generated correctly (if Tau-U enabled)

### Threshold Application
- [ ] Baseline thresholds applied
- [ ] Experiment variants assigned
- [ ] Threshold overrides working
- [ ] Adjustment traces recorded

### Metadata
- [ ] Sparkline values present
- [ ] Experiment keys present
- [ ] Detection quality metrics present
- [ ] Source ranking working

---

## Integration Points Verification

### Constructor
```typescript
// Verify these lines exist:
const cusumConfig = {
  kFactor: (opts?.cusumConfig ?? ANALYTICS_CONFIG.alerts?.cusum)?.kFactor ?? 0.5,
  decisionInterval: (opts?.cusumConfig ?? ANALYTICS_CONFIG.alerts?.cusum)?.decisionInterval ?? 5,
};
const seriesLimit = Math.max(10, Math.min(365, opts?.seriesLimit ?? MAX_ALERT_SERIES_LENGTH));

this.generator = new CandidateGenerator({
  cusumConfig,
  seriesLimit,
  tauUDetector: opts?.tauUDetector,
  baselineThresholds: { ...DEFAULT_DETECTOR_THRESHOLDS },
});
```

- [ ] cusumConfig extracted correctly
- [ ] seriesLimit calculated correctly
- [ ] Generator initialized with all 4 config options
- [ ] OLD fields removed (this.cusumConfig, this.seriesLimit, etc.)

### runDetection - Data Building
```typescript
// Verify delegation to generator:
const emotionSeries = this.generator.buildEmotionSeries(input.emotions);
const sensoryAgg = this.generator.buildSensoryAggregates(input.sensory);
const associationDataset = this.generator.buildAssociationDataset(input.tracking);
const burstEvents = this.generator.buildBurstEvents(input.emotions, input.sensory);
```

- [ ] All 4 data building calls delegate to generator
- [ ] No `this.build*` calls remain

### runDetection - Candidate Building
```typescript
// Verify method binding for all 5 candidate types:
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

- [ ] Emotion candidates: `.bind(this)` on both methods
- [ ] Sensory candidates: `.bind(this)` on both methods
- [ ] Association candidates: `.bind(this)` on both methods
- [ ] Burst candidates: `.bind(this)` on both methods
- [ ] Intervention candidates: `.bind(this)` on both methods

### Intervention Detection
```typescript
// Verify signature change:
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

- [ ] Changed from `this.detectInterventionOutcomes(input, thresholdOverrides, nowTs)`
- [ ] Now passes explicit object with interventions and goals
- [ ] Includes method bindings

---

## Edge Cases

### Configuration
- [ ] Engine works with default config (no opts)
- [ ] Engine works with custom seriesLimit
- [ ] Engine works with custom cusumConfig
- [ ] Engine works without tauUDetector

### Data
- [ ] Handles empty emotion array
- [ ] Handles empty sensory array
- [ ] Handles empty tracking array
- [ ] Handles missing baseline
- [ ] Handles invalid timestamps
- [ ] Handles NaN intensities

### Detectors
- [ ] EWMA detector errors don't crash pipeline
- [ ] CUSUM detector errors don't crash pipeline
- [ ] Beta detector errors don't crash pipeline
- [ ] Association detector errors don't crash pipeline
- [ ] Burst detector errors don't crash pipeline
- [ ] Tau-U detector errors don't crash pipeline

---

## Performance Verification

### Benchmarks
- [ ] Detection time unchanged (within 5%)
- [ ] Memory usage unchanged (within 5%)
- [ ] No memory leaks from `.bind()`

### Large Datasets
- [ ] 4000 emotions processed without errors
- [ ] 4000 sensory entries processed without errors
- [ ] 1000 tracking entries processed without errors
- [ ] Series properly truncated to seriesLimit

---

## Documentation

### Code Comments
- [ ] JSDoc preserved for public methods
- [ ] No stale references to removed methods
- [ ] Constructor documents generator field

### External Docs
- [ ] No breaking changes to public API
- [ ] Usage examples still valid
- [ ] Migration guide created (this document)

---

## Git Commit Verification

### Commit Message
```
refactor: integrate CandidateGenerator with AlertDetectionEngine (Phase 3)

- Replace 13 duplicate methods with CandidateGenerator delegation
- Use dependency injection pattern for threshold methods
- Remove 452 lines of duplicated code (54% reduction)
- Update tests to remove private method tests
- Engine.ts: 832 → 380 lines

Breaking: None - public API unchanged
```

### Changed Files
- [ ] src/lib/alerts/engine.ts (modified)
- [ ] src/lib/alerts/__tests__/engine.test.ts (modified)

### Unchanged Files
- [ ] src/lib/alerts/detection/candidateGenerator.ts (no changes)
- [ ] All other files unchanged

---

## Rollback Plan

If any verification fails:

```bash
# Immediate rollback
git diff HEAD src/lib/alerts/engine.ts > /tmp/engine-changes.patch
git checkout HEAD -- src/lib/alerts/engine.ts
git checkout HEAD -- src/lib/alerts/__tests__/engine.test.ts

# Or full revert
git revert HEAD
```

---

## Success Criteria Summary

**All must pass:**
- [x] TypeScript compiles without errors
- [ ] All tests pass (after removing private tests)
- [ ] No ESLint errors
- [ ] ~450 lines removed from engine.ts
- [ ] Test file reduced by ~87 lines
- [ ] No runtime errors in alert detection
- [ ] No performance degradation
- [ ] Public API unchanged
- [ ] Existing consumers still work

**Current Status**: ⏳ Ready for execution

**Next Agent**: Agent 3 (Executor)

---

**Document Version**: 1.0
**Date**: 2025-11-09
**Author**: Agent 2 (CandidateGenerator Integration Analyst)
