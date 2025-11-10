/**
 * Alert Finalization Module
 *
 * Handles the final construction of AlertEvent records from aggregated detector results.
 * Responsibilities:
 * - Alert ID generation
 * - Severity classification
 * - Metadata enrichment (scores, thresholds, experiments, series stats)
 * - Sparkline visualization data generation
 * - Governance policy application (deduplication keys)
 *
 * @module alertFinalizer
 */

import { AlertEvent, AlertMetadata, AlertStatus } from '@/lib/alerts/types';
import { severityFromScore } from '@/lib/alerts/scoring';
import { buildAlertId, truncateSeries } from '@/lib/alerts/utils';
import { generateSparklineData } from '@/lib/chartUtils';
import { AlertPolicies } from '@/lib/alerts/policies';
import type { AggregatedResult } from './resultAggregator';
import type { AlertCandidate } from './candidateGenerator';
import type { TrendPoint } from '@/lib/alerts/detectors/ewma';

/**
 * Configuration for alert finalization.
 */
export interface FinalizationConfig {
  /** Maximum series length for sparkline generation */
  seriesLimit: number;
  /** AlertPolicies instance for dedupe key calculation */
  policies: AlertPolicies;
}

/**
 * Series statistics for diagnostics and validation.
 */
export interface SeriesStats {
  min: number;
  max: number;
  mean: number;
  variance: number;
}

/**
 * Generate sparkline visualization data from time series.
 * Truncates series to limit and produces compact representation for UI.
 *
 * @param series - Time series data points
 * @param limit - Maximum number of points to include
 * @returns Sparkline data with timestamps and values
 *
 * @example
 * const sparkline = generateSparkline(series, 100);
 * sparkline.values // => [1.2, 1.5, 1.8, ...]
 * sparkline.timestamps // => [1704067200000, 1704153600000, ...]
 */
export function generateSparkline(
  series: TrendPoint[],
  limit: number,
): { values: number[]; timestamps: number[] } {
  const truncated = truncateSeries(series, limit);
  const sparklineData = generateSparklineData(truncated);

  return {
    values: sparklineData.values,
    timestamps: sparklineData.timestamps,
  };
}

/**
 * Compute lightweight series statistics for diagnostics.
 * Returns min, max, mean, and sample variance.
 *
 * @param series - Time series data points
 * @returns Statistical summary of the series
 *
 * @example
 * const stats = computeSeriesStats(series);
 * stats.mean // => 3.5
 * stats.variance // => 0.8
 */
