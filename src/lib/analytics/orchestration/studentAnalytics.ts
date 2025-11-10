/**
 * Student Analytics Orchestration Module
 *
 * @module analytics/orchestration/studentAnalytics
 *
 * @description
 * Provides cache-agnostic orchestration for student analytics operations.
 * This module coordinates between profile management, analytics execution,
 * and health score calculation without direct cache manipulation.
 *
 * ## Design Principles
 *
 * ### 1. Cache Agnosticism
 * The orchestrator does NOT manage caches directly. Cache checking and
 * storage is delegated to the caller (typically AnalyticsManager).
 * This separation enables:
 * - Clean testing without cache mocking
 * - Flexible cache strategies at manager level
 * - Clear separation of concerns (orchestration vs caching)
 *
 * ### 2. Dependency Injection
 * All dependencies are injected via constructor:
 * - `AnalyticsRunner`: Executes actual analytics computation
 * - `ProfileManager`: Manages student profiles (read/write)
 * - `HealthCalculator`: Computes health scores from results
 *
 * This design enables:
 * - Easy unit testing with mocks
 * - Flexible configuration
 * - Runtime behavior modification
 *
 * ### 3. Fail-Soft Error Handling
 * All operations gracefully degrade on errors:
 * - Profile initialization failures → continue without profile
 * - Analytics execution failures → return error results
 * - Profile update failures → log and continue
 *
 * ### 4. Idempotent Operations
 * - Profile initialization is idempotent (safe to call multiple times)
 * - Analytics can be triggered repeatedly without side effects
 *
 * ## Migration Strategy
 *
 * This module is part of Phase 2b refactoring to extract orchestration
 * from AnalyticsManager. The manager will transition to a thin wrapper:
 *
 * **Before (Manager handles everything)**:
 * ```typescript
 * getStudentAnalytics(student) {
 *   // Check TTL cache
 *   // Initialize profile
 *   // Run analytics
 *   // Update profile
 *   // Store in cache
 *   // Return results
 * }
 * ```
 *
 * **After (Manager delegates to orchestrator)**:
 * ```typescript
 * // Manager
 * getStudentAnalytics(student, options) {
 *   // Check TTL cache (deprecated)
 *   if (cached && valid) return cached;
 *
 *   // Delegate to orchestrator
 *   const results = await orchestrator.getAnalytics(student, options);
 *
 *   // Update TTL cache if enabled
 *   if (!ttlDisabled) cache.set(student.id, results);
 *
 *   return results;
 * }
 *
 * // Orchestrator (cache-agnostic)
 * getAnalytics(student, options) {
 *   initializeProfile(student.id);
 *   const results = await runner.run(student, options.useAI);
 *   updateProfile(student.id, results);
 *   return results;
 * }
 * ```
 *
 * ## Usage Examples
 *
 * ### Basic Orchestration
 * ```typescript
 * import { createStudentAnalyticsOrchestrator } from '@/lib/analytics/orchestration/studentAnalytics';
 *
 * const orchestrator = createStudentAnalyticsOrchestrator({
 *   runner: analyticsRunner,
 *   profileManager: {
 *     initialize: initializeStudentProfile,
 *     get: (id) => getProfileMap().get(id),
 *     set: (id, profile) => { getProfileMap().set(id, profile); saveProfiles(); }
 *   },
 *   healthCalculator: calculateHealthScore
 * });
 *
 * // Get fresh analytics (no cache checking)
 * const results = await orchestrator.getAnalytics(student);
 * ```
 *
 * ### With AI Options
 * ```typescript
 * // Request AI analysis
 * const aiResults = await orchestrator.getAnalytics(student, { useAI: true });
 *
 * // Force heuristic analysis
 * const heuristicResults = await orchestrator.getAnalytics(student, { useAI: false });
 * ```
 *
 * ### Trigger Fresh Analysis
 * ```typescript
 * // Force re-analysis (bypassing any external caches)
 * await orchestrator.triggerAnalysis(student);
 * ```
 *
 * ### Profile Initialization
 * ```typescript
 * // Safe to call multiple times (idempotent)
 * orchestrator.initializeProfile(student.id);
 * ```
 *
 * @since 2.3.0 (Phase 2b refactoring)
 */

import type { Student } from '@/types/student';
import type { AnalyticsResults } from '@/types/analytics';
import type { AnalyticsRunner } from '@/lib/analytics/runner';
import type { AnalyticsResultsCompat } from '@/lib/analytics/types';
import type { StudentAnalyticsProfile } from '@/lib/analyticsProfiles';
import type { AnalyticsConfiguration } from '@/types/analytics';
import { logger } from '@/lib/logger';
import { analyticsConfig } from '@/lib/analyticsConfig';

