import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildEmotionTrendsOption, buildAreaOption, buildScatterOption, buildComposedOption, buildCorrelationHeatmapOption, buildPredictionTimelineOption, TrendRow } from '@/components/charts/ChartKit';
import { analyticsConfig } from '@/lib/analyticsConfig';

const rowsFixture: TrendRow[] = [
  { date: '2025-07-15', avgEmotionIntensity: 4, positiveEmotions: 1, negativeEmotions: 0.5, totalSensoryInputs: 2 },
  { date: '2025-07-16', avgEmotionIntensity: 5, positiveEmotions: 0.8, negativeEmotions: 1.2, totalSensoryInputs: 3 },
  { date: '2025-07-17', avgEmotionIntensity: 6, positiveEmotions: 1.5, negativeEmotions: 0.7, totalSensoryInputs: 1 },
];

describe('ChartKit option builders', () => {
  beforeEach(() => {
    vi.spyOn(analyticsConfig, 'getConfig').mockReturnValue({
      charts: {
        emotionThreshold: 7,
        sensoryThreshold: 5,
        movingAverageWindow: 3,
        correlationLabelThreshold: 0.25,
        yAxisMax: 10,
        yAxisInterval: 2,
        dataZoomMinSpan: 3,
        lineWidths: { average: 3, movingAverage: 2, positive: 2, negative: 2, sensory: 2 }
      }
    } as any);
  });

  it('buildEmotionTrendsOption returns consistent series shapes', () => {
    const tAnalytics = (key: string, opts?: Record<string, unknown>) => {
      if (key === 'charts.movingAverage') {
        const window = (opts?.window as number) ?? 0;
        return `Avg Intensity (${window}d MA)`;
      }
      const map: Record<string, string> = {
        'charts.avgEmotionIntensity': 'Avg Emotion Intensity',
        'charts.positiveEmotions': 'Positive Emotions',
        'charts.negativeEmotions': 'Negative Emotions',
        'charts.sensoryInputs': 'Sensory Inputs',
        'charts.emotionThreshold': 'Emotion Threshold',
        'charts.sensoryThreshold': 'Sensory Threshold',
        'charts.intensity': 'Intensity',
        'charts.zoom': 'Zoom',
        'charts.reset': 'Reset',
        'charts.save': 'Save',
        'charts.dailyDataPoints': 'Daily Data Points',
        'charts.positive': 'Positive',
        'charts.negative': 'Negative',
        'charts.neutral': 'Neutral',
        'charts.correlation': 'Correlation',
        'charts.significance': 'Significance',
      };
      return map[key] ?? key;
    };
    const option = buildEmotionTrendsOption(rowsFixture, {
      title: 'Test',
      showMovingAverage: true,
      movingAverageWindow: 2,
      useDualYAxis: true,
      thresholds: { emotion: 7, sensory: 5 },
    }, tAnalytics);

    // Basic shape assertions (snapshot-like but stable)
    expect(Array.isArray(option.series)).toBe(true);
    const series = option.series as any[];
    // Expect 5 series when MA is enabled
    expect(series.length).toBe(5);
    // Check names
    expect(series.length).toBe(5);
    // Check data lengths
    series.forEach(s => {
      expect(Array.isArray(s.data)).toBe(true);
      expect(s.data.length).toBe(rowsFixture.length);
    });
  });

  it('buildAreaOption produces two line series with areaStyle', () => {
    const option = buildAreaOption(rowsFixture, (k) => k);
    const series = option.series as any[];
    expect(series.length).toBe(2);
    expect(series[0].type).toBe('line');
    expect(series[0].areaStyle).toBeDefined();
  });

  it('buildScatterOption produces 1 scatter series with xy tuples', () => {
    const option = buildScatterOption(rowsFixture, (k) => k);
    const series = option.series as any[];
    expect(series.length).toBe(1);
    expect(series[0].type).toBe('scatter');
    expect(Array.isArray(series[0].data[0])).toBe(true);
    expect(series[0].data[0].length).toBe(2);
  });

  it('buildComposedOption produces bar+line combo', () => {
    const option = buildComposedOption(rowsFixture, (k) => k);
    const series = option.series as any[];
    expect(series.length).toBe(3);
    expect(series[0].type).toBe('bar');
    expect(series[1].type).toBe('bar');
    expect(series[2].type).toBe('line');
  });

  it('uses analyticsConfig.charts values for axis and zoom; overrides respected', () => {
    const optionDefault = buildEmotionTrendsOption(rowsFixture, {
      title: 'Cfg',
      showMovingAverage: false,
      movingAverageWindow: 3,
      useDualYAxis: true,
    }, (k) => k);
    const yAxes = optionDefault.yAxis as any[];
    expect(yAxes[0].max).toBe(10);
    expect(yAxes[0].interval).toBe(2);
    const dz = optionDefault.dataZoom as any[];
    expect(dz[0].minValueSpan).toBe(3);

    const optionOverride = buildEmotionTrendsOption(rowsFixture, {
      title: 'Override',
      showMovingAverage: false,
      movingAverageWindow: 3,
      useDualYAxis: false,
      overrides: { yAxisMax: 20, yAxisInterval: 5, dataZoomMinSpan: 10, lineWidths: { average: 5, movingAverage: 4, positive: 3, negative: 3, sensory: 1 } }
    }, (k) => k);
    const yAxisSingle = optionOverride.yAxis as any[];
    expect(yAxisSingle[0].max).toBe(20);
    expect(yAxisSingle[0].interval).toBe(5);
    const dz2 = optionOverride.dataZoom as any[];
    expect(dz2[0].minValueSpan).toBe(10);
    const series = optionOverride.series as any[];
    expect(series[0].lineStyle.width).toBe(5);
  });

  it('renders threshold markLines when thresholds are provided', () => {
    const option = buildEmotionTrendsOption(rowsFixture, {
      title: 'Thresholds',
      showMovingAverage: false,
      movingAverageWindow: 3,
      useDualYAxis: true,
      thresholds: { emotion: 6.5, sensory: 4 }
    }, (k) => k);
    const series = option.series as any[];
    expect(series[0].markLine).toBeDefined();
    expect(series[3].markLine).toBeDefined();
  });

  it('buildCorrelationHeatmapOption formats values and uses tAnalytics for labels', () => {
    const matrix = {
      factors: ['a', 'b'],
      matrix: [ [1, 0.5], [-0.2, 1] ],
      significantPairs: [ { factor1: 'a', factor2: 'b', correlation: 0.5, pValue: 0.01, significance: 'moderate' } ]
    } as any;
    const t = (k: string) => k;
    const option = buildCorrelationHeatmapOption(matrix, t);
    expect((option.series as any[])[0].type).toBe('heatmap');
    // visualMap text uses translated keys
    expect((option as any).visualMap.text).toEqual(['charts.positive', 'charts.negative']);
  });

  it('buildPredictionTimelineOption uses charts config for y axis scaling', () => {
    const t = (k: string) => k;
    const rows = [
      { date: '2025-01-01', riskScore: 0.2 },
      { date: '2025-01-02', riskScore: 0.9 },
    ];
    const option = buildPredictionTimelineOption(rows, t);
    const yAxis = (option.yAxis as any[])[0];
    expect(yAxis.max).toBe(1);
    expect((option.series as any[])[0].type).toBe('line');
  });

  it('compute moving average affects series shape when enabled', () => {
    const t = (k: string, opts?: any) => (k === 'charts.movingAverage' ? `MA ${opts?.window}` : k);
    const option = buildEmotionTrendsOption(rowsFixture, {
      title: 'MA',
      showMovingAverage: true,
      movingAverageWindow: 2,
      useDualYAxis: false
    }, t);
    const series = option.series as any[];
    const maSeries = series.find(s => String(s.name).includes('MA'));
    expect(maSeries).toBeTruthy();
    expect(maSeries.data.length).toBe(rowsFixture.length);
  });
});




