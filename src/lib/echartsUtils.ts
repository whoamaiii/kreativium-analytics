import type React from 'react';
import type ReactECharts from 'echarts-for-react';
import type { ECharts, SetOptionOpts } from 'echarts';
import { echarts } from '@/lib/echartsCore';
import type {
  EChartsComponentRef,
  EChartsDataURLOptions,
  EChartsEventMap,
  EChartsInitOptions,
  EChartsOption,
  EChartsOptionUpdateOptions,
  EChartsResizeOptions,
} from '@/lib/echartsTypes';

// Initialize an ECharts instance with typed options
export function initEChart(
  dom: HTMLDivElement,
  theme?: string | Record<string, unknown>,
  opts?: EChartsInitOptions,
): ECharts {
  return echarts.init(dom, theme, opts);
}

// Update chart option with strong typing
export function updateChartOption(
  instance: ECharts,
  option: EChartsOption,
  opts?: EChartsOptionUpdateOptions,
): void {
  const setOpts: SetOptionOpts = {
    notMerge: opts?.notMerge,
    replaceMerge: opts?.replaceMerge,
    lazyUpdate: opts?.lazyUpdate,
    silent: opts?.silent,
  };
  instance.setOption(option, setOpts);
}

// Bind event handlers using a strongly typed map; unbinds previous handlers first
export function bindChartEvents(
  instance: ECharts,
  events?: EChartsEventMap,
): void {
  if (!events) return;
  // For safety, off() without args removes all listeners; then re-attach
  instance.off?.();
  for (const [eventName, handler] of Object.entries(events)) {
    if (typeof handler === 'function') {
      instance.on(eventName, handler);
    }
  }
}

// Safe, typed access to the underlying ECharts instance from a ReactECharts ref
export function getTypedEChartsInstance(
  ref: React.RefObject<EChartsComponentRef | ReactECharts>,
): ECharts | undefined {
  const current = ref?.current as EChartsComponentRef | ReactECharts | null;
  if (!current) return undefined;
  const getter: unknown = (current as Record<string, unknown>).getEchartsInstance ?? (current as Record<string, unknown>).getEChartsInstance ?? (current as Record<string, unknown>).getInstance;
  if (typeof getter === 'function') {
    try {
      const inst = (getter as () => ECharts)();
      if (inst && typeof inst === 'object') return inst as ECharts;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

// Resize with defensive typing
export function resizeChart(instance: ECharts, opts?: EChartsResizeOptions): void {
  try {
    if (typeof instance?.resize === 'function') {
      // echarts resize options support width/height/silent/animation
      instance.resize(opts);
    }
  } catch {
    // no-op; resizing is best-effort
  }
}

// Create image data URL using typed options
export function getChartDataURL(
  instance: ECharts,
  opts?: EChartsDataURLOptions,
): string | undefined {
  try {
    if (typeof instance?.getDataURL === 'function') {
      return instance.getDataURL(opts);
    }
    return undefined;
  } catch {
    return undefined;
  }
}

// Try to call optional SVG rendering when available in build
export function tryRenderToSVGString(instance: ECharts): string | undefined {
  try {
    const anyInst = instance as unknown as { renderToSVGString?: () => string };
    if (typeof anyInst?.renderToSVGString === 'function') {
      return anyInst.renderToSVGString();
    }
    return undefined;
  } catch {
    return undefined;
  }
}


