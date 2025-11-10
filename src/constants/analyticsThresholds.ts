/**
 * @file Analytics Thresholds and Configuration Constants
 *
 * Centralized constants for analytics computation, alert detection, and data processing.
 * All magic numbers should be extracted here with clear documentation explaining:
 * - What the value represents
 * - Why this specific value was chosen
 * - The context in which it's used
 *
 * Guidelines:
 * - Use SCREAMING_SNAKE_CASE for constants
 * - Group related constants into namespaced objects
 * - Include JSDoc comments with examples
 * - Use `as const` for type safety
 * - Mark units in variable names (MS for milliseconds, DAYS, etc.)
 */

// =============================================================================
// CORRELATION & STATISTICAL THRESHOLDS
// =============================================================================

/**
 * Statistical correlation thresholds for pattern analysis.
 *
 * Based on Pearson correlation coefficient interpretation:
 * - 0.00-0.25: Very weak correlation (exploratory only)
 * - 0.25-0.50: Weak correlation (potential patterns)
 * - 0.50-0.70: Moderate correlation (actionable insights)
 * - 0.70-0.90: Strong correlation (high confidence)
 * - 0.90-1.00: Very strong correlation (rare in behavioral data)
 *
 * Context: Special education behavioral tracking typically sees correlations
 * in the 0.3-0.6 range due to the complexity of human behavior.
 *
 * @see {@link https://en.wikipedia.org/wiki/Pearson_correlation_coefficient}
 */
export const CORRELATION_THRESHOLDS = {
  /** Minimum correlation to display in UI (reduces noise, shows weak patterns) */
  DISPLAY: 0.25,

  /** Minimum correlation for pattern labels and badges */
  LABEL: 0.25,

  /** Threshold for "significant" correlation in insights */
  SIGNIFICANT: 0.5,

  /** Threshold for "strong" correlation used in high-priority alerts */
  STRONG: 0.7,

  /** Conservative threshold used in "conservative" analytics preset */
  CONSERVATIVE: 0.4,

  /** Sensitive threshold used in "sensitive" analytics preset */
  SENSITIVE: 0.15,
} as const;

/**
 * Statistical significance levels for correlation analysis.
 *
 * Used to categorize correlations into low/moderate/high significance
 * for natural language insights and report generation.
 */
export const CORRELATION_SIGNIFICANCE = {
  /** High significance: strong, actionable patterns */
  HIGH: 0.7,

  /** Moderate significance: notable patterns worth investigating */
  MODERATE: 0.5,

  /** Low significance: weak patterns, exploratory only */
  LOW: 0.3,
} as const;

// =============================================================================
// TIME WINDOWS & ANALYSIS PERIODS
// =============================================================================

/**
 * Time windows for analytics computations and trend analysis.
 *
 * Designed to align with special education practices:
 * - 7 days: Weekly review cycles, immediate behavioral changes
 * - 14 days: Short-term intervention response (2-week sprint)
 * - 30 days: Monthly reporting periods, standard baseline
 * - 90 days: Quarterly assessments, IEP review cycles, long-term trends
 *
 * These windows balance statistical validity (more data = better) with
 * recency (recent data = more relevant for current behavior).
 */
export const TIME_WINDOWS = {
  /** Recent data window for "what happened this week" views */
  RECENT_DAYS: 7,

  /** Short-term analysis for intervention response tracking (2 weeks) */
  SHORT_TERM_DAYS: 14,

  /** Default analysis window for baseline establishment (1 month) */
  DEFAULT_ANALYSIS_DAYS: 30,

  /** Long-term trend analysis for quarterly reviews (3 months) */
  LONG_TERM_DAYS: 90,

  /** Target time span for high-quality statistical analysis (3 weeks) */
  QUALITY_TIME_SPAN_DAYS: 21,
} as const;

// =============================================================================
// DATA QUALITY & SAMPLE SIZE THRESHOLDS
// =============================================================================

/**
 * Minimum sample sizes and data quality thresholds.
 *
 * Based on statistical validity requirements:
 * - 3 points: Absolute minimum for any computation
 * - 5 points: Minimum for basic trend detection
 * - 30 points: Target for high-quality statistical analysis (Central Limit Theorem)
 *
 * Context: With daily tracking, 30 points = 1 month of data.
 * For twice-daily tracking, 30 points = 2 weeks of data.
 */
