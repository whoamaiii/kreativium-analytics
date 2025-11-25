import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Card } from '@/components/ui/card';
import type { TodayEmotionProgress } from '@/hooks/useTodayEmotionProgress';
import { Smile, Target, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TodayProgressStripProps extends TodayEmotionProgress {
  className?: string;
}

/**
 * Compact, inline summary of today's emotion-related progress for the current student.
 *
 * Designed to sit near the game HUD so players (and adults) can quickly see
 * how the current session contributes to daily goals.
 */
export function TodayProgressStrip({
  neutralHolds,
  correctChoices,
  nameItCorrect,
  streak,
  className,
}: TodayProgressStripProps) {
  const { tCommon } = useTranslation();

  const hasAnyProgress = neutralHolds + correctChoices + nameItCorrect + streak > 0;

  return (
    <Card className={cn('p-3 sm:p-4 flex flex-col gap-2 text-xs sm:text-sm', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium">
          {String(tCommon('sessionSummary.todayHeading', { defaultValue: 'I dag' }))}
        </div>
        {hasAnyProgress && (
          <div className="text-muted-foreground">
            {String(tCommon('sessionSummary.todayHint', { defaultValue: 'Fra alle moduler' }))}
          </div>
        )}
      </div>
      {!hasAnyProgress ? (
        <div className="text-muted-foreground">
          {String(
            tCommon('sessionSummary.todayEmpty', {
              defaultValue: 'Ingen registrert fremgang ennå.',
            }),
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="flex items-center gap-2 rounded border px-2 py-1.5">
            <Smile className="h-4 w-4 text-emerald-500" />
            <div>
              <div className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                {String(
                  tCommon('sessionSummary.neutralHoldsLabel', {
                    defaultValue: 'Nøytrale hold',
                  }),
                )}
              </div>
              <div className="font-semibold text-xs sm:text-sm">{neutralHolds}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded border px-2 py-1.5">
            <Target className="h-4 w-4 text-sky-500" />
            <div>
              <div className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                {String(
                  tCommon('sessionSummary.correctChoicesLabel', {
                    defaultValue: 'Riktige valg',
                  }),
                )}
              </div>
              <div className="font-semibold text-xs sm:text-sm">{correctChoices}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded border px-2 py-1.5">
            <Target className="h-4 w-4 text-violet-500" />
            <div>
              <div className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                {String(
                  tCommon('sessionSummary.nameItLabel', {
                    defaultValue: 'Navngi følelser',
                  }),
                )}
              </div>
              <div className="font-semibold text-xs sm:text-sm">{nameItCorrect}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded border px-2 py-1.5">
            <Flame className="h-4 w-4 text-amber-500" />
            <div>
              <div className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                {String(
                  tCommon('sessionSummary.streakLabel', {
                    defaultValue: 'Streak',
                  }),
                )}
              </div>
              <div className="font-semibold text-xs sm:text-sm">{streak}</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default TodayProgressStrip;




