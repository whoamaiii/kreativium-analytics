import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Info, BarChart3, Clock } from 'lucide-react';
import { TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';
import { CorrelationResult } from '@/lib/patternAnalysis';
import { useTranslation } from '@/hooks/useTranslation';
import { hashOfString } from '@/lib/key';

// Keep charting dependencies inside this chunk to align with manualChunks strategy
import React from 'react';
const EChartContainer = React.lazy(() => import('@/components/charts/EChartContainer').then(m => ({ default: m.EChartContainer })));
import type { EChartsOption } from 'echarts';
import { buildCorrelationHeatmapOption } from '@/components/charts/ChartKit';
import { enhancedPatternAnalysis } from '@/lib/enhancedPatternAnalysis';

export interface CorrelationsPanelProps {
  filteredData: {
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
  };
}

export const CorrelationsPanel = memo(function CorrelationsPanel({ filteredData }: CorrelationsPanelProps): React.ReactElement {
  const { tAnalytics } = useTranslation();
  const environmentalCorrelations: CorrelationResult[] = [];
  const hasEnoughData = (filteredData.entries?.length ?? 0) >= 10;

  let option: EChartsOption | null = null;
  if (hasEnoughData) {
    try {
      const matrix = enhancedPatternAnalysis.generateCorrelationMatrix(filteredData.entries);
      option = buildCorrelationHeatmapOption(matrix, tAnalytics);
    } catch {
      option = null;
    }
  }

  return (
    <Card className="bg-gradient-card border-0 shadow-soft">
      <CardHeader className="flex items-start justify-between gap-3">
        <div>
          <CardTitle data-testid="environmental-correlations-title">{String(tAnalytics('correlations.title'))}</CardTitle>
          <p className="text-sm text-muted-foreground">{String(tAnalytics('correlations.subtitle'))}</p>
        </div>
        <HoverCard openDelay={150} closeDelay={100}>
          <HoverCardTrigger asChild>
            <button aria-label={String(tAnalytics('correlations.helpTrigger'))} className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs hover:bg-accent/30">
              <Info className="h-4 w-4" />
              {String(tAnalytics('correlations.helpTrigger'))}
            </button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80 text-sm leading-relaxed">
            <p>{String(tAnalytics('correlations.helpBody.p1'))}</p>
            <p className="mt-1">{String(tAnalytics('correlations.helpBody.p2'))}</p>
          </HoverCardContent>
        </HoverCard>
      </CardHeader>
      <CardContent>
        {!hasEnoughData && (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{String(tAnalytics('correlations.empty.title'))}</p>
            <p className="text-sm">{String(tAnalytics('correlations.empty.moreData'))}</p>
          </div>
        )}
        {hasEnoughData && option && (
          <>
            <div className="rounded-xl border bg-card">
              <React.Suspense fallback={<div className="h-[420px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label="Loading correlations" />}> 
                <EChartContainer option={option} height={420} />
              </React.Suspense>
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{String(tAnalytics('correlations.legend.negative'))}</span>
              <span className="h-3 w-3 rounded bg-destructive" />
              <span>{String(tAnalytics('correlations.legend.zero'))}</span>
              <span className="h-3 w-3 rounded border bg-muted" />
              <span>{String(tAnalytics('correlations.legend.positive'))}</span>
              <span className="h-3 w-3 rounded bg-emotion-happy" />
            </div>
          </>
        )}
        {hasEnoughData && !option && (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{String(tAnalytics('correlations.fallback.title'))}</p>
            <div className="space-y-4 mt-4">
              {environmentalCorrelations.map((correlation: CorrelationResult) => (
                <Card key={hashOfString(`${correlation.factor1}-${correlation.factor2}-${correlation.significance}`)} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">
                          {correlation.factor1} ↔ {correlation.factor2}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">{correlation.description}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={correlation.significance === 'high' ? 'default' : 'outline'}>
                          {correlation.significance} {String(tAnalytics('correlations.labels.significance'))}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {String(tAnalytics('correlations.labels.rPrefix'))}{typeof (correlation as CorrelationResult & { correlation?: number }).correlation === 'number'
                            ? (correlation as CorrelationResult & { correlation?: number }).correlation.toFixed(3)
                            : '0.000'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

