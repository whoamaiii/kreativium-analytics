import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import type { TabKey } from '@/types/analytics';
import type { PatternResult, CorrelationResult } from '@/lib/patternAnalysis';
import type { PredictiveInsight, AnomalyDetection } from '@/lib/enhancedPatternAnalysis';

export interface NavigationContext {
  // Pattern context
  patternId?: string;
  patternType?: string;

  // Anomaly context
  anomalyType?: string;
  anomalyMetric?: string;
  anomalyTimestamp?: string;

  // Insight context
  insightType?: 'risk' | 'opportunity' | 'trend';
  insightTimeframe?: string;

  // Correlation context
  correlationFactors?: string[];

  // Common context
  highlightMetric?: string;
  timeFilter?: { start?: string; end?: string };
  autoScroll?: boolean;
}

export interface AnalyticsNavigationOptions {
  onTabChange: (tab: TabKey) => void;
}

export interface AnalyticsNavigation {
  // Navigate to patterns tab with context
  navigateToPattern: (pattern?: PatternResult, context?: Partial<NavigationContext>) => void;

  // Navigate to patterns from anomaly
  navigateFromAnomaly: (anomaly: AnomalyDetection) => void;

  // Navigate to patterns from insight
  navigateFromInsight: (insight: PredictiveInsight) => void;

  // Navigate with correlation context
  navigateFromCorrelation: (correlation: CorrelationResult) => void;

  // Generic navigation with context
  navigateWithContext: (tab: TabKey, context: NavigationContext) => void;
}

/**
 * useAnalyticsNavigation
 *
 * Provides smart navigation between analytics tabs with context preservation.
 * Enables cross-panel navigation (anomaly → pattern, insight → deep dive, etc.)
 * with automatic URL state management and context passing.
 *
 * @example
 * ```tsx
 * const navigation = useAnalyticsNavigation({ onTabChange: setActiveTab });
 *
 * // Navigate to pattern from anomaly
 * navigation.navigateFromAnomaly(anomaly);
 *
 * // Navigate to pattern from insight
 * navigation.navigateFromInsight(insight);
 * ```
 */
