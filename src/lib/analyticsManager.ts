import { Student } from "@/types/student";
import { dataStorage, IDataStorage } from "@/lib/dataStorage";
import { ANALYTICS_CONFIG, DEFAULT_ANALYTICS_CONFIG, analyticsConfig, STORAGE_KEYS } from "@/lib/analyticsConfig";
import { logger } from "@/lib/logger";
import type { AnalyticsResults } from "@/types/analytics";
import type { AnalysisEngine } from "@/lib/analysis";

import { AnalyticsRunner } from "@/lib/analytics/runner";
import type { AnalyticsResultsCompat } from "@/lib/analytics/types";
import { getProfileMap, initializeStudentProfile, saveProfiles } from "@/lib/analyticsProfiles";
import { analyticsCoordinator } from "@/lib/analyticsCoordinator";
import type { StudentAnalyticsProfile } from "@/lib/analyticsProfiles";
// Legacy task builders (to be deprecated)
export { createInsightsTask as buildTask, createInsightsCacheKey as buildCacheKey } from '@/lib/analyticsTasks';

// Extracted modules (Phase 2a refactoring)
import { createAnalysisEngine } from '@/lib/analytics/engine';
import { calculateHealthScore } from '@/lib/analytics/health';
import {
  clearAllCaches,
  clearStudentCaches,
  clearManagerCache,
  notifyWorkers,
  isManagerTtlCacheDisabled
} from '@/lib/analytics/cache';
import { clearAnalyticsLocalStorage } from '@/lib/analytics/cache/localStorageCleaner';

// Extracted bulk operations (Phase 2b refactoring)
import {
  triggerAnalyticsForAll,
  getStatusForAll,
  type StudentAnalyticsStatus,
} from '@/lib/analytics/orchestration';

// #region Type Definitions

/**
 * Ensures universal analytics initialization for all students in the system.
 * 
 * @async
 * @function ensureUniversalAnalyticsInitialization
 * @returns {Promise<void>} A promise that resolves when initialization is complete
 * 
 * @description This function handles the complete analytics initialization process:
 * 1. **Mock Data Generation**: If no students exist, generates a minimal set of 3 mock students
 *    to seed the analytics system with baseline data.
 * 2. **Minimum Data Thresholds**: Checks each student against configurable thresholds:
 *    - EMOTION_ENTRIES: Minimum emotion entries required
 *    - SENSORY_ENTRIES: Minimum sensory input entries required  
 *    - TRACKING_ENTRIES: Minimum tracking session entries required
 * 3. **Cache Warming Strategy**: For students meeting minimum data requirements, performs
 *    lightweight precomputation of analytics to populate caches:
 *    - Emotion pattern analysis
 *    - Sensory pattern analysis
 *    - Environmental correlation analysis (if sufficient tracking entries)
 * 
 * The function gracefully handles errors and treats cache warming as best-effort.
 * Configuration is loaded from live analytics config with fallback to defaults.
 */
