/**
 * Types for analytics insights.
 *
 * Insight is intentionally string-based for now to preserve current behavior.
 * In a future iteration, this will migrate to StructuredInsight with i18n key mapping
 * and interpolation via `params`.
 *
 * Note:
 * - Named exports only; no default export.
 * - Keep explicit types to satisfy strict tsconfig settings.
 */

export type Insight = string;

export interface StructuredInsight {
  /** i18n key for the insight message (e.g., 'analytics:insight.lowAttendance') */
  key: string;
  /** optional parameters for message interpolation */
  params?: Record<string, unknown>;
  /** visual severity level for the insight */
  severity?: 'info' | 'success' | 'warning' | 'danger';
}

// Preserve current output shape; later this can evolve to StructuredInsight[]
export type InsightOutput = Insight[];

export type InsightConfig = import('@/lib/analyticsConfig').AnalyticsConfiguration['insights'];
export type ConfidenceConfig = import('@/lib/analyticsConfig').AnalyticsConfiguration['confidence'];

/**
 * Unified insights/analytics runtime configuration.
 * Read defaults via analyticsConfig; do not hardcode.
 */
export interface AnalyticsRuntimeConfig {
  /** Optional upper bound for items processed per batch to avoid blocking UI. */
  maxItemsPerBatch?: number;
  /** Threshold map for various insight rules. Keys are rule identifiers. */
  thresholds?: Record<string, number>;
  /** Active locale affecting formatting/segmentation where applicable. */
  locale?: string;
  /** Whether to enable experimental insight rules. Defaults to false. */
  enableExperimental?: boolean;
}

/**
 * Typed input envelope for analytics/insights computations.
 * Use narrow, concrete domain types in feature modules; this is a generic base.
 */
export interface AnalyticsInputs {
  /** Unique identifier of the subject the analytics runs for (e.g., studentId, sessionId). */
  subjectId: string;
  /** ISO timestamps delimiting window of data considered. */
  from?: string;
  to?: string;
  /** Arbitrary structured inputs consumed by specific analytics rules. */
  data: Record<string, unknown>;
}

/**
 * Result shape returned from analytics/insights computations.
 * Keep payloads small; large artifacts should be referenced via ids/keys.
 */
export interface AnalyticsResult {
  /** Cache key of the computation to support reuse. */
  cacheKey: string;
  /** ISO timestamp when the computation was performed. */
  computedAt: string;
  /** Optional TTL seconds communicated to caches. */
  ttlSeconds?: number;
  /** Tags that help with cache invalidation and grouping. */
  tags?: string[];
  /** Minimal, safe summary suitable for UI consumption. */
  summary: Record<string, unknown>;
  /** Optional diagnostics intended for logs/telemetry, not directly user-facing. */
  diagnostics?: Record<string, unknown>;
}

/** Options influencing insights behavior. */
export interface InsightsOptions {
  /** If true, prefer cached results when available. */
  preferCache?: boolean;
  /** Override default TTL in seconds for this computation. */
  ttlSeconds?: number;
  /** Cache tags to associate with the produced result for invalidation. */
  tags?: string[];
  /** Runtime config overrides. */
  config?: AnalyticsRuntimeConfig;
  /** Marks the task as a background prewarm/precompute; UIs should not update on completion. */
  prewarm?: boolean;
}
