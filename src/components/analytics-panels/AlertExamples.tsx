import React, { useMemo } from 'react';
import { AlertCard } from '@/components/alerts/AlertCard';
import type { AlertEvent } from '@/lib/alerts/types';

const exampleAlerts: AlertEvent[] = [
  {
    id: 'ex-1',
    studentId: 's1',
    kind: 'behavior_change' as any,
    severity: 'Important' as any,
    status: 'new' as any,
    confidence: 0.86,
    createdAt: new Date().toISOString(),
    sources: [
      { type: 'detectorA', label: 'Outlier', details: { rank: 'S1', score: 0.92 } } as any,
      { type: 'detectorB', label: 'Spike', details: { rank: 'S2', score: 0.71 } } as any,
      { type: 'detectorC', label: 'Trend', details: { rank: 'S3', score: 0.66 } } as any,
    ],
    metadata: {
      summary: 'Afternoon agitation rising faster than baseline',
      sparkValues: [1, 2, 3, 3, 4, 5, 6, 5],
      sparkTimestamps: [1, 2, 3, 4, 5, 6, 7, 8],
    },
  },
];

export const AlertExamples: React.FC = () => {
  const cards = useMemo(() => exampleAlerts, []);
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Examples: real-time monitoring, S1–S3 customization, sparkline theming.</p>
      {cards.map((a) => (
        <AlertCard key={a.id} alert={a as any} sparklineOptions={{ areaOpacity: 0.15 }} />
      ))}
    </div>
  );
};

export default AlertExamples;






