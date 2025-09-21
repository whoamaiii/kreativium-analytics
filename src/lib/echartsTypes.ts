// Centralized ECharts TypeScript types to ensure type-safe integration
// across components, hooks, and utilities.

import type ReactECharts from 'echarts-for-react';
import type { EChartsOption, ECharts } from 'echarts';

// Re-export instance type from echarts-for-react for consumers
export type { EChartsInstance } from 'echarts-for-react';

// Component ref type for ReactECharts instance
export type EChartsComponentRef = InstanceType<typeof ReactECharts>;

// Common event parameter shapes (kept pragmatic while being specific enough
// for typical usage in charts within this codebase)
export type EChartsBaseEvent = {
  type?: string;
  componentType?: string;
  seriesType?: string;
  seriesIndex?: number;
  seriesName?: string;
  name?: string;
  dataIndex?: number;
  data?: unknown;
  value?: unknown;
  color?: string;
  event?: MouseEvent | PointerEvent | TouchEvent;
};

export type EChartsClickEvent = EChartsBaseEvent & {
  event?: MouseEvent | PointerEvent | TouchEvent;
};

export type EChartsMouseEvent = EChartsBaseEvent & {
  event?: MouseEvent | PointerEvent | TouchEvent;
};

export type EChartsBrushEvent = {
  areas?: Array<Record<string, unknown>>;
  type?: string;
};

// Map of supported event handlers used by our components
export interface EChartsEventMap {
  click?: (params: EChartsClickEvent, instance?: ECharts) => void;
  mouseover?: (params: EChartsMouseEvent, instance?: ECharts) => void;
  mouseout?: (params: EChartsMouseEvent, instance?: ECharts) => void;
  mousemove?: (params: EChartsMouseEvent, instance?: ECharts) => void;
  brush?: (params: EChartsBrushEvent, instance?: ECharts) => void;
  datazoom?: (params: Record<string, unknown>, instance?: ECharts) => void;
  highlight?: (params: Record<string, unknown>, instance?: ECharts) => void;
  downplay?: (params: Record<string, unknown>, instance?: ECharts) => void;
  legendselectchanged?: (params: Record<string, unknown>, instance?: ECharts) => void;
  // Allow other events while still providing strong typing for the common ones above
  [customEvent: string]: (params: unknown, instance?: ECharts) => void;
}

// Initialization options for charts (forward compatible with ECharts init)
export interface EChartsInitOptions {
  renderer?: 'canvas' | 'svg';
  locale?: string;
  devicePixelRatio?: number;
  useDirtyRect?: boolean;
}

// Resize options
export interface EChartsResizeOptions {
  width?: number | string;
  height?: number | string;
  silent?: boolean;
  animation?: { duration?: number; easing?: string };
}

// Data URL generation options
export interface EChartsDataURLOptions {
  type?: 'png' | 'jpg' | 'svg';
  pixelRatio?: number;
  backgroundColor?: string;
  excludeComponents?: string[];
}

// Option update options for setOption
export interface EChartsOptionUpdateOptions {
  notMerge?: boolean;
  replaceMerge?: string[];
  lazyUpdate?: boolean;
  silent?: boolean;
}

export type { EChartsOption };


