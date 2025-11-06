import { analyticsConfig, ANALYTICS_CONFIG } from '@/lib/analyticsConfig';
import { alertSystem } from '@/lib/alertSystem';
import { generateAnalyticsSummary } from '@/lib/analyticsSummary';
import type { IDataStorage } from '@/lib/dataStorage';
import { logger } from '@/lib/logger';
import type { Student, EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import type { AnalysisEngine, AnalysisOptions } from '@/lib/analysis';
import { HeuristicAnalysisEngine } from '@/lib/analysis';
import type { AnalyticsResultsCompat } from '@/lib/analytics/types';

const createInvalidStudentResult = (): AnalyticsResultsCompat => ({
  patterns: [],
  correlations: [],
  environmentalCorrelations: [],
  predictiveInsights: [],
  anomalies: [],
  insights: [],
  error: 'INVALID_STUDENT',
});

const createFailureResult = (): AnalyticsResultsCompat => ({
  patterns: [],
  correlations: [],
  environmentalCorrelations: [],
  predictiveInsights: [],
  anomalies: [],
  insights: [],
  error: 'ANALYTICS_GENERATION_FAILED',
});

let lastSummaryFacadeLogMinute: number | null = null;

export interface AnalyticsRunnerDeps {
  storage: IDataStorage;
  createAnalysisEngine: (useAI?: boolean) => AnalysisEngine;
}

export class AnalyticsRunner {
  private storage: IDataStorage;
  private createAnalysisEngine: (useAI?: boolean) => AnalysisEngine;

  constructor({ storage, createAnalysisEngine }: AnalyticsRunnerDeps) {
    this.storage = storage;
    this.createAnalysisEngine = createAnalysisEngine;
  }

  async run(student: Student, useAI?: boolean): Promise<AnalyticsResultsCompat> {
    if (!student || !student.id) {
      logger.error('[analyticsRunner] run: invalid student', { student });
      return createInvalidStudentResult();
    }

    try {
      const trackingEntries = this.storage.getEntriesForStudent(student.id) || [];
      const emotions: EmotionEntry[] = trackingEntries.flatMap((entry) => entry.emotions || []);
      const sensoryInputs: SensoryEntry[] = trackingEntries.flatMap((entry) => entry.sensoryInputs || []);

      const engine = this.createAnalysisEngine(useAI);
      const opts: AnalysisOptions = { includeAiMetadata: true };
      const results = await engine.analyzeStudent(student.id, undefined, opts);

      if (useAI === true && engine instanceof HeuristicAnalysisEngine && opts.includeAiMetadata) {
        if (!results.ai) results.ai = {};
        if (!results.ai.caveats) results.ai.caveats = [];
        results.ai.caveats.push('AI disabled or unavailable; heuristic used');
      }

      await this.applySummaryFacade(student.id, trackingEntries, emotions, sensoryInputs, results as AnalyticsResultsCompat);

      if (trackingEntries.length > 0) {
        await alertSystem.generateAlertsForStudent(student, emotions, sensoryInputs, trackingEntries);
      }

      return results as AnalyticsResultsCompat;
    } catch (error) {
      logger.error(`[analyticsRunner] run failed for student ${student.id}`, {
        error: error instanceof Error ? { message: error.message, stack: error.stack, name: error.name } : error,
      });

      try {
        const fallback = await new HeuristicAnalysisEngine().analyzeStudent(student.id, undefined, { includeAiMetadata: true });
        const fallbackResults = fallback as AnalyticsResultsCompat & { error?: unknown };
        if (fallbackResults.error) {
          return createFailureResult();
        }
        return fallbackResults;
      } catch (fallbackError) {
        logger.error('[analyticsRunner] Heuristic fallback failed', {
          studentId: student.id,
          error: fallbackError instanceof Error ? { message: fallbackError.message, stack: fallbackError.stack } : fallbackError,
        });
        return createFailureResult();
      }
    }
  }

  private async applySummaryFacade(
    studentId: string,
    trackingEntries: TrackingEntry[],
    emotions: EmotionEntry[],
    sensoryInputs: SensoryEntry[],
    results: AnalyticsResultsCompat,
  ): Promise<void> {
    try {
      const liveConfig = (() => {
        try { return analyticsConfig.getConfig(); } catch { return null; }
      })();
      const useSummaryFacade = (liveConfig?.features?.enableSummaryFacade ?? ANALYTICS_CONFIG.features?.enableSummaryFacade) === true;
      if (!useSummaryFacade) return;

      const summary = await generateAnalyticsSummary({
        entries: trackingEntries,
        emotions,
        sensoryInputs,
        results: {
          patterns: results.patterns ?? [],
          correlations: results.correlations ?? [],
          predictiveInsights: results.predictiveInsights ?? [],
        },
      });

      results.insights = summary.insights;
      (results as AnalyticsResultsCompat & { hasMinimumData?: boolean }).hasMinimumData = summary.hasMinimumData;
      (results as AnalyticsResultsCompat & { confidence?: number }).confidence = summary.confidence;

      try {
        const nowMinute = new Date().getMinutes();
        if (lastSummaryFacadeLogMinute !== nowMinute) {
          logger.debug('[analyticsRunner] Summary facade applied', {
            studentId,
            entries: trackingEntries.length,
            emotions: emotions.length,
            sensory: sensoryInputs.length,
          });
          lastSummaryFacadeLogMinute = nowMinute;
        }
      } catch (logError) {
        logger.warn('[analyticsRunner] Summary facade debug logging failed', logError);
      }
    } catch (summaryError) {
      logger.warn('[analyticsRunner] Summary facade failed, keeping original insights:', summaryError);
    }
  }
}
