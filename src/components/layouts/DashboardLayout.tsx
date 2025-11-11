import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Badge and correlations elements removed to avoid duplicate correlation tabs
import { TrendingUp, Clock, Brain, Activity } from 'lucide-react';
// Removed correlation utilities since correlations tab was removed here
import { useTranslation } from '@/hooks/useTranslation';

interface DashboardLayoutProps {
  renderTrendsChart: () => React.ReactNode;
  renderPatternAnalysis: () => React.ReactNode;
  renderCorrelationHeatmap: () => React.ReactNode;
  render3dVisualization: () => React.ReactNode;
  renderTimeline: () => React.ReactNode;
  filteredData: {
    emotions: { intensity: number; emotion: string }[];
    sensoryInputs: { response?: string }[];
  };
}

export const DashboardLayout = ({
  renderTrendsChart,
  renderPatternAnalysis: _renderPatternAnalysis,
  renderCorrelationHeatmap,
  render3dVisualization: _render3dVisualization,
  renderTimeline,
  filteredData,
}: DashboardLayoutProps) => {
  const { tAnalytics } = useTranslation();
  return (
    <Tabs defaultValue="trends" className="w-full">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <TabsList className="grid w-full grid-cols-4" aria-label={tAnalytics('aria.tabs.charts')}>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {String(tAnalytics('tabs.charts'))}
          </TabsTrigger>
          <TabsTrigger value="correlations" className="flex items-center gap-2">
            {/* Using Activity icon to suggest relationships */}
            <Activity className="h-4 w-4" />
            {String(tAnalytics('tabs.correlations', { defaultValue: 'Correlations' }))}
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            {String(tAnalytics('tabs.patterns', { defaultValue: 'Patterns' }))}
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {String(tAnalytics('charts.dailyActivity'))}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="trends" className="space-y-6">
        {renderTrendsChart()}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {String(tAnalytics('charts.avgEmotionIntensity'))}
                  </p>
                  <p className="text-2xl font-bold">
                    {filteredData.emotions.length > 0
                      ? (
                          filteredData.emotions.reduce((sum, e) => sum + e.intensity, 0) /
                          filteredData.emotions.length
                        ).toFixed(1)
                      : '0'}
                  </p>
                </div>
                <Brain className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {String(tAnalytics('charts.positiveEmotions'))}
                  </p>
                  <p className="text-2xl font-bold">
                    {filteredData.emotions.length > 0
                      ? Math.round(
                          (filteredData.emotions.filter((e) =>
                            ['happy', 'calm', 'focused', 'excited', 'proud'].includes(
                              e.emotion.toLowerCase(),
                            ),
                          ).length /
                            filteredData.emotions.length) *
                            100,
                        )
                      : 0}
                    %
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {String(tAnalytics('charts.sensoryInputs'))}
                  </p>
                  <p className="text-2xl font-bold">
                    {filteredData.sensoryInputs.length > 0
                      ? Math.round(
                          (filteredData.sensoryInputs.filter((s) =>
                            s.response?.toLowerCase().includes('seeking'),
                          ).length /
                            filteredData.sensoryInputs.length) *
                            100,
                        )
                      : 0}
                    %
                  </p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="correlations">{renderCorrelationHeatmap()}</TabsContent>

      <TabsContent value="patterns">{_renderPatternAnalysis()}</TabsContent>

      {/* Removed 3D/Intensity tab per user preference */}

      <TabsContent value="timeline">{renderTimeline()}</TabsContent>
    </Tabs>
  );
};
