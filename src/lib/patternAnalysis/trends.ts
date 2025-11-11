/**
 * Module: patternAnalysis/trends
 *
 * Purpose:
 * - Trend detection and analysis using robust statistical methods
 * - Forecast generation and confidence calculation
 * - Trend-based recommendations
 */

import { EmotionEntry, SensoryEntry } from '@/types/student';
import { differenceInDays } from 'date-fns';
import { analyticsConfig } from '@/lib/analyticsConfig';
import { huberRegression } from '@/lib/statistics';

export interface TrendAnalysis {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  rate: number; // change per day
  significance: number; // 0-1
  confidence: number;
  forecast: {
    next7Days: number;
    next30Days: number;
    confidence: number;
  };
}

/**
 * Analyzes trends using robust statistical methods (Huber regression)
 * and generates forecasts with confidence scores
 *
 * @param data - Array of timestamped values to analyze
 * @returns Trend analysis with forecasts or null if insufficient data
 */
export function analyzeTrendsWithStatistics(
  data: { value: number; timestamp: Date }[],
): TrendAnalysis | null {
  const cfg = analyticsConfig.getConfig();
  const { enhancedAnalysis, analytics, timeWindows } = cfg;

  if (data.length < enhancedAnalysis.minSampleSize) return null;

  // Sort by timestamp without mutating the input
  const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Robust linear regression (Huber) for slope/intercept on x=0..n-1, y=values
  const n = sortedData.length;
  const x = sortedData.map((_, i) => i);
  const y = sortedData.map((d) => d.value);

  const huberCfg = enhancedAnalysis?.huber || { delta: 1.345, maxIter: 50, tol: 1e-6 };
  const { slope, intercept } = huberRegression(x, y, {
    maxIter: Number.isFinite(huberCfg.maxIter) ? huberCfg.maxIter : 50,
    tol: Number.isFinite(huberCfg.tol) ? huberCfg.tol : 1e-6,
    delta: Number.isFinite(huberCfg.delta) ? huberCfg.delta : 1.345,
  });

  // Compute predictions and R^2 against actuals with guards for invalid values
  const interceptSafe = Number.isFinite(intercept) ? intercept : 0;
  // Build safe pairs for R^2
  const xSafe: number[] = [];
  const ySafe: number[] = [];
  for (let i = 0; i < n; i++) {
    const yi = y[i];
    if (Number.isFinite(yi)) {
      xSafe.push(x[i]);
      ySafe.push(yi);
    }
  }
  const m = xSafe.length;
  const yPred: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const pred = Number.isFinite(slope) ? slope * xi + interceptSafe : interceptSafe;
    yPred[i] = Number.isFinite(pred) ? pred : 0;
  }
  let rSquared = 0;
  if (m >= 2) {
    const yMean = ySafe.reduce((a, b) => a + b, 0) / m;
    let ssRes = 0;
    let ssTot = 0;
    for (let k = 0; k < m; k++) {
      const idx = xSafe[k];
      const resid = ySafe[k] - yPred[idx];
      ssRes += resid * resid;
      const dy = ySafe[k] - yMean;
      ssTot += dy * dy;
    }
    rSquared = ssTot === 0 ? 0 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));
  }

  // Time span and daily rate (safe timespan guards)
  const timeSpanDays = differenceInDays(
    sortedData[sortedData.length - 1].timestamp,
    sortedData[0].timestamp,
  );
  const safeTimeSpanDays = Math.max(1, timeSpanDays || 0);
  const dailyRate = Number.isFinite(slope) ? slope * (n / safeTimeSpanDays) : 0;

  // Data and timespan quality from configured targets
  const pointsTarget = Number(enhancedAnalysis?.qualityTargets?.pointsTarget);
  const timeSpanTarget = Number(enhancedAnalysis?.qualityTargets?.timeSpanDaysTarget);
  const dataQuality =
    Number.isFinite(pointsTarget) && pointsTarget > 0 ? Math.min(1, n / pointsTarget) : 0;
  const timeSpanQuality =
    Number.isFinite(timeSpanTarget) && timeSpanTarget > 0
      ? Math.min(1, timeSpanDays / timeSpanTarget)
      : 0;
  const patternStrength = Math.max(0, rSquared);
  const enhancedConfidenceRaw = dataQuality * 0.3 + timeSpanQuality * 0.3 + patternStrength * 0.4;
  const enhancedConfidence = Number.isFinite(enhancedConfidenceRaw) ? enhancedConfidenceRaw : 0;

  // Determine direction using configured threshold
  const threshold = Number(enhancedAnalysis?.trendThreshold) || 0;
  const direction =
    Math.abs(dailyRate) < threshold ? 'stable' : dailyRate > 0 ? 'increasing' : 'decreasing';

  // Forecasts (ensure finite values)
  const lastPred = yPred[yPred.length - 1] ?? 0;
  const slopeSafe = Number.isFinite(slope) ? slope : 0;
  const next7 = lastPred + slopeSafe * (Number(timeWindows?.recentDataDays) || 7);
  const next30 = lastPred + slopeSafe * (Number(timeWindows?.defaultAnalysisDays) || 30);

  return {
    metric: 'Overall Trend',
    direction,
    rate: Number.isFinite(dailyRate) ? dailyRate : 0,
    significance: Number.isFinite(rSquared) ? rSquared : 0,
    confidence: enhancedConfidence,
    forecast: {
      next7Days: Number.isFinite(next7) ? next7 : 0,
      next30Days: Number.isFinite(next30) ? next30 : 0,
      confidence: enhancedConfidence,
    },
  };
}

