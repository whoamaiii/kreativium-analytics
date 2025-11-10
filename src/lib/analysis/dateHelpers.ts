import { subMonths, subYears, format as formatDate } from 'date-fns';
import type { TimeRange } from '@/lib/analysis/analysisEngine';

function ensureDate(input: Date | string): Date {
  return input instanceof Date ? input : new Date(input);
}

export type ComparisonMode = 'previous' | 'lastMonth' | 'lastYear';

/**
 * Compute a baseline comparison range from a current range and mode.
 * - previous: shifts the current range back by its duration
 * - lastMonth: shifts start and end by exactly one calendar month
 * - lastYear: shifts start and end by exactly one calendar year
 */
export function computeComparisonRange(currentRange: TimeRange, mode: ComparisonMode): TimeRange {
  const start = ensureDate(currentRange.start);
  const end = ensureDate(currentRange.end);
  const tz = currentRange.timezone;

  if (mode === 'previous') {
    const durationMs = Math.max(0, end.getTime() - start.getTime());
    const baselineStart = new Date(start.getTime() - durationMs);
    const baselineEnd = new Date(end.getTime() - durationMs);
    return { start: baselineStart, end: baselineEnd, timezone: tz };
  }

  if (mode === 'lastMonth') {
    return {
      start: subMonths(start, 1),
      end: subMonths(end, 1),
      timezone: tz,
    };
  }

  // lastYear
  return {
    start: subYears(start, 1),
    end: subYears(end, 1),
    timezone: tz,
  };
}

/**
 * Formats a human-friendly Norwegian label for a comparison period.
 * Example: "01.03.2025 – 31.03.2025 (Forrige periode)"
 */
export function formatComparisonPeriodLabel(range: TimeRange, mode: ComparisonMode): string {
  const start = ensureDate(range.start);
  const end = ensureDate(range.end);
  const period = `${formatDate(start, 'dd.MM.yyyy')} – ${formatDate(end, 'dd.MM.yyyy')}`;

  const suffix =
    mode === 'previous'
      ? 'Forrige periode'
      : mode === 'lastMonth'
        ? 'Samme periode forrige måned'
        : 'Samme periode i fjor';

  return `${period} (${suffix})`;
}
