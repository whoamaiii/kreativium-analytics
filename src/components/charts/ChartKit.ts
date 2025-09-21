import { chartColor } from '@/lib/chartColor';
import { analyticsConfig, DEFAULT_ANALYTICS_CONFIG } from '@/lib/analyticsConfig';
import type { EChartsOption, SeriesOption } from 'echarts';
import type { CorrelationMatrix } from '@/lib/enhancedPatternAnalysis';

/**
 * ChartKit – option builders
 *
 * These helpers produce ECharts options using a stable schema and
 * explicitly disable hover-dimming on series. We set emphasis.disabled,
 * focus: 'none', and a fully opaque blur state to improve readability
 * and avoid the visual effect of lines "disappearing" when hovering.
 */

/**
 * Strongly-typed input row for trend charts. Keep this flat and numeric so the
 * chart layer is deterministic and tooltips never receive object-shaped values.
 */
export interface TrendRow {
  date: string; // yyyy-MM-dd (displayed on x-axis)
  avgEmotionIntensity: number;
  positiveEmotions: number;
  negativeEmotions: number;
  totalSensoryInputs: number;
}

/** Configuration for the emotion trends chart. */
export interface EmotionTrendsConfig {
  title?: string;
  showMovingAverage: boolean;
  movingAverageWindow: number; // e.g., 7 for 7d MA
  useDualYAxis: boolean; // sensory on right axis
  thresholds?: { emotion?: number; sensory?: number };
  // Optional per-call overrides for chart config values
  overrides?: Partial<{
    dataZoomMinSpan: number;
    yAxisMax: number;
    yAxisInterval: number;
    lineWidths: {
      average: number;
      movingAverage: number;
      positive: number;
      negative: number;
      sensory: number;
    };
  }>;
}

/**
 * Compute a simple moving average array for a numeric series.
 */
function computeMovingAverage(values: number[], window: number): number[] {
  if (!Number.isFinite(window) || window <= 1) return values.slice();
  const ma: number[] = new Array(values.length).fill(0);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] ?? 0;
    const outIndex = i - window;
    if (outIndex >= 0) sum -= values[outIndex] ?? 0;
    const denom = Math.min(i + 1, window);
    ma[i] = Number((sum / denom).toFixed(2));
  }
  return ma;
}

/** Ensure numbers are finite; coerce invalid values to 0 for stable visuals. */
function toFiniteNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Build an ECharts option for the main Emotion & Sensory trends chart.
 * Pure function – safe to unit test.
 */
