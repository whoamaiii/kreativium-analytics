/**
 * @file Default values for filter and analytics operations.
 *
 * Extracted from scattered magic numbers throughout the codebase.
 * See CODE_QUALITY_AUDIT.md Section 5 for rationale.
 */

/**
 * Default intensity scale maximum value.
 * Used for emotion and sensory intensity ratings.
 */
export const INTENSITY_SCALE_MAX = 5;

/**
 * Default noise level scale maximum value.
 * Used for environmental noise ratings.
 */
export const NOISE_LEVEL_MAX = 10;

/**
 * Default temperature range bounds (Celsius).
 */
export const TEMPERATURE_RANGE = {
  MIN: -10,
  MAX: 40,
  DEFAULT_MIN: 15,
  DEFAULT_MAX: 30,
} as const;

/**
 * Default date range options (in days).
 */
export const DATE_RANGE_DAYS = {
  WEEK: 7,
  TWO_WEEKS: 14,
  MONTH: 30,
  QUARTER: 90,
} as const;

/**
 * Default filter ranges.
 */
export const FILTER_DEFAULTS = {
  /** Default intensity range for emotions [min, max] */
  EMOTION_INTENSITY_RANGE: [0, 5] as [number, number],
  /** Default intensity range for sensory inputs [min, max] */
  SENSORY_INTENSITY_RANGE: [0, 5] as [number, number],
  /** Default noise level range [min, max] */
  NOISE_LEVEL_RANGE: [0, 10] as [number, number],
  /** Default temperature range [min, max] */
  TEMPERATURE_RANGE: [15, 30] as [number, number],
  /** Default pattern confidence minimum (0-100) */
  PATTERN_CONFIDENCE_MIN: 0,
  /** Maximum pattern confidence (percentage) */
  PATTERN_CONFIDENCE_MAX: 100,
} as const;

/**
 * Session and tracking limits.
 */
export const SESSION_LIMITS = {
  /** Maximum number of recent sessions to display */
  MAX_RECENT_SESSIONS: 4,
  /** Maximum number of patterns to show in comparison */
  MAX_COMPARISON_PATTERNS: 6,
  /** Maximum number of interventions to add */
  MAX_ADDED_INTERVENTIONS: 8,
} as const;

/**
 * Alert series configuration.
 */
export const ALERT_CONFIG = {
  /** Maximum length of alert series for analysis */
  MAX_SERIES_LENGTH: 90,
  /** Default alert snooze duration in minutes */
  DEFAULT_SNOOZE_MINUTES: 30,
} as const;
