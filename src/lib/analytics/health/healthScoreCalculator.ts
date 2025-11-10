import type { AnalyticsResultsCompat } from '@/lib/analytics/types';
import type { AnalyticsConfiguration } from '@/types/analytics';
import { ANALYTICS_CONFIG } from '@/lib/analyticsConfig';

/**
 * Calculates an "analytics health score" based on the completeness, quality, and
 * confidence of analytics results.
 *
 * @description
 * The health score is a composite metric (0-100) that quantifies the overall quality
 * and reliability of analytics data for a student. It evaluates multiple dimensions
 * including pattern detection, correlation analysis, predictive capabilities, and
 * data sufficiency.
 *
 * ## Scoring Components
 *
 * The score is built from five weighted base components:
 *
 * 1. **Patterns** (default: 20 points)
 *    - Awarded when pattern analysis detects recurring behaviors
 *    - Indicates sufficient data diversity for trend detection
 *
 * 2. **Correlations** (default: 20 points)
 *    - Awarded when correlation analysis finds meaningful relationships
 *    - Suggests data richness for causal inference
 *
 * 3. **Predictions** (default: 20 points)
 *    - Awarded when predictive insights are generated
 *    - Demonstrates temporal data quality for forecasting
 *
 * 4. **Anomalies** (default: 20 points)
 *    - Awarded when anomaly detection identifies outliers
 *    - Confirms baseline establishment and deviation detection
 *
 * 5. **Minimum Data** (default: 20 points)
 *    - Awarded when minimum data thresholds are met
 *    - Ensures statistical validity of other components
 *
 * ## Confidence Scaling
 *
 * After summing base components, the score is scaled by an overall confidence factor (0-1):
 *
 * - **AI Confidence** (preferred): Uses `results.ai.confidence.overall` when available
 * - **Fallback Confidence**: Uses `results.confidence` from heuristic analysis
 * - **Default**: Assumes 1.0 (full confidence) if no confidence metadata exists
 *
 * Formula: `baseScore * confidence`
 *
 * ## AI Quality Bonuses
 *
 * Additional points (up to +11) are awarded for high-quality AI analysis:
 *
 * ### AI Provider Bonus (0-5 points)
 * - **+5 points**: Successful AI analysis (non-heuristic, no fallback)
 * - **+2 points**: Partial AI success (attempted AI with fallback to heuristic)
 * - **+0 points**: Pure heuristic analysis or failed AI
 *
 * ### Data Lineage Bonus (0-3 points)
 * - **+3 points**: 3+ data lineage entries (comprehensive provenance)
 * - **+2 points**: 2 data lineage entries (good provenance)
 * - **+1 point**: 1 data lineage entry (minimal provenance)
 * - **+0 points**: No data lineage metadata
 *
 * Data lineage tracks the source entries used by AI to generate insights,
 * providing explainability and evidence-based recommendations.
 *
 * ## Weight Distribution
 *
 * Default weights create a balanced distribution (100 base points total):
 * - Each of 5 components: 20 points (20% each)
 * - AI bonuses: Up to 11 additional points (separate from base 100)
 *
 * Custom weights can shift emphasis to specific components. For example:
 * ```typescript
 * config.healthScore.WEIGHTS = {
 *   PATTERNS: 30,      // Prioritize pattern detection
 *   CORRELATIONS: 25,
 *   PREDICTIONS: 20,
 *   ANOMALIES: 15,
 *   MINIMUM_DATA: 10   // Less weight for data threshold
 * };
 * ```
 *
 * ## Normalization
 *
 * Final score is clamped to [0, 100] range to ensure UI consistency:
 * - Minimum: 0 (no analytics quality)
 * - Maximum: 100 (perfect analytics quality)
 * - Typical range with bonuses: 0-111 before clamping
 *
 * ## Example Scenarios
 *
 * ### Scenario 1: High-Quality AI Analysis
 * ```typescript
 * Input:
 *   - patterns: [5 results]
 *   - correlations: [3 results]
 *   - predictions: [2 results]
 *   - anomalies: [1 result]
 *   - hasMinimumData: true
 *   - ai.confidence.overall: 0.92
 *   - ai.provider: 'openai/gpt-4'
 *   - ai.dataLineage: [4 entries]
 *   - ai.caveats: []
 *
 * Calculation:
 *   Base: 20 + 20 + 20 + 20 + 20 = 100
 *   Scaled: 100 * 0.92 = 92
 *   AI Provider: +5 (successful AI)
 *   Data Lineage: +3 (4 entries >= 3)
 *   Final: min(100, 92 + 5 + 3) = 100
 * ```
 *
 * ### Scenario 2: Heuristic Analysis with Sparse Data
 * ```typescript
 * Input:
 *   - patterns: [2 results]
 *   - correlations: []
 *   - predictions: []
 *   - anomalies: []
 *   - hasMinimumData: true
 *   - confidence: 0.45 (heuristic)
 *   - ai: undefined
 *
 * Calculation:
 *   Base: 20 + 0 + 0 + 0 + 20 = 40
 *   Scaled: 40 * 0.45 = 18
 *   AI Bonuses: +0 (no AI)
 *   Final: min(100, 18) = 18
 * ```
 *
 * ### Scenario 3: AI with Fallback
 * ```typescript
 * Input:
 *   - patterns: [3 results]
 *   - correlations: [2 results]
 *   - predictions: [1 result]
 *   - anomalies: [1 result]
 *   - hasMinimumData: true
 *   - ai.confidence.overall: 0.78
 *   - ai.provider: 'openai/gpt-4'
 *   - ai.dataLineage: [2 entries]
 *   - ai.caveats: ['Partial fallback to heuristic analysis']
 *
 * Calculation:
 *   Base: 20 + 20 + 20 + 20 + 20 = 100
 *   Scaled: 100 * 0.78 = 78
 *   AI Provider: +2 (AI with fallback)
 *   Data Lineage: +2 (2 entries)
 *   Final: min(100, 78 + 2 + 2) = 82
 * ```
 *
 * ## Configuration
 *
 * Health score weights are configurable via `AnalyticsConfiguration`:
 * ```typescript
 * const config: AnalyticsConfiguration = {
 *   healthScore: {
 *     WEIGHTS: {
 *       PATTERNS: 20,
 *       CORRELATIONS: 20,
 *       PREDICTIONS: 20,
 *       ANOMALIES: 20,
 *       MINIMUM_DATA: 20
 *     }
 *   }
 * };
 * ```
 *
 * ## Usage
 *
 * ### Basic Usage (Default Config)
 * ```typescript
 * import { calculateHealthScore } from '@/lib/analytics/health/healthScoreCalculator';
 *
 * const score = calculateHealthScore(analyticsResults);
 * console.log(`Health Score: ${score}/100`);
 * ```
 *
 * ### With Custom Configuration
 * ```typescript
 * import { calculateHealthScore } from '@/lib/analytics/health/healthScoreCalculator';
 * import { analyticsConfig } from '@/lib/analyticsConfig';
 *
 * const config = analyticsConfig.getConfig();
 * const score = calculateHealthScore(analyticsResults, config);
 * ```
 *
 * ### In Analytics Pipeline
 * ```typescript
 * // After generating analytics results
 * const results = await runAnalytics(student);
 * const healthScore = calculateHealthScore(results);
 *
 * // Update student profile
 * updateProfile({
 *   studentId: student.id,
 *   analyticsHealthScore: healthScore,
 *   lastAnalyzedAt: new Date()
 * });
 * ```
 *
 * ## Design Rationale
 *
 * ### Why Pure Function?
 * - **Testability**: Easy to unit test with various input scenarios
 * - **Predictability**: Same inputs always produce same outputs
 * - **Composability**: Can be used in pipelines without side effects
 * - **Performance**: No external state access or I/O operations
 *
 * ### Why Inject Config?
 * - **Flexibility**: Allows runtime configuration overrides
 * - **Testing**: Easy to test with custom weight distributions
 * - **Defaults**: Falls back to system defaults for simplicity
 * - **Migration**: Supports gradual transition to new config sources
 *
 * ### Why Confidence Scaling?
 * - **Quality Indicator**: Low-confidence results shouldn't yield high scores
 * - **Honest Metrics**: Reflects uncertainty in sparse data scenarios
 * - **AI Transparency**: AI models provide calibrated confidence estimates
 *
 * ### Why AI Bonuses?
 * - **Incentivize Quality**: Rewards successful AI integration
 * - **Differentiate Methods**: Distinguishes AI from pure heuristics
 * - **Encourage Provenance**: Data lineage bonus promotes explainability
 *
 * @param results - Analytics results containing patterns, correlations, predictions, and anomalies
 * @param config - Optional analytics configuration for custom weight distribution
 * @returns A health score from 0 to 100, where higher scores indicate better analytics quality
 *
 * @example
 * // Minimal usage with defaults
 * const score = calculateHealthScore(results);
 *
 * @example
 * // With runtime configuration
 * const config = analyticsConfig.getConfig();
 * const score = calculateHealthScore(results, config);
 *
 * @example
 * // In a profile update flow
 * const profile = {
 *   studentId: 'student-123',
 *   analyticsHealthScore: calculateHealthScore(results),
 *   lastAnalyzedAt: new Date()
 * };
 *
 * @public
 * @pure
 * @since 2.3.0
 */
