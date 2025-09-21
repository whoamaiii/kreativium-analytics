import React, { useMemo, useRef, useCallback, memo, Suspense, lazy, useEffect } from "react";
// Unused Card components removed after refactoring
import { EmotionEntry, SensoryEntry, TrackingEntry, Student } from "@/types/student";
import { ErrorBoundary } from "./ErrorBoundary";
import { TeacherInsightsPanel } from '@/components/analysis/TeacherInsightsPanel';
import { LazyVisualization3D } from '@/components/lazy/LazyVisualization3D';
import { POC_MODE } from '@/lib/env';
import { TimelineVisualization } from './TimelineVisualization';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { useVisualizationState, VisualizationType } from '@/hooks/useVisualizationState';
import type { ChartType } from '@/hooks/useVisualizationState';
import { useFilteredData } from '@/hooks/useFilteredData';
import { useDataAnalysis } from '@/hooks/useDataAnalysis';
import { VisualizationControls } from './VisualizationControls';
import { DashboardLayout } from './layouts/DashboardLayout';
import { GridLayout, FocusLayout, ComparisonLayout } from './layouts/VisualizationLayouts';
const TrendsChartLazy = lazy(() => import('./charts/TrendsChart').then(m => ({ default: m.TrendsChart })));
const CorrelationHeatmapLazy = lazy(() => import('./analysis/CorrelationHeatmap').then(m => ({ default: m.CorrelationHeatmap })));
const PatternAnalysisViewLazy = lazy(() => import('./analysis/PatternAnalysisView').then(m => ({ default: m.PatternAnalysisView })));
const EChartContainerLazy = lazy(() => import('@/components/charts/EChartContainer').then(m => ({ default: m.EChartContainer })));
import { analyticsExport, ExportFormat } from "@/lib/analyticsExport";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useAnalyticsWorker } from '@/hooks/useAnalyticsWorker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { doOnce } from '@/lib/rateLimit';

interface InteractiveDataVisualizationProps {
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  trackingEntries: TrackingEntry[];
  studentName: string;
  preferredChartType?: ChartType;
}

// Move static data outside component to prevent recreation
const POSITIVE_EMOTIONS = ['happy', 'calm', 'focused', 'excited', 'proud'] as const;
const NEGATIVE_EMOTIONS = ['sad', 'angry', 'anxious', 'frustrated', 'overwhelmed'] as const;