export const DATA_QUALITY = {
  /** Absolute minimum data points for any pattern analysis */
  MIN_DATA_POINTS: 3,

  /** Minimum sample size for enhanced analysis and predictions */
  MIN_SAMPLE_SIZE: 5,

  /** Target data points for high-quality statistical analysis */
  POINTS_TARGET: 30,

  /** Minimum tracking entries required for correlation analysis */
  MIN_TRACKING_FOR_CORRELATION: 3,

  /** Minimum tracking entries required for enhanced analytics */
  MIN_TRACKING_FOR_ENHANCED: 2,

  /** Minimum sessions required before showing full analytics */
  MIN_SESSIONS_FOR_FULL_ANALYTICS: 5,

  /** Conservative preset: requires more data for reliability */
  MIN_DATA_POINTS_CONSERVATIVE: 5,

  /** Conservative preset: higher sample size for predictions */
  MIN_SAMPLE_SIZE_CONSERVATIVE: 8,

  /** Sensitive preset: allows earlier detection with less data */
  MIN_DATA_POINTS_SENSITIVE: 2,

  /** Sensitive preset: enables predictions with smaller samples */
  MIN_SAMPLE_SIZE_SENSITIVE: 3,
} as const;

/**
 * Confidence thresholds for data quality and prediction reliability.
 *
 * Used to assess whether insights are reliable enough to show to users.
 * Lower confidence insights are hidden or marked as "preliminary".
 */
export const CONFIDENCE_THRESHOLDS = {
  /** Minimum confidence for showing patterns to users */
  HIGH_CONFIDENCE_PATTERN: 0.6,

  /** Minimum confidence for predictions and forecasts */
  PREDICTION_CONFIDENCE: 0.6,

  /** Threshold for emotion entry data sufficiency */
  EMOTION_ENTRIES: 10,

  /** Threshold for sensory entry data sufficiency */
  SENSORY_ENTRIES: 10,

  /** Threshold for tracking entry data sufficiency */
  TRACKING_ENTRIES: 5,

  /** Maximum days since last entry before data is considered stale */
  DAYS_SINCE_LAST_ENTRY: 7,
} as const;

// =============================================================================
// ANOMALY DETECTION THRESHOLDS
// =============================================================================

/**
 * Anomaly detection thresholds using z-scores (standard deviations).
 *
 * Z-score interpretation:
 * - 1.0: 68% of data falls within ±1σ (common, not anomalous)
 * - 2.0: 95% of data falls within ±2σ (unusual, worth noting)
 * - 2.5: 99% of data falls within ±2.5σ (anomalous, default threshold)
 * - 3.0: 99.7% of data falls within ±3σ (highly anomalous)
 *
 * In behavioral data, z > 2.5 is a good balance between sensitivity
 * and specificity (catching real anomalies without too many false alarms).
 *
 * @see {@link https://en.wikipedia.org/wiki/Standard_score}
 */
export const ANOMALY_THRESHOLDS = {
  /** Default anomaly threshold (2.5 standard deviations) */
  DEFAULT: 2.5,

  /** Medium severity threshold for anomaly classification */
  MEDIUM_SEVERITY: 2.5,

  /** High severity threshold for critical anomalies */
  HIGH_SEVERITY: 3.0,

  /** Conservative preset: requires stronger evidence (3σ) */
  CONSERVATIVE: 3.0,

  /** Sensitive preset: catches earlier deviations (2σ) */
  SENSITIVE: 2.0,
} as const;

/**
 * Trend detection thresholds for time series analysis.
 *
 * A trend threshold of 0.02 means we require at least a 2% change
 * in the slope to consider it a meaningful trend (vs. random noise).
 */
export const TREND_THRESHOLDS = {
  /** Minimum trend slope to classify as "increasing" or "decreasing" */
  MINIMUM_SLOPE: 0.02,
} as const;

// =============================================================================
// INTENSITY & SEVERITY THRESHOLDS
// =============================================================================

/**
 * Intensity thresholds for emotion and sensory data.
 *
 * Kreativium uses a 1-10 scale for intensity:
 * - 1-3: Low intensity (calm, manageable)
 * - 4-6: Moderate intensity (noticeable, requires attention)
 * - 7-10: High intensity (significant, may require intervention)
 *
 * These thresholds determine when to surface insights and alerts.
 */
export const INTENSITY_THRESHOLDS = {
  /** Threshold for "high intensity" emotions (intervention may be needed) */
  HIGH_INTENSITY: 4,

  /** Threshold for displaying emotion data in charts */
  EMOTION_DISPLAY: 7,

  /** Threshold for displaying sensory data in charts */
  SENSORY_DISPLAY: 5,

  /** Threshold for stress assessment (intensity ≥ 4 = potential stress) */
  STRESS_INTENSITY: 4,
} as const;

