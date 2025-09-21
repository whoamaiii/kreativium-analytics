// Shared analytics-related types
// No default exports per project rules

export type TabKey = 'overview' | 'explore' | 'alerts';
/** Preset options within the Explore tab */
export type ExplorePreset = 'charts' | 'patterns' | 'correlations';
/**
 * Export formats for analytics report generation
 */
export type ExportFormat = 'pdf' | 'csv' | 'json';

/**
 * Type definitions for analytics and pattern analysis
 */
import { PatternResult, CorrelationResult } from '@/lib/patternAnalysis';
import { PredictiveInsight, AnomalyDetection } from '@/lib/enhancedPatternAnalysis';
import { EmotionEntry, SensoryEntry, TrackingEntry } from './student';
import type { Goal } from './student';
import type { AnalyticsInputs, AnalyticsRuntimeConfig } from '@/types/insights';
import type { AnalyticsConfiguration as SourceAnalyticsConfiguration } from '@/lib/analyticsConfig';
import type { PRESET_CONFIGS as SOURCE_PRESETS } from '@/lib/analyticsConfig';
import { DEFAULT_ANALYTICS_CONFIG } from '@/lib/analyticsConfig';

// -----------------------------------------------------------------------------
// Rich source details for AI explanations and citations
// -----------------------------------------------------------------------------

export interface SourceEmotionItem {
  id: string;
  emotion: string;
  intensity?: number;
  notes?: string;
}

export interface SourceSensoryItem {
  id: string;
  type?: string;
  response?: string;
  intensity?: number;
  notes?: string;
}

export interface SourceEnvironmentDetails {
  lighting?: string;
  noiseLevel?: number;
  temperature?: number;
  humidity?: number;
  weather?: string;
  timeOfDay?: string;
  studentCount?: number;
  notes?: string;
}

export interface SourceItem {
  id: string;
  timestamp: string;
  activity?: string;
  place?: string;
  socialContext?: string;
  note?: string;
  emotions: SourceEmotionItem[];
  sensory: SourceSensoryItem[];
  environment?: SourceEnvironmentDetails;
}

// -----------------------------------------------------------------------------
// Intervention Results (AI-suggested interventions with evidence metadata)
// -----------------------------------------------------------------------------

/** Severity level used for intervention expected impact. */
export type InterventionSeverity = 'low' | 'medium' | 'high';

/** Time horizon for interventions. */
export type InterventionTimeHorizon = 'short' | 'medium' | 'long';

/** Confidence metadata for interventions (subset of AI confidence). */
export interface InterventionConfidence {
  overall?: number;
  calibration?: string;
}

/** MTSS/RTI tier classification for interventions. */
export type InterventionTier = 'Tier1' | 'Tier2' | 'Tier3';

/** Scope of intervention application. */
export type InterventionScope = 'classroom' | 'school';

/**
 * UI-consumable format for AI-generated interventions with preserved evidence metadata.
 * Bridges AI schema interventions to the analytics/UI domain while maintaining traceability.
 */
export interface InterventionResult {
  // Core fields for UI display
  title: string;
  description: string;
  actions: string[];
  expectedImpact?: InterventionSeverity;
  timeHorizon?: InterventionTimeHorizon;
  metrics: string[];
  confidence?: InterventionConfidence;

  // Evidence and provenance fields
  sources: string[];
  udlCheckpoints?: string[];
  hlps?: string[];
  tier?: InterventionTier;
  scope?: InterventionScope;
}

/**
 * Analytics data input structure
 */
export interface AnalyticsData {
  entries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  goals?: Goal[];
  cacheKey?: string;
  /** Optional runtime analytics configuration to use for this run. */
  config?: AnalyticsConfiguration;
}

/**
 * Keys representing dashboard charts that can be updated by worker messages
 */
export type AnalyticsChartKey =
  | 'emotionDistribution'
  | 'sensoryResponses'
  | 'emotionTrends'
  | 'patternHighlights'
  | 'correlationMatrix'
  | 'predictiveTimeline'
  | 'anomalyTimeline'
  | 'insightList';

/**
 * Analytics results structure
 */
