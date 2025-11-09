/**
 * Module: patternAnalysis/predictions
 *
 * Purpose:
 * - ML-based predictions for emotions and sensory responses
 * - Goal achievement forecasting
 * - Risk assessment and intervention recommendations
 */

import { EmotionEntry, SensoryEntry, TrackingEntry, Goal } from "@/types/student";
import { subDays } from "date-fns";
import { analyticsConfig } from "@/lib/analyticsConfig";
import { getMlModels, EmotionPrediction, SensoryPrediction } from "@/lib/mlModels";
import { logger } from '@/lib/logger';
import { getLatestEnvironmentConditions } from '@/lib/utils/environment';
import {
  TrendAnalysis,
  analyzeTrendsWithStatistics,
  analyzeEmotionTrend,
  analyzeSensoryTrend,
  getEmotionTrendRecommendations,
  getSensoryTrendRecommendations,
  getTrendSeverity
} from './trends';

export interface PredictiveInsight {
  type: 'prediction' | 'trend' | 'recommendation' | 'risk';
  title: string;
  description: string;
  confidence: number;
  timeframe: string;
  prediction?: {
    value: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    accuracy: number;
  };
  recommendations: string[];
  severity?: 'low' | 'medium' | 'high';
  source?: 'statistical' | 'ml' | 'hybrid';
  mlPrediction?: EmotionPrediction[] | SensoryPrediction;
}

type MlModelsInstance = Awaited<ReturnType<typeof getMlModels>>;

/**
 * Generates predictive insights combining statistical and ML approaches
 * Includes emotion forecasts, sensory predictions, goal achievement, and risk assessment
 *
 * @param emotions - Array of emotion entries
 * @param sensoryInputs - Array of sensory entries
 * @param trackingEntries - Array of tracking entries
 * @param goals - Array of goals to analyze
 * @param mlModelsInstance - Initialized ML models instance (optional)
 * @param mlModelsInitialized - Whether ML models are initialized
 * @returns Array of predictive insights
 */