export function buildEmotionTrendsOption(
  rows: TrendRow[],
  config: EmotionTrendsConfig,
  tAnalytics: (key: string, options?: Record<string, unknown>) => string
): EChartsOption {
  const chartsCfg = analyticsConfig.getConfig().charts ?? DEFAULT_ANALYTICS_CONFIG.charts;
  const yAxisMax = config.overrides?.yAxisMax ?? chartsCfg.yAxisMax;
  const yAxisInterval = config.overrides?.yAxisInterval ?? chartsCfg.yAxisInterval;
  const minValueSpan = config.overrides?.dataZoomMinSpan ?? chartsCfg.dataZoomMinSpan;
  const widths = {
    average: config.overrides?.lineWidths?.average ?? chartsCfg.lineWidths.average,
    movingAverage: config.overrides?.lineWidths?.movingAverage ?? chartsCfg.lineWidths.movingAverage,
    positive: config.overrides?.lineWidths?.positive ?? chartsCfg.lineWidths.positive,
    negative: config.overrides?.lineWidths?.negative ?? chartsCfg.lineWidths.negative,
    sensory: config.overrides?.lineWidths?.sensory ?? chartsCfg.lineWidths.sensory,
  };
  const dates = rows.map(r => r.date);
  const avg = rows.map(r => toFiniteNumber(r.avgEmotionIntensity));
  const pos = rows.map(r => toFiniteNumber(r.positiveEmotions));
  const neg = rows.map(r => toFiniteNumber(r.negativeEmotions));
  const sensory = rows.map(r => toFiniteNumber(r.totalSensoryInputs));

  const avgMA = config.showMovingAverage
    ? computeMovingAverage(avg, Math.max(2, config.movingAverageWindow))
    : [];

  const labelAvg = String(tAnalytics('charts.avgEmotionIntensity'));
  const labelMA = (window: number) => String(tAnalytics('charts.movingAverage', { window }));
  const labelPos = String(tAnalytics('charts.positiveEmotions'));
  const labelNeg = String(tAnalytics('charts.negativeEmotions'));
  const labelSensory = String(tAnalytics('charts.sensoryInputs'));
  const labelEmotionThreshold = String(tAnalytics('charts.emotionThreshold'));
  const labelSensoryThreshold = String(tAnalytics('charts.sensoryThreshold'));
  const labelIntensity = String(tAnalytics('charts.intensity'));

  const series: SeriesOption[] = [
    {
      type: 'line',
      name: labelAvg,
      data: avg,
      meta: { key: 'avgEmotionIntensity' } as any,
      encode: { y: 'avgEmotionIntensity' },
      smooth: true,
      showSymbol: false,
      sampling: 'lttb',
      lineStyle: { width: widths.average },
      emphasis: { focus: 'none', disabled: true },
      blur: { itemStyle: { opacity: 1 }, lineStyle: { opacity: 1 } },
      markLine: config.thresholds?.emotion
        ? {
            silent: true,
            data: [
              {
                yAxis: config.thresholds.emotion,
                label: { position: 'end', formatter: labelEmotionThreshold },
                lineStyle: { type: 'dashed', width: 2 },
              },
            ],
          }
        : undefined,
    },
    ...(config.showMovingAverage
      ? ([
          {
            type: 'line',
            name: labelMA(config.movingAverageWindow),
            data: avgMA,
            meta: { key: 'avgEmotionIntensityMA' } as any,
            encode: { y: 'avgEmotionIntensityMA' },
            smooth: true,
            showSymbol: false,
            sampling: 'lttb',
            lineStyle: { width: widths.movingAverage },
            emphasis: { focus: 'none', disabled: true },
            blur: { itemStyle: { opacity: 1 }, lineStyle: { opacity: 1 } },
          },
        ] as SeriesOption[])
      : []),
    {
      type: 'line',
      name: labelPos,
      data: pos,
      meta: { key: 'positiveEmotions' } as any,
      encode: { y: 'positiveEmotions' },
      smooth: true,
      showSymbol: false,
      sampling: 'lttb',
      lineStyle: { width: widths.positive },
      emphasis: { focus: 'none', disabled: true },
      blur: { itemStyle: { opacity: 1 }, lineStyle: { opacity: 1 } },
    },
    {
      type: 'line',
      name: labelNeg,
      data: neg,
      meta: { key: 'negativeEmotions' } as any,
      encode: { y: 'negativeEmotions' },
      smooth: true,
      showSymbol: false,
      sampling: 'lttb',
      lineStyle: { width: widths.negative },
      emphasis: { focus: 'none', disabled: true },
      blur: { itemStyle: { opacity: 1 }, lineStyle: { opacity: 1 } },
    },
    {
      type: 'line',
      name: labelSensory,
      data: sensory,
      meta: { key: 'totalSensoryInputs' } as any,
      encode: { y: 'totalSensoryInputs' },
      smooth: true,
      showSymbol: false,
      sampling: 'lttb',
      lineStyle: { width: widths.sensory, type: 'dashed' },
      emphasis: { focus: 'none', disabled: true },
      blur: { itemStyle: { opacity: 1 }, lineStyle: { opacity: 1 } },
      yAxisIndex: config.useDualYAxis ? 1 : 0,
      markLine: config.thresholds?.sensory
        ? {
            silent: true,
            data: [
              {
                yAxis: config.thresholds.sensory,
                label: { position: 'end', formatter: labelSensoryThreshold },
                lineStyle: { type: 'dashed', width: 2 },
              },
            ],
          }
        : undefined,
    },
  ];

  const option: EChartsOption = {
    title: config.title
      ? { left: 'center', top: 0, text: config.title }
      : undefined,
    legend: {
      hoverLink: false,
      bottom: 0,
      data: [
        labelAvg,
        ...(config.showMovingAverage ? [labelMA(config.movingAverageWindow)] : []),
        labelPos,
        labelNeg,
        labelSensory,
      ],
      selected: {
        [labelAvg]: true,
        ...(config.showMovingAverage ? { [labelMA(config.movingAverageWindow)]: true } : {}),
        [labelPos]: true,
        [labelNeg]: true,
        [labelSensory]: false,
      },
    },
    tooltip: { trigger: 'axis', confine: true },
    toolbox: {
      show: true,
      right: 16,
      top: 16,
      feature: {
        dataZoom: { yAxisIndex: 'none', title: { zoom: String(tAnalytics('charts.zoom')), back: String(tAnalytics('charts.reset')) } },
        restore: { title: String(tAnalytics('charts.reset')) },
        saveAsImage: { title: String(tAnalytics('charts.save')), pixelRatio: 2 },
      },
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100, minValueSpan },
      { show: true, type: 'slider', bottom: 50, start: 0, end: 100, height: 20, minValueSpan },
    ],
    xAxis: { type: 'category', boundaryGap: false, data: dates },
    yAxis: config.useDualYAxis
      ? [
          { type: 'value', max: yAxisMax, min: 0, interval: yAxisInterval, name: labelIntensity },
          { type: 'value', name: labelSensory, alignTicks: true, min: 'dataMin' },
        ]
      : [{ type: 'value', max: yAxisMax, min: 0, interval: yAxisInterval, name: labelIntensity }],
    series,
    grid: { bottom: 72 },
  };

  return option;
}

