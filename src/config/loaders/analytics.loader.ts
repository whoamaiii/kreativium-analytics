import { logger } from '@/lib/logger';
import { analyticsConfigSchema, type AnalyticsConfig as SchemaAnalyticsConfig } from '@/config/schemas/analytics.schema';
import { validateAndMergeAnalyticsConfig } from '@/config/validators/analytics.validator';
import { getRuntimeAnalyticsConfig } from '@/config/analytics.config';

// Environment-based switching pattern
// If VITE_USE_MOCK is truthy ("1", "true", "yes"), we prefer mock-oriented settings.
// If VITE_ANALYTICS_PROFILE is set (e.g., "dev", "prod", "test"), we can tweak defaults gently.

function truthy(v: unknown): boolean {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

function toNumber(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseJSON<T = unknown>(raw: unknown): T | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    logger.warn('Invalid JSON in environment variable; ignoring', { raw: raw.slice(0, 64) });
    return undefined;
  }
}

// Read environment variables beginning with VITE_ANALYTICS_ and build a partial schema-backed config.
function readEnvOverrides(): Partial<SchemaAnalyticsConfig> | null {
  const env = import.meta.env as Record<string, string | boolean | undefined>;

  // Fast path: if no relevant keys present, return null
  const hasAny = Object.keys(env).some((k) => k.startsWith('VITE_ANALYTICS_'));
  if (!hasAny) return null;

  // Support bulk JSON overrides for complex structures
  const thresholdsJson = parseJSON<Record<string, SchemaAnalyticsConfig['thresholds'][string]>>(env.VITE_ANALYTICS_THRESHOLDS_JSON as string | undefined);
  const rulesJson = parseJSON<SchemaAnalyticsConfig['rules']>(env.VITE_ANALYTICS_RULES_JSON as string | undefined);

  const chartsTheme = (env.VITE_ANALYTICS_CHARTS_THEME as string | undefined)?.toLowerCase() as
    | 'light'
    | 'dark'
    | 'system'
    | undefined;

  const overrides: Partial<SchemaAnalyticsConfig> = {
    version: (env.VITE_ANALYTICS_VERSION as string | undefined) ?? undefined,
    thresholds: thresholdsJson ?? undefined,
    rules: rulesJson ?? undefined,
    charts: {
      theme: chartsTheme,
      showLegend: env.VITE_ANALYTICS_CHARTS_SHOW_LEGEND !== undefined ? truthy(env.VITE_ANALYTICS_CHARTS_SHOW_LEGEND) : undefined,
      lineWidth: toNumber(env.VITE_ANALYTICS_CHARTS_LINE_WIDTH),
      pointRadius: toNumber(env.VITE_ANALYTICS_CHARTS_POINT_RADIUS),
      animation: env.VITE_ANALYTICS_CHARTS_ANIMATION !== undefined ? truthy(env.VITE_ANALYTICS_CHARTS_ANIMATION) : undefined,
      tooltip: {
        appendToBody: env.VITE_ANALYTICS_TOOLTIP_APPEND_TO_BODY !== undefined ? truthy(env.VITE_ANALYTICS_TOOLTIP_APPEND_TO_BODY) : undefined,
        transitionDuration: toNumber(env.VITE_ANALYTICS_TOOLTIP_TRANSITION_MS),
        confine: env.VITE_ANALYTICS_TOOLTIP_CONFINE !== undefined ? truthy(env.VITE_ANALYTICS_TOOLTIP_CONFINE) : undefined,
      },
      container: {
        overflowVisible: env.VITE_ANALYTICS_CONTAINER_OVERFLOW_VISIBLE !== undefined ? truthy(env.VITE_ANALYTICS_CONTAINER_OVERFLOW_VISIBLE) : undefined,
        stableKeys: env.VITE_ANALYTICS_CONTAINER_STABLE_KEYS !== undefined ? truthy(env.VITE_ANALYTICS_CONTAINER_STABLE_KEYS) : undefined,
      },
    },
    worker: {
      cache: {
        ttlSeconds: toNumber(env.VITE_ANALYTICS_WORKER_CACHE_TTL_SECONDS),
        strategy: (env.VITE_ANALYTICS_WORKER_CACHE_STRATEGY as 'ttl' | 'lru' | undefined) ?? undefined,
      },
      memory: {
        maxHeapMB: toNumber(env.VITE_ANALYTICS_WORKER_MAX_HEAP_MB),
        maxWorkerCount: toNumber(env.VITE_ANALYTICS_WORKER_MAX_COUNT),
        taskConcurrency: toNumber(env.VITE_ANALYTICS_WORKER_TASK_CONCURRENCY),
      },
      queue: {
        enabled: env.VITE_ANALYTICS_QUEUE_ENABLED !== undefined ? truthy(env.VITE_ANALYTICS_QUEUE_ENABLED) : undefined,
        backpressureLimit: toNumber(env.VITE_ANALYTICS_QUEUE_BACKPRESSURE_LIMIT),
      },
      security: {
        allowEval: env.VITE_ANALYTICS_SECURITY_ALLOW_EVAL !== undefined ? truthy(env.VITE_ANALYTICS_SECURITY_ALLOW_EVAL) : undefined,
      },
    },
    features: {
      enableTrends: env.VITE_ANALYTICS_FEATURE_TRENDS !== undefined ? truthy(env.VITE_ANALYTICS_FEATURE_TRENDS) : undefined,
      enableAnomalies: env.VITE_ANALYTICS_FEATURE_ANOMALIES !== undefined ? truthy(env.VITE_ANALYTICS_FEATURE_ANOMALIES) : undefined,
      enableCorrelation: env.VITE_ANALYTICS_FEATURE_CORRELATION !== undefined ? truthy(env.VITE_ANALYTICS_FEATURE_CORRELATION) : undefined,
      enableForecasting: env.VITE_ANALYTICS_FEATURE_FORECASTING !== undefined ? truthy(env.VITE_ANALYTICS_FEATURE_FORECASTING) : undefined,
      enableRealtime: env.VITE_ANALYTICS_FEATURE_REALTIME !== undefined ? truthy(env.VITE_ANALYTICS_FEATURE_REALTIME) : undefined,
    },
  };

  // Clean undefined leaves to respect deep-merge semantics later
  function prune<T extends object>(obj: T): T {
    const out = Array.isArray(obj) ? ([...obj] as unknown as T) : ({ ...obj } as T);
    const outRecord = out as Record<string, unknown>;
    for (const k of Object.keys(outRecord)) {
      const v = outRecord[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        outRecord[k] = prune(v as Record<string, unknown>);
      }
      if (outRecord[k] === undefined) delete outRecord[k];
    }
    return out;
  }

  return prune(overrides);
}

