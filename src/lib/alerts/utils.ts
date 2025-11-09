import { AlertKind } from '@/lib/alerts/types';
import { TrendPoint } from '@/lib/alerts/detectors/ewma';
import { MAX_ALERT_SERIES_LENGTH } from '@/constants/analytics';

/**
 * Normalize arbitrary timestamps to epoch milliseconds.
 * Returns null for invalid inputs instead of throwing.
 *
 * @param ts - The timestamp to normalize (Date, number, string, or undefined)
 * @returns Normalized timestamp in milliseconds since epoch, or null if invalid
 *
 * @example
 * normalizeTimestamp(new Date('2024-01-01')) // => 1704067200000
 * normalizeTimestamp(1704067200000) // => 1704067200000
 * normalizeTimestamp('2024-01-01') // => 1704067200000
 * normalizeTimestamp(undefined) // => null
 * normalizeTimestamp('invalid') // => null
 */
export function normalizeTimestamp(ts: Date | number | string | undefined): number | null {
  if (!ts) return null;
  const date = new Date(ts);
  const value = date.getTime();
  if (Number.isFinite(value)) return value;
  return null;
}

/**
 * Fast, stable, low-collision ID for an alert candidate.
 * Uses FNV-1a style hash algorithm for stable ID generation.
 *
 * @param studentId - The student identifier
 * @param kind - The alert kind/type
 * @param label - The alert label/description
 * @param timestamp - The alert timestamp in milliseconds
 * @returns A stable, collision-resistant alert ID with 'alert_' prefix
 *
 * @example
 * buildAlertId('student_123', AlertKind.BehaviorSpike, 'anxiety', 1704067200000)
 * // => 'alert_abc123xyz'
 */
export function buildAlertId(studentId: string, kind: AlertKind, label: string, timestamp: number): string {
  const base = `${studentId}|${kind}|${label}|${timestamp}`;
  let hash = 2166136261;
  for (let i = 0; i < base.length; i += 1) {
    hash ^= base.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return `alert_${(hash >>> 0).toString(36)}`;
}

/**
 * Truncate a time series to the most recent `limit` points (stable memory bound).
 * Ensures time series data structures stay within memory constraints by keeping
 * only the most recent data points.
 *
 * @param series - The time series data to truncate
 * @param limit - Maximum number of points to keep (defaults to MAX_ALERT_SERIES_LENGTH)
 * @returns Truncated series containing only the most recent points
 *
 * @example
 * const longSeries = [...Array(1000)].map((_, i) => ({ timestamp: i, value: i }));
 * const truncated = truncateSeries(longSeries, 100); // Returns last 100 points
 * truncated.length // => 100
 */
export function truncateSeries(series: TrendPoint[], limit: number = MAX_ALERT_SERIES_LENGTH): TrendPoint[] {
  if (series.length <= limit) return series;
  return series.slice(series.length - limit);
}
