# Manager Integration Quick Reference

Quick implementation guide for integrating `StudentAnalyticsOrchestrator` into `AnalyticsManagerService`.

## Step 1: Import Orchestrator Dependencies

```typescript
import {
  StudentAnalyticsOrchestrator,
  createStudentAnalyticsOrchestrator,
  createProfileManagerAdapter,
} from '@/lib/analytics/orchestration';
import { calculateHealthScore } from '@/lib/analytics/health';
import { getProfileMap, initializeStudentProfile, saveProfiles } from '@/lib/analyticsProfiles';
```

## Step 2: Add Orchestrator Property

```typescript
class AnalyticsManagerService {
  private static instance: AnalyticsManagerService;
  private analyticsProfiles: AnalyticsProfileMap;
  private analyticsCache: AnalyticsCache = new Map();
  private storage: IDataStorage;
  private analyticsRunner: AnalyticsRunner;
  
  // ADD THIS:
  private orchestrator: StudentAnalyticsOrchestrator;
  
  // ... rest of class ...
}
```

## Step 3: Initialize Orchestrator in Constructor

```typescript
private constructor(storage: IDataStorage, profiles: AnalyticsProfileMap) {
  this.storage = storage;
  this.analyticsProfiles = profiles;
  this.analyticsRunner = new AnalyticsRunner({
    storage: this.storage,
    createAnalysisEngine,
  });
  
  // ADD THIS:
  this.orchestrator = createStudentAnalyticsOrchestrator({
    runner: this.analyticsRunner,
    profileManager: createProfileManagerAdapter({
      initialize: initializeStudentProfile,
      getMap: getProfileMap,
      save: saveProfiles,
    }),
    healthCalculator: calculateHealthScore,
  });
}
```

## Step 4: Refactor getStudentAnalytics (Thin Wrapper)

### BEFORE (72 lines)
```typescript
public async getStudentAnalytics(student: Student, options?: { useAI?: boolean }): Promise<AnalyticsResults> {
  this.initializeStudentAnalytics(student.id);
  
  // Check TTL cache for existing results (unless disabled)
  const ttlDisabled = this.isManagerTtlCacheDisabled();
  if (!ttlDisabled) {
    const cached = this.analyticsCache.get(student.id);
    if (cached) {
      const now = new Date();
      const cacheAge = now.getTime() - cached.timestamp.getTime();
      const liveCfg = (() => { try { return analyticsConfig.getConfig(); } catch { return null; } })();
      const ttl = liveCfg?.cache?.ttl ?? ANALYTICS_CONFIG.cache.ttl;
      const preferAI = options?.useAI === true;
      const preferHeuristic = options?.useAI === false;
      
      const provider = (cached.results as any)?.ai?.provider;
      const isCachedAI = typeof provider === 'string' && provider.toLowerCase() !== 'heuristic';
      
      if (cacheAge < ttl) {
        // Emit deprecation notice
        try {
          const key = `ttl_warn_${student.id}`;
          const nowMs = Date.now();
          const last = __ttlDeprecationWarnWindow.get(key) ?? 0;
          if (nowMs - last > 60_000) {
            logger.warn('[analyticsManager] Using deprecated manager TTL cache...');
            __ttlDeprecationWarnWindow.set(key, nowMs);
          }
        } catch { /* noop */ }
        
        if (preferHeuristic) {
          if (!isCachedAI) {
            return cached.results;
          }
        } else if (preferAI) {
          if (isCachedAI) {
            return cached.results;
          }
        } else {
          return cached.results;
        }
      }
    }
  }
  
  const results = await this.analyticsRunner.run(student, options?.useAI);
  if (!this.isManagerTtlCacheDisabled()) {
    this.analyticsCache.set(student.id, { results, timestamp: new Date() });
  } else {
    try {
      logger.info('[analyticsManager] Manager TTL cache disabled; not storing results.');
    } catch { /* noop */ }
  }
  
  const profile = this.analyticsProfiles.get(student.id);
  if (profile) {
    const updatedProfile: StudentAnalyticsProfile = {
      ...profile,
      lastAnalyzedAt: new Date(),
      analyticsHealthScore: this.calculateHealthScore(results),
    };
    this.analyticsProfiles.set(student.id, updatedProfile);
    saveProfiles();
  }
  
  return results;
}
```

### AFTER (25 lines)
```typescript
public async getStudentAnalytics(student: Student, options?: { useAI?: boolean }): Promise<AnalyticsResults> {
  // Step 1: Check TTL cache (deprecated)
  const ttlDisabled = this.isManagerTtlCacheDisabled();
  if (!ttlDisabled) {
    const cached = this.checkTtlCache(student.id, options);
    if (cached) {
      this.emitTtlDeprecationWarning(student.id);
      return cached.results;
    }
  }
  
  // Step 2: Delegate to orchestrator (cache-agnostic)
  const results = await this.orchestrator.getAnalytics(student, options);
  
  // Step 3: Update TTL cache if enabled
  if (!ttlDisabled) {
    this.analyticsCache.set(student.id, { results, timestamp: new Date() });
  } else {
    try {
      logger.info('[analyticsManager] Manager TTL cache disabled; not storing results.');
    } catch { /* noop */ }
  }
  
  return results;
}
```

## Step 5: Add Helper Methods