/**
 * Frequency thresholds for pattern classification.
 *
 * Used to determine if a pattern occurs "often" enough to warrant attention.
 * Expressed as ratios (0.0 to 1.0).
 */
export const FREQUENCY_THRESHOLDS = {
  /** Minimum frequency for "concern" classification (30% of observations) */
  CONCERN_FREQUENCY: 0.3,

  /** Minimum frequency for emotion consistency analysis (40%) */
  EMOTION_CONSISTENCY: 0.4,

  /** Threshold for "mostly negative" classification (40%) */
  MODERATE_NEGATIVE: 0.4,

  /** Conservative preset: requires higher frequency for concerns */
  CONCERN_FREQUENCY_CONSERVATIVE: 0.4,

  /** Sensitive preset: detects concerns at lower frequencies */
  CONCERN_FREQUENCY_SENSITIVE: 0.2,
} as const;

// =============================================================================
// EMOTION TREND THRESHOLDS
// =============================================================================

/**
 * Thresholds for emotion trend classification.
 *
 * Used to determine if emotion trends are "improving" or "declining"
 * based on the ratio of positive to negative emotions.
 */
export const EMOTION_TREND_THRESHOLDS = {
  /** Threshold for "positive trend" (60% positive emotions) */
  POSITIVE: 0.6,

  /** Threshold for "negative trend" (30% or more negative emotions) */
  NEGATIVE: 0.3,

  /** Number of recent emotions to consider for trend analysis */
  RECENT_COUNT: 7,
} as const;

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

/**
 * Cache configuration optimized for analytics workload patterns.
 *
 * Design rationale:
 * - 10 minutes TTL: Balance between responsiveness and data freshness
 *   During active use, queries repeat frequently (dashboard, filters).
 *   After 10 minutes of inactivity, data may have changed.
 *
 * - 50 entries: Typical usage is 10 students × 5 different view configurations
 *   (different time windows, filters, etc.) per student.
 *
 * - 5 second idle timeout: Clean up workers quickly when not in use to
 *   preserve browser resources (memory, CPU).
 */
export const CACHE_CONFIG = {
  /** Cache time-to-live in milliseconds (10 minutes) */
  TTL_MS: 10 * 60 * 1000,

  /** Maximum number of cache entries to retain */
  MAX_SIZE: 50,

  /** Worker idle timeout before cleanup (5 seconds) */
  IDLE_TIMEOUT_MS: 5000,

  /** Whether to invalidate cache when configuration changes */
  INVALIDATE_ON_CONFIG_CHANGE: true,
} as const;

// =============================================================================
// ALERT SYSTEM LIMITS
// =============================================================================

/**
 * Alert system capacity and retention limits.
 *
 * Design rationale:
 * - 500 max alerts: UI performance limit. Beyond this, virtualized scrolling
 *   becomes expensive. Also prevents storage quota issues.
 *
 * - 100 history entries: Sufficient for trend detection algorithms while
 *   keeping memory usage reasonable.
 *
 * - 200 stored alerts: Persisted to localStorage for cross-session continuity.
 *   Larger than display limit to handle filtering.
 *
 * - 90 day cleanup: Aligns with LONG_TERM_DAYS analysis window. Older alerts
 *   are unlikely to be relevant.
 */
export const ALERT_LIMITS = {
  /** Maximum number of alerts to display in UI (performance constraint) */
  MAX_DISPLAY: 500,

  /** Maximum alerts to persist in localStorage */
  MAX_STORED: 200,

  /** Number of historical entries to retain for pattern detection */
  HISTORY_LIMIT: 100,

  /** Days to retain resolved/dismissed alerts before cleanup */
  CLEANUP_DAYS: 90,

  /** Maximum sources to include per alert (prevents clutter) */
  MAX_SOURCES_PER_ALERT: 3,

  /** Minimum confidence threshold for displaying alerts */
  MIN_CONFIDENCE: 0.1,
} as const;

/**
 * Alert deduplication and throttling configuration.
 *
 * Prevents alert fatigue by limiting how often similar alerts are shown.
 */
export const ALERT_TIMING = {
  /** Deduplication window: ignore duplicate alerts within 1 hour */
  DEDUPE_WINDOW_MS: 60 * 60 * 1000,

  /** Maximum throttle delay: wait at most 6 hours before retrying */
  MAX_THROTTLE_DELAY_MS: 6 * 60 * 60 * 1000,

  /** Throttle backoff base: delay = base^attempts (exponential backoff) */
  THROTTLE_BACKOFF_BASE: 2,

  /** Default snooze duration (24 hours) */
  DEFAULT_SNOOZE_HOURS: 24,

  /** "Don't show again" duration (7 days) */
  DONT_SHOW_AGAIN_DAYS: 7,
} as const;

