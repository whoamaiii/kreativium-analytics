/**
 * Bulk Analytics Operations Module
 *
 * @module analytics/orchestration/bulkAnalytics
 *
 * @description Provides batch processing operations for handling analytics
 * across multiple students simultaneously. This module implements graceful
 * error handling and progress tracking for bulk operations.
 *
 * **Key Features**:
 * - Batch re-analysis for all students
 * - Aggregate status reporting across student cohorts
 * - Promise.allSettled for fail-soft error handling
 * - Progress tracking capabilities
 * - Support for filtering and pagination (prepared for future needs)
 *
 * **Design Philosophy**:
 * - Dependency injection for testability
 * - No singleton dependencies
 * - Fail-soft approach (one failure doesn't stop others)
 * - Comprehensive error logging with student context
 *
 * @example
 * ```typescript
 * import { triggerAnalyticsForAll, getStatusForAll } from '@/lib/analytics/orchestration/bulkAnalytics';
 *
 * // Batch re-analysis
 * const results = await triggerAnalyticsForAll(students, storage, analyticsManager);
 * logger.info(`Processed: ${results.processed}, Succeeded: ${results.succeeded}, Failed: ${results.failed}`);
 *
 * // Aggregate status reporting
 * const statuses = getStatusForAll(students, profiles, cache);
 * logger.info(`Total students: ${statuses.length}`);
 * ```
 */

import { logger } from '@/lib/logger';
import type { Student } from '@/types/student';
import type { IDataStorage } from '@/lib/storage/interfaces';
import type { StudentAnalyticsProfile } from '@/lib/analyticsProfiles';
import type { AnalyticsResultsCompat } from '@/lib/analytics/types';

/**
 * Cache type for analytics results with timestamps
 */
type AnalyticsCache = Map<string, { results: AnalyticsResultsCompat; timestamp: Date }>;

/**
 * Result of bulk analytics processing
 */
export interface BulkAnalyticsResult {
  /** Total number of students processed */
  processed: number;
  /** Number of successful analytics runs */
  succeeded: number;
  /** Number of failed analytics runs */
  failed: number;
  /** Array of error details for failed students */
  errors: Array<{ studentId: string; studentName: string; error: unknown }>;
  /** Duration of the operation in milliseconds */
  durationMs: number;
}

/**
 * Student analytics status information
 */
export interface StudentAnalyticsStatus {
  /** Student's unique identifier */
  studentId: string;
  /** Student's display name */
  studentName: string;
  /** Whether analytics profile is initialized */
  isInitialized: boolean;
  /** Timestamp of last successful analysis */
  lastAnalyzed: Date | null;
  /** Current health score (0-100) */
  healthScore: number;
  /** Whether student has minimum required data */
  hasMinimumData: boolean;
}

/**
 * Analytics trigger interface - defines methods needed from manager
 */
export interface IAnalyticsTrigger {
  /**
   * Initializes analytics profile for a student
   */
  initializeStudentAnalytics(studentId: string): void;

  /**
   * Triggers analytics re-calculation for a student
   */
  triggerAnalyticsForStudent(student: Student): Promise<void>;
}

/**
 * Options for filtering and pagination (future enhancement)
 */
export interface BulkAnalyticsOptions {
  /** Filter students by IDs (optional) */
  studentIds?: string[];
  /** Skip first N students (pagination) */
  offset?: number;
  /** Limit to N students (pagination) */
  limit?: number;
  /** Filter by minimum health score */
  minHealthScore?: number;
  /** Filter by maximum health score */
  maxHealthScore?: number;
  /** Only process students not analyzed since this date */
  notAnalyzedSince?: Date;
  /** Enable progress callbacks */
  onProgress?: (completed: number, total: number, student: Student) => void;
}

/**
 * Applies filtering and pagination to student list
 *
 * @private
 * @param {Student[]} students - Full list of students
 * @param {BulkAnalyticsOptions} [options] - Filtering and pagination options
 * @returns {Student[]} Filtered and paginated student list
 */