```typescript
/**
 * Check TTL cache for valid entry considering AI preferences.
 * @private
 */
private checkTtlCache(
  studentId: string,
  options?: { useAI?: boolean }
): { results: AnalyticsResultsCompat; timestamp: Date } | null {
  const cached = this.analyticsCache.get(studentId);
  if (!cached) return null;
  
  // Check TTL
  const now = new Date();
  const cacheAge = now.getTime() - cached.timestamp.getTime();
  const liveCfg = (() => { try { return analyticsConfig.getConfig(); } catch { return null; } })();
  const ttl = liveCfg?.cache?.ttl ?? ANALYTICS_CONFIG.cache.ttl;
  
  if (cacheAge >= ttl) return null;
  
  // Check AI preferences
  const preferAI = options?.useAI === true;
  const preferHeuristic = options?.useAI === false;
  const provider = (cached.results as any)?.ai?.provider;
  const isCachedAI = typeof provider === 'string' && provider.toLowerCase() !== 'heuristic';
  
  if (preferHeuristic && isCachedAI) return null;
  if (preferAI && !isCachedAI) return null;
  
  return cached;
}

/**
 * Emit rate-limited TTL deprecation warning.
 * @private
 */
private emitTtlDeprecationWarning(studentId: string): void {
  try {
    const key = `ttl_warn_${studentId}`;
    const nowMs = Date.now();
    const last = __ttlDeprecationWarnWindow.get(key) ?? 0;
    if (nowMs - last > 60_000) {
      logger.warn(
        '[analyticsManager] Using deprecated manager TTL cache for student. ' +
        'Migrate to useAnalyticsWorker + usePerformanceCache. ' +
        'Set VITE_DISABLE_MANAGER_TTL_CACHE=true to test disabling.',
        { studentId }
      );
      __ttlDeprecationWarnWindow.set(key, nowMs);
    }
  } catch {
    // noop
  }
}
```

## Step 6: Refactor triggerAnalyticsForStudent

### BEFORE (13 lines)
```typescript
public async triggerAnalyticsForStudent(student: Student): Promise<void> {
  try {
    if (!student || !student.id) {
      logger.warn('[analyticsManager] triggerAnalyticsForStudent: invalid student', { student });
      return;
    }
    this.analyticsCache.delete(student.id);
    await this.getStudentAnalytics(student);
  } catch (error) {
    logger.error('[analyticsManager] triggerAnalyticsForStudent failed', { error, studentId: student?.id });
  }
}
```

### AFTER (10 lines)
```typescript
public async triggerAnalyticsForStudent(student: Student): Promise<void> {
  try {
    if (!student || !student.id) {
      logger.warn('[analyticsManager] triggerAnalyticsForStudent: invalid student', { student });
      return;
    }
    this.analyticsCache.delete(student.id);
    await this.orchestrator.triggerAnalysis(student);
  } catch (error) {
    logger.error('[analyticsManager] triggerAnalyticsForStudent failed', { error, studentId: student?.id });
  }
}
```

## Step 7: Simplify initializeStudentAnalytics

### BEFORE (37 lines)
```typescript
public initializeStudentAnalytics(studentId: string): void {
  try {
    if (!studentId || typeof studentId !== 'string') {
      logger.warn('[analyticsManager] initializeStudentAnalytics: invalid studentId', { studentId });
      return;
    }
    
    if (this.analyticsProfiles.has(studentId)) {
      return;
    }
    
    const profile: StudentAnalyticsProfile = {
      studentId,
      isInitialized: true,
      lastAnalyzedAt: null,
      analyticsConfig: {
        patternAnalysisEnabled: true,
        correlationAnalysisEnabled: true,
        predictiveInsightsEnabled: true,
        anomalyDetectionEnabled: true,
        alertSystemEnabled: true,
      },
      minimumDataRequirements: {
        emotionEntries: 1,
        sensoryEntries: 1,
        trackingEntries: 1,
      },
      analyticsHealthScore: 0,
    };
    
    this.analyticsProfiles.set(studentId, profile);
    saveProfiles();
  } catch (error) {
    logger.error('[analyticsManager] initializeStudentAnalytics failed', { error, studentId });
  }
}
```

### AFTER (1 line)
```typescript
public initializeStudentAnalytics(studentId: string): void {
  this.orchestrator.initializeProfile(studentId);
}
```

## Summary of Changes

| Method | Before | After | Reduction |
|--------|--------|-------|-----------|
| getStudentAnalytics() | 72 lines | 25 lines | -66% |
| triggerAnalyticsForStudent() | 13 lines | 10 lines | -23% |
| initializeStudentAnalytics() | 37 lines | 1 line | -97% |
| **Total** | **122 lines** | **36 lines** | **-70%** |

## Testing Checklist

- [ ] Existing tests still pass
- [ ] getStudentAnalytics() returns same results
- [ ] TTL cache still works when enabled
- [ ] TTL cache bypass works when disabled
- [ ] AI options still respected
- [ ] Profile initialization works
- [ ] Profile updates work
- [ ] Health score calculation works
- [ ] triggerAnalyticsForStudent() works
- [ ] Backward compatibility maintained

## Rollback Plan

If issues arise:
1. Revert manager changes
2. Remove orchestrator initialization
3. Existing code continues to work
4. No data loss (cache/profiles unchanged)

## Feature Flags

Control migration with environment variables:
```bash
# Disable manager TTL cache to test orchestrator-only path
VITE_DISABLE_MANAGER_TTL_CACHE=true

# Or in analyticsConfig
{
  "cache": {
    "disableManagerTTLCache": true
  }
}
```

## Next Steps After Integration

1. Add unit tests for orchestrator
2. Update integration tests
3. Monitor performance metrics
4. Gradually migrate hooks to orchestrator
5. Plan manager TTL cache deprecation
