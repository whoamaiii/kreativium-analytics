import { useState, useEffect, useMemo, useRef, useCallback, memo, Suspense, lazy } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// Lazy-load settings to avoid pulling ML/TFJS code until needed
const AnalyticsSettings = lazy(() =>
  import('@/components/AnalyticsSettings').then((m) => ({ default: m.AnalyticsSettings })),
);
import { LazyOverviewPanel } from '@/components/lazy/LazyOverviewPanel';
import { LazyChartsPanel } from '@/components/lazy/LazyChartsPanel';
import { LazyPatternsPanel } from '@/components/lazy/LazyPatternsPanel';
import { LazyCorrelationsPanel } from '@/components/lazy/LazyCorrelationsPanel';
import { LazyAlertsPanel } from '@/components/lazy/LazyAlertsPanel';
import { LazyCalibrationDashboard } from '@/components/lazy/LazyCalibrationDashboard';
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
  Gauge,
  AlertTriangle,
} from 'lucide-react';
import { Student, TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';
import { useAnalyticsWorker } from '@/hooks/useAnalyticsWorker';
import { analyticsManager } from '@/lib/analyticsManager';
import { useTranslation } from '@/hooks/useTranslation';
import { ExportFormat } from '@/lib/analyticsExport';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { doOnce } from '@/lib/rateLimit';
import { ErrorBoundary } from './ErrorBoundary';
import { useSyncedTabParam } from '@/hooks/useSyncedTabParam';
import { Badge } from '@/components/ui/badge';
import { ExportDialog, type ExportOptions } from '@/components/ExportDialog';
import { FiltersDrawer } from '@/components/analytics/FiltersDrawer';
import { QuickQuestions } from '@/components/analytics/QuickQuestions';
import type { FilterCriteria } from '@/lib/filterUtils';
import { AnalyticsActions } from '@/components/analytics/AnalyticsActions';
// Extracted hooks for cleaner component architecture
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { useAnalyticsCache, useDataChangeDetection } from '@/hooks/useAnalyticsCache';
import { useAnalyticsExport } from '@/hooks/useAnalyticsExport';

// Typed tab keys to avoid stringly-typed errors

// Centralized mapping of tabs to i18n keys and data-testids
// Labels come from the analytics namespace: analytics.tabs.*
// moved to ./analyticsTabs to satisfy react-refresh rule
import { ANALYTICS_TABS as TABS } from '@/config/analyticsTabs';

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
export const AnalyticsDashboard = memo(
  ({
    student,
    filteredData = { entries: [], emotions: [], sensoryInputs: [] },
    useAI = false,
  }: AnalyticsDashboardProps) => {
    // All hooks must be called at the top level, not inside try-catch
    const { tStudent, tAnalytics, tCommon } = useTranslation();
    const [exportDialogOpen, setExportDialogOpen] = useState<boolean>(false);
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [isSeeding, setIsSeeding] = useState<boolean>(false);
    const visualizationRef = useRef<HTMLDivElement>(null);
    const [autoRefresh, setAutoRefresh] = useState<boolean>(() => false);
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
    const { results, isAnalyzing, error, runAnalysis, invalidateCacheForStudent } =
      useAnalyticsWorker({ precomputeOnIdle: false });
    // Stabilize runAnalysis usage to avoid effect re-runs from changing function identity
    const runAnalysisRef = useRef(runAnalysis);
    useEffect(() => {
      runAnalysisRef.current = runAnalysis;
    }, [runAnalysis]);

    // Stabilize student reference for analytics operations to avoid
    // retriggering effects when parent passes a new object instance.
    const analyticsStudent = useMemo(() => student, [student]);

    // Data normalization and signature generation (extracted hook)
    const { normalizedData, dataSignature } = useAnalyticsData({ filteredData });

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
        const { totalStudentsAffected, totalEntriesCreated } = await seedDemoData({
          forExistingStudents: true,
          createNewStudents: 1,
          batchesPerStudent: 1,
        });
        toast({
          title: String(
            tAnalytics('dev.seed.success', {
              students: totalStudentsAffected,
              entries: totalEntriesCreated,
            }),
          ),
          description: String(
            tAnalytics('dev.seed.success', {
              students: totalStudentsAffected,
              entries: totalEntriesCreated,
            }),
          ),
        });
        // Invalidate analysis cache for this student and re-run to reflect new data if provided by parent
        invalidateCacheForStudent(student.id);
        runAnalysisRef.current(normalizedData, { useAI, student: analyticsStudent });
      } catch (e) {
        logger.error('[AnalyticsDashboard] Demo seed failed', { error: e });
        toast({
          title: String(tAnalytics('dev.seed.failure')),
          description: String(tAnalytics('dev.seed.failure')),
        });
      } finally {
        setIsSeeding(false);
      }
    }, [
      normalizedData,
      invalidateCacheForStudent,
      student.id,
      tAnalytics,
      useAI,
      analyticsStudent,
    ]);

    // Cache management and refresh logic (extracted hooks)
    // Defined early so it's available to effects below
    const cacheManager = useAnalyticsCache({
      studentId: student.id,
      autoRefresh,
      autoRefreshDelayMs: 1200,
      onRefresh: () => {
        runAnalysisRef.current(normalizedData, { useAI, student: analyticsStudent });
      },
    });

    // Effect to trigger the analysis when inputs actually change.
    useEffect(() => {
      if (normalizedData && normalizedData.entries) {
        cacheManager.setPendingRefresh(true);
        Promise.resolve(
          runAnalysisRef.current(normalizedData, { useAI, student: analyticsStudent }),
        ).finally(() => {
          // Clear badge regardless of outcome to reflect latest run
          cacheManager.setHasNewInsights(false);
          cacheManager.setPendingRefresh(false);
        });
      }
      // Ensure student analytics exists for all students, including new and mock
      if (student && typeof student.id === 'string') {
        analyticsManager.initializeStudentAnalytics(student.id);
      }
    }, [student, dataSignature, useAI, analyticsStudent, normalizedData, cacheManager]);

    // Detect incoming data changes
    useDataChangeDetection({
      filteredData,
      onDataIncrease: () => {
        cacheManager.setHasNewInsights(true);
      },
    });

    // Manual refresh helper
    const handleManualRefresh = useCallback(() => {
      cacheManager.triggerRefresh();
    }, [cacheManager]);

    // Clear indicator when our triggered analysis completes
    useEffect(() => {
      if (!isAnalyzing && cacheManager.pendingRefresh) {
        cacheManager.markInsightsViewed();
      }
    }, [isAnalyzing, cacheManager]);

    // Rate-limited error logging (once per minute per message)
    useEffect(() => {
      if (!error) return;
      doOnce('analytics_ui_error_' + String(error), 60_000, () =>
        logger.error('[AnalyticsDashboard] Analytics error surfaced to user', { error }),
      );
    }, [error]);

    // useMemo hooks to prevent re-calculating derived data on every render.
    const patterns = useMemo(() => results?.patterns || [], [results]);
    const correlations = useMemo(() => results?.correlations || [], [results]);
    const insights = useMemo(() => results?.insights || [], [results]);

    // Decouple visualization rendering from worker readiness to avoid spinners.
    // Charts render immediately using filteredData while analysis updates other tabs.

    // Export management (extracted hook)
    const exportManager = useAnalyticsExport({
      student,
      filteredData,
      analyticsResults: {
        patterns,
        correlations,
        insights,
        predictiveInsights: results?.predictiveInsights,
        anomalies: results?.anomalies,
      },
      tAnalytics,
      visualizationRef,
    });

    const handleExport = useCallback(
      (format: ExportFormat) => {
        if (format === 'pdf') {
          setExportDialogOpen(true);
          return;
        }
        void exportManager.exportTo(format);
      },
      [exportManager],
    );

    // Track active tab synced with URL
    // URL-synced hook for persistence across reloads and deep links
    const [activeTab, setActiveTab] = useSyncedTabParam({
      debounceMs: 150,
      paramKey: 'tab',
      defaultTab: 'overview',
    });

    // Live region for announcing tab changes
    const [liveMessage, setLiveMessage] = useState<string>('');
    useEffect(() => {
      try {
        logger.debug('[AnalyticsDashboard] Active tab changed', {
          studentId: student.id,
          tab: activeTab,
        });
      } catch {
        void 0;
      }
      const current = TABS.find((t) => t.key === activeTab);
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
                  {String(tAnalytics('worker.workerErrorDescription'))}{' '}
                  {String(tAnalytics('worker.retryInstructions'))}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleManualRefresh}
                    aria-label={String(tAnalytics('actions.retryAnalysis'))}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {String(tAnalytics('actions.retryAnalysis'))}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      try {
                        window?.location?.reload();
                      } catch (error) {
                        logger.error('Failed to reload page', { error });
                      }
                    }}
                  >
                    {String(tAnalytics('actions.tryAgain'))}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Hidden live region for announcing tab changes */}
          <div
            id="analytics-live-region"
            className="sr-only"
            aria-live="polite"
            aria-atomic="true"
            role="status"
          >
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
                <Badge
                  variant={useAI ? 'default' : 'secondary'}
                  data-testid="ai-mode-badge"
                  aria-label={
                    useAI
                      ? String(tAnalytics('ai.mode.ai', { defaultValue: 'AI' }))
                      : String(tAnalytics('ai.mode.heuristic', { defaultValue: 'Heuristic' }))
                  }
                >
                  {useAI
                    ? String(tAnalytics('ai.mode.ai', { defaultValue: 'AI' }))
                    : String(tAnalytics('ai.mode.heuristic', { defaultValue: 'Heuristic' }))}
                </Badge>
                {cacheManager.hasNewInsights && (
                  <Badge variant="default" data-testid="new-insights-badge" aria-live="polite">
                    {String(
                      tAnalytics('insights.newInsightsAvailable', {
                        defaultValue: 'New insights available',
                      }),
                    )}
                  </Badge>
                )}
                {/* Quick Questions */}
                <QuickQuestions
                  className="hidden lg:inline-flex"
                  onNavigate={(tab, preset) => {
                    setActiveTab(tab);
                    try {
                      const url = new URL(window.location.href);
                      url.searchParams.set('tab', tab);
                      url.searchParams.set('preset', preset);
                      window.history.replaceState(window.history.state, '', url.toString());
                    } catch (error) {
                      logger.warn('Failed to update URL with tab/preset params', {
                        error,
                        tab,
                        preset,
                      });
                    }
                  }}
                  onFiltersApply={(criteria) => {
                    setFilters(criteria);
                    setFiltersOpen(false);
                  }}
                />

                {/* Consolidated Actions Component */}
                <AnalyticsActions
                  onExport={handleExport}
                  onSettings={() => setShowSettings(true)}
                  onRefresh={handleManualRefresh}
                  onFilters={() => setFiltersOpen(true)}
                  isExporting={exportManager.isExporting}
                  isAnalyzing={isAnalyzing}
                  hasNewInsights={cacheManager.hasNewInsights}
                />
              </div>
            </CardHeader>
          </Card>

          {/* Compact summary bar - single row with improved visual hierarchy */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-muted/40 to-muted/20 rounded-lg border shadow-sm">
            <div className="flex items-center gap-8 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {String(tAnalytics('metrics.sessions'))}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {filteredData.entries.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-purple-500/10">
                  <Brain className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {String(tAnalytics('metrics.emotions'))}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {filteredData.emotions.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-500/10">
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {String(tAnalytics('metrics.sensory'))}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {filteredData.sensoryInputs.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {String(tAnalytics('metrics.patterns'))}
                  </p>
                  <p className="text-2xl font-bold text-foreground">{patterns.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Metadata Summary */}
          {results?.ai && (
            <Card>
              <CardContent className="pt-4" data-testid="ai-metadata">
                <div className="flex flex-wrap gap-4 text-sm">
                  {results.ai.provider && (
                    <div>
                      <span className="text-muted-foreground">
                        {String(tAnalytics('ai.meta.provider', { defaultValue: 'Provider' }))}:{' '}
                      </span>
                      <span data-testid="ai-provider">{String(results.ai.provider)}</span>
                    </div>
                  )}
                  {results.ai.model && (
                    <div>
                      <span className="text-muted-foreground">
                        {String(tAnalytics('ai.meta.model', { defaultValue: 'Model' }))}:{' '}
                      </span>
                      <span data-testid="ai-model">{String(results.ai.model)}</span>
                    </div>
                  )}
                  {results.ai.confidence?.overall != null && (
                    <div>
                      <span className="text-muted-foreground">
                        {String(tAnalytics('ai.meta.confidence', { defaultValue: 'Confidence' }))}
                        :{' '}
                      </span>
                      <span data-testid="ai-confidence">
                        {Math.round((results.ai.confidence.overall || 0) * 100)}%
                      </span>
                    </div>
                  )}
                  {typeof results.ai.latencyMs === 'number' && (
                    <div>
                      <span className="text-muted-foreground">
                        {String(tAnalytics('ai.meta.latency', { defaultValue: 'Latency' }))}:{' '}
                      </span>
                      <span data-testid="ai-latency">
                        {String(
                          tAnalytics('ai.meta.latencyValue', {
                            value: Math.round(results.ai.latencyMs),
                          }),
                        )}
                      </span>
                    </div>
                  )}
                  {Array.isArray(results.ai.dataLineage) && results.ai.dataLineage.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">
                        {String(tAnalytics('ai.meta.lineage', { defaultValue: 'Data Lineage' }))}
                        :{' '}
                      </span>
                      <span data-testid="ai-lineage-count">{results.ai.dataLineage.length}</span>
                    </div>
                  )}
                  {Array.isArray(results.ai.caveats) && results.ai.caveats.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">
                        {String(tAnalytics('ai.meta.caveats', { defaultValue: 'Caveats' }))}:{' '}
                      </span>
                      <span data-testid="ai-caveats-count">{results.ai.caveats.length}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Flattened tabbed interface - single level navigation with enhanced visual hierarchy */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab as (v: string) => void}
            className="w-full"
          >
            <div className="flex flex-col gap-4 mb-6">
              <TabsList
                className="inline-flex h-auto w-full sm:w-auto gap-2 p-1.5 bg-muted/50 rounded-lg flex-wrap shadow-sm"
                aria-label={String(tAnalytics('tabs.label'))}
              >
                {TABS.map(({ key, labelKey, testId, ariaLabelKey }) => (
                  <TabsTrigger
                    key={key}
                    value={key}
                    aria-label={
                      ariaLabelKey ? String(tAnalytics(ariaLabelKey)) : String(tAnalytics(labelKey))
                    }
                    data-testid={testId}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:font-semibold hover:bg-background/50"
                  >
                    {key === 'overview' && <Eye className="h-4 w-4" />}
                    {key === 'charts' && <BarChart3 className="h-4 w-4" />}
                    {key === 'patterns' && <Brain className="h-4 w-4" />}
                    {key === 'correlations' && <TrendingUp className="h-4 w-4" />}
                    {key === 'alerts' && <AlertTriangle className="h-4 w-4" />}
                    {key === 'monitoring' && <Gauge className="h-4 w-4" />}
                    <span className="hidden sm:inline">{String(tAnalytics(labelKey))}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Context-aware help text */}
              <div className="text-sm text-muted-foreground hidden lg:block">
                {activeTab === 'overview' &&
                  String(
                    tAnalytics('tabs.help.overview', {
                      defaultValue: 'Quick insights and key metrics',
                    }),
                  )}
                {activeTab === 'charts' &&
                  String(
                    tAnalytics('explore.help.charts', {
                      defaultValue: 'Visual trends and patterns',
                    }),
                  )}
                {activeTab === 'patterns' &&
                  String(
                    tAnalytics('explore.help.patterns', {
                      defaultValue: 'AI-powered pattern analysis',
                    }),
                  )}
                {activeTab === 'correlations' &&
                  String(
                    tAnalytics('explore.help.correlations', {
                      defaultValue: 'Relationship insights',
                    }),
                  )}
                {activeTab === 'alerts' &&
                  String(
                    tAnalytics('tabs.help.alerts', {
                      defaultValue: 'Important patterns and notifications',
                    }),
                  )}
                {activeTab === 'monitoring' &&
                  String(
                    tAnalytics('tabs.help.monitoring', {
                      defaultValue: 'Calibration, fairness, and learning metrics',
                    }),
                  )}
              </div>
            </div>

            <TabsContent
              id="analytics-tabpanel"
              value="overview"
              className="space-y-6"
              tabIndex={-1}
            >
              <div ref={visualizationRef}>
                <ErrorBoundary showToast={false}>
                  <Suspense
                    fallback={
                      <div
                        className="h-[360px] rounded-xl border bg-card motion-safe:animate-pulse"
                        aria-label={String(tAnalytics('states.analyzing'))}
                      />
                    }
                  >
                    <LazyOverviewPanel
                      studentName={student.name}
                      filteredData={filteredData}
                      insights={insights}
                    />
                  </Suspense>
                </ErrorBoundary>
              </div>
            </TabsContent>

            <TabsContent value="charts" className="space-y-6">
              <ErrorBoundary showToast={false}>
                <Suspense
                  fallback={
                    <div
                      className="h-[360px] rounded-xl border bg-card motion-safe:animate-pulse"
                      aria-label={String(tAnalytics('states.analyzing'))}
                    />
                  }
                >
                  <LazyChartsPanel studentName={student.name} filteredData={filteredData} />
                </Suspense>
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="patterns" className="space-y-6">
              <ErrorBoundary showToast={false}>
                <Suspense
                  fallback={
                    <div
                      className="h-[360px] rounded-xl border bg-card motion-safe:animate-pulse"
                      aria-label={String(tAnalytics('states.analyzing'))}
                    />
                  }
                >
                  <LazyPatternsPanel filteredData={filteredData} useAI={useAI} student={student} />
                </Suspense>
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="correlations" className="space-y-6">
              <ErrorBoundary showToast={false}>
                <Suspense
                  fallback={
                    <div
                      className="h-[420px] rounded-xl border bg-card motion-safe:animate-pulse"
                      aria-label={String(tAnalytics('states.analyzing'))}
                    />
                  }
                >
                  <LazyCorrelationsPanel filteredData={filteredData} />
                </Suspense>
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-6">
              <ErrorBoundary showToast={false}>
                <Suspense
                  fallback={
                    <div
                      className="h-[200px] rounded-xl border bg-card motion-safe:animate-pulse"
                      aria-label={String(tAnalytics('states.analyzing'))}
                    />
                  }
                >
                  <LazyAlertsPanel filteredData={filteredData} studentId={student?.id ?? ''} />
                </Suspense>
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="monitoring" className="space-y-6">
              <ErrorBoundary showToast={false}>
                <Suspense
                  fallback={
                    <div
                      className="h-[260px] rounded-xl border bg-card motion-safe:animate-pulse"
                      aria-label={String(tAnalytics('states.loading'))}
                    />
                  }
                >
                  <LazyCalibrationDashboard />
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
            onConfirm={(opts) => {
              setExportDialogOpen(true);
              void exportManager.exportTo(opts.format, opts);
            }}
            inProgress={exportManager.isExporting}
            progressPercent={exportManager.exportProgress}
            onCancel={() => {
              exportManager.resetExport();
              setExportDialogOpen(false);
            }}
            closeOnConfirm={false}
          />
        )}
      </ErrorBoundary>
    );
  },
  (prevProps, nextProps) => {
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
            const prevTime =
              prevTimestamp instanceof Date
                ? prevTimestamp.getTime()
                : typeof prevTimestamp === 'string' || typeof prevTimestamp === 'number'
                  ? new Date(prevTimestamp).getTime()
                  : 0;
            const nextTime =
              nextTimestamp instanceof Date
                ? nextTimestamp.getTime()
                : typeof nextTimestamp === 'string' || typeof nextTimestamp === 'number'
                  ? new Date(nextTimestamp).getTime()
                  : 0;

            return prevTime === nextTime;
          } catch (error) {
            logger.error('Error comparing timestamps in AnalyticsDashboard memo:', error);
            return false;
          }
        })())
    );
  },
);
