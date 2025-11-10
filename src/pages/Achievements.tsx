import React, { useMemo } from 'react';
import { loadStudentProgress, type StickerId } from '@/lib/progress/progress-store';
import { useTranslation } from '@/hooks/useTranslation';
import { Card } from '@/components/ui/card';
import { useStorageState } from '@/lib/storage/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage/keys';

export default function Achievements() {
  const { tCommon } = useTranslation();
  const [sid] = useStorageState(STORAGE_KEYS.CURRENT_STUDENT_ID, 'anonymous');
  const progress = loadStudentProgress(sid);
  const today = Object.values(progress).sort((a, b) => b.date.localeCompare(a.date))[0];
  const stickers = today?.stickers ?? [];

  const catalog: Record<StickerId, { label: string; icon: string; goal: number; current: number }> =
    useMemo(
      () => ({
        'hold-master': {
          label: String(tCommon('stickers.holdMaster', { defaultValue: 'Hold‑mester' })),
          icon: '/placeholder.svg',
          goal: 3,
          current: today?.neutralHolds ?? 0,
        },
        'name-hero': {
          label: String(tCommon('stickers.nameHero', { defaultValue: 'Navne‑helt' })),
          icon: '/placeholder.svg',
          goal: 5,
          current: today?.nameItCorrect ?? 0,
        },
        'streak-star': {
          label: String(tCommon('stickers.streakStar', { defaultValue: 'Streak‑stjerne' })),
          icon: '/placeholder.svg',
          goal: 10,
          current: today?.streak ?? 0,
        },
      }),
      [tCommon, today?.neutralHolds, today?.nameItCorrect, today?.streak],
    );

  const allIds: StickerId[] = ['hold-master', 'name-hero', 'streak-star'];

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">
          {String(tCommon('achievements.title', { defaultValue: 'Klistremerker' }))}
        </h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {allIds.map((id) => {
            const meta = catalog[id];
            const owned = stickers.includes(id);
            const pct = Math.max(0, Math.min(1, meta.current / meta.goal));
            return (
              <Card key={id} className="p-4 text-center">
                <div className="grid place-items-center gap-2">
                  <img src={meta.icon} alt="" className="h-10 w-10" />
                  <div className="text-sm font-medium">{meta.label}</div>
                  <div
                    className="w-full h-2 rounded bg-muted overflow-hidden"
                    aria-label={`progress ${meta.label}`}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={meta.goal}
                    aria-valuenow={meta.current}
                  >
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.round(pct * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {owned
                      ? String(tCommon('achievements.unlocked', { defaultValue: 'Låst opp!' }))
                      : `${meta.current}/${meta.goal}`}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
