import React, { useMemo, memo, useRef } from "react";
import { useTranslation } from '@/hooks/useTranslation';
import ReactECharts from "echarts-for-react";
// Use our trimmed ECharts core to keep the chart chunk small
import { echarts } from '@/lib/echartsCore';
import type {
  EChartsOption,
  GridComponentOption,
  TooltipComponentOption,
  XAXisComponentOption,
  YAXisComponentOption
} from "echarts";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { Skeleton } from "@/components/ui/skeleton";
import type { EChartsEventMap, EChartsComponentRef } from '@/lib/echartsTypes';
import { useChartExport } from "@/hooks/useChartExport";
import { chartRegistry, type ChartType } from "@/lib/chartRegistry";

type EventsMap = EChartsEventMap;

export type EChartExportRegistration = {
  /** Unique id for registry; provide to group charts and ensure stable keys */
  id?: string;
  /** Optional chart type to aid titling and selection */
  type?: ChartType;
  /** Optional human-readable title used in PDF */
  title?: string;
  /** Optional student id for scoping */
  studentId?: string;
  /** Optional filters used to build the chart (for export metadata) */
  filters?: Record<string, unknown>;
  /** Optional date range used by the chart */
  dateRange?: { start: Date; end: Date };
};

export type EChartContainerProps = {
  option: EChartsOption;
  className?: string;
  height?: number | string;
  width?: number | string;
  onEvents?: EventsMap;
  style?: React.CSSProperties;
  /**
   * Optional runtime overrides for emphasis/tooltip/theme settings.
   * These are shallow-merged after the base theme to allow per-instance control.
   */
  chartDefaults?: Partial<EChartsOption>;
  /** Optional registration so this chart can be included in PDF export */
  exportRegistration?: EChartExportRegistration;
  /** INTERNAL: ref to ReactECharts instance for export hooks */
  __innerChartRef__?: React.Ref<EChartsComponentRef>;
};

/**
 * EChartContainer
 *
 * Centralized ECharts theming and safety guards for our visualizations.
 *
 * Key behavioral decision: We disable all hover-dimming/focus states.
 * Many browsers/GPU combos apply opacity transitions to non-hovered series,
 * which caused users to perceive the chart as "disappearing" on hover.
 * We enforce stable opacity via emphasis.disabled and a blur state with
 * opacity 1 so every series remains fully visible at all times.
 */

// Emotion-specific colors for autism-friendly visualization
const emotionColors = {
  happy: "hsl(90 70% 65%)",      // Soft green
  calm: "hsl(180 45% 75%)",      // Soft blue
  anxious: "hsl(40 65% 70%)",    // Soft yellow/orange
  sad: "hsl(220 45% 65%)",       // Muted blue
  angry: "hsl(10 70% 65%)",      // Soft red
  excited: "hsl(280 55% 70%)",   // Soft purple
  overwhelmed: "hsl(300 40% 60%)", // Muted magenta
  neutral: "hsl(240 8% 63%)"     // Gray
};

// (sensory-specific color map removed; not used here)

