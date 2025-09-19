import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

import analyticsEn from '@/locales/en/analytics.json';
import commonEn from '@/locales/en/common.json';
import dashboardEn from '@/locales/en/dashboard.json';
import settingsEn from '@/locales/en/settings.json';
import studentEn from '@/locales/en/student.json';
import trackingEn from '@/locales/en/tracking.json';

// Mock IndexedDB for jsdom environment
const mockIndexedDB = {
  open: vi.fn().mockReturnThis(),
  transaction: vi.fn().mockReturnThis(),
  objectStore: vi.fn().mockReturnThis(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  createIndex: vi.fn(),
  onupgradeneeded: null,
  onsuccess: null,
  onerror: null,
};

(globalThis as any).indexedDB = mockIndexedDB as any;

// jsdom lacks pointer capture APIs used by Radix Select; provide minimal no-op polyfills.
if (!(Element.prototype as any).hasPointerCapture) {
  (Element.prototype as any).hasPointerCapture = () => false;
}

if (!(Element.prototype as any).setPointerCapture) {
  (Element.prototype as any).setPointerCapture = () => undefined;
}

if (!(Element.prototype as any).releasePointerCapture) {
  (Element.prototype as any).releasePointerCapture = () => undefined;
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}

type TranslationDictionary = Record<string, string>;

const flattenTranslations = (input: unknown, prefix = ''): TranslationDictionary => {
  if (input == null || typeof input !== 'object') {
    return {};
  }

  return Object.entries(input as Record<string, unknown>).reduce((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      acc[path] = value;
      return acc;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'string') {
          acc[`${path}.${index}`] = item;
        } else if (item && typeof item === 'object') {
          Object.assign(acc, flattenTranslations(item, `${path}.${index}`));
        }
      });
      return acc;
    }

    Object.assign(acc, flattenTranslations(value, path));
    return acc;
  }, {} as TranslationDictionary);
};

const translationsByNamespace: Record<string, TranslationDictionary> = {
  analytics: flattenTranslations(analyticsEn),
  common: flattenTranslations(commonEn),
  dashboard: flattenTranslations(dashboardEn),
  settings: flattenTranslations(settingsEn),
  student: flattenTranslations(studentEn),
  tracking: flattenTranslations(trackingEn),
  translation: {},
};

const interpolate = (template: string, values: Record<string, unknown>): string =>
  template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token: string) => {
    const value = values[token];
    return value == null ? '' : String(value);
  });

const createTranslator = (defaultNamespace: string | undefined) => {
  const translate = (key: string, options: Record<string, unknown> = {}): string => {
    const { ns, defaultValue, ...replacements } = options;
    const namespacesToTry = [ns as string | undefined, defaultNamespace, 'common'].filter(Boolean) as string[];

    for (const namespace of namespacesToTry) {
      const dictionary = translationsByNamespace[namespace];
      if (!dictionary) continue;
      const raw = dictionary[key];
      if (raw != null) {
        return interpolate(String(raw), replacements);
      }
    }

    if (typeof defaultValue === 'string') {
      return interpolate(defaultValue, replacements);
    }

    return interpolate(key, replacements);
  };

  const namespaced = (namespace: string) => (key: string, options?: Record<string, unknown>) =>
    translate(key, { ...options, ns: namespace });

  const formatLocale = 'en-US';

  return {
    t: translate,
    tCommon: namespaced('common'),
    tDashboard: namespaced('dashboard'),
    tStudent: namespaced('student'),
    tTracking: namespaced('tracking'),
    tAnalytics: namespaced('analytics'),
    tSettings: namespaced('settings'),
    changeLanguage: () => undefined,
    currentLanguage: 'en' as const,
    formatDate: (date: Date) =>
      new Intl.DateTimeFormat(formatLocale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date),
    formatDateTime: (date: Date) =>
      new Intl.DateTimeFormat(formatLocale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(formatLocale, options).format(value),
    formatCurrency: (value: number, currency: 'NOK' | 'USD' = 'USD') =>
      new Intl.NumberFormat(formatLocale, { style: 'currency', currency }).format(value),
    i18n: {
      language: 'en',
      changeLanguage: async () => undefined,
    },
  };
};

vi.mock('react-i18next', () => ({
  useTranslation: (namespace?: string) => ({
    t: (key: string, options?: Record<string, unknown>) =>
      createTranslator(namespace ?? 'common').t(key, options ?? {}),
    i18n: { changeLanguage: () => Promise.resolve() },
  }),
}));

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: (namespace?: string) => createTranslator(namespace),
}));

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});
