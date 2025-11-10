import React, { Suspense, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { EChartsOption } from 'echarts';
import { readGameTelemetry } from '@/lib/game/telemetry';

const EChartContainer = React.lazy(() =>
  import('@/components/charts/EChartContainer').then((m) => ({ default: m.EChartContainer })),
);

export function CalibrationErrorSparkline({ maxPoints = 30 }: { maxPoints?: number }) {
  const data = useMemo(() => {
    const events = readGameTelemetry();
    const points: { ts: number; err: number }[] = [];
    for (let i = 0; i < events.length; i += 1) {
      const ev = events[i] as any;
      if (ev?.kind === 'confidence_reported') {
        const ts = typeof ev.ts === 'number' ? ev.ts : Date.now();
        const err =
          typeof ev.calibrationError === 'number'
            ? Math.max(0, Math.min(1, ev.calibrationError))
            : null;
        if (err != null) points.push({ ts, err });
      }
    }
    // Sort and take last N
    const sorted = points.sort((a, b) => a.ts - b.ts);
    return sorted.slice(Math.max(0, sorted.length - maxPoints));
  }, [maxPoints]);

  const option: EChartsOption | null = useMemo(() => {
    if (!data.length) return null;
    return {
      grid: { top: 8, bottom: 12, left: 24, right: 8 },
      xAxis: {
        type: 'time',
        axisLabel: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 1,
        axisLabel: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
        splitLine: { show: false },
      },
      series: [
        {
          type: 'line',
          smooth: true,
          showSymbol: false,
          areaStyle: { opacity: 0.25 },
          data: data.map((p) => [p.ts, Number(p.err.toFixed(3))]),
        },
      ],
      tooltip: { trigger: 'axis' },
    } as EChartsOption;
  }, [data]);

  if (!option) {
    return <div className="text-xs text-foreground/60">No confidence data</div>;
  }

  return (
    <Suspense fallback={<Skeleton className="h-10 w-40" />}>
      <div className="w-40 h-10">
        <EChartContainer option={option} height={40} />
      </div>
    </Suspense>
  );
}

export default CalibrationErrorSparkline;
