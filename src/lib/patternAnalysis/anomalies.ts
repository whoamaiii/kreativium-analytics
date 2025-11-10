/**
 * Module: patternAnalysis/anomalies
 *
 * Purpose:
 * - Anomaly detection using robust statistical methods (MAD-based z-scores)
 * - Severity classification and recommendation generation
 */

import { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import { analyticsConfig } from '@/lib/analyticsConfig';
import { zScoresMedian } from '@/lib/statistics';
import { groupSensoryByDay } from './utils';

export interface AnomalyDetection {
  timestamp: Date;
  type: 'emotion' | 'sensory' | 'environmental';
  severity: 'low' | 'medium' | 'high';
  description: string;
  deviationScore: number;
  recommendations: string[];
}

/**
 * Detects anomalies in emotional and sensory data using statistical methods
 * Uses MAD-based z-scores for robust outlier detection
 *
 * @param emotions - Array of emotion entries
 * @param sensoryInputs - Array of sensory entries
 * @param trackingEntries - Array of tracking entries
 * @returns Array of detected anomalies sorted by timestamp (most recent first)
 */
export function detectAnomalies(
  emotions: EmotionEntry[],
  sensoryInputs: SensoryEntry[],
  trackingEntries: TrackingEntry[],
): AnomalyDetection[] {
  const cfg = analyticsConfig.getConfig();
  const { enhancedAnalysis, alertSensitivity } = cfg;

  const anomalies: AnomalyDetection[] = [];

  // Emotion intensity anomalies
  const emotionIntensities = emotions.map((e) => e.intensity);

  // Apply anomaly sensitivity multiplier (base threshold)
  const anomalyThreshold = enhancedAnalysis.anomalyThreshold * alertSensitivity.anomalyMultiplier;
  const severityLevels = enhancedAnalysis.anomalySeverityLevels || { medium: 2.5, high: 3.0 };

  const zEmotion = zScoresMedian(emotionIntensities);

  emotions.forEach((emotion, idx) => {
    const zScore = Math.abs(zEmotion[idx] ?? 0);
    if (zScore > anomalyThreshold) {
      const severity: 'low' | 'medium' | 'high' =
        zScore >= severityLevels.high ? 'high' : zScore >= severityLevels.medium ? 'medium' : 'low';
      anomalies.push({
        timestamp: emotion.timestamp,
        type: 'emotion',
        severity,
        description: `Unusual ${emotion.emotion} intensity detected (${emotion.intensity}/5)`,
        deviationScore: zScore,
        recommendations: getAnomalyRecommendations('emotion', emotion.emotion, zScore),
      });
    }
  });

  // Sensory frequency anomalies
  const dailySensoryCounts = groupSensoryByDay(sensoryInputs);
  const counts = Object.values(dailySensoryCounts);
  if (counts.length > 0) {
    const zCounts = zScoresMedian(counts);
    const dates = Object.keys(dailySensoryCounts);

    dates.forEach((date, idx) => {
      const count = dailySensoryCounts[date];
      const zScore = Math.abs(zCounts[idx] ?? 0);
      if (zScore > anomalyThreshold) {
        const severity: 'low' | 'medium' | 'high' =
          zScore >= severityLevels.high
            ? 'high'
            : zScore >= severityLevels.medium
              ? 'medium'
              : 'low';
        anomalies.push({
          timestamp: new Date(date),
          type: 'sensory',
          severity,
          description: `Unusual sensory activity level detected (${count} inputs)`,
          deviationScore: zScore,
          recommendations: getAnomalyRecommendations('sensory', 'frequency', zScore),
        });
      }
    });
  }

  return anomalies.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Generates context-specific recommendations for detected anomalies
 *
 * @param type - Type of anomaly (emotion or sensory)
 * @param context - Additional context (emotion name, frequency, etc.)
 * @param severity - Severity score of the anomaly
 * @returns Array of recommendation strings
 */
export function getAnomalyRecommendations(
  type: string,
  context: string,
  severity: number,
): string[] {
  if (type === 'emotion') {
    return [
      'Investigate potential triggers for this emotional spike',
      'Provide immediate support and coping strategies',
      'Monitor closely for additional unusual patterns',
      'Consider environmental or schedule changes',
    ];
  } else if (type === 'sensory') {
    return [
      'Review sensory environment for unusual factors',
      'Check for changes in routine or schedule',
      'Provide additional sensory regulation support',
      'Monitor for illness or other physical factors',
    ];
  }
  return [
    'Investigate potential causes',
    'Provide additional support',
    'Monitor closely',
    'Document and track patterns',
  ];
}
