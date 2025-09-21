import { analyticsConfig } from '@/lib/analyticsConfig';
import { logger } from '@/lib/logger';
import type {
  AnalyticsConfig as SchemaAnalyticsConfig,
  ChartDefaults,
  InsightRule,
  WorkerSettings,
  Threshold,
  FeatureFlags,
} from '@/config/schemas/analytics.schema';
import { analyticsConfigSchema } from '@/config/schemas/analytics.schema';
import { validateAndMergeAnalyticsConfig } from '@/config/validators/analytics.validator';

// This module centralizes advanced analytics runtime configuration with safe defaults.
// All consumers must read values through the getters below which merge runtime overrides
// provided via analyticsConfig with the defaults defined here.

// -----------------------------
// Types
// -----------------------------
export interface DynamicThreshold {
  base: number; // base absolute value
  min?: number;
  max?: number;
  // Adjust dynamically based on data distribution
  adaptTo: 'mean' | 'median' | 'std' | 'percentile';
  adaptFactor?: number; // multiplier applied to adaptTo metric (e.g., 1.5 * std)
}

export interface PercentageThreshold {
  // Interpret threshold as a percentage of a reference metric
  of: 'mean' | 'median' | 'max' | 'min' | 'range';
  percentage: number; // 0..1
  floor?: number; // optional absolute floor
  cap?: number; // optional absolute ceiling
}

export interface ConditionalThreshold {
  when: {
    metric: string;
    operator: '<' | '<=' | '>' | '>=' | '==' | '!=';
    value: number;
  };
  then: Threshold; // uses schema Threshold levels (low/medium/high/warn/error)
}

export interface AdvancedThresholdConfig {
  dynamic?: Record<string, DynamicThreshold>; // keyed by metric id
  percentage?: Record<string, PercentageThreshold>; // keyed by metric id
  conditional?: ConditionalThreshold[];
}

export interface MLModelConfig {
  id: string; // stable identifier (keys must be stable per project rules)
  task: 'pattern-detection' | 'anomaly-detection' | 'forecasting' | 'classification';
  provider: 'tfjs' | 'onnx' | 'custom';
  version: string;
  hyperparameters?: Record<string, number | string | boolean>;
  training?: {
    enabled: boolean;
    batchSize: number;
    epochs: number;
    validationSplit: number; // 0..1
  };
  inference?: {
    batchSize: number;
    cacheTTLms: number; // per rule: use cache with TTL
    precision: 'fp32' | 'fp16' | 'int8';
  };
}

export interface PerformanceBudgetConfig {
  // Budgets are soft limits; exceeding them should degrade gracefully
  maxTimeMs: number;
  maxMemoryMB: number;
  sampleRate?: number; // 0..1, for operations that can sample input
}

export interface PerformanceBudgets {
  preprocessing: PerformanceBudgetConfig;
  correlation: PerformanceBudgetConfig;
  patternDetection: PerformanceBudgetConfig;
  prediction: PerformanceBudgetConfig;
  chartRender: PerformanceBudgetConfig;
}

export interface RuntimeAnalyticsConfig extends SchemaAnalyticsConfig {
  // Extensions beyond the schema
  advancedThresholds: AdvancedThresholdConfig;
  ml: {
    models: MLModelConfig[];
  };
  performanceBudgets: PerformanceBudgets;
  charts: ChartDefaults & {
    // Extend with project color tokens; do not use raw hex (see rules)
    colorPalette: string[]; // tailwind theme variables or CSS variables
    animations: {
      enabled: boolean;
      durationMs: number;
      easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
      respectReducedMotion: boolean; // must respect [data-reduce-motion=true]
    };
  };
  worker: WorkerSettings & {
    pool: {
      maxWorkers: number;
      taskConcurrency: number;
      backpressureLimit: number;
    };
  };
  features: FeatureFlags;
}

