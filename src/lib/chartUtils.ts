import type { EChartsOption } from 'echarts';
import type {
  CalibrationMetrics,
  FairnessMetric,
  WeeklyEvaluationReport,
} from '@/lib/alerts/types';

export interface SparklinePoint {
  timestamp: number;
  value: number;
}

export interface SparklineData {
  timestamps: number[];
  values: number[];
  min: number;
  max: number;
  latest?: number;
}

export interface SparklineConfigOptions {
  color?: string;
  height?: number;
  curve?: 'linear' | 'smooth';
  areaOpacity?: number;
}

export interface SparklineConfig {
  type: 'sparkline';
  color: string;
  height: number;
  curve: 'linear' | 'smooth';
  areaOpacity: number;
}

function clampBuckets(requested: number, max: number): number {
  if (!Number.isFinite(requested) || requested <= 1) return Math.min(10, max);
  return Math.min(Math.max(Math.floor(requested), 2), max);
}

export function generateSparklineData(
  points: SparklinePoint[],
  opts?: { buckets?: number },
): SparklineData {
  if (!Array.isArray(points) || points.length === 0) {
    return { timestamps: [], values: [], min: 0, max: 0 };
  }
  const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);
  const unique = sorted.filter((point, index) => {
    if (index === 0) return true;
    return point.timestamp !== sorted[index - 1].timestamp;
  });

  const bucketCount = clampBuckets(opts?.buckets ?? 8, unique.length);
  if (unique.length <= bucketCount) {
    const values = unique.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return {
      timestamps: unique.map((p) => p.timestamp),
      values,
      min,
      max,
      latest: values[values.length - 1],
    };
  }

  const step = (unique.length - 1) / (bucketCount - 1);
  const sampled: SparklinePoint[] = [];
  for (let i = 0; i < bucketCount; i += 1) {
    const idx = Math.round(i * step);
    sampled.push(unique[Math.min(idx, unique.length - 1)]);
  }
  const values = sampled.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return {
    timestamps: sampled.map((p) => p.timestamp),
    values,
    min,
    max,
    latest: values[values.length - 1],
  };
}

export function createSparklineConfig(options?: SparklineConfigOptions): SparklineConfig {
  return {
    type: 'sparkline',
    color: options?.color ?? '#0f172a',
    height: options?.height ?? 32,
    curve: options?.curve ?? 'smooth',
    areaOpacity: options?.areaOpacity ?? 0.25,
  };
}

export function formatSparklineValue(
  value: number,
  kind: 'default' | 'percentage' | 'intensity' = 'default',
): string {
  if (!Number.isFinite(value)) return '—';
  switch (kind) {
    case 'percentage':
      if (value <= 1 && value >= 0) {
        return `${Math.round(value * 100)}%`;
      }
      return `${Math.round(value)}%`;
    case 'intensity':
      return value.toFixed(1);
    default:
      if (Math.abs(value) >= 100) return Math.round(value).toString();
      if (Math.abs(value) >= 10) return value.toFixed(1);
      return value.toFixed(2);
  }
}

export function deriveSparklineKindFromAlert(alert: {
  kind?: string;
}): 'percentage' | 'intensity' | 'default' {
  const raw = typeof alert.kind === 'string' ? alert.kind : '';
  const normalized = raw.toLowerCase().replace(/[^a-z]/g, '');
  switch (normalized) {
    case 'behaviorspike':
      return 'intensity';
    case 'contextassociation':
      return 'percentage';
    default:
      return 'default';
  }
}

export function formatCalibrationData(calibration: CalibrationMetrics): {
  buckets: number[];
  predicted: number[];
  actual: number[];
  counts: number[];
} {
  const buckets: number[] = [];
  const predicted: number[] = [];
  const actual: number[] = [];
  const counts: number[] = [];
  (calibration.reliability ?? []).forEach((point) => {
    buckets.push(Math.round(point.bucket * 100) / 100);
    predicted.push(Number(point.predicted?.toFixed(3) ?? 0));
    actual.push(Number(point.actual?.toFixed(3) ?? 0));
    counts.push(point.count);
  });
  return { buckets, predicted, actual, counts };
}

