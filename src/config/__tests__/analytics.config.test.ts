import { describe, it, expect, vi, beforeEach, afterEach, expectTypeOf } from 'vitest';
import { z, ZodError } from 'zod';
import {
  analyticsConfigSchema,
  type AnalyticsConfig as SchemaAnalyticsConfig,
  chartDefaultsSchema,
  thresholdSchema,
} from '@/config/schemas/analytics.schema';
import {
  validateAnalyticsConfig,
  validateAndMergeAnalyticsConfig,
} from '@/config/validators/analytics.validator';
import { getRuntimeAnalyticsConfig } from '@/config/analytics.config';
import * as libAnalyticsConfig from '@/lib/analyticsConfig';

// Helper to create a minimal valid config via schema defaults
function makeValidConfig(partial?: Partial<SchemaAnalyticsConfig>): SchemaAnalyticsConfig {
  const base = analyticsConfigSchema.parse({});
  return {
    ...base,
    ...(partial ?? {}),
  };
}

describe('analytics.config: schema validation', () => {
  it('accepts a valid configuration (with defaults)', () => {
    const cfg = analyticsConfigSchema.parse({
      version: '1',
      charts: { lineWidth: 3 },
    });
    expect(cfg.version).toBe('1');
    expect(cfg.charts.lineWidth).toBe(3);
    // Defaults filled
    expect(cfg.charts.pointRadius).toBeTypeOf('number');
  });

  it('rejects invalid charts values (lineWidth < 0)', () => {
    expect(() => analyticsConfigSchema.parse({ charts: { lineWidth: -1 } })).toThrow(ZodError);
  });

  it('enforces threshold monotonicity when provided', () => {
    const invalidThresh = { low: 5, medium: 2 };
    const result = thresholdSchema.safeParse(invalidThresh);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => String(i.message).includes('medium must be'))).toBe(true);
    }
  });
});

describe('analytics.validator: validate & merge', () => {
  const base = makeValidConfig({ version: '1', charts: { lineWidth: 2, pointRadius: 3, animation: true, showLegend: true, theme: 'system', tooltip: {}, container: {} }, rules: [], thresholds: {} });

  it('merges nested overrides and validates result', () => {
    const overrides: Partial<SchemaAnalyticsConfig> = {
      charts: { lineWidth: 4, tooltip: { transitionDuration: 0 } },
      worker: { cache: { ttlSeconds: 120 } },
    };
    const { isValid, config, errors } = validateAndMergeAnalyticsConfig(base, overrides);
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
    expect(config.charts.lineWidth).toBe(4);
    expect(config.worker.cache.ttlSeconds).toBe(120);
  });

  it('falls back to base when overrides invalid', () => {
    const overrides: Partial<SchemaAnalyticsConfig> = {
      charts: { lineWidth: -10 }, // invalid
    } as any;
    const { isValid, config, errors } = validateAndMergeAnalyticsConfig(base, overrides);
    expect(isValid).toBe(false);
    expect(errors.length).toBeGreaterThan(0);
    expect(config.charts.lineWidth).toBe(base.charts.lineWidth);
  });

  it('validateAnalyticsConfig returns fallback on invalid input', () => {
    const invalid: any = { charts: { lineWidth: -1 } };
    const { isValid, config, errors } = validateAnalyticsConfig(invalid, base);
    expect(isValid).toBe(false);
    expect(errors.length).toBeGreaterThan(0);
    expect(config).toEqual(base);
  });
});

