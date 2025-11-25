import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WeeklyEvaluationReport } from '@/lib/alerts/types';
import { safeGet } from '@/lib/storage';

const REPORT_INDEX_KEY = 'alerts:weeklyReports:index';

function readJSON<T>(key: string): T | null {
  try {
    const raw = safeGet(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function reportKey(weekStart: string): string {
  return `alerts:weeklyReports:${weekStart}`;
}

function loadReportsFromStorage(): WeeklyEvaluationReport[] {
  const index = readJSON<string[]>(REPORT_INDEX_KEY) ?? [];
  return index
    .map((weekStart) => readJSON<WeeklyEvaluationReport>(reportKey(weekStart)))
    .filter((report): report is WeeklyEvaluationReport => !!report)
    .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime());
}

interface TrendSummary {
  metric: string;
  delta: number;
  direction: 'up' | 'down' | 'flat';
}

function computeDirection(delta: number, invert: boolean = false): 'up' | 'down' | 'flat' {
  if (Math.abs(delta) < 0.005) return 'flat';
  const positive = delta > 0;
  if (invert) {
    return positive ? 'down' : 'up';
  }
  return positive ? 'up' : 'down';
}

function calculateTrendsInternal(reports: WeeklyEvaluationReport[]): TrendSummary[] {
  if (reports.length < 2) {
    return [];
  }
  const latest = reports[reports.length - 1];
  const prev = reports[reports.length - 2];
  const trends: TrendSummary[] = [];

  if (typeof latest.ppvEstimate === 'number' && typeof prev.ppvEstimate === 'number') {
    const delta = latest.ppvEstimate - prev.ppvEstimate;
    trends.push({ metric: 'ppvEstimate', delta, direction: computeDirection(delta) });
  }
  const latestBrier = latest.calibration?.brierScore;
  const prevBrier = prev.calibration?.brierScore;
  if (typeof latestBrier === 'number' && typeof prevBrier === 'number') {
    const delta = latestBrier - prevBrier;
    trends.push({ metric: 'brierScore', delta, direction: computeDirection(delta, true) });
  }
  const latestHelpfulness = latest.helpfulnessAvg;
  const prevHelpfulness = prev.helpfulnessAvg;
  if (typeof latestHelpfulness === 'number' && typeof prevHelpfulness === 'number') {
    const delta = latestHelpfulness - prevHelpfulness;
    trends.push({ metric: 'helpfulnessAvg', delta, direction: computeDirection(delta) });
  }

  return trends;
}

export function useWeeklyReports() {
  const [reports, setReports] = useState<WeeklyEvaluationReport[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const stored = loadReportsFromStorage();
      if (!mounted.current) return;
      setReports(stored);
    } catch (err) {
      if (!mounted.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load weekly reports');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = () => load();
    window.addEventListener('alerts:weeklyReport', handler);
    return () => {
      window.removeEventListener('alerts:weeklyReport', handler);
    };
  }, [load]);

  const latestReport = useMemo(
    () => (reports.length ? reports[reports.length - 1] : null),
    [reports],
  );
  const trendSummaries = useMemo(() => calculateTrendsInternal(reports), [reports]);

  const getLatestReport = useCallback(() => latestReport, [latestReport]);
  const getReportHistory = useCallback(() => reports, [reports]);
  const calculateTrends = useCallback(() => trendSummaries, [trendSummaries]);

  return {
    reports,
    loading,
    error,
    latestReport,
    trendSummaries,
    refresh: load,
    getLatestReport,
    getReportHistory,
    calculateTrends,
  };
}

export default useWeeklyReports;
