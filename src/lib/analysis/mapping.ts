import type { AnalyticsResults, InterventionResult } from '../../types/analytics';
import type { AiMetadata, AnalyticsResultsAI } from './analysisEngine';
import {
  ZAiReport,
  type AiReport,
  type AiPattern,
  type AiCorrelation,
  type AiAnomaly,
  type AiPredictiveInsight,
  type AiDataLineageItem,
  type AiIntervention,
} from './aiSchema';
import type { PatternResult, CorrelationResult } from '../patternAnalysis';
import type { PredictiveInsight, AnomalyDetection } from '../enhancedPatternAnalysis';

function toInsights(report: AiReport): string[] {
  const items: string[] = [];
  if (report.summary) items.push(report.summary);
  for (const k of report.keyFindings || []) items.push(k);
  for (const p of report.patterns || [])
    items.push(p.name + (p.description ? ': ' + p.description : ''));
  return Array.from(new Set(items.map((s) => s.trim()).filter(Boolean)));
}

function mapPatternsToPatternResults(patterns: AiPattern[]): PatternResult[] {
  return (patterns || []).map((p) => ({
    type: 'correlation' as const,
    pattern: p.name,
    confidence: p.strength || 0.5,
    frequency: p.evidence?.length || 0,
    description: p.description || p.name,
    recommendations: p.evidence?.map((e) => e.description) || [],
    dataPoints: p.evidence?.length || 0,
    timeframe: 'AI analysis',
  }));
}

function mapCorrelationsToResults(corrs: AiCorrelation[]): CorrelationResult[] {
  return (corrs || []).map((c) => ({
    factor1: c.variables[0],
    factor2: c.variables[1],
    correlation: c.coefficient,
    significance:
      c.pValue && c.pValue < 0.01
        ? ('high' as const)
        : c.pValue && c.pValue < 0.05
          ? ('moderate' as const)
          : ('low' as const),
    description: `${c.direction || 'linear'} correlation between ${c.variables[0]} and ${c.variables[1]}`,
    recommendations: c.confounders?.map((conf) => `Consider ${conf} as a confounding factor`) || [],
  }));
}

function mapAnomaliesToDetections(anoms: AiAnomaly[]): AnomalyDetection[] {
  return (anoms || []).map((a) => ({
    timestamp: a.at ? new Date(a.at) : new Date(),
    type: 'emotion' as const,
    severity: a.severity,
    description: a.description,
    deviationScore: a.severity === 'high' ? 3 : a.severity === 'medium' ? 2 : 1,
    recommendations: a.evidence?.map((e) => e.description) || [],
  }));
}

function mapPredictiveToInsights(items: AiPredictiveInsight[]): PredictiveInsight[] {
  return (items || []).map((i) => ({
    type: 'prediction' as const,
    title: i.outcome,
    description: `Predicted outcome: ${i.outcome} (${Math.round(i.probability * 100)}% probability)`,
    confidence: i.confidence?.overall || i.probability,
    timeframe: i.horizon || 'medium',
    prediction: {
      value: i.probability,
      trend:
        i.probability > 0.7
          ? ('increasing' as const)
          : i.probability < 0.3
            ? ('decreasing' as const)
            : ('stable' as const),
      accuracy: i.confidence?.overall || 0.5,
    },
    recommendations: i.drivers?.map((d) => `Focus on: ${d}`) || [],
    severity:
      i.probability > 0.8
        ? ('high' as const)
        : i.probability > 0.5
          ? ('medium' as const)
          : ('low' as const),
    source: 'hybrid' as const,
  }));
}

function mapInterventionsToResults(interventions: AiIntervention[] = []): InterventionResult[] {
  return (interventions || []).map((iv) => ({
    title: iv.title,
    description: iv.description,
    actions: Array.isArray(iv.actions) ? iv.actions : [],
    expectedImpact: iv.expectedImpact,
    timeHorizon: iv.timeHorizon,
    metrics: Array.isArray(iv.metrics) ? iv.metrics : [],
    confidence: iv.confidence
      ? { overall: iv.confidence.overall, calibration: iv.confidence.calibration }
      : undefined,
    sources: Array.isArray(iv.sources) ? iv.sources : [],
    udlCheckpoints: iv.udlCheckpoints ?? [],
    hlps: iv.hlps ?? [],
    tier: iv.tier,
    scope: iv.scope,
  }));
}

function buildAiMetadata(meta: Partial<AiMetadata> | undefined, report: AiReport): AiMetadata {
  return {
    provider: meta?.provider,
    model: meta?.model,
    usage: meta?.usage,
    createdAt: meta?.createdAt ?? new Date().toISOString(),
    latencyMs: meta?.latencyMs,
    dataLineage: ((meta?.dataLineage || []) as AiDataLineageItem[]).concat(
      (report.dataLineage || []) as AiDataLineageItem[],
    ),
    caveats: (meta?.caveats || []).concat(report.confidence?.caveats || []),
    confidence: {
      overall: report.confidence?.overall ?? meta?.confidence?.overall,
      calibration: report.confidence?.calibration ?? meta?.confidence?.calibration,
    },
  };
}

export function mapAiToAnalyticsResults(
  input: unknown,
  meta?: Partial<AiMetadata>,
): AnalyticsResultsAI {
  const parsed: AiReport = ZAiReport.parse(input);

  const base: AnalyticsResults = {
    insights: toInsights(parsed),
    patterns: mapPatternsToPatternResults(parsed.patterns),
    correlations: mapCorrelationsToResults(parsed.correlations),
    predictiveInsights: mapPredictiveToInsights(parsed.predictiveInsights || []),
    anomalies: mapAnomaliesToDetections(parsed.anomalies || []),
    suggestedInterventions: mapInterventionsToResults(parsed.suggestedInterventions || []),
  };

  return { ...base, ai: buildAiMetadata(meta, parsed) };
}

export function mergeHeuristicWithAi(
  heuristic: AnalyticsResults,
  ai: AnalyticsResultsAI,
  mode: 'prefer-ai' | 'merge' = 'merge',
): AnalyticsResultsAI {
  if (mode === 'prefer-ai') {
    return ai;
  }

  const merged: AnalyticsResultsAI = {
    ...heuristic,
    ...ai,
    insights: Array.from(new Set([...heuristic.insights, ...ai.insights])),
    ai: ai.ai,
  };

  return merged;
}
