import React, { useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
const EChartContainer = React.lazy(() => import('@/components/charts/EChartContainer').then(m => ({ default: m.EChartContainer })));
import { buildCorrelationHeatmapOption } from '@/components/charts/ChartKit';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import { CorrelationMatrix } from '@/lib/enhancedPatternAnalysis';
import { EChartsOption } from 'echarts';

interface CorrelationHeatmapProps {
  correlationMatrix: CorrelationMatrix | null;
  onRetry: () => void;
  onShowAllTime: () => void;
}

const BaseCorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({
  correlationMatrix,
  onRetry,
  onShowAllTime,
}) => {
  const { tAnalytics } = useTranslation();
  if (!correlationMatrix) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>{String(tAnalytics('correlations.empty.title'))}</p>
          <p className="text-sm">{String(tAnalytics('correlations.empty.moreData'))}</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              aria-label={String(tAnalytics('actions.refreshAnalysis'))}
              title={String(tAnalytics('actions.refreshAnalysis'))}
              onClick={onRetry}
            >
              {String(tAnalytics('actions.refreshAnalysis'))}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label={String(tAnalytics('interface.resetView'))}
              title={String(tAnalytics('interface.resetView'))}
              onClick={onShowAllTime}
            >
              {String(tAnalytics('interface.resetView'))}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const option: EChartsOption = useMemo(
    () => (correlationMatrix ? buildCorrelationHeatmapOption(correlationMatrix, tAnalytics) : ({} as EChartsOption)),
    [correlationMatrix, tAnalytics]
  );
  return (
    <React.Suspense fallback={<div className="h-[420px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label="Loading heatmap" />}> 
      <EChartContainer option={option} height={420} />
    </React.Suspense>
  );
};

export const CorrelationHeatmap = React.memo(BaseCorrelationHeatmap, (prev, next) => {
  if (prev.onRetry !== next.onRetry) return false;
  if (prev.onShowAllTime !== next.onShowAllTime) return false;

  const prevM = prev.correlationMatrix;
  const nextM = next.correlationMatrix;
  if (prevM === nextM) return true;
  if (!prevM || !nextM) return false;

  const pf = prevM.factors;
  const nf = nextM.factors;
  if (pf.length !== nf.length) return false;
  for (let i = 0; i < pf.length; i++) {
    if (pf[i] !== nf[i]) return false;
  }

  const pm = prevM.matrix;
  const nm = nextM.matrix;
  if (pm.length !== nm.length) return false;
  for (let r = 0; r < pm.length; r++) {
    if ((pm[r]?.length || 0) !== (nm[r]?.length || 0)) return false;
  }

  const rowsCount = pm.length;
  const colsCount = rowsCount > 0 ? (pm[0]?.length || 0) : 0;
  if (rowsCount === 0 || colsCount === 0) return true;
  const sampleIdx: Array<[number, number]> = [
    [0, 0],
    [Math.floor(rowsCount / 2), Math.floor(colsCount / 2)],
    [rowsCount - 1, colsCount - 1],
  ];
  for (const [i, j] of sampleIdx) {
    const a = pm[i]?.[j];
    const b = nm[i]?.[j];
    if (a !== b) return false;
  }
  return true;
});
