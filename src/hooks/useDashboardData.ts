import { useEffect, useMemo, useState } from 'react';
import { isToday, startOfWeek, endOfWeek, subWeeks, isWithinInterval } from 'date-fns';
import { dataStorage } from '@/lib/dataStorage';
import { logger } from '@/lib/logger';
import { useTranslation } from '@/hooks/useTranslation';

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
  const [students, setStudents] = useState<import('@/types/student').Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { currentLanguage } = useTranslation();

  const load = () => {
    try {
      const s = dataStorage.getStudents();
      setStudents(s);
    } catch (error) {
      logger.error('Dashboard: Error loading students', { error });
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('sensoryTracker_')) {
        load();
      }
    };
    const handleAnalyticsCacheClear = () => load();
    const handleMockDataLoaded = () => load();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('analytics:cache:clear', handleAnalyticsCacheClear as EventListener);
    window.addEventListener('mockDataLoaded', handleMockDataLoaded as EventListener);
    logger.debug('[EVENT_LISTENER] useDashboardData mounted listeners');

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('analytics:cache:clear', handleAnalyticsCacheClear as EventListener);
      window.removeEventListener('mockDataLoaded', handleMockDataLoaded as EventListener);
      logger.debug('[EVENT_LISTENER] useDashboardData removed listeners');
    };
  }, []);

  const { todayEntries, totalEntries, weeklyTrend } = useMemo(() => {
    if (students.length === 0) {
      return { todayEntries: 0, totalEntries: 0, weeklyTrend: { students: 0, entries: 0 } };
    }

    try {
      const allEntries = dataStorage.getTrackingEntries();
      const todayCount = allEntries.filter((entry) => isToday(entry.timestamp)).length;

      const now = new Date();
      const weekOptions = { weekStartsOn: (currentLanguage === 'nb' ? 1 : 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6 };
      const lastWeekStart = startOfWeek(subWeeks(now, 1), weekOptions);
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), weekOptions);
      const thisWeekStart = startOfWeek(now, weekOptions);

      const lastWeekEntries = allEntries.filter((entry) =>
        isWithinInterval(entry.timestamp, { start: lastWeekStart, end: lastWeekEnd })
      ).length;
      const thisWeekEntries = allEntries.filter((entry) =>
        isWithinInterval(entry.timestamp, { start: thisWeekStart, end: now })
      ).length;

      const entriesTrend =
        lastWeekEntries > 0
          ? ((thisWeekEntries - lastWeekEntries) / lastWeekEntries) * 100
          : thisWeekEntries > 0
            ? 100
            : 0;

      const lastWeekStudents = students.filter((s) =>
        isWithinInterval(new Date(s.createdAt), { start: lastWeekStart, end: lastWeekEnd })
      ).length;
      const thisWeekStudents = students.filter((s) =>
        isWithinInterval(new Date(s.createdAt), { start: thisWeekStart, end: now })
      ).length;
      const studentsTrend =
        lastWeekStudents > 0
          ? ((thisWeekStudents - lastWeekStudents) / lastWeekStudents) * 100
          : thisWeekStudents > 0
            ? 100
            : 0;

      return {
        todayEntries: todayCount,
        totalEntries: allEntries.length,
        weeklyTrend: { students: studentsTrend, entries: entriesTrend },
      };
    } catch (error) {
      logger.error('Dashboard: Error calculating statistics', { error });
      return { todayEntries: 0, totalEntries: 0, weeklyTrend: { students: 0, entries: 0 } };
    }
  }, [students, currentLanguage]);

  return {
    students,
    isLoading,
    todayEntries,
    totalEntries,
    weeklyTrend,
    refresh: load,
  };
};