export async function generatePredictiveInsights(
  emotions: EmotionEntry[],
  sensoryInputs: SensoryEntry[],
  trackingEntries: TrackingEntry[],
  goals: Goal[] = [],
  mlModelsInstance: MlModelsInstance | null = null,
  mlModelsInitialized: boolean = false
): Promise<PredictiveInsight[]> {
  const cfg = analyticsConfig.getConfig();
  const { enhancedAnalysis, patternAnalysis } = cfg;

  const collectedInsights: PredictiveInsight[] = [];

  // Statistical emotional well-being prediction
  const emotionTrend = analyzeEmotionTrend(emotions);
  if (emotionTrend && emotionTrend.significance >= enhancedAnalysis.predictionConfidenceThreshold) {
    const statisticalInsight: PredictiveInsight = {
      type: 'prediction',
      title: 'Emotional Well-being Forecast (Statistical)',
      description: `Based on current trends, emotional intensity is ${emotionTrend.direction}`,
      confidence: emotionTrend.significance,
      timeframe: '7-day forecast',
      prediction: {
        value: emotionTrend.forecast.next7Days,
        trend: emotionTrend.direction,
        accuracy: emotionTrend.confidence
      },
      recommendations: getEmotionTrendRecommendations(emotionTrend),
      severity: getTrendSeverity(emotionTrend),
      source: 'statistical'
    };
    collectedInsights.push(statisticalInsight);
  }

  // ML emotional prediction if available
  if (mlModelsInitialized && mlModelsInstance && trackingEntries.length >= 7) {
    try {
      const modelStatus = await mlModelsInstance.getModelStatus();
      if (modelStatus.get('emotion-prediction')) {
        const mlEmotionPredictions = await mlModelsInstance.predictEmotions(
          trackingEntries.slice(-14), // Use last 14 days for better context
          7
        );

        if (mlEmotionPredictions.length > 0) {
          // Calculate overall trend from ML predictions
          const avgPredictedIntensity = mlEmotionPredictions.reduce((sum, pred) => {
            const emotionSum = Object.values(pred.emotions).reduce((s, v) => s + v, 0);
            return sum + emotionSum / Object.keys(pred.emotions).length;
          }, 0) / mlEmotionPredictions.length;

          const currentAvgIntensity = emotions.slice(-7).reduce((sum, e) => sum + e.intensity, 0) /
            Math.max(emotions.slice(-7).length, 1);

          const upMultiplier = 1 + enhancedAnalysis.trendThreshold;
          const downMultiplier = 1 - enhancedAnalysis.trendThreshold;
          const mlTrend = avgPredictedIntensity >= currentAvgIntensity * upMultiplier ? 'increasing' :
                         avgPredictedIntensity <= currentAvgIntensity * downMultiplier ? 'decreasing' : 'stable';

          const highT = patternAnalysis.highIntensityThreshold;
          const mediumCut = Math.max(highT - 2, 1);
          const severity: 'low' | 'medium' | 'high' =
            avgPredictedIntensity >= highT ? 'high' :
            avgPredictedIntensity <= mediumCut ? 'medium' : 'low';

          collectedInsights.push({
            type: 'prediction',
            title: 'Emotional Well-being Forecast (ML)',
            description: `Machine learning predicts emotional patterns will be ${mlTrend}`,
            confidence: mlEmotionPredictions[0].confidence,
            timeframe: '7-day forecast',
            prediction: {
              value: avgPredictedIntensity,
              trend: mlTrend,
              accuracy: mlEmotionPredictions[0].confidence
            },
            recommendations: getMLEmotionRecommendations(mlEmotionPredictions, mlTrend),
            severity,
            source: 'ml',
            mlPrediction: mlEmotionPredictions
          });
        }
      }
    } catch (error) {
      logger.error('ML emotion prediction failed:', error);
    }
  }

  // Statistical sensory regulation prediction
  const sensoryTrend = analyzeSensoryTrend(sensoryInputs);
  if (sensoryTrend && sensoryTrend.significance >= enhancedAnalysis.predictionConfidenceThreshold) {
    collectedInsights.push({
      type: 'prediction',
      title: 'Sensory Regulation Forecast (Statistical)',
      description: `Sensory seeking/avoiding patterns show ${sensoryTrend.direction} trend`,
      confidence: sensoryTrend.significance,
      timeframe: '14-day forecast',
      prediction: {
        value: sensoryTrend.forecast.next7Days,
        trend: sensoryTrend.direction,
        accuracy: sensoryTrend.confidence
      },
      recommendations: getSensoryTrendRecommendations(sensoryTrend),
      severity: getTrendSeverity(sensoryTrend),
      source: 'statistical'
    });
  }

  // ML sensory prediction if available
  if (mlModelsInitialized && mlModelsInstance && trackingEntries.length > 0) {
    try {
      const modelStatus = await mlModelsInstance.getModelStatus();
      if (modelStatus.get('sensory-response') && trackingEntries[trackingEntries.length - 1].environmentalData) {
        // Use clean environment categorization utility (replaces deeply nested ternaries)
        const environmentConditions = getLatestEnvironmentConditions(trackingEntries);

        const latestEnvironment = {
          lighting: environmentConditions.lighting,
          noise: environmentConditions.noise,
          temperature: environmentConditions.temperature,
          crowded: 'moderate' as const,
          smells: false,
          textures: false
        };

        const mlSensoryPrediction = await mlModelsInstance.predictSensoryResponse(
          latestEnvironment,
          new Date()
        );

        if (mlSensoryPrediction) {
          collectedInsights.push({
            type: 'prediction',
            title: 'Sensory Response Prediction (ML)',
            description: `Machine learning predicts sensory responses based on current environment`,
            confidence: mlSensoryPrediction.confidence,
            timeframe: 'Current environment',
            recommendations: getMLSensoryRecommendations(mlSensoryPrediction),
            severity: mlSensoryPrediction.environmentalTriggers.length > 2 ? 'high' :
                     mlSensoryPrediction.environmentalTriggers.length > 0 ? 'medium' : 'low',
            source: 'ml',
            mlPrediction: mlSensoryPrediction
          });
        }
      }
    } catch (error) {
      logger.error('ML sensory prediction failed:', error);
    }
  }

  // Goal achievement prediction
  goals.forEach(goal => {
    const goalPrediction = predictGoalAchievement(goal);
    if (goalPrediction) {
      collectedInsights.push(goalPrediction);
    }
  });

  // Risk assessment
  const riskInsights = assessRisks(emotions, sensoryInputs, trackingEntries);
  collectedInsights.push(...riskInsights);

  return collectedInsights;
}