const createBaseTheme = (tAnalytics: (key: string, options?: Record<string, unknown>) => string) => ({
    color: [
      "hsl(var(--primary))",        // Primary purple
      emotionColors.calm,            // Calm blue
      emotionColors.happy,           // Happy green
      emotionColors.anxious,         // Anxious yellow
      emotionColors.sad,             // Sad blue
      emotionColors.excited,         // Excited purple
      emotionColors.overwhelmed,     // Overwhelmed magenta
      emotionColors.neutral          // Neutral gray
    ] as string[],
    backgroundColor: "transparent",
    textStyle: {
      color: "hsl(var(--foreground))",
      fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      fontSize: 13
    },
    grid: {
      top: 48,
      right: 24,
      bottom: 48,
      left: 56,
      containLabel: true,
      backgroundColor: "rgba(0, 0, 0, 0.02)",
      borderColor: "transparent"
    },
    axisPointer: { 
      lineStyle: { 
        color: "hsl(var(--primary))", 
        width: 2,
        type: 'dashed'
      },
      label: {
        backgroundColor: "hsl(var(--card))",
        borderColor: "hsl(var(--primary))",
        borderWidth: 1,
        color: "hsl(var(--foreground))",
        fontSize: 12,
        padding: [4, 8]
      }
    },
    tooltip: {
      trigger: "axis",
      confine: true,
      // Append tooltip to body to avoid clipping/paint issues inside transformed/overflow containers
      appendToBody: true,
      // Avoid animation-induced flicker on some GPUs
      transitionDuration: 0,
      enterable: true,
      backgroundColor: "hsl(var(--card))",
      borderColor: "hsl(var(--primary) / 0.5)",
      borderWidth: 1,
      textStyle: { 
        color: "hsl(var(--foreground))", 
        fontSize: 14,
        fontWeight: 500
      },
      padding: [12, 16],
      // Robust formatter for dataset-encoded series
      formatter: function (params: unknown) {
        type TP = {
          seriesName?: string;
          color?: string;
          name?: string;
          axisValueLabel?: string;
          value?: unknown;
          encode?: { y?: number | string | Array<number | string> };
          data?: Record<string, unknown> | unknown;
        };
        const toNumber = (v: unknown) => (typeof v === 'number' ? v : Number(v));
        const formatValue = (v: unknown) => {
          const n = toNumber(v);
          return Number.isFinite(n) ? n.toFixed(1) : String(v ?? '');
        };
        const getEmotionIcon = (name: string | undefined) => {
          const icons: Record<string, string> = {
            happy: '😊', sad: '😢', anxious: '😰', calm: '😌', excited: '🤗', angry: '😤', overwhelmed: '😵', default: '🔵'
          };
          return typeof name === 'string' ? (icons[name.toLowerCase()] || icons.default) : icons.default;
        };
        const seriesNameToKey = (name?: string): string | undefined => {
          if (!name) return undefined;
          const n = name.toLowerCase();
          if (n.includes(String(tAnalytics('charts.avgEmotionIntensity')).toLowerCase())) return 'avgEmotionIntensity';
          if (n.includes('7d') || n.includes('ma')) return 'avgEmotionIntensityMA';
          if (n.includes(String(tAnalytics('charts.positiveEmotions')).toLowerCase().split(' ')[0])) return 'positiveEmotions';
          if (n.includes(String(tAnalytics('charts.negativeEmotions')).toLowerCase().split(' ')[0])) return 'negativeEmotions';
          if (n.includes(String(tAnalytics('charts.sensoryInputs')).toLowerCase().split(' ')[0])) return 'totalSensoryInputs';
          return undefined;
        };

        const getSeriesKey = (p: TP): string | undefined => {
          const metaKey = (p as any)?.meta?.key;
          if (typeof metaKey === 'string' && metaKey.length > 0) return metaKey;
          const encY = (p as any)?.encode?.y;
          if (typeof encY === 'string') return encY;
          if (Array.isArray(encY)) {
            const firstString = (encY as Array<unknown>).find((x) => typeof x === 'string');
            if (typeof firstString === 'string') return firstString;
          }
          return undefined;
        };

        const valueFromParam = (p: TP) => {
          let yKey: string | number | undefined = getSeriesKey(p);
          if (yKey == null) {
            const inferred = seriesNameToKey((p as TP).seriesName as string | undefined);
            if (inferred) yKey = inferred as unknown as string;
          }
          // Prefer numeric value if provided directly
          if (typeof (p as TP)?.value === 'number') return (p as TP).value as number;
          // If value is an array (multi-dim), try y index
          if (Array.isArray((p as TP)?.value)) {
            if (typeof yKey === 'number') return ((p as TP).value as unknown[])[yKey] as number;
          }
          // If value is an object with named dimensions
          if ((p as TP)?.value && typeof (p as TP).value === 'object' && !Array.isArray((p as TP).value)) {
            if (typeof yKey === 'string' && (yKey in ((p as TP).value as Record<string, unknown>))) {
              return ((p as TP).value as Record<string, unknown>)[yKey] as number;
            }
            // fallback: first numeric property
            const obj = (p as TP).value as Record<string, unknown>;
            for (const k of Object.keys(obj)) {
              const v = obj[k];
              if (typeof v === 'number' && Number.isFinite(v)) return v;
            }
          }
          // If dataset row object is present, use y key from encode
          if ((p as TP)?.data && typeof (p as TP).data === 'object') {
            if (typeof yKey === 'string' && yKey in ((p as TP).data as Record<string, unknown>)) return ((p as TP).data as Record<string, unknown>)[yKey] as number;
          }
          return (p as TP)?.value; // fallback
        };
        // Multi-series - use semantic HTML with minimal necessary styles
        if (Array.isArray(params) && params.length > 0) {
          const date = (params[0] as TP)?.axisValueLabel || '';
          let content = `<div class="chart-tooltip-header">${date}</div>`;
          params.forEach((p) => {
            const tp = p as TP;
            if (tp && typeof tp === 'object') {
              const val = valueFromParam(tp);
              const icon = getEmotionIcon(tp.seriesName);
              // Only use color for the series marker, which needs the actual color value
              content += `
                <div class="chart-tooltip-item">
                  <span class="chart-tooltip-icon">${icon}</span>
                  <span class="chart-tooltip-label" style="color: ${tp.color};">${tp.seriesName ?? ''}:</span>
                  <span class="chart-tooltip-value">${formatValue(val)}</span>
                </div>`;
            }
          });
          return content;
        }
        // Single-series - use semantic HTML with minimal necessary styles
        if (params && typeof params === 'object') {
          const p = params as TP;
          const val = valueFromParam(p);
          const icon = getEmotionIcon(p.seriesName);
          return `
            <div class="chart-tooltip-header">${p.name ?? ''}</div>
            <div class="chart-tooltip-item"> 
              <span class="chart-tooltip-icon">${icon}</span>
              <span class="chart-tooltip-label" style="color: ${p.color};">${p.seriesName ?? ''}:</span>
              <span class="chart-tooltip-value">${formatValue(val)}</span>
            </div>`;
        }
        return '';
      },
      // Simplified tooltip styling with CSS variables
      extraCssText: `
        border-radius: 8px;
        box-shadow: 0 2px 8px hsla(0, 0%, 0%, 0.1);
      ` + `
        .chart-tooltip-header {
          font-weight: 600;
          margin-bottom: 8px;
          color: hsl(var(--foreground));
        }
        .chart-tooltip-item {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 4px 0;
        }
        .chart-tooltip-icon {
          font-size: 16px;
        }
        .chart-tooltip-label {
          font-weight: 500;
        }
        .chart-tooltip-value {
          font-weight: 600;
          color: hsl(var(--foreground));
        }
      `
    },
    xAxis: {
      axisLine: { 
        lineStyle: { 
          color: "hsl(var(--border))",
          width: 2
        } 
      },
      axisTick: { 
        show: true,
        lineStyle: { color: "hsl(var(--border))" }
      },
      axisLabel: { 
        color: "hsl(var(--foreground))", 
        fontSize: 12,
        fontWeight: 500,
        margin: 12
      },
      splitLine: { 
        lineStyle: { 
          color: "hsl(var(--border) / 0.15)",
          type: 'dashed'
        } 
      }
    },
    yAxis: {
      axisLine: { 
        show: true, 
        lineStyle: { 
          color: "hsl(var(--border))",
          width: 2
        } 
      },
      axisTick: { 
        show: true,
        lineStyle: { color: "hsl(var(--border))" }
      },
      axisLabel: { 
        color: "hsl(var(--foreground))", 
        fontSize: 12,
        fontWeight: 500,
        margin: 12
      },
      splitLine: { 
        lineStyle: { 
          color: "hsl(var(--border) / 0.15)",
          type: 'dashed'
        } 
      },
      nameTextStyle: {
        color: "hsl(var(--muted-foreground))",
        fontSize: 12,
        padding: [0, 0, 8, 0]
      }
    },
    legend: {
      show: true,
      top: 0,
      right: 0,
      icon: 'circle',
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 16,
      textStyle: {
        color: "hsl(var(--foreground))",
        fontSize: 14,
        fontWeight: 500
      },
      inactiveColor: "hsl(var(--muted-foreground) / 0.5)",
      pageTextStyle: {
        color: "hsl(var(--foreground))"
      }
    },
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut'
});