/**
 * Alert detection engine configuration.
 *
 * Controls time series processing for alert detection algorithms.
 */
export const ALERT_DETECTION = {
  /** Maximum time series length to process (prevents memory issues) */
  SERIES_LIMIT: 90,

  /** CUSUM algorithm: k-factor for detecting shifts */
  CUSUM_K_FACTOR: 0.5,

  /** CUSUM algorithm: decision interval threshold */
  CUSUM_DECISION_INTERVAL: 5,

  /** Conservative preset: slightly higher k-factor for fewer alerts */
  CUSUM_K_FACTOR_CONSERVATIVE: 0.55,

  /** Conservative preset: higher decision interval */
  CUSUM_DECISION_INTERVAL_CONSERVATIVE: 5.5,
} as const;

// =============================================================================
// CHART & VISUALIZATION SETTINGS
// =============================================================================

/**
 * Chart configuration for consistent visualization across the application.
 *
 * These settings control axis ranges, line widths, smoothing windows, etc.
 * Centralized to ensure visual consistency.
 */
export const CHART_CONFIG = {
  /** Moving average window size (7 days = 1 week) */
  MOVING_AVERAGE_WINDOW: 7,

  /** Y-axis maximum for emotion intensity charts (1-10 scale) */
  Y_AXIS_MAX: 10,

  /** Y-axis interval for grid lines */
  Y_AXIS_INTERVAL: 2,

  /** Data zoom minimum span (show at least 1 week) */
  DATA_ZOOM_MIN_SPAN: 7,

  /** Line widths for different chart elements */
  LINE_WIDTHS: {
    /** Average line (prominent) */
    AVERAGE: 3,

    /** Moving average line */
    MOVING_AVERAGE: 2,

    /** Positive emotion line */
    POSITIVE: 2,

    /** Negative emotion line */
    NEGATIVE: 2,

    /** Sensory input line */
    SENSORY: 2,
  },
} as const;

// =============================================================================
// INSIGHTS & DISPLAY LIMITS
// =============================================================================

/**
 * Limits for insights, patterns, and predictions shown in UI.
 *
 * Prevents information overload by showing only the most relevant insights.
 * "Top N" approach ensures users see the highest-priority items first.
 */
export const INSIGHTS_LIMITS = {
  /** Maximum number of patterns to show in dashboard */
  MAX_PATTERNS: 2,

  /** Maximum number of correlations to display */
  MAX_CORRELATIONS: 2,

  /** Maximum number of predictions to show */
  MAX_PREDICTIONS: 2,
} as const;

// =============================================================================
// FEATURE ENGINEERING CONSTANTS
// =============================================================================

/**
 * Feature engineering and normalization parameters.
 *
 * Used in ML preprocessing for anomaly detection and prediction models.
 */
export const FEATURE_ENGINEERING = {
  /** Minimum variance threshold for normalization (prevents division by zero) */
  MIN_VARIANCE: 1e-9,

  /** Whether to clamp normalized values to [0, 1] range */
  CLAMP_TO_UNIT: true,
} as const;

/**
 * Huber regression parameters for robust trend fitting.
 *
 * Huber loss is less sensitive to outliers than least squares.
 * Used for trend detection in noisy behavioral data.
 *
 * @see {@link https://en.wikipedia.org/wiki/Huber_loss}
 */
export const HUBER_REGRESSION = {
  /** Delta parameter: threshold between L2 and L1 loss (standard: 1.345) */
  DELTA: 1.345,

  /** Maximum iterations for convergence */
  MAX_ITERATIONS: 50,

  /** Convergence tolerance */
  TOLERANCE: 1e-6,
} as const;

// =============================================================================
// BACKGROUND PRECOMPUTATION SETTINGS
// =============================================================================

/**
 * Precomputation configuration for background analytics processing.
 *
 * Uses requestIdleCallback to compute analytics during browser idle time,
 * improving perceived performance when users navigate the app.
 */
export const PRECOMPUTATION_CONFIG = {
  /** Maximum queue size for pending precomputation tasks */
  MAX_QUEUE_SIZE: 50,

  /** Number of tasks to process in each batch */
  BATCH_SIZE: 5,

  /** Idle callback timeout in milliseconds */
  IDLE_TIMEOUT_MS: 5000,

  /** Maximum number of concurrent precomputation tasks */
  MAX_CONCURRENT_TASKS: 1,

  /** Delay between task dispatches (stagger to avoid spikes) */
  TASK_STAGGER_DELAY_MS: 100,

  /** Maximum time per idle processing slice (16ms = 1 frame @ 60fps) */
  MAX_PRECOMPUTE_TIME_MS: 16,

  /** Common timeframes to precompute (7, 14, 30 days) */
  COMMON_TIMEFRAMES: [7, 14, 30],
} as const;

