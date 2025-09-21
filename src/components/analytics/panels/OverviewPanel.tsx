import React, { Suspense, memo, useMemo, useEffect, useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTranslation } from '@/hooks/useTranslation';
import { LazyChartsPanel } from '@/components/lazy/LazyChartsPanel';
import type { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import type { ChartType } from '@/hooks/useVisualizationState';
import { useAnalyticsWorker } from '@/hooks/useAnalyticsWorker';
import { stableKeyFromPattern } from '@/lib/key';
import type { PatternResult } from '@/lib/patternAnalysis';
import { Card, CardContent } from '@/components/ui/card';
import { useSyncedTabParam } from '@/hooks/useSyncedTabParam';
import { useSyncedExplorePreset } from '@/hooks/useSyncedExplorePreset';
import { useSyncedPatternParams } from '@/hooks/useSyncedPatternParams';

export interface OverviewPanelProps {
  studentName: string;
  filteredData: {
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
  };
  insights?: string[];
}

function determineOptimalChartType(filteredData: OverviewPanelProps['filteredData']): ChartType {
  // Time series detection: at least 3 distinct days across any timestamps
  const timestamps: Date[] = [];
  for (const e of filteredData.emotions) if (e?.timestamp) timestamps.push(e.timestamp);
  for (const s of filteredData.sensoryInputs) if (s?.timestamp) timestamps.push(s.timestamp);
  for (const t of filteredData.entries) if (t?.timestamp) timestamps.push(t.timestamp);
  const dayKeys = new Set<string>();
  for (const ts of timestamps) {
    try { dayKeys.add(ts.toISOString().split('T')[0]); } catch {}
  }
  if (dayKeys.size >= 3) return 'line';

  // Categorical diversity: unique types across emotions/sensory
  const emotionTypes = new Set<string>(filteredData.emotions.map(e => (e?.emotion || '').toLowerCase()).filter(Boolean));
  const sensoryTypes = new Set<string>(filteredData.sensoryInputs.map(s => (s?.sensoryType || s?.type || '').toLowerCase()).filter(Boolean));
  const totalCategories = new Set<string>([...emotionTypes, ...sensoryTypes]);
  if (totalCategories.size >= 3) return 'area';

  // Fallback: composed for mixed/unknown, else line as ultimate fallback
  return 'composed';
}

export const OverviewPanel = memo(function OverviewPanel({ studentName, filteredData, insights }: OverviewPanelProps): React.ReactElement {
  const { tAnalytics } = useTranslation();
  const { results, runAnalysis } = useAnalyticsWorker({ precomputeOnIdle: false });
  const [topPatterns, setTopPatterns] = useState<PatternResult[]>([]);
  const [, setTab] = useSyncedTabParam();
  const [, setPreset] = useSyncedExplorePreset();
  const { setPatternId, setExplain } = useSyncedPatternParams();

  const optimalChartType = useMemo(() => determineOptimalChartType(filteredData), [filteredData]);

  const topInsights = useMemo(() => {
    const list = Array.isArray(insights) ? insights.filter(Boolean) : [];
    return list.slice(0, 2);
  }, [insights]);

  // Run lightweight pattern analysis for overview when data changes
  useEffect(() => {
    try { runAnalysis(filteredData, { useAI: false }); } catch {}
  }, [filteredData, runAnalysis]);

  // Extract 2-3 most significant patterns
  useEffect(() => {
    try {
      const patterns = (results?.patterns || []) as PatternResult[];
      if (!Array.isArray(patterns) || patterns.length === 0) {
        setTopPatterns([]);
        return;
      }
      const ranked = patterns
        .slice()
        .sort((a, b) => (b.confidence - a.confidence) || (b.frequency - a.frequency))
        .slice(0, 3);
      setTopPatterns(ranked);
    } catch {
      setTopPatterns([]);
    }
  }, [results?.patterns]);

  return (
    <ErrorBoundary>
      <section aria-labelledby="overview-title" className="space-y-6">
        <header className="space-y-1">
          <h2 id="overview-title" className="text-xl font-semibold tracking-tight">
            {String(tAnalytics('overview.title', { defaultValue: 'Overview' }))}
          </h2>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {optimalChartType === 'line' && String(tAnalytics('charts.timeSeriesDetected', { defaultValue: 'Time series view' }))}
            {optimalChartType === 'area' && String(tAnalytics('charts.categoricalDetected', { defaultValue: 'Distribution view' }))}
            {optimalChartType === 'composed' && String(tAnalytics('charts.mixedDataDetected', { defaultValue: 'Combined view' }))}
          </p>
        </header>

        <div aria-label={String(tAnalytics('aria.overview.heroChart', { defaultValue: 'Overview chart showing key metrics' }))} aria-live="polite">
          <Suspense fallback={<div className="h-[360px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label={String(tAnalytics('overview.loadingChart', { defaultValue: 'Loading overview chart...' }))} />}>
            <LazyChartsPanel studentName={studentName} filteredData={filteredData} preferredChartType={optimalChartType} />
          </Suspense>
        </div>

        <section aria-labelledby="overview-insights-title" className="space-y-3">
          <h3 id="overview-insights-title" className="text-base font-medium">
            {String(tAnalytics('overview.insights', { defaultValue: 'Key Insights' }))}
          </h3>
          {topInsights.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {String(tAnalytics('overview.noInsights', { defaultValue: 'No insights available yet. More data will improve analysis.' }))}
            </p>
          ) : (
            <ul className="list-disc pl-5 space-y-2" aria-label={String(tAnalytics('aria.overview.insights', { defaultValue: 'Key insights from data analysis' }))}>
              {topInsights.map((insight, idx) => (
                <li key={idx} className="text-sm">
                  <span>{insight}</span>{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setTab('explore');
                      setPreset('charts');
                    }}
                    className="text-primary underline underline-offset-2"
                    aria-label={String(tAnalytics('aria.overview.insightLink', { defaultValue: 'View detailed analysis in explore tab' }))}
                  >
                    {String(tAnalytics('overview.viewInExplore', { defaultValue: 'View in Explore' }))}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

      {/* Detected Patterns section */}
      <section aria-labelledby="overview-patterns-title" className="space-y-3">
        <h3 id="overview-patterns-title" className="text-base font-medium">
          {String(tAnalytics('overview.detectedPatterns', { defaultValue: 'Detected Patterns' }))}
        </h3>
        {topPatterns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {String(tAnalytics('overview.noPatternsYet', { defaultValue: 'No patterns detected yet.' }))}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {topPatterns.map((p) => {
              const title = String((p as any).pattern ?? (p as any).name ?? 'Pattern')
                .replace('-', ' ')
                .replace(/\b\w/g, (l: string) => l.toUpperCase());
              const id = stableKeyFromPattern(p);
              return (
                <Card
                  key={id}
                  className="cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => {
                    setTab('explore');
                    setPreset('patterns');
                    setPatternId(id);
                    setExplain(true);
                  }}
                  aria-label={String(tAnalytics('aria.overview.openPattern', { defaultValue: 'Open pattern explanation' }))}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-foreground">{title}</div>
                        <div className="text-xs text-muted-foreground">
                          {String(tAnalytics('overview.patternType', { defaultValue: 'Type' }))}: {String(p.type)}
                        </div>
                        {p.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{String((p as any).description)}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium">{Math.round((p.confidence || 0) * 100)}%</div>
                        <div className="text-[11px] text-muted-foreground">{String(tAnalytics('insights.confidence', { defaultValue: 'Confidence' }))}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
      </section>
    </ErrorBoundary>
  );
}, (prev, next) => {
  // Cheap signatures to detect meaningful changes beyond lengths
  const prevFirstTs = prev.filteredData.entries[0]?.timestamp?.getTime() || prev.filteredData.emotions[0]?.timestamp?.getTime() || prev.filteredData.sensoryInputs[0]?.timestamp?.getTime() || 0;
  const nextFirstTs = next.filteredData.entries[0]?.timestamp?.getTime() || next.filteredData.emotions[0]?.timestamp?.getTime() || next.filteredData.sensoryInputs[0]?.timestamp?.getTime() || 0;
  const prevLastTs = prev.filteredData.entries[prev.filteredData.entries.length - 1]?.timestamp?.getTime() || prev.filteredData.emotions[prev.filteredData.emotions.length - 1]?.timestamp?.getTime() || prev.filteredData.sensoryInputs[prev.filteredData.sensoryInputs.length - 1]?.timestamp?.getTime() || 0;
  const nextLastTs = next.filteredData.entries[next.filteredData.entries.length - 1]?.timestamp?.getTime() || next.filteredData.emotions[next.filteredData.emotions.length - 1]?.timestamp?.getTime() || next.filteredData.sensoryInputs[next.filteredData.sensoryInputs.length - 1]?.timestamp?.getTime() || 0;

  const prevInsightSig = (Array.isArray(prev.insights) ? prev.insights.slice(0, 2).join('|') : '');
  const nextInsightSig = (Array.isArray(next.insights) ? next.insights.slice(0, 2).join('|') : '');

  return (
    prev.studentName === next.studentName &&
    prev.filteredData.entries.length === next.filteredData.entries.length &&
    prev.filteredData.emotions.length === next.filteredData.emotions.length &&
    prev.filteredData.sensoryInputs.length === next.filteredData.sensoryInputs.length &&
    prevFirstTs === nextFirstTs &&
    prevLastTs === nextLastTs &&
    prevInsightSig === nextInsightSig
  );
});

OverviewPanel.displayName = 'OverviewPanel';


