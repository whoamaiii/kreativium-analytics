// Small, pure formatting helpers for non-React code paths
// Use UI hook useTranslation() for React components instead.

export function formatPercent(value: number, digits: number = 0, locale?: string): string {
  const safe = Number.isFinite(value) ? value : 0;
  const loc = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  return new Intl.NumberFormat(loc, {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(safe);
}

export function formatFixed(value: number, digits: number = 2, locale?: string): string {
  const safe = Number.isFinite(value) ? value : 0;
  const loc = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  return new Intl.NumberFormat(loc, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(safe);
}
