import { useState, useEffect, useMemo, useRef, useCallback, memo, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnalyticsSettings } from "@/components/AnalyticsSettings";
import { LazyOverviewPanel } from '@/components/lazy/LazyOverviewPanel';
import { LazyExplorePanel } from '@/components/lazy/LazyExplorePanel';
import { LazyAlertsPanel } from '@/components/lazy/LazyAlertsPanel';
import {
  TrendingUp,
  Brain,
  Eye,
  BarChart3,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Settings,
  RefreshCw,
} from "lucide-react";
import { Student, TrackingEntry, EmotionEntry, SensoryEntry } from "@/types/student";
import { useAnalyticsWorker } from "@/hooks/useAnalyticsWorker";
import { analyticsManager } from "@/lib/analyticsManager";
import { useTranslation } from "@/hooks/useTranslation";
import { analyticsExport, ExportFormat } from "@/lib/analyticsExport";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { doOnce } from "@/lib/rateLimit";
import { ErrorBoundary } from "./ErrorBoundary";
import { useSyncedTabParam } from '@/hooks/useSyncedTabParam';
import { Badge } from '@/components/ui/badge';
import { useAsyncState } from '@/hooks/useAsyncState';
import { ExportDialog, type ExportOptions } from '@/components/ExportDialog';
import { FiltersDrawer } from '@/components/analytics/FiltersDrawer';
import { QuickQuestions } from '@/components/analytics/QuickQuestions';
import type { FilterCriteria } from '@/lib/filterUtils';

// Typed tab keys to avoid stringly-typed errors

// Centralized mapping of tabs to i18n keys and data-testids
// Labels come from the analytics namespace: analytics.tabs.*
// moved to ./analyticsTabs to satisfy react-refresh rule
import { TABS } from './analyticsTabs';

/**
 * @interface AnalyticsDashboardProps
 * Props for the AnalyticsDashboard component.
 * @property {Student} student - The student object for context.
 * @property {object} filteredData - The pre-filtered data to be analyzed.
 */
interface AnalyticsDashboardProps {
  student: Student;
  filteredData: {
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
  };
  useAI?: boolean;
}

/**
 * @component AnalyticsDashboard
 * 
 * A dashboard component responsible for displaying the results of a student's data analysis.
 * 
 * This component has been refactored to be primarily presentational. It offloads all
 * heavy computation to a web worker via the `useAnalyticsWorker` hook. This ensures
 * the UI remains responsive, even when analyzing large datasets.
 * 
 * It no longer handles its own data filtering; instead, it receives `filteredData`
 * as a prop from a parent component, ensuring a single source of truth.
 */
