import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useCallback, useMemo } from 'react';
import { logger } from '@/lib/logger';
import { STORAGE_KEYS } from '@/lib/storage/keys';

const namespace = 'common';
const missingTranslationKeysLogged = new Set<string>();

// Define the complete return type interface
interface TranslationHookReturn {
  t: (key: string, options?: Record<string, unknown>) => string;
  tCommon: (key: string, options?: Record<string, unknown>) => string;
  tDashboard: (key: string, options?: Record<string, unknown>) => string;
  tStudent: (key: string, options?: Record<string, unknown>) => string;
  tTracking: (key: string, options?: Record<string, unknown>) => string;
  tAnalytics: (key: string, options?: Record<string, unknown>) => string;
  tSettings: (key: string, options?: Record<string, unknown>) => string;
  changeLanguage: (lng: 'nb' | 'en') => void;
  currentLanguage: 'nb' | 'en';
  formatDate: (date: Date) => string;
  formatDateTime: (date: Date) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, currency?: 'NOK' | 'USD') => string;
  i18n: any;
}

// Type-safe translation hook with Norwegian context
export const useTranslation = (): TranslationHookReturn => {
  const { t, i18n } = useI18nTranslation(namespace);

  const guardedT = useCallback((key: string, options?: Record<string, unknown>) => {
    const result = t(key, options);
    const nsOption = (options as { ns?: string } | undefined)?.ns;
    const effectiveNamespace = typeof nsOption === 'string' ? nsOption : namespace;
    const fullKey = effectiveNamespace ? `${effectiveNamespace}:${key}` : key;

    if (result === key && !missingTranslationKeysLogged.has(fullKey)) {
      missingTranslationKeysLogged.add(fullKey);
      logger.warn('Missing translation key', { key: fullKey });
    }

    return result;
  }, [t]);

  const changeLanguage = useCallback((lng: 'nb' | 'en') => {
    i18n.changeLanguage(lng);
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lng);
  }, [i18n]);

  const currentLanguage = (i18n.language as 'nb' | 'en') || 'nb';
  const locale = currentLanguage === 'nb' ? 'nb-NO' : 'en-US';

  // Helper functions for common translations
  const tCommon = useCallback((key: string, options?: Record<string, unknown>) => guardedT(key, { ns: 'common', ...options }), [guardedT]);
  const tDashboard = useCallback((key: string, options?: Record<string, unknown>) => guardedT(key, { ns: 'dashboard', ...options }), [guardedT]);
  const tStudent = useCallback((key: string, options?: Record<string, unknown>) => guardedT(key, { ns: 'student', ...options }), [guardedT]);
  const tTracking = useCallback((key: string, options?: Record<string, unknown>) => guardedT(key, { ns: 'tracking', ...options }), [guardedT]);
  const tAnalytics = useCallback((key: string, options?: Record<string, unknown>) => guardedT(key, { ns: 'analytics', ...options }), [guardedT]);
  const tSettings = useCallback((key: string, options?: Record<string, unknown>) => guardedT(key, { ns: 'settings', ...options }), [guardedT]);

  // Locale-aware date/time formatting
  const formatDate = useCallback((date: Date): string => {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }, [locale]);

  const formatDateTime = useCallback((date: Date): string => {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }, [locale]);

  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions): string => {
    return new Intl.NumberFormat(locale, options).format(value);
  }, [locale]);

  const formatCurrency = useCallback((value: number, currency: 'NOK' | 'USD' = currentLanguage === 'nb' ? 'NOK' : 'USD'): string => {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
  }, [locale, currentLanguage]);

  // Include i18n in deps to ensure fresh reference
  return useMemo(() => ({
    t: guardedT,
    tCommon,
    tDashboard,
    tStudent,
    tTracking,
    tAnalytics,
    tSettings,
    changeLanguage,
    currentLanguage,
    formatDate,
    formatDateTime,
    formatNumber,
    formatCurrency,
    i18n,
  }), [guardedT, tCommon, tDashboard, tStudent, tTracking, tAnalytics, tSettings, changeLanguage, currentLanguage, formatDate, formatDateTime, formatNumber, formatCurrency, i18n]);
};
