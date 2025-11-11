import type { TrackingEntry } from '@/types/student';

export interface DateRange {
  start: Date;
  end: Date;
}

export type DataQualityBuckets = Record<'morning' | 'afternoon' | 'evening', number>;

export interface DataQualitySummary {
  total: number;
  last: Date | null;
  daysSince: number | null;
  completeness: number;
  balance: number;
  buckets: DataQualityBuckets;
  avgIntensity: number | null;
}

const ensureDate = (value: Date | string): Date =>
  value instanceof Date ? value : new Date(value);

const withinRange = (timestamp: Date, range?: DateRange): boolean => {
  if (!range) return true;
  const time = timestamp.getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
};

export const computeDataQualitySummary = (
  entries: TrackingEntry[],
  range?: DateRange,
): DataQualitySummary => {
  const normalizedEntries = Array.isArray(entries) ? entries : [];
  const filtered = normalizedEntries.filter((entry) => {
    const timestamp = ensureDate(entry.timestamp);
    return withinRange(timestamp, range);
  });

  const total = filtered.length;
  const last = total > 0 ? ensureDate(filtered[0].timestamp) : null;
  const daysSince = last
    ? Math.max(0, Math.round((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24)))
    : null;
  const completeCount = filtered.filter(
    (entry) => (entry.emotions?.length || 0) > 0 && (entry.sensoryInputs?.length || 0) > 0,
  ).length;
  const completeness = total > 0 ? Math.round((completeCount / total) * 100) : 0;

  const buckets: DataQualityBuckets = { morning: 0, afternoon: 0, evening: 0 };
  let totalIntensity = 0;
  let intensityCount = 0;

  filtered.forEach((entry) => {
    const timestamp = ensureDate(entry.timestamp);
    const hour = timestamp.getHours();
    if (hour < 12) buckets.morning += 1;
    else if (hour < 16) buckets.afternoon += 1;
    else buckets.evening += 1;

    if (entry.emotions?.length) {
      entry.emotions.forEach((emotion) => {
        if (typeof emotion.intensity === 'number') {
          totalIntensity += emotion.intensity;
          intensityCount += 1;
        }
      });
    }
  });

  const counts = Object.values(buckets);
  const max = counts.length ? Math.max(...counts) : 0;
  const min = counts.length ? Math.min(...counts) : 0;
  const balance = max > 0 ? Math.round((min / max) * 100) : 0;
  const avgIntensity = intensityCount > 0 ? totalIntensity / intensityCount : null;

  return {
    total,
    last,
    daysSince,
    completeness,
    balance,
    buckets,
    avgIntensity,
  };
};
