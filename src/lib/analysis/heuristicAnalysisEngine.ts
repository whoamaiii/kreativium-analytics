import {
  analyticsConfig,
  PRESET_CONFIGS,
  ANALYTICS_CONFIG,
  type AnalyticsConfiguration,
} from '@/lib/analyticsConfig';
import {
  computeInsights,
  type ComputeInsightsInputs,
  type ComputeInsightsOptions,
} from '@/lib/insights/unified';
import { logger } from '@/lib/logger';

import type { EmotionEntry, SensoryEntry, TrackingEntry, Goal } from '@/types/student';
import type { AnalyticsResults } from '@/types/analytics';
import type {
  AnalysisEngine,
  TimeRange,
  AnalysisOptions,
  AnalyticsResultsAI,
} from './analysisEngine';
import { legacyAnalyticsAdapter } from '@/lib/adapters/legacyAnalyticsAdapter';

/**
 * Safely converts a Date, string, or undefined input to a Date object.
 * Returns undefined for invalid dates to prevent filtering errors.
 * @param input - The input to convert (Date, string, or undefined)
 * @returns A valid Date object or undefined for invalid/missing input
 */
function toDate(input: Date | string | undefined): Date | undefined {
  if (!input) return undefined;
  const d = input instanceof Date ? input : new Date(input);
  return isNaN(d.getTime()) ? undefined : d;
}

/**
 * Checks if a timestamp falls within the specified date range.
 * @param ts - The timestamp to check
 * @param start - Optional start date (inclusive). If undefined, no lower bound is applied
 * @param end - Optional end date (inclusive). If undefined, no upper bound is applied
 * @returns True if the timestamp is within the range, false otherwise
 */
function withinRange(ts: Date, start?: Date, end?: Date): boolean {
  const t = ts.getTime();
  const s = start ? start.getTime() : -Infinity;
  const e = end ? end.getTime() : Infinity;
  return t >= s && t <= e;
}

/**
 * Builds a safe default AnalyticsResults object with empty arrays for all required fields.
 * Used as a fallback when analysis fails or for error states.
 * @param partial - Optional partial results to merge with the defaults
 * @returns A complete AnalyticsResultsAI object with all required fields initialized
 */
function buildSafeResults(partial?: Partial<AnalyticsResults>): AnalyticsResultsAI {
  const base: AnalyticsResults = {
    patterns: [],
    correlations: [],
    environmentalCorrelations: [],
    predictiveInsights: [],
    anomalies: [],
    insights: [],
    suggestedInterventions: [],
    ...partial,
  } as AnalyticsResults;
  return base as AnalyticsResultsAI;
}

/**
 * Recursively merges source object into target object, creating a deep merge.
 * Arrays are replaced entirely rather than merged element-wise.
 * @param target - The target object to merge into
 * @param source - The source object to merge from
 * @returns A new object with the merged properties
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Record<string, any>): T {
  const result: Record<string, any> = Array.isArray(target) ? [...target] : { ...target };
  for (const [key, value] of Object.entries(source || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const current = result[key];
      result[key] = deepMerge(current && typeof current === 'object' ? current : {}, value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Applies analysis options to a base analytics configuration, preserving the base config
 * while merging in preset configurations and overrides.
 * @param base - The base analytics configuration to start with
 * @param options - Optional analysis options containing profile, features, and overrides
 * @returns The merged configuration with all options applied
 */
function applyOptionsToConfig(
  base: AnalyticsConfiguration,
  options?: AnalysisOptions,
): AnalyticsConfiguration {
  if (!options) return base;

  let cfg = { ...base } as AnalyticsConfiguration;

  // Profile preset (if matches known presets) - now preserves base config via deepMerge
  if (options.profile && options.profile in PRESET_CONFIGS) {
    const preset = PRESET_CONFIGS[options.profile as keyof typeof PRESET_CONFIGS];
    if (preset?.config) {
      cfg = deepMerge(cfg, preset.config);
    }
  }

  // Feature flag overrides
  if (options.features && Object.keys(options.features).length) {
    cfg = deepMerge(cfg, { features: options.features });
  }

  // Arbitrary overrides
  if (options.overrides && Object.keys(options.overrides).length) {
    cfg = deepMerge(cfg, options.overrides as Record<string, any>);
  }

  return cfg;
}

