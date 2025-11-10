import React from 'react';
import { loadStudentProgress } from '@/lib/progress/progress-store';
import { useTranslation } from '@/hooks/useTranslation';
import PinGate from '@/components/auth/PinGate';
import { computeEmotionTrends } from '@/lib/game/telemetry';
import SparkMini from '@/components/mini/SparkMini';
import { useStorageState } from '@/lib/storage/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage/keys';

export default function AdultOverview() {
  const { tCommon } = useTranslation();
  const [sid] = useStorageState(STORAGE_KEYS.CURRENT_STUDENT_ID, 'anonymous');
  const progress = loadStudentProgress(sid);
  const days = Object.values(progress).sort((a, b) => b.date.localeCompare(a.date));

  const trends = computeEmotionTrends();

  return (
    <PinGate>
      <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-2xl font-semibold">
            {String(tCommon('adult.overview', { defaultValue: 'Voksensone – oversikt' }))}
          </h1>

          {/* Reaction time / stability trends per emotion */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.keys(trends).length === 0 && (
              <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
                Ingen trender ennå – spill et par runder først.
              </div>
            )}
            {Object.entries(trends).map(([emotion, series]) => (
              <div key={emotion} className="rounded-xl border bg-card p-4">
                <div className="text-sm font-medium mb-2">{emotion}</div>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Reaksjonstid</div>
                    <SparkMini
                      values={series.reactionTimes.slice(-20)}
                      color="#0ea5e9"
                      ariaLabel={`RT ${emotion}`}
                    />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Stabilitet</div>
                    <SparkMini
                      values={series.stabilityMs.slice(-20)}
                      color="#10b981"
                      ariaLabel={`Stability ${emotion}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border bg-card p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-2">Dato</th>
                  <th className="py-2">Nøytral</th>
                  <th className="py-2">Velg riktig</th>
                  <th className="py-2">Navngi</th>
                  <th className="py-2">Streak</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.date} className="border-t">
                    <td className="py-2">{d.date}</td>
                    <td className="py-2">{d.neutralHolds}</td>
                    <td className="py-2">{d.correctChoices}</td>
                    <td className="py-2">{d.nameItCorrect}</td>
                    <td className="py-2">{d.streak}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PinGate>
  );
}