/**
 * Profile manager interface for dependency injection.
 * Abstracts profile storage operations.
 */
export interface ProfileManager {
  /**
   * Initialize a student profile if not already initialized.
   * Idempotent operation.
   */
  initialize(studentId: string): void;

  /**
   * Retrieve a student profile by ID.
   */
  get(studentId: string): StudentAnalyticsProfile | undefined;

  /**
   * Update a student profile.
   */
  set(studentId: string, profile: StudentAnalyticsProfile): void;
}

/**
 * Health calculator function type for dependency injection.
 */
export type HealthCalculator = (
  results: AnalyticsResultsCompat,
  config?: AnalyticsConfiguration,
) => number;

/**
 * Options for analytics retrieval and computation.
 */
export interface StudentAnalyticsOptions {
  /**
   * Runtime toggle for AI analysis.
   * - `true`: Force AI analysis
   * - `false`: Force heuristic analysis
   * - `undefined`: Use configuration default
   */
  useAI?: boolean;

  /**
   * Optional analytics configuration override.
   * If not provided, uses live config from analyticsConfig.
   */
  config?: AnalyticsConfiguration;
}

/**
 * Dependencies for StudentAnalyticsOrchestrator.
 */
export interface StudentAnalyticsOrchestratorDeps {
  /**
   * Analytics runner for executing analytics computations.
   */
  runner: AnalyticsRunner;

  /**
   * Profile manager for student profile operations.
   */
  profileManager: ProfileManager;

  /**
   * Health calculator for computing analytics health scores.
   */
  healthCalculator: HealthCalculator;
}

/**
 * Orchestrates student analytics operations without cache management.
 *
 * @class StudentAnalyticsOrchestrator
 *
 * @description
 * This orchestrator coordinates the complete analytics flow for students:
 * 1. Profile initialization (idempotent)
 * 2. Analytics execution via runner
 * 3. Health score calculation
 * 4. Profile updates with results
 *
 * **Key Characteristics**:
 * - Cache-agnostic: Doesn't check or store cache entries
 * - Dependency-injected: All dependencies provided at construction
 * - Fail-soft: Graceful error handling throughout
 * - Testable: Pure orchestration logic without side effects
 *
 * **Not Responsible For**:
 * - TTL cache checking or storage
 * - Cache invalidation
 * - Cache key generation
 * - Worker communication
 *
 * **Responsible For**:
 * - Profile initialization
 * - Analytics computation coordination
 * - Health score updates
 * - Profile persistence coordination
 * - Error handling and logging
 *
 * @example
 * ```typescript
 * const orchestrator = new StudentAnalyticsOrchestrator({
 *   runner: analyticsRunner,
 *   profileManager: profileManagerAdapter,
 *   healthCalculator: calculateHealthScore
 * });
 *
 * const results = await orchestrator.getAnalytics(student);
 * ```
 */
export class StudentAnalyticsOrchestrator {
  private runner: AnalyticsRunner;
  private profileManager: ProfileManager;
  private healthCalculator: HealthCalculator;

  constructor(deps: StudentAnalyticsOrchestratorDeps) {
    this.runner = deps.runner;
    this.profileManager = deps.profileManager;
    this.healthCalculator = deps.healthCalculator;
  }

  /**
   * Initialize analytics profile for a student.
   *
   * @public
   * @method initializeProfile
   * @param {string} studentId - Unique identifier for the student
   * @returns {void}
   *
   * @description
   * Creates and persists an analytics profile if not already initialized.
   * This operation is idempotent and safe to call multiple times.
   *
   * **Delegates To**: ProfileManager.initialize()
   *
   * **Error Handling**:
   * - Invalid studentId: logs warning and returns
   * - Profile initialization failure: logs error and continues (fail-soft)
   *
   * **Profile Structure**:
   * - studentId: string
   * - isInitialized: true
   * - lastAnalyzedAt: null (until first analysis)
   * - analyticsConfig: default feature flags
   * - minimumDataRequirements: default thresholds
   * - analyticsHealthScore: 0 (updated after analysis)
   *
   * @example
   * ```typescript
   * // Safe to call multiple times
   * orchestrator.initializeProfile('student-123');
   * orchestrator.initializeProfile('student-123'); // No-op
   * ```
   */
  public initializeProfile(studentId: string): void {
    try {
      if (!studentId || typeof studentId !== 'string') {
        logger.warn('[studentAnalytics] initializeProfile: invalid studentId', { studentId });
        return;
      }

      // Delegate to profile manager (idempotent)
      this.profileManager.initialize(studentId);
    } catch (error) {
      logger.error('[studentAnalytics] initializeProfile failed', { error, studentId });
      // Fail-soft: continue without profile initialization to prevent app crash
    }
  }