// -----------------------------
// Defaults
// -----------------------------
const DEFAULT_RUNTIME_BASE: SchemaAnalyticsConfig = analyticsConfigSchema.parse({
  version: '1',
  thresholds: {},
  rules: [],
  charts: {
    theme: 'system',
    showLegend: true,
    lineWidth: 2,
    pointRadius: 3,
    animation: true,
    tooltip: {
      appendToBody: true,
      transitionDuration: 0,
      confine: true,
    },
    container: {
      overflowVisible: true,
      stableKeys: true,
    },
  },
  worker: {
    cache: { ttlSeconds: 300, strategy: 'ttl' },
    memory: { maxHeapMB: 512, maxWorkerCount: 2, taskConcurrency: 4 },
    queue: { enabled: true, backpressureLimit: 1000 },
    security: { allowEval: false },
  },
  features: {
    enableTrends: true,
    enableAnomalies: true,
    enableCorrelation: false,
    enableForecasting: false,
    enableRealtime: false,
  },
});

const DEFAULT_RUNTIME_EXTENSIONS: Omit<
  RuntimeAnalyticsConfig,
  keyof SchemaAnalyticsConfig
> = {
  advancedThresholds: {
    dynamic: {
      // Example: anomaly score threshold adapts to std dev
      'anomaly.score': { base: 1.5, adaptTo: 'std', adaptFactor: 1.0, min: 1.0, max: 3.0 },
    },
    percentage: {
      // e.g., "high-intensity" as 80% of max observed intensity
      'emotion.intensity.high': { of: 'max', percentage: 0.8, floor: 3, cap: 5 },
    },
    conditional: [
      {
        when: { metric: 'data.recency.days', operator: '>=', value: 14 },
        then: { warn: 0.4, error: 0.2 }, // require stronger signals when data is stale
      },
    ],
  },
  ml: {
    models: [
      {
        id: 'patterns-v1',
        task: 'pattern-detection',
        provider: 'tfjs',
        version: '1.0.0',
        hyperparameters: { learningRate: 0.001, dropout: 0.1 },
        training: { enabled: false, batchSize: 32, epochs: 5, validationSplit: 0.1 },
        inference: { batchSize: 64, cacheTTLms: 5 * 60 * 1000, precision: 'fp32' },
      },
      {
        id: 'anomaly-v1',
        task: 'anomaly-detection',
        provider: 'tfjs',
        version: '1.0.0',
        hyperparameters: { contamination: 0.05 },
        training: { enabled: false, batchSize: 64, epochs: 3, validationSplit: 0.1 },
        inference: { batchSize: 128, cacheTTLms: 5 * 60 * 1000, precision: 'fp32' },
      },
    ],
  },
  performanceBudgets: {
    preprocessing: { maxTimeMs: 30, maxMemoryMB: 50, sampleRate: 1 },
    correlation: { maxTimeMs: 75, maxMemoryMB: 128, sampleRate: 1 },
    patternDetection: { maxTimeMs: 90, maxMemoryMB: 256, sampleRate: 1 },
    prediction: { maxTimeMs: 60, maxMemoryMB: 128, sampleRate: 1 },
    chartRender: { maxTimeMs: 32, maxMemoryMB: 64, sampleRate: 1 },
  },
  charts: {
    theme: 'system',
    showLegend: true,
    lineWidth: 2,
    pointRadius: 3,
    animation: true,
    tooltip: { appendToBody: true, transitionDuration: 0, confine: true },
    container: { overflowVisible: true, stableKeys: true },
    // Extensions
    colorPalette: [
      // Use CSS variables from Tailwind theme per rules (no raw hex)
      'var(--chart-1)',
      'var(--chart-2)',
      'var(--chart-3)',
      'var(--chart-4)',
      'var(--chart-5)',
    ],
    animations: {
      enabled: true,
      durationMs: 300,
      easing: 'ease-out',
      respectReducedMotion: true, // Respect reduced motion per rules
    },
  },
  worker: {
    cache: { ttlSeconds: 300, strategy: 'ttl' },
    memory: { maxHeapMB: 512, maxWorkerCount: 2, taskConcurrency: 4 },
    queue: { enabled: true, backpressureLimit: 1000 },
    security: { allowEval: false },
    pool: { maxWorkers: 2, taskConcurrency: 4, backpressureLimit: 1000 },
  },
  features: {
    enableTrends: true,
    enableAnomalies: true,
    enableCorrelation: false,
    enableForecasting: false,
    enableRealtime: false,
  },
};

