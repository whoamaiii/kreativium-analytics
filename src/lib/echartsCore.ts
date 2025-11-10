// Minimal ECharts core setup to reduce bundle size
// Only register components and charts we actually use
import * as echarts from 'echarts/core';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DatasetComponent,
  VisualMapComponent,
  DataZoomComponent,
  TitleComponent,
  ToolboxComponent,
} from 'echarts/components';
import { LineChart, BarChart, ScatterChart, HeatmapChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  // Renderers
  CanvasRenderer,
  // Core components
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DatasetComponent,
  VisualMapComponent,
  DataZoomComponent,
  TitleComponent,
  ToolboxComponent,
  // Charts
  LineChart,
  BarChart,
  ScatterChart,
  HeatmapChart,
]);

export { echarts };
