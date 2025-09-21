import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import { logger, LogLevel } from '@/lib/logger'
import { POC_MODE } from '@/lib/env'
import { setRuntimeEnvFromVite } from '@/lib/runtimeEnv'
import './index.css'
import { i18n, initI18n } from './i18n'
import { I18nextProvider } from 'react-i18next'
import { validateStartupConfiguration } from '@/lib/startupValidation'

// Seed a stable runtime env snapshot for all modules/routes
setRuntimeEnvFromVite();

// Dev-only: seed localStorage fallbacks so AI works even if Vite env is missing
if (import.meta.env.DEV) {
  try {
    const key = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;
    const model = import.meta.env.VITE_AI_MODEL_NAME as string | undefined;
    const ls = (k: string) => {
      try { return localStorage.getItem(k) || ''; } catch { return ''; }
    };
    if (!ls('OPENROUTER_API_KEY') && typeof key === 'string' && key.trim().length > 0) {
      localStorage.setItem('OPENROUTER_API_KEY', key.trim());
    }
    if (!ls('VITE_OPENROUTER_API_KEY') && typeof key === 'string' && key.trim().length > 0) {
      localStorage.setItem('VITE_OPENROUTER_API_KEY', key.trim());
    }
    const m = (typeof model === 'string' && model.trim().length > 0) ? model.trim() : 'openai/gpt-4o-mini';
    if (!ls('VITE_AI_MODEL_NAME')) {
      localStorage.setItem('VITE_AI_MODEL_NAME', m);
    }
  } catch {
    // ignore
  }
}

// Ensure i18n is initialized before rendering
await initI18n();

// Run startup validation (non-blocking)
try {
  void validateStartupConfiguration().then(res => {
    if (!res.isValid) {
      logger.warn('[main] Startup validation issues', { errors: res.errors, warnings: res.warnings });
    } else {
      logger.debug('[main] Startup validation ok');
    }
  }).catch(err => {
    logger.warn('[main] Startup validation failed to run', err as Error);
  });
} catch (e) {
  logger.warn('[main] Failed to initiate startup validation', e as Error);
}

createRoot(document.getElementById("root")!).render(
  <I18nextProvider i18n={i18n}>
    <App />
  </I18nextProvider>
);

// Configure logger for POC mode to minimize console noise
if (POC_MODE) {
  logger.configure({ level: LogLevel.ERROR, enableConsole: true });
}
