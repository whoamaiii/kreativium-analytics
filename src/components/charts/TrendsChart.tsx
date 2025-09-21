import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
const EChartContainer = React.lazy(() => import('./EChartContainer').then(m => ({ default: m.EChartContainer })));
import { buildEmotionTrendsOption, buildAreaOption, buildScatterOption, buildComposedOption, TrendRow as ChartKitTrendRow } from './ChartKit';
import { Activity } from 'lucide-react';
import { logger } from '@/lib/logger';
import { analyticsConfig } from '@/lib/analyticsConfig';
import { ChartType } from '@/hooks/useVisualizationState';
import { EChartsOption } from 'echarts';

interface ChartDataPoint {
  date: string;
  timestamp: Date;
  emotionCount: number;
  avgEmotionIntensity: number;
  positiveEmotions: number;
  negativeEmotions: number;
  sensorySeekingCount: number;
  sensoryAvoidingCount: number;
  totalSensoryInputs: number;
  [key: string]: string | number | Date;
}

interface TrendsChartProps {
  chartData: ChartDataPoint[];
  selectedChartType: ChartType;
}

export const TrendsChart: React.FC<TrendsChartProps> = ({ chartData, selectedChartType }) => {
  const { tAnalytics } = useTranslation();
  try {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>No data available for selected time range</p>
            <p className="text-xs mt-1">Try expanding the time range or adjusting filters</p>
          </div>
        </div>
      );
    }

    const rows: ChartKitTrendRow[] = chartData.map(d => ({
      date: d.date,
      avgEmotionIntensity: Number(d.avgEmotionIntensity) || 0,
      positiveEmotions: Number(d.positiveEmotions) || 0,
      negativeEmotions: Number(d.negativeEmotions) || 0,
      totalSensoryInputs: Number(d.totalSensoryInputs) || 0,
    }));

    let option: EChartsOption;

    switch (selectedChartType) {
      case 'area':
        option = buildAreaOption(rows, tAnalytics);
        break;
      case 'scatter':
        option = buildScatterOption(rows, tAnalytics);
        break;
      case 'composed':
        option = buildComposedOption(rows, tAnalytics);
        break;
      default: // line fallback
        const chartsCfg = analyticsConfig.getConfig().charts;
        const emotionThreshold = chartsCfg.emotionThreshold;
        const sensoryThreshold = chartsCfg.sensoryThreshold;
        option = buildEmotionTrendsOption(rows, {
          title: String(tAnalytics('charts.emotionTrends')),
          showMovingAverage: true,
          movingAverageWindow: chartsCfg.movingAverageWindow,
          useDualYAxis: true,
          thresholds: { emotion: emotionThreshold, sensory: sensoryThreshold },
        }, tAnalytics);
        break;
    }

    return (
      <React.Suspense fallback={<div className="h-[400px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label="Loading trends" />}> 
        <EChartContainer 
          option={option} 
          height={400}
          exportRegistration={{ id: 'trends-main', type: 'trends', title: String(tAnalytics('export.chartTitle')) }}
        />
      </React.Suspense>
    );

  } catch (error) {
    logger.error("TrendsChart.renderChart failed", { error });
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>Could not render chart</p>
          <p className="text-xs mt-1">An internal error occurred while building the chart</p>
        </div>
      </div>
    );
  }
};