/**
 * Analyzes emotion intensity trend over time
 *
 * @param emotions - Array of emotion entries
 * @returns Trend analysis or null if insufficient data
 */
export function analyzeEmotionTrend(emotions: EmotionEntry[]): TrendAnalysis | null {
  const emotionData = emotions.map((e) => ({
    value: e.intensity,
    timestamp: e.timestamp,
  }));

  return analyzeTrendsWithStatistics(emotionData);
}

/**
 * Analyzes sensory seeking/avoiding trend over time
 * Converts responses to numeric: seeking=1, avoiding=-1, neutral=0
 *
 * @param sensoryInputs - Array of sensory entries
 * @returns Trend analysis or null if insufficient data
 */
export function analyzeSensoryTrend(sensoryInputs: SensoryEntry[]): TrendAnalysis | null {
  // Convert sensory responses to numeric values for trend analysis
  const sensoryData = sensoryInputs.map((s) => ({
    value: s.response.toLowerCase().includes('seeking')
      ? 1
      : s.response.toLowerCase().includes('avoiding')
        ? -1
        : 0,
    timestamp: s.timestamp,
  }));

  return analyzeTrendsWithStatistics(sensoryData);
}

/**
 * Generates confidence explanation for trend analysis
 *
 * @param dataPoints - Number of data points in the analysis
 * @param timeSpanDays - Time span covered by the data in days
 * @param rSquared - R-squared value from regression
 * @param confidence - Overall confidence score
 * @returns Confidence level, explanation, and contributing factors
 */