export const ensureUniversalAnalyticsInitialization = async (): Promise<void> => {
  try {
    // Ensure profiles for existing students; no auto generation of mock data here
    const cfg = (() => { try { return analyticsConfig.getConfig(); } catch { return null; } })();
    // Minimum data thresholds source:
    // - confidence.THRESHOLDS.EMOTION_ENTRIES
    // - confidence.THRESHOLDS.SENSORY_ENTRIES
    // - confidence.THRESHOLDS.TRACKING_ENTRIES
    // Read from live analyticsConfig with safe fallback to defaults (Task 8, rule j9uS...).
    const minEmotions = cfg?.confidence?.THRESHOLDS?.EMOTION_ENTRIES ?? ANALYTICS_CONFIG.confidence.THRESHOLDS.EMOTION_ENTRIES;
    const minSensory = cfg?.confidence?.THRESHOLDS?.SENSORY_ENTRIES ?? ANALYTICS_CONFIG.confidence.THRESHOLDS.SENSORY_ENTRIES;
    const minTracking = cfg?.confidence?.THRESHOLDS?.TRACKING_ENTRIES ?? ANALYTICS_CONFIG.confidence.THRESHOLDS.TRACKING_ENTRIES;

    const allStudents = dataStorage.getStudents();
    for (const student of allStudents) {
      // Ensure profile exists (delegated to profiles module)
      initializeStudentProfile(student.id);

      // Optional: evaluate minimum data for future warming decisions
      const tracking = dataStorage.getEntriesForStudent(student.id);
      const emotions = tracking.flatMap(t => t.emotions ?? []);
      const sensoryInputs = tracking.flatMap(t => t.sensoryInputs ?? []);

      const hasMinimumData =
        (emotions.length) >= minEmotions ||
        (sensoryInputs.length) >= minSensory ||
        (tracking.length) >= minTracking;

      if (hasMinimumData) {
        // Warming handled elsewhere; no direct action here
      }
    }

    // Persist any new profiles created during initialization
    saveProfiles();
  } catch (e) {
    logger.error('[analyticsManager] ensureUniversalAnalyticsInitialization failed', e);
  }
};

/**
 * Defines the analytics profile for a student, tracking configuration and health.
 */

/**
 * Represents the complete set of results from an analytics run.
 */
type AnalyticsCache = Map<string, { results: AnalyticsResultsCompat; timestamp: Date }>;
type AnalyticsProfileMap = Map<string, StudentAnalyticsProfile>;
// #endregion

// #region Utility & Helper Functions (for better SRP)

/**
 * Safely parses analytics profiles from localStorage with validation and error handling.
 * 
 * @function loadProfilesFromStorage
 * @param {string | null} storedProfiles - The stringified profiles from localStorage
 * @returns {AnalyticsProfileMap} A map of valid student profiles, keyed by student ID
 * 
 * @description This function provides robust loading of persisted analytics profiles:
 * 
 * **Validation Process**:
 * - Checks if input is null/empty, returns empty Map if so
 * - Attempts JSON parsing with try/catch for malformed data
 * - Runtime type validation for each profile object
 * - Validates required fields: studentId (string) and isInitialized (boolean)
 * - Converts date strings back to Date objects for lastAnalyzedAt field
 * 
 * **Error Handling**:
 * - Catches and logs JSON parsing errors
 * - Skips invalid profile entries rather than failing completely
 * - Returns empty Map on complete failure to ensure app stability
 * 
 * This defensive approach ensures the analytics system remains functional even
 * if localStorage data becomes corrupted or outdated.
 */
// Profiles are now managed by analyticsProfiles module; local loader retained for backward-compat only if needed
function loadProfilesFromStorage(_storedProfiles: string | null): AnalyticsProfileMap {
  return getProfileMap();
}

// #endregion

/**
 * Singleton service managing all analytics operations for the Sensory Tracker application.
 * 
 * @class AnalyticsManagerService
 * @singleton
 * 
 * @description This service orchestrates all analytics-related operations:
 * 
 * **Singleton Pattern Implementation**:
 * - Single instance ensures consistent state across the application
 * - Lazy initialization with getInstance() method
 * - Private constructor prevents direct instantiation
 * - Thread-safe in JavaScript's single-threaded environment
 * 
 * **Core Responsibilities**:
 * 1. **Profile Management**: Maintains analytics profiles for each student
 * 2. **Caching Strategy**: Implements TTL-based caching to optimize performance
 * 3. **Analytics Orchestration**: Coordinates pattern analysis, correlations, and predictions
 * 4. **Data Persistence**: Manages localStorage for profile persistence
 * 
 * **Caching Behavior**:
 * - Cache entries stored with timestamp
 * - TTL (Time To Live) configured via ANALYTICS_CONFIG.CACHE_TTL
 * - Automatic cache invalidation on data updates
 * - Manual cache clearing available per student or globally
 * 
 * **Performance Optimizations**:
 * - Lazy loading of analytics data
 * - Batch processing for multiple students
 * - Graceful error handling with Promise.allSettled
 * 
 * @example
 * const manager = AnalyticsManagerService.getInstance();
 * const analytics = await manager.getStudentAnalytics(student);
 */