/** Simpler area option builder using the same TrendRow type. */
export function buildAreaOption(
  rows: TrendRow[],
  tAnalytics: (key: string, options?: Record<string, unknown>) => string
): EChartsOption {
  const widths = (analyticsConfig.getConfig().charts ?? DEFAULT_ANALYTICS_CONFIG.charts).lineWidths;
  const dates = rows.map(r => r.date);
  return {
    tooltip: { trigger: 'axis' },
    legend: {},
    xAxis: { type: 'category', data: dates },
    yAxis: [{ type: 'value' }],
    series: [
      {
        type: 'line',
        name: String(tAnalytics('charts.avgEmotionIntensity')),
        data: rows.map(r => toFiniteNumber(r.avgEmotionIntensity)),
        meta: { key: 'avgEmotionIntensity' } as any,
        encode: { y: 'avgEmotionIntensity' },
        smooth: true,
        showSymbol: false,
        areaStyle: {},
        lineStyle: { width: widths.average },
        emphasis: { focus: 'none' },
      },
      {
        type: 'line',
        name: String(tAnalytics('charts.positiveEmotions')),
        data: rows.map(r => toFiniteNumber(r.positiveEmotions)),
        meta: { key: 'positiveEmotions' } as any,
        encode: { y: 'positiveEmotions' },
        smooth: true,
        showSymbol: false,
        areaStyle: {},
        lineStyle: { width: widths.positive },
        emphasis: { focus: 'none' },
      },
    ],
  } as EChartsOption;
}

/** Scatter option with numeric axes for correlation-like view. */
export function buildScatterOption(
  rows: TrendRow[],
  tAnalytics: (key: string, options?: Record<string, unknown>) => string
): EChartsOption {
  return {
    tooltip: { trigger: 'item' },
    legend: {},
    xAxis: { type: 'value', name: String(tAnalytics('charts.avgEmotionIntensity')) },
    yAxis: { type: 'value', name: String(tAnalytics('charts.sensoryInputs')) },
    series: [
      {
        name: String(tAnalytics('charts.dailyDataPoints')),
        type: 'scatter',
        data: rows.map(r => [toFiniteNumber(r.avgEmotionIntensity), toFiniteNumber(r.totalSensoryInputs)]),
        symbolSize: 8,
        emphasis: { focus: 'none' },
      },
    ],
  } as EChartsOption;
}