function applyFilters(students: Student[], options?: BulkAnalyticsOptions): Student[] {
  let filtered = students;

  // Filter by student IDs if specified
  if (options?.studentIds && options.studentIds.length > 0) {
    const idSet = new Set(options.studentIds);
    filtered = filtered.filter((s) => idSet.has(s.id));
  }

  // Apply pagination
  if (options?.offset !== undefined && options.offset > 0) {
    filtered = filtered.slice(options.offset);
  }

  if (options?.limit !== undefined && options.limit > 0) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

/**
 * Triggers analytics re-calculation for all students in the system.
 *
 * @public
 * @async
 * @function triggerAnalyticsForAll
 * @param {Student[]} students - Array of students to process
 * @param {IDataStorage} storage - Storage dependency for data access
 * @param {IAnalyticsTrigger} trigger - Analytics trigger interface (typically the manager)
 * @param {BulkAnalyticsOptions} [options] - Optional filtering and pagination settings
 * @returns {Promise<BulkAnalyticsResult>} Results summary with success/failure counts
 *
 * @description Performs batch analytics processing with the following characteristics:
 *
 * **Error Handling Strategy**:
 * - Uses Promise.allSettled to ensure all students are processed
 * - One student's failure does not stop processing of others
 * - Comprehensive error logging with student context
 * - Returns detailed error information for failed students
 *
 * **Performance Characteristics**:
 * - Parallel processing of all students
 * - No artificial delays or throttling
 * - Progress tracking via optional callback
 *
 * **Initialization**:
 * - Ensures each student has an initialized analytics profile
 * - Profile initialization is idempotent (safe to call multiple times)
 *
 * **Use Cases**:
 * - Scheduled refresh of all analytics
 * - System-wide cache invalidation
 * - Bulk re-processing after configuration changes
 * - Migration or data recovery scenarios
 *
 * @example
 * ```typescript
 * const students = storage.getStudents();
 * const result = await triggerAnalyticsForAll(students, storage, analyticsManager, {
 *   minHealthScore: 50,
 *   onProgress: (completed, total) => logger.info(`${completed}/${total}`)
 * });
 *
 * if (result.failed > 0) {
 *   logger.warn(`Failed to process ${result.failed} students`);
 *   result.errors.forEach(err => {
 *     logger.error(`Student ${err.studentName}: ${err.error}`);
 *   });
 * }
 * ```
 */
export async function triggerAnalyticsForAll(
  students: Student[],
  storage: IDataStorage,
  trigger: IAnalyticsTrigger,
  options?: BulkAnalyticsOptions,
): Promise<BulkAnalyticsResult> {
  const startTime = Date.now();

  try {
    // Apply filters and pagination
    const filteredStudents = applyFilters(students, options);

    logger.info('[bulkAnalytics] Starting batch analytics processing', {
      totalStudents: students.length,
      filteredStudents: filteredStudents.length,
      hasFilters: !!options?.studentIds || !!options?.minHealthScore || !!options?.maxHealthScore,
      hasPagination: options?.offset !== undefined || options?.limit !== undefined,
    });

    // Initialize profiles for all students
    filteredStudents.forEach((student) => {
      trigger.initializeStudentAnalytics(student.id);
    });

    // Process all students in parallel with Promise.allSettled
    const analyticsPromises = filteredStudents.map(async (student, index) => {
      try {
        await trigger.triggerAnalyticsForStudent(student);

        // Progress callback
        if (options?.onProgress) {
          options.onProgress(index + 1, filteredStudents.length, student);
        }

        return { success: true, student };
      } catch (error) {
        // Log error but continue processing
        logger.error('[bulkAnalytics] Failed to process student', {
          studentId: student.id,
          studentName: student.name,
          error,
        });
        return { success: false, student, error };
      }
    });

    const settledResults = await Promise.allSettled(analyticsPromises);

    // Aggregate results
    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ studentId: string; studentName: string; error: unknown }> = [];

    settledResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          succeeded++;
        } else {
          failed++;
          errors.push({
            studentId: result.value.student.id,
            studentName: result.value.student.name,
            error: result.value.error,
          });
        }
      } else {
        // Promise.allSettled rejection (shouldn't happen with our try-catch)
        failed++;
        const student = filteredStudents[index];
        errors.push({
          studentId: student.id,
          studentName: student.name,
          error: result.reason,
        });
        logger.error('[bulkAnalytics] Promise rejected for student', {
          studentId: student.id,
          reason: result.reason,
        });
      }
    });

    const durationMs = Date.now() - startTime;

    logger.info('[bulkAnalytics] Batch analytics processing complete', {
      processed: filteredStudents.length,
      succeeded,
      failed,
      durationMs,
      successRate:
        filteredStudents.length > 0
          ? ((succeeded / filteredStudents.length) * 100).toFixed(2) + '%'
          : 'N/A',
    });

    return {
      processed: filteredStudents.length,
      succeeded,
      failed,
      errors,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('[bulkAnalytics] Critical error in batch processing', { error, durationMs });

    // Return error result
    return {
      processed: 0,
      succeeded: 0,
      failed: students.length,
      errors: [
        {
          studentId: 'SYSTEM',
          studentName: 'SYSTEM',
          error,
        },
      ],
      durationMs,
    };
  }
}