export function generateCalibrationCurve(
  calibration: CalibrationMetrics | null | undefined,
): EChartsOption | null {
  if (!calibration) return null;
  const { buckets, predicted, actual, counts } = formatCalibrationData(calibration);
  if (!buckets.length) return null;
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const [actualPoint, predictedPoint, countPoint] = params;
        return [
          `Bucket ${(predictedPoint?.axisValue ?? 0).toFixed(2)}`,
          `Predicted: ${(predictedPoint?.data ?? 0).toFixed(2)}`,
          `Actual: ${(actualPoint?.data ?? 0).toFixed(2)}`,
          `Count: ${countPoint?.data ?? 0}`,
        ].join('<br/>');
      },
    },
    legend: {
      data: ['Predicted', 'Actual', 'Count'],
    },
    xAxis: {
      type: 'category',
      data: buckets.map((b) => b.toFixed(2)),
      name: 'Predicted probability',
    },
    yAxis: [
      { type: 'value', min: 0, max: 1, name: 'Probability' },
      {
        type: 'value',
        name: 'Count',
        position: 'right',
        min: 0,
        axisLabel: { formatter: '{value}' },
      },
    ],
    series: [
      {
        name: 'Actual',
        type: 'line',
        data: actual,
        smooth: true,
      },
      {
        name: 'Predicted',
        type: 'line',
        data: predicted,
        smooth: true,
        lineStyle: { type: 'dashed' },
      },
      {
        name: 'Count',
        type: 'bar',
        yAxisIndex: 1,
        data: counts,
        opacity: 0.4,
      },
    ],
  } as EChartsOption;
}

export function createBrierScoreChart(reports: WeeklyEvaluationReport[]): EChartsOption | null {
  const points = reports
    .map((report) => {
      const score = report.calibration?.brierScore ?? null;
      if (score === null || score === undefined) return null;
      return {
        date: report.weekStart,
        score,
      };
    })
    .filter((point): point is { date: string; score: number } => !!point);

  if (!points.length) return null;

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const point = params?.[0];
        const date = point ? new Date(point.axisValue).toLocaleDateString() : '';
        return `${date}<br/>Brier score: ${(point?.data ?? 0).toFixed(3)}`;
      },
    },
    xAxis: {
      type: 'category',
      data: points.map((p) => new Date(p.date).toLocaleDateString()),
    },
    yAxis: {
      type: 'value',
      name: 'Brier score',
      min: 0,
    },
    series: [
      {
        name: 'Brier score',
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.2 },
        data: points.map((p) => Number(p.score.toFixed(3))),
      },
    ],
  } as EChartsOption;
}

export function generateFairnessMetricsChart(fairness: FairnessMetric[]): EChartsOption | null {
  if (!Array.isArray(fairness) || fairness.length === 0) return null;
  const categories = fairness.map((metric) => metric.groupKey);
  const ppv = fairness.map((metric) =>
    typeof metric.ppv === 'number' ? Number(metric.ppv.toFixed(2)) : null,
  );
  const fpr = fairness.map((metric) =>
    typeof metric.falsePositiveRate === 'number'
      ? Number(metric.falsePositiveRate.toFixed(2))
      : null,
  );

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      data: ['PPV', 'False positive rate'],
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: { rotate: 30 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 1,
    },
    series: [
      {
        name: 'PPV',
        type: 'bar',
        data: ppv,
      },
      {
        name: 'False positive rate',
        type: 'bar',
        data: fpr,
      },
    ],
  } as EChartsOption;
}

export function createThresholdTrendChart(reports: WeeklyEvaluationReport[]): EChartsOption | null {
  const rows: Array<{ date: string; detector: string; adjustment: number }> = [];
  reports.forEach((report) => {
    const overrides = report.thresholdLearning?.overrides ?? [];
    overrides.forEach((override) => {
      rows.push({
        date: new Date(report.weekStart).toLocaleDateString(),
        detector: override.detectorType,
        adjustment: Number((override.adjustmentValue ?? 0).toFixed(3)),
      });
    });
  });

  if (!rows.length) return null;

  const detectors = Array.from(new Set(rows.map((row) => row.detector)));
  const dates = Array.from(new Set(rows.map((row) => row.date)));

  const series = detectors.map((detector) => ({
    name: detector,
    type: 'line',
    smooth: true,
    data: dates.map((date) => {
      const row = rows.find((entry) => entry.detector === detector && entry.date === date);
      return row ? row.adjustment : null;
    }),
  }));

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const lines = params.map(
          (entry: any) => `${entry.seriesName}: ${(entry.data ?? 0) * 100}%`,
        );
        return [params[0]?.axisValue, ...lines].join('<br/>');
      },
    },
    legend: {
      data: detectors,
    },
    xAxis: {
      type: 'category',
      data: dates,
    },
    yAxis: {
      type: 'value',
      min: -0.3,
      max: 0.3,
      axisLabel: {
        formatter: (value: number) => `${Math.round(value * 100)}%`,
      },
    },
    series,
  } as EChartsOption;
}
