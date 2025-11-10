import React, { memo, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { AlertEvent, AlertSeverity, AlertStatus, GovernanceStatus } from '@/lib/alerts/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  createSparklineConfig,
  deriveSparklineKindFromAlert,
  formatSparklineValue,
  generateSparklineData,
  SparklineData,
} from '@/lib/chartUtils';
import { alertPerf } from '@/lib/alerts/performance';

const severityThemes: Record<AlertSeverity, { border: string; background: string; text: string; accent: string }> = {
  [AlertSeverity.Critical]: {
    border: 'border-red-600',
    background: 'bg-red-50',
    text: 'text-red-900',
    accent: '#b91c1c',
  },
  [AlertSeverity.Important]: {
    border: 'border-amber-500',
    background: 'bg-amber-50',
    text: 'text-amber-900',
    accent: '#b45309',
  },
  [AlertSeverity.Moderate]: {
    border: 'border-blue-500',
    background: 'bg-blue-50',
    text: 'text-blue-900',
    accent: '#1d4ed8',
  },
  [AlertSeverity.Low]: {
    border: 'border-slate-300',
    background: 'bg-slate-50',
    text: 'text-slate-900',
    accent: '#334155',
  },
};

type Props = {
  alert: AlertEvent & { governance?: GovernanceStatus };
  onAcknowledge?: (id: string) => void;
  onSnooze?: (id: string) => void;
  onResolve?: (id: string) => void;
  onOpenDetails?: (id: string) => void;
  // Optional sparkline theming/config overrides for customization
  sparklineOptions?: Partial<Pick<ReturnType<typeof createSparklineConfig>, 'color' | 'height' | 'curve' | 'areaOpacity'>>;
};

type SparklineProps = {
  data: SparklineData | null;
  color: string;
  label: string;
  height?: number;
  areaOpacity?: number;
};

class SparklineBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }
  componentDidCatch() {}
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-14 w-full items-center justify-center rounded bg-slate-100 text-xs text-slate-500" role="status" aria-live="polite">
          Trend unavailable
        </div>
      );
    }
    return this.props.children as any;
  }
}

function hexToRgba(hex: string, opacity: number): string {
  const h = hex.replace('#', '');
  const hasAlpha = h.length === 8;
  const full = h.length === 3 || h.length === 4
    ? h.split('').map((c) => c + c).join('')
    : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const a = hasAlpha ? parseInt(full.slice(6, 8), 16) / 255 : opacity;
  const clamped = Math.max(0, Math.min(1, isNaN(a) ? opacity : a));
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}

