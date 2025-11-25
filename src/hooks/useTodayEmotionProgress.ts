import { useMemo } from 'react';
import { loadTodayProgress } from '@/lib/progress/progress-store';

export interface TodayEmotionProgress {
  neutralHolds: number;
  correctChoices: number;
  nameItCorrect: number;
  streak: number;
}

/**
 * Returns a lightweight summary of the current student's emotion-related
 * progress for "today" (local browser date).
 *
 * NOTE: This hook reads from the same local storage backing as Achievements
 * and other progress views. It is intentionally read-only and inexpensive.
 */
export function useTodayEmotionProgress(studentId?: string): TodayEmotionProgress {
  const summary = useMemo(() => loadTodayProgress(studentId), [studentId]);

  if (!summary) {
    return { neutralHolds: 0, correctChoices: 0, nameItCorrect: 0, streak: 0 };
  }

  return {
    neutralHolds: summary.neutralHolds ?? 0,
    correctChoices: summary.correctChoices ?? 0,
    nameItCorrect: summary.nameItCorrect ?? 0,
    streak: summary.streak ?? 0,
  };
}