/**
 * Predicts goal achievement based on historical progress data
 *
 * @param goal - Goal with data points
 * @returns Predictive insight or null if insufficient data
 */
export function predictGoalAchievement(goal: Goal): PredictiveInsight | null {
  if (!goal.dataPoints || goal.dataPoints.length < 3) return null;

  const progressData = goal.dataPoints.map(dp => ({
    value: dp.value,
    timestamp: dp.timestamp
  }));

  const trend = analyzeTrendsWithStatistics(progressData);
  if (!trend) return null;

  const currentProgress = goal.dataPoints[goal.dataPoints.length - 1].value;
  const targetValue = goal.targetValue;
  const remainingProgress = targetValue - currentProgress;
  const estimatedDays = trend.rate > 0 ? remainingProgress / trend.rate : -1;

  return {
    type: 'prediction',
    title: `Goal Achievement Forecast: ${goal.title}`,
    description: estimatedDays > 0
      ? `Estimated ${Math.ceil(estimatedDays)} days to achieve goal at current pace`
      : 'Goal may require strategy adjustment based on current trend',
    confidence: trend.significance,
    timeframe: 'Goal completion forecast',
    prediction: {
      value: targetValue,
      trend: trend.direction,
      accuracy: trend.significance
    },
    recommendations: getGoalRecommendations(goal, trend, estimatedDays),
    severity: estimatedDays < 0 ? 'high' : estimatedDays > 60 ? 'medium' : 'low'
  };
}

/**
 * Assesses risks based on recent emotional and sensory patterns
 *
 * @param emotions - Array of emotion entries
 * @param sensoryInputs - Array of sensory entries
 * @param trackingEntries - Array of tracking entries
 * @returns Array of risk-type predictive insights
 */
export function assessRisks(
  emotions: EmotionEntry[],
  sensoryInputs: SensoryEntry[],
  trackingEntries: TrackingEntry[]
): PredictiveInsight[] {
  const cfg = analyticsConfig.getConfig();
  const { timeWindows, enhancedAnalysis } = cfg;

  const risks: PredictiveInsight[] = [];
  const recentData = {
    emotions: emotions.filter(e => e.timestamp >= subDays(new Date(), timeWindows.shortTermDays)),
    sensoryInputs: sensoryInputs.filter(s => s.timestamp >= subDays(new Date(), timeWindows.shortTermDays)),
    trackingEntries: trackingEntries.filter(t => t.timestamp >= subDays(new Date(), timeWindows.shortTermDays))
  };

  // Apply sensitivity multiplier for risk assessment
  // Incidents threshold: prefer configured value if present; fallback to 3
  const incidentsThreshold = Math.max(1, Math.floor((enhancedAnalysis as any)?.riskAssessmentThreshold ?? 3));

  // High stress accumulation risk (use configured intensity and emotions)
  const stressIntensityT = cfg?.enhancedAnalysis?.riskAssessment?.stressIntensityThreshold;
  const stressEmotionsCfg = cfg?.enhancedAnalysis?.riskAssessment?.stressEmotions;
  const stressEmotions = Array.isArray(stressEmotionsCfg) ? stressEmotionsCfg.map((e: string) => e.toLowerCase()) : [];

  let highStressCount = 0;
  if (typeof stressIntensityT === 'number' && stressEmotions.length > 0) {
    highStressCount = recentData.emotions.filter(e =>
      e.intensity >= stressIntensityT && stressEmotions.includes(e.emotion.toLowerCase())
    ).length;
  }

  if (highStressCount >= incidentsThreshold && highStressCount > 0) {
    risks.push({
      type: 'risk',
      title: 'Stress Accumulation Risk',
      description: `${highStressCount} high-stress incidents in the past 2 weeks`,
      confidence: 0.8,
      timeframe: 'Immediate attention needed',
      recommendations: [
        'Implement immediate stress reduction strategies',
        'Review and adjust current interventions',
        'Consider environmental modifications',
        'Schedule additional support sessions'
      ],
      severity: 'high'
    });
  }

  return risks;
}

