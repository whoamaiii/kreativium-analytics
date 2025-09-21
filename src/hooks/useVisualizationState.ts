import { useState } from 'react';
import { FilterCriteria } from '@/components/AdvancedFilterPanel';

export type ChartType = 'line' | 'area' | 'scatter' | 'composed';
export type TimeRange = '7d' | '30d' | '90d' | 'all';
export type LayoutMode = 'grid' | 'focus' | 'comparison' | 'dashboard';
export type VisualizationType = 'trends' | 'correlations' | 'patterns' | '3d' | 'timeline';
export type ProjectionMode = '3d' | '2d';
export type ProjectionPlane = 'xy' | 'xz' | 'yz';

export interface HighlightState {
  type: 'emotion' | 'sensory' | 'tracking' | 'anomaly' | null;
  id: string | null;
  relatedIds: string[];
}

export const useVisualizationState = (availableEmotions: string[], initialChartType: ChartType = 'line') => {
  const [selectedChartType, setSelectedChartType] = useState<ChartType>(initialChartType);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('30d');
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(availableEmotions);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('dashboard');
  const [focusedVisualization, setFocusedVisualization] = useState<VisualizationType | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedVisualizations, setSelectedVisualizations] = useState<VisualizationType[]>(['trends', 'patterns']);
  const [highlightState, setHighlightState] = useState<HighlightState>({ type: null, id: null, relatedIds: [] });
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({
    dateRange: { start: null, end: null },
    emotions: { types: [], intensityRange: [0, 10], includeTriggers: [], excludeTriggers: [] },
    sensory: { types: [], responses: [], intensityRange: [0, 10] },
    environmental: {
      locations: [],
      activities: [],
      conditions: { noiseLevel: [0, 10], temperature: [15, 30], lighting: [] },
      weather: [],
      timeOfDay: []
    },
    patterns: { anomaliesOnly: false, minConfidence: 0, patternTypes: [] },
    realtime: false
  });

  // Projection and accessibility
  const [projectionMode, setProjectionMode] = useState<ProjectionMode>('3d');
  const [projectionPlane, setProjectionPlane] = useState<ProjectionPlane>('xy');
  const [motionSafe, setMotionSafe] = useState<boolean>(false);

  // Guided preset context for narration
  const [activePreset, setActivePreset] = useState<string | null>(null);

  return {
    selectedChartType,
    setSelectedChartType,
    selectedTimeRange,
    setSelectedTimeRange,
    selectedEmotions,
    setSelectedEmotions,
    layoutMode,
    setLayoutMode,
    focusedVisualization,
    setFocusedVisualization,
    isFullscreen,
    setIsFullscreen,
    isPictureInPicture,
    setIsPictureInPicture,
    showFilterPanel,
    setShowFilterPanel,
    selectedVisualizations,
    setSelectedVisualizations,
    highlightState,
    setHighlightState,
    filterCriteria,
    setFilterCriteria,
    projectionMode,
    setProjectionMode,
    projectionPlane,
    setProjectionPlane,
    motionSafe,
    setMotionSafe,
    activePreset,
    setActivePreset,
  };
};