export function generateConfidenceExplanation(
  dataPoints: number,
  timeSpanDays: number,
  rSquared: number,
  confidence: number,
): { level: 'low' | 'medium' | 'high'; explanation: string; factors: string[] } {
  const cfg = analyticsConfig.getConfig();
  const { enhancedAnalysis, timeWindows, insights, patternAnalysis } = cfg;

  const factors: string[] = [];
  let explanation = '';
  let level: 'low' | 'medium' | 'high' = 'low';

  // Minimum sample size factor (guard missing config)
  if (typeof enhancedAnalysis?.minSampleSize === 'number') {
    if (dataPoints < enhancedAnalysis.minSampleSize) {
      factors.push(`insufficientData:${dataPoints}:${enhancedAnalysis.minSampleSize}`);
    } else {
      // Include a positive factor documenting threshold used
      factors.push(`sufficientData:${dataPoints}:${enhancedAnalysis.minSampleSize}`);
    }
  }

  // Time window factor: compare against shortTermDays, label with defaultAnalysisDays if available
  if (typeof timeWindows?.shortTermDays === 'number') {
    const defaultDays =
      typeof timeWindows?.defaultAnalysisDays === 'number'
        ? timeWindows.defaultAnalysisDays
        : undefined;
    if (timeSpanDays < timeWindows.shortTermDays) {
      factors.push(
        defaultDays != null
          ? `shortTimespan:${timeSpanDays}:${defaultDays}`
          : `shortTimespan:${timeSpanDays}`,
      );
    } else {
      factors.push(
        defaultDays != null
          ? `adequateTimespan:${timeSpanDays}:${defaultDays}`
          : `adequateTimespan:${timeSpanDays}`,
      );
    }
  }

  // rSquared strength bands using configured significance thresholds (guard missing)
  const sig = enhancedAnalysis?.correlationSignificance;
  if (
    sig &&
    typeof sig.low === 'number' &&
    typeof sig.moderate === 'number' &&
    typeof sig.high === 'number'
  ) {
    if (rSquared < sig.low) {
      factors.push(`weakPattern:${rSquared.toFixed(3)}:low=${sig.low}`);
    } else if (rSquared >= sig.high) {
      factors.push(`strongPattern:${rSquared.toFixed(3)}:high=${sig.high}`);
    } else if (rSquared >= sig.moderate) {
      factors.push(`moderatePattern:${rSquared.toFixed(3)}:moderate=${sig.moderate}`);
    } else {
      factors.push(`lowPattern:${rSquared.toFixed(3)}:low=${sig.low}`);
    }
  } else {
    // Fallback to legacy correlationThreshold if available
    if (typeof patternAnalysis?.correlationThreshold === 'number') {
      const corrT = patternAnalysis.correlationThreshold;
      const strongCut = Math.max(0.7, corrT + 0.4);
      if (rSquared < corrT) {
        factors.push(`weakPattern:${rSquared.toFixed(3)}:ct=${corrT}`);
      } else if (rSquared > strongCut) {
        factors.push(`strongPattern:${rSquared.toFixed(3)}:ct=${corrT}`);
      } else {
        factors.push(`moderatePattern:ct=${corrT}`);
      }
    } else {
      // No threshold available; avoid bold claims
      factors.push('moderatePattern');
    }
  }

  // Determine overall level and explanation using insights.HIGH_CONFIDENCE_PATTERN_THRESHOLD
  if (typeof insights?.HIGH_CONFIDENCE_PATTERN_THRESHOLD === 'number') {
    const highT = insights.HIGH_CONFIDENCE_PATTERN_THRESHOLD;
    const medT = highT - 0.2;
    if (confidence >= highT) {
      level = 'high';
      // Prefer "excellentData" when rSquared exceeds strong band; else "reliableInsight"
      if (typeof patternAnalysis?.correlationThreshold === 'number') {
        const corrT = patternAnalysis.correlationThreshold;
        const strongCut = Math.max(0.7, corrT + 0.4);
        explanation = rSquared > strongCut ? 'excellentData' : 'reliableInsight';
      } else {
        explanation = 'reliableInsight';
      }
    } else if (confidence >= medT) {
      level = 'medium';
      explanation = 'emergingTrend';
    } else {
      level = 'low';
      explanation = 'needMoreData';
    }
  } else {
    // Missing threshold -> minimal/confidently safe output
    level = 'low';
    explanation = 'needMoreData';
  }

  return { level, explanation, factors };
}

/**
 * Determines severity level based on trend analysis
 *
 * @param trend - Trend analysis result
 * @returns Severity level (low, medium, high)
 */
export function getTrendSeverity(trend: TrendAnalysis): 'low' | 'medium' | 'high' {
  const cfg = analyticsConfig.getConfig();
  const bands = cfg.enhancedAnalysis.correlationSignificance;
  const highT = typeof bands?.high === 'number' ? bands.high : 0.7;
  const medT = typeof bands?.moderate === 'number' ? bands.moderate : 0.5;

  if (trend.direction === 'decreasing' && trend.significance >= highT) return 'high';
  if (trend.direction === 'decreasing' && trend.significance >= medT) return 'medium';
  return 'low';
}

/**
 * Generates recommendations based on emotion trend analysis
 *
 * @param trend - Emotion trend analysis
 * @returns Array of recommendation strings
 */
export function getEmotionTrendRecommendations(trend: TrendAnalysis): string[] {
  if (trend.direction === 'decreasing') {
    return [
      'Increase positive reinforcement strategies',
      'Review environmental factors that may be contributing to stress',
      'Consider additional sensory support tools',
      'Schedule more frequent check-ins',
    ];
  } else if (trend.direction === 'increasing') {
    return [
      'Continue current successful strategies',
      'Document what is working well',
      'Gradually introduce new challenges',
      'Share progress with student and family',
    ];
  }
  return [
    'Monitor for changes in patterns',
    'Maintain current support level',
    'Be prepared to adjust strategies as needed',
  ];
}

/**
 * Generates recommendations based on sensory trend analysis
 *
 * @param trend - Sensory trend analysis
 * @returns Array of recommendation strings
 */
export function getSensoryTrendRecommendations(trend: TrendAnalysis): string[] {
  if (trend.rate > 0) {
    // Increasing seeking
    return [
      'Provide more structured sensory breaks',
      'Introduce additional sensory tools',
      'Consider sensory diet adjustments',
      'Monitor for overstimulation',
    ];
  } else if (trend.rate < 0) {
    // Increasing avoiding
    return [
      'Reduce environmental stimuli',
      'Provide more quiet spaces',
      'Gradually reintroduce sensory experiences',
      'Focus on calming strategies',
    ];
  }
  return [
    'Maintain current sensory support level',
    'Continue monitoring sensory preferences',
    'Be responsive to daily variations',
  ];
}
