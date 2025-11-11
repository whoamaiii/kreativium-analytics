import { useState, useEffect } from 'react';
import { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import {
  enhancedPatternAnalysis,
  CorrelationMatrix,
  PredictiveInsight,
  AnomalyDetection,
} from '@/lib/enhancedPatternAnalysis';
import { patternAnalysis, PatternResult } from '@/lib/patternAnalysis';
import { logger } from '@/lib/logger';

interface FilteredData {
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  trackingEntries: TrackingEntry[];
}

export const useDataAnalysis = (filteredData: FilteredData) => {
  const [correlationMatrix, setCorrelationMatrix] = useState<CorrelationMatrix | null>(null);
  const [patterns, setPatterns] = useState<PatternResult[]>([]);
  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsight[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyDetection[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const analyzePatterns = async () => {
      if (filteredData.emotions.length === 0 && filteredData.sensoryInputs.length === 0) return;

      setIsAnalyzing(true);

      try {
        // Basic pattern analysis
        const emotionPatterns = patternAnalysis.analyzeEmotionPatterns(filteredData.emotions);
        const sensoryPatterns = patternAnalysis.analyzeSensoryPatterns(filteredData.sensoryInputs);
        const allPatterns = [...emotionPatterns, ...sensoryPatterns];
        setPatterns(allPatterns);

        // Enhanced pattern analysis
        if (filteredData.trackingEntries.length >= 5) {
          const insights = await enhancedPatternAnalysis.generatePredictiveInsights(
            filteredData.emotions,
            filteredData.sensoryInputs,
            filteredData.trackingEntries,
            [],
          );
          setPredictiveInsights(insights);

          const detectedAnomalies = enhancedPatternAnalysis.detectAnomalies(
            filteredData.emotions,
            filteredData.sensoryInputs,
            filteredData.trackingEntries,
          );
          setAnomalies(detectedAnomalies);
        }

        // Generate correlation matrix
        if (filteredData.trackingEntries.length >= 10) {
          const matrix = enhancedPatternAnalysis.generateCorrelationMatrix(
            filteredData.trackingEntries,
          );
          setCorrelationMatrix(matrix);
        }
      } catch (error) {
        logger.error('Pattern analysis failed in useDataAnalysis hook', { error });
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyzePatterns();
  }, [filteredData]);

  return {
    correlationMatrix,
    patterns,
    predictiveInsights,
    anomalies,
    isAnalyzing,
  };
};