const __lastFacadeLogMinute: number | null = null;
// Rate-limit map for deprecation warnings per student
const __ttlDeprecationWarnWindow = new Map<string, number>();
class AnalyticsManagerService {
  private static instance: AnalyticsManagerService;
  private analyticsProfiles: AnalyticsProfileMap;
  /**
   * @deprecated Manager-level TTL cache is deprecated. New code should rely on
   * useAnalyticsWorker + usePerformanceCache at the hook level (with worker-internal
   * caching) and avoid this Map entirely. Set VITE_DISABLE_MANAGER_TTL_CACHE=true or
   * analyticsConfig.cache.disableManagerTTLCache=true to disable.
   */
  private analyticsCache: AnalyticsCache = new Map();
  private storage: IDataStorage;
  private analyticsRunner: AnalyticsRunner;

  private constructor(storage: IDataStorage, profiles: AnalyticsProfileMap) {
    this.storage = storage;
    this.analyticsProfiles = profiles;
    this.analyticsRunner = new AnalyticsRunner({
      storage: this.storage,
      createAnalysisEngine,
    });
  }

  /**
   * Retrieves the singleton instance of the AnalyticsManagerService.
   * @param {IDataStorage} [storage=dataStorage] - The data storage dependency.
   * @param {AnalyticsProfileMap} [profiles] - Optional initial profiles to load.
   * @returns {AnalyticsManagerService} The singleton instance.
   */
  static getInstance(
    storage: IDataStorage = dataStorage,
    profiles?: AnalyticsProfileMap
  ): AnalyticsManagerService {
    if (!AnalyticsManagerService.instance) {
      // Load profiles from the analyticsProfiles module which handles storage
      const initialProfiles = profiles ?? loadProfilesFromStorage(null);
      AnalyticsManagerService.instance = new AnalyticsManagerService(storage, initialProfiles);
    }
    return AnalyticsManagerService.instance;
  }

