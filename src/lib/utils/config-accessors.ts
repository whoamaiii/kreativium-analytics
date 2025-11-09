/**
 * Type-safe config accessors and converters
 *
 * This module provides utilities to safely access and convert between
 * different configuration type structures, replacing unsafe 'any' casts
 * throughout the codebase.
 */

import type { AnalyticsConfiguration } from '@/types/analytics';
import type { ComputeInsightsInputs } from '@/lib/insights/unified';
import type { InsightsConfigSubset } from '@/lib/insights/task';
import type { Goal } from '@/types/student';

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a value is a valid AnalyticsConfiguration
 */
export function isAnalyticsConfiguration(value: unknown): value is AnalyticsConfiguration {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;

  // Check for key required properties
  return (
    'analytics' in obj &&
    'insights' in obj &&
    'confidence' in obj &&
    typeof obj.analytics === 'object' &&
    typeof obj.insights === 'object' &&
    typeof obj.confidence === 'object'
  );
}

/**
 * Type guard to check if inputs has the goals property
 */
export function hasGoals(inputs: unknown): inputs is ComputeInsightsInputs & { goals: Goal[] } {
  if (!inputs || typeof inputs !== 'object') return false;
  const obj = inputs as Record<string, unknown>;
  return 'goals' in obj && Array.isArray(obj.goals);
}

// ============================================================================
// Safe Config Accessors
// ============================================================================

/**
 * Safely extract goals from ComputeInsightsInputs
 *
 * @param inputs - ComputeInsightsInputs object
 * @returns Array of goals (empty array if not present)
 *
 * @example
 * ```typescript
 * const goals = safeGetGoals(inputs);
 * // Always returns Goal[], never undefined
 * ```
 */
export function safeGetGoals(inputs: ComputeInsightsInputs): Goal[] {
  return inputs.goals ?? [];
}

/**
 * Safely convert InsightsConfigSubset to AnalyticsConfiguration
 *
 * Takes a minimal config subset and returns it typed as AnalyticsConfiguration.
 * This is safe because InsightsConfigSubset is a subset of AnalyticsConfiguration,
 * and the missing properties will be filled in by the analytics engine defaults.
 *
 * @param configSubset - Minimal config subset (or null/undefined)
 * @returns AnalyticsConfiguration or null
 *
 * @example
 * ```typescript
 * const fullConfig = safeConvertConfig(msg.payload.config);
 * // fullConfig is typed as AnalyticsConfiguration | null
 * ```
 */
export function safeConvertConfig(
  configSubset: InsightsConfigSubset | undefined | null
): AnalyticsConfiguration | null {
  if (!configSubset) return null;

  // InsightsConfigSubset is a strict subset of AnalyticsConfiguration
  // The analytics engine will fill in missing properties with defaults
  return configSubset as unknown as AnalyticsConfiguration;
}

/**
 * Safely access config with fallback
 *
 * @param config - Config value that might be undefined/null
 * @param fallback - Fallback config to use
 * @returns Non-null config
 */
export function safeGetConfig(
  config: AnalyticsConfiguration | InsightsConfigSubset | undefined | null,
  fallback: AnalyticsConfiguration
): AnalyticsConfiguration {
  if (!config) return fallback;
  return config as AnalyticsConfiguration;
}

// ============================================================================
// Specific Property Accessors
// ============================================================================

/**
 * Type-safe accessor for insights config section
 */
export function getInsightsConfig(config: AnalyticsConfiguration | null | undefined) {
  return config?.insights;
}

/**
 * Type-safe accessor for analytics config section
 */
export function getAnalyticsConfig(config: AnalyticsConfiguration | null | undefined) {
  return config?.analytics;
}

/**
 * Type-safe accessor for timeWindows config section
 */
export function getTimeWindowsConfig(config: AnalyticsConfiguration | null | undefined) {
  return config?.timeWindows;
}

/**
 * Type-safe accessor for confidence config section
 */
export function getConfidenceConfig(config: AnalyticsConfiguration | null | undefined) {
  return config?.confidence;
}

/**
 * Type-safe accessor for cache config section
 */
export function getCacheConfig(config: AnalyticsConfiguration | null | undefined) {
  return config?.cache;
}

/**
 * Type-safe accessor for pattern analysis config section
 */
export function getPatternAnalysisConfig(config: AnalyticsConfiguration | null | undefined) {
  return config?.patternAnalysis;
}

/**
 * Type-safe accessor for enhanced analysis config section
 */
export function getEnhancedAnalysisConfig(config: AnalyticsConfiguration | null | undefined) {
  return config?.enhancedAnalysis;
}

// ============================================================================
// Metadata Accessors (for alert metadata, etc.)
// ============================================================================

/**
 * Safely access string property from unknown metadata
 */
export function safeGetStringMetadata(
  metadata: unknown,
  key: string
): string | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const obj = metadata as Record<string, unknown>;
  const value = obj[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Safely access array property from unknown metadata
 */
export function safeGetArrayMetadata<T = unknown>(
  metadata: unknown,
  key: string
): T[] | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const obj = metadata as Record<string, unknown>;
  const value = obj[key];
  return Array.isArray(value) ? (value as T[]) : undefined;
}

/**
 * Safely access object property from unknown metadata
 */
export function safeGetObjectMetadata<T = Record<string, unknown>>(
  metadata: unknown,
  key: string
): T | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const obj = metadata as Record<string, unknown>;
  const value = obj[key];
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as T) : undefined;
}
