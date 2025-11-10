// Facade module: dataTransformations
// Provides a simple API for performance tests to use. Internally maps to
// existing preprocessing/utilities. Adjust implementations as needed.

import { normalizeNumericArray } from '@/lib/dataPreprocessing';

export interface SessionData {
  id: string;
  studentId: string;
  date: string;
  duration?: number;
  progress?: number;
  tasks?: Array<{ id: string; name: string; completed: boolean; score?: number }>;
}

export const dataTransformations = {
  normalize(data: SessionData[]): SessionData[] {
    if (!Array.isArray(data) || data.length === 0) return [];
    const progressValues = data.map((d) => Number(d.progress ?? 0));
    const normalized = normalizeNumericArray(progressValues, { clampToUnit: true });
    return data.map((d, i) => ({ ...d, progress: normalized[i] ?? 0 }));
  },

  aggregate(
    data: SessionData[],
    granularity: 'daily' | 'weekly' | 'monthly' = 'daily',
  ): SessionData[] {
    if (!Array.isArray(data) || data.length === 0) return [];
    const bucket = (iso: string) => {
      const d = new Date(iso);
      if (granularity === 'monthly')
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      if (granularity === 'weekly') {
        // ISO week: approximate bucket by year-week number
        const onejan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const week = Math.ceil(
          ((d.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7,
        );
        return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
      }
      return d.toISOString().slice(0, 10);
    };

    const groups = new Map<string, SessionData[]>();
    data.forEach((item) => {
      const key = bucket(item.date);
      const arr = groups.get(key) ?? [];
      arr.push(item);
      groups.set(key, arr);
    });

    const results: SessionData[] = [];
    for (const [key, items] of groups.entries()) {
      const avgProgress =
        items.reduce((s, it) => s + Number(it.progress ?? 0), 0) / Math.max(items.length, 1);
      results.push({
        id: `agg-${key}`,
        studentId: 'aggregate',
        date: `${key}${granularity === 'daily' ? '' : ''}`,
        progress: avgProgress,
      });
    }
    return results;
  },

  filter(
    data: SessionData[],
    options: { dateRange?: { start: Date; end: Date }; minProgress?: number },
  ): SessionData[] {
    if (!Array.isArray(data) || data.length === 0) return [];
    const { dateRange, minProgress } = options || {};
    return data.filter((d) => {
      const t = new Date(d.date).getTime();
      const inRange =
        !dateRange || (t >= dateRange.start.getTime() && t <= dateRange.end.getTime());
      const meetsProgress = minProgress == null || Number(d.progress ?? 0) >= minProgress;
      return inRange && meetsProgress;
    });
  },
};

export type DataTransformations = typeof dataTransformations;