const DEFAULT_RUNTIME: RuntimeAnalyticsConfig = {
  ...DEFAULT_RUNTIME_BASE,
  ...DEFAULT_RUNTIME_EXTENSIONS,
};

// -----------------------------
// Merge helpers
// -----------------------------
function deepMerge<T extends object>(base: T, overrides: Partial<T> | undefined | null): T {
  if (!overrides) return base;
  const output = Array.isArray(base) ? ([...base] as unknown as T) : ({ ...base } as T);
  for (const key of Object.keys(overrides) as Array<keyof T>) {
    const overrideVal = overrides[key];
    if (overrideVal === undefined) continue;
    const baseVal = (base as any)[key];
    if (
      baseVal &&
      typeof baseVal === 'object' &&
      !Array.isArray(baseVal) &&
      typeof overrideVal === 'object' &&
      !Array.isArray(overrideVal)
    ) {
      (output as any)[key] = deepMerge(baseVal, overrideVal as any);
    } else {
      (output as any)[key] = overrideVal as any;
    }
  }
  return output;
}

function readRuntimeOverrides(): Partial<RuntimeAnalyticsConfig> | null {
  try {
    // Pull any overrides that may have been stored via analyticsConfig manager.
    const cfg = analyticsConfig.getConfig() as unknown as { runtime?: Partial<RuntimeAnalyticsConfig> };
    if (cfg && typeof cfg === 'object' && cfg.runtime) {
      return cfg.runtime;
    }
  } catch (err) {
    logger.warn('Failed to read runtime overrides from analyticsConfig; using defaults', err);
  }
  return null;
}

// -----------------------------
// Public API
// -----------------------------
export function getRuntimeAnalyticsConfig(): RuntimeAnalyticsConfig {
  const overrides = readRuntimeOverrides();

  // Early validation hook: validate schema-backed subset using zod and fallbacks
  const schemaSubset: Partial<SchemaAnalyticsConfig> | undefined = overrides
    ? {
        version: overrides.version,
        thresholds: overrides.thresholds,
        rules: overrides.rules,
        charts: overrides.charts as any, // charts core defaults validated via schema
        worker: overrides.worker as any, // worker core defaults validated via schema
        features: overrides.features,
      }
    : undefined;

  const { config: safeSchema, errors } = validateAndMergeAnalyticsConfig(
    DEFAULT_RUNTIME_BASE,
    schemaSubset,
  );

  if (errors.length) {
    // Log concise summary; detailed messages are logged in the validator
    logger.warn('Using safe analytics defaults due to invalid runtime overrides');
  }

  // Merge full runtime including extensions, but force validated schema parts
  const merged = deepMerge(DEFAULT_RUNTIME, overrides ?? undefined);
  const safeMerged: RuntimeAnalyticsConfig = {
    ...merged,
    // Overwrite schema-backed sections with validated values
    version: safeSchema.version,
    thresholds: safeSchema.thresholds,
    rules: safeSchema.rules,
    charts: {
      // Preserve non-schema extensions from merged first (e.g., colorPalette, animations),
      // then enforce schema-validated core values to avoid invalid overrides leaking through.
      ...(merged as any).charts,
      ...safeSchema.charts,
    },
    worker: {
      // Preserve non-schema extensions from merged first (e.g., pool),
      // then enforce schema-validated core values.
      ...(merged as any).worker,
      ...safeSchema.worker,
    },
    features: safeSchema.features,
  };

  return safeMerged;
}

// Removed unused getters per plan; consumers should use getRuntimeAnalyticsConfig directly