export interface AnalyticsResults {
  patterns: PatternResult[];
  correlations: CorrelationResult[];
  environmentalCorrelations?: CorrelationResult[];
  predictiveInsights: PredictiveInsight[];
  anomalies: AnomalyDetection[];
  insights: string[];
  /**
   * AI-generated interventions mapped into a UI-friendly format with evidence metadata.
   * Always defaults to [] when no interventions are available.
   * Non-optional to ensure consistent shape across all analytics results.
   */
  suggestedInterventions: InterventionResult[];
  cacheKey?: string;
  error?: string;
  /** Overall confidence score (0-1) for the analysis results quality */
  confidence?: number;
  /** Optional metadata for downstream consumers describing which charts should update */
  updatedCharts?: AnalyticsChartKey[];
}

/**
 * Partial analytics results for incremental updates from the worker
 */
export type AnalyticsResultsPartial = Partial<AnalyticsResults> & { cacheKey?: string };

/**
 * Worker message envelope for incremental communication
 */
export type WorkerMessageType = 'progress' | 'partial' | 'complete' | 'error';

export interface AnalyticsWorkerMessage {
  type: WorkerMessageType;
  cacheKey?: string;
  payload?: AnalyticsResultsPartial;
  error?: string;
  /** Which charts should update in response to this message */
  chartsUpdated?: AnalyticsChartKey[];
  /** Optional progress metadata for UI feedback and watchdog heartbeats */
  progress?: { stage: string; percent: number };
}

// -----------------------------------------------------------------------------
// Configuration Types (exported explicitly)
// -----------------------------------------------------------------------------

/**
 * Full analytics configuration shape. Source of truth lives in lib/analyticsConfig.
 * Consumers should read values via analyticsConfig.getConfig() at runtime.
 */
export type AnalyticsConfiguration = SourceAnalyticsConfiguration;

/** Pattern analysis thresholds and limits. */
export type PatternAnalysisConfig = AnalyticsConfiguration['patternAnalysis'];

/** Feature engineering settings for data preprocessing and transformation. */
export type FeatureEngineeringConfig = AnalyticsConfiguration['featureEngineering'];

/** Enhanced pattern analysis (trends, anomalies, predictions) settings. */
export type EnhancedAnalysisConfig = AnalyticsConfiguration['enhancedAnalysis'];

/** Time windows used for segmenting and aggregating data. */
export type TimeWindowsConfig = AnalyticsConfiguration['timeWindows'];

/** Alert sensitivity multipliers and level. */
export type AlertSensitivityConfig = AnalyticsConfiguration['alertSensitivity'];

/** Cache behavior configuration. */
export type CacheConfig = AnalyticsConfiguration['cache'];

/** Insight-related numeric thresholds and limits. */
export type InsightsConfig = AnalyticsConfiguration['insights'];

/** Confidence scoring thresholds and weights. */
export type ConfidenceConfig = AnalyticsConfiguration['confidence'];

/** Health score weighting configuration. */
export type HealthScoreConfig = AnalyticsConfiguration['healthScore'];

/** General analytics minimums and analysis period. */
export type CoreAnalyticsConfig = AnalyticsConfiguration['analytics'];

/** Emotion taxonomy and related lists. */
export type TaxonomyConfig = AnalyticsConfiguration['taxonomy'];

/** Available preset configuration keys. */
export type AnalyticsPresetKey = keyof typeof SOURCE_PRESETS;

// -----------------------------------------------------------------------------
// JSDoc for configuration options (field-level)
// -----------------------------------------------------------------------------

/**
 * Field-level documentation for FeatureEngineeringConfig
 *
 * - timeEncoding.variant: Time encoding strategy ('sixFeatureV1' uses 6 temporal features, 'none' disables time encoding).
 * - normalization.clampToUnit: Whether to clamp normalized values to [0,1] range for stability.
 * - normalization.minVariance: Minimum variance threshold to prevent division by zero in normalization.
 */
export type _Doc_FeatureEngineeringConfig = FeatureEngineeringConfig;