/**
 * Heuristic-based analytics engine that provides student behavior analysis
 * using rule-based algorithms and statistical methods.
 */
export class HeuristicAnalysisEngine implements AnalysisEngine {
  /**
   * Analyzes a student's tracking data to generate insights, patterns, and predictions.
   * Uses consistent date parsing via getEntriesForStudent and optimized timeframe filtering.
   * @param studentId - The unique identifier of the student to analyze
   * @param timeframe - Optional date range to limit the analysis to specific time period
   * @param options - Optional analysis configuration including presets and feature overrides
   * @returns Promise resolving to comprehensive analytics results with AI metadata
   */
  async analyzeStudent(
    studentId: string,
    timeframe?: TimeRange,
    options?: AnalysisOptions,
  ): Promise<AnalyticsResultsAI> {
    // Validate input early
    if (!studentId || typeof studentId !== 'string') {
      logger.error('[HeuristicAnalysisEngine] analyzeStudent: invalid studentId', { studentId });
      return buildSafeResults({ error: 'INVALID_STUDENT_ID' });
    }

    try {
      // Fetch data using getEntriesForStudent for consistent date parsing and ordering
      const trackingEntriesAll: TrackingEntry[] =
        legacyAnalyticsAdapter.listTrackingEntriesForStudent(studentId) || [];
      const goals: Goal[] = legacyAnalyticsAdapter.listGoalsForStudent(studentId) || [];

      // Safe timeframe handling with NaN protection
      const start = toDate(timeframe?.start);
      const end = toDate(timeframe?.end);

      // Filter tracking entries by timeframe (dates already parsed by getEntriesForStudent)
      const trackingEntries: TrackingEntry[] =
        start || end
          ? trackingEntriesAll.filter((e) => withinRange(e.timestamp, start, end))
          : trackingEntriesAll;

      // Extract emotions/sensory without redundant timeframe filtering
      const emotions: EmotionEntry[] =
        start || end
          ? trackingEntries.flatMap((entry) => entry.emotions || [])
          : trackingEntriesAll.flatMap((entry) => entry.emotions || []);

      const sensoryInputs: SensoryEntry[] =
        start || end
          ? trackingEntries.flatMap((entry) => entry.sensoryInputs || [])
          : trackingEntriesAll.flatMap((entry) => entry.sensoryInputs || []);

      // Resolve configuration with overrides
      const liveConfig = (() => {
        try {
          return analyticsConfig.getConfig();
        } catch {
          return ANALYTICS_CONFIG as unknown as AnalyticsConfiguration;
        }
      })();
      const mergedConfig = applyOptionsToConfig(liveConfig as AnalyticsConfiguration, options);

      // Prepare inputs for unified insights
      const inputs: ComputeInsightsInputs = {
        entries: trackingEntries,
        emotions,
        sensoryInputs,
        goals,
      };
      const computeOptions: ComputeInsightsOptions = { config: mergedConfig };

      // Delegate to unified insights computation
      const results = await computeInsights(inputs, computeOptions);

      // Optionally attach lightweight AI metadata for lineage/traceability
      const aiMeta =
        options?.includeAiMetadata === true
          ? {
              provider: 'heuristic',
              model: 'unified-insights-v1',
              createdAt: new Date().toISOString(),
              dataLineage: [
                {
                  source: 'local-storage',
                  type: 'tracking',
                  timeRange:
                    start && end
                      ? { start: start.toISOString(), end: end.toISOString() }
                      : undefined,
                  fields: ['entries', 'emotions', 'sensoryInputs', 'goals'],
                  notes: 'Computed via heuristic engine using unified insights',
                },
              ],
              caveats: [],
              confidence: { overall: (results as any).confidence ?? 1 },
            }
          : undefined;

      return { ...(results as AnalyticsResults), ai: aiMeta } as AnalyticsResultsAI;
    } catch (error) {
      logger.error('[HeuristicAnalysisEngine] analyzeStudent failed', {
        error:
          error instanceof Error
            ? { message: error.message, stack: error.stack, name: error.name }
            : error,
        studentId,
      });
      return buildSafeResults({ error: 'HEURISTIC_ENGINE_ERROR' });
    }
  }
}

export default HeuristicAnalysisEngine;