  /**
   * Initializes analytics profile for a new student.
   * 
   * @public
   * @method initializeStudentAnalytics
   * @param {string} studentId - Unique identifier for the student
   * @returns {void}
   * 
   * @description Creates and persists an analytics profile for a student if not already initialized.
   * 
   * **Profile Initialization**:
   * - Checks if profile already exists (idempotent operation)
   * - Creates default profile with all analytics features enabled
   * - Sets minimal data requirements (1 entry each for emotions, sensory, tracking)
   * - Initializes health score to 0 (will be calculated on first analysis)
   * - Persists profile to localStorage immediately
   * 
   * **Default Configuration**:
   * - patternAnalysisEnabled: true
   * - correlationAnalysisEnabled: true
   * - predictiveInsightsEnabled: true
   * - anomalyDetectionEnabled: true
   * - alertSystemEnabled: true
   * 
   * This method is automatically called when accessing student analytics,
   * ensuring profiles exist before analysis.
   */
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
      // fail-soft: continue without profile initialization to prevent app crash
    }
  }

  /**
   * Retrieves comprehensive analytics for a specific student.
   * 
   * @public
   * @async
   * @method getStudentAnalytics
   * @param {Student} student - The student object to analyze
   * @param {{ useAI?: boolean }} [options] - Optional runtime toggle for AI analysis
   * @returns {Promise<AnalyticsResults>} Complete analytics results including patterns, correlations, and insights
   * 
   * @description Main entry point for retrieving student analytics with intelligent caching.
   * 
   * **Caching Strategy**:
   * 1. Ensures student profile is initialized
   * 2. Checks cache for existing results
   * 3. Returns cached results if within TTL (Time To Live)
   * 4. Generates fresh analytics if cache miss or expired
   * 5. Updates cache with new results and timestamp
   * 
   * **TTL Behavior**:
   * - Default TTL: Configured in ANALYTICS_CONFIG.CACHE_TTL
   * - Cache validity: timestamp + TTL > current time
   * - Expired entries trigger regeneration
   * 
   * **Side Effects**:
   * - Updates lastAnalyzedAt timestamp in profile
   * - Recalculates and updates health score
   * - Persists updated profile to localStorage
   * 
   * @throws {Error} If analytics generation fails (wrapped from generateAnalytics)
   * 
   * @example
   * const results = await analyticsManager.getStudentAnalytics(student);
   * logger.info(`Confidence: ${results.confidence * 100}%`);
   */
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

        // Determine whether the cached result was produced by an AI provider (non-heuristic)
        const provider = (cached.results as any)?.ai?.provider;
        const isCachedAI = typeof provider === 'string' && provider.toLowerCase() !== 'heuristic';

        if (cacheAge < ttl) {
          // Emit deprecation notice when returning from manager TTL cache, rate-limited per student (60s)
          try {
            const key = `ttl_warn_${student.id}`;
            const nowMs = Date.now();
            const last = __ttlDeprecationWarnWindow.get(key) ?? 0;
            if (nowMs - last > 60_000) {
              logger.warn('[analyticsManager] Using deprecated manager TTL cache for student. Migrate to useAnalyticsWorker + usePerformanceCache. Set VITE_DISABLE_MANAGER_TTL_CACHE=true to test disabling.', { studentId: student.id });
              __ttlDeprecationWarnWindow.set(key, nowMs);
            }
          } catch { /* noop */ }

          // When runtime explicitly requests heuristic (useAI=false) and cache holds AI, bypass cache
          if (preferHeuristic) {
            if (!isCachedAI) {
              return cached.results;
            }
            // else: cached is AI; fall through to regenerate heuristically
          } else if (preferAI) {
            // When AI is preferred, only return if cached is AI
            if (isCachedAI) {
              return cached.results;
            }
            // else: fall through to regenerate with AI
          } else {
            // No explicit preference provided; accept any fresh cached result
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

  /**
   * Calculates an "analytics health score" based on the completeness and confidence of the results.
   * @private
   * @param {AnalyticsResultsCompat} results - The results from an analytics run.
   * @returns {number} A score from 0 to 100.
   */
  // Delegated to extracted module (Phase 2a refactoring)
  private calculateHealthScore(results: AnalyticsResultsCompat): number {
    const liveCfg = (() => { try { return analyticsConfig.getConfig(); } catch { return null; } })();
    return calculateHealthScore(results, liveCfg ?? undefined);
  }

  /**
   * Forces a re-calculation of analytics for a specific student by clearing their cache
   * and re-running the analysis.
   * @param {Student} student - The student to re-analyze.
   */
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
      // fail-soft: continue without triggering analytics to prevent cascade failures
    }
  }

  /**
   * Triggers an analytics refresh for all students in the system.
   * Uses Promise.allSettled to ensure that one failed analysis does not stop others.
   *
   * @deprecated This method is now a thin wrapper. Consider using triggerAnalyticsForAll directly.
   *
   * Delegated to extracted module (Phase 2b refactoring)
   */
  public async triggerAnalyticsForAllStudents(): Promise<void> {
    const students = this.storage.getStudents();
    await triggerAnalyticsForAll(students, this.storage, this);
  }

  /**
   * Gets the current analytics status for all students, including health scores and last analysis time.
   * This is useful for displaying a high-level dashboard of the system's state.
   * @returns {StudentAnalyticsStatus[]} An array of status objects for each student.
   *
   * @deprecated This method is now a thin wrapper. Consider using getStatusForAll directly.
   *
   * Delegated to extracted module (Phase 2b refactoring)
   */
  public getAnalyticsStatus(): StudentAnalyticsStatus[] {
    const students = this.storage.getStudents();
    return getStatusForAll(students, this.analyticsProfiles, this.analyticsCache);
  }

  /**
   * Clears the analytics cache.
   * @param {string} [studentId] - If provided, clears the cache for only that student.
   * Otherwise, clears the entire analytics cache.
   *
   * Delegated to extracted module (Phase 2a refactoring)
   */
  public clearCache(studentId?: string): void {
    clearManagerCache(this.analyticsCache, studentId);
  }

  /**
   * Notify workers and hooks to clear caches via global events
   *
   * Delegated to extracted module (Phase 2a refactoring)
   */
  private notifyWorkerCacheClear(studentId?: string): void {
    notifyWorkers(studentId);
  }

  /**
   * Clear known analytics localStorage caches (profiles and others via helpers)
   *
   * Delegated to extracted module (Phase 2a refactoring)
   */
  private clearLocalStorageCaches(): { keysCleared: string[] } {
    return clearAnalyticsLocalStorage();
  }

  /**
   * Clear all analytics-related caches across systems and return a summary
   *
   * Delegated to extracted module (Phase 2a refactoring)
   */
  public async clearAllAnalyticsCaches(broadcast = true): Promise<{ ok: boolean; summary: Record<string, unknown> }> {
    return clearAllCaches(this.analyticsCache, broadcast);
  }

  /**
   * Clear caches for a specific student across systems
   *
   * Delegated to extracted module (Phase 2a refactoring)
   */
  public async clearStudentCaches(studentId: string): Promise<{ ok: boolean; studentId: string }> {
    return clearStudentCaches(studentId, this.analyticsCache);
  }

  /**
   * Saves the current map of analytics profiles to localStorage.
   * @private
   */
  private saveAnalyticsProfiles(): void {
    // Deprecated in favor of analyticsProfiles.saveProfiles()
    try { saveProfiles(); } catch (error) { logger.error('Error saving analytics profiles:', error); }
  }

  /**
   * Engine factory: selects analysis engine based on priority
   * runtime useAI > analytics config > environment default/availability.
   *
   * Delegated to extracted module (Phase 2a refactoring)
   * NOTE: This method is no longer used since constructor was updated to use
   * the imported createAnalysisEngine function directly. Keeping for reference.
   * @deprecated Use imported createAnalysisEngine from @/lib/analytics/engine instead
   */
  private createAnalysisEngine(useAI?: boolean): AnalysisEngine {
    return createAnalysisEngine(useAI);
  }

  /**
   * Feature flag to disable the manager's TTL cache for migration/testing.
   * Sources:
   * - analyticsConfig.cache.disableManagerTTLCache or analyticsConfig.cache.disableManagerTTL
   * - VITE_DISABLE_MANAGER_TTL_CACHE env ("1" | "true" | "yes")
   *
   * Delegated to extracted module (Phase 2a refactoring)
   */
  private isManagerTtlCacheDisabled(): boolean {
    return isManagerTtlCacheDisabled();
  }
}

/**
 * Singleton instance of AnalyticsManagerService.
 * Use this for orchestrating analytics without creating new instances.
 */
export const analyticsManager = AnalyticsManagerService.getInstance();

/**
 * Thin orchestrator-style API (gradual migration target)
 *
 * These named exports provide a lightweight interface for building cache keys,
 * constructing worker tasks, and retrieving summarized insights in a stable
 * shape for consumers like hooks or UI. They coexist with the legacy singleton
 * for backward compatibility and will become the primary API.
 *
 * Extracted to @/lib/analytics/insights module (Phase 2b refactoring)
 */
export { getInsights, buildInsightsCacheKey, buildInsightsTask } from '@/lib/analytics/insights';
