/**
 * @file useCacheTags.ts
 *
 * Hook for managing analytics cache key generation and tag building.
 * Provides utilities for creating cache keys and extracting tags from analytics data.
 */

import { useCallback } from 'react';
import { buildInsightsCacheKey } from '@/lib/analyticsManager';
import { getValidatedConfig } from '@/lib/analyticsConfigValidation';
import type { AnalyticsData, AnalyticsResults } from '@/types/analytics';
import type { Goal } from '@/types/student';
import type { ComputeInsightsInputs } from '@/lib/insights/unified';

export interface UseCacheTagsOptions {
  /**
   * Custom function to extract tags from analytics data.
   * If not provided, uses default implementation.
   */
  extractTagsFromData?: (data: AnalyticsData | AnalyticsResults) => string[];
}

export interface UseCacheTagsReturn {
  /**
   * Creates a cache key for analytics data
   */
  createCacheKey: (data: AnalyticsData, goals?: Goal[]) => string;

  /**
   * Builds cache tags from analytics data and metadata
   */
  buildCacheTags: (params: {
    data: AnalyticsData | AnalyticsResults;
    goals?: Goal[];
    studentId?: string | number;
    includeAiTag?: boolean;
  }) => string[];

  /**
   * Default tag extraction function
   */
  extractTagsFromData: (data: AnalyticsData | AnalyticsResults) => string[];
}

const hasAnalyticsEntries = (
  payload: AnalyticsData | AnalyticsResults,
): payload is AnalyticsData => {
  return typeof payload === 'object' && payload !== null && 'entries' in payload;
};

/**
 * Hook for managing cache key generation and tag building.
 *
 * Provides utilities for:
 * - Creating deterministic cache keys from analytics data
 * - Extracting tags for cache invalidation
 * - Building tag sets including student, goal, and date tags
 */
export function useCacheTags(options: UseCacheTagsOptions = {}): UseCacheTagsReturn {
  /**
   * Default tag extraction from analytics data
   */
  const defaultExtractTagsFromData = useCallback(
    (data: AnalyticsData | AnalyticsResults): string[] => {
      const tags: string[] = ['analytics'];

      // Add student-specific tags if available
      if (hasAnalyticsEntries(data) && data.entries.length > 0) {
        const studentIds = Array.from(new Set(data.entries.map((entry) => entry.studentId)));
        tags.push(...studentIds.map((id) => `student-${id}`));
      }

      // Add date-based tags for time-sensitive invalidation
      const now = new Date();
      tags.push(`analytics-${now.getFullYear()}-${now.getMonth() + 1}`);

      return tags;
    },
    [],
  );

  const extractTagsFn = options.extractTagsFromData ?? defaultExtractTagsFromData;

  /**
   * Builds cache tags combining data-extracted tags with metadata tags
   */
  const buildCacheTags = useCallback(
    ({
      data,
      goals,
      studentId,
      includeAiTag,
    }: {
      data: AnalyticsData | AnalyticsResults;
      goals?: Goal[];
      studentId?: string | number;
      includeAiTag?: boolean;
    }): string[] => {
      const tagsFromData = extractTagsFn({ ...data, ...(goals ? { goals } : {}) }) ?? [];
      const tagSet = new Set<string>(tagsFromData);

      (goals ?? []).forEach((goal) => {
        const goalId = goal.id;
        if (goalId) tagSet.add(`goal-${goalId}`);
        const goalStudentId = goal.studentId;
        if (goalStudentId) tagSet.add(`student-${goalStudentId}`);
      });

      if (studentId !== undefined && studentId !== null) {
        tagSet.add(`student-${studentId}`);
      }

      if (includeAiTag) {
        tagSet.add('ai');
      }

      return Array.from(tagSet);
    },
    [extractTagsFn],
  );

  /**
   * Creates a cache key based on analytics data using centralized helper
   */
  const createCacheKey = useCallback((data: AnalyticsData, goals?: Goal[]): string => {
    // Map AnalyticsData to ComputeInsightsInputs structure expected by cache key builder
    const inputs: ComputeInsightsInputs = {
      entries: data.entries,
      emotions: data.emotions,
      sensoryInputs: data.sensoryInputs,
      ...(goals && goals.length ? { goals } : {}),
    };

    // Use live runtime config to ensure keys align across app and worker
    const cfg = getValidatedConfig();

    return buildInsightsCacheKey(inputs, { config: cfg });
  }, []);

  return {
    createCacheKey,
    buildCacheTags,
    extractTagsFromData: extractTagsFn,
  };
}
