import { useMemo, useCallback } from 'react';
import { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import { enhancedPatternAnalysis } from '@/lib/enhancedPatternAnalysis';
import { patternAnalysis } from '@/lib/patternAnalysis';
import { usePerformanceCache } from './usePerformanceCache';
import { createCacheKey } from '@/lib/analytics/cache-key';

export function useOptimizedInsights(
  emotions: EmotionEntry[],
  sensoryInputs: SensoryEntry[],
  trackingEntries: TrackingEntry[],
) {
  const cache = usePerformanceCache({
    maxSize: 50,
    ttl: 10 * 60 * 1000, // 10 minutes
    // Important: Disable stats to avoid triggering state updates on cache hits/misses,
    // which can cause dependent effects to re-run endlessly in consumers.
    enableStats: false,
  });

  // Build a deterministic cache key using centralized utility to avoid shadowed logic
  const dataCacheKey = useMemo(() => {
    const counts = {
      emotions: emotions?.length ?? 0,
      sensory: sensoryInputs?.length ?? 0,
      entries: trackingEntries?.length ?? 0,
    };
    const latest = {
      emotions:
        emotions && emotions.length
          ? new Date(
              Math.max(...emotions.map((e) => new Date(e.timestamp).getTime())),
            ).toISOString()
          : null,
      sensory:
        sensoryInputs && sensoryInputs.length
          ? new Date(
              Math.max(...sensoryInputs.map((s) => new Date(s.timestamp).getTime())),
            ).toISOString()
          : null,
      entries:
        trackingEntries && trackingEntries.length
          ? new Date(
              Math.max(...trackingEntries.map((t) => new Date(t.timestamp).getTime())),
            ).toISOString()
          : null,
    };
    return createCacheKey({
      namespace: 'insights-local',
      input: { counts, latest },
      normalizeArrayOrder: true,
    });
  }, [emotions, sensoryInputs, trackingEntries]);

  const getInsights = useCallback(async () => {
    const cacheKey = `insights_${dataCacheKey}`;

    // Try to get from cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Generate new insights
    const [basicInsights, predictiveInsights] = await Promise.all([
      Promise.resolve(patternAnalysis.analyzeEmotionPatterns(emotions)),
      Promise.resolve(
        enhancedPatternAnalysis.generatePredictiveInsights(
          emotions,
          sensoryInputs,
          trackingEntries,
          [], // goals would be passed here if available
        ),
      ),
    ]);

    const combinedInsights = {
      basic: basicInsights,
      predictive: predictiveInsights,
      generatedAt: new Date().toISOString(),
    };

    // Cache the results
    cache.set(cacheKey, combinedInsights);

    return combinedInsights;
  }, [dataCacheKey, cache, emotions, sensoryInputs, trackingEntries]);

  const getCorrelationMatrix = useCallback(() => {
    const cacheKey = `correlations_${dataCacheKey}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    if (trackingEntries.length < 10) {
      return null;
    }

    const correlations = enhancedPatternAnalysis.generateCorrelationMatrix(trackingEntries);
    cache.set(cacheKey, correlations);

    return correlations;
  }, [dataCacheKey, cache, trackingEntries]);

  const getAnomalies = useCallback(() => {
    const cacheKey = `anomalies_${dataCacheKey}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const anomalies = enhancedPatternAnalysis.detectAnomalies(
      emotions,
      sensoryInputs,
      trackingEntries,
    );

    cache.set(cacheKey, anomalies);
    return anomalies;
  }, [dataCacheKey, cache, emotions, sensoryInputs, trackingEntries]);

  const clearCache = useCallback(() => {
    cache.clear();
  }, [cache]);

  return {
    getInsights,
    getCorrelationMatrix,
    getAnomalies,
    clearCache,
    cacheStats: cache.stats,
  };
}
