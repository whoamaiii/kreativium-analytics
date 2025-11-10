import React from 'react';
import { loadProgress } from '@/lib/progress/progress-store';
import { useTranslation } from '@/hooks/useTranslation';

export default function DailyMissions() {
  const { tCommon } = useTranslation();
  const progress = loadProgress();
  const today = Object.values(progress).sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">
          {String(tCommon('missions.title', { defaultValue: 'Daglige oppdrag' }))}
        </h1>

        <div className="grid gap-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="font-medium">
              {String(
                tCommon('missions.holdNeutral', { defaultValue: 'Hold 3 rolige nøytral i dag' }),
              )}
            </div>
            <div className="text-sm text-muted-foreground">{today?.neutralHolds ?? 0}/3</div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="font-medium">
              {String(tCommon('missions.chooseRight', { defaultValue: 'Velg riktig 5 ganger' }))}
            </div>
            <div className="text-sm text-muted-foreground">{today?.correctChoices ?? 0}/5</div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="font-medium">
              {String(tCommon('missions.nameIt', { defaultValue: 'Navngi 5 følelser' }))}
            </div>
            <div className="text-sm text-muted-foreground">{today?.nameItCorrect ?? 0}/5</div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="font-medium">
            {String(tCommon('missions.streak', { defaultValue: 'Streak' }))}
          </div>
          <div className="text-sm text-muted-foreground">{today?.streak ?? 0}</div>
        </div>
      </div>
    </div>
  );
}
