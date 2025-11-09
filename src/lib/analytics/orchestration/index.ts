/**
 * Analytics Orchestration Module
 *
 * @module analytics/orchestration
 *
 * @description
 * Unified exports for analytics orchestration components.
 * This module provides cache-agnostic orchestration for analytics operations.
 *
 * ## Modules
 *
 * ### Student Analytics (`studentAnalytics.ts`)
 * Core orchestration for student-level analytics operations:
 * - Profile initialization
 * - Analytics computation coordination
 * - Health score calculation
 * - Profile updates
 *
 * ### Bulk Analytics (`bulkAnalytics.ts`)
 * Batch processing operations for multiple students:
 * - Bulk re-analysis triggers
 * - Aggregate status reporting
 * - Fail-soft error handling
 * - Progress tracking
 *
 * ## Design Philosophy
 *
 * Orchestration modules coordinate between specialized components without
 * implementing business logic directly. They delegate to:
 * - **Runners**: Execute analytics computations
 * - **Profile Managers**: Handle profile storage
 * - **Health Calculators**: Compute quality metrics
 *
 * **Key Principle**: Orchestrators are cache-agnostic. Cache management
 * remains the responsibility of higher-level managers or hooks.
 *
 * ## Migration Path
 *
 * This module is part of Phase 2b refactoring to separate orchestration
 * concerns from cache management in AnalyticsManager.
 *
 * **Phase 2b Goal**: Extract orchestration logic from manager into
 * focused, testable, injectable components.
 *
 * @example
 * ```typescript
 * import {
 *   createStudentAnalyticsOrchestrator,
 *   createProfileManagerAdapter
 * } from '@/lib/analytics/orchestration';
 *
 * const orchestrator = createStudentAnalyticsOrchestrator({
 *   runner: analyticsRunner,
 *   profileManager: profileManagerAdapter,
 *   healthCalculator: calculateHealthScore
 * });
 * ```
 */

// Student Analytics Orchestrator
export {
  StudentAnalyticsOrchestrator,
  createStudentAnalyticsOrchestrator,
  createProfileManagerAdapter,
  type ProfileManager,
  type HealthCalculator,
  type StudentAnalyticsOptions,
  type StudentAnalyticsOrchestratorDeps,
} from './studentAnalytics';

// Bulk Analytics Operations
export {
  triggerAnalyticsForAll,
  getStatusForAll,
  partitionStudentsByStatus,
  type BulkAnalyticsResult,
  type StudentAnalyticsStatus,
  type IAnalyticsTrigger,
  type BulkAnalyticsOptions,
} from './bulkAnalytics';
