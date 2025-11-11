/**
 * @module engineConfig
 * @description Configuration resolution utilities for analytics engine factory.
 *
 * This module provides helpers for resolving AI configuration from multiple sources:
 * - Runtime parameters (highest priority)
 * - Analytics configuration (live)
 * - Environment variables (Vite import.meta.env)
 * - AI config defaults (lowest priority)
 *
 * Follows fail-soft philosophy: gracefully handles missing or invalid config.
 */

import { analyticsConfig } from '@/lib/analyticsConfig';
import { loadAiConfig } from '@/lib/aiConfig';
import { logger } from '@/lib/logger';

/**
 * Resolved engine configuration after merging all sources
 */
export interface ResolvedEngineConfig {
  /** Whether to use AI-powered analysis */
  shouldUseAI: boolean;
  /** Resolved model name (validated against allowed list) */
  modelName: string;
  /** API key presence (not the actual key for security) */
  hasApiKey: boolean;
  /** Whether this was explicitly overridden at runtime */
  isRuntimeOverride: boolean;
  /** Allowed models list */
  allowedModels: string[];
}

/**
 * Converts various truthy string values to boolean.
 * Recognizes: "1", "true", "yes" (case-insensitive)
 *
 * @param value - Value to convert to boolean
 * @returns Boolean result
 *
 * @example
 * toBooleanValue("1") // true
 * toBooleanValue("TRUE") // true
 * toBooleanValue("yes") // true
 * toBooleanValue("0") // false
 * toBooleanValue("") // false
 */
export function toBooleanValue(value: unknown): boolean {
  const str = (value ?? '').toString().toLowerCase();
  return str === '1' || str === 'true' || str === 'yes';
}

/**
 * Safely reads environment variables from Vite's import.meta.env.
 *
 * @returns Environment object (may be empty in non-Vite contexts)
 */
function getViteEnv(): Record<string, unknown> {
  try {
    return (import.meta as any)?.env ?? {};
  } catch {
    return {};
  }
}

/**
 * Reads AI analysis enabled flag from environment with boolean conversion.
 *
 * @returns True if VITE_AI_ANALYSIS_ENABLED is set to truthy value
 */
export function getEnvAIEnabled(): boolean {
  const env = getViteEnv();
  return toBooleanValue(env.VITE_AI_ANALYSIS_ENABLED);
}

/**
 * Reads AI model name from environment with fallback to aiConfig.
 *
 * @returns Model name from env or aiConfig, empty string if neither available
 */
export function getEnvModelName(): string {
  const env = getViteEnv();
  const envModel = env.VITE_AI_MODEL_NAME;

  if (typeof envModel === 'string' && envModel.trim().length > 0) {
    return envModel;
  }

  try {
    const aiEnv = loadAiConfig();
    return aiEnv.modelName || '';
  } catch {
    return '';
  }
}

/**
 * Reads OpenRouter API key from environment with fallback to aiConfig.
 *
 * @returns API key from env or aiConfig, empty string if neither available
 */
export function getEnvApiKey(): string {
  const env = getViteEnv();
  const envKey = env.VITE_OPENROUTER_API_KEY;

  if (typeof envKey === 'string' && envKey.trim().length > 0) {
    return envKey;
  }

  try {
    const aiEnv = loadAiConfig();
    return aiEnv.apiKey || '';
  } catch {
    return '';
  }
}

/**
 * Validates model name against allowed models list (case-insensitive).
 * Falls back to first allowed model if validation fails.
 *
 * @param requestedModel - Model name to validate
 * @param allowedModels - List of allowed model names
 * @returns Validated model name or fallback
 */
export function validateModel(requestedModel: string, allowedModels: string[]): string {
  if (!allowedModels || allowedModels.length === 0) {
    logger.warn('[engineConfig] No allowed models configured, using requested model as-is', {
      requested: requestedModel,
    });
    return requestedModel;
  }

  try {
    const allowedLc = new Set(allowedModels.map((m) => m.toLowerCase()));
    const modelLc = (requestedModel || '').toLowerCase();

    if (allowedLc.has(modelLc)) {
      return requestedModel;
    }

    // Not in allowed list, fall back to first allowed model
    const fallback = allowedModels[0] || 'gpt-5';
    logger.warn('[engineConfig] Disallowed model; falling back to allowed model', {
      requested: requestedModel,
      allowed: allowedModels,
      fallback,
    });

    return fallback;
  } catch (error) {
    logger.warn('[engineConfig] Model validation failed, using requested model as-is', {
      error,
      requested: requestedModel,
    });
    return requestedModel;
  }
}

/**
 * Resolves complete engine configuration from all sources.
 *
 * Priority order:
 * 1. Runtime parameter (useAI) - explicit override
 * 2. Analytics config flag (features.aiAnalysisEnabled)
 * 3. Environment variable (VITE_AI_ANALYSIS_ENABLED)
 * 4. Defaults (false)
 *
 * @param useAI - Optional runtime override for AI analysis
 * @returns Resolved configuration object
 *
 * @example
 * // Explicit runtime override
 * const config = resolveEngineConfig(false);
 * // config.shouldUseAI === false regardless of other settings
 *
 * @example
 * // Automatic resolution from config/env
 * const config = resolveEngineConfig();
 * // Checks analytics config, then environment
 */
export function resolveEngineConfig(useAI?: boolean): ResolvedEngineConfig {
  // Load AI config for model validation and defaults
  const aiEnv = loadAiConfig();

  // Load live analytics config (fail-soft)
  const liveCfg = (() => {
    try {
      return analyticsConfig.getConfig();
    } catch {
      return null;
    }
  })();

  // Extract AI enabled flag from analytics config
  const cfgFlag = liveCfg?.features?.aiAnalysisEnabled;

  // Read environment variables
  const envEnabled = getEnvAIEnabled();
  const envModel = getEnvModelName();
  const envKey = getEnvApiKey();

  // Resolve model name (env takes precedence over aiConfig)
  const rawModel = envModel || aiEnv.modelName;

  // Validate model against allowed list
  const validatedModel = validateModel(rawModel, aiEnv.allowedModels || []);

  // Resolve AI enabled flag with priority chain
  const isRuntimeOverride = typeof useAI === 'boolean';
  let resolvedEnabled: boolean;

  if (isRuntimeOverride) {
    // Explicit runtime override takes highest priority
    resolvedEnabled = useAI;
  } else if (typeof cfgFlag === 'boolean') {
    // Analytics config takes second priority
    resolvedEnabled = cfgFlag;
  } else {
    // Environment variable is fallback
    resolvedEnabled = envEnabled;
  }

  // Final availability check: need API key and model to actually use AI
  const hasRequirements = !!envKey && !!validatedModel;
  const shouldUseAI = resolvedEnabled && hasRequirements;

  return {
    shouldUseAI,
    modelName: validatedModel,
    hasApiKey: !!envKey,
    isRuntimeOverride,
    allowedModels: aiEnv.allowedModels || [],
  };
}
