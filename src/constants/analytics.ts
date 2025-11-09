/**
 * Analytics-related constants and thresholds
 *
 * This file centralizes all magic numbers used in the analytics system
 * to improve maintainability and make configuration values discoverable.
 */

// ============================================================================
// Data Processing
// ============================================================================

/**
 * Maximum number of recent data series points to analyze for alert detection.
 * Represents approximately 3 months of daily data points.
 *
 * Used in: src/lib/alerts/engine.ts
 */
export const MAX_ALERT_SERIES_LENGTH = 90;

/**
 * Maximum number of real-time data points to keep in memory.
 * Prevents unbounded memory growth while maintaining sufficient context for analysis.
 *
 * Used in: src/hooks/useRealtimeData.ts
 */
export const MAX_REALTIME_DATA_POINTS = 1000;

// ============================================================================
// Caching
// ============================================================================

/**
 * Cache time-to-live for analytics results (5 minutes).
 * Balances fresh data availability with reduced computation overhead.
 *
 * Used in: src/hooks/useAnalyticsWorker.ts
 */
export const ANALYTICS_CACHE_TTL_MS = 300_000;

/**
 * Default cache expiry check interval (30 seconds)
 */
export const CACHE_CHECK_INTERVAL_MS = 30_000;

// ============================================================================
// Alert System
// ============================================================================

/**
 * Alert tier calculation thresholds.
 * Determines alert severity based on detection confidence scores.
 *
 * Used in: src/lib/alerts/engine.ts
 */
export const ALERT_TIER_THRESHOLDS = {
  /** Critical alerts require immediate attention (100% confidence) */
  CRITICAL: 1.0,
  /** High priority alerts (80%+ confidence) */
  HIGH: 0.8,
  /** Medium priority alerts (60%+ confidence) */
  MEDIUM: 0.6,
  /** Low priority alerts (40%+ confidence) */
  LOW: 0.4,
} as const;

/**
 * Alert polling interval (10 seconds)
 * How often to check for new alerts
 */
export const ALERT_POLL_INTERVAL_MS = 10_000;

// ============================================================================
// Performance Monitoring
// ============================================================================

/**
 * Performance monitoring thresholds for memory and update frequency
 */
export const PERFORMANCE_THRESHOLDS = {
  /** Memory usage limit in megabytes before warning */
  MEMORY_LIMIT_MB: 100,
  /** Minimum milliseconds between UI updates to prevent thrashing */
  UPDATE_THROTTLE_MS: 5,
} as const;

// ============================================================================
// Mock Data Generation
// ============================================================================

/**
 * Mock data generation ranges for testing and development
 */
export const MOCK_DATA_RANGES = {
  /** Indoor temperature range (Celsius) */
  TEMPERATURE: { MIN: 18, MAX: 28 },
  /** Humidity percentage range */
  HUMIDITY: { MIN: 40, MAX: 60 },
  /** Data generation duration (days) */
  DAYS: { MIN: 60, MAX: 90 },
} as const;

// ============================================================================
// Data Limits
// ============================================================================

/**
 * Maximum items to display in various UI components
 */
export const DATA_DISPLAY_LIMITS = {
  /** Maximum recent sessions to show */
  RECENT_SESSIONS: 10,
  /** Maximum items in dropdown lists */
  DROPDOWN_ITEMS: 50,
  /** Maximum search results to display */
  SEARCH_RESULTS: 100,
} as const;
