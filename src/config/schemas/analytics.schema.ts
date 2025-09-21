import { z } from "zod";

// ---------------------------------------------
// Threshold configurations
// ---------------------------------------------
export const thresholdSchema = z
  .object({
    // Common threshold levels; all optional so callers can opt-in per metric
    low: z.number().finite().min(0).optional().describe("Lower bound for soft thresholds"),
    medium: z.number().finite().min(0).optional().describe("Medium threshold"),
    high: z.number().finite().min(0).optional().describe("High threshold"),
    warn: z.number().finite().min(0).optional().describe("Warning threshold"),
    error: z.number().finite().min(0).optional().describe("Error threshold"),
  })
  .strict()
  .superRefine((val, ctx) => {
    // Ensure monotonicity when multiple levels are provided
    const pairs: Array<[keyof typeof val, keyof typeof val]> = [
      ["low", "medium"],
      ["medium", "high"],
      ["warn", "error"],
    ];
    for (const [a, b] of pairs) {
      const va = val[a];
      const vb = val[b];
      if (typeof va === "number" && typeof vb === "number" && va > vb) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [b],
          message: `${String(b)} must be >= ${String(a)}`,
        });
      }
    }
  });

export type Threshold = z.infer<typeof thresholdSchema>;

// ---------------------------------------------
// Insight generation rules
// ---------------------------------------------
const operatorSchema = z.enum(["<", "<=", ">", ">=", "==", "!="]);

const timeWindowSchema = z
  .string()
  .regex(/^(\d+)(m|h|d|w)$/i, "Use windows like '15m', '2h', '7d', '4w'");

const ruleConditionSchema = z
  .object({
    metric: z.string().min(1).describe("Metric key used by analytics worker"),
    operator: operatorSchema,
    value: z.number().finite(),
    window: timeWindowSchema.default("7d").describe("Lookback window for condition"),
    groupBy: z.array(z.string().min(1)).max(4).optional(),
  })
  .strict();

const ruleSeveritySchema = z.enum(["info", "warn", "error"]);

const insightRuleSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .regex(/^[a-z0-9_-]+$/i, "Rule id must be alphanumeric, dash or underscore"),
    description: z.string().min(1),
    enabled: z.boolean().default(true),
    severity: ruleSeveritySchema.default("info"),
    conditions: z
      .array(ruleConditionSchema)
      .nonempty()
      .describe("All conditions must be true for the rule to trigger"),
    anyConditions: z
      .array(ruleConditionSchema)
      .optional()
      .describe("If provided, at least one of these conditions must be true in addition to 'conditions'")
      .optional(),
    emitOncePerWindow: z.boolean().default(true),
    tags: z.array(z.string().min(1)).max(16).default([]),
  })
  .strict();

export type InsightRule = z.infer<typeof insightRuleSchema>;

// ---------------------------------------------
// Chart configuration defaults
// ---------------------------------------------
const chartThemeSchema = z.enum(["light", "dark", "system"]);

const chartDefaultsSchema = z
  .object({
    theme: chartThemeSchema.default("system"),
    showLegend: z.boolean().default(true),
    lineWidth: z.number().finite().min(0).max(8).default(2),
    pointRadius: z.number().finite().min(0).max(14).default(3),
    animation: z.boolean().default(true),
    // ECharts-specific best practices from project rules
    tooltip: z
      .object({
        appendToBody: z.boolean().default(true),
        transitionDuration: z.number().finite().min(0).max(50).default(0),
        confine: z.boolean().default(true),
      })
      .strict()
      .default({}),
    container: z
      .object({
        overflowVisible: z.boolean().default(true),
        stableKeys: z.boolean().default(true),
      })
      .strict()
      .default({}),
  })
  .strict();

export type ChartDefaults = z.infer<typeof chartDefaultsSchema>;

// ---------------------------------------------
// Worker settings (cache TTL, memory limits)
// ---------------------------------------------
const workerSettingsSchema = z
  .object({
    cache: z
      .object({
        ttlSeconds: z.number().int().min(0).max(60 * 60 * 24).default(300), // 5 minutes
        strategy: z.enum(["ttl", "lru"]).default("ttl"),
      })
      .strict()
      .default({}),
    memory: z
      .object({
        maxHeapMB: z.number().int().min(64).max(8192).default(512),
        maxWorkerCount: z.number().int().min(1).max(16).default(2),
        taskConcurrency: z.number().int().min(1).max(64).default(4),
      })
      .strict()
      .default({}),
    queue: z
      .object({
        enabled: z.boolean().default(true),
        backpressureLimit: z.number().int().min(10).max(10000).default(1000),
      })
      .strict()
      .default({}),
    security: z
      .object({
        allowEval: z.boolean().default(false),
      })
      .strict()
      .default({}),
  })
  .strict();

export type WorkerSettings = z.infer<typeof workerSettingsSchema>;

// ---------------------------------------------
// Feature flags for analytics modules
// ---------------------------------------------
const featureFlagsSchema = z
  .object({
    enableTrends: z.boolean().default(true),
    enableAnomalies: z.boolean().default(true),
    enableCorrelation: z.boolean().default(false),
    enableForecasting: z.boolean().default(false),
    enableRealtime: z.boolean().default(false),
  })
  .strict();

export type FeatureFlags = z.infer<typeof featureFlagsSchema>;

// ---------------------------------------------
// Root analytics configuration schema
// ---------------------------------------------
export const analyticsConfigSchema = z
  .object({
    version: z.string().min(1).default("1"),
    thresholds: z
      .record(z.string().min(1), thresholdSchema)
      .default({})
      .describe("Per-metric threshold configuration, keyed by metric id"),
    rules: z.array(insightRuleSchema).default([]),
    charts: chartDefaultsSchema.default({}),
    worker: workerSettingsSchema.default({}),
    features: featureFlagsSchema.default({}),
  })
  .strict();

export type AnalyticsConfig = z.infer<typeof analyticsConfigSchema>;

// ---------------------------------------------
// Helper: parse & validate with strong typing
// ---------------------------------------------
// Removed unused helper: parseAnalyticsConfig

