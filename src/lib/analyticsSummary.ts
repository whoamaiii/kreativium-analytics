import { analyticsConfig } from '@/lib/analyticsConfig';
import { calculateConfidence, generateInsights } from '@/lib/insights';
import type { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import type { InsightOutput } from '@/types/insights';

export interface AnalyticsSummary {
  insights: InsightOutput; // string[] for now (non-breaking)
  confidence: number;
  hasMinimumData: boolean;
  computedAt: string; // ISO timestamp
  tags?: string[];
}

export async function generateAnalyticsSummary(inputs: {
  entries: readonly TrackingEntry[];
  emotions: readonly EmotionEntry[];
  sensoryInputs?: readonly SensoryEntry[];
  results?: {
    patterns: any[]; // Keeping loose here to avoid importing heavy types in facade
    correlations: any[];
    predictiveInsights?: Array<{ description: string; confidence: number }>;
  };
  tags?: string[];
}): Promise<AnalyticsSummary> {
  const cfg = analyticsConfig.getConfig();
  const { entries, emotions } = inputs;
  const patterns = inputs.results?.patterns ?? [];
  const correlations = inputs.results?.correlations ?? [];
  const predictiveInsights = inputs.results?.predictiveInsights ?? [];

  // Confidence uses confidence slice; insights use insights slice
  const confidence = calculateConfidence(
    emotions,
    inputs.sensoryInputs ?? [],
    entries,
    cfg.confidence,
  );

  // Prefer canonical insights signature when we have results
  const insights = generateInsights(
    { patterns, correlations, predictiveInsights },
    emotions,
    entries,
    cfg.insights,
  );

  const hasMinimumData = entries.length >= cfg.insights.MIN_SESSIONS_FOR_FULL_ANALYTICS;

  return {
    insights,
    confidence,
    hasMinimumData,
    computedAt: new Date().toISOString(),
    tags: inputs.tags,
  };
}
