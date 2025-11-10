import React, { useEffect, useMemo, useRef, useState, memo } from 'react';
import { AlertEvent, AlertSeverity, ThresholdAdjustmentTrace, TauUResult } from '@/lib/alerts/types';
import { getInterventionsByAlertKind } from '@/lib/interventions/library';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  createSparklineConfig,
  deriveSparklineKindFromAlert,
  formatSparklineValue,
  generateSparklineData,
  SparklineData,
} from '@/lib/chartUtils';
import { alertPerf } from '@/lib/alerts/performance';
import { SEVERITY_COLORS, UI_COLORS } from '@/lib/chartColors';

const severityColors: Record<AlertSeverity, string> = {
  [AlertSeverity.Critical]: SEVERITY_COLORS.critical,
  [AlertSeverity.Important]: SEVERITY_COLORS.important,
  [AlertSeverity.Moderate]: SEVERITY_COLORS.moderate,
  [AlertSeverity.Low]: SEVERITY_COLORS.low,
};

type Props = {
  alert: AlertEvent;
  onCreateGoal?: (alert: AlertEvent) => void;
  onAddInterventionTemplate?: (alert: AlertEvent, interventionId: string) => void;
  onScheduleCheckIn?: (alert: AlertEvent, dateISO: string) => void;
  onAddToReport?: (alert: AlertEvent) => void;
  onNotifyTeam?: (alert: AlertEvent) => void;
  onSubmitFeedback?: (alertId: string, feedback: { relevant?: boolean; comment?: string; rating?: number }) => void;
};

