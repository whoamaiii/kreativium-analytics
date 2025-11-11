/**
 * @module engineFactory
 * @description Factory for creating analytics engines with intelligent AI/Heuristic selection.
 *
 * This module provides the main entry point for creating analysis engines based on:
 * - Runtime parameters (explicit useAI override)
 * - Configuration flags (analytics config)
 * - Environment availability (API keys, model names)
 *
 * Features rate-limited debug logging to reduce noise in production.
 *
 * @example
 * // Create engine with automatic selection
 * const engine = createAnalysisEngine();
 *
 * @example
 * // Force heuristic engine (explicit override)
 * const engine = createAnalysisEngine(false);
 *
 * @example
 * // Request AI engine (if available)
 * const engine = createAnalysisEngine(true);
 */

import { HeuristicAnalysisEngine, LLMAnalysisEngine } from '@/lib/analysis';
import type { AnalysisEngine } from '@/lib/analysis';
import { logger } from '@/lib/logger';
import { resolveEngineConfig } from './engineConfig';

/**
 * Rate-limiting state for debug logging.
 * Tracks the last minute when debug log was emitted to avoid flooding logs.
 * Resets every 60 seconds (on minute boundary change).
 */
let lastDebugLogMinute: number | null = null;

/**
 * Creates an analysis engine based on configuration and runtime parameters.
 *
 * **Selection Logic**:
 * 1. If `useAI === false` (explicit), always returns HeuristicAnalysisEngine
 * 2. Otherwise, resolves configuration from multiple sources
 * 3. Validates requirements (API key, model name)
 * 4. Returns LLMAnalysisEngine if AI is enabled and available
 * 5. Falls back to HeuristicAnalysisEngine otherwise
 *
 * **Configuration Priority**:
 * - Runtime parameter (useAI) - highest
 * - Analytics config (features.aiAnalysisEnabled)
 * - Environment variable (VITE_AI_ANALYSIS_ENABLED)
 * - Default: false
 *
 * **Fail-Soft Philosophy**:
 * - Never throws errors; always returns a valid engine
 * - Gracefully handles missing configuration
 * - Falls back to heuristic analysis on any failure
 * - Logs warnings for debugging without breaking execution
 *
 * **Debug Logging**:
 * - Rate-limited to once per minute to reduce noise
 * - Includes detailed config resolution diagnostics
 * - Helps troubleshoot engine selection issues
 *
 * @param useAI - Optional runtime override:
 *   - `true`: Request AI engine (if available)
 *   - `false`: Force heuristic engine (explicit override)
 *   - `undefined`: Use config/environment defaults
 * @returns Analysis engine instance (never null)
 *
 * @example
 * // Automatic selection based on config/env
 * const engine = createAnalysisEngine();
 *
 * @example
 * // Force heuristic (explicit override)
 * const engine = createAnalysisEngine(false);
 * // Always returns HeuristicAnalysisEngine
 *
 * @example
 * // Request AI if available
 * const engine = createAnalysisEngine(true);
 * // Returns LLMAnalysisEngine if API key configured
 * // Falls back to HeuristicAnalysisEngine if not available
 */
export function createAnalysisEngine(useAI?: boolean): AnalysisEngine {
  // EXPLICIT OVERRIDE: useAI === false always returns heuristic
  // This takes precedence over all config flags and environment variables
  if (useAI === false) {
    try {
      logger.debug(
        '[engineFactory] Engine selection override: runtime useAI=false -> HeuristicAnalysisEngine',
        {
          requestedAI: useAI,
        },
      );
    } catch {
      /* ignore logging errors */
    }
    return new HeuristicAnalysisEngine();
  }

  // Resolve full configuration from all sources
  const config = resolveEngineConfig(useAI);

  // Rate-limited debug logging (once per minute)
  try {
    const nowMinute = new Date().getMinutes();
    if (lastDebugLogMinute !== nowMinute) {
      logger.debug('[engineFactory] Engine selection', {
        requestedAI: useAI,
        resolvedEnabled: config.shouldUseAI,
        model: config.modelName,
        apiKeyPresent: config.hasApiKey,
        allowedModels: config.allowedModels,
        runtimeOverride: config.isRuntimeOverride,
        overrideDisabled: useAI === false,
      });
      lastDebugLogMinute = nowMinute;
    }
  } catch (error) {
    // Log engine selection debug failure, but don't let it crash the app
    logger.warn('[engineFactory] Engine selection debug logging failed', error as Error);
  }

  // Return appropriate engine based on resolved config
  if (config.shouldUseAI) {
    return new LLMAnalysisEngine();
  }

  return new HeuristicAnalysisEngine();
}

/**
 * Resets rate-limiting state for debug logging.
 * Useful for testing or forcing immediate debug output.
 *
 * @internal
 */
export function resetDebugLogRateLimit(): void {
  lastDebugLogMinute = null;
}
