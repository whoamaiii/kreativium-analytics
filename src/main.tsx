import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { logger, LogLevel } from '@/lib/logger';
import { POC_MODE } from '@/lib/env';
import { setRuntimeEnvFromVite } from '@/lib/runtimeEnv';
import './index.css';
import { i18n, initI18n } from './i18n';
import { I18nextProvider } from 'react-i18next';
import { validateStartupConfiguration } from '@/lib/startupValidation';
import { WeeklyAlertMetrics, scheduleWeeklyTask } from '@/lib/monitoring/weeklyAlertMetrics';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { ensureSessionAnalyticsBridge } from '@/lib/adapters/sessionCacheBridge';
import { runStorageMigration } from '@/lib/storage/migration';

// Seed a stable runtime env snapshot for all modules/routes
setRuntimeEnvFromVite();
ensureSessionAnalyticsBridge();

// Run storage migration (sensoryTracker_* -> kreativium.local::*)
// This is idempotent and only runs once
runStorageMigration();

// Dev-only: seed localStorage fallbacks so AI works even if Vite env is missing
if (import.meta.env.DEV) {
  try {
    const key = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;
    const model = import.meta.env.VITE_AI_MODEL_NAME as string | undefined;
    const ls = (k: string) => {
      try {
        return localStorage.getItem(k) || '';
      } catch {
        return '';
      }
    };
    if (!ls(STORAGE_KEYS.OPENROUTER_API_KEY) && typeof key === 'string' && key.trim().length > 0) {
      localStorage.setItem(STORAGE_KEYS.OPENROUTER_API_KEY, key.trim());
    }
    if (
      !ls(STORAGE_KEYS.VITE_OPENROUTER_API_KEY) &&
      typeof key === 'string' &&
      key.trim().length > 0
    ) {
      localStorage.setItem(STORAGE_KEYS.VITE_OPENROUTER_API_KEY, key.trim());
    }
    const m =
      typeof model === 'string' && model.trim().length > 0 ? model.trim() : 'openai/gpt-4o-mini';
    if (!ls(STORAGE_KEYS.AI_MODEL_NAME)) {
      localStorage.setItem(STORAGE_KEYS.AI_MODEL_NAME, m);
    }
  } catch {
    // ignore
  }
}

// Ensure i18n is initialized before rendering
await initI18n();

// Run startup validation (non-blocking)
try {
  void validateStartupConfiguration()
    .then((res) => {
      if (!res.isValid) {
        logger.warn('[main] Startup validation issues', {
          errors: res.errors,
          warnings: res.warnings,
        });
      } else {
        logger.debug('[main] Startup validation ok');
      }
    })
    .catch((err) => {
      logger.warn('[main] Startup validation failed to run', err as Error);
    });
} catch (e) {
  logger.warn('[main] Failed to initiate startup validation', e as Error);
}

if (typeof window !== 'undefined') {
  const win = window as typeof window & {
    __alertsWeeklyMetricsCleanup?: () => void;
    __alertsWeeklyMetricsBootstrapped?: boolean;
  };

  if (win.__alertsWeeklyMetricsCleanup) {
    try {
      win.__alertsWeeklyMetricsCleanup();
    } catch {}
    win.__alertsWeeklyMetricsCleanup = undefined;
    win.__alertsWeeklyMetricsBootstrapped = false;
  }

  if (!win.__alertsWeeklyMetricsBootstrapped) {
    const metrics = new WeeklyAlertMetrics();
    try {
      metrics.runWeeklyEvaluation();
    } catch (error) {
      logger.warn('[main] Failed to run initial weekly alert evaluation', error as Error);
    }

    let stopTask: (() => void) | undefined;
    try {
      stopTask = scheduleWeeklyTask(() => {
        try {
          metrics.runWeeklyEvaluation();
        } catch (error) {
          logger.warn('[main] Scheduled weekly evaluation failed', error as Error);
        }
      });
    } catch (error) {
      logger.warn('[main] Failed to schedule weekly alert evaluation', error as Error);
    }

    const beforeUnloadHandler = () => {
      try {
        stopTask?.();
      } catch {}
    };

    window.addEventListener('beforeunload', beforeUnloadHandler);

    win.__alertsWeeklyMetricsCleanup = () => {
      try {
        stopTask?.();
      } catch {}
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      win.__alertsWeeklyMetricsBootstrapped = false;
    };
    win.__alertsWeeklyMetricsBootstrapped = true;

    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        try {
          win.__alertsWeeklyMetricsCleanup?.();
        } catch {}
        win.__alertsWeeklyMetricsCleanup = undefined;
        win.__alertsWeeklyMetricsBootstrapped = false;
      });
    }
    // Register Service Worker for offline caching of models/static assets
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }
    } catch {}
  }
}

createRoot(document.getElementById('root')!).render(
  <I18nextProvider i18n={i18n}>
    <App />
  </I18nextProvider>,
);

// Configure logger for POC mode to minimize console noise
if (POC_MODE) {
  logger.configure({ level: LogLevel.ERROR, enableConsole: true });
}
