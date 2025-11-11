import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { EChartContainer } from '@/components/charts/EChartContainer';
import type { EChartsOption } from 'echarts';
import { readGameTelemetry } from '@/lib/game/telemetry';

type Bucket = { bucket: number; predicted: number; actual: number; count: number };

function buildCalibrationFromTelemetry(): { buckets: Bucket[]; brier: number | null } {
  const events = readGameTelemetry();
  const pairs: { predicted: number; actual: number }[] = [];
  for (let i = 0; i < events.length; i += 1) {
    const ev = events[i] as any;
    if (ev?.kind === 'confidence_reported') {
      const predicted =
        typeof ev.confidence === 'number' ? Math.max(0, Math.min(1, ev.confidence)) : null;
      const actual =
        typeof ev.actualProb === 'number' ? Math.max(0, Math.min(1, ev.actualProb)) : null;
      if (predicted != null && actual != null) pairs.push({ predicted, actual });
    }
  }
  if (pairs.length === 0) return { buckets: [], brier: null };
  const bucketSize = 0.1;
  const buckets: Bucket[] = Array.from({ length: 10 }, (_, i) => ({
    bucket: i * bucketSize,
    predicted: 0,
    actual: 0,
    count: 0,
  }));
  for (const p of pairs) {
    const idx = Math.min(9, Math.max(0, Math.floor(p.predicted / bucketSize)));
    const b = buckets[idx];
    b.predicted += p.predicted;
    b.actual += p.actual;
    b.count += 1;
  }
  for (const b of buckets) {
    if (b.count > 0) {
      b.predicted /= b.count;
      b.actual /= b.count;
    }
  }
  // Simple Brier score over pairs
  let brier = 0;
  for (const p of pairs) {
    const diff = p.predicted - p.actual;
    brier += diff * diff;
  }
  brier /= pairs.length;
  return { buckets, brier };
}

function buildOption(buckets: Bucket[], brier: number | null): EChartsOption | null {
  if (!buckets.length) return null;
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Actual', 'Predicted', 'Count'] },
    xAxis: {
      type: 'category',
      name: 'Predicted bucket',
      data: buckets.map((b) => (b.bucket + 0.05).toFixed(2)),
    },
    yAxis: [
      { type: 'value', min: 0, max: 1, name: 'Probability' },
      { type: 'value', min: 0, name: 'Count', position: 'right' },
    ],
    series: [
      {
        name: 'Actual',
        type: 'line',
        smooth: true,
        data: buckets.map((b) => Number(b.actual.toFixed(3))),
      },
      {
        name: 'Predicted',
        type: 'line',
        smooth: true,
        data: buckets.map((b) => Number(b.predicted.toFixed(3))),
        lineStyle: { type: 'dashed' },
      },
      { name: 'Count', type: 'bar', yAxisIndex: 1, data: buckets.map((b) => b.count) },
    ],
    title:
      brier != null
        ? { text: `Calibration (Brier: ${brier.toFixed(3)})`, left: 'center', top: 0 }
        : undefined,
  } as EChartsOption;
}

export default function ConfidenceCalibration() {
  const { tCommon } = useTranslation();
  const { buckets, brier } = useMemo(() => buildCalibrationFromTelemetry(), []);
  const option = useMemo(() => buildOption(buckets, brier), [buckets, brier]);

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {String(tCommon('charts.calibration', { defaultValue: 'Confidence Calibration' }))}
          </h1>
        </div>
        <Card className="p-4">
          {option ? (
            <EChartContainer option={option} height={420} />
          ) : (
            <div className="text-sm text-muted-foreground">
              {String(
                tCommon('charts.noData', {
                  defaultValue: 'No calibration data yet. Play Confidence Mode to collect data.',
                }),
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
