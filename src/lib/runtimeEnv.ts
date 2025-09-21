// Runtime env snapshot to avoid inconsistencies across modules/routes
export type ViteEnv = Record<string, unknown> & {
  VITE_OPENROUTER_API_KEY?: string;
  VITE_AI_MODEL_NAME?: string;
  VITE_AI_ANALYSIS_ENABLED?: string | boolean;
};

declare global {
   
  var __RUNTIME_ENV__: ViteEnv | undefined;
}

export function getRuntimeEnv(): ViteEnv {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.__RUNTIME_ENV__) {
      return globalThis.__RUNTIME_ENV__;
    }
    const env: ViteEnv = (import.meta.env ?? {}) as ViteEnv;
    globalThis.__RUNTIME_ENV__ = env;
    return env;
  } catch {
    return {} as ViteEnv;
  }
}

export function setRuntimeEnvFromVite(): void {
  try {
    const env: ViteEnv = (import.meta.env ?? {}) as ViteEnv;
    globalThis.__RUNTIME_ENV__ = env;
  } catch {
    // noop
  }
}

