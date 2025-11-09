/**
 * Module: enhancedPatternAnalysis
 *
 * Purpose
 * - Hybrid statistical + ML analysis for trends, correlations, anomalies, and predictions
 * - Main orchestration layer that delegates to specialized analysis modules
 *
 * Architecture
 * - Core analysis functions extracted to src/lib/patternAnalysis/ modules:
 *   - trends.ts: Trend detection and forecasting
 *   - anomalies.ts: Anomaly detection using robust statistics
 *   - correlations.ts: Correlation matrix generation
 *   - predictions.ts: ML-based predictions and risk assessment
 *   - utils.ts: Shared utility functions
 *
 * Robust Statistics Integration
 * - Uses zScoresMedian (MAD-based) and huberRegression to reduce outlier sensitivity
 * - Prefer robust estimators for heavy-tailed or noisy classroom data
 *
 * Parameterization
 * - All thresholds, windows, and sensitivities are read from analyticsConfig
 *   - enhancedAnalysis.predictionConfidenceThreshold
 *   - timeWindows (rolling calculations)
 *   - patternAnalysis.highIntensityThreshold and related knobs
 * - No hardcoded constants; provide safe defaults when config is unavailable
 *
 * Performance & Safety
 * - Avoid blocking the main thread; yield in UI layers if long operations are needed
 * - Log via logger (no console.* in shipped code)
 */
import { EmotionEntry, SensoryEntry, TrackingEntry, Goal } from "@/types/student";
import { getMlModels, BaselineCluster } from "@/lib/mlModels";
import { logger } from '@/lib/logger';
import {
  type TrendAnalysis,
  type AnomalyDetection,
  type CorrelationMatrix,
  type PredictiveInsight,
  analyzeTrendsWithStatistics,
  generateConfidenceExplanation,
  detectAnomalies,
  generateCorrelationMatrix,
  generatePredictiveInsights
} from '@/lib/patternAnalysis';

// Re-export types for backward compatibility
export type { PredictiveInsight, TrendAnalysis, AnomalyDetection, CorrelationMatrix };

type MlModelsInstance = Awaited<ReturnType<typeof getMlModels>>;

class EnhancedPatternAnalysisEngine {
  private mlModelsInitialized: boolean = false;
  private mlModelsInstance: MlModelsInstance | null = null;

  constructor() {
    // Initialize ML models
    this.initializeMLModels();
  }

  private async ensureMlModels(): Promise<MlModelsInstance> {
    if (!this.mlModelsInstance) {
      this.mlModelsInstance = await getMlModels();
    }
    return this.mlModelsInstance;
  }

  private async initializeMLModels(): Promise<void> {
    try {
      const ml = await this.ensureMlModels();
      await ml.init();
      this.mlModelsInitialized = true;
    } catch (error) {
      logger.error('Failed to initialize ML models:', error);
      this.mlModelsInitialized = false;
      this.mlModelsInstance = null;
    }
  }

  // Predictive Analytics with ML Integration
  async generatePredictiveInsights(
    emotions: EmotionEntry[],
    sensoryInputs: SensoryEntry[],
    trackingEntries: TrackingEntry[],
    goals: Goal[] = []
  ): Promise<PredictiveInsight[]> {
    // Delegate to extracted module function
    return generatePredictiveInsights(
      emotions,
      sensoryInputs,
      trackingEntries,
      goals,
      this.mlModelsInstance,
      this.mlModelsInitialized
    );
  }

  // Enhanced Trend Analysis with Statistical Significance
  analyzeTrendsWithStatistics(data: { value: number; timestamp: Date }[]): TrendAnalysis | null {
    // Delegate to extracted module function
    return analyzeTrendsWithStatistics(data);
  }

  // Generate confidence explanation
  generateConfidenceExplanation(
    dataPoints: number,
    timeSpanDays: number,
    rSquared: number,
    confidence: number
  ): { level: 'low' | 'medium' | 'high'; explanation: string; factors: string[] } {
    // Delegate to extracted module function
    return generateConfidenceExplanation(dataPoints, timeSpanDays, rSquared, confidence);
  }

  // Anomaly Detection using Statistical Methods
  detectAnomalies(
    emotions: EmotionEntry[],
    sensoryInputs: SensoryEntry[],
    trackingEntries: TrackingEntry[]
  ): AnomalyDetection[] {
    // Delegate to extracted module function
    return detectAnomalies(emotions, sensoryInputs, trackingEntries);
  }

  // Comprehensive Correlation Matrix
  generateCorrelationMatrix(trackingEntries: TrackingEntry[]): CorrelationMatrix {
    // Delegate to extracted module function
    return generateCorrelationMatrix(trackingEntries);
  }

  // Baseline analysis using ML clustering
  async analyzeBaseline(trackingEntries: TrackingEntry[]): Promise<BaselineCluster[]> {
    if (!this.mlModelsInitialized || trackingEntries.length < 10) {
      return [];
    }

    try {
      const ml = await this.ensureMlModels();
      const clusters = await ml.performBaselineClustering(trackingEntries, 3);
      return clusters;
    } catch (error) {
      logger.error('Baseline clustering failed:', error);
      return [];
    }
  }
}

export const enhancedPatternAnalysis = new EnhancedPatternAnalysisEngine();