/**
 * Retrieves aggregate analytics status for all students.
 *
 * @public
 * @function getStatusForAll
 * @param {Student[]} students - Array of students to query
 * @param {Map<string, StudentAnalyticsProfile>} profiles - Analytics profiles map
 * @param {AnalyticsCache} [cache] - Optional analytics cache for minimum data checks
 * @param {BulkAnalyticsOptions} [options] - Optional filtering options
 * @returns {StudentAnalyticsStatus[]} Array of status objects for each student
 *
 * @description Aggregates analytics status information across multiple students:
 *
 * **Status Information Includes**:
 * - Student identification (ID and name)
 * - Profile initialization state
 * - Last analysis timestamp
 * - Current health score (0-100)
 * - Minimum data availability
 *
 * **Data Sources**:
 * - Student list from storage
 * - Profile metadata from analytics profiles
 * - Cache data for minimum data checks (optional)
 *
 * **Performance**:
 * - Synchronous operation (no async calls)
 * - O(n) complexity where n = number of students
 * - Lightweight read-only operation
 *
 * **Use Cases**:
 * - Dashboard overview of system state
 * - Identifying students needing attention
 * - Monitoring analytics health across cohorts
 * - Filtering students by analytics readiness
 *
 * @example
 * ```typescript
 * const students = storage.getStudents();
 * const profiles = getProfileMap();
 * const statuses = getStatusForAll(students, profiles, cache, {
 *   minHealthScore: 70,
 *   notAnalyzedSince: new Date('2024-01-01')
 * });
 *
 * // Students needing analysis
 * const needsAnalysis = statuses.filter(s => !s.isInitialized || !s.hasMinimumData);
 * logger.info(`${needsAnalysis.length} students need analysis`);
 *
 * // Low health scores
 * const lowHealth = statuses.filter(s => s.healthScore < 50);
 * logger.info(`${lowHealth.length} students have low health scores`);
 * ```
 */
export function getStatusForAll(
  students: Student[],
  profiles: Map<string, StudentAnalyticsProfile>,
  cache?: AnalyticsCache,
  options?: BulkAnalyticsOptions,
): StudentAnalyticsStatus[] {
  try {
    // Apply filters
    const filteredStudents = applyFilters(students, options);

    logger.info('[bulkAnalytics] Generating status report', {
      totalStudents: students.length,
      filteredStudents: filteredStudents.length,
    });

    const statuses = filteredStudents.map((student) => {
      const profile = profiles.get(student.id);
      const cached = cache?.get(student.id);

      const status: StudentAnalyticsStatus = {
        studentId: student.id,
        studentName: student.name,
        isInitialized: profile?.isInitialized ?? false,
        lastAnalyzed: profile?.lastAnalyzedAt ?? null,
        healthScore: profile?.analyticsHealthScore ?? 0,
        hasMinimumData: cached?.results.hasMinimumData ?? false,
      };

      return status;
    });

    // Apply health score filters if specified
    let filtered = statuses;

    if (options?.minHealthScore !== undefined) {
      filtered = filtered.filter((s) => s.healthScore >= options.minHealthScore!);
    }

    if (options?.maxHealthScore !== undefined) {
      filtered = filtered.filter((s) => s.healthScore <= options.maxHealthScore!);
    }

    // Apply lastAnalyzed filter if specified
    if (options?.notAnalyzedSince) {
      filtered = filtered.filter((s) => {
        if (!s.lastAnalyzed) return true; // Include never-analyzed students
        return s.lastAnalyzed < options.notAnalyzedSince!;
      });
    }

    logger.info('[bulkAnalytics] Status report complete', {
      totalStatuses: statuses.length,
      filteredStatuses: filtered.length,
      initialized: filtered.filter((s) => s.isInitialized).length,
      withData: filtered.filter((s) => s.hasMinimumData).length,
      avgHealthScore:
        filtered.length > 0
          ? (filtered.reduce((sum, s) => sum + s.healthScore, 0) / filtered.length).toFixed(2)
          : 'N/A',
    });

    return filtered;
  } catch (error) {
    logger.error('[bulkAnalytics] Error generating status report', { error });

    // Fail-soft: return empty array rather than throwing
    return [];
  }
}

/**
 * Utility function to partition students based on status criteria
 *
 * @public
 * @function partitionStudentsByStatus
 * @param {StudentAnalyticsStatus[]} statuses - Array of student statuses
 * @returns {object} Partitioned students by various criteria
 *
 * @description Helper function for analyzing student cohorts:
 * - Separates students into different health categories
 * - Identifies students needing attention
 * - Useful for prioritization and reporting
 *
 * @example
 * ```typescript
 * const statuses = getStatusForAll(students, profiles, cache);
 * const partitions = partitionStudentsByStatus(statuses);
 *
 * logger.info(`High health: ${partitions.highHealth.length}`);
 * logger.info(`Needs analysis: ${partitions.needsAnalysis.length}`);
 * ```
 */
export function partitionStudentsByStatus(statuses: StudentAnalyticsStatus[]) {
  return {
    /** Students with health score >= 80 */
    highHealth: statuses.filter((s) => s.healthScore >= 80),

    /** Students with health score 50-79 */
    mediumHealth: statuses.filter((s) => s.healthScore >= 50 && s.healthScore < 80),

    /** Students with health score < 50 */
    lowHealth: statuses.filter((s) => s.healthScore < 50),

    /** Students never analyzed */
    neverAnalyzed: statuses.filter((s) => !s.lastAnalyzed),

    /** Students without minimum data */
    insufficientData: statuses.filter((s) => !s.hasMinimumData),

    /** Students not initialized */
    notInitialized: statuses.filter((s) => !s.isInitialized),

    /** Students needing attention (low health or insufficient data) */
    needsAnalysis: statuses.filter(
      (s) => s.healthScore < 50 || !s.hasMinimumData || !s.isInitialized,
    ),
  };
}
