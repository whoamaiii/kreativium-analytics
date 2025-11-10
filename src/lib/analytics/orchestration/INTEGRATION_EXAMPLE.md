# Manager Integration with Student Analytics Orchestrator

## Overview

This document demonstrates how `AnalyticsManagerService` integrates with the new
`StudentAnalyticsOrchestrator` to achieve clean separation between cache management and
orchestration logic.

## Current Architecture (Before Phase 2b)

```typescript
class AnalyticsManagerService {
  async getStudentAnalytics(student: Student, options?: { useAI?: boolean }) {
    // 1. Initialize profile
    this.initializeStudentAnalytics(student.id);

    // 2. Check TTL cache
    const ttlDisabled = this.isManagerTtlCacheDisabled();
    if (!ttlDisabled) {
      const cached = this.analyticsCache.get(student.id);
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached.results;
      }
    }

    // 3. Run analytics
    const results = await this.analyticsRunner.run(student, options?.useAI);

    // 4. Update cache
    if (!ttlDisabled) {
      this.analyticsCache.set(student.id, { results, timestamp: new Date() });
    }

    // 5. Update profile
    const profile = this.analyticsProfiles.get(student.id);
    if (profile) {
      profile.lastAnalyzedAt = new Date();
      profile.analyticsHealthScore = this.calculateHealthScore(results);
      this.analyticsProfiles.set(student.id, profile);
      this.saveAnalyticsProfiles();
    }

    return results;
  }
}
```

**Issues**:

- Mixed concerns (cache + orchestration + profile management)
- Hard to test individual components
- 72 lines of complex logic in one method
- Cache logic tightly coupled with orchestration

## Target Architecture (After Phase 2b)

### Step 1: Create Orchestrator Instance

```typescript
import {
  createStudentAnalyticsOrchestrator,
  createProfileManagerAdapter,
} from '@/lib/analytics/orchestration';
import { getProfileMap, initializeStudentProfile, saveProfiles } from '@/lib/analyticsProfiles';
import { calculateHealthScore } from '@/lib/analytics/health';

class AnalyticsManagerService {
  private orchestrator: StudentAnalyticsOrchestrator;

  constructor(storage: IDataStorage, profiles: AnalyticsProfileMap) {
    // ... existing initialization ...

    // Create orchestrator with dependencies
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
}
```

### Step 2: Refactor getStudentAnalytics (Thin Wrapper)

```typescript
class AnalyticsManagerService {
  async getStudentAnalytics(
    student: Student,
    options?: { useAI?: boolean },
  ): Promise<AnalyticsResults> {
    // Step 1: Check TTL cache (deprecated, will be removed)
    const ttlDisabled = isManagerTtlCacheDisabled();
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
    }

    return results;
  }

  // Helper: Extract cache checking logic
  private checkTtlCache(studentId: string, options?: { useAI?: boolean }) {
    const cached = this.analyticsCache.get(studentId);
    if (!cached) return null;

    const now = new Date();
    const cacheAge = now.getTime() - cached.timestamp.getTime();
    const ttl = getTtlMs();

    if (cacheAge >= ttl) return null;

    // AI preference logic
    const preferAI = options?.useAI === true;
    const preferHeuristic = options?.useAI === false;
    const provider = (cached.results as any)?.ai?.provider;
    const isCachedAI = typeof provider === 'string' && provider.toLowerCase() !== 'heuristic';

    if (preferHeuristic && isCachedAI) return null;
    if (preferAI && !isCachedAI) return null;

    return cached;
  }

  private emitTtlDeprecationWarning(studentId: string) {
    // Rate-limited deprecation warning (existing logic)
    // ...
  }
}
```

### Step 3: Refactor triggerAnalyticsForStudent

```typescript
class AnalyticsManagerService {
  async triggerAnalyticsForStudent(student: Student): Promise<void> {
    try {
      if (!student || !student.id) {
        logger.warn('[analyticsManager] triggerAnalyticsForStudent: invalid student', { student });
        return;
      }

      // Clear TTL cache
      this.analyticsCache.delete(student.id);

      // Delegate to orchestrator
      await this.orchestrator.triggerAnalysis(student);
    } catch (error) {
      logger.error('[analyticsManager] triggerAnalyticsForStudent failed', {
        error,
        studentId: student?.id,
      });
    }
  }
}
```

### Step 4: Simplify initializeStudentAnalytics

```typescript
class AnalyticsManagerService {
  initializeStudentAnalytics(studentId: string): void {
    // Direct delegation to orchestrator
    this.orchestrator.initializeProfile(studentId);
  }
}
```

## Benefits of Refactoring

### 1. Separation of Concerns

| Component             | Responsibility                          |
| --------------------- | --------------------------------------- |
| **Manager**           | TTL cache management (deprecated layer) |
| **Orchestrator**      | Analytics workflow coordination         |
| **Runner**            | Analytics computation                   |
| **Profile Manager**   | Profile storage                         |
| **Health Calculator** | Quality scoring                         |

### 2. Testability

**Before**: Testing required mocking cache, profiles, runner, AND orchestration logic

```typescript
// Complex test setup with many mocks
test('getStudentAnalytics with cache hit', async () => {
  const mockRunner = { run: jest.fn() };
  const mockProfiles = new Map();
  const mockCache = new Map();
  // ... 30 lines of setup ...
});
```

**After**: Test orchestrator independently from cache

