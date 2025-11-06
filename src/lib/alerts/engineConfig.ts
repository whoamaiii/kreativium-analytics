import AlertDetectionEngine from '@/lib/alerts/engine';

export type EngineTuningPresetName = 'default' | 'high_sensitivity' | 'stable_baseline' | 'low_resource';

export interface EngineConfigOptions {
  seriesLimit?: number;
  cusum?: { kFactor?: number; decisionInterval?: number };
  detectorThresholds?: Partial<Record<string, number>>;
}

export type EngineTuningProfile = EngineConfigOptions;

export function recommendDetectorSelection(params: { dataPoints: number; hasTracking: boolean; hasSensory: boolean }): string[] {
  const detectors: string[] = [];
  detectors.push('ewma', 'cusum');
  if (params.hasSensory) detectors.push('beta');
  if (params.hasTracking) detectors.push('association', 'burst');
  return detectors;
}

export function recommendConfigPreset(preset: EngineTuningPresetName): EngineTuningProfile {
  switch (preset) {
    case 'high_sensitivity':
      return { seriesLimit: 120, cusum: { kFactor: 0.45, decisionInterval: 4.5 } };
    case 'stable_baseline':
      return { seriesLimit: 90, cusum: { kFactor: 0.55, decisionInterval: 5.5 } };
    case 'low_resource':
      return { seriesLimit: 60, cusum: { kFactor: 0.5, decisionInterval: 5 } };
    case 'default':
    default:
      return { seriesLimit: 90, cusum: { kFactor: 0.5, decisionInterval: 5 } };
  }
}

export function createEngineFromConfig(config?: EngineConfigOptions): AlertDetectionEngine {
  return new AlertDetectionEngine({
    seriesLimit: config?.seriesLimit,
    cusumConfig: config?.cusum ? { kFactor: config.cusum.kFactor ?? 0.5, decisionInterval: config.cusum.decisionInterval ?? 5 } : undefined,
  });
}

import type { StudentBaseline } from '@/lib/alerts/baseline';
import type { AlertKind } from '@/lib/alerts/types';

export type DetectorConfigRecommendation = {
  detectorTypes: string[];
  reason?: string;
};

export type ScoringWeights = {
  impact: number;
  confidence: number;
  recency: number;
  tier: number;
};

export type EngineTuningPreset = {
  label: string;
  scoring: ScoringWeights;
  thresholds?: Partial<Record<string, number>>;
};

export function recommendDetectorsFor(kind: AlertKind, baseline?: StudentBaseline | null): DetectorConfigRecommendation {
  switch (kind) {
    case 'behavior_spike' as AlertKind:
      return { detectorTypes: ['ewma', 'cusum', 'burst', 'beta'], reason: 'Behavior spikes benefit from trend, shift, burst, and rate checks.' };
    case 'context_association' as AlertKind:
      return { detectorTypes: ['association'], reason: 'Context relationships are validated via association tests.' };
    case 'intervention_due' as AlertKind:
      return { detectorTypes: ['tauU'], reason: 'Intervention outcomes use Tau-U phase analysis.' };
    default:
      return { detectorTypes: ['ewma', 'cusum'], reason: 'Default trend/shift detectors for general signals.' };
  }
}

export function getPresetForPopulation(population: 'elementary' | 'middle' | 'high' | 'special_needs'): EngineTuningPreset {
  if (population === 'special_needs') {
    return {
      label: 'Special Needs (higher sensitivity)',
      scoring: { impact: 0.35, confidence: 0.25, recency: 0.25, tier: 0.15 },
      thresholds: { ewma: 0.55, cusum: 0.5, beta: 0.48, burst: 0.55 },
    };
  }
  if (population === 'elementary') {
    return {
      label: 'Elementary',
      scoring: { impact: 0.4, confidence: 0.25, recency: 0.2, tier: 0.15 },
      thresholds: { ewma: 0.6, cusum: 0.55, beta: 0.5, association: 0.5, burst: 0.6 },
    };
  }
  if (population === 'middle') {
    return {
      label: 'Middle School',
      scoring: { impact: 0.38, confidence: 0.27, recency: 0.2, tier: 0.15 },
      thresholds: { ewma: 0.62, cusum: 0.56 },
    };
  }
  return {
    label: 'High School',
    scoring: { impact: 0.42, confidence: 0.25, recency: 0.18, tier: 0.15 },
    thresholds: { ewma: 0.63, cusum: 0.57 },
  };
}

export function normalizeScoringWeights(weights?: Partial<ScoringWeights>): ScoringWeights {
  const w = { impact: 0.4, confidence: 0.25, recency: 0.2, tier: 0.15, ...(weights ?? {}) };
  const sum = w.impact + w.confidence + w.recency + w.tier;
  if (sum === 1) return w;
  return { impact: w.impact / sum, confidence: w.confidence / sum, recency: w.recency / sum, tier: w.tier / sum };
}

export function recommendSeriesLimit(baseline?: StudentBaseline | null): number {
  const quality = baseline?.quality?.reliabilityScore ?? 0.75;
  if (quality >= 0.9) return 180;
  if (quality >= 0.7) return 120;
  return 90;
}


