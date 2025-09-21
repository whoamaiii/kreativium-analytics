// src/lib/insights/unified.ts
// Unified insights computation module
// - Single entry: computeInsights
// - Pure function: no side effects, no worker instantiation
// - Uses central config (analyticsConfig) with safe fallbacks to ANALYTICS_CONFIG
// - Keeps payloads small and typed

import { analyticsConfig, ANALYTICS_CONFIG, type AnalyticsConfiguration } from '@/lib/analyticsConfig';
import { patternAnalysis, type PatternResult, type CorrelationResult } from '@/lib/patternAnalysis';
import { enhancedPatternAnalysis, type PredictiveInsight, type AnomalyDetection } from '@/lib/enhancedPatternAnalysis';
import { generateInsights as generateUnifiedInsights, calculateConfidence as computeUnifiedConfidence } from '@/lib/insights';
import type { EmotionEntry, SensoryEntry, TrackingEntry, Student, Goal } from '@/types/student';
import type { AnalyticsResults } from '@/types/analytics';
import { logger } from '@/lib/logger';

export interface ComputeInsightsInputs {
  entries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  goals?: Goal[];
}

export interface ComputeInsightsOptions {
  config?: AnalyticsConfiguration; // runtime override
}

function minimalSafeResults(partial?: Partial<AnalyticsResults> & { confidence?: number; hasMinimumData?: boolean }): AnalyticsResults {
  return {
    patterns: [],
    correlations: [],
    environmentalCorrelations: [],
    predictiveInsights: [],
    anomalies: [],
    insights: [],
    suggestedInterventions: [],
    ...partial,
  } as AnalyticsResults;
}

export async function computeInsights(
  inputs: ComputeInsightsInputs,
  options?: ComputeInsightsOptions
): Promise<AnalyticsResults> {
  // Early guards for invalid inputs
  if (!inputs || !Array.isArray(inputs.entries) || !Array.isArray(inputs.emotions) || !Array.isArray(inputs.sensoryInputs)) {
    logger.error('[insights/unified] computeInsights: invalid inputs', { inputsType: typeof inputs });
    return minimalSafeResults({ error: 'INVALID_INPUT', confidence: 0, hasMinimumData: false });
  }

  try {
    const { entries, emotions, sensoryInputs } = inputs;
    const cfg = options?.config ?? (() => {
      try {
        return analyticsConfig.getConfig();
      } catch {
        return ANALYTICS_CONFIG as unknown as AnalyticsConfiguration;
      }
    })();

    const hasMinimumData = (emotions.length > 0) || (sensoryInputs.length > 0) || (entries.length > 0);

    const patterns: PatternResult[] = [];
    let correlations: CorrelationResult[] = [];
    let predictiveInsights: PredictiveInsight[] = [];
    let anomalies: AnomalyDetection[] = [];

    if (hasMinimumData) {
      const analysisDays = cfg.analytics?.ANALYSIS_PERIOD_DAYS ?? ANALYTICS_CONFIG.analytics.ANALYSIS_PERIOD_DAYS;
      if (emotions.length > 0) {
        patterns.push(...patternAnalysis.analyzeEmotionPatterns(emotions, analysisDays));
      }
      if (sensoryInputs.length > 0) {
        patterns.push(...patternAnalysis.analyzeSensoryPatterns(sensoryInputs, analysisDays));
      }
      if (entries.length >= (cfg.analytics?.MIN_TRACKING_FOR_CORRELATION ?? ANALYTICS_CONFIG.analytics.MIN_TRACKING_FOR_CORRELATION)) {
        correlations = patternAnalysis.analyzeEnvironmentalCorrelations(entries);
      }
      if (entries.length >= (cfg.analytics?.MIN_TRACKING_FOR_ENHANCED ?? ANALYTICS_CONFIG.analytics.MIN_TRACKING_FOR_ENHANCED)) {
        predictiveInsights = await enhancedPatternAnalysis.generatePredictiveInsights(
          emotions,
          sensoryInputs,
          entries,
          inputs.goals ?? []
        );
        anomalies = enhancedPatternAnalysis.detectAnomalies(emotions, sensoryInputs, entries);
      }
    }

    const resultsBase = {
      patterns,
      correlations,
      environmentalCorrelations: correlations,
      predictiveInsights,
      anomalies,
      hasMinimumData,
    } as any;

    const insights = generateUnifiedInsights(resultsBase, emotions, entries, cfg.insights);
    const confidence = computeUnifiedConfidence(emotions, sensoryInputs, entries, cfg.confidence);

    return {
      ...resultsBase,
      insights,
      confidence,
      suggestedInterventions: [],
    } as AnalyticsResults;
  } catch (error) {
    logger.error('[insights/unified] computeInsights failed', { error: error instanceof Error ? { message: error.message, stack: error.stack, name: error.name } : error });
    return minimalSafeResults({ error: 'ANALYTICS_UNIFIED_ERROR', confidence: 0, hasMinimumData: false });
  }
}

