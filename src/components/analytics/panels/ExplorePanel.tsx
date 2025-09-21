import React, { Suspense, memo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LazyChartsPanel } from '@/components/lazy/LazyChartsPanel';
import { LazyPatternsPanel } from '@/components/lazy/LazyPatternsPanel';
import { LazyCorrelationsPanel } from '@/components/lazy/LazyCorrelationsPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTranslation } from '@/hooks/useTranslation';
import { useSyncedExplorePreset } from '@/hooks/useSyncedExplorePreset';
import type { ExplorePreset } from '@/types/analytics';
import type { TrackingEntry, EmotionEntry, SensoryEntry, Student } from '@/types/student';

export interface ExplorePanelProps {
  studentName: string;
  filteredData: {
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
  };
  // Optional AI flags and student context forwarded to PatternsPanel
  useAI?: boolean;
  student?: Student;
  preferredChartType?: any; // from useVisualizationState; keep loose here to avoid import cycle
}

export const ExplorePanel = memo(function ExplorePanel(props: ExplorePanelProps): React.ReactElement {
  const { tAnalytics } = useTranslation();
  const [preset, setPreset] = useSyncedExplorePreset({ paramKey: 'preset', defaultPreset: 'charts', debounceMs: 150 });

  const onValueChange = (next: string) => setPreset(next as ExplorePreset);

  return (
    <section aria-labelledby="explore-title" className="relative">
      <h2 id="explore-title" className="sr-only">{String(tAnalytics('explore.title'))}</h2>
      <Tabs value={preset} onValueChange={onValueChange} className="w-full">
        <TabsList aria-label={String(tAnalytics('aria.explore.presetTabs'))} className="mb-2">
          <TabsTrigger value="charts" aria-label={String(tAnalytics('aria.explore.chartsTab'))}>
            {String(tAnalytics('explore.presets.charts'))}
          </TabsTrigger>
          <TabsTrigger value="patterns" aria-label={String(tAnalytics('aria.explore.patternsTab'))}>
            {String(tAnalytics('explore.presets.patterns'))}
          </TabsTrigger>
          <TabsTrigger value="correlations" aria-label={String(tAnalytics('aria.explore.correlationsTab'))}>
            {String(tAnalytics('explore.presets.correlations'))}
          </TabsTrigger>
        </TabsList>

        {/* Only mount the active panel; TabsContent provides ARIA semantics and data-state for transitions */}
        {preset === 'charts' && (
          <TabsContent
            value="charts"
            className="relative data-[state=active]:opacity-100 data-[state=inactive]:opacity-0 transition-opacity duration-200"
          >
            <ErrorBoundary>
              <Suspense fallback={<div className="h-[360px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label={String(tAnalytics('explore.loadingPreset', { preset: String(tAnalytics('explore.presets.charts')) }))} />}>
                <LazyChartsPanel studentName={props.studentName} filteredData={props.filteredData} preferredChartType={props.preferredChartType} />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>
        )}

        {preset === 'patterns' && (
          <TabsContent
            value="patterns"
            className="relative data-[state=active]:opacity-100 data-[state=inactive]:opacity-0 transition-opacity duration-200"
          >
            <ErrorBoundary>
              <Suspense fallback={<div className="h-[360px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label={String(tAnalytics('explore.loadingPreset', { preset: String(tAnalytics('explore.presets.patterns')) }))} />}>
                <LazyPatternsPanel filteredData={props.filteredData} useAI={props.useAI} student={props.student} />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>
        )}

        {preset === 'correlations' && (
          <TabsContent
            value="correlations"
            className="relative data-[state=active]:opacity-100 data-[state=inactive]:opacity-0 transition-opacity duration-200"
          >
            <ErrorBoundary>
              <Suspense fallback={<div className="h-[420px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label={String(tAnalytics('explore.loadingPreset', { preset: String(tAnalytics('explore.presets.correlations')) }))} />}>
                <LazyCorrelationsPanel filteredData={props.filteredData} />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>
        )}
      </Tabs>
    </section>
  );
});