function EChartContainerBase({
  option,
  className,
  height = 320,
  width = "100%",
  onEvents,
  style,
  chartDefaults,
  __innerChartRef__
}: EChartContainerProps) {
  const { tAnalytics } = useTranslation();
  // Defensive: guard against undefined/empty/invalid options
  const safeOption: EChartsOption = useMemo(() => {
    try {
      if (!option || typeof option !== "object") {
        if (import.meta?.env?.DEV) {
          logger.warn("[EChartContainer] Received invalid option, using fallback");
        }
        return { series: [], xAxis: {}, yAxis: {} } as EChartsOption;
    }
      const series = (option as EChartsOption & { series?: unknown }).series as unknown;
      if (series == null) {
        return { ...option, series: [] } as EChartsOption;
      }
      if (Array.isArray(series)) {
        // Ensure each series has a type to avoid echarts throwing
        const normalized = (series as unknown[]).map((s) => (s && typeof s === "object" ? s : {}));
        return { ...(option as EChartsOption), series: normalized } as EChartsOption;
      }
      // Non-array series objects are allowed by echarts, keep as-is
      return option as EChartsOption;
    } catch (e) {
      if (import.meta?.env?.DEV) {
        logger.error("[EChartContainer] Option normalization failed", { error: e });
      }
      return { series: [], xAxis: {}, yAxis: {} } as EChartsOption;
    }
  }, [option]);

  const themed = useMemo(() => {
    try {
      const baseTheme = createBaseTheme(tAnalytics);
      const xAxis = (safeOption as EChartsOption).xAxis as XAXisComponentOption | XAXisComponentOption[] | undefined;
      const yAxis = (safeOption as EChartsOption).yAxis as YAXisComponentOption | YAXisComponentOption[] | undefined;

      const normalizeXAxis = (xa?: XAXisComponentOption | XAXisComponentOption[]) =>
        Array.isArray(xa)
          ? xa.map((x) => ({ ...baseTheme.xAxis, ...x } as XAXisComponentOption))
          : ({ ...baseTheme.xAxis, ...(xa as XAXisComponentOption) } as XAXisComponentOption);

      const normalizeYAxis = (ya?: YAXisComponentOption | YAXisComponentOption[]) =>
        Array.isArray(ya)
          ? ya.map((y) => ({ ...baseTheme.yAxis, ...y } as YAXisComponentOption))
          : ({ ...baseTheme.yAxis, ...(ya as YAXisComponentOption) } as YAXisComponentOption);

      // Apply global defaults to every chart and every series
       // Enforce no-dimming behavior for all charts that pass through here
       const withGlobalSeriesDefaults = (opt: EChartsOption): EChartsOption => {
        const s = (opt.series ?? []) as unknown[];
        if (!Array.isArray(s)) return opt;
        const enhanced = (s as Array<Record<string, unknown>>).map((series) => {
          const existingEmphasis = (series.emphasis ?? {}) as Record<string, unknown>;
           // Keep series fully opaque on hover; disable blur/dim transitions entirely.
           // Rationale: prevents non-hovered series from fading, which previously
           // looked like the graph disappearing to some users.
          const mergedEmphasis = {
            ...existingEmphasis,
            disabled: true,
            focus: 'none',
            blurScope: 'global',
            lineStyle: { opacity: 1 },
            itemStyle: {
              opacity: 1,
              shadowBlur: 10,
              shadowColor: 'rgba(255,255,255,0.18)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.35)'
            },
          } as Record<string, unknown>;
          const mergedBlur = {
            lineStyle: { opacity: 1 },
            itemStyle: { opacity: 1 },
          } as Record<string, unknown>;
          return { ...series, emphasis: mergedEmphasis, blur: mergedBlur, select: { disabled: true } } as Record<string, unknown>;
        });
        return { ...opt, series: enhanced } as EChartsOption;
      };

      const themedOption: EChartsOption = withGlobalSeriesDefaults({
        ...(safeOption as EChartsOption),
        backgroundColor: baseTheme.backgroundColor,
        textStyle: { ...baseTheme.textStyle, ...(safeOption as EChartsOption).textStyle },
        grid: { ...baseTheme.grid, ...(safeOption as EChartsOption).grid } as GridComponentOption,
        xAxis: normalizeXAxis(xAxis),
        yAxis: normalizeYAxis(yAxis),
        color: (safeOption as EChartsOption).color ?? Array.from(baseTheme.color),
        tooltip: { ...baseTheme.tooltip, ...(safeOption as EChartsOption).tooltip } as TooltipComponentOption,
        legend: (safeOption as EChartsOption).legend as Record<string, unknown>,
        stateAnimation: { duration: 0 },
        ...(chartDefaults || {}),
      });

      return themedOption;
    } catch (e) {
      if (import.meta?.env?.DEV) {
        logger.error("[EChartContainer] Theme merge failed", { 
          error: e,
          optionPreview: (() => {
            try { return JSON.stringify(safeOption, (_k, v) => (v instanceof Date ? v.toISOString() : v)); } catch { return "[unserializable]"; }
          })()
        });
      }
      return { series: [] } as EChartsOption;
    }
  }, [safeOption, chartDefaults, tAnalytics]);

  // Fail-soft: treat non-array truthy series as having data, but avoid crashing render
  const hasSeries = (() => {
    const s = (themed as EChartsOption & { series?: unknown }).series as unknown;
    return Array.isArray(s) ? s.length > 0 : Boolean(s);
  })();

  // Avoid remounting chart instance on hover/pointer changes – only recreate on deep structural changes
  const optionSignature = useMemo(() => {
    try {
      const opt = themed as EChartsOption & { series?: unknown; dataset?: { source?: unknown } };
      const rawSeries = (opt.series ?? []) as unknown;
      const series = Array.isArray(rawSeries)
        ? (rawSeries as Array<Record<string, unknown>>)
        : rawSeries
        ? [rawSeries as Record<string, unknown>]
        : [];
      const seriesKinds = series.map((s) => String((s?.type as string) ?? ''));
      const yAxisVal = (opt as unknown as { yAxis?: unknown }).yAxis as unknown;
      const yAxes = Array.isArray(yAxisVal as unknown[]) ? (yAxisVal as unknown[]).length : 1;
      // Only depend on high-level shape, not data lengths which can change with hover/zoom
      return JSON.stringify({ seriesKinds, yAxes });
    } catch {
      return 'shape-default';
    }
  }, [themed]);

  return (
    <div
      className={cn("rounded-xl border bg-card w-full", className)}
      data-testid="echart-container"
      style={{ // RADIX_INLINE_STYLE_ALLOWED - ECharts container needs explicit overflow control
        // Let tooltips/axis pointers render outside if needed; prevents canvas disappearing in some browsers
        overflow: "visible",
        // Ensure container has a visible size even if parent has no intrinsic height
        minHeight: typeof height === "number" ? height : undefined,
        width: typeof width === "number" ? width : undefined,
      }}
    >
      {hasSeries ? (
        <ReactECharts
          // Keep a stable component instance to prevent disappearing canvas on hover
          key={optionSignature}
          option={themed}
          notMerge
          lazyUpdate={false}
          // Keep chart itself explicitly sized
          style={{ height, width: width ?? "100%", ...style }} // RADIX_INLINE_STYLE_ALLOWED - ReactECharts requires style prop for dimensions
          onEvents={onEvents}
          echarts={echarts}
          ref={__innerChartRef__}
        />
      ) : (
        <div className="p-4">
          <Skeleton className="h-[240px] w-full rounded-md" />
          <div className="mt-2 h-4 w-1/3 bg-muted rounded" />
        </div>
      )}
    </div>
  );
}