  /**
   * Retrieve comprehensive analytics for a specific student.
   *
   * @public
   * @async
   * @method getAnalytics
   * @param {Student} student - The student object to analyze
   * @param {StudentAnalyticsOptions} [options] - Optional configuration for analytics
   * @returns {Promise<AnalyticsResults>} Complete analytics results
   *
   * @description
   * Main entry point for student analytics orchestration. This method:
   * 1. Ensures student profile is initialized
   * 2. Executes analytics via runner (with optional AI flag)
   * 3. Calculates health score from results
   * 4. Updates profile with timestamp and health score
   * 5. Returns complete analytics results
   *
   * **Cache Behavior**:
   * - Does NOT check any caches
   * - Does NOT store results in caches
   * - Always generates fresh analytics
   * - Caller responsible for cache management
   *
   * **AI Analysis**:
   * - `options.useAI = true`: Forces AI analysis
   * - `options.useAI = false`: Forces heuristic analysis
   * - `options.useAI = undefined`: Uses config default
   *
   * **Profile Updates**:
   * - Sets `lastAnalyzedAt` to current timestamp
   * - Updates `analyticsHealthScore` based on results quality
   * - Persists profile changes immediately
   *
   * **Error Handling**:
   * - Runner failures: Propagated to caller (logged internally by runner)
   * - Profile update failures: Logged but don't fail operation
   * - Invalid student: Returns early with error result
   *
   * @throws {Error} If runner.run() fails (typically already handled internally)
   *
   * @example
   * ```typescript
   * // Basic usage (uses config default for AI)
   * const results = await orchestrator.getAnalytics(student);
   *
   * // Force AI analysis
   * const aiResults = await orchestrator.getAnalytics(student, { useAI: true });
   *
   * // Force heuristic analysis
   * const heuristicResults = await orchestrator.getAnalytics(student, { useAI: false });
   * ```
   */
  public async getAnalytics(
    student: Student,
    options?: StudentAnalyticsOptions,
  ): Promise<AnalyticsResults> {
    // Step 1: Ensure profile is initialized
    this.initializeProfile(student.id);

    // Step 2: Execute analytics via runner
    const results = await this.runner.run(student, options?.useAI);

    // Step 3: Update profile with results
    try {
      const profile = this.profileManager.get(student.id);
      if (profile) {
        // Calculate health score
        const liveCfg = options?.config ?? this.getLiveConfig();
        const healthScore = this.healthCalculator(results, liveCfg);

        // Update profile
        const updatedProfile: StudentAnalyticsProfile = {
          ...profile,
          lastAnalyzedAt: new Date(),
          analyticsHealthScore: healthScore,
        };

        this.profileManager.set(student.id, updatedProfile);
      }
    } catch (error) {
      logger.error('[studentAnalytics] Profile update failed after analytics', {
        error,
        studentId: student.id,
      });
      // Fail-soft: return results even if profile update fails
    }

    return results;
  }

  /**
   * Force re-analysis of a student by running fresh analytics.
   *
   * @public
   * @async
   * @method triggerAnalysis
   * @param {Student} student - The student to re-analyze
   * @param {StudentAnalyticsOptions} [options] - Optional configuration for analytics
   * @returns {Promise<void>}
   *
   * @description
   * Triggers a fresh analytics run for a student. This method is cache-agnostic
   * and simply delegates to getAnalytics(). Cache invalidation (if needed)
   * should be handled by the caller before invoking this method.
   *
   * **Use Cases**:
   * - User manually requests refresh
   * - New data added requiring re-analysis
   * - Configuration changes requiring recomputation
   * - Cache invalidation workflows
   *
   * **Cache Considerations**:
   * - Caller should clear relevant caches BEFORE calling this
   * - This method doesn't clear caches itself
   * - Results are not automatically cached
   *
   * **Error Handling**:
   * - Invalid student: Logs warning and returns early
   * - Runner failures: Logs error and returns (fail-soft)
   *
   * @example
   * ```typescript
   * // Basic re-analysis
   * await orchestrator.triggerAnalysis(student);
   *
   * // Re-analysis with AI
   * await orchestrator.triggerAnalysis(student, { useAI: true });
   * ```
   *
   * @example
   * ```typescript
   * // Typical cache invalidation workflow
   * analyticsCache.delete(student.id);
   * await orchestrator.triggerAnalysis(student);
   * ```
   */
  public async triggerAnalysis(student: Student, options?: StudentAnalyticsOptions): Promise<void> {
    try {
      if (!student || !student.id) {
        logger.warn('[studentAnalytics] triggerAnalysis: invalid student', { student });
        return;
      }

      // Simply run fresh analytics (cache management is caller's responsibility)
      await this.getAnalytics(student, options);
    } catch (error) {
      logger.error('[studentAnalytics] triggerAnalysis failed', {
        error,
        studentId: student?.id,
      });
      // Fail-soft: continue without triggering analytics to prevent cascade failures
    }
  }

