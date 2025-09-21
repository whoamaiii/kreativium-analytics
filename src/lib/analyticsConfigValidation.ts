import { DEFAULT_ANALYTICS_CONFIG, AnalyticsConfiguration, analyticsConfig } from '@/lib/analyticsConfig';
import { logger } from '@/lib/logger';

export interface ConfigValidation {
  isValid: boolean;
  errors: string[];
}

// Lightweight runtime validation for AnalyticsConfiguration shape and ranges
function validateShape(cfg: unknown): cfg is AnalyticsConfiguration {
  if (!cfg || typeof cfg !== 'object') return false;
  const c: any = cfg;
  const requiredRoots = [
    'patternAnalysis',
    'enhancedAnalysis',
    'timeWindows',
    'alertSensitivity',
    'cache',
    'insights',
    'confidence',
    'healthScore',
    'analytics',
    'taxonomy',
    'precomputation',
  ];
  for (const k of requiredRoots) {
    if (!(k in c)) return false;
  }
  // Basic numeric range sanity checks (non-exhaustive, enough to prevent obvious breakage)
  const numbersOk = [
    c.patternAnalysis?.minDataPoints,
    c.patternAnalysis?.correlationThreshold,
    c.enhancedAnalysis?.anomalyThreshold,
    c.cache?.ttl,
    c.cache?.maxSize,
    c.insights?.MAX_PATTERNS_TO_SHOW,
    c.confidence?.WEIGHTS?.EMOTION,
  ].every((n: any) => typeof n === 'number' && Number.isFinite(n));
  if (!numbersOk) return false;
  // Precomputation numeric sanity checks
  const pc = c.precomputation || {};
  const pcNumbersOk = [
    pc.maxQueueSize,
    pc.batchSize,
    pc.idleTimeout,
    pc.maxConcurrentTasks,
    pc.taskStaggerDelay,
    pc.maxPrecomputeTime,
  ].every((n: any) => typeof n === 'number' && Number.isFinite(n));
  if (!pcNumbersOk) return false;
  return true;
}

export function validateAnalyticsRuntimeConfig(cfg: unknown): { config: AnalyticsConfiguration; meta: ConfigValidation } {
  try {
    if (validateShape(cfg)) {
      return { config: cfg, meta: { isValid: true, errors: [] } };
    }
  } catch (err) {
    // fall through to default
  }
  try {
    logger.error('[analyticsConfigValidation] Invalid analytics configuration detected. Falling back to defaults.');
  } catch {}
  return { config: DEFAULT_ANALYTICS_CONFIG, meta: { isValid: false, errors: ['invalid-shape-or-values'] } };
}

// Helper to always return a safe, validated config
export function getValidatedConfig(): AnalyticsConfiguration {
  try {
    const live = analyticsConfig.getConfig();
    return validateAnalyticsRuntimeConfig(live).config;
  } catch {
    return DEFAULT_ANALYTICS_CONFIG;
  }
}
