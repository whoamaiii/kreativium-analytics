import React, { Suspense, memo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LazyChartsPanel } from '@/components/lazy/LazyChartsPanel';
import { LazyPatternsPanel } from '@/components/lazy/LazyPatternsPanel';
import { LazyCorrelationsPanel } from '@/components/lazy/LazyCorrelationsPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTranslation } from '@/hooks/useTranslation';
import { useSyncedExplorePreset } from '@/hooks/useSyncedExplorePreset';
import { BarChart3, Brain, TrendingUp } from 'lucide-react';
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

export const ExplorePanel = memo(function ExplorePanel(
  props: ExplorePanelProps,
): React.ReactElement {
  const { tAnalytics } = useTranslation();
  const [preset, setPreset] = useSyncedExplorePreset({
    paramKey: 'preset',
    defaultPreset: 'charts',
    debounceMs: 150,
  });

  const onValueChange = (next: string) => setPreset(next as ExplorePreset);

  return (
    <section aria-labelledby="explore-title" className="relative">
      <h2 id="explore-title" className="sr-only">
        {String(tAnalytics('explore.title'))}
      </h2>

      {/* Compact preset selector with visual indicators */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{String(tAnalytics('explore.title'))}</h3>
          <div className="text-sm text-muted-foreground">
            {preset === 'charts' &&
              String(
                tAnalytics('explore.help.charts', { defaultValue: 'Visual trends and patterns' }),
              )}
            {preset === 'patterns' &&
              String(
                tAnalytics('explore.help.patterns', {
                  defaultValue: 'AI-powered pattern analysis',
                }),
              )}
            {preset === 'correlations' &&
              String(
                tAnalytics('explore.help.correlations', { defaultValue: 'Relationship insights' }),
              )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 p-1 bg-muted rounded-lg">
          <button
            type="button"
            onClick={() => onValueChange('charts')}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all ${
              preset === 'charts'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}
            aria-label={String(tAnalytics('aria.explore.chartsTab'))}
          >
            <BarChart3 className="h-4 w-4" />
            {String(tAnalytics('explore.presets.charts'))}
          </button>
          <button
            type="button"
            onClick={() => onValueChange('patterns')}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all ${
              preset === 'patterns'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}
            aria-label={String(tAnalytics('aria.explore.patternsTab'))}
          >
            <Brain className="h-4 w-4" />
            {String(tAnalytics('explore.presets.patterns'))}
          </button>
          <button
            type="button"
            onClick={() => onValueChange('correlations')}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all ${
              preset === 'correlations'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}
            aria-label={String(tAnalytics('aria.explore.correlationsTab'))}
          >
            <TrendingUp className="h-4 w-4" />
            {String(tAnalytics('explore.presets.correlations'))}
          </button>
        </div>
      </div>

      <Tabs value={preset} onValueChange={onValueChange} className="w-full">
        <div className="sr-only">
          <TabsList aria-label={String(tAnalytics('aria.explore.presetTabs'))}>
            <TabsTrigger value="charts" aria-label={String(tAnalytics('aria.explore.chartsTab'))}>
              {String(tAnalytics('explore.presets.charts'))}
            </TabsTrigger>
            <TabsTrigger
              value="patterns"
              aria-label={String(tAnalytics('aria.explore.patternsTab'))}
            >
              {String(tAnalytics('explore.presets.patterns'))}
            </TabsTrigger>
            <TabsTrigger
              value="correlations"
              aria-label={String(tAnalytics('aria.explore.correlationsTab'))}
            >
              {String(tAnalytics('explore.presets.correlations'))}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Only mount the active panel; TabsContent provides ARIA semantics and data-state for transitions */}
        {preset === 'charts' && (
          <TabsContent
            value="charts"
            className="relative data-[state=active]:opacity-100 data-[state=inactive]:opacity-0 transition-opacity duration-200"
          >
            <ErrorBoundary>
              <Suspense
                fallback={
                  <div
                    className="h-[360px] rounded-xl border bg-card motion-safe:animate-pulse"
                    aria-label={String(
                      tAnalytics('explore.loadingPreset', {
                        preset: String(tAnalytics('explore.presets.charts')),
                      }),
                    )}
                  />
                }
              >
                <LazyChartsPanel
                  studentName={props.studentName}
                  filteredData={props.filteredData}
                  preferredChartType={props.preferredChartType}
                />
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
              <Suspense
                fallback={
                  <div
                    className="h-[360px] rounded-xl border bg-card motion-safe:animate-pulse"
                    aria-label={String(
                      tAnalytics('explore.loadingPreset', {
                        preset: String(tAnalytics('explore.presets.patterns')),
                      }),
                    )}
                  />
                }
              >
                <LazyPatternsPanel
                  filteredData={props.filteredData}
                  useAI={props.useAI}
                  student={props.student}
                />
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
              <Suspense
                fallback={
                  <div
                    className="h-[420px] rounded-xl border bg-card motion-safe:animate-pulse"
                    aria-label={String(
                      tAnalytics('explore.loadingPreset', {
                        preset: String(tAnalytics('explore.presets.correlations')),
                      }),
                    )}
                  />
                }
              >
                <LazyCorrelationsPanel filteredData={props.filteredData} />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>
        )}
      </Tabs>
    </section>
  );
});