export function calculateHealthScore(
  results: AnalyticsResultsCompat,
  config?: AnalyticsConfiguration
): number {
  // Extract weights from config with safe fallback to defaults
  const { WEIGHTS } = config?.healthScore ?? ANALYTICS_CONFIG.healthScore;

  let score = 0;

  // Component 1: Patterns
  if (results.patterns.length > 0) {
    score += WEIGHTS.PATTERNS;
  }

  // Component 2: Correlations
  if (results.correlations.length > 0) {
    score += WEIGHTS.CORRELATIONS;
  }

  // Component 3: Predictions
  if (results.predictiveInsights.length > 0) {
    score += WEIGHTS.PREDICTIONS;
  }

  // Component 4: Anomalies
  if (results.anomalies.length > 0) {
    score += WEIGHTS.ANOMALIES;
  }

  // Component 5: Minimum Data
  // Use optional metadata if provided; otherwise infer from presence of patterns/correlations
  const extended = results as AnalyticsResultsCompat & {
    hasMinimumData?: boolean;
    confidence?: number;
  };
  const hasMinimumData = extended.hasMinimumData ?? (
    results.patterns.length > 0 || results.correlations.length > 0
  );
  if (hasMinimumData) {
    score += WEIGHTS.MINIMUM_DATA;
  }

  // Confidence Scaling: Prefer AI confidence when available
  const aiConfidence = typeof results.ai?.confidence?.overall === 'number'
    ? results.ai.confidence.overall
    : undefined;
  const confidence = typeof aiConfidence === 'number'
    ? aiConfidence
    : (typeof extended.confidence === 'number' ? extended.confidence : 1);

  // Scale base score by confidence
  let finalScore = Math.round(score * confidence);

  // AI Quality Bonuses: Small additive boosts for high-quality AI runs
  if (results.ai) {
    const caveats = results.ai.caveats || [];
    const usedFallback = caveats.some(c => /fallback/i.test(c));
    const heuristicOnly = (results.ai.provider || '').toLowerCase() === 'heuristic';

    // AI Provider Bonus
    if (!heuristicOnly && !usedFallback) {
      // Bonus for successful AI (non-heuristic, no fallback)
      finalScore += 5;
    } else if (!heuristicOnly && usedFallback) {
      // Partial credit for attempted AI with safe fallback
      finalScore += 2;
    }

    // Data Lineage Bonus: Modest boost based on presence/coverage
    const lineageCount = results.ai.dataLineage?.length ?? 0;
    if (lineageCount >= 3) {
      finalScore += 3;
    } else if (lineageCount === 2) {
      finalScore += 2;
    } else if (lineageCount === 1) {
      finalScore += 1;
    }
  }

  // Normalize to [0, 100] range
  return Math.max(0, Math.min(100, finalScore));
}
