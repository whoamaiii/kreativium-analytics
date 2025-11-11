import React from 'react';
import { loadStudentProgress } from '@/lib/progress/progress-store';
import { useTranslation } from '@/hooks/useTranslation';
import PinGate from '@/components/auth/PinGate';
import { useStorageState } from '@/lib/storage/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage/keys';

export default function AdultReports() {
  const { tCommon } = useTranslation();
  const [sid] = useStorageState(STORAGE_KEYS.CURRENT_STUDENT_ID, 'anonymous');
  const progress = loadStudentProgress(sid);
  const rows = Object.values(progress);

  function exportCsv() {
    const header = ['date', 'neutralHolds', 'correctChoices', 'nameItCorrect', 'streak'];
    const lines = [header.join(',')].concat(
      rows.map((r) =>
        [r.date, r.neutralHolds, r.correctChoices, r.nameItCorrect, r.streak].join(','),
      ),
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'daily-progress.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PinGate>
      <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-2xl font-semibold">
            {String(tCommon('adult.reports', { defaultValue: 'Voksensone – rapporter' }))}
          </h1>
          <button className="px-3 py-2 rounded-lg border" onClick={exportCsv}>
            {String(tCommon('exportAsCsv', { defaultValue: 'Eksporter som CSV' }))}
          </button>
        </div>
      </div>
    </PinGate>
  );
}
