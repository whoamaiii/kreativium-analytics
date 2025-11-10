/**
 * Module: patternAnalysis
 *
 * Purpose:
 * - Central export point for all pattern analysis modules
 * - Provides organized access to trends, anomalies, correlations, and predictions
 */

// Export all trend analysis functionality
export {
  type TrendAnalysis,
  analyzeTrendsWithStatistics,
  analyzeEmotionTrend,
  analyzeSensoryTrend,
  generateConfidenceExplanation,
  getTrendSeverity,
  getEmotionTrendRecommendations,
  getSensoryTrendRecommendations
} from './trends';

// Export all anomaly detection functionality
export {
  type AnomalyDetection,
  detectAnomalies,
  getAnomalyRecommendations
} from './anomalies';

// Export all correlation analysis functionality
export {
  type CorrelationMatrix,
  generateCorrelationMatrix
} from './correlations';

// Export all prediction functionality
export {
  type PredictiveInsight,
  generatePredictiveInsights,
  predictGoalAchievement,
  assessRisks,
  getGoalRecommendations,
  getMLEmotionRecommendations,
  getMLSensoryRecommendations
} from './predictions';

// Export utility functions
export {
  groupSensoryByDay,
  convertLightingToNumeric
} from './utils';