/** Composed bar+line option builder using the same rows. */
export function buildComposedOption(
  rows: TrendRow[],
  tAnalytics: (key: string, options?: Record<string, unknown>) => string
): EChartsOption {
  const widths = (analyticsConfig.getConfig().charts ?? DEFAULT_ANALYTICS_CONFIG.charts).lineWidths;
  const dates = rows.map(r => r.date);
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {},
    xAxis: { type: 'category', data: dates },
    yAxis: [{ type: 'value' }, { type: 'value' }],
    series: [
      {
        type: 'bar',
        name: String(tAnalytics('charts.positiveEmotions')),
        data: rows.map(r => toFiniteNumber(r.positiveEmotions)),
        meta: { key: 'positiveEmotions' } as any,
        encode: { y: 'positiveEmotions' },
        yAxisIndex: 0,
        emphasis: { focus: 'none' },
      },
      {
        type: 'bar',
        name: String(tAnalytics('charts.negativeEmotions')),
        data: rows.map(r => toFiniteNumber(r.negativeEmotions)),
        meta: { key: 'negativeEmotions' } as any,
        encode: { y: 'negativeEmotions' },
        yAxisIndex: 0,
        emphasis: { focus: 'none' },
      },
      {
        type: 'line',
        name: String(tAnalytics('charts.avgEmotionIntensity')),
        data: rows.map(r => toFiniteNumber(r.avgEmotionIntensity)),
        meta: { key: 'avgEmotionIntensity' } as any,
        encode: { y: 'avgEmotionIntensity' },
        yAxisIndex: 1,
        smooth: true,
        lineStyle: { width: widths.average },
        showSymbol: false,
        emphasis: { focus: 'none' },
      },
    ],
  } as EChartsOption;
}

/** Correlation heatmap option builder (ECharts). */
export function buildCorrelationHeatmapOption(
  matrix: CorrelationMatrix,
  tAnalytics: (key: string, options?: Record<string, unknown>) => string
): EChartsOption {
  const chartsCfg = analyticsConfig.getConfig().charts;
  const factors = matrix.factors ?? [];
  const values: Array<[number, number, number]> = [];
  for (let i = 0; i < matrix.matrix.length; i++) {
    const row = matrix.matrix[i] || [];
    for (let j = 0; j < row.length; j++) {
      const vRaw = row[j];
      const v = typeof vRaw === 'number' && Number.isFinite(vRaw) ? vRaw : 0;
      values.push([j, i, Number(v.toFixed(2))]);
    }
  }

  // Map for quick significance lookup in tooltip
  const significanceMap = new Map<string, { significance: string; correlation: number }>();
  for (const p of matrix.significantPairs || []) {
    const key1 = `${p.factor1}__${p.factor2}`;
    const key2 = `${p.factor2}__${p.factor1}`;
    significanceMap.set(key1, { significance: p.significance, correlation: p.correlation });
    significanceMap.set(key2, { significance: p.significance, correlation: p.correlation });
  }

  const option: EChartsOption = {
    grid: { top: 80, left: 120, right: 64, bottom: 60, containLabel: true },
    xAxis: {
      type: 'category',
      data: factors,
      axisLabel: { rotate: 40, margin: 16 },
    },
    yAxis: {
      type: 'category',
      data: factors,
      axisLabel: { margin: 12 },
    },
    tooltip: {
      trigger: 'item',
      confine: true,
      appendToBody: true,
      formatter: (p: any) => {
        const i = p?.value?.[1];
        const j = p?.value?.[0];
        const f1 = factors[i] ?? '';
        const f2 = factors[j] ?? '';
        const key = `${f1}__${f2}`;
        const sig = significanceMap.get(key)?.significance;
        const corr = typeof p?.value?.[2] === 'number' ? p.value[2] : Number(p.value?.[2]) || 0;
        const sign = corr > 0 ? String(tAnalytics('charts.positive')) : corr < 0 ? String(tAnalytics('charts.negative')) : String(tAnalytics('charts.neutral'));
        return `<div style="font-weight:600;margin-bottom:6px">${f1} &harr; ${f2}</div>
                <div>${tAnalytics('charts.correlation')}: <b>${corr.toFixed(2)}</b> (${sign})</div>
                ${sig ? `<div>${tAnalytics('charts.significance')}: <b>${sig}</b></div>` : ''}`;
      }
    },
    visualMap: {
      min: -1,
      max: 1,
      calculable: true,
      orient: 'vertical',
      right: 8,
      top: 40,
      text: [String(tAnalytics('charts.positive')), String(tAnalytics('charts.negative'))],
      inRange: {
        // Diverging palette from semantic tokens
        color: [
          chartColor('--destructive', 1, '0 84% 60%'), 
          chartColor('--muted-foreground', 1, '240 8% 63%'), 
          chartColor('--success', 1, '142 71% 45%')
        ]
      },
      itemWidth: 12,
      itemHeight: 100,
      textStyle: { color: 'hsl(var(--muted-foreground))' },
    },
    series: [
      {
        type: 'heatmap',
        data: values,
        label: {
          show: true,
          formatter: (params: any) => {
            const v = typeof params?.value?.[2] === 'number' ? params.value[2] : Number(params?.value?.[2]) || 0;
            // Only label moderate/strong correlations to reduce clutter
            return Math.abs(v) >= chartsCfg.correlationLabelThreshold ? v.toFixed(2) : '';
          },
        },
        itemStyle: {
          borderWidth: 1,
          borderColor: chartColor('--secondary', 0.5, '247 15% 17%') // Use semantic token with alpha
        },
        emphasis: { disabled: true, focus: 'none' },
        progressive: 0,
        // Larger cells for readability
        // ECharts sizes cells automatically based on grid/category count
      },
    ],
  };

  return option;
}