export function computeSeriesStats(series: TrendPoint[]): SeriesStats {
  if (!series.length) {
    return { min: 0, max: 0, mean: 0, variance: 0 };
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;

  // First pass: min, max, sum
  for (let i = 0; i < series.length; i += 1) {
    const v = Number(series[i]!.value);
    if (!Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }

  const n = series.length;
  const mean = n > 0 ? sum / n : 0;

  // Second pass: variance
  let acc = 0;
  for (let i = 0; i < series.length; i += 1) {
    const v = Number(series[i]!.value);
    if (!Number.isFinite(v)) continue;
    const d = v - mean;
    acc += d * d;
  }

  const variance = n > 1 ? acc / (n - 1) : 0;

  // Sanitize outputs
  if (!Number.isFinite(min)) min = 0;
  if (!Number.isFinite(max)) max = 0;

  return {
    min,
    max,
    mean: Number.isFinite(mean) ? mean : 0,
    variance: Number.isFinite(variance) ? variance : 0,
  };
}

/**
 * Enrich alert metadata with scores, thresholds, experiments, and diagnostics.
 * Consolidates all contextual information needed for alert display and analysis.
 *
 * @param baseMetadata - Base metadata from candidate
 * @param aggregated - Aggregated detector results
 * @param sparkline - Sparkline visualization data
 * @param candidate - Original alert candidate
 * @param seriesStats - Series statistics
 * @returns Enriched metadata object
 *
 * @example
 * const metadata = enrichWithMetadata(
 *   { emotionKey: 'anxiety' },
 *   aggregated,
 *   sparkline,
 *   candidate,
 *   stats,
 * );
 * metadata.score // => 0.75
 * metadata.experimentKey // => 'alerts.thresholds.behavior'
 */
export function enrichWithMetadata(
  baseMetadata: AlertMetadata,
  aggregated: AggregatedResult,
  sparkline: { values: number[]; timestamps: number[] },
  candidate: AlertCandidate,
  seriesStats: SeriesStats,
): AlertMetadata {
  // Convert threshold adjustments to simple record for metadata
  const thresholdOverridesRecord = candidate.thresholdAdjustments
    ? Object.fromEntries(
        Object.entries(candidate.thresholdAdjustments).map(([detectorType, trace]) => [
          detectorType,
          trace.adjustment,
        ]),
      )
    : undefined;

  // Extract source ranks for metadata
  const sourceRanks = aggregated.rankedSources
    .map((s) => (s.details as Record<string, unknown>)?.rank ?? null)
    .filter(Boolean);

  return {
    label: candidate.label,
    contextKey: candidate.label,
    ...baseMetadata,
    sparkValues: sparkline.values,
    sparkTimestamps: sparkline.timestamps,
    score: aggregated.aggregateScore,
    recency: aggregated.recency,
    tier: candidate.tier,
    impact: aggregated.impact,
    summary: aggregated.rankedSources[0]?.label ?? candidate.label,
    sourceRanks,
    thresholdOverrides: thresholdOverridesRecord,
    experimentKey: candidate.experimentKey,
    experimentVariant: candidate.experimentVariant,
    detectorTypes: candidate.detectorTypes,
    thresholdTrace: candidate.thresholdAdjustments,
    detectionScoreBreakdown: aggregated.scoreBreakdown,
    seriesStats,
  };
}

/**
 * Apply governance policies to alert candidate.
 * Calculates deduplication key for throttling and duplicate suppression.
 *
 * @param alert - Partial alert event (without dedupeKey)
 * @param policies - AlertPolicies instance
 * @returns Alert with dedupeKey applied
 *
 * @example
 * const withPolicy = applyPolicies(partialAlert, policies);
 * withPolicy.dedupeKey // => 'abc123xyz'
 */
export function applyPolicies(
  alert: Omit<AlertEvent, 'dedupeKey'>,
  policies: AlertPolicies,
): AlertEvent {
  const dedupeKey = policies.calculateDedupeKey(alert as AlertEvent);
  return { ...alert, dedupeKey };
}

/**
 * Finalize alert event from candidate and aggregated results.
 * Constructs complete AlertEvent with all metadata, governance, and visualization data.
 *
 * Pipeline:
 * 1. Aggregate detector results → scores, sources
 * 2. Map score → severity tier
 * 3. Generate alert ID (hash-stable)
 * 4. Create sparkline visualization
 * 5. Enrich metadata (scores, thresholds, experiments, stats)
 * 6. Apply governance (deduplication key)
 *
 * @param candidate - Alert candidate with detector results
 * @param aggregated - Aggregated detector results and scores
 * @param studentId - Student identifier
 * @param config - Finalization configuration
 * @returns Complete AlertEvent ready for storage and display
 *
 * @example
 * const alert = finalizeAlertEvent(
 *   candidate,
 *   aggregated,
 *   'student_123',
 *   { seriesLimit: 100, policies: new AlertPolicies() },
 * );
 * alert.id // => 'alert_abc123'
 * alert.severity // => 'important'
 * alert.dedupeKey // => 'xyz789'
 */
export function finalizeAlertEvent(
  candidate: AlertCandidate,
  aggregated: AggregatedResult,
  studentId: string,
  config: FinalizationConfig,
): AlertEvent {
  // Map aggregate score to severity
  const severity = severityFromScore(aggregated.aggregateScore);

  // Generate stable alert ID
  const id = buildAlertId(studentId, candidate.kind, candidate.label, candidate.lastTimestamp);

  // Generate sparkline visualization
  const sparkline = generateSparkline(candidate.series, config.seriesLimit);

  // Compute series statistics
  const seriesStats = computeSeriesStats(candidate.series);

  // Enrich metadata with all context
  const metadata = enrichWithMetadata(
    candidate.metadata,
    aggregated,
    sparkline,
    candidate,
    seriesStats,
  );

  // Construct base alert event
  const baseAlert: Omit<AlertEvent, 'dedupeKey'> = {
    id,
    studentId,
    kind: candidate.kind,
    severity,
    confidence: aggregated.confidence,
    createdAt: new Date(candidate.lastTimestamp).toISOString(),
    status: AlertStatus.New,
    sources: aggregated.rankedSources,
    metadata,
  };

  // Apply governance policies
  return applyPolicies(baseAlert, config.policies);
}

/**
 * Batch finalize multiple alert candidates.
 * Processes candidates in parallel and applies deduplication across the batch.
 *
 * @param candidates - Array of alert candidates to finalize
 * @param aggregatedResults - Array of aggregated results (parallel to candidates)
 * @param studentId - Student identifier
 * @param config - Finalization configuration
 * @returns Array of finalized alert events
 *
 * @example
 * const alerts = batchFinalizeAlerts(
 *   [candidate1, candidate2],
 *   [aggregated1, aggregated2],
 *   'student_123',
 *   config,
 * );
 * alerts.length // => 2
 */
export function batchFinalizeAlerts(
  candidates: AlertCandidate[],
  aggregatedResults: AggregatedResult[],
  studentId: string,
  config: FinalizationConfig,
): AlertEvent[] {
  if (candidates.length !== aggregatedResults.length) {
    throw new Error('Candidates and aggregated results arrays must have same length');
  }

  return candidates.map((candidate, index) => {
    const aggregated = aggregatedResults[index]!;
    return finalizeAlertEvent(candidate, aggregated, studentId, config);
  });
}
