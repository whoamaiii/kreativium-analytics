/**
 * Alert Detection Module
 *
 * Provides modular, testable components for the alert detection pipeline:
 * - DetectionOrchestrator: Main pipeline orchestration
 * - CandidateGenerator: Candidate building and detector execution
 * - Result Aggregation: Detector result processing and score combination
 * - Alert Finalization: Alert event construction and enrichment
 *
 * This module extracts and organizes the detection logic from AlertDetectionEngine
 * to improve maintainability, testability, and enable independent evolution of
 * each component.
 */

export { DetectionOrchestrator, type DetectionInput } from './detectionOrchestrator';

export {
  CandidateGenerator,
  type AlertCandidate,
  type AssociationDataset,
  type ApplyThresholdContext,
  type CusumConfig,
  type TauUDetectorFunction,
} from './candidateGenerator';

// Result Aggregation
export {
  aggregateDetectorResults,
  filterValidResults,
  combineDetectorScores,
  calculateAggregateConfidence,
  computeDetectionQuality,
} from './resultAggregator';

export type { AggregatedResult, AggregationWeights } from './resultAggregator';

// Alert Finalization
export {
  finalizeAlertEvent,
  batchFinalizeAlerts,
  applyPolicies,
  enrichWithMetadata,
  generateSparkline,
  computeSeriesStats,
} from './alertFinalizer';

export type { FinalizationConfig, SeriesStats } from './alertFinalizer';
