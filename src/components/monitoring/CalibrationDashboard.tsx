import React, { useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import useWeeklyReports from '@/hooks/useWeeklyReports';
import {
  createBrierScoreChart,
  createThresholdTrendChart,
  generateCalibrationCurve,
  generateFairnessMetricsChart,
} from '@/lib/chartUtils';
import type { WeeklyEvaluationReport } from '@/lib/alerts/types';

const EChartContainer = React.lazy(() => import('@/components/charts/EChartContainer').then((mod) => ({ default: mod.EChartContainer })));

function hasData(option: unknown): boolean {
  if (!option) return false;
  const series = (option as { series?: unknown[] }).series;
  return Array.isArray(series) ? series.some((entry) => Array.isArray((entry as any)?.data) && (entry as any).data.length > 0) : true;
}

export const CalibrationDashboard = () => {
  const { reports, latestReport, loading, error, trendSummaries } = useWeeklyReports();

  const calibrationOption = useMemo(() => {
    if (!latestReport?.calibration) return null;
    return generateCalibrationCurve(latestReport.calibration);
  }, [latestReport]);

  const brierOption = useMemo(() => (reports.length ? createBrierScoreChart(reports) : null), [reports]);
  const thresholdOption = useMemo(() => (reports.length ? createThresholdTrendChart(reports) : null), [reports]);
  const fairnessOption = useMemo(() => {
    if (!latestReport?.fairness?.length) return null;
    return generateFairnessMetricsChart(latestReport.fairness);
  }, [latestReport]);

  const handleExport = useCallback(() => {
    if (!reports.length) return;
    const payload = {
      generatedAt: new Date().toISOString(),
      reports,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'weekly-alert-reports.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [reports]);

  if (loading) {
    return <div className="h-64 animate-pulse rounded-md border bg-muted" aria-label="Loading calibration dashboard" />;
  }

  if (error) {
    return <div className="rounded-md border border-destructive p-4 text-sm text-destructive">{error}</div>;
  }

  if (!latestReport) {
    return <div className="rounded-md border p-4 text-sm text-muted-foreground">No weekly evaluations available yet.</div>;
  }

  const abExperiments = latestReport.experiments ?? [];
  const thresholdOverrides = latestReport.thresholdLearning?.overrides ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Calibration & Quality Dashboard</h2>
          <p className="text-sm text-muted-foreground">Week starting {new Date(latestReport.weekStart).toLocaleDateString()}</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleExport}>Export JSON</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calibration Reliability</CardTitle>
          </CardHeader>
          <CardContent>
            {calibrationOption && hasData(calibrationOption) ? (
              <React.Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-muted" aria-label="Loading calibration chart" />}>
                <EChartContainer option={calibrationOption} height={260} exportRegistration={{ id: 'alerts-calibration', type: 'calibration', title: 'Alert Calibration Reliability' }} />
              </React.Suspense>
            ) : (
              <p className="text-sm text-muted-foreground">Not enough labelled feedback to build calibration curve.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Brier Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {brierOption && hasData(brierOption) ? (
              <React.Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-muted" aria-label="Loading Brier score chart" />}>
                <EChartContainer option={brierOption} height={260} exportRegistration={{ id: 'alerts-brier', type: 'calibration', title: 'Brier Score Over Time' }} />
              </React.Suspense>
            ) : (
              <p className="text-sm text-muted-foreground">No historical Brier score data available.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fairness Slices</CardTitle>
          </CardHeader>
          <CardContent>
            {fairnessOption && hasData(fairnessOption) ? (
              <React.Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-muted" aria-label="Loading fairness chart" />}>
                <EChartContainer option={fairnessOption} height={280} exportRegistration={{ id: 'alerts-fairness', type: 'calibration', title: 'Fairness Metrics' }} />
              </React.Suspense>
            ) : (
              <p className="text-sm text-muted-foreground">No demographic breakdowns recorded for this week.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Threshold Learning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {thresholdOption && hasData(thresholdOption) ? (
              <React.Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-muted" aria-label="Loading threshold adjustments chart" />}>
                <EChartContainer option={thresholdOption} height={260} exportRegistration={{ id: 'alerts-threshold', type: 'calibration', title: 'Threshold Adjustments' }} />
              </React.Suspense>
            ) : (
              <p className="text-sm text-muted-foreground">No threshold adjustments have been applied yet.</p>
            )}
            {thresholdOverrides.length ? (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {thresholdOverrides.map((override) => (
                  <li key={override.detectorType}>{override.detectorType}: {Math.round((override.adjustmentValue ?? 0) * 100)}% adjustment · samples {override.sampleSize ?? 'n/a'}</li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Highlights</CardTitle>
        </CardHeader>
        <CardContent>
          {trendSummaries.length ? (
            <ul className="grid gap-2 md:grid-cols-3 text-sm">
              {trendSummaries.map((trend) => (
                <li key={trend.metric} className="rounded border border-border p-2">
                  <p className="font-semibold capitalize">{trend.metric}</p>
                  <p className="text-muted-foreground">Δ {trend.delta.toFixed(3)} ({trend.direction})</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Need at least two weeks of reports to calculate trends.</p>
          )}
        </CardContent>
      </Card>

      {abExperiments.length ? (
        <Card>
          <CardHeader>
            <CardTitle>A/B Experiment Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {abExperiments.map((experiment) => (
                <div key={experiment.key} className="rounded border border-border p-3">
                  <p className="font-semibold">{experiment.key}</p>
                  <p className="text-xs text-muted-foreground">{experiment.hypothesis ?? 'Threshold tuning experiment'}</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {experiment.variants?.map((variant) => (
                      <li key={variant.variant}>
                        <span className="font-medium">Variant {variant.variant}:</span> PPV {(variant.ppv ?? 0).toFixed(2)}, n={variant.samples}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default CalibrationDashboard;
