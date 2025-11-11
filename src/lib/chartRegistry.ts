import type { ChartExportMethods } from '@/hooks/useChartExport';

export type ChartType = 'trends' | 'distribution' | 'progress' | 'correlation' | 'custom';

export interface ChartRegistration {
  id: string;
  type: ChartType;
  title: string;
  studentId?: string;
  /** Optional filters applied within the chart's data context */
  filters?: Record<string, unknown>;
  /** Optional date range represented in the chart */
  dateRange?: { start: Date; end: Date };
  getMethods: () => ChartExportMethods;
}

class ChartRegistry {
  private charts = new Map<string, ChartRegistration>();

  register(reg: ChartRegistration) {
    this.charts.set(reg.id, reg);
  }

  unregister(id: string) {
    this.charts.delete(id);
  }

  get(id: string) {
    return this.charts.get(id);
  }

  all() {
    return Array.from(this.charts.values());
  }

  byStudent(studentId: string) {
    return this.all().filter((c) => c.studentId === studentId);
  }

  /** Update metadata for a registered chart (filters/dateRange) */
  updateMetadata(
    id: string,
    meta: Pick<ChartRegistration, 'filters' | 'dateRange' | 'title' | 'type'>,
  ) {
    const existing = this.charts.get(id);
    if (!existing) return;
    this.charts.set(id, { ...existing, ...meta });
  }
}

export const chartRegistry = new ChartRegistry();