// Cache and hot-reload support
let cachedConfig: SchemaAnalyticsConfig | null = null;
let cacheStamp = 0;

function deepMerge<T extends object>(base: T, overrides?: Partial<T> | null): T {
  if (!overrides) return base;
  const output = Array.isArray(base) ? ([...base] as unknown as T) : ({ ...base } as T);
  const outputRecord = output as Record<string, unknown>;
  const baseRecord = base as Record<string, unknown>;
  const overridesRecord = overrides as Record<string, unknown>;

  for (const key of Object.keys(overrides) as Array<keyof T>) {
    const ov = overridesRecord[key as string];
    if (ov === undefined) continue;
    const bv = baseRecord[key as string];
    if (bv && typeof bv === 'object' && !Array.isArray(bv) && ov && typeof ov === 'object' && !Array.isArray(ov)) {
      outputRecord[key as string] = deepMerge(bv as Record<string, unknown>, ov as Partial<Record<string, unknown>>);
    } else {
      outputRecord[key as string] = ov;
    }
  }
  return output;
}

function applyEnvironmentProfile(base: SchemaAnalyticsConfig): SchemaAnalyticsConfig {
  const env = import.meta.env as Record<string, string | boolean | undefined>;
  const useMock = truthy(env.VITE_USE_MOCK);
  const profile = (env.VITE_ANALYTICS_PROFILE as string | undefined)?.toLowerCase();

  let profileOverrides: Partial<SchemaAnalyticsConfig> | null = null;

  if (useMock) {
    // Softer thresholds and more permissive features to help surface results with mock data
    profileOverrides = {
      features: {
        enableTrends: true,
        enableAnomalies: true,
        enableCorrelation: true,
        enableForecasting: false,
        enableRealtime: false,
      },
      worker: {
        cache: { ttlSeconds: 60 },
      },
    } as Partial<SchemaAnalyticsConfig>;
  } else if (profile === 'dev') {
    profileOverrides = {
      worker: { cache: { ttlSeconds: 120 } },
    } as Partial<SchemaAnalyticsConfig>;
  } else if (profile === 'prod') {
    profileOverrides = {
      worker: { cache: { ttlSeconds: 300 } },
    } as Partial<SchemaAnalyticsConfig>;
  }

  return profileOverrides ? deepMerge(base, profileOverrides) : base;
}

export interface AnalyticsLoaderOptions {
  forceReload?: boolean;
}

export function loadAnalyticsConfig(options: AnalyticsLoaderOptions = {}): SchemaAnalyticsConfig {
  if (cachedConfig && !options.forceReload) {
    return cachedConfig;
  }

  // Start from the current runtime config (already merged with project defaults + UI overrides)
  const runtime = getRuntimeAnalyticsConfig();
  const baseSchemaPortion: SchemaAnalyticsConfig = analyticsConfigSchema.parse({
    version: runtime.version,
    thresholds: runtime.thresholds,
    rules: runtime.rules,
    charts: runtime.charts,
    worker: runtime.worker,
    features: runtime.features,
  });

  const profiled = applyEnvironmentProfile(baseSchemaPortion);
  const envOverrides = readEnvOverrides();

  const { config: validated, errors } = validateAndMergeAnalyticsConfig(profiled, envOverrides);
  if (errors.length) {
    logger.warn('Environment analytics overrides contained invalid values; using safe fallbacks');
  }

  cachedConfig = validated;
  cacheStamp = Date.now();
  return validated;
}

export function getAnalyticsConfigCacheStamp(): number {
  return cacheStamp;
}

// Hot reload in development: clear cache when HMR invalidates this module
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    cachedConfig = null;
    cacheStamp = Date.now();
    logger.info('analytics.loader hot-reloaded: cache invalidated');
  });
}

// Optional: consumers can subscribe to changes by polling cacheStamp or wiring into HMR themselves.

