/**
 * Shared environment helpers
 */
interface ImportMetaEnv {
  readonly MODE?: string;
  readonly PROD?: boolean;
  readonly VITE_POC_MODE?: string;
  readonly VITE_DISABLE_ANALYTICS_WORKER?: string;
  readonly VITE_AI_ANALYSIS_ENABLED?: string;
  readonly VITE_OPENROUTER_API_KEY?: string;
  readonly VITE_AI_MODEL_NAME?: string;
  readonly VITE_AI_BASE_URL?: string;
  readonly VITE_AI_TEMPERATURE?: string;
  readonly VITE_AI_MAX_TOKENS?: string;
  readonly VITE_AI_LOCAL_ONLY?: string;
  readonly VITE_EXPLANATION_V2?: string;
  readonly VITE_AI_EVIDENCE_DISABLED?: string;
  readonly VITE_LOG_LEVEL?: string;
  readonly VITE_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

const env = (import.meta as ImportMeta).env;

export const POC_MODE: boolean = (
  env.MODE === 'poc' ||
  env.VITE_POC_MODE === 'true'
);

export const IS_PROD: boolean = env.PROD === true;

/**
 * Debug flag to force-disable the analytics worker and use the fallback path.
 * Set VITE_DISABLE_ANALYTICS_WORKER to '1' | 'true' | 'yes'.
 */
export const DISABLE_ANALYTICS_WORKER: boolean = (() => {
  try {
    const v = (env.VITE_DISABLE_ANALYTICS_WORKER ?? '').toString().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  } catch {
    return false;
  }
})();

/**
 * AI feature flags and configuration from environment.
 * Uses Vite's `import.meta.env` with safe parsing and sensible defaults.
 */
export const AI_ANALYSIS_ENABLED: boolean = (() => {
  try {
    const v = (env.VITE_AI_ANALYSIS_ENABLED ?? '').toString().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  } catch {
    return false;
  }
})();

export const OPENROUTER_API_KEY: string = (() => {
  try {
    const v = env.VITE_OPENROUTER_API_KEY;
    return typeof v === 'string' ? v : '';
  } catch {
    return '';
  }
})();

export const AI_MODEL_NAME: string = (() => {
  try {
    const v = env.VITE_AI_MODEL_NAME;
    return typeof v === 'string' && v.trim().length > 0 ? v : 'gpt-4o-mini';
  } catch {
    return 'gpt-4o-mini';
  }
})();

export const AI_BASE_URL: string = (() => {
  try {
    const v = env.VITE_AI_BASE_URL;
    // Default to OpenRouter when unset
    return typeof v === 'string' && v.trim().length > 0 ? v : 'https://openrouter.ai/api/v1';
  } catch {
    return 'https://openrouter.ai/api/v1';
  }
})();

export const AI_TEMPERATURE: number = (() => {
  try {
    const raw = env.VITE_AI_TEMPERATURE;
    const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
    if (Number.isFinite(n)) {
      // clamp to [0,2] typical range
      return Math.max(0, Math.min(2, n));
    }
    return 0.2;
  } catch {
    return 0.2;
  }
})();

export const AI_MAX_TOKENS: number = (() => {
  try {
    const raw = env.VITE_AI_MAX_TOKENS;
    const n = typeof raw === 'string' ? parseInt(raw, 10) : Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 1024;
  } catch {
    return 1024;
  }
})();

export const AI_LOCAL_ONLY: boolean = (() => {
  try {
    const v = (env.VITE_AI_LOCAL_ONLY ?? '').toString().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  } catch {
    return false;
  }
})();

/**
 * UI flag: enable the redesigned explanation interface (tabs + composer v2).
 * Set VITE_EXPLANATION_V2 to '1' | 'true' | 'yes' to enable.
 */
export const EXPLANATION_V2_ENABLED: boolean = (() => {
  try {
    const v = (env.VITE_EXPLANATION_V2 ?? '').toString().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  } catch {
    return false;
  }
})();

/**
 * Evidence injection toggle for AI analysis.
 * Set VITE_AI_EVIDENCE_DISABLED to '1' | 'true' | 'yes' to disable injecting external evidence context.
 * Defaults to false (evidence enabled).
 */
export const AI_EVIDENCE_DISABLED: boolean = (() => {
  try {
    const v = (env.VITE_AI_EVIDENCE_DISABLED ?? '').toString().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  } catch {
    return false;
  }
})();

/**
 * Logging configuration from environment.
 * - VITE_LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error' | 'none'
 * - VITE_DEBUG: '1' | 'true' | 'yes' enables verbose debug logging in dev
 */
export const LOG_LEVEL_NAME: 'debug' | 'info' | 'warn' | 'error' | 'none' | null = (() => {
  try {
    const raw = (env.VITE_LOG_LEVEL ?? '').toString().toLowerCase().trim();
    if (!raw) return null;
    if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error' || raw === 'none') return raw;
    return null;
  } catch {
    return null;
  }
})();

export const DEBUG_MODE: boolean = (() => {
  try {
    const v = (env.VITE_DEBUG ?? '').toString().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  } catch {
    return false;
  }
})();
