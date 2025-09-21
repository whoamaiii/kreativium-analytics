import { z, ZodError } from 'zod';
import { logger } from '@/lib/logger';
import {
  analyticsConfigSchema,
} from '@/config/schemas/analytics.schema';
import type { AnalyticsConfig as SchemaAnalyticsConfig } from '@/config/schemas/analytics.schema';

export interface AnalyticsValidationResult {
  isValid: boolean;
  config: SchemaAnalyticsConfig;
  errors: string[];
  warnings: string[];
}

// Formats ZodError issues into developer-friendly messages with paths
function formatZodError(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path?.length ? issue.path.join('.') : '(root)';
    const code = issue.code;
    return `${path}: ${issue.message}${code ? ` [${code}]` : ''}`;
  });
}

// Validates a complete config. If invalid, returns the provided fallback and errors.
export function validateAnalyticsConfig(
  input: unknown,
  fallback: SchemaAnalyticsConfig,
): AnalyticsValidationResult {
  const result = analyticsConfigSchema.safeParse(input);
  if (result.success) {
    return { isValid: true, config: result.data, errors: [], warnings: [] };
  }

  const errors = formatZodError(result.error);
  // Log once with normalized diagnostics
  try {
    logger.error('analytics.config validation failed; using fallback defaults', {
      errors,
    });
  } catch {
    // noop if logger unavailable in some environments
  }
  return { isValid: false, config: fallback, errors, warnings: [] };
}

// Validates a partial (override) by deep-merging with base first, then parsing.
export function validateAndMergeAnalyticsConfig(
  base: SchemaAnalyticsConfig,
  overrides?: Partial<SchemaAnalyticsConfig> | null,
): AnalyticsValidationResult {
  // Deep merge helper that preserves object structure
  const deepMerge = <T extends object>(a: T, b?: Partial<T> | null): T => {
    if (!b) return a;
    const out: any = Array.isArray(a) ? [...(a as any)] : { ...(a as any) };
    for (const key of Object.keys(b) as Array<keyof T>) {
      const bv: any = (b as any)[key];
      if (bv === undefined) continue;
      const av: any = (a as any)[key];
      if (av && typeof av === 'object' && !Array.isArray(av) && typeof bv === 'object' && !Array.isArray(bv)) {
        out[key] = deepMerge(av, bv);
      } else {
        out[key] = bv;
      }
    }
    return out as T;
  };

  const mergedCandidate = deepMerge(base, overrides ?? undefined);
  return validateAnalyticsConfig(mergedCandidate, base);
}
