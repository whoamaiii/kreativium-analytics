/**
 * Canonical insights and confidence logic
 *
 * This module is the single source of truth for:
 * - Confidence score calculation (calculateConfidence)
 * - Insights generation (generateInsights and worker adapter)
 *
 * Migration guidance
 * - analyticsManager.ts:
 *   Import { calculateConfidence, generateInsights } from '@/lib/insights'.
 *   If analyticsManager already fetched live config slices, pass them via the cfgParam
 *   arguments to avoid duplicate analyticsConfig.getConfig() calls.
 *
 * - analytics.worker.ts:
 *   Replace local insights computation with generateInsightsFromWorkerInputs.
 *   Prefer the canonical signature generateInsightsFromWorkerInputs(emotionPatterns,
 *   sensoryPatterns, correlations, { entries, emotions }). If existing code uses a
 *   different shape, map it to this canonical form, or use the legacy adapter signature
 *   temporarily.
 *
 * Future plan
 * - InsightOutput will migrate to StructuredInsight[] with i18n key mapping instead of
 *   free-form strings. Call sites should not rely on exact phrasing and should be ready
 *   to display localized messages based on keys.
 */
import { analyticsConfig, ANALYTICS_CONFIG } from '@/lib/analyticsConfig';
import { clamp01, round2, getLastTimestamp, isWithinDays } from '@/lib/utils';
import type { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import type { PatternResult, CorrelationResult } from '@/lib/patternAnalysis';
import type { InsightOutput, InsightConfig, ConfidenceConfig } from '@/types/insights';

/**
 * Resolve effective confidence config, preferring live config and allowing an override.
 * Kept local here to avoid cross-file private helper imports.
 */
function getEffectiveConfidenceConfig(cfgParam?: ConfidenceConfig): ConfidenceConfig {
  if (cfgParam) return cfgParam;
  try {
    return analyticsConfig.getConfig()?.confidence || ANALYTICS_CONFIG.confidence;
  } catch {
    return ANALYTICS_CONFIG.confidence;
  }
}

// Local helpers to mirror analytics configuration access
function getEffectiveInsightsConfig(cfgParam?: InsightConfig): InsightConfig {
  if (cfgParam) return cfgParam;
  try {
    return analyticsConfig.getConfig()?.insights || ANALYTICS_CONFIG.insights;
  } catch {
    return ANALYTICS_CONFIG.insights;
  }
}
function getEffectiveFullConfig() {
  try {
    return analyticsConfig.getConfig() || (ANALYTICS_CONFIG as unknown);
  } catch {
    return ANALYTICS_CONFIG as unknown;
  }
}

/**
 * calculateConfidence
 *
 * Purpose:
 * - Compute a normalized confidence score in [0, 1] using data sufficiency and recency.
 * - Mirrors analyticsManager behavior (weights plus optional recency boost with an
 *   effectively exclusive day window).
 *
 * Inputs:
 * - emotions: readonly EmotionEntry[] — emotion records.
 * - sensoryInputs: readonly SensoryEntry[] — sensory observations.
 * - trackingEntries: readonly TrackingEntry[] — session/entry records used for recency and sufficiency.
 * - cfgParam?: ConfidenceConfig — optional config slice to avoid extra config lookups.
 *
 * Returns:
 * - number — rounded to two decimals, clamped to [0, 1].
 *
 * Configuration resolution order:
 * 1) cfgParam if provided,
 * 2) analyticsConfig.getConfig(),
 * 3) ANALYTICS_CONFIG.
 *
 * Purity and non-mutation guarantees:
 * - This function is pure: no external side effects or global state writes.
 * - It does not mutate any of the input arrays or objects.
 */
export function calculateConfidence(
  emotions: readonly EmotionEntry[],
  sensoryInputs: readonly SensoryEntry[],
  trackingEntries: readonly TrackingEntry[],
  cfgParam?: ConfidenceConfig
): number {
  const cfg = getEffectiveConfidenceConfig(cfgParam);
  const TH = cfg.THRESHOLDS as any;
  const W = cfg.WEIGHTS as any;

  // Support both *_COUNT and *_ENTRIES keys defensively
  const emotionThreshold: number = TH.EMOTION_COUNT ?? TH.EMOTION_ENTRIES ?? 1;
  const sensoryThreshold: number = TH.SENSORY_COUNT ?? TH.SENSORY_ENTRIES ?? 1;
  const trackingThreshold: number = TH.TRACKING_COUNT ?? TH.TRACKING_ENTRIES ?? 1;

  const wEmotion: number = W.EMOTIONS ?? W.EMOTION ?? 0;
  const wSensory: number = W.SENSORY ?? 0;
  const wTracking: number = W.TRACKING ?? 0;
  const recencyBoostVal: number = W.RECENCY_BOOST ?? 0;

  const e = Math.min(emotions.length / Math.max(1, emotionThreshold), 1) * wEmotion;
  const s = Math.min(sensoryInputs.length / Math.max(1, sensoryThreshold), 1) * wSensory;
  const t = Math.min(trackingEntries.length / Math.max(1, trackingThreshold), 1) * wTracking;

  // Recency boost: strictly less than N days since last entry (exclusive boundary)
  const lastTs = getLastTimestamp(trackingEntries);
  const daysWindow: number = TH.DAYS_SINCE_LAST_ENTRY ?? 0;
  const hasRecencyBoost = (() => {
    if (lastTs == null || !Number.isFinite(daysWindow) || daysWindow <= 0) return false;
    const nowTs = Date.now();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const diff = nowTs - lastTs;
    if (diff < 0) return false;
    // Use integer day difference to avoid DST/partial-day rounding issues
    const dayDiff = Math.floor(diff / MS_PER_DAY);
    return dayDiff < daysWindow; // strictly less than N days
  })();

  const total = clamp01(e + s + t + (hasRecencyBoost ? recencyBoostVal : 0));
  return round2(total);
}

/**
 * generateInsights (overloaded)
 *
 * Purpose:
 * - Produce human-readable insights from pattern/correlation analysis and recent data.
 * - This is the canonical insights generator used by both the main thread and the worker.
 *
 * Signatures:
 * - New/canonical signature:
 *   generateInsights(results, emotions, trackingEntries, cfgParam?)
 *   where results = { patterns, correlations, predictiveInsights }
 *
 * - Legacy signature (backward compatibility):
 *   generateInsights(emotions, sensoryInputs, trackingEntries, patterns, correlations, config?)
 *
 * Inputs:
 * - For canonical: results, emotions, trackingEntries, cfgParam?
 * - For legacy: emotions, sensoryInputs, trackingEntries, patterns, correlations, config?
 *
 * Returns:
 * - InsightOutput — currently string[]; will migrate to StructuredInsight[].
 *
 * Configuration resolution order:
 * 1) cfgParam/config if provided,
 * 2) analyticsConfig.getConfig(),
 * 3) ANALYTICS_CONFIG.
 *
 * Purity and non-mutation guarantees:
 * - Pure and side-effect free; builds a new insights array without mutating inputs.
 * - Defensive .slice() copies are used in legacy paths to avoid accidental mutation.
 */
export function generateInsights(
  results: {
    patterns: PatternResult[];
    correlations: CorrelationResult[];
    predictiveInsights: Array<{ description: string; confidence: number }>;
  },
  emotions: readonly EmotionEntry[],
  trackingEntries: readonly TrackingEntry[],
  cfgParam?: InsightConfig
): InsightOutput;
export function generateInsights(
  emotions: ReadonlyArray<EmotionEntry>,
  sensoryInputs: ReadonlyArray<SensoryEntry>,
  trackingEntries: ReadonlyArray<TrackingEntry>,
  patterns: ReadonlyArray<PatternResult>,
  correlations: ReadonlyArray<CorrelationResult>,
  config?: InsightConfig
): InsightOutput;

export type StructuredInsight = { key: string; params?: Record<string, unknown> };

export function generateInsightsStructured(
  results: {
    patterns: PatternResult[];
    correlations: CorrelationResult[];
    predictiveInsights: Array<{ description: string; confidence: number }>;
  },
  emotions: readonly EmotionEntry[],
  trackingEntries: readonly TrackingEntry[],
  cfgParam?: InsightConfig
): StructuredInsight[] {
  const cfg = getEffectiveInsightsConfig(cfgParam);
  const messages: StructuredInsight[] = [];

  if (trackingEntries.length === 0) {
    return [{ key: 'analytics.insights.messages.noTrackingData' }];
  }

  if (trackingEntries.length < cfg.MIN_SESSIONS_FOR_FULL_ANALYTICS) {
    messages.push({ key: 'analytics.insights.messages.limitedData', params: { sessions: trackingEntries.length } });
  }

  results.patterns
    .filter(p => p.confidence > cfg.HIGH_CONFIDENCE_PATTERN_THRESHOLD)
    .slice(0, cfg.MAX_PATTERNS_TO_SHOW)
    .forEach(pattern => messages.push({
      key: 'analytics.insights.messages.patternDetected',
      params: { description: pattern.description, confidencePct: Math.round(pattern.confidence * 100) }
    }));

  results.correlations
    .filter(c => (c as any).significance === 'high')
    .slice(0, cfg.MAX_CORRELATIONS_TO_SHOW)
    .forEach(correlation => messages.push({ key: 'analytics.insights.messages.strongCorrelation', params: { description: correlation.description } }));

  results.predictiveInsights
    .slice(0, cfg.MAX_PREDICTIONS_TO_SHOW)
    .forEach(pi => messages.push({ key: 'analytics.insights.messages.prediction', params: { description: pi.description, confidencePct: Math.round(pi.confidence * 100) } }));

  if (emotions.length >= cfg.RECENT_EMOTION_COUNT) {
    const recent = emotions.slice(-cfg.RECENT_EMOTION_COUNT);
    // POSITIVE_EMOTIONS may be a Set<string>
    const fullCfg = getEffectiveFullConfig() as typeof ANALYTICS_CONFIG;
    const positiveSet: Set<string> = (fullCfg.POSITIVE_EMOTIONS ?? ANALYTICS_CONFIG.POSITIVE_EMOTIONS) as Set<string>;
    const positives = recent.filter(e => positiveSet.has(e.emotion.toLowerCase())).length;
    const positiveRate = positives / recent.length;
    const pct = Math.round(positiveRate * 100);
    if (positiveRate > cfg.POSITIVE_EMOTION_TREND_THRESHOLD) {
      messages.push({ key: 'analytics.insights.messages.positiveTrend', params: { percentage: pct } });
    } else if (positiveRate < cfg.NEGATIVE_EMOTION_TREND_THRESHOLD) {
      messages.push({ key: 'analytics.insights.messages.negativeTrend', params: { percentage: pct } });
    }
  }

  if (messages.length === 0) {
    messages.push({ key: 'analytics.insights.messages.analyticsActive' });
  }

  return messages;
}

type InsightTemplate = (params?: Record<string, unknown>) => string;

const INSIGHT_MESSAGE_TEMPLATES: Record<string, InsightTemplate> = {
  'analytics.insights.messages.noTrackingData': () =>
    'No tracking data available yet. Start by creating your first tracking session to begin pattern analysis.',
  'analytics.insights.messages.limitedData': (params) => {
    const sessions = typeof params?.sessions === 'number' ? params.sessions : 0;
    return `Limited data available (${sessions} sessions). Analytics will improve as more data is collected.`;
  },
  'analytics.insights.messages.patternDetected': (params) => {
    const description = String(params?.description ?? '');
    const confidencePct = typeof params?.confidencePct === 'number' ? params.confidencePct : 0;
    return `Pattern detected: ${description} (${confidencePct}% confidence)`;
  },
  'analytics.insights.messages.strongCorrelation': (params) => {
    const description = String(params?.description ?? '');
    return `Strong correlation found: ${description}`;
  },
  'analytics.insights.messages.prediction': (params) => {
    const description = String(params?.description ?? '');
    const confidencePct = typeof params?.confidencePct === 'number' ? params.confidencePct : 0;
    return `Prediction: ${description} (${confidencePct}% confidence)`;
  },
  'analytics.insights.messages.positiveTrend': (params) => {
    const percentage = typeof params?.percentage === 'number' ? params.percentage : 0;
    return `Positive trend: ${percentage}% of recent emotions have been positive.`;
  },
  'analytics.insights.messages.negativeTrend': (params) => {
    const percentage = typeof params?.percentage === 'number' ? params.percentage : 0;
    return `Consider reviewing strategies - only ${percentage}% of recent emotions have been positive.`;
  },
  'analytics.insights.messages.analyticsActive': () =>
    'Analytics are active and monitoring patterns. Continue collecting data for more detailed insights.',
};

function renderStructuredInsight(insight: StructuredInsight): string {
  const template = INSIGHT_MESSAGE_TEMPLATES[insight.key];
  if (!template) {
    return insight.key;
  }
  return template(insight.params);
}

export function generateInsights(...args: any[]): InsightOutput {
  // Branch 1: New signature with results object first
  if (args.length >= 3 && args[0] && typeof args[0] === 'object' && 'patterns' in args[0]) {
    const results = args[0] as { patterns: PatternResult[]; correlations: CorrelationResult[]; predictiveInsights: Array<{ description: string; confidence: number }>; };
    const emotions = args[1] as readonly EmotionEntry[];
    const trackingEntries = args[2] as readonly TrackingEntry[];
    const cfg = getEffectiveInsightsConfig(args[3] as InsightConfig | undefined);
    const structured = generateInsightsStructured(results, emotions, trackingEntries, cfg);
    return structured.map(renderStructuredInsight);
  }

  // Branch 2: Legacy signature implementation (preserve existing behavior)
  const emotions = args[0] as ReadonlyArray<EmotionEntry>;
  const sensoryInputs = args[1] as ReadonlyArray<SensoryEntry>;
  const trackingEntries = args[2] as ReadonlyArray<TrackingEntry>;
  const patterns = args[3] as ReadonlyArray<PatternResult>;
  const correlations = args[4] as ReadonlyArray<CorrelationResult>;
  const cfg = (args[5] as InsightConfig | undefined) ?? analyticsConfig.getConfig().insights;

  const insights: string[] = [];

  // Data sufficiency
  if (trackingEntries.length < cfg.MIN_SESSIONS_FOR_FULL_ANALYTICS) {
    insights.push(`Limited data available (${trackingEntries.length} sessions). Continue collecting data for better insights.`);
  }

  // Highlight high-confidence patterns
  const significantPatterns = patterns
    .filter(p => p.confidence >= cfg.HIGH_CONFIDENCE_PATTERN_THRESHOLD)
    .slice(0, cfg.MAX_PATTERNS_TO_SHOW);

  significantPatterns.forEach(p => {
    const pct = Math.round(p.confidence * 100);
    insights.push(`Pattern detected (${(p as any).type}): ${(p as any).pattern} (${pct}% confidence). ${p.description}`);
  });

  // Summarize strongest correlations
  const strongCorrelations = correlations
    .slice()
    .sort((a: any, b: any) => Math.abs((b.correlation as number) - (a.correlation as number)))
    .slice(0, cfg.MAX_CORRELATIONS_TO_SHOW);

  strongCorrelations.forEach((c: any) => {
    insights.push(
      `Correlation: ${c.factor1} <-> ${c.factor2} (r=${typeof c.correlation === 'number' ? c.correlation.toFixed(2) : '0.00'}, ${c.significance}). ${c.description}`
    );
  });

  // Simple recent emotion perspective
  if (emotions.length > 0) {
    const recent = emotions.slice(-Math.max(1, cfg.RECENT_EMOTION_COUNT));
    const top = getTopCategory(recent.map(e => e.emotion.toLowerCase()));
    if (top) {
      insights.push(`Recent emotions most frequently observed: ${top.key} (${top.count} of last ${recent.length}).`);
    }
  }

  // Sensory snapshot
  if (sensoryInputs.length > 0) {
    const recentSensory = sensoryInputs.slice(-Math.max(1, Math.min(10, sensoryInputs.length)));
    const seeking = recentSensory.filter(s => s.response.toLowerCase().includes('seeking')).length;
    const avoiding = recentSensory.filter(s => s.response.toLowerCase().includes('avoiding')).length;
    if (seeking > avoiding && seeking > 0) {
      insights.push('Recent sensory pattern leans toward seeking behavior. Consider structured sensory breaks.');
    } else if (avoiding > seeking && avoiding > 0) {
      insights.push('Recent sensory pattern shows avoidance. Provide access to low-stimulation spaces.');
    }
  }

  // Ensure bounded size
  return insights.slice(0, Math.max(cfg.MAX_PATTERNS_TO_SHOW, cfg.MAX_CORRELATIONS_TO_SHOW, cfg.MAX_PREDICTIONS_TO_SHOW, 5));
}

/**
 * generateInsightsFromWorkerInputs (overloaded)
 *
 * Purpose:
 * - Worker-friendly adapter that funnels inputs into the canonical generateInsights API.
 * - Provides both the recommended canonical signature and a legacy object-based signature
 *   to ease migration inside analytics.worker.ts.
 *
 * Canonical signature (recommended):
 *   generateInsightsFromWorkerInputs(emotionPatterns, sensoryPatterns, correlations, { entries, emotions })
 *   - Non-mutating composition of patterns: [...emotionPatterns, ...sensoryPatterns]
 *   - Calls generateInsights(results, emotions, entries)
 *
 * Legacy signature:
 *   generateInsightsFromWorkerInputs({ patterns?, correlations?, emotions?, sensoryInputs?, trackingEntries? }, { insightConfig? })
 *   - Preserves existing worker behavior; will be removed after migration.
 *
 * Returns:
 * - InsightOutput — currently string[].
 *
 * Configuration resolution order:
 * - Same as generateInsights. If overrides.insightConfig is provided, it takes precedence.
 *
 * Purity and non-mutation guarantees:
 * - Pure function: does not mutate provided arrays/objects and has no side effects.
 */
export function generateInsightsFromWorkerInputs(
  emotionPatterns: PatternResult[],
  sensoryPatterns: PatternResult[],
  correlations: CorrelationResult[],
  data: { entries: TrackingEntry[]; emotions: EmotionEntry[] }
): InsightOutput;
export function generateInsightsFromWorkerInputs(
  input: {
    patterns?: ReadonlyArray<PatternResult>;
    correlations?: ReadonlyArray<CorrelationResult>;
    emotions?: ReadonlyArray<EmotionEntry>;
    sensoryInputs?: ReadonlyArray<SensoryEntry>;
    trackingEntries?: ReadonlyArray<TrackingEntry>;
  },
  overrides?: { insightConfig?: InsightConfig }
): InsightOutput;
export function generateInsightsFromWorkerInputs(
  ...args: [PatternResult[], PatternResult[], CorrelationResult[], { entries: TrackingEntry[]; emotions: EmotionEntry[] }] | [
    {
      patterns?: ReadonlyArray<PatternResult>;
      correlations?: ReadonlyArray<CorrelationResult>;
      emotions?: ReadonlyArray<EmotionEntry>;
      sensoryInputs?: ReadonlyArray<SensoryEntry>;
      trackingEntries?: ReadonlyArray<TrackingEntry>;
    },
    { insightConfig?: InsightConfig }?
  ]
): InsightOutput {
  // Branch A: Canonical signature with separate emotion/sensory pattern arrays
  if (Array.isArray(args[0])) {
    const emotionPatterns = (args[0] as PatternResult[]) ?? [];
    const sensoryPatterns = (args[1] as PatternResult[]) ?? [];
    const correlations = (args[2] as CorrelationResult[]) ?? [];
    const data = args[3] as { entries: TrackingEntry[]; emotions: EmotionEntry[] };

    // Non-mutating composition
    const patterns: PatternResult[] = [...emotionPatterns, ...sensoryPatterns];

    const results = { patterns, correlations, predictiveInsights: [] as Array<{ description: string; confidence: number }> };
    return generateInsights(results, data.emotions, data.entries);
  }

  // Branch B: Legacy object-based signature
  const input = args[0] as {
    patterns?: ReadonlyArray<PatternResult>;
    correlations?: ReadonlyArray<CorrelationResult>;
    emotions?: ReadonlyArray<EmotionEntry>;
    sensoryInputs?: ReadonlyArray<SensoryEntry>;
    trackingEntries?: ReadonlyArray<TrackingEntry>;
  };
  const overrides = (args[1] as { insightConfig?: InsightConfig } | undefined) ?? undefined;

  const patterns = (input.patterns ?? []).slice();
  const legacyCorrelations = (input.correlations ?? []).slice();
  const emotions = (input.emotions ?? []).slice();
  // sensoryInputs are accepted in legacy input but are not required by canonical insights path
  const trackingEntries = (input.trackingEntries ?? []).slice();

  return generateInsights(
    { patterns: patterns as PatternResult[], correlations: legacyCorrelations as CorrelationResult[], predictiveInsights: [] },
    emotions,
    trackingEntries,
    overrides?.insightConfig
  );
}

// Internal helper (pure)
function getTopCategory(values: ReadonlyArray<string>): { key: string; count: number } | null {
  if (values.length === 0) return null;
  const counts = values.reduce<Record<string, number>>((acc, key) => {
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  let bestKey = '';
  let bestCount = 0;
  for (const [k, c] of Object.entries(counts)) {
    if (c > bestCount) {
      bestKey = k;
      bestCount = c;
    }
  }
  return bestKey ? { key: bestKey, count: bestCount } : null;
}