/**
 * Field-level documentation for PatternAnalysisConfig
 *
 * - minDataPoints: Minimum number of observations required before running correlation/pattern rules.
 * - correlationThreshold: Minimum absolute correlation (0..1) considered noteworthy.
 * - highIntensityThreshold: Value (e.g., 1..5) at/above which an emotion is considered high intensity.
 * - concernFrequencyThreshold: Proportion (0..1) of events considered frequent enough to flag concerns.
 * - emotionConsistencyThreshold: Proportion (0..1) indicating how consistent an emotion must be to form a pattern.
 * - moderateNegativeThreshold: Proportion (0..1) indicating moderate negative signals for early warnings.
 */
export type _Doc_PatternAnalysisConfig = PatternAnalysisConfig;

/**
 * Field-level documentation for EnhancedAnalysisConfig
 *
 * - minSampleSize: Minimum sample size for enhanced analyses to engage.
 * - trendThreshold: Minimum slope magnitude considered a meaningful trend (moved from hardcoded 0).
 * - predictionConfidenceThreshold: Probability threshold (0..1) to include predictions.
 * - anomalyThreshold: Z-score threshold for anomaly detection (switch from standard deviations).
 * - huber.delta: Huber loss function parameter for robust regression.
 * - huber.maxIter: Maximum iterations for Huber regression convergence.
 * - huber.tol: Convergence tolerance for Huber regression.
 * - qualityTargets.pointsTarget: Target number of data points for quality assessment.
 * - qualityTargets.timeSpanDaysTarget: Target time span in days for quality assessment.
 * - correlationSignificance.high: Correlation threshold considered highly significant.
 * - correlationSignificance.moderate: Correlation threshold considered moderately significant.
 * - correlationSignificance.low: Correlation threshold considered low significance.
 * - riskAssessment.stressIntensityThreshold: Intensity threshold for stress-related risk assessment.
 * - riskAssessment.stressEmotions: List of emotions considered stress indicators.
 */
export type _Doc_EnhancedAnalysisConfig = EnhancedAnalysisConfig;

/**
 * Field-level documentation for TimeWindowsConfig
 *
 * - defaultAnalysisDays: Default lookback window for general analytics.
 * - recentDataDays: Recent window used for short-term insights.
 * - shortTermDays: Alternate short-term window (e.g., 2 weeks).
 * - longTermDays: Extended window for stability checks and baselines.
 */
export type _Doc_TimeWindowsConfig = TimeWindowsConfig;

/**
 * Field-level documentation for AlertSensitivityConfig
 *
 * - level: Coarse-grained sensitivity level (low|medium|high).
 * - emotionIntensityMultiplier: Scales intensity-related triggers.
 * - frequencyMultiplier: Scales frequency-related triggers.
 * - anomalyMultiplier: Scales anomaly-related triggers.
 */
export type _Doc_AlertSensitivityConfig = AlertSensitivityConfig;

/**
 * Field-level documentation for CacheConfig
 *
 * - ttl: Time-to-live in milliseconds for cached results.
 * - maxSize: Maximum number of cached entries.
 * - invalidateOnConfigChange: If true, clears caches when config changes.
 */
export type _Doc_CacheConfig = CacheConfig;

/**
 * Field-level documentation for InsightsConfig
 *
 * - MIN_SESSIONS_FOR_FULL_ANALYTICS: Minimum sessions before enabling full analytics.
 * - HIGH_CONFIDENCE_PATTERN_THRESHOLD: Threshold (0..1) for labeling high-confidence patterns.
 * - MAX_PATTERNS_TO_SHOW: Limit for patterns in UI.
 * - MAX_CORRELATIONS_TO_SHOW: Limit for correlations in UI.
 * - MAX_PREDICTIONS_TO_SHOW: Limit for predictive insights in UI.
 * - RECENT_EMOTION_COUNT: Number of latest emotion entries to consider "recent".
 * - POSITIVE_EMOTION_TREND_THRESHOLD: Threshold (0..1) for positive trend highlighting.
 * - NEGATIVE_EMOTION_TREND_THRESHOLD: Threshold (0..1) for negative trend highlighting.
 */
export type _Doc_InsightsConfig = InsightsConfig;

/**
 * Field-level documentation for ConfidenceConfig
 *
 * - THRESHOLDS: Minimum data presence and recency limits.
 *   - EMOTION_ENTRIES, SENSORY_ENTRIES, TRACKING_ENTRIES, DAYS_SINCE_LAST_ENTRY
 * - WEIGHTS: Relative contributions to the overall confidence score.
 *   - EMOTION, SENSORY, TRACKING, RECENCY_BOOST
 */
