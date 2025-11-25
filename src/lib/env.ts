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

interface ImportMetaWithEnv {
  readonly env?: ImportMetaEnv;
}

/**
 * Safe environment variable parser that returns a fallback on error.
 * Errors are intentionally silent here since env resolution happens very early
 * before logging infrastructure is available.
 */
function safeEnvParse<T>(parser: () => T, fallback: T): T {
  try {
    return parser();
  } catch {
    // @silent-ok: env parsing errors are non-fatal, return safe default
    return fallback;
  }
}

const resolveEnv = (): ImportMetaEnv => {
  try {
    const meta = import.meta as ImportMetaWithEnv;
    if (meta && meta.env) {
      return meta.env;
    }
  } catch {
    // @silent-ok: import.meta access may fail in some environments (Node.js, SSR)
  }

  if (typeof process !== 'undefined' && process.env) {
    const nodeEnv = process.env.NODE_ENV ?? 'development';
    return {
      MODE: nodeEnv,
      PROD: nodeEnv === 'production',
      VITE_POC_MODE: process.env.VITE_POC_MODE,
      VITE_DISABLE_ANALYTICS_WORKER: process.env.VITE_DISABLE_ANALYTICS_WORKER,
      VITE_AI_ANALYSIS_ENABLED: process.env.VITE_AI_ANALYSIS_ENABLED,
      VITE_OPENROUTER_API_KEY: process.env.VITE_OPENROUTER_API_KEY,
      VITE_AI_MODEL_NAME: process.env.VITE_AI_MODEL_NAME,
      VITE_AI_BASE_URL: process.env.VITE_AI_BASE_URL,
      VITE_AI_TEMPERATURE: process.env.VITE_AI_TEMPERATURE,
      VITE_AI_MAX_TOKENS: process.env.VITE_AI_MAX_TOKENS,
      VITE_AI_LOCAL_ONLY: process.env.VITE_AI_LOCAL_ONLY,
      VITE_EXPLANATION_V2: process.env.VITE_EXPLANATION_V2,
      VITE_AI_EVIDENCE_DISABLED: process.env.VITE_AI_EVIDENCE_DISABLED,
      VITE_LOG_LEVEL: process.env.VITE_LOG_LEVEL,
      VITE_DEBUG: process.env.VITE_DEBUG,
    };
  }

  return {};
};

const env = resolveEnv();

export const POC_MODE: boolean = env.MODE === 'poc' || env.VITE_POC_MODE === 'true';

export const IS_PROD: boolean = env.PROD === true;

/**
 * Unified flag to enable development/POC visualizations in non-production builds
 * without requiring VITE_POC_MODE. True if not production or POC mode is enabled.
 */
export const DEV_VIZ_ENABLED: boolean = !IS_PROD || POC_MODE;

/**
 * Debug flag to force-disable the analytics worker and use the fallback path.
 * Set VITE_DISABLE_ANALYTICS_WORKER to '1' | 'true' | 'yes'.
 */
export const DISABLE_ANALYTICS_WORKER: boolean = safeEnvParse(() => {
  const v = (env.VITE_DISABLE_ANALYTICS_WORKER ?? '').toString().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}, false);

/**
 * AI feature flags and configuration from environment.
 * Uses Vite's `import.meta.env` with safe parsing and sensible defaults.
 */
export const AI_ANALYSIS_ENABLED: boolean = safeEnvParse(() => {
  const v = (env.VITE_AI_ANALYSIS_ENABLED ?? '').toString().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}, false);

export const OPENROUTER_API_KEY: string = safeEnvParse(() => {
  const v = env.VITE_OPENROUTER_API_KEY;
  return typeof v === 'string' ? v : '';
}, '');

export const AI_MODEL_NAME: string = safeEnvParse(() => {
  const v = env.VITE_AI_MODEL_NAME;
  return typeof v === 'string' && v.trim().length > 0 ? v : 'gpt-4o-mini';
}, 'gpt-4o-mini');

export const AI_BASE_URL: string = safeEnvParse(() => {
  const v = env.VITE_AI_BASE_URL;
  // Default to OpenRouter when unset
  return typeof v === 'string' && v.trim().length > 0 ? v : 'https://openrouter.ai/api/v1';
}, 'https://openrouter.ai/api/v1');

export const AI_TEMPERATURE: number = safeEnvParse(() => {
  const raw = env.VITE_AI_TEMPERATURE;
  const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
  if (Number.isFinite(n)) {
    // clamp to [0,2] typical range
    return Math.max(0, Math.min(2, n));
  }
  return 0.2;
}, 0.2);

export const AI_MAX_TOKENS: number = safeEnvParse(() => {
  const raw = env.VITE_AI_MAX_TOKENS;
  const n = typeof raw === 'string' ? parseInt(raw, 10) : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 1024;
}, 1024);

export const AI_LOCAL_ONLY: boolean = safeEnvParse(() => {
  const v = (env.VITE_AI_LOCAL_ONLY ?? '').toString().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}, false);

/**
 * UI flag: enable the redesigned explanation interface (tabs + composer v2).
 * Set VITE_EXPLANATION_V2 to '1' | 'true' | 'yes' to enable.
 */
export const EXPLANATION_V2_ENABLED: boolean = safeEnvParse(() => {
  const v = (env.VITE_EXPLANATION_V2 ?? '').toString().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}, false);

/**
 * Evidence injection toggle for AI analysis.
 * Set VITE_AI_EVIDENCE_DISABLED to '1' | 'true' | 'yes' to disable injecting external evidence context.
 * Defaults to false (evidence enabled).
 */
export const AI_EVIDENCE_DISABLED: boolean = safeEnvParse(() => {
  const v = (env.VITE_AI_EVIDENCE_DISABLED ?? '').toString().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}, false);

/**
 * Logging configuration from environment.
 * - VITE_LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error' | 'none'
 * - VITE_DEBUG: '1' | 'true' | 'yes' enables verbose debug logging in dev
 */
export const LOG_LEVEL_NAME: 'debug' | 'info' | 'warn' | 'error' | 'none' | null = safeEnvParse(() => {
  const raw = (env.VITE_LOG_LEVEL ?? '').toString().toLowerCase().trim();
  if (!raw) return null;
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error' || raw === 'none')
    return raw;
  return null;
}, null);

export const DEBUG_MODE: boolean = safeEnvParse(() => {
  const v = (env.VITE_DEBUG ?? '').toString().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}, false);
