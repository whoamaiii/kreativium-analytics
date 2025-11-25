import { useEffect, useMemo, useState } from 'react';
import { isToday, startOfWeek, endOfWeek, subWeeks, isWithinInterval } from 'date-fns';
import { logger } from '@/lib/logger';
import { useTranslation } from '@/hooks/useTranslation';
import type { Student, TrackingEntry } from '@/types/student';
import { useLegacyTrackingEntries } from '@/hooks/useLegacyTrackingEntries';
import { useStudents } from '@/hooks/useStorageData';
import { convertLocalStudentToLegacy } from '@/lib/adapters/legacyConverters';

export interface WeeklyTrend {
  students: number;
  entries: number;
}

export interface DashboardData {
  students: import('@/types/student').Student[];
  isLoading: boolean;
  todayEntries: number;
  totalEntries: number;
  weeklyTrend: WeeklyTrend;
  refresh: () => void;
}

/**
 * Provides dashboard data (students, KPI counts, weekly trends) and refresh wiring.
 * Centralizes storage/analytics event subscriptions and locale-aware week math.
 */
export const useDashboardData = (): DashboardData => {
  const localStudents = useStudents();
  const students = useMemo(
    () => localStudents.map((student) => convertLocalStudentToLegacy(student) as Student),
    [localStudents],
  );
  const { currentLanguage } = useTranslation();
  const [hydrated, setHydrated] = useState(false);
  const trackingEntries = useLegacyTrackingEntries();

  useEffect(() => {
    if (!hydrated) {
      setHydrated(true);
    }
  }, [hydrated, students, trackingEntries]);

  const combinedEntries = useMemo(() => {
    if (!trackingEntries.length) {
      return [] as TrackingEntry[];
    }
    return [...trackingEntries];
  }, [trackingEntries]);

  const { todayEntries, totalEntries, weeklyTrend } = useMemo(() => {
    if (students.length === 0 && combinedEntries.length === 0) {
      return { todayEntries: 0, totalEntries: 0, weeklyTrend: { students: 0, entries: 0 } };
    }

    try {
      const dataset = combinedEntries;
      const todayCount = dataset.filter((entry) => isToday(entry.timestamp)).length;

      const now = new Date();
      const weekOptions = {
        weekStartsOn: (currentLanguage === 'nb' ? 1 : 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      };
      const lastWeekStart = startOfWeek(subWeeks(now, 1), weekOptions);
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), weekOptions);
      const thisWeekStart = startOfWeek(now, weekOptions);

      const lastWeekEntries = dataset.filter((entry) =>
        isWithinInterval(entry.timestamp, { start: lastWeekStart, end: lastWeekEnd }),
      ).length;
      const thisWeekEntries = dataset.filter((entry) =>
        isWithinInterval(entry.timestamp, { start: thisWeekStart, end: now }),
      ).length;

      const entriesTrend =
        lastWeekEntries > 0
          ? ((thisWeekEntries - lastWeekEntries) / lastWeekEntries) * 100
          : thisWeekEntries > 0
            ? 100
            : 0;

      const lastWeekStudents = students.filter((s) =>
        isWithinInterval(new Date(s.createdAt), { start: lastWeekStart, end: lastWeekEnd }),
      ).length;
      const thisWeekStudents = students.filter((s) =>
        isWithinInterval(new Date(s.createdAt), { start: thisWeekStart, end: now }),
      ).length;
      const studentsTrend =
        lastWeekStudents > 0
          ? ((thisWeekStudents - lastWeekStudents) / lastWeekStudents) * 100
          : thisWeekStudents > 0
            ? 100
            : 0;

      return {
        todayEntries: todayCount,
        totalEntries: dataset.length,
        weeklyTrend: { students: studentsTrend, entries: entriesTrend },
      };
    } catch (error) {
      logger.error('Dashboard: Error calculating statistics', { error });
      return { todayEntries: 0, totalEntries: 0, weeklyTrend: { students: 0, entries: 0 } };
    }
  }, [students, currentLanguage, combinedEntries]);

  return {
    students,
    isLoading: !hydrated,
    todayEntries,
    totalEntries,
    weeklyTrend,
    refresh: () => {},
  };
};