/**
 * Generates recommendations based on goal trend and estimated completion time
 *
 * @param goal - Goal being analyzed
 * @param trend - Trend analysis of goal progress
 * @param estimatedDays - Estimated days to goal completion
 * @returns Array of recommendation strings
 */
export function getGoalRecommendations(
  goal: Goal,
  trend: TrendAnalysis,
  estimatedDays: number
): string[] {
  if (estimatedDays < 0) {
    return [
      'Review and adjust goal strategies',
      'Break goal into smaller milestones',
      'Identify and address barriers',
      'Consider modifying timeline or approach'
    ];
  } else if (estimatedDays > 90) {
    return [
      'Increase intervention frequency',
      'Add additional support strategies',
      'Review goal expectations',
      'Provide more immediate reinforcement'
    ];
  }
  return [
    'Continue current approach',
    'Monitor progress regularly',
    'Celebrate milestones reached',
    'Maintain consistent support'
  ];
}

/**
 * Generates ML-based emotion prediction recommendations
 *
 * @param predictions - Array of ML emotion predictions
 * @param trend - Overall trend direction
 * @returns Array of recommendation strings
 */
export function getMLEmotionRecommendations(
  predictions: EmotionPrediction[],
  trend: string
): string[] {
  const highAnxietyDays = predictions.filter(p => p.emotions.anxious > 7).length;
  const lowPositiveDays = predictions.filter(p => p.emotions.happy < 3 && p.emotions.calm < 3).length;

  const recommendations: string[] = [];

  if (highAnxietyDays >= 3) {
    recommendations.push('ML predicts elevated anxiety - implement proactive calming strategies');
    recommendations.push('Schedule additional check-ins on high-anxiety days');
  }

  if (lowPositiveDays >= 4) {
    recommendations.push('ML indicates low positive emotions upcoming - increase engagement activities');
    recommendations.push('Prepare mood-boosting interventions');
  }

  if (trend === 'increasing') {
    recommendations.push('ML shows increasing emotional intensity - monitor for triggers');
  } else if (trend === 'decreasing') {
    recommendations.push('ML shows decreasing emotional engagement - check for withdrawal signs');
  }

  recommendations.push('Compare ML predictions with actual outcomes to refine models');

  return recommendations;
}

/**
 * Generates ML-based sensory prediction recommendations
 *
 * @param prediction - ML sensory response prediction
 * @returns Array of recommendation strings
 */
export function getMLSensoryRecommendations(prediction: SensoryPrediction): string[] {
  const recommendations: string[] = [];

  const cfg = analyticsConfig.getConfig();
  const bands = cfg.enhancedAnalysis.correlationSignificance;
  const highBand = typeof bands?.high === 'number' ? bands.high : 0.7;

  Object.entries(prediction.sensoryResponse).forEach(([sense, response]) => {
    if (response.avoiding > highBand) {
      recommendations.push(`High ${sense} avoidance predicted - minimize ${sense} stimuli`);
    } else if (response.seeking > highBand) {
      recommendations.push(`High ${sense} seeking predicted - provide ${sense} input opportunities`);
    }
  });

  // Environmental trigger recommendations
  prediction.environmentalTriggers.forEach(trigger => {
    if (trigger.probability > highBand) {
      recommendations.push(`High probability of reaction to ${trigger.trigger} - prepare alternatives`);
    }
  });

  return recommendations;
}