function EChartContainerWithExport(props: EChartContainerProps & { exportRegistration?: EChartExportRegistration }) {
  const innerRef = useRef<EChartsComponentRef | null>(null);

  const exportMethods = useChartExport(innerRef);

  // Register/unregister with registry when id provided
  React.useEffect(() => {
    const reg = props.exportRegistration;
    if (reg?.id) {
      chartRegistry.register({
        id: reg.id,
        type: reg.type ?? 'custom',
        title: reg.title ?? 'Chart',
        studentId: reg.studentId,
        filters: reg.filters,
        dateRange: reg.dateRange,
        getMethods: () => exportMethods,
      });
      // keep metadata up to date when inputs change
      chartRegistry.updateMetadata(reg.id, {
        type: reg.type ?? 'custom',
        title: reg.title ?? 'Chart',
        ...(reg.filters ? { filters: reg.filters } : {}),
        ...(reg.dateRange ? { dateRange: reg.dateRange } : {}),
      });
      return () => chartRegistry.unregister(reg.id!);
    }
    return;
  }, [props.exportRegistration?.id, props.exportRegistration?.title, props.exportRegistration?.studentId, props.exportRegistration?.type, props.exportRegistration?.filters, props.exportRegistration?.dateRange, exportMethods]);

  return (
    <EChartContainerBase {...props} __innerChartRef__={innerRef} />
  );
}

export const EChartContainer = memo(EChartContainerWithExport);

