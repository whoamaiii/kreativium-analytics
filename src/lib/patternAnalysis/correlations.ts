/**
 * Module: patternAnalysis/correlations
 *
 * Purpose:
 * - Correlation matrix generation and analysis
 * - Identification of significant factor relationships
 */

import { TrackingEntry } from '@/types/student';
import { analyticsConfig } from '@/lib/analyticsConfig';
import { pearsonCorrelation, pValueForCorrelation } from '@/lib/statistics';
import { convertLightingToNumeric } from './utils';

export interface CorrelationMatrix {
  factors: string[];
  matrix: number[][];
  significantPairs: Array<{
    factor1: string;
    factor2: string;
    correlation: number;
    pValue: number;
    significance: 'low' | 'moderate' | 'high';
  }>;
}

/**
 * Generates comprehensive correlation matrix for multiple factors
 * Analyzes relationships between emotional, sensory, and environmental variables
 *
 * @param trackingEntries - Array of tracking entries with complete data
 * @returns Correlation matrix with significant pairs identified
 */
export function generateCorrelationMatrix(trackingEntries: TrackingEntry[]): CorrelationMatrix {
  const cfg = analyticsConfig.getConfig();
  const { enhancedAnalysis, patternAnalysis, taxonomy } = cfg;

  const factors = [
    'avgEmotionIntensity',
    'positiveEmotionRatio',
    'sensorySeekingRatio',
    'noiseLevel',
    'temperature',
    'lightingQuality',
  ];

  // Build positive emotion lookup from taxonomy (case-insensitive)
  const positiveSet = new Set((taxonomy?.positiveEmotions || []).map((e) => e.toLowerCase()));

  const dataPoints = trackingEntries.map((entry) => ({
    avgEmotionIntensity:
      entry.emotions.length > 0
        ? entry.emotions.reduce((sum, e) => sum + e.intensity, 0) / entry.emotions.length
        : 0,
    positiveEmotionRatio:
      entry.emotions.length > 0
        ? entry.emotions.filter((e) => positiveSet.has(e.emotion.toLowerCase())).length /
          entry.emotions.length
        : 0,
    sensorySeekingRatio:
      entry.sensoryInputs.length > 0
        ? entry.sensoryInputs.filter((s) => s.response.toLowerCase().includes('seeking')).length /
          entry.sensoryInputs.length
        : 0,
    noiseLevel: entry.environmentalData?.roomConditions?.noiseLevel || 0,
    temperature: entry.environmentalData?.roomConditions?.temperature || 0,
    lightingQuality: convertLightingToNumeric(entry.environmentalData?.roomConditions?.lighting),
  }));

  const matrix: number[][] = [];
  const significantPairs: CorrelationMatrix['significantPairs'] = [];

  // Significance thresholds from config with safe fallbacks
  const sig = enhancedAnalysis?.correlationSignificance;
  const baseThreshold = Math.max(
    0,
    Math.min(1, sig?.low ?? patternAnalysis.correlationThreshold ?? 0.3),
  );
  const moderateCut = Math.max(baseThreshold, Math.min(1, sig?.moderate ?? baseThreshold + 0.2));
  const highCut = Math.max(moderateCut, Math.min(1, sig?.high ?? baseThreshold + 0.4));

  factors.forEach((factor1, i) => {
    matrix[i] = [];
    factors.forEach((factor2, j) => {
      // Build paired arrays guarding index alignment and validity
      const x: number[] = [];
      const y: number[] = [];
      for (let k = 0; k < dataPoints.length; k++) {
        const dv = dataPoints[k] as any;
        const v1 = dv[factor1];
        const v2 = dv[factor2];
        if (
          typeof v1 === 'number' &&
          Number.isFinite(v1) &&
          typeof v2 === 'number' &&
          Number.isFinite(v2)
        ) {
          x.push(v1);
          y.push(v2);
        }
      }

      const nPairs = x.length;
      const correlation = pearsonCorrelation(x, y);
      matrix[i][j] = correlation;

      // Significance gate uses |r| >= baseThreshold and minimum sample size from enhancedAnalysis
      if (
        i < j &&
        Math.abs(correlation) >= baseThreshold &&
        nPairs >= enhancedAnalysis.minSampleSize
      ) {
        const pValue = pValueForCorrelation(correlation, nPairs);
        const absR = Math.abs(correlation);
        const significance: 'low' | 'moderate' | 'high' =
          absR >= highCut ? 'high' : absR >= moderateCut ? 'moderate' : 'low';

        significantPairs.push({
          factor1,
          factor2,
          correlation,
          pValue,
          significance,
        });
      }
    });
  });

  return {
    factors,
    matrix,
    significantPairs: significantPairs.sort(
      (a, b) => Math.abs(b.correlation) - Math.abs(a.correlation),
    ),
  };
}