/** Prediction timeline (risk score) option builder (ECharts). */
export function buildPredictionTimelineOption(
  rows: Array<{ date: string; riskScore: number; label?: string }>,
  tAnalytics: (key: string, options?: Record<string, unknown>) => string
): EChartsOption {
  const chartsCfg = analyticsConfig.getConfig().charts ?? DEFAULT_ANALYTICS_CONFIG.charts;
  const dates = rows.map(r => r.date);
  const values = rows.map(r => (Number.isFinite(r.riskScore) ? r.riskScore : 0));

  // Allow risk score scale 0..1 or 0..100 depending on config; default 0..1
  const yMax = (chartsCfg as any)?.riskYAxisMax && Number.isFinite((chartsCfg as any).riskYAxisMax)
    ? (chartsCfg as any).riskYAxisMax
    : 1;
  const yInterval = (chartsCfg as any)?.riskYAxisInterval && Number.isFinite((chartsCfg as any).riskYAxisInterval)
    ? (chartsCfg as any).riskYAxisInterval
    : yMax <= 1 ? 0.1 : Math.ceil(yMax / 10);

  const labelRisk = String(tAnalytics('charts.riskScore'));

  return {
    tooltip: {
      trigger: 'axis',
      confine: true,
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        const idx = p?.dataIndex ?? 0;
        const date = dates[idx] ?? '';
        const vRaw = values[idx] ?? 0;
        const v = Number.isFinite(vRaw) ? vRaw : 0;
        const label = rows[idx]?.label;
        const riskText = yMax <= 1 ? v.toFixed(2) : Math.round(v).toString();
        return `<div style="font-weight:600;margin-bottom:6px">${date}</div>
                <div>${labelRisk}: <b>${riskText}</b>${label ? ` — ${label}` : ''}</div>`;
      }
    },
    legend: {
      hoverLink: false,
      bottom: 0,
      data: [labelRisk],
    },
    xAxis: { type: 'category', boundaryGap: false, data: dates },
    yAxis: [{ type: 'value', min: 0, max: yMax, interval: yInterval, name: labelRisk }],
    series: [
      {
        type: 'line',
        name: labelRisk,
        data: values,
        smooth: true,
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { width: chartsCfg.lineWidths?.average ?? 2 },
        emphasis: { focus: 'none', disabled: true },
        blur: { itemStyle: { opacity: 1 }, lineStyle: { opacity: 1 } },
        areaStyle: {},
      }
    ],
    grid: { bottom: 72 },
  } as EChartsOption;
}