// =============================================================================
// WEIGHT CONFIGURATIONS
// =============================================================================

/**
 * Weights for confidence score calculation.
 *
 * Confidence score = (emotion_weight × emotion_score) +
 *                    (sensory_weight × sensory_score) +
 *                    (tracking_weight × tracking_score) +
 *                    recency_boost
 */
export const CONFIDENCE_WEIGHTS = {
  /** Weight for emotion data quality */
  EMOTION: 0.3,

  /** Weight for sensory data quality */
  SENSORY: 0.3,

  /** Weight for tracking data quality */
  TRACKING: 0.4,

  /** Recency boost for recent data */
  RECENCY_BOOST: 0.1,
} as const;

/**
 * Weights for analytics health score calculation.
 *
 * Health score measures the overall quality and completeness of analytics.
 * Equal weights (20% each) ensure balanced assessment.
 */
export const HEALTH_SCORE_WEIGHTS = {
  /** Weight for pattern detection quality */
  PATTERNS: 20,

  /** Weight for correlation analysis quality */
  CORRELATIONS: 20,

  /** Weight for prediction quality */
  PREDICTIONS: 20,

  /** Weight for anomaly detection quality */
  ANOMALIES: 20,

  /** Weight for minimum data sufficiency */
  MINIMUM_DATA: 20,
} as const;

/**
 * Weights for alert source ranking.
 *
 * Determines which detection sources are most important when an alert
 * is triggered by multiple detectors.
 */
export const SOURCE_RANKING_WEIGHTS = {
  /** Weight for impact/severity of the source */
  IMPACT: 0.5,

  /** Weight for confidence of the detection */
  CONFIDENCE: 0.3,

  /** Weight for recency of the detection */
  RECENCY: 0.2,
} as const;

// =============================================================================
// ALERT SENSITIVITY MULTIPLIERS
// =============================================================================

/**
 * Sensitivity multipliers for different alert sensitivity levels.
 *
 * Applied to detection thresholds to make alerts more or less sensitive:
 * - Low sensitivity: multiply by 0.8 (requires stronger evidence)
 * - Medium sensitivity: multiply by 1.0 (default)
 * - High sensitivity: multiply by 1.2 (triggers more easily)
 */
export const SENSITIVITY_MULTIPLIERS = {
  LOW: {
    EMOTION_INTENSITY: 0.8,
    FREQUENCY: 0.8,
    ANOMALY: 0.8,
  },
  MEDIUM: {
    EMOTION_INTENSITY: 1.0,
    FREQUENCY: 1.0,
    ANOMALY: 1.0,
  },
  HIGH: {
    EMOTION_INTENSITY: 1.2,
    FREQUENCY: 1.2,
    ANOMALY: 1.2,
  },
} as const;

// =============================================================================
// STRESS ASSESSMENT CONFIGURATION
// =============================================================================

/**
 * Configuration for stress and risk assessment.
 *
 * Identifies stress-related emotions and sets thresholds for risk levels.
 */
export const STRESS_ASSESSMENT = {
  /** Emotions classified as stress indicators */
  STRESS_EMOTIONS: ['anxious', 'frustrated', 'overwhelmed', 'angry'] as const,

  /** Intensity threshold for stress classification (4 on 1-10 scale) */
  INTENSITY_THRESHOLD: 4,
} as const;

// =============================================================================
// TAXONOMY & CLASSIFICATION
// =============================================================================

/**
 * Emotion taxonomy for classification and analysis.
 *
 * Used to categorize emotions as positive/negative for trend analysis.
 */
export const EMOTION_TAXONOMY = {
  /** Emotions classified as positive */
  POSITIVE_EMOTIONS: [
    'happy',
    'calm',
    'excited',
    'content',
    'peaceful',
    'cheerful',
    'relaxed',
    'optimistic',
  ] as const,
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/** Type-safe access to correlation threshold values */
export type CorrelationThreshold =
  (typeof CORRELATION_THRESHOLDS)[keyof typeof CORRELATION_THRESHOLDS];

/** Type-safe access to time window values */
export type TimeWindow = (typeof TIME_WINDOWS)[keyof typeof TIME_WINDOWS];

/** Type-safe access to alert limit values */
export type AlertLimit = (typeof ALERT_LIMITS)[keyof typeof ALERT_LIMITS];
