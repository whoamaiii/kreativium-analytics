/**
 * @file src/lib/startupValidation.ts
 * Startup configuration validation service for AI settings.
 *
 * Validates API key presence/format and model configuration using Zod schemas
 * and orchestrates a non-blocking API connectivity check in the background.
 *
 * Returns consistent results with isValid/errors/warnings per repository
 * validation conventions.
 */
import { z } from 'zod';
import { logger } from '@/lib/logger';
import {
  loadAiConfig,
  type AiConfig,
  isValidModelName,
  getModelValidationErrors,
  isValidApiKey,
  getApiKeyValidationErrors,
  CANONICAL_ALLOWED_MODELS,
  MIN_OPENROUTER_API_KEY_LENGTH,
} from '@/lib/aiConfig';
import { OPENROUTER_API_KEY, AI_MODEL_NAME } from '@/lib/env';
import { testModelAvailability } from '@/lib/apiConnectivityValidator';
import { ValidationResult } from '@/lib/validationTypes';

// Zod schemas (follow existing pattern of Zod-based validation)
const apiKeySchema = z
  .string()
  .min(
    MIN_OPENROUTER_API_KEY_LENGTH,
    `API key must be at least ${MIN_OPENROUTER_API_KEY_LENGTH} characters long`,
  );
const modelNameSchema = z.string().min(1, 'Model name must be a non-empty string');

export function validateApiKeyPresence(config?: Partial<AiConfig>): ValidationResult {
  const ai = config ? { ...loadAiConfig(), ...config } : loadAiConfig();
  const key = ai.apiKey ?? OPENROUTER_API_KEY ?? '';
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if API key is required based on base URL
  const baseUrl = (ai.baseUrl || '').toLowerCase();
  const requiresKey = baseUrl.includes('openrouter.ai');

  if (requiresKey) {
    // Zod shape check (length) + utility format validation for consistency
    const keyForZod = (typeof key === 'string' ? key : '').trim();
    const zres = apiKeySchema.safeParse(keyForZod);
    if (!zres.success) {
      errors.push(...zres.error.issues.map((i) => i.message));
    }
    if (!isValidApiKey(keyForZod)) {
      errors.push(...getApiKeyValidationErrors(keyForZod));
    }
  } else {
    // For local/dev setups, downgrade to warnings if key is missing/invalid
    const keyForZod = (typeof key === 'string' ? key : '').trim();
    if (keyForZod.length === 0) {
      warnings.push('API key not provided (OK for local/dev setups)');
    } else if (!isValidApiKey(keyForZod)) {
      warnings.push('API key format appears invalid (OK for local/dev setups)');
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateModelName(config?: Partial<AiConfig>): ValidationResult {
  // Read raw env value directly to avoid masking by runtime fallbacks
  const env: Record<string, unknown> = (import.meta as any)?.env ?? {};
  const rawModel =
    typeof env.VITE_AI_MODEL_NAME === 'string' && env.VITE_AI_MODEL_NAME.trim().length > 0
      ? env.VITE_AI_MODEL_NAME.trim()
      : (AI_MODEL_NAME || '').trim();

  const errors: string[] = [];
  const warnings: string[] = [];

  const zres = modelNameSchema.safeParse(rawModel);
  if (!zres.success) {
    errors.push(...zres.error.issues.map((i) => i.message));
  }

  // Validate against canonical allowed models (not dynamic allowedModels)
  const canonicalModelsLc = CANONICAL_ALLOWED_MODELS.map((m) => m.toLowerCase());
  const rawModelLc = rawModel.toLowerCase();
  if (rawModel.length > 0 && !canonicalModelsLc.includes(rawModelLc)) {
    errors.push(
      `Model "${rawModel}" is not in the canonical allowed models list: ${CANONICAL_ALLOWED_MODELS.join(', ')}`,
    );
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Triggers a non-blocking connectivity test. Errors are logged but do not
 * block the main validation result. Returns the async result for callers that
 * want to await, but startup should not block on this.
 */
export async function validateModelAvailability(
  config?: Partial<AiConfig>,
): Promise<ValidationResult> {
  const ai = config ? { ...loadAiConfig(), ...config } : loadAiConfig();
  try {
    const result = await testModelAvailability(ai.modelName, ai.apiKey || '');
    return result;
  } catch (e) {
    logger.warn(
      '[startupValidation] Connectivity validation threw; treating as warning',
      e as Error,
    );
    return { isValid: true, errors: [], warnings: ['Connectivity validation failed to run'] };
  }
}

/**
 * Orchestrates startup validation. Performs synchronous checks immediately and
 * kicks off connectivity testing in the background. Never throws.
 */
export async function validateStartupConfiguration(): Promise<ValidationResult> {
  const apiKeyRes = validateApiKeyPresence();
  const modelRes = validateModelName();
  const errors = [...apiKeyRes.errors, ...modelRes.errors];
  const warnings = [...apiKeyRes.warnings, ...modelRes.warnings];

  const baseResult: ValidationResult = {
    isValid: errors.length === 0,
    errors,
    warnings,
  };

  // Fire-and-forget connectivity test; log outcome when ready
  try {
    // Do not await; background diagnostics only
    void validateModelAvailability()
      .then((conn) => {
        if (!conn.isValid && conn.errors.length > 0) {
          logger.error('[startupValidation] Model connectivity test failed', {
            errors: conn.errors,
          });
        } else if (conn.warnings.length > 0) {
          logger.warn('[startupValidation] Model connectivity warnings', {
            warnings: conn.warnings,
          });
        } else {
          logger.info('[startupValidation] Model connectivity OK');
        }
      })
      .catch((e) => {
        logger.warn('[startupValidation] Connectivity test promise rejected', e as Error);
      });
  } catch (e) {
    logger.warn('[startupValidation] Failed to start connectivity test', e as Error);
  }

  if (baseResult.isValid) {
    logger.debug('[startupValidation] Basic configuration valid');
  } else {
    logger.warn('[startupValidation] Configuration issues detected', { errors, warnings });
  }

  return baseResult;
}
