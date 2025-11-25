import { useCallback, useMemo } from 'react';
import { Student, TrackingEntry, EmotionEntry, SensoryEntry, Goal } from '@/types/student';
import { logger } from '@/lib/logger';
import { useGoalsByStudent, useStudent as useLocalStudent } from '@/hooks/useStorageData';
import { convertLocalGoalToLegacy, convertLocalStudentToLegacy } from '@/lib/adapters/legacyConverters';
import { useLegacyTrackingEntries } from '@/hooks/useLegacyTrackingEntries';

/**
 * @hook useStudentData
 *
 * A custom hook to fetch and manage all data related to a specific student.
 * This hook centralizes the logic for retrieving a student's profile, tracking entries,
 * emotions, sensory inputs, and goals from data storage.
 *
 * @param {string | undefined} studentId - The ID of the student to fetch data for.
 *
 * @returns {object} An object containing:
 *  - `student`: The student's profile data.
 *  - `trackingEntries`: All tracking entries for the student.
 *  - `allEmotions`: A flattened array of all emotion entries.
 *  - `allSensoryInputs`: A flattened array of all sensory input entries.
 *  - `goals`: The student's goals.
 *  - `isLoading`: A boolean indicating if the initial data load is in progress.
 *  - `error`: Any error message that occurred during data fetching.
 *  - `reloadGoals`: A function to specifically refetch the student's goals.
 *  - `reloadData`: A function to refetch all of the student's data from storage.
 */
export const useStudentData = (studentId: string | undefined) => {
  const localStudent = useLocalStudent(studentId);
  const student = useMemo<Student | null>(
    () => (localStudent ? (convertLocalStudentToLegacy(localStudent) as Student) : null),
    [localStudent],
  );
  const error = useMemo(() => {
    if (!studentId) {
      return 'No student ID provided.';
    }
    if (!student) {
      return 'Student not found.';
    }
    return null;
  }, [studentId, student]);
  const localGoals = useGoalsByStudent(studentId);
  const goals = useMemo<Goal[]>(
    () =>
      (localGoals ?? []).map((goal) => convertLocalGoalToLegacy(goal) as Goal),
    [localGoals],
  );
  const isLoading = Boolean(studentId) && !student;
  const reloadGoals = useCallback(() => {}, []);

  const legacyEntries = useLegacyTrackingEntries(studentId ? { studentId } : undefined);

  const trackingEntries = useMemo<TrackingEntry[]>(() => {
    if (!legacyEntries.length) {
      return [];
    }
    return [...legacyEntries].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [legacyEntries]);

  const allEmotions = useMemo<EmotionEntry[]>(
    () => trackingEntries.flatMap((entry) => entry.emotions),
    [trackingEntries],
  );

  const allSensoryInputs = useMemo<SensoryEntry[]>(
    () => trackingEntries.flatMap((entry) => entry.sensoryInputs),
    [trackingEntries],
  );

  return {
    student,
    trackingEntries,
    allEmotions,
    allSensoryInputs,
    goals,
    isLoading,
    error,
    reloadGoals,
    reloadData: useCallback(() => {
      if (!studentId) return;
      logger.debug('[useStudentData] reloadData invoked', { studentId });
    }, [studentId]),
  };
};