const WideSparkline = ({ data, color, label, interactive }: { data: SparklineData | null; color: string; label: string; interactive?: boolean }) => {
  if (!data || data.values.length < 2) {
    return (
      <div className="flex h-32 w-full items-center justify-center rounded bg-slate-100 text-sm text-slate-500">
        Not enough data to visualise trend
      </div>
    );
  }

  const width = 440;
  const height = 128;
  const min = data.min === data.max ? data.min - 1 : data.min;
  const max = data.min === data.max ? data.max + 1 : data.max;
  const range = max - min || 1;
  const positions = data.values.map((value, idx) => {
    const x = (idx / (data.values.length - 1)) * (width - 20) + 10;
    const y = height - ((value - min) / range) * (height - 20) - 10;
    return { x, y };
  });
  const linePath = positions.map((point, idx) => `${idx === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L${positions[positions.length - 1].x.toFixed(2)},${height - 10} L${positions[0].x.toFixed(2)},${height - 10} Z`;

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState<{ start: number; end: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const startIndex = zoom ? Math.max(0, Math.min(zoom.start, zoom.end)) : 0;
  const endIndex = zoom ? Math.min(data.values.length - 1, Math.max(zoom.start, zoom.end)) : data.values.length - 1;
  const visiblePositions = positions.slice(startIndex, endIndex + 1);
  const visLinePath = visiblePositions.map((point, idx) => `${idx === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
  const visAreaPath = `${visLinePath} L${visiblePositions[visiblePositions.length - 1].x.toFixed(2)},${height - 10} L${visiblePositions[0].x.toFixed(2)},${height - 10} Z`;

  return (
    <svg aria-hidden={!interactive} role="img" width={width} height={height} className="overflow-visible rounded" ref={svgRef}
      onMouseMove={interactive ? (e) => {
        try {
          const rect = (svgRef.current as SVGSVGElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          let closest = 0;
          let best = Number.POSITIVE_INFINITY;
          for (let i = startIndex; i <= endIndex; i += 1) {
            const dx = Math.abs(positions[i].x - x);
            if (dx < best) { best = dx; closest = i; }
          }
          setHoverIdx(closest);
        } catch {}
      } : undefined}
      onMouseLeave={interactive ? () => setHoverIdx(null) : undefined}
    >
      <title>{label}</title>
      <rect width={width} height={height} fill={UI_COLORS.background} rx={8} />
      <path d={visAreaPath} fill={`${color}1a`} />
      <path d={visLinePath} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      {interactive && hoverIdx !== null ? (
        <g>
          <circle cx={positions[hoverIdx].x} cy={positions[hoverIdx].y} r={4} fill={color} />
        </g>
      ) : null}
    </svg>
  );
};

function buildSparkline(alert: AlertEvent): SparklineData | null {
  const valuesRaw = (alert.metadata?.sparkValues ?? []) as number[];
  const timestampsRaw = (alert.metadata?.sparkTimestamps ?? []) as number[];
  if (!Array.isArray(valuesRaw) || valuesRaw.length === 0) return null;
  const points = valuesRaw.map((value, idx) => ({
    value: Number(value),
    timestamp: Number(timestampsRaw[idx] ?? Date.now()),
  }));
  return generateSparklineData(points, { buckets: Math.min(24, points.length) });
}

function renderMetadata(alert: AlertEvent): Array<{ label: string; value: string }> {
  const meta = alert.metadata ?? {};
  const entries: Array<{ label: string; value: string }> = [];
  const keys: Array<[string, string]> = [
    ['score', 'Composite score'],
    ['impact', 'Impact weighting'],
    ['recency', 'Recency'],
    ['tier', 'Detector tier'],
    ['baselineMedian', 'Baseline median'],
    ['upperLimit', 'Upper limit'],
    ['lowerLimit', 'Lower limit'],
  ];
  keys.forEach(([key, label]) => {
    const value = (meta as Record<string, unknown>)[key];
    if (typeof value === 'number') {
      entries.push({ label, value: formatSparklineValue(value, 'default') });
    }
  });
  return entries;
}

const AlertDetailsComponent = ({ alert, onCreateGoal, onAddInterventionTemplate, onScheduleCheckIn, onAddToReport, onNotifyTeam, onSubmitFeedback }: Props) => {
  const interventions = getInterventionsByAlertKind(alert.kind);
  const color = severityColors[alert.severity] ?? UI_COLORS.textDark;
  const sparklineData = useMemo(() => {
    const stop = alertPerf.startTimer();
    try {
      return buildSparkline(alert);
    } finally {
      try { alertPerf.recordSparklineGeneration(stop()); } catch { /* noop */ }
    }
  }, [alert]);
  const sparklineConfig = useMemo(() => createSparklineConfig({ color, height: 128, areaOpacity: 0.15 }), [color]);
  const latestValue = useMemo(() => {
    if (!sparklineData || sparklineData.latest === undefined) return null; // keep zero readings visible
    const kind = deriveSparklineKindFromAlert(alert);
    return formatSparklineValue(sparklineData.latest, kind);
  }, [sparklineData, alert]);

  const metadataList = useMemo(() => renderMetadata(alert), [alert]);
  const sourceExplanation = useMemo(() => {
    const ranks = (alert.metadata?.sourceRanks as string[]) ?? [];
    if (!ranks.length) return 'Sources ranked by combined impact × confidence.';
    return `Sources ranked (${ranks.join(', ')}) by impact × confidence.`;
  }, [alert.metadata]);

  const tauResult = alert.metadata?.tauU as TauUResult | undefined;
  const thresholdTrace = alert.metadata?.thresholdTrace as Record<string, ThresholdAdjustmentTrace> | undefined;
  const experimentKey = typeof alert.metadata?.experimentKey === 'string' ? alert.metadata?.experimentKey : undefined;
  const experimentVariant = typeof alert.metadata?.experimentVariant === 'string' ? alert.metadata?.experimentVariant : undefined;

  const [feedbackHelpful, setFeedbackHelpful] = useState<boolean | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    setFeedbackHelpful(null);
    setFeedbackRating(null);
    setFeedbackComment('');
    setFeedbackSubmitted(false);
  }, [alert.id]);

  const handleFeedbackSubmit = () => {
    onSubmitFeedback?.(alert.id, {
      relevant: feedbackHelpful === null ? undefined : feedbackHelpful,
      rating: feedbackRating ?? undefined,
      comment: feedbackComment.trim() || undefined,
    });
    setFeedbackSubmitted(true);
  };

  return (
    <div className="space-y-4" role="region" aria-label="Alert details">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="inline-flex h-2 w-2 rounded-full" aria-hidden style={{ backgroundColor: color }} />
            {(alert.metadata as any)?.summary ?? alert.kind}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
            <span className="font-semibold">Confidence {Math.round((alert.confidence ?? 0) * 100)}%</span>
            <span aria-hidden>·</span>
            <time dateTime={alert.createdAt}>{new Date(alert.createdAt).toLocaleString()}</time>
            {latestValue ? (
              <span aria-label="Latest reading">Latest value {latestValue}</span>
            ) : null}
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700">Recent trend</p>
            <p className="text-xs text-slate-500">Mini-chart uses detector sparkline data down-sampled to highlight directional change.</p>
            <div className="mt-2">
              <WideSparkline data={sparklineData} color={sparklineConfig.color} label={`Trend for ${alert.kind}`} interactive />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Source attribution</p>
              <span className="text-xs text-slate-500">{sourceExplanation}</span>
            </div>
            {alert.sources?.length ? (
              <div className="space-y-2">
                {alert.sources.map((source, idx) => {
                  const rank = (source.details as Record<string, unknown>)?.rank ?? `S${idx + 1}`;
                  return (
                    <details key={source.id ?? `${source.type}-${idx}`} className="rounded border border-slate-200 bg-white p-3 text-sm text-slate-700">
                      <summary className="flex cursor-pointer items-center justify-between font-medium text-slate-800">
                        <span className="flex items-center gap-2">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">{rank}</span>
                          {source.label ?? source.type}
                        </span>
                        <span className="text-xs text-slate-500">Expand</span>
                      </summary>
                      <div className="pt-2 text-xs text-slate-600">
                        <p className="font-semibold text-slate-700">Detector details</p>
                        <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-[11px]">
                          {JSON.stringify(source.details ?? {}, null, 2)}
                        </pre>
                      </div>
                    </details>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No source data supplied.</p>
            )}
          </div>

          {metadataList.length ? (
            <div>
              <p className="text-sm font-semibold text-slate-700">Statistical highlights</p>
              <dl className="mt-2 grid grid-cols-2 gap-3 text-xs text-slate-600 md:grid-cols-3">
                {metadataList.map((item) => (
                  <div key={item.label} className="rounded border border-slate-100 bg-slate-50 p-2">
                    <dt className="font-medium text-slate-700">{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Teacher feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Was this alert helpful?</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={feedbackHelpful === true ? 'default' : 'outline'}
                onClick={() => setFeedbackHelpful(true)}
              >
                Helpful
              </Button>
              <Button
                size="sm"
                variant={feedbackHelpful === false ? 'default' : 'outline'}
                onClick={() => setFeedbackHelpful(false)}
              >
                Not helpful
              </Button>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700">Rating</p>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  size="icon"
                  variant={feedbackRating === value ? 'default' : 'outline'}
                  onClick={() => setFeedbackRating(value)}
                  aria-label={`Rate ${value}`}
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700">Comments</p>
            <Textarea
              value={feedbackComment}
              onChange={(event) => setFeedbackComment(event.target.value)}
              placeholder="Share context or suggested improvements"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <div>
              {experimentVariant ? (
                <p className="text-xs">This alert uses experimental thresholds ({experimentVariant}{experimentKey ? ` · ${experimentKey}` : ''}).</p>
              ) : null}
              {thresholdTrace && Object.keys(thresholdTrace).length ? (
                <p className="text-xs">Threshold adjustments applied: {Object.entries(thresholdTrace).map(([detectorType, trace]) => `${detectorType} ${(trace.adjustment * 100).toFixed(1)}%`).join(', ')}.</p>
              ) : null}
            </div>
            <Button size="sm" onClick={handleFeedbackSubmit} disabled={!onSubmitFeedback || feedbackSubmitted}>
              {feedbackSubmitted ? 'Feedback saved' : 'Submit feedback'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {tauResult ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Intervention evaluation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="grid gap-2 md:grid-cols-3">
              <div className="rounded border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold text-slate-500">Outcome</p>
                <p className="text-base font-semibold capitalize">{tauResult.outcome.replace('_', ' ')}</p>
              </div>
              <div className="rounded border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold text-slate-500">Tau-U effect size</p>
                <p className="text-base font-semibold">{tauResult.effectSize.toFixed(2)}</p>
              </div>
              <div className="rounded border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold text-slate-500">p-value (approx)</p>
                <p className="text-base font-semibold">{tauResult.pValue.toFixed(3)}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">Improvement probability {(tauResult.improvementProbability * 100).toFixed(1)}% across {tauResult.comparisons} comparisons.</p>
            <div>
              <p className="text-sm font-semibold text-slate-700">Recommendations</p>
              <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">
                {tauResult.interpretation.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Intervention suggestions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {interventions.map((iv) => (
            <div key={iv.id} className="rounded-md border p-3">
              <p className="text-sm font-semibold">{iv.hypothesis}</p>
              <p className="mt-1 text-xs text-slate-700">{iv.rationale}</p>
              <ul className="mt-2 list-disc pl-5 text-xs text-slate-800">
                {iv.strategies.map((st) => (
                  <li key={st.id}>
                    <span className="font-medium">{st.title}:</span> {st.description}
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => onAddInterventionTemplate?.(alert, iv.id)}>Add Template</Button>
                <Button variant="outline" size="sm" onClick={() => onCreateGoal?.(alert)}>Create Goal</Button>
                {typeof iv.reviewScheduleDays === 'number' ? (
                  <Button variant="ghost" size="sm" onClick={() => onScheduleCheckIn?.(alert, new Date(Date.now() + (iv.reviewScheduleDays as number) * 24 * 3600_000).toISOString())}>Schedule Review</Button>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => onScheduleCheckIn?.(alert, new Date(Date.now() + 7 * 24 * 3600_000).toISOString())}>Schedule T+7 Review</Button>
        <Button variant="outline" size="sm" onClick={() => onAddToReport?.(alert)}>Add to Report</Button>
        <Button variant="ghost" size="sm" onClick={() => onNotifyTeam?.(alert)}>Notify Team</Button>
      </div>
    </div>
  );
};

export const AlertDetails = memo(AlertDetailsComponent);
export default AlertDetails;
