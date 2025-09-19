import type { ExportTemplate, ChartQuality, ColorScheme } from '@/components/ExportDialog';
import { logger } from '@/lib/logger';

export interface LayoutConfig {
  pageSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
  margins: { top: number; bottom: number; left: number; right: number };
  fontSize: { base: number; title: number; subtitle: number; caption: number };
  chartSize: { width: number; height: number };
  chartsPerPage: number;
  includePageNumbers: boolean;
  includeTimestamp: boolean;
}

export interface ChartConfig {
  dpi: number;
  format: 'png' | 'svg';
  backgroundColor: string;
  colorPalette?: string[];
}

/**
 * Get layout configuration for a template
 */
export function getLayoutConfig(template: ExportTemplate): LayoutConfig {
  const base: LayoutConfig = {
    pageSize: 'a4',
    orientation: 'portrait',
    margins: { top: 20, bottom: 20, left: 20, right: 20 },
    fontSize: { base: 10, title: 16, subtitle: 12, caption: 8 },
    chartSize: { width: 500, height: 300 },
    chartsPerPage: 2,
    includePageNumbers: true,
    includeTimestamp: true
  };

  switch (template) {
    case 'summary':
      return {
        ...base,
        chartSize: { width: 400, height: 250 },
        chartsPerPage: 3,
        fontSize: { ...base.fontSize, base: 9 }
      };
    
    case 'presentation':
      return {
        ...base,
        orientation: 'landscape',
        chartSize: { width: 700, height: 400 },
        chartsPerPage: 1,
        fontSize: { base: 12, title: 20, subtitle: 14, caption: 10 }
      };
    
    case 'detailed':
    default:
      return base;
  }
}

/**
 * Get chart export configuration
 */
export function getChartConfig(quality: ChartQuality, scheme: ColorScheme): ChartConfig {
  const base: ChartConfig = {
    dpi: 150,
    format: 'png',
    backgroundColor: '#ffffff'
  };

  // Quality adjustments
  switch (quality) {
    case 'standard':
      base.dpi = 96;
      break;
    case 'high':
      base.dpi = 150;
      break;
    case 'print':
      base.dpi = 300;
      base.format = 'svg'; // Prefer vector for print
      break;
  }

  // Color scheme adjustments
  switch (scheme) {
    case 'high-contrast':
      base.colorPalette = ['#000000', '#ffffff', '#ff0000', '#0000ff', '#ffff00'];
      break;
    case 'colorblind-friendly':
      // Using colorblind-safe palette from ColorBrewer
      base.colorPalette = ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e'];
      break;
    default:
      // Default theme colors
      break;
  }

  return base;
}

/**
 * Get accessible text alternatives for charts
 */
export function getChartA11yDescription(chartType: string, data: any): string {
  try {
    switch (chartType) {
      case 'bar':
        return `Bar chart showing ${data.title || 'data distribution'}. Highest value: ${data.maxValue}, lowest value: ${data.minValue}.`;
      case 'line':
        return `Line chart displaying ${data.title || 'trend over time'}. Trend: ${data.trend || 'varies'}.`;
      case 'heatmap':
        return `Heatmap visualization of ${data.title || 'correlations'}. Strongest correlation: ${data.strongestCorr || 'unknown'}.`;
      default:
        return `Chart visualization of ${data.title || 'analytics data'}.`;
    }
  } catch (e) {
    logger.warn('Failed to generate a11y description', { error: e });
    return 'Data visualization';
  }
}