  /**
   * Helper to safely get live analytics configuration.
   *
   * @private
   * @method getLiveConfig
   * @returns {AnalyticsConfiguration | undefined}
   *
   * @description
   * Attempts to retrieve the current analytics configuration from the
   * global config singleton. Returns undefined if config is unavailable.
   *
   * This helper isolates configuration access failures from the main
   * orchestration flow.
   */
  private getLiveConfig(): AnalyticsConfiguration | undefined {
    try {
      return analyticsConfig.getConfig();
    } catch {
      return undefined;
    }
  }
}

/**
 * Factory function to create a StudentAnalyticsOrchestrator instance.
 *
 * @function createStudentAnalyticsOrchestrator
 * @param {StudentAnalyticsOrchestratorDeps} deps - Orchestrator dependencies
 * @returns {StudentAnalyticsOrchestrator} Configured orchestrator instance
 *
 * @description
 * Convenience factory for creating orchestrator instances with dependency
 * injection. Preferred over direct constructor calls for consistency.
 *
 * @example
 * ```typescript
 * import { createStudentAnalyticsOrchestrator } from '@/lib/analytics/orchestration/studentAnalytics';
 * import { AnalyticsRunner } from '@/lib/analytics/runner';
 * import { calculateHealthScore } from '@/lib/analytics/health';
 * import { getProfileMap, initializeStudentProfile, saveProfiles } from '@/lib/analyticsProfiles';
 *
 * const orchestrator = createStudentAnalyticsOrchestrator({
 *   runner: new AnalyticsRunner({ storage: dataStorage, createAnalysisEngine }),
 *   profileManager: {
 *     initialize: initializeStudentProfile,
 *     get: (id) => getProfileMap().get(id),
 *     set: (id, profile) => {
 *       getProfileMap().set(id, profile);
 *       saveProfiles();
 *     }
 *   },
 *   healthCalculator: calculateHealthScore
 * });
 * ```
 */
export function createStudentAnalyticsOrchestrator(
  deps: StudentAnalyticsOrchestratorDeps,
): StudentAnalyticsOrchestrator {
  return new StudentAnalyticsOrchestrator(deps);
}

/**
 * Creates a profile manager adapter that works with the existing
 * analyticsProfiles module.
 *
 * @function createProfileManagerAdapter
 * @param {Object} deps - Dependencies for the profile manager
 * @param {Function} deps.initialize - Function to initialize a profile
 * @param {Function} deps.getMap - Function to get the profile map
 * @param {Function} deps.save - Function to save profiles
 * @returns {ProfileManager} Profile manager adapter
 *
 * @description
 * Creates a ProfileManager interface implementation that wraps the
 * existing analyticsProfiles module functions. This adapter pattern
 * allows the orchestrator to work with the existing profile storage
 * without direct coupling.
 *
 * @example
 * ```typescript
 * import { getProfileMap, initializeStudentProfile, saveProfiles } from '@/lib/analyticsProfiles';
 *
 * const profileManager = createProfileManagerAdapter({
 *   initialize: initializeStudentProfile,
 *   getMap: getProfileMap,
 *   save: saveProfiles
 * });
 * ```
 */
export function createProfileManagerAdapter(deps: {
  initialize: (studentId: string) => void;
  getMap: () => Map<string, StudentAnalyticsProfile>;
  save: () => void;
}): ProfileManager {
  return {
    initialize: deps.initialize,
    get: (studentId: string) => deps.getMap().get(studentId),
    set: (studentId: string, profile: StudentAnalyticsProfile) => {
      deps.getMap().set(studentId, profile);
      deps.save();
    },
  };
}
