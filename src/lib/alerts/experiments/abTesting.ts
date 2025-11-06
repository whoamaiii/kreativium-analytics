import { safeGet, safeSet } from '@/lib/storage';
import { stableSerialize } from '@/lib/analytics/cache-key';
import type { ThresholdOverride } from '@/lib/alerts/types';

export type VariantKey = 'A' | 'B';

export interface VariantConfig {
  label?: string;
  thresholdDelta?: number;
  thresholdMultiplier?: number;
  notes?: string;
}

export interface ABExperimentDefinition {
  key: string;
  hypothesis: string;
  startDate: string;
  endDate?: string;
  owner?: string;
  successMetrics?: string[];
  variants: Record<VariantKey, VariantConfig>;
  trafficSplit?: Record<VariantKey, number>;
  metadata?: Record<string, unknown>;
}

export interface ExperimentAssignment {
  experimentKey: string;
  studentId: string;
  variant: VariantKey;
  assignedAt: string;
}

const EXPERIMENT_INDEX_KEY = 'alerts:experiments:index';

function readJSON<T>(key: string): T | null {
  try {
    const raw = safeGet(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON<T>(key: string, value: T): void {
  try {
    safeSet(key, JSON.stringify(value));
  } catch {
    // ignore write failures
  }
}

function experimentKey(key: string): string {
  return `alerts:experiments:${key}`;
}

function fnvHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function normaliseTraffic(split?: Record<VariantKey, number>): Record<VariantKey, number> {
  const defaults: Record<VariantKey, number> = { A: 0.5, B: 0.5 };
  if (!split) return defaults;
  const total = Object.values(split).reduce((sum, value) => sum + value, 0);
  if (total <= 0) return defaults;
  return {
    A: (split.A ?? defaults.A) / total,
    B: (split.B ?? defaults.B) / total,
  };
}

export class ABTestingService {
  createExperiment(definition: ABExperimentDefinition): void {
    if (!definition?.key) {
      throw new Error('Experiment key is required');
    }
    const existing = this.getExperiment(definition.key);
    if (existing) {
      throw new Error(`Experiment ${definition.key} already exists`);
    }
    const payload = {
      ...definition,
      createdAt: new Date().toISOString(),
    };
    writeJSON(experimentKey(definition.key), payload);
    const index = new Set(readJSON<string[]>(EXPERIMENT_INDEX_KEY) ?? []);
    index.add(definition.key);
    writeJSON(EXPERIMENT_INDEX_KEY, Array.from(index));
  }

  getExperiment(key: string): ABExperimentDefinition | null {
    return readJSON<ABExperimentDefinition>(experimentKey(key));
  }

  listExperiments(): ABExperimentDefinition[] {
    const index = readJSON<string[]>(EXPERIMENT_INDEX_KEY) ?? [];
    return index
      .map((key) => this.getExperiment(key))
      .filter((exp): exp is ABExperimentDefinition => !!exp);
  }

  getVariant(studentId: string, experimentKeyValue: string): VariantKey {
    const experiment = this.getExperiment(experimentKeyValue);
    const split = normaliseTraffic(experiment?.trafficSplit);
    const seedPayload = {
      experiment: experimentKeyValue,
      student: studentId,
      salt: experiment?.metadata?.salt ?? 'alert-threshold',
    };
    const seed = stableSerialize(seedPayload);
    const bucket = fnvHash(seed) % 10_000;
    const cutoff = Math.round(split.A * 10_000);
    return bucket < cutoff ? 'A' : 'B';
  }

  getThresholdForVariant(
    experimentKeyValue: string,
    variant: VariantKey,
    baselineThreshold: number,
    override?: ThresholdOverride | null,
    defaultBaseline?: number,
  ): number {
    const experiment = this.getExperiment(experimentKeyValue);
    const fallback = typeof defaultBaseline === 'number' && defaultBaseline > 0 ? defaultBaseline : 0.5;
    if (!experiment) {
      const resolved = (typeof baselineThreshold === 'number' && baselineThreshold > 0)
        ? baselineThreshold
        : fallback;
      return resolved;
    }
    const config = experiment.variants?.[variant];
    if (!config) {
      const resolved = (typeof baselineThreshold === 'number' && baselineThreshold > 0)
        ? baselineThreshold
        : fallback;
      return resolved;
    }
    const multiplier = config.thresholdMultiplier ?? 1;
    const delta = config.thresholdDelta ?? 0;
    const baseCandidate = (typeof baselineThreshold === 'number' && baselineThreshold > 0)
      ? baselineThreshold
      : (override?.baselineThreshold && override.baselineThreshold > 0
        ? override.baselineThreshold
        : fallback);
    return (baseCandidate * multiplier) + delta;
  }

  recordAssignment(assignment: ExperimentAssignment): void {
    const key = `alerts:experiments:assignment:${assignment.experimentKey}:${assignment.studentId}`;
    writeJSON(key, assignment);
  }

  getAssignment(experimentKeyValue: string, studentId: string): ExperimentAssignment | null {
    const key = `alerts:experiments:assignment:${experimentKeyValue}:${studentId}`;
    return readJSON<ExperimentAssignment>(key);
  }
}

export default ABTestingService;
