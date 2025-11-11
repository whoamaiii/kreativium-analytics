import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

// Enable lazy, per-namespace loading using dynamic imports so Vite can
// split namespaces into manualChunks.
const namespaces = ['common', 'dashboard', 'student', 'tracking', 'analytics', 'settings'] as const;

// Use @ alias per project rules
const backend = resourcesToBackend(
  (lng: string, ns: string) => import(`@/locales/${lng}/${ns}.json`),
);

// Export the instance separately from the async initializer
export const i18n = i18next;

export async function initI18n(): Promise<typeof i18next> {
  return i18next
    .use(LanguageDetector)
    .use(backend)
    .use(initReactI18next)
    .init({
      lng: 'nb',
      fallbackLng: 'en',
      defaultNS: 'common',
      ns: namespaces as unknown as string[],
      supportedLngs: ['nb', 'en'],
      load: 'currentOnly',
      interpolation: {
        // Not needed for React, it escapes by default
        escapeValue: false,
      },
      react: {
        useSuspense: true,
      },
      detection: {
        // Persist and read the language using the agreed key
        // Only check localStorage; if missing, keep default 'nb'
        order: ['localStorage'],
        caches: ['localStorage'],
        lookupLocalStorage: 'sensoryTracker_language',
      },
    });
}