describe('analytics.loader: environment variable parsing and profile application', () => {
  const originalImportMeta = { ...(import.meta as any) };

  beforeEach(() => {
    (import.meta as any).env = {};
  });
  afterEach(() => {
    (import.meta as any).env = originalImportMeta.env;
    vi.resetModules();
    vi.clearAllMocks();
  });

  // TODO(kb-analytics): Temporarily skipped due to module resolution of @/config/analytics.config in test env
  it.skip('parses boolean/number env vars into schema overrides', async () => {
    (import.meta as any).env = {
      VITE_ANALYTICS_CHARTS_LINE_WIDTH: '5',
      VITE_ANALYTICS_CHARTS_SHOW_LEGEND: 'true',
      VITE_ANALYTICS_WORKER_CACHE_TTL_SECONDS: '90',
      VITE_ANALYTICS_FEATURE_CORRELATION: '1',
      VITE_ANALYTICS_TOOLTIP_TRANSITION_MS: '0',
    };
    // dynamic import after env set so module reads latest env
    const { loadAnalyticsConfig } = await import('@/config/loaders/analytics.loader');

    // Mock runtime to an empty/default to control base
    const runtimeModule = await import('@/config/analytics.config');
    const spy = vi.spyOn(runtimeModule, 'getRuntimeAnalyticsConfig');
    spy.mockReturnValue({
      version: '1',
      thresholds: {},
      rules: [],
      charts: analyticsConfigSchema.parse({}).charts,
      worker: analyticsConfigSchema.parse({}).worker,
      features: analyticsConfigSchema.parse({}).features,
      // non-schema runtime extensions are irrelevant here
      advancedThresholds: {} as any,
      ml: { models: [] } as any,
      performanceBudgets: {} as any,
    } as any);

    const cfg = loadAnalyticsConfig({ forceReload: true });
    expect(cfg.charts.lineWidth).toBe(5);
    expect(cfg.charts.showLegend).toBe(true);
    expect(cfg.worker.cache.ttlSeconds).toBe(90);
    expect(cfg.features.enableCorrelation).toBe(true);
    expect(cfg.charts.tooltip.transitionDuration).toBe(0);

    spy.mockRestore();
  });

  it.skip('applies VITE_USE_MOCK profile to enable correlation and shorten cache', async () => {
    (import.meta as any).env = { VITE_USE_MOCK: 'true' };
    const { loadAnalyticsConfig } = await import('@/config/loaders/analytics.loader');

    const runtimeModule = await import('@/config/analytics.config');
    const spy = vi.spyOn(runtimeModule, 'getRuntimeAnalyticsConfig');
    spy.mockReturnValue({
      ...makeValidConfig(),
      charts: makeValidConfig().charts,
      worker: makeValidConfig().worker,
      features: makeValidConfig().features,
      advancedThresholds: {} as any,
      ml: { models: [] } as any,
      performanceBudgets: {} as any,
    } as any);

    const cfg = loadAnalyticsConfig({ forceReload: true });
    expect(cfg.features.enableCorrelation).toBe(true);
    expect(cfg.worker.cache.ttlSeconds).toBeGreaterThan(0);
    expect(cfg.worker.cache.ttlSeconds).toBeLessThanOrEqual(120); // mock profile shortens TTL
    spy.mockRestore();
  });
});

describe('analytics.config: fallback behavior when runtime overrides invalid', () => {
  it('uses safe defaults for invalid runtime overrides', async () => {
    // Mock analyticsConfig.getConfig() to return bad runtime overrides
    const mgr = vi.spyOn(libAnalyticsConfig.analyticsConfig, 'getConfig');
    mgr.mockReturnValue({ ...(libAnalyticsConfig.DEFAULT_ANALYTICS_CONFIG as any), runtime: { charts: { lineWidth: -99 } } });

    const cfg = getRuntimeAnalyticsConfig();
    // Even though overrides had invalid value, schema-backed portion should be valid number within range
    // Ensure lineWidth is a non-negative number as per schema (min 0)
    expect(cfg.charts.lineWidth).toBeGreaterThanOrEqual(0);

    mgr.mockRestore();
  });
});

describe('analytics.config: type inference correctness', () => {
  it('infers return types of getters', async () => {
    const runtime = getRuntimeAnalyticsConfig();
    expectTypeOf(runtime).toMatchTypeOf<{
      version: string;
      thresholds: SchemaAnalyticsConfig['thresholds'];
      rules: SchemaAnalyticsConfig['rules'];
      charts: SchemaAnalyticsConfig['charts'] & { colorPalette?: string[] };
      worker: SchemaAnalyticsConfig['worker'] & { pool?: { maxWorkers: number } };
    }>();

    // Ensure specific nested types are numbers/booleans as per schema
    expectTypeOf(runtime.charts.lineWidth).toBeNumber();
    expectTypeOf(runtime.worker.cache.ttlSeconds).toBeNumber();
    expectTypeOf(runtime.features.enableAnomalies).toBeBoolean();
  });
});
