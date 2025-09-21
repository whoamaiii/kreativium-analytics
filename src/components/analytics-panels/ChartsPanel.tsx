import React, { memo } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';
import { useTranslation } from '@/hooks/useTranslation';
import type { ChartType } from '@/hooks/useVisualizationState';

const LazyInteractiveDataVisualization = React.lazy(() =>
  import('@/components/lazy/LazyInteractiveDataVisualization').then(m => ({ default: m.LazyInteractiveDataVisualization }))
);

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
      <LazyInteractiveDataVisualization
        emotions={filteredData.emotions}
        sensoryInputs={filteredData.sensoryInputs}
        trackingEntries={filteredData.entries}
        studentName={studentName}
        preferredChartType={preferredChartType}
      />
    </ErrorBoundary>
  );
});
