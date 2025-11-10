/**
 * Result Aggregation Module
 *
 * Processes and aggregates detector results for alert candidates.
 * Handles result validation, score combination, confidence calculation,
 * and weighted aggregation using the formula:
 *   0.4 * impact + 0.25 * confidence + 0.2 * recency + 0.15 * tier
 *
 * @module resultAggregator
 */

import { DetectorResult, isValidDetectorResult, AlertSource } from '@/lib/alerts/types';
import { computeRecencyScore, rankSources } from '@/lib/alerts/scoring';

/**
 * Aggregated result from multiple detectors for a single alert candidate.
 */
export interface AggregatedResult {
  /** Maximum impact score across all detectors (0-1) */
  impact: number;
  /** Maximum confidence across all detectors (0-1) */
  confidence: number;
  /** Time-decay weighted recency score (0-1) */
  recency: number;
  /** Tier score representing detection quality (0-1) */
  tierScore: number;
  /** Final weighted aggregate score (0-1) */
  aggregateScore: number;
  /** Ranked sources (top 3) from all detectors */
  rankedSources: AlertSource[];
  /** Score breakdown for diagnostics */
  scoreBreakdown: {
    impact: number;
    confidence: number;
    recency: number;
    tier: number;
  };
}

/**
 * Configuration for result aggregation weighting.
 * Default weights: impact=0.4, confidence=0.25, recency=0.2, tier=0.15
 */
export interface AggregationWeights {
  impact: number;
  confidence: number;
  recency: number;
  tier: number;
}

const DEFAULT_WEIGHTS: AggregationWeights = {
  impact: 0.4,
  confidence: 0.25,
  recency: 0.2,
  tier: 0.15,
};

/**
 * Filter detector results to only valid ones.
 * Uses type guard validation to ensure score and confidence are in valid ranges.
 *
 * @param detectorResults - Raw detector results to filter
 * @returns Array of valid detector results
 *
 * @example
 * const valid = filterValidResults([
 *   { score: 0.8, confidence: 0.9 },
 *   { score: NaN, confidence: 0.5 }, // Invalid - filtered out
 * ]);
 * valid.length // => 1
 */
export function filterValidResults(detectorResults: DetectorResult[]): DetectorResult[] {
  return detectorResults.filter((result) => isValidDetectorResult(result));
}

/**
 * Combine detector scores using maximum aggregation.
 * Extracts the highest impact and confidence scores across all valid detectors.
 *
 * @param detectorResults - Array of detector results to combine
 * @returns Object with max impact and confidence scores
 *
 * @example
 * const combined = combineDetectorScores([
 *   { score: 0.8, confidence: 0.7 },
 *   { score: 0.6, confidence: 0.9 },
 * ]);
 * combined.impact // => 0.8 (max score)
 * combined.confidence // => 0.9 (max confidence)
 */
export function combineDetectorScores(
  detectorResults: DetectorResult[],
): { impact: number; confidence: number } {
  const validResults = filterValidResults(detectorResults);

  if (validResults.length === 0) {
    return { impact: 0, confidence: 0 };
  }

  const impact = Math.max(...validResults.map((d) => d.score ?? 0), 0);
  const confidence = Math.max(...validResults.map((d) => d.confidence ?? 0), 0);

  return { impact, confidence };
}

/**
 * Calculate aggregate confidence using weighted formula with tier adjustment.
 * Higher tier values indicate multiple detectors agreeing, boosting confidence.
 *
 * Formula: min(1, baseConfidence * (1 + tierBoost))
 * where tierBoost = (tier - 0.5) * 0.3
 *
 * @param baseConfidence - Base confidence from detectors (0-1)
 * @param tier - Tier score representing detection quality (0-1)
 * @returns Adjusted confidence score (0-1)
 *
 * @example
 * calculateAggregateConfidence(0.7, 1.0) // High tier (multiple detectors)
 * // => ~0.805 (confidence boosted by tier)
 *
 * calculateAggregateConfidence(0.7, 0.8) // Medium tier
 * // => ~0.763
 */