export type _Doc_ConfidenceConfig = ConfidenceConfig;

/**
 * Field-level documentation for HealthScoreConfig
 *
 * - WEIGHTS: Weight distribution across analytics dimensions.
 *   - PATTERNS, CORRELATIONS, PREDICTIONS, ANOMALIES, MINIMUM_DATA
 */
export type _Doc_HealthScoreConfig = HealthScoreConfig;

/**
 * Field-level documentation for CoreAnalyticsConfig
 *
 * - MIN_TRACKING_FOR_CORRELATION: Minimum tracking entries required before computing correlations.
 * - MIN_TRACKING_FOR_ENHANCED: Minimum tracking entries required before running enhanced analyses.
 * - ANALYSIS_PERIOD_DAYS: Default analysis period for background jobs.
 */
export type _Doc_CoreAnalyticsConfig = CoreAnalyticsConfig;

/**
 * Field-level documentation for TaxonomyConfig
 *
 * - positiveEmotions: List of emotion labels considered positive, used by insights and summaries.
 */
export type _Doc_TaxonomyConfig = TaxonomyConfig;

// -----------------------------------------------------------------------------
// Examples (for documentation and tests)
// -----------------------------------------------------------------------------

/** Example: Balanced/default configuration clone. */
 

// -----------------------------------------------------------------------------
// Migration Notes (breaking changes guidance)
// -----------------------------------------------------------------------------

/**
 * Migration Notes:
 *
 * 1) Taxonomy location
 *    - Then: POSITIVE_EMOTIONS was often referenced via ANALYTICS_CONFIG.POSITIVE_EMOTIONS (Set)
 *    - Now:  Use analyticsConfig.getConfig().taxonomy.positiveEmotions (string[])
 *    - Why:  Consolidate emotion taxonomy under a dedicated section and prefer serializable arrays.
 *    - Action: Replace Set-based checks with array includes or convert to Set locally when needed.
 *
 * 2) Runtime access
 *    - Then: Some modules imported DEFAULT_ANALYTICS_CONFIG directly.
 *    - Now:  Read current config through analyticsConfig.getConfig() to respect user overrides.
 *    - Action: Only import types from this module; prefer runtime reads via analyticsConfig.
 *
 * 3) Presets
 *    - Preset keys are available via AnalyticsPresetKey. Use analyticsConfig.setPreset(key) at runtime.
 */
 

// -----------------------------------------------------------------------------
// Cache & Manager types
// -----------------------------------------------------------------------------

/**
 * Cache interface for pattern analysis
 */
export interface AnalyticsCacheInterface {
  get(key: string): unknown | undefined;
  set(key: string, value: unknown, tags?: string[]): void;
  has(key: string): boolean;
  invalidateByTag(tag: string): number;
  getDataFingerprint(data: unknown): string;
  createKey(prefix: string, params: Record<string, unknown>): string;
}

/**
 * Worker cache entry
 */
export interface WorkerCacheEntry {
  data: unknown;
  expires: number;
  tags?: string[];
}

/**
 * Options for configuring the analytics manager, including cache behavior and
 * runtime config. This is used by hooks (e.g., useAnalyticsWorker) and
 * services coordinating analytics runs.
 */
export interface AnalyticsManagerOptions {
  /** Time-to-live for cached results in seconds. */
  ttlSeconds?: number;
  /** Tags for grouping and invalidating cached entries. */
  tags?: string[];
  /** Runtime configuration overrides for analytics processing. */
  config?: AnalyticsRuntimeConfig;
}

/**
 * Task sent to analytics workers/queues. Keeps payloads small and typed.
 */
export interface AnalyticsWorkerTask {
  /** Logical task type (e.g., 'insights', 'patterns', 'full'). */
  type: string;
  /** Typed payload describing the inputs for the computation. */
  payload: AnalyticsInputs;
  /** Stable cache key for deduplication and reuse. */
  cacheKey: string;
  /** TTL to apply to the produced result, in seconds. */
  ttlSeconds?: number;
  /** Cache tags for invalidation. */
  tags?: string[];
}