```typescript
// Clean test with focused mocks
test('orchestrator.getAnalytics', async () => {
  const mockRunner = { run: jest.fn() };
  const mockProfileManager = { initialize: jest.fn(), get: jest.fn(), set: jest.fn() };
  const orchestrator = createStudentAnalyticsOrchestrator({
    runner: mockRunner,
    profileManager: mockProfileManager,
    healthCalculator: () => 85,
  });
  // ... simple assertions ...
});
```

### 3. Reusability

The orchestrator can be used in different contexts:

- **Manager**: With TTL cache (deprecated)
- **Hooks**: With usePerformanceCache
- **Workers**: Internal worker cache
- **Tests**: Mock dependencies

### 4. Migration Path

Clear path to deprecate manager TTL cache:

**Phase 1** (Current): Manager checks TTL, delegates to orchestrator **Phase 2**: Hooks use
orchestrator directly, manager usage decreases **Phase 3**: Remove manager TTL cache entirely
**Phase 4**: Manager becomes thin facade or removed

## Code Metrics

### Before Extraction

| Metric                | Value                                      |
| --------------------- | ------------------------------------------ |
| analyticsManager.ts   | 641 lines                                  |
| getStudentAnalytics() | ~72 lines                                  |
| Cyclomatic Complexity | High (nested cache logic + AI preferences) |
| Dependencies          | Tightly coupled to cache, profiles, runner |

### After Extraction

| Metric                | Manager                      | Orchestrator                        |
| --------------------- | ---------------------------- | ----------------------------------- |
| Lines of Code         | ~50 reduced                  | 567 lines                           |
| getStudentAnalytics() | ~25 lines (thin wrapper)     | N/A                                 |
| getAnalytics()        | N/A                          | ~50 lines (core logic)              |
| Cyclomatic Complexity | Low (cache check + delegate) | Medium (orchestration flow)         |
| Dependencies          | Cache + Orchestrator         | Injected (runner, profiles, health) |

### Net Impact

- **Manager**: -50 lines (reduced from 641 to ~591)
- **Orchestrator**: +567 lines (new module)
- **Total**: +517 lines (but with better separation)
- **Complexity**: Moved from manager to orchestrator (better isolation)

## Example Usage

### From Manager (Existing API)

```typescript
const analyticsManager = AnalyticsManagerService.getInstance();
const results = await analyticsManager.getStudentAnalytics(student);
```

**Backward Compatible**: Existing code continues to work!

### Direct Orchestrator (New Code)

```typescript
import { createStudentAnalyticsOrchestrator } from '@/lib/analytics/orchestration';

const orchestrator = createStudentAnalyticsOrchestrator({
  runner: analyticsRunner,
  profileManager: profileManagerAdapter,
  healthCalculator: calculateHealthScore,
});

const results = await orchestrator.getAnalytics(student);
```

### In Hooks (Modern Pattern)

```typescript
function useStudentAnalytics(student: Student) {
  const orchestrator = useOrchestratorInstance();
  const cache = usePerformanceCache();

  return useQuery({
    queryKey: ['analytics', student.id],
    queryFn: async () => {
      const cached = cache.get(student.id);
      if (cached && cache.isValid(cached)) {
        return cached.results;
      }
      const results = await orchestrator.getAnalytics(student);
      cache.set(student.id, results);
      return results;
    },
  });
}
```

## Testing Strategy

### Unit Tests for Orchestrator

```typescript
describe('StudentAnalyticsOrchestrator', () => {
  it('initializes profile before analytics', async () => {
    const mockProfileManager = {
      initialize: jest.fn(),
      get: jest.fn(() => mockProfile),
      set: jest.fn(),
    };
    const orchestrator = createStudentAnalyticsOrchestrator({
      runner: mockRunner,
      profileManager: mockProfileManager,
      healthCalculator: () => 85,
    });

    await orchestrator.getAnalytics(mockStudent);

    expect(mockProfileManager.initialize).toHaveBeenCalledWith(mockStudent.id);
  });

  it('updates profile after analytics', async () => {
    // ... test profile updates ...
  });

  it('handles runner failures gracefully', async () => {
    // ... test error handling ...
  });
});
```

### Integration Tests for Manager

```typescript
describe('AnalyticsManagerService', () => {
  it('uses orchestrator for fresh analytics', async () => {
    const manager = AnalyticsManagerService.getInstance();
    const results = await manager.getStudentAnalytics(student);
    expect(results).toBeDefined();
  });

  it('respects TTL cache when enabled', async () => {
    // ... test cache hit path ...
  });

  it('bypasses TTL cache when disabled', async () => {
    // ... test cache bypass ...
  });
});
```

## Future Enhancements

### 1. Parallel Analytics

```typescript
const orchestrator = createStudentAnalyticsOrchestrator({
  runner: parallelAnalyticsRunner, // Supports parallel execution
  // ...
});
```

### 2. Streaming Results

```typescript
for await (const result of orchestrator.getAnalyticsStream(student)) {
  updateUI(result);
}
```

### 3. Batch Operations

```typescript
const results = await orchestrator.getAnalyticsForMany(students);
```

## Conclusion

The `StudentAnalyticsOrchestrator` provides a clean, testable, cache-agnostic orchestration layer.
The manager transitions to a thin wrapper focused solely on deprecated TTL cache management, with a
clear path to eventual removal.