export function useAnalyticsNavigation(options: AnalyticsNavigationOptions): AnalyticsNavigation {
  const { onTabChange } = options;

  /**
   * Write navigation context to URL params
   */
  const writeContextToUrl = useCallback((context: NavigationContext) => {
    try {
      const url = new URL(window.location.href);

      // Clear previous context
      url.searchParams.delete('patternId');
      url.searchParams.delete('patternType');
      url.searchParams.delete('anomalyType');
      url.searchParams.delete('anomalyMetric');
      url.searchParams.delete('insightType');
      url.searchParams.delete('highlightMetric');
      url.searchParams.delete('timeStart');
      url.searchParams.delete('timeEnd');

      // Write new context
      if (context.patternId) url.searchParams.set('patternId', context.patternId);
      if (context.patternType) url.searchParams.set('patternType', context.patternType);
      if (context.anomalyType) url.searchParams.set('anomalyType', context.anomalyType);
      if (context.anomalyMetric) url.searchParams.set('anomalyMetric', context.anomalyMetric);
      if (context.insightType) url.searchParams.set('insightType', context.insightType);
      if (context.highlightMetric) url.searchParams.set('highlightMetric', context.highlightMetric);
      if (context.timeFilter?.start) url.searchParams.set('timeStart', context.timeFilter.start);
      if (context.timeFilter?.end) url.searchParams.set('timeEnd', context.timeFilter.end);

      window.history.replaceState(window.history.state, '', url.toString());

      // Dispatch custom event for components to react to
      window.dispatchEvent(new CustomEvent('analytics:navigation', {
        detail: context
      }));

      logger.debug('[useAnalyticsNavigation] Context written to URL', context);
    } catch (error) {
      logger.error('[useAnalyticsNavigation] Failed to write context to URL', error);
    }
  }, []);

  /**
   * Navigate to patterns tab with optional pattern context
   */
  const navigateToPattern = useCallback((pattern?: PatternResult, context?: Partial<NavigationContext>) => {
    const navContext: NavigationContext = {
      ...context,
      patternId: pattern ? generatePatternId(pattern) : context?.patternId,
      patternType: pattern ? (pattern as any).pattern : context?.patternType,
      autoScroll: true,
    };

    writeContextToUrl(navContext);
    onTabChange('patterns');

    logger.info('[useAnalyticsNavigation] Navigating to pattern', { pattern, context: navContext });
  }, [onTabChange, writeContextToUrl]);

  /**
   * Navigate from anomaly to related pattern
   */
  const navigateFromAnomaly = useCallback((anomaly: AnomalyDetection) => {
    const context: NavigationContext = {
      anomalyType: anomaly.type,
      anomalyMetric: anomaly.metric,
      anomalyTimestamp: anomaly.timestamp,
      highlightMetric: anomaly.metric,
      // Set time window around anomaly
      timeFilter: {
        start: new Date(new Date(anomaly.timestamp).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date(new Date(anomaly.timestamp).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      autoScroll: true,
    };

    writeContextToUrl(context);
    onTabChange('patterns');

    logger.info('[useAnalyticsNavigation] Navigating from anomaly to patterns', { anomaly, context });
  }, [onTabChange, writeContextToUrl]);

  /**
   * Navigate from predictive insight to deep dive
   */
  const navigateFromInsight = useCallback((insight: PredictiveInsight) => {
    const context: NavigationContext = {
      insightType: insight.type,
      insightTimeframe: insight.timeframe,
      highlightMetric: insight.metric,
      autoScroll: true,
    };

    writeContextToUrl(context);
    onTabChange('patterns');

    logger.info('[useAnalyticsNavigation] Navigating from insight to patterns', { insight, context });
  }, [onTabChange, writeContextToUrl]);

  /**
   * Navigate from correlation to filtered view
   */
  const navigateFromCorrelation = useCallback((correlation: CorrelationResult) => {
    const context: NavigationContext = {
      correlationFactors: [correlation.factor1, correlation.factor2],
      highlightMetric: correlation.factor1,
      autoScroll: true,
    };

    writeContextToUrl(context);
    onTabChange('patterns');

    logger.info('[useAnalyticsNavigation] Navigating from correlation', { correlation, context });
  }, [onTabChange, writeContextToUrl]);

  /**
   * Generic navigation with full context control
   */
  const navigateWithContext = useCallback((tab: TabKey, context: NavigationContext) => {
    writeContextToUrl(context);
    onTabChange(tab);

    logger.info('[useAnalyticsNavigation] Navigating with context', { tab, context });
  }, [onTabChange, writeContextToUrl]);

  return {
    navigateToPattern,
    navigateFromAnomaly,
    navigateFromInsight,
    navigateFromCorrelation,
    navigateWithContext,
  };
}

/**
 * Generate a stable pattern ID from pattern result
 */
function generatePatternId(pattern: PatternResult): string {
  const patternText = (pattern as any).pattern || (pattern as any).name || 'pattern';
  return patternText.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/**
 * Read navigation context from URL
 */
export function readNavigationContext(): NavigationContext | null {
  try {
    const params = new URLSearchParams(window.location.search);

    const context: NavigationContext = {};

    const patternId = params.get('patternId');
    const patternType = params.get('patternType');
    const anomalyType = params.get('anomalyType');
    const anomalyMetric = params.get('anomalyMetric');
    const insightType = params.get('insightType') as 'risk' | 'opportunity' | 'trend' | null;
    const highlightMetric = params.get('highlightMetric');
    const timeStart = params.get('timeStart');
    const timeEnd = params.get('timeEnd');

    if (patternId) context.patternId = patternId;
    if (patternType) context.patternType = patternType;
    if (anomalyType) context.anomalyType = anomalyType;
    if (anomalyMetric) context.anomalyMetric = anomalyMetric;
    if (insightType) context.insightType = insightType;
    if (highlightMetric) context.highlightMetric = highlightMetric;
    if (timeStart || timeEnd) {
      context.timeFilter = {
        start: timeStart || undefined,
        end: timeEnd || undefined,
      };
    }

    return Object.keys(context).length > 0 ? context : null;
  } catch (error) {
    logger.error('[readNavigationContext] Failed to read context from URL', error);
    return null;
  }
}