export const InteractiveDataVisualization = memo<InteractiveDataVisualizationProps>(({ 
  emotions: initialEmotions, 
  sensoryInputs: initialSensoryInputs, 
  trackingEntries: initialTrackingEntries, 
  studentName,
  preferredChartType
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = React.useState(false);
  const [hasNewInsights, setHasNewInsights] = React.useState(false);
  const [autoRefresh, setAutoRefresh] = React.useState(false);
  const [pendingRefresh, setPendingRefresh] = React.useState(false);
  const refreshTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const { tAnalytics } = useTranslation();

  const safeInitialEmotions = useMemo(() => Array.isArray(initialEmotions) ? initialEmotions : [], [initialEmotions]);
  const safeInitialSensoryInputs = useMemo(() => Array.isArray(initialSensoryInputs) ? initialSensoryInputs : [], [initialSensoryInputs]);
  const safeInitialTracking = useMemo(() => Array.isArray(initialTrackingEntries) ? initialTrackingEntries : [], [initialTrackingEntries]);

  const availableEmotions = useMemo(() => Array.from(
    new Set(safeInitialEmotions.map(e => e.emotion))
  ), [safeInitialEmotions]);

  const visualizationState = useVisualizationState(availableEmotions, preferredChartType ?? 'line');
  const { layoutMode, selectedChartType, filterCriteria, highlightState } = visualizationState;

  const realtimeData = useRealtimeData(
    {
      emotions: safeInitialEmotions,
      sensoryInputs: safeInitialSensoryInputs,
      trackingEntries: safeInitialTracking
    },
    {
      enabled: filterCriteria.realtime,
      windowSize: visualizationState.selectedTimeRange === '7d' ? 7 * 24 * 60 :
                  visualizationState.selectedTimeRange === '30d' ? 30 * 24 * 60 :
                  visualizationState.selectedTimeRange === '90d' ? 90 * 24 * 60 : 0,
      updateInterval: 1000,
      smoothTransitions: true,
      simulateData: true
    }
  );

  const emotions = filterCriteria.realtime ? realtimeData.emotions : safeInitialEmotions;
  const sensoryInputs = filterCriteria.realtime ? realtimeData.sensoryInputs : safeInitialSensoryInputs;
  const trackingEntries = filterCriteria.realtime ? realtimeData.trackingEntries : safeInitialTracking;

  const filteredData = useFilteredData(
    emotions,
    sensoryInputs,
    trackingEntries,
    visualizationState.selectedTimeRange,
    filterCriteria,
    highlightState
  );

  const analysisData = useDataAnalysis(filteredData);

  // Wire analytics worker to re-run with current filteredData
  const { runAnalysis, isAnalyzing, error } = useAnalyticsWorker({ precomputeOnIdle: false });

  // Derive student context from data to scope events and align cache keys
  const currentStudentId = useMemo(() => {
    const id = filteredData.trackingEntries[0]?.studentId || (safeInitialTracking[0]?.studentId);
    return id || 'current-student';
  }, [filteredData.trackingEntries, safeInitialTracking]);
  const currentStudent = useMemo(() => ({ id: currentStudentId, name: studentName } as Student), [currentStudentId, studentName]);

  // Initial run
  useEffect(() => {
    try { runAnalysis({ entries: filteredData.trackingEntries, emotions: filteredData.emotions, sensoryInputs: filteredData.sensoryInputs } as any, { student: currentStudent }); } catch {}
  }, [filteredData.trackingEntries, filteredData.emotions, filteredData.sensoryInputs, runAnalysis, currentStudent]);

  // Listen for cache invalidations
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onClear = (ev: Event) => setHasNewInsights(true);
    const onClearStudent = (ev: Event) => {
      try {
        const ce = ev as CustomEvent<{ studentId?: string }>;
        const sid = (ce?.detail as any)?.studentId as string | undefined;
        if (!sid || sid === currentStudentId) setHasNewInsights(true);
      } catch {
        // if parsing fails, assume relevant
        setHasNewInsights(true);
      }
    };
    window.addEventListener('analytics:cache:clear', onClear);
    window.addEventListener('analytics:cache:clear:student', onClearStudent as EventListener);
    return () => {
      window.removeEventListener('analytics:cache:clear', onClear);
      window.removeEventListener('analytics:cache:clear:student', onClearStudent as EventListener);
    };
  }, [currentStudentId]);

  // Monitor realtime data counters
  const prevCountsRef = React.useRef<{ e: number; s: number; t: number }>({ e: 0, s: 0, t: 0 });
  useEffect(() => {
    const prev = prevCountsRef.current;
    const next = { e: filteredData.emotions.length, s: filteredData.sensoryInputs.length, t: filteredData.trackingEntries.length };
    if (next.e > prev.e || next.s > prev.s || next.t > prev.t) setHasNewInsights(true);
    prevCountsRef.current = next;
  }, [filteredData.emotions.length, filteredData.sensoryInputs.length, filteredData.trackingEntries.length]);

  // Auto refresh
  useEffect(() => {
    if (!hasNewInsights || !autoRefresh) return;
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = setTimeout(() => { try { handleRefresh(); } catch {} }, 1000);
    return () => { if (refreshTimeoutRef.current) { clearTimeout(refreshTimeoutRef.current); refreshTimeoutRef.current = null; } };
  }, [hasNewInsights, autoRefresh]);

  // Clear badge when analysis completes after manual refresh
  useEffect(() => {
    if (!isAnalyzing && pendingRefresh) { setHasNewInsights(false); setPendingRefresh(false); }
  }, [isAnalyzing, pendingRefresh]);

  // Rate-limited error logging
  useEffect(() => {
    if (!error) return;
    doOnce('analytics_ui_error_' + String(error), 60_000, () => {
      try { logger.error('[InteractiveDataVisualization] analytics error', { error }); } catch {}
    });
  }, [error]);

  const handleRefresh = useCallback(() => {
    setPendingRefresh(true);
    try { runAnalysis({ entries: filteredData.trackingEntries, emotions: filteredData.emotions, sensoryInputs: filteredData.sensoryInputs } as any, { student: currentStudent }); } catch {}
  }, [filteredData.trackingEntries, filteredData.emotions, filteredData.sensoryInputs, runAnalysis, currentStudent]);

  const chartData = useMemo(() => {
    interface ChartDataPoint {
      date: string;
      timestamp: Date;
      emotionCount: number;
      avgEmotionIntensity: number;
      positiveEmotions: number;
      negativeEmotions: number;
      sensorySeekingCount: number;
      sensoryAvoidingCount: number;
      totalSensoryInputs: number;
      [key: string]: string | number | Date;
    }
    // This logic to transform filteredData to chartData could also be a hook
    // For now, keeping it here for simplicity
    const dataMap = new Map<string, ChartDataPoint>();
    filteredData.emotions.forEach(emotion => {
        if (!emotion?.timestamp) return;
        const date = emotion.timestamp.toISOString().split('T')[0];
        if (!dataMap.has(date)) {
          dataMap.set(date, { date, timestamp: emotion.timestamp, emotionCount: 0, avgEmotionIntensity: 0, positiveEmotions: 0, negativeEmotions: 0, sensorySeekingCount: 0, sensoryAvoidingCount: 0, totalSensoryInputs: 0 });
        }
        const data = dataMap.get(date)!;
        data.emotionCount++;
        data.avgEmotionIntensity = ((data.avgEmotionIntensity * (data.emotionCount - 1)) + emotion.intensity) / data.emotionCount;
        if (POSITIVE_EMOTIONS.includes(emotion.emotion.toLowerCase() as any)) {
          data.positiveEmotions++;
        } else if (NEGATIVE_EMOTIONS.includes(emotion.emotion.toLowerCase() as any)) {
          data.negativeEmotions++;
        }
      });
      filteredData.sensoryInputs.forEach(sensory => {
        if (!sensory?.timestamp) return;
        const date = sensory.timestamp.toISOString().split('T')[0];
        if (!dataMap.has(date)) {
          dataMap.set(date, { date, timestamp: sensory.timestamp, emotionCount: 0, avgEmotionIntensity: 0, positiveEmotions: 0, negativeEmotions: 0, sensorySeekingCount: 0, sensoryAvoidingCount: 0, totalSensoryInputs: 0 });
        }
        const data = dataMap.get(date)!;
        data.totalSensoryInputs++;
        if (sensory.response?.toLowerCase().includes('seeking')) {
          data.sensorySeekingCount++;
        } else if (sensory.response?.toLowerCase().includes('avoiding')) {
          data.sensoryAvoidingCount++;
        }
      });
    return Array.from(dataMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredData]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      visualizationState.setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      visualizationState.setIsFullscreen(false);
    }
  }, [visualizationState]);

  const togglePictureInPicture = useCallback(() => {
    visualizationState.setIsPictureInPicture(!visualizationState.isPictureInPicture);
    toast(visualizationState.isPictureInPicture ? 'Exited picture-in-picture mode' : 'Entered picture-in-picture mode');
  }, [visualizationState]);

  const handleExport = async (format: ExportFormat) => {
    // This logic could be moved to a hook or helper
    setIsExporting(true);
    try {
      const allTimestamps = [...filteredData.emotions.map(e => e.timestamp), ...filteredData.sensoryInputs.map(s => s.timestamp), ...filteredData.trackingEntries.map(t => t.timestamp)].filter(t => t);
      let minTime = Number.MAX_SAFE_INTEGER, maxTime = Number.MIN_SAFE_INTEGER;
      for (const timestamp of allTimestamps) {
        const time = timestamp.getTime();
        if (time < minTime) minTime = time;
        if (time > maxTime) maxTime = time;
      }
      const dateRange = allTimestamps.length > 0 ? { start: new Date(minTime), end: new Date(maxTime) } : { start: new Date(), end: new Date() };
      const studentData: Student = { id: 'current-student', name: studentName, grade: '', createdAt: new Date(), baselineData: { emotionalRegulation: { averageIntensity: 5, mostCommonEmotion: 'neutral', triggerFrequency: {} }, sensoryProcessing: { seekingBehaviors: {}, avoidingBehaviors: {}, preferredSensoryInput: [] }, environmentalFactors: { optimalConditions: {}, challengingConditions: [] }, collectedDate: new Date(), collectedBy: 'System' } };
      const exportData: AnalyticsExportData = {
        student: studentData,
        dateRange,
        data: { entries: filteredData.trackingEntries, emotions: filteredData.emotions, sensoryInputs: filteredData.sensoryInputs },
        analytics: { patterns: analysisData.patterns, correlations: analysisData.correlationMatrix?.significantPairs.map(p => ({ ...p, id: crypto.randomUUID(), description: '', recommendations: [] })) || [], insights: analysisData.patterns.map(p => p.description), predictiveInsights: analysisData.predictiveInsights, anomalies: analysisData.anomalies }
      };
      await analyticsExport.exportTo(format, exportData);
      toast.success(`Interactive analytics ${format.toUpperCase()} exported successfully`);
    } catch (error) {
      logger.error('Export failed', { error });
      toast.error('Failed to export interactive analytics data');
    } finally {
      setIsExporting(false);
    }
  };

  const renderVisualization = (type: VisualizationType) => {
    switch (type) {
      case 'trends':
        if (visualizationState.projectionMode === '2d') {
          // Build a 2D scatter projection based on selected plane
          const plane = visualizationState.projectionPlane;
          const mapPoint = (p: typeof chartData[number]) => {
            const x = p.date;
            const y = plane === 'xy' ? p.avgEmotionIntensity : plane === 'xz' ? p.avgEmotionIntensity : p.totalSensoryInputs;
            return { name: p.date, value: [p.timestamp, y], avgEmotionIntensity: p.avgEmotionIntensity, totalSensoryInputs: p.totalSensoryInputs };
          };
          const data = chartData.map(mapPoint);
          const option = {
            xAxis: { type: 'time' },
            yAxis: { type: 'value', name: plane === 'yz' ? 'Sensory load' : 'Emotional energy' },
            series: [{ type: 'scatter', data, symbolSize: 8 }],
            animation: !visualizationState.motionSafe,
          } as any;
          return (
            <Suspense fallback={<div className="h-[360px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label="Loading chart" />}> 
              <EChartContainerLazy option={option} height={360} />
            </Suspense>
          );
        }
        return (
          <Suspense fallback={<div className="h-[360px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label="Loading chart" />}> 
            <TrendsChartLazy chartData={chartData} selectedChartType={selectedChartType} />
          </Suspense>
        );
      case 'correlations':
        return (
          <Suspense fallback={<div className="h-[420px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label="Loading heatmap" />}> 
            <CorrelationHeatmapLazy correlationMatrix={analysisData.correlationMatrix} onRetry={() => {}} onShowAllTime={() => visualizationState.setSelectedTimeRange('all')} />
          </Suspense>
        );
      case 'patterns':
        return (
          <Suspense fallback={<div className="h-[360px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label="Loading patterns" />}> 
            <PatternAnalysisViewLazy {...analysisData} highlightState={highlightState} handleHighlight={() => {}} filteredData={filteredData} />
          </Suspense>
        );
      case '3d':
        if (POC_MODE) return null;
        return <LazyVisualization3D emotions={filteredData.emotions} sensoryInputs={filteredData.sensoryInputs} trackingEntries={filteredData.trackingEntries} />;
      case 'timeline':
        return <TimelineVisualization emotions={filteredData.emotions} sensoryInputs={filteredData.sensoryInputs} trackingEntries={filteredData.trackingEntries} anomalies={analysisData.anomalies.map(a => ({ timestamp: a.timestamp, type: a.type, severity: a.severity }))} onTimeRangeChange={(start, end) => visualizationState.setFilterCriteria(prev => ({ ...prev, dateRange: { start, end } }))} realtime={filterCriteria.realtime} />;
      default:
        return null;
    }
  };

  return (
    <ErrorBoundary>
      <div ref={containerRef} className="space-y-6">
        <VisualizationControls
          studentName={studentName}
          isExporting={isExporting}
          availableEmotions={availableEmotions}
          filteredData={filteredData}
          realtimeData={realtimeData}
          visualizationState={visualizationState}
          toggleFullscreen={toggleFullscreen}
          togglePictureInPicture={togglePictureInPicture}
          handleExport={handleExport}
        />

        {/* New insights banner and refresh */}
        <div className="flex items-center gap-2">
          {hasNewInsights && (
            <Badge variant="default" aria-live="polite">{String(tAnalytics('insights.newInsightsAvailable', { defaultValue: 'New insights available' }))}</Badge>
          )}
          <Button
            variant={hasNewInsights || error ? 'default' : 'outline'}
            size="sm"
            onClick={handleRefresh}
            disabled={isAnalyzing}
            aria-label={String(tAnalytics('actions.refreshInsights', { defaultValue: 'Refresh insights' }))}
            title={String(tAnalytics('actions.refreshInsights', { defaultValue: 'Refresh insights' }))}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {isAnalyzing ? String(tAnalytics('states.analyzing')) : error ? String(tAnalytics('actions.retryAnalysis')) : String(tAnalytics('actions.refreshInsights', { defaultValue: 'Refresh insights' }))}
          </Button>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(v => !v)}
            aria-pressed={autoRefresh}
            aria-label={String(tAnalytics('actions.autoRefresh', { defaultValue: 'Auto refresh' }))}
          >
            {String(tAnalytics('actions.autoRefresh', { defaultValue: 'Auto refresh' }))}
          </Button>
        </div>

        {error && !isAnalyzing && (
          <div className="p-4 border border-destructive rounded-md" role="alert" aria-live="assertive">
            <p className="text-destructive font-medium mb-2">{String(tAnalytics('worker.processingFailed'))}</p>
            <p className="text-destructive mb-3">{error}</p>
            <p className="text-sm text-muted-foreground mb-4">{String(tAnalytics('worker.workerErrorDescription'))} {String(tAnalytics('worker.retryInstructions'))}</p>
            <div className="flex items-center gap-2">
              <Button variant="default" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {String(tAnalytics('actions.retryAnalysis'))}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { try { window?.location?.reload(); } catch {} }}>
                {String(tAnalytics('actions.tryAgain'))}
              </Button>
            </div>
          </div>
        )}

        {layoutMode === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 items-start">
            <DashboardLayout
              renderTrendsChart={() => renderVisualization('trends')}
              renderCorrelationHeatmap={() => renderVisualization('correlations')}
              renderPatternAnalysis={() => renderVisualization('patterns')}
              render3dVisualization={() => renderVisualization('3d')}
              renderTimeline={() => renderVisualization('timeline')}
              filteredData={filteredData}
              correlationMatrix={analysisData.correlationMatrix}
            />
            <TeacherInsightsPanel
              student={{ id: 'current-student', name: studentName, createdAt: new Date() } as any}
              filteredData={filteredData as any}
              analysis={analysisData as any}
              activePreset={visualizationState.activePreset}
              onCreateGoal={() => { /* wire later: route to goals with draft */ }}
              onAddIntervention={() => { /* wire later */ }}
              onScheduleBreak={() => { /* wire later */ }}
              onJumpToTracking={() => { /* wire later */ }}
            />
          </div>
        )}
        {layoutMode === 'grid' && <GridLayout renderVisualization={renderVisualization} selectedVisualizations={visualizationState.selectedVisualizations} />}
        {layoutMode === 'focus' && <FocusLayout renderVisualization={renderVisualization} focusedVisualization={visualizationState.focusedVisualization} />}
        {layoutMode === 'comparison' && <ComparisonLayout renderVisualization={renderVisualization} selectedVisualizations={visualizationState.selectedVisualizations} />}
      </div>
    </ErrorBoundary>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization - avoid unnecessary rerenders
  return (
    prevProps.studentName === nextProps.studentName &&
    prevProps.emotions.length === nextProps.emotions.length &&
    prevProps.sensoryInputs.length === nextProps.sensoryInputs.length &&
    prevProps.trackingEntries.length === nextProps.trackingEntries.length &&
    // Check timestamp of first entries to detect data changes
    (prevProps.emotions.length === 0 || nextProps.emotions.length === 0 ||
     prevProps.emotions[0]?.timestamp?.getTime() === nextProps.emotions[0]?.timestamp?.getTime()) &&
    (prevProps.sensoryInputs.length === 0 || nextProps.sensoryInputs.length === 0 ||
     prevProps.sensoryInputs[0]?.timestamp?.getTime() === nextProps.sensoryInputs[0]?.timestamp?.getTime()) &&
    (prevProps.trackingEntries.length === 0 || nextProps.trackingEntries.length === 0 ||
     prevProps.trackingEntries[0]?.timestamp?.getTime() === nextProps.trackingEntries[0]?.timestamp?.getTime())
  );
});

InteractiveDataVisualization.displayName = 'InteractiveDataVisualization';
