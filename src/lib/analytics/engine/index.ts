/**
 * @module analytics/engine
 * @description Analytics engine factory and configuration utilities.
 *
 * This module provides centralized engine creation with intelligent AI/Heuristic selection.
 *
 * **Main Exports**:
 * - `createAnalysisEngine` - Factory function for creating engines
 * - `resolveEngineConfig` - Config resolution for advanced use cases
 * - Config utilities for custom implementations
 *
 * **Usage**:
 * ```typescript
 * import { createAnalysisEngine } from '@/lib/analytics/engine';
 *
 * // Automatic selection
 * const engine = createAnalysisEngine();
 *
 * // Explicit override
 * const heuristicEngine = createAnalysisEngine(false);
 * ```
 */

export { createAnalysisEngine, resetDebugLogRateLimit } from './engineFactory';
export {
  resolveEngineConfig,
  validateModel,
  toBooleanValue,
  getEnvAIEnabled,
  getEnvModelName,
  getEnvApiKey,
  type ResolvedEngineConfig,
} from './engineConfig';
