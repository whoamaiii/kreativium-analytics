import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { computeSessionSummary } from '@/lib/game/telemetry';

interface SessionSummaryProps {
  startTs?: number | null;
  className?: string;
}

export function SessionSummary({ startTs = null, className }: SessionSummaryProps) {
  const { tCommon, formatNumber } = useTranslation();

  const summary = useMemo(() => computeSessionSummary(startTs ?? undefined), [startTs]);
  const hasData = Object.keys(summary.perEmotion).length > 0;

  return (
    <Card className={className ? className : ''}>
      <div className="p-4 space-y-3">
        <div className="text-base font-semibold">{String(tCommon('sessionSummary.title'))}</div>
        {!hasData ? (
          <div className="text-sm text-muted-foreground">
            {String(tCommon('sessionSummary.noData'))}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-sm text-foreground/80">
                {String(tCommon('sessionSummary.accuracyPerEmotion'))}
              </div>
              <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                {Object.entries(summary.perEmotion).map(([emotion, stats]) => (
                  <div
                    key={emotion}
                    className="flex items-center justify-between rounded border px-2 py-1"
                  >
                    <span className="capitalize">{emotion}</span>
                    <span className="font-medium">
                      {stats.accuracy != null ? `${Math.round((stats.accuracy || 0) * 100)}%` : '–'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div className="rounded border px-2 py-2">
                <div className="text-muted-foreground">
                  {String(tCommon('sessionSummary.timeToSuccess'))}
                </div>
                <div className="font-medium">
                  {summary.timeToSuccessAvgMs != null
                    ? `${formatNumber(summary.timeToSuccessAvgMs)} ms`
                    : '–'}
                </div>
              </div>
              <div className="rounded border px-2 py-2">
                <div className="text-muted-foreground">
                  {String(tCommon('sessionSummary.hintRate'))}
                </div>
                <div className="font-medium">
                  {summary.hintRate != null ? `${Math.round((summary.hintRate || 0) * 100)}%` : '–'}
                </div>
              </div>
              <div className="rounded border px-2 py-2">
                <div className="text-muted-foreground">
                  {String(tCommon('sessionSummary.calibrationError'))}
                </div>
                <div className="font-medium">
                  {summary.calibrationErrorAvg != null
                    ? `${Math.round((summary.calibrationErrorAvg || 0) * 100)}%`
                    : '–'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default SessionSummary;