export function calculateAggregateConfidence(baseConfidence: number, tier: number): number {
  const clampedTier = Math.max(0, Math.min(1, tier));
  const tierBoost = (clampedTier - 0.5) * 0.3;
  const adjusted = baseConfidence * (1 + tierBoost);
  return Math.max(0, Math.min(1, adjusted));
}

/**
 * Aggregate multiple detector results into a single composite result.
 * Combines scores using weighted aggregation and ranks sources by importance.
 *
 * Aggregation formula:
 *   0.4 * impact + 0.25 * confidence + 0.2 * recency + 0.15 * tier
 *
 * @param detectorResults - Array of detector results to aggregate
 * @param lastTimestamp - Timestamp of the last event in milliseconds
 * @param tier - Quality tier score (0-1), higher indicates more detectors
 * @param nowTs - Current timestamp in milliseconds for recency calculation
 * @param weights - Optional custom aggregation weights (defaults to 0.4/0.25/0.2/0.15)
 * @returns Aggregated result with composite score and ranked sources
 *
 * @example
 * const aggregated = aggregateDetectorResults(
 *   [
 *     { score: 0.8, confidence: 0.9, sources: [...] },
 *     { score: 0.7, confidence: 0.8, sources: [...] },
 *   ],
 *   Date.now() - 3600000, // 1 hour ago
 *   1.0, // High tier (multiple detectors)
 *   Date.now(),
 * );
 * aggregated.aggregateScore // => ~0.7 (weighted combination)
 * aggregated.rankedSources // => [S1, S2, S3] (top 3 sources)
 */
export function aggregateDetectorResults(
  detectorResults: DetectorResult[],
  lastTimestamp: number,
  tier: number,
  nowTs: number,
  weights: AggregationWeights = DEFAULT_WEIGHTS,
): AggregatedResult {
  const validResults = filterValidResults(detectorResults);

  if (validResults.length === 0) {
    return {
      impact: 0,
      confidence: 0,
      recency: 0,
      tierScore: 0,
      aggregateScore: 0,
      rankedSources: [],
      scoreBreakdown: { impact: 0, confidence: 0, recency: 0, tier: 0 },
    };
  }

  // Extract max scores
  const { impact, confidence } = combineDetectorScores(validResults);

  // Calculate recency decay
  const recency = computeRecencyScore(lastTimestamp, nowTs);

  // Normalize and clamp tier
  const tierScore = Math.max(0, Math.min(1, tier));

  // Apply weighted aggregation
  const aggregateScore = Math.min(
    1,
    weights.impact * impact +
      weights.confidence * confidence +
      weights.recency * recency +
      weights.tier * tierScore,
  );

  // Rank sources by score * confidence weighting
  const rankedSources = rankSources(validResults);

  return {
    impact,
    confidence,
    recency,
    tierScore,
    aggregateScore,
    rankedSources,
    scoreBreakdown: {
      impact,
      confidence,
      recency,
      tier: tierScore,
    },
  };
}

/**
 * Calculate detection quality metrics for diagnostics.
 * Provides insight into the reliability of the detection results.
 *
 * @param detectorResults - Array of detector results
 * @param seriesLength - Length of the time series used for detection
 * @returns Quality metrics object
 *
 * @example
 * const quality = computeDetectionQuality(detectors, 100);
 * quality.validDetectors // => 2
 * quality.avgConfidence // => 0.85
 * quality.seriesLength // => 100
 */
export function computeDetectionQuality(
  detectorResults: DetectorResult[],
  seriesLength: number,
): { validDetectors: number; avgConfidence: number; seriesLength: number } {
  const valid = filterValidResults(detectorResults);
  const avgConfidence = valid.length
    ? valid.reduce((sum, d) => sum + (d.confidence ?? 0), 0) / valid.length
    : 0;

  return {
    validDetectors: valid.length,
    avgConfidence,
    seriesLength,
  };
}