export const AnalyticsDashboard = memo(({
  student,
  filteredData = { entries: [], emotions: [], sensoryInputs: [] },
  useAI = false,
}: AnalyticsDashboardProps) => {
  // All hooks must be called at the top level, not inside try-catch
  const { tStudent, tAnalytics, tCommon } = useTranslation();
  const exportState = useAsyncState<void>(null, { autoResetMs: 1000, showErrorToast: false });
  const [exportDialogOpen, setExportDialogOpen] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const visualizationRef = useRef<HTMLDivElement>(null);
  const [hasNewInsights, setHasNewInsights] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() => false);
  const [pendingRefresh, setPendingRefresh] = useState<boolean>(false);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterCriteria>(() => ({
    dateRange: { start: null, end: null },
    emotions: { types: [], intensityRange: [0, 5], includeTriggers: [], excludeTriggers: [] },
    sensory: { types: [], responses: [], intensityRange: [0, 5] },
    environmental: {
      locations: [],
      activities: [],
      conditions: { noiseLevel: [0, 10], temperature: [-10, 40], lighting: [] },
      weather: [],
      timeOfDay: [],
    },
    patterns: { anomaliesOnly: false, minConfidence: 0, patternTypes: [] },
    realtime: false,
  }));
  
  // Always call hook at top level - hooks cannot be inside try-catch
  const { results, isAnalyzing, error, runAnalysis, invalidateCacheForStudent } = useAnalyticsWorker({ precomputeOnIdle: false });
  // Stabilize runAnalysis usage to avoid effect re-runs from changing function identity
  const runAnalysisRef = useRef(runAnalysis);
  useEffect(() => { runAnalysisRef.current = runAnalysis; }, [runAnalysis]);

  // Stabilize student reference for analytics operations to avoid
  // retriggering effects when parent passes a new object instance.
  const analyticsStudent = useMemo(() => student, [student]);

  // Derive a stable signature for filteredData so effects do not re-run on
  // mere object identity changes from parent re-renders.
  const dataSignature = useMemo(() => {
    const entries = filteredData.entries || [];
    const emotions = filteredData.emotions || [];
    const sensory = filteredData.sensoryInputs || [];
    const toTime = (v: unknown): number => {
      try {
        const dt = v instanceof Date ? v : new Date(v as string);
        return isNaN(dt.getTime()) ? 0 : dt.getTime();
      } catch {
        return 0;
      }
    };
    const first = entries[0]?.timestamp;
    const last = entries.length > 0 ? entries[entries.length - 1]?.timestamp : undefined;
    return [entries.length, emotions.length, sensory.length, toTime(first), toTime(last)].join('|');
  }, [filteredData]);

  // Shared normalization for analysis input (must be declared before first use)
  const normalizeForAnalysis = useCallback((d: typeof filteredData) => {
    const coerce = (v: unknown): Date => {
      try {
        if (v instanceof Date && !isNaN(v.getTime())) return v;
        if (typeof v === 'string' || typeof v === 'number') {
          const dt = new Date(v);
          return isNaN(dt.getTime()) ? new Date() : dt;
        }
        return new Date();
      } catch (error) {
        logger.error('Error coercing timestamp:', v, error);
        return new Date();
      }
    };
    try {
      return {
        entries: (d.entries || []).map(e => ({ ...e, timestamp: coerce(e.timestamp) })),
        emotions: (d.emotions || []).map(e => ({ ...e, timestamp: coerce(e.timestamp) })),
        sensoryInputs: (d.sensoryInputs || []).map(s => ({ ...s, timestamp: coerce(s.timestamp) })),
      };
    } catch (error) {
      logger.error('Error normalizing filteredData:', error);
      return { entries: [], emotions: [], sensoryInputs: [] };
    }
  }, []);

  // Normalize once when the signature changes to avoid churn on identity-only changes
  const normalizedData = useMemo(() => normalizeForAnalysis(filteredData), [normalizeForAnalysis, dataSignature]);

  // Dev-only guard
  const isDevSeedEnabled = useMemo(() => {
    try {
      const meta = import.meta as unknown as { env?: Record<string, unknown> };
      const env = meta.env ?? {};
      const mode = typeof env.MODE === 'string' ? env.MODE : undefined;
      return Boolean(env.DEV || mode === 'development' || env.VITE_ENABLE_DEV_SEED === 'true');
    } catch {
      return false;
    }
  }, []);

  const handleSeedDemo = useCallback(async () => {
    setIsSeeding(true);
    try {
      const mod = await import('@/lib/mock/mockSeeders');
      const { seedDemoData } = mod as typeof import('@/lib/mock/mockSeeders');
      const { totalStudentsAffected, totalEntriesCreated } = await seedDemoData({ forExistingStudents: true, createNewStudents: 1, batchesPerStudent: 1 });
      toast.success(String(tAnalytics('dev.seed.success', { students: totalStudentsAffected, entries: totalEntriesCreated })));
      // Invalidate analysis cache for this student and re-run to reflect new data if provided by parent
      invalidateCacheForStudent(student.id);
      runAnalysisRef.current(normalizedData, { useAI, student: analyticsStudent });
    } catch (e) {
      logger.error('[AnalyticsDashboard] Demo seed failed', { error: e });
      toast.error(String(tAnalytics('dev.seed.failure')));
    } finally {
      setIsSeeding(false);
    }
  }, [normalizedData, invalidateCacheForStudent, student.id, tAnalytics, useAI, analyticsStudent]);

  // (moved earlier)

  // Effect to trigger the analysis when inputs actually change.
  useEffect(() => {
    if (normalizedData && normalizedData.entries) {
      setPendingRefresh(true);
      Promise
        .resolve(runAnalysisRef.current(normalizedData, { useAI, student: analyticsStudent }))
        .finally(() => {
          // Clear badge regardless of outcome to reflect latest run
          setHasNewInsights(false);
          setPendingRefresh(false);
        });
    }
    // Ensure student analytics exists for all students, including new and mock
    if (student && typeof student.id === 'string') {
      analyticsManager.initializeStudentAnalytics(student.id);
    }
  }, [student?.id, dataSignature, useAI, analyticsStudent, normalizedData]);

  const handleCacheClear = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<{ studentId?: string } | undefined>;
    const targetStudentId = customEvent.detail?.studentId;
    if (targetStudentId) {
      if (!student || targetStudentId !== student.id) {
        return;
      }
    }
    setHasNewInsights(true);
  }, [student?.id]);

  // Listen for global/student cache clear events and surface a "new insights" indicator
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = (event: Event) => handleCacheClear(event);
    window.addEventListener('analytics:cache:clear', handler);
    window.addEventListener('analytics:cache:clear:student', handler);
    return () => {
      window.removeEventListener('analytics:cache:clear', handler);
      window.removeEventListener('analytics:cache:clear:student', handler);
    };
  }, [handleCacheClear]);

  // Detect incoming data changes to hint that insights may be outdated
  const prevCountsRef = useRef<{ entries: number; emotions: number; sensory: number }>({ entries: 0, emotions: 0, sensory: 0 });
  useEffect(() => {
    try {
      const prev = prevCountsRef.current;
      const next = {
        entries: filteredData.entries?.length || 0,
        emotions: filteredData.emotions?.length || 0,
        sensory: filteredData.sensoryInputs?.length || 0,
      };
      if (next.entries > prev.entries || next.emotions > prev.emotions || next.sensory > prev.sensory) {
        setHasNewInsights(true);
      }
      prevCountsRef.current = next;
    } catch { /* noop */ }
  }, [filteredData.entries?.length, filteredData.emotions?.length, filteredData.sensoryInputs?.length]);

  // Manual refresh helper kept near auto-refresh effect for shared logic
  const handleManualRefresh = useCallback(() => {
    setPendingRefresh(true);
    runAnalysisRef.current(normalizedData, { useAI, student: analyticsStudent });
  }, [normalizedData, useAI, analyticsStudent]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh || !hasNewInsights) return undefined;
    const timeoutId = window.setTimeout(() => {
      setPendingRefresh(true);
      runAnalysisRef.current(normalizedData, { useAI, student: analyticsStudent });
    }, 1200);
    return () => window.clearTimeout(timeoutId);
  }, [autoRefresh, hasNewInsights, normalizedData, useAI, analyticsStudent]);

  // Clear indicator when our triggered analysis completes
  useEffect(() => {
    if (!isAnalyzing && pendingRefresh) {
      setHasNewInsights(false);
      setPendingRefresh(false);
    }
  }, [isAnalyzing, pendingRefresh]);

  // Rate-limited error logging (once per minute per message)
  useEffect(() => {
    if (!error) return;
    doOnce('analytics_ui_error_' + String(error), 60_000, () => logger.error('[AnalyticsDashboard] Analytics error surfaced to user', { error }));
  }, [error]);

  // useMemo hooks to prevent re-calculating derived data on every render.
  const patterns = useMemo(() => results?.patterns || [], [results]);
  const correlations = useMemo(() => results?.correlations || [], [results]);
  const insights = useMemo(() => results?.insights || [], [results]);

  // Decouple visualization rendering from worker readiness to avoid spinners.
  // Charts render immediately using filteredData while analysis updates other tabs.

  // Export handler with useCallback for performance
  const doExport = useCallback(async (format: ExportFormat, opts?: Partial<ExportOptions>) => {
    try {
      setIsExporting(true);
      setExportProgress(5);

      await exportState.run(async () => {
        const dateRange = (() => {
          if (filteredData.entries.length === 0) {
            const now = new Date();
            return { start: now, end: now };
          }

          const [firstEntry] = filteredData.entries;
          const initial = firstEntry.timestamp instanceof Date ? firstEntry.timestamp : new Date(firstEntry.timestamp);
          const accumulator = filteredData.entries.reduce<{ minDate: Date; maxDate: Date }>((acc, entry) => {
            const rawTimestamp = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
            const timestamp = Number.isNaN(rawTimestamp.getTime()) ? acc.minDate : rawTimestamp;
            return {
              minDate: timestamp < acc.minDate ? timestamp : acc.minDate,
              maxDate: timestamp > acc.maxDate ? timestamp : acc.maxDate,
            };
          }, { minDate: initial, maxDate: initial });

          return { start: accumulator.minDate, end: accumulator.maxDate };
        })();

        setExportProgress(20);

        const collectChartExports = async () => {
          if (format !== 'pdf') return undefined;
          try {
            const { chartRegistry } = await import('@/lib/chartRegistry');
            const registrations = chartRegistry.all();
            if (registrations.length === 0) {
              toast.error(String(tAnalytics('export.noCharts')));
              return [] as Array<{ title: string; type?: string; dataURL?: string; svgString?: string }>;
            }

            const overlappingCharts = registrations
              .filter(chart => !chart.studentId || chart.studentId === student.id)
              .filter(chart => {
                if (!chart.dateRange) return true;
                const chartStart = chart.dateRange.start.getTime();
                const chartEnd = chart.dateRange.end.getTime();
                const exportStart = dateRange.start.getTime();
                const exportEnd = dateRange.end.getTime();
                return !(chartEnd < exportStart || chartStart > exportEnd);
              })
              .slice(0, 6);

            setExportProgress(40);

            const exports = await Promise.all(overlappingCharts.map(async chart => {
              const methods = chart.getMethods();
              return {
                title: chart.title,
                type: chart.type,
                dataURL: methods.getImage({ pixelRatio: 2, backgroundColor: '#ffffff' }),
                svgString: methods.getSVG(),
              };
            }));

            const usableExports = exports.filter(item => item.dataURL || item.svgString);
            if (usableExports.length === 0) {
              toast.error(String(tAnalytics('export.noCharts')));
            }
            return usableExports;
          } catch (collectError) {
            logger.error('Failed to collect chart exports', collectError);
            toast.error(String(tAnalytics('export.noCharts')));
            return [] as Array<{ title: string; type?: string; dataURL?: string; svgString?: string }>;
          }
        };

        const exportData = {
          student,
          dateRange,
          data: filteredData,
          analytics: {
            patterns,
            correlations,
            insights,
            predictiveInsights: results?.predictiveInsights || [],
            anomalies: results?.anomalies || [],
          },
          charts: format === 'pdf' && visualizationRef.current
            ? [{ element: visualizationRef.current, title: String(tAnalytics('export.chartTitle')) }]
            : undefined,
          chartExports: await collectChartExports(),
        } as const;

        setExportProgress(65);
        const pdfOptions = opts?.chartQuality ? { pdf: { chartQuality: opts.chartQuality } } : undefined;
        await analyticsExport.exportTo(format, exportData, pdfOptions);

        setExportProgress(100);

        const successMessageKey: Record<ExportFormat, string> = {
          pdf: 'export.success.pdf',
          csv: 'export.success.csv',
          json: 'export.success.json',
        };
        toast.success(String(tAnalytics(successMessageKey[format])));
      });
    } catch (error) {
      logger.error('Export failed:', error);
      toast.error(String(tAnalytics('export.failure')));
    } finally {
      setIsExporting(false);
    }
  }, [exportState, filteredData, patterns, correlations, insights, results, student, tAnalytics]);

  const handleExport = useCallback((format: ExportFormat) => {
    if (format === 'pdf') {
      setExportDialogOpen(true);
      return;
    }
    void doExport(format);
  }, [doExport]);

  // Track active tab synced with URL
  // URL-synced hook for persistence across reloads and deep links
  const [activeTab, setActiveTab] = useSyncedTabParam({ debounceMs: 150, paramKey: 'tab', defaultTab: 'overview' });

  // Live region for announcing tab changes
  const [liveMessage, setLiveMessage] = useState<string>("");
  useEffect(() => {
    try {
      logger.debug('[AnalyticsDashboard] Active tab changed', { studentId: student.id, tab: activeTab });
    } catch { void 0; }
    const current = TABS.find(t => t.key === activeTab);
    if (current) {
      const label = String(tAnalytics(current.labelKey));
      setLiveMessage(label);
    }
  }, [activeTab, tAnalytics, student?.id]);

  return (
    <ErrorBoundary>
      {/* Skip link for keyboard users */}
      <a
        href="#analytics-tabpanel"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground"
      >
        {String(tAnalytics('skipToContent'))}
      </a>
      <section role="region" aria-labelledby="analytics-dashboard-title" className="space-y-6">
      {error && !isAnalyzing && (
        <Card role="alert" aria-live="assertive" className="border-destructive">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-destructive">
              {String(tAnalytics('worker.processingFailed'))}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" aria-label={String(tAnalytics('worker.fallbackMode'))}>
                {String(tAnalytics('worker.fallbackMode'))}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-destructive mb-3">{error}</p>
            <p className="text-sm text-muted-foreground mb-4">
              {String(tAnalytics('worker.workerErrorDescription'))} {String(tAnalytics('worker.retryInstructions'))}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="default" size="sm" onClick={handleManualRefresh} aria-label={String(tAnalytics('actions.retryAnalysis'))}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {String(tAnalytics('actions.retryAnalysis'))}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { try { window?.location?.reload(); } catch {} }}>
                {String(tAnalytics('actions.tryAgain'))}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Hidden live region for announcing tab changes */}
      <div id="analytics-live-region" className="sr-only" aria-live="polite" aria-atomic="true" role="status">
        {liveMessage}
      </div>
      {/* Header card, displays the student's name and export options. */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle id="analytics-dashboard-title">
            {String(tAnalytics('dashboard.title', { name: student.name }))}
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* AI/Heuristic indicator */}
            <Badge variant={useAI ? 'default' : 'secondary'} data-testid="ai-mode-badge" aria-label={useAI ? String(tAnalytics('ai.mode.ai', { defaultValue: 'AI' })) : String(tAnalytics('ai.mode.heuristic', { defaultValue: 'Heuristic' }))}>
              {useAI ? String(tAnalytics('ai.mode.ai', { defaultValue: 'AI' })) : String(tAnalytics('ai.mode.heuristic', { defaultValue: 'Heuristic' }))}
            </Badge>
            {hasNewInsights && (
              <Badge variant="default" data-testid="new-insights-badge" aria-live="polite">
                {String(tAnalytics('insights.newInsightsAvailable', { defaultValue: 'New insights available' }))}
              </Badge>
            )}
            {isDevSeedEnabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeedDemo}
                disabled={isSeeding}
                aria-label={String(tAnalytics('dev.seed.aria'))}
                title={String(tAnalytics('dev.seed.button'))}
              >
                {isSeeding ? String(tAnalytics('dev.seed.seeding')) : String(tAnalytics('dev.seed.button'))}
              </Button>
            )}
            {hasNewInsights && (
              <Button
                variant="default"
                size="sm"
                onClick={handleManualRefresh}
                aria-label={String(tAnalytics('actions.refreshInsights', { defaultValue: 'Refresh insights' }))}
                title={String(tAnalytics('actions.refreshInsights', { defaultValue: 'Refresh insights' }))}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{String(tAnalytics('actions.refreshInsights', { defaultValue: 'Refresh insights' }))}</span>
              </Button>
            )}
            {/* Optional auto-refresh toggle */}
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(v => !v)}
              aria-pressed={autoRefresh}
              aria-label={String(tAnalytics('actions.autoRefresh', { defaultValue: 'Auto refresh' }))}
              title={String(tAnalytics('actions.autoRefresh', { defaultValue: 'Auto refresh' }))}
            >
              {String(tAnalytics('actions.autoRefresh', { defaultValue: 'Auto refresh' }))}
            </Button>
            {/* Filters toggle with active count */}
            <Button
              variant={filtersOpen ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltersOpen(true)}
              aria-label={String(tAnalytics('filters.title'))}
              title={String(tAnalytics('filters.title'))}
            >
              {String(tAnalytics('filters.title'))}
              {/* Simple active count heuristic */}
              {(() => {
                const count =
                  (filters.emotions.types.length > 0 ? 1 : 0) +
                  (filters.sensory.types.length > 0 || filters.sensory.responses.length > 0 ? 1 : 0) +
                  (filters.environmental.locations.length + filters.environmental.activities.length + filters.environmental.conditions.lighting.length + filters.environmental.weather.length + filters.environmental.timeOfDay.length > 0 ? 1 : 0) +
                  (filters.patterns.patternTypes.length > 0 || filters.patterns.anomaliesOnly || filters.patterns.minConfidence > 0 ? 1 : 0) +
                  (filters.dateRange.start || filters.dateRange.end ? 1 : 0);
                return count > 0 ? <Badge variant="secondary" className="ml-2">{count}</Badge> : null;
              })()}
            </Button>
            {/* Quick Questions */}
            <QuickQuestions
              className="hidden sm:inline-flex"
              onNavigate={(tab, preset) => {
                setActiveTab(tab);
                try {
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', tab);
                  url.searchParams.set('preset', preset);
                  window.history.replaceState(window.history.state, '', url.toString());
                } catch {}
              }}
              onFiltersApply={(criteria) => {
                setFilters(criteria);
                setFiltersOpen(false);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              aria-label={String(tCommon('settings'))}
              title={String(tCommon('settings'))}
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{String(tCommon('settings'))}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={exportState.isLoading} aria-label={String(tCommon('export'))} title={String(tCommon('export'))}>
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{exportState.isLoading ? String(tCommon('exporting')) : String(tCommon('export'))}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleExport('pdf')}
                  disabled={exportState.isLoading}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {String(tCommon('exportAsPdf'))}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport('csv')}
                  disabled={exportState.isLoading}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  {String(tCommon('exportAsCsv'))}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport('json')}
                  disabled={exportState.isLoading}
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  {String(tCommon('exportAsJson'))}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
      </Card>

      {/* Summary cards providing a quick overview of the data volume. */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{String(tAnalytics('metrics.totalSessions'))}</p>
                <p className="text-2xl font-bold">{filteredData.entries.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{String(tStudent('interface.emotionsTracked'))}</p>
                <p className="text-2xl font-bold">{filteredData.emotions.length}</p>
              </div>
              <Brain className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{String(tStudent('interface.sensoryInputs'))}</p>
                <p className="text-2xl font-bold">{filteredData.sensoryInputs.length}</p>
              </div>
              <Eye className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{String(tAnalytics('metrics.patternsFound'))}</p>
                <p className="text-2xl font-bold">{patterns.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Metadata Summary */}
      {results?.ai && (
        <Card>
          <CardContent className="pt-4" data-testid="ai-metadata">
            <div className="flex flex-wrap gap-4 text-sm">
              {results.ai.provider && (
                <div>
                  <span className="text-muted-foreground">{String(tAnalytics('ai.meta.provider', { defaultValue: 'Provider' }))}: </span>
                  <span data-testid="ai-provider">{String(results.ai.provider)}</span>
                </div>
              )}
              {results.ai.model && (
                <div>
                  <span className="text-muted-foreground">{String(tAnalytics('ai.meta.model', { defaultValue: 'Model' }))}: </span>
                  <span data-testid="ai-model">{String(results.ai.model)}</span>
                </div>
              )}
              {(results.ai.confidence?.overall != null) && (
                <div>
                  <span className="text-muted-foreground">{String(tAnalytics('ai.meta.confidence', { defaultValue: 'Confidence' }))}: </span>
                  <span data-testid="ai-confidence">{Math.round((results.ai.confidence.overall || 0) * 100)}%</span>
                </div>
              )}
              {typeof results.ai.latencyMs === 'number' && (
                <div>
                  <span className="text-muted-foreground">{String(tAnalytics('ai.meta.latency', { defaultValue: 'Latency' }))}: </span>
                  <span data-testid="ai-latency">{String(tAnalytics('ai.meta.latencyValue', { value: Math.round(results.ai.latencyMs) }))}</span>
                </div>
              )}
              {Array.isArray(results.ai.dataLineage) && results.ai.dataLineage.length > 0 && (
                <div>
                  <span className="text-muted-foreground">{String(tAnalytics('ai.meta.lineage', { defaultValue: 'Data Lineage' }))}: </span>
                  <span data-testid="ai-lineage-count">{results.ai.dataLineage.length}</span>
                </div>
              )}
              {Array.isArray(results.ai.caveats) && results.ai.caveats.length > 0 && (
                <div>
                  <span className="text-muted-foreground">{String(tAnalytics('ai.meta.caveats', { defaultValue: 'Caveats' }))}: </span>
                  <span data-testid="ai-caveats-count">{results.ai.caveats.length}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main tabbed interface for displaying detailed analysis results. */}
      <Tabs value={activeTab} onValueChange={setActiveTab as (v: string) => void} className="w-full">
        <TabsList className="grid w-full grid-cols-3 relative z-10" aria-label={String(tAnalytics('tabs.label'))}>
          {TABS.map(({ key, labelKey, testId, ariaLabelKey }) => (
            <TabsTrigger
              key={key}
              value={key}
              aria-label={ariaLabelKey ? String(tAnalytics(ariaLabelKey)) : String(tAnalytics(labelKey))}
              data-testid={testId}
            >
              {String(tAnalytics(labelKey))}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent id="analytics-tabpanel" value="overview" className="space-y-6" tabIndex={-1}>
          <div ref={visualizationRef}>
            <ErrorBoundary showToast={false}>
              <Suspense fallback={<div className="h-[360px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label={String(tAnalytics('states.analyzing'))} />}> 
                <LazyOverviewPanel studentName={student.name} filteredData={filteredData} insights={insights} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </TabsContent>

        <TabsContent value="explore" className="space-y-6" aria-busy={isAnalyzing}>
          <ErrorBoundary showToast={false}>
            <Suspense fallback={<div className="h-[280px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label={String(tAnalytics('states.analyzing'))} />}> 
              <LazyExplorePanel studentName={student.name} filteredData={filteredData} useAI={useAI} student={student} />
            </Suspense>
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <ErrorBoundary showToast={false}>
            <Suspense fallback={<div className="h-[200px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label={String(tAnalytics('states.analyzing'))} />}> 
              <LazyAlertsPanel filteredData={filteredData} studentId={student?.id ?? ''} />
            </Suspense>
          </ErrorBoundary>
        </TabsContent>
      </Tabs>

      {/* Analytics Settings Dialog */}
      {showSettings && (
        <AnalyticsSettings
          onConfigChange={() => {
            // Invalidate cache for this student when config changes
            invalidateCacheForStudent(student.id);
            // Re-run analysis with new configuration
            runAnalysis(filteredData, { useAI, student });
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
      {/* Filters Drawer */}
      <FiltersDrawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        onFiltersApply={(criteria) => {
          setFilters(criteria);
          // Optional: re-run analysis if filters impact analysis inputs (kept lightweight here)
        }}
        initialFilters={filters}
      />
      </section>
      {exportDialogOpen && (
        <ExportDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          defaultFormat="pdf"
          onConfirm={(opts) => { setExportDialogOpen(true); void doExport(opts.format, opts); }}
          inProgress={isExporting}
          progressPercent={exportProgress}
          onCancel={() => { setIsExporting(false); setExportDialogOpen(false); }}
          closeOnConfirm={false}
        />
      )}
    </ErrorBoundary>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo to prevent unnecessary re-renders
  return (
    (prevProps.student?.id ?? '') === (nextProps.student?.id ?? '') &&
    (prevProps.student?.name ?? '') === (nextProps.student?.name ?? '') &&
    prevProps.filteredData.entries.length === nextProps.filteredData.entries.length &&
    prevProps.filteredData.emotions.length === nextProps.filteredData.emotions.length &&
    prevProps.filteredData.sensoryInputs.length === nextProps.filteredData.sensoryInputs.length &&
    prevProps.useAI === nextProps.useAI &&
    // Check timestamp of first entry to detect data changes
    (prevProps.filteredData.entries.length === 0 || 
     nextProps.filteredData.entries.length === 0 ||
     (() => {
       try {
         const prevTimestamp = prevProps.filteredData.entries[0]?.timestamp;
         const nextTimestamp = nextProps.filteredData.entries[0]?.timestamp;
         
         // Handle various timestamp formats
         const prevTime = prevTimestamp instanceof Date ? prevTimestamp.getTime() : 
                          typeof prevTimestamp === 'string' || typeof prevTimestamp === 'number' ? new Date(prevTimestamp).getTime() : 0;
         const nextTime = nextTimestamp instanceof Date ? nextTimestamp.getTime() : 
                          typeof nextTimestamp === 'string' || typeof nextTimestamp === 'number' ? new Date(nextTimestamp).getTime() : 0;
         
         return prevTime === nextTime;
       } catch (error) {
         logger.error('Error comparing timestamps in AnalyticsDashboard memo:', error);
         return false;
       }
     })())
  );
});