const Sparkline = ({ data, color, label, height: heightProp, areaOpacity }: SparklineProps) => {
  if (!data || data.values.length < 2) {
    return (
      <div className="flex h-14 w-full items-center justify-center rounded bg-slate-100 text-xs text-slate-500" role="status" aria-live="polite">
        No trend data
      </div>
    );
  }

  const width = 140;
  const height = typeof heightProp === 'number' ? heightProp : 56;
  const min = data.min === data.max ? data.min - 1 : data.min;
  const max = data.min === data.max ? data.max + 1 : data.max;
  const range = max - min || 1;
  const path = data.values
    .map((value, idx) => {
      const x = (idx / (data.values.length - 1)) * (width - 4) + 2;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${idx === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  const areaPath = `${path} L${width - 2},${height - 2} L2,${height - 2} Z`;

  return (
    <svg aria-hidden width={width} height={height} role="img" focusable="false" className="overflow-visible">
      <title>{label}</title>
      <path d={areaPath} fill={hexToRgba(color, typeof areaOpacity === 'number' ? areaOpacity : 0.2)} />
      <path d={path} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
    </svg>
  );
};

function severityIcon(severity: AlertSeverity) {
  if (severity === AlertSeverity.Critical || severity === AlertSeverity.Important) {
    return <AlertTriangle aria-hidden className="h-4 w-4" />;
  }
  return <Info aria-hidden className="h-4 w-4" />;
}

function buildGovernanceBadges(governance?: GovernanceStatus): string[] {
  if (!governance) return [];
  const badges: string[] = [];
  if (governance.throttled) badges.push('Throttled');
  if (governance.snoozed) badges.push('Snoozed');
  if (governance.quietHours) badges.push('Quiet hours');
  if (governance.capExceeded) badges.push('Cap reached');
  return badges;
}

function toSparklinePoints(alert: AlertEvent): SparklineData | null {
  const valuesRaw = (alert.metadata?.sparkValues ?? []) as number[];
  const timestampsRaw = (alert.metadata?.sparkTimestamps ?? []) as number[];
  if (!Array.isArray(valuesRaw) || !Array.isArray(timestampsRaw) || valuesRaw.length === 0) {
    return null;
  }
  const points = valuesRaw.map((value, idx) => ({
    value: Number(value),
    timestamp: Number(timestampsRaw[idx] ?? Date.now()),
  }));
  return generateSparklineData(points);
}

const BaseAlertCard = ({ alert, onAcknowledge, onSnooze, onResolve, onOpenDetails, sparklineOptions }: Props) => {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const listToggleRef = useRef<HTMLButtonElement | null>(null);
  const theme = severityThemes[alert.severity];
  const badge = useMemo(() => (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        theme.border,
        theme.background,
        theme.text,
      )}
      aria-label={`Severity ${alert.severity}`}
    >
      {severityIcon(alert.severity)}
      <span className="sr-only">Severity:</span>
      <span aria-hidden>{alert.severity}</span>
    </span>
  ), [alert.severity, theme]);

  const confidence = Math.round((alert.confidence ?? 0) * 100);
  const sparklineData = useMemo(() => {
    const stop = alertPerf.startTimer();
    try {
      return toSparklinePoints(alert);
    } finally {
      try { alertPerf.recordSparklineGeneration(stop()); } catch { /* noop */ }
    }
  }, [alert]);
  const sparklineConfig = useMemo(() => createSparklineConfig({
    color: sparklineOptions?.color ?? theme.accent,
    height: sparklineOptions?.height ?? 56,
    curve: sparklineOptions?.curve ?? 'smooth',
    areaOpacity: sparklineOptions?.areaOpacity ?? 0.2,
  }), [theme.accent, sparklineOptions?.color, sparklineOptions?.height, sparklineOptions?.curve, sparklineOptions?.areaOpacity]);

  const latestValue = useMemo(() => {
    if (!sparklineData || sparklineData.latest === undefined) return null; // allow zero value displays
    const kind = deriveSparklineKindFromAlert(alert);
    return formatSparklineValue(sparklineData.latest, kind);
  }, [sparklineData, alert]);

  const governanceBadges = useMemo(() => buildGovernanceBadges(alert.governance), [alert.governance]);
  const summary = (alert.metadata as any)?.summary ?? alert.kind;
  const createdAtLabel = useMemo(() => new Date(alert.createdAt).toLocaleString(), [alert.createdAt]);
  const topSources = useMemo(() => (alert.sources ?? []).slice(0, 3), [alert.sources]);
  const sourceSummary = useMemo(() => {
    if (!topSources.length) return 'No sources';
    const [first, ...rest] = topSources;
    const label = first.label ?? first.type;
    return rest.length ? `${label} + ${rest.length} more` : label;
  }, [topSources]);

  return (
    <Card role="article" aria-roledescription="alert card" className="mb-2 focus-within:ring-2 focus-within:ring-offset-2">
      <CardContent className="flex flex-col gap-3 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {badge}
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-semibold">{summary}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-medium text-slate-700" aria-label={`Confidence ${confidence}%`}>
                  Confidence {confidence}%
                </span>
                <span aria-hidden>·</span>
                <time dateTime={alert.createdAt}>{createdAtLabel}</time>
                {latestValue ? (
                  <span aria-label="Latest value" className="text-slate-500">
                    Last {latestValue}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500" aria-label="Source summary">Sources: {sourceSummary}</p>
              {governanceBadges.length > 0 ? (
                <div className="flex flex-wrap gap-1 text-[11px] text-slate-500" aria-label="Governance status">
                  {governanceBadges.map((badgeLabel) => (
                    <span key={badgeLabel} className="rounded bg-slate-200 px-1.5 py-0.5">{badgeLabel}</span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Open details"
              onClick={() => onOpenDetails?.(alert.id)}
            >
              Details
            </Button>
            <Button
              variant="secondary"
              size="sm"
              aria-label="Acknowledge alert"
              onClick={() => onAcknowledge?.(alert.id)}
              disabled={alert.status !== AlertStatus.New}
            >
              Ack
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label="Snooze alert"
              onClick={() => onSnooze?.(alert.id)}
            >
              Snooze
            </Button>
            <Button
              variant="default"
              size="sm"
              aria-label="Resolve alert"
              onClick={() => onResolve?.(alert.id)}
            >
              Resolve
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded border border-slate-200 bg-white/80 p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Mini trend</span>
            <span className="text-xs text-slate-500">{sparklineData?.timestamps?.length ?? 0} pts</span>
          </div>
          <Sparkline
            data={sparklineData}
            color={sparklineConfig.color}
            label={`${summary} sparkline`}
            height={sparklineConfig.height}
            areaOpacity={sparklineConfig.areaOpacity}
          />
        </div>

        <div>
          <button
            type="button"
            onClick={() => setSourcesOpen((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSourcesOpen((prev) => !prev);
              }
            }}
            className="flex w-full items-center justify-between rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring"
            aria-expanded={sourcesOpen}
            aria-controls={`alert-sources-${alert.id}`}
            ref={listToggleRef}
          >
            <span>Sources {topSources.length ? `(S1${topSources.length > 1 ? `, S2${topSources.length > 2 ? ', S3' : ''}` : ''})` : '(none)'}</span>
            {sourcesOpen ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
          </button>
          {sourcesOpen && topSources.length ? (
            <ul id={`alert-sources-${alert.id}`} className="mt-2 space-y-1 text-xs text-slate-700" aria-label="Alert sources">
              {topSources.map((source, idx) => {
                const rank = (source.details as Record<string, unknown>)?.rank ?? `S${idx + 1}`;
                return (
                  <li key={source.id ?? `${source.type}-${idx}`} className="rounded border border-slate-200 bg-white px-2 py-1">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white" aria-label={`Rank ${rank}`}>{rank}</span>
                        <span className="font-semibold text-slate-800">{source.label ?? source.type}</span>
                      </span>
                      <span className="text-slate-500">{source.type}</span>
                    </div>
                    {source.label ? <p className="text-slate-600">{source.label}</p> : null}
                    {source.details ? (
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[10px] text-slate-500">
                        {JSON.stringify(source.details, null, 2)}
                      </pre>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

export const AlertCard = memo(BaseAlertCard, (prev, next) => {
  // Avoid re-renders when immutable alert identity and minimal surface props unchanged
  if (prev.alert.id !== next.alert.id) return false;
  if (prev.alert.status !== next.alert.status) return false;
  if (prev.alert.severity !== next.alert.severity) return false;
  if (prev.alert.confidence !== next.alert.confidence) return false;
  // Shallow compare governance flags used for badges
  const pg = prev.alert.governance || {} as any;
  const ng = next.alert.governance || {} as any;
  const govKeys = ['deduplicated', 'throttled', 'quietHours', 'snoozed', 'capExceeded'];
  for (const k of govKeys) {
    if ((pg as any)[k] !== (ng as any)[k]) return false;
  }
  return true;
});

export default AlertCard;
