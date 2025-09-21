import React, { memo, Suspense } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';
import { useTranslation } from '@/hooks/useTranslation';
import type { ChartType } from '@/hooks/useVisualizationState';
import { DEV_VIZ_ENABLED } from '@/lib/env';

const DevCharts = DEV_VIZ_ENABLED
  ? React.lazy(() => import('@/components/InteractiveDataVisualization').then(m => ({ default: m.InteractiveDataVisualization })))
  : null as unknown as React.LazyExoticComponent<any>;

export interface ChartsPanelProps {
  studentName: string;
  filteredData: {
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
  };
  preferredChartType?: ChartType;
}
export const ChartsPanel = memo(function ChartsPanel({ studentName, filteredData, preferredChartType }: ChartsPanelProps): React.ReactElement {
  const { tAnalytics } = useTranslation();
  return (
    <ErrorBoundary>
      {DEV_VIZ_ENABLED && DevCharts ? (
        <Suspense fallback={<div data-testid="charts-loading" /> }>
          <DevCharts
            emotions={filteredData.emotions}
            sensoryInputs={filteredData.sensoryInputs}
            trackingEntries={filteredData.entries}
            studentName={studentName}
            preferredChartType={preferredChartType}
          />
        </Suspense>
      ) : (
        <div className="p-4 border rounded-md text-muted-foreground" role="note" aria-live="polite">
          {String(tAnalytics('patterns.usePatternsPresetMessage', { defaultValue: 'For pattern analysis, please use the Patterns preset.' }))}
        </div>
      )}
    </ErrorBoundary>
  );
});
