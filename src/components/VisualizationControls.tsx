import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Toggle } from '@/components/ui/toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Activity,
  Filter,
  Grid3x3,
  Focus,
  Columns,
  Settings,
  Maximize2,
  PictureInPicture2,
  RefreshCw,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Wifi,
} from 'lucide-react';
import { AdvancedFilterPanel } from './AdvancedFilterPanel';
import { useVisualizationState, ChartType, TimeRange, VisualizationType } from '@/hooks/useVisualizationState';
import { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import { ExportFormat } from '@/lib/analyticsExport';

interface VisualizationControlsProps {
  studentName: string;
  isExporting: boolean;
  availableEmotions: string[];
  filteredData: {
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    trackingEntries: TrackingEntry[];
  };
  realtimeData: {
    newDataCount: number;
  };

  // State and setters from useVisualizationState
  visualizationState: ReturnType<typeof useVisualizationState>;

  // Handlers
  toggleFullscreen: () => void;
  togglePictureInPicture: () => void;
  handleExport: (format: ExportFormat) => void;
}

export const VisualizationControls: React.FC<VisualizationControlsProps> = ({
  studentName,
  isExporting,
  availableEmotions,
  filteredData,
  realtimeData,
  visualizationState,
  toggleFullscreen,
  togglePictureInPicture,
  handleExport,
}) => {
  const {
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
    showFilterPanel,
    setShowFilterPanel,
    selectedVisualizations,
    setSelectedVisualizations,
    setHighlightState,
    filterCriteria,
    setFilterCriteria,
  } = visualizationState;

  const motionPrefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (motionPrefersReduced && !visualizationState.motionSafe) {
    visualizationState.setMotionSafe(true);
    visualizationState.setProjectionMode('2d');
  }

  const chartTypeLabelId = React.useId();
  const chartTypeTriggerId = React.useId();
  const timeRangeLabelId = React.useId();
  const timeRangeTriggerId = React.useId();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Interactive Data Analysis - {studentName}
          {filterCriteria.realtime && (
            <Badge variant="default" className="animate-pulse ml-2">
              <Wifi className="h-3 w-3 mr-1" />
              Live
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2" aria-label="Visualization controls">
          {/* Guided question chips */}
          <div className="hidden md:flex items-center gap-2 mr-2">
            {[
              { id: 'peaks', label: 'When do peaks happen?' },
              { id: 'load_by_activity', label: 'Which activities raise load?' },
              { id: 'calming', label: 'What calms fastest?' },
            ].map((p) => (
              <Button
                key={p.id}
                variant={visualizationState.activePreset === p.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  visualizationState.setActivePreset(p.id);
                  // Simple preset effects (MVP)
                  if (p.id === 'peaks') {
                    setSelectedTimeRange('30d');
                    setSelectedChartType('scatter');
                    setFilterCriteria({
                      ...filterCriteria,
                      patterns: { ...filterCriteria.patterns, minConfidence: 0.6 },
                    });
                    setFocusedVisualization('trends');
                  } else if (p.id === 'calming') {
                    setSelectedTimeRange('7d');
                    setSelectedChartType('line');
                    setFocusedVisualization('timeline');
                  }
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <Sheet open={showFilterPanel} onOpenChange={setShowFilterPanel}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Open filters panel" title="Open filters panel">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {Object.keys(filterCriteria).filter(k =>
                  JSON.stringify(filterCriteria[k as keyof typeof filterCriteria]) !==
                  JSON.stringify({
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
                  }[k as keyof typeof filterCriteria])
                ).length > 0 && (
                  <Badge variant="default" className="ml-1">
                    Active
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>Advanced Filters</SheetTitle>
                <SheetDescription>
                  Configure multi-dimensional filters for your data analysis
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <AdvancedFilterPanel
                  emotions={filteredData.emotions}
                  sensoryInputs={filteredData.sensoryInputs}
                  trackingEntries={filteredData.trackingEntries}
                  onFilterChange={setFilterCriteria}
                />
              </div>
            </SheetContent>
          </Sheet>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                aria-label="Select layout mode"
                title="Select layout mode"
                data-testid="layout-mode-trigger"
              >
                {layoutMode === 'grid' && <Grid3x3 className="h-4 w-4 mr-2" />}
                {layoutMode === 'focus' && <Focus className="h-4 w-4 mr-2" />}
                {layoutMode === 'comparison' && <Columns className="h-4 w-4 mr-2" />}
                {layoutMode === 'dashboard' && <Activity className="h-4 w-4 mr-2" />}
                Layout
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLayoutMode('dashboard')}>
                <Activity className="h-4 w-4 mr-2" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLayoutMode('grid')}>
                <Grid3x3 className="h-4 w-4 mr-2" />
                Grid View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLayoutMode('focus')}>
                <Focus className="h-4 w-4 mr-2" />
                Focus Mode
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLayoutMode('comparison')}>
                <Columns className="h-4 w-4 mr-2" />
                Comparison
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" aria-label="View options" title="View options">
                <Settings className="h-4 w-4 mr-2" />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => visualizationState.setProjectionMode(visualizationState.projectionMode === '3d' ? '2d' : '3d')}>
                {visualizationState.projectionMode === '3d' ? 'Switch to 2D' : 'Switch to 3D'}
              </DropdownMenuItem>
              {visualizationState.projectionMode === '2d' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => visualizationState.setProjectionPlane('xy')}>2D: Emotional energy vs Sensory load (XY)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => visualizationState.setProjectionPlane('xz')}>2D: Emotional energy vs Time (XZ)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => visualizationState.setProjectionPlane('yz')}>2D: Sensory load vs Time (YZ)</DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => visualizationState.setMotionSafe(!visualizationState.motionSafe)}>
                {visualizationState.motionSafe ? 'Disable motion-safe' : 'Enable motion-safe'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleFullscreen}>
                <Maximize2 className="h-4 w-4 mr-2" />
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={togglePictureInPicture}>
                <PictureInPicture2 className="h-4 w-4 mr-2" />
                Picture-in-Picture
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                setHighlightState({ type: null, id: null, relatedIds: [] });
              }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear Highlights
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting} aria-label="Export analytics" title="Export analytics">
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
              >
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport('csv')}
                disabled={isExporting}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport('json')}
                disabled={isExporting}
              >
                <FileJson className="h-4 w-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <label
              id={chartTypeLabelId}
              className="text-sm font-medium"
              htmlFor={chartTypeTriggerId}
            >
              Chart Type
            </label>
            <Select value={selectedChartType} onValueChange={(value: ChartType) => setSelectedChartType(value)}>
              <SelectTrigger id={chartTypeTriggerId} className="w-32" aria-labelledby={chartTypeLabelId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="area">Area Chart</SelectItem>
                <SelectItem value="scatter">Scatter Plot</SelectItem>
                <SelectItem value="composed">Combined</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Select Emotions</p>
            <div className="grid grid-cols-2 gap-2 w-64 p-2 border rounded-md">
              {availableEmotions.map(emotion => {
                const checked = selectedEmotions.includes(emotion);
                return (
                  <label key={emotion} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        const isChecked = Boolean(v);
                        setSelectedEmotions(prev =>
                          isChecked ? [...prev, emotion] : prev.filter(e => e !== emotion)
                        );
                      }}
                      aria-label={`Toggle ${emotion}`}
                    />
                    <span className="capitalize">{emotion}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label
              id={timeRangeLabelId}
              className="text-sm font-medium"
              htmlFor={timeRangeTriggerId}
            >
              Time Range
            </label>
            <Select value={selectedTimeRange} onValueChange={(value: TimeRange) => setSelectedTimeRange(value)}>
              <SelectTrigger id={timeRangeTriggerId} className="w-32" aria-labelledby={timeRangeLabelId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 mt-8" aria-label="Data counts">
            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
              {filteredData.emotions.length} emotions
            </Badge>
            <Badge variant="outline" className="bg-info/10 text-info border-info/20">
              {filteredData.sensoryInputs.length} sensory inputs
            </Badge>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {filteredData.trackingEntries.length} sessions
            </Badge>
            {filterCriteria.realtime && (
              <Badge variant="default" className="bg-warning/80 text-warning-foreground">
                {realtimeData.newDataCount} new
              </Badge>
            )}
          </div>
        </div>

        {layoutMode === 'focus' && (
          <div className="mt-4 flex gap-2">
            {(['trends', 'correlations', 'patterns', '3d', 'timeline'] as VisualizationType[]).map(type => (
              <Toggle
                key={type}
                size="sm"
                pressed={focusedVisualization === type}
                onPressedChange={() => setFocusedVisualization(focusedVisualization === type ? null : type)}
                className="capitalize"
              >
                {type === '3d' ? '3D View' : type}
              </Toggle>
            ))}
          </div>
        )}

        {(layoutMode === 'grid' || layoutMode === 'comparison') && (
          <div className="mt-4 flex gap-2">
            {(['trends', 'correlations', 'patterns', '3d', 'timeline'] as VisualizationType[]).map(type => (
              <Toggle
                key={type}
                size="sm"
                pressed={selectedVisualizations.includes(type)}
                onPressedChange={(pressed) => {
                  if (pressed) {
                    setSelectedVisualizations([...selectedVisualizations, type]);
                  } else {
                    setSelectedVisualizations(selectedVisualizations.filter(v => v !== type));
                  }
                }}
                className="capitalize"
              >
                {type === '3d' ? '3D View' : type}
              </Toggle>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
