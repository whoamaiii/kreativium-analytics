/**
 * Report Content Builder
 *
 * Builds structured report content from student data with analysis summaries.
 * Pure functions with dependency injection for easy testing.
 */

import { format } from 'date-fns';
import type { Student, EmotionEntry, SensoryEntry, Goal } from '@/types/student';
import type { ReportContent, ReportDataCollection, PDFReportOptions } from './types';

/**
 * Builds structured report content from student data
 *
 * @param student - Student information
 * @param data - Collection of tracking data
 * @param options - Report generation options
 * @returns Structured report content ready for formatting
 */
export function buildReportContent(
  student: Student,
  data: ReportDataCollection,
  options: PDFReportOptions,
): ReportContent {
  return {
    header: {
      title: `Progress Report - ${student.name}`,
      dateRange: options.dateRange
        ? `${format(options.dateRange.start, 'MMM dd, yyyy')} - ${format(options.dateRange.end, 'MMM dd, yyyy')}`
        : 'All time',
      generatedDate: format(new Date(), 'MMM dd, yyyy'),
      studentInfo: {
        name: student.name,
        grade: student.grade,
        id: student.id,
      },
    },
    summary: {
      totalSessions: data.trackingEntries.length,
      totalEmotions: data.emotions.length,
      totalSensoryInputs: data.sensoryInputs.length,
      activeGoals: data.goals.filter((g) => g.status === 'active').length,
      completedGoals: data.goals.filter((g) => g.status === 'achieved').length,
    },
    emotionAnalysis: analyzeEmotionsForReport(data.emotions),
    sensoryAnalysis: analyzeSensoryForReport(data.sensoryInputs),
    goalProgress: analyzeGoalsForReport(data.goals),
    recommendations: generateRecommendations(data),
  };
}

/**
 * Analyzes emotion data for report summary
 *
 * @param emotions - Array of emotion entries
 * @returns Summary statistics for emotions
 */
export function analyzeEmotionsForReport(emotions: EmotionEntry[]): {
  mostCommon: string;
  avgIntensity: string;
  positiveRate: string;
} {
  if (emotions.length === 0) {
    return {
      mostCommon: 'No data',
      avgIntensity: '0.0',
      positiveRate: '0',
    };
  }

  const emotionCounts = emotions.reduce(
    (acc, e) => {
      acc[e.emotion] = (acc[e.emotion] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const mostCommon = Object.entries(emotionCounts).sort(([, a], [, b]) => b - a)[0][0];

  const avgIntensity = (
    emotions.reduce((sum, e) => sum + e.intensity, 0) / emotions.length
  ).toFixed(1);

  const positiveEmotions = emotions.filter((e) =>
    ['happy', 'calm', 'focused', 'excited', 'proud'].includes(e.emotion.toLowerCase()),
  ).length;
  const positiveRate = Math.round((positiveEmotions / emotions.length) * 100);

  return {
    mostCommon,
    avgIntensity,
    positiveRate: positiveRate.toString(),
  };
}

/**
 * Analyzes sensory data for report summary
 *
 * @param sensoryInputs - Array of sensory entries
 * @returns Summary statistics for sensory patterns
 */
export function analyzeSensoryForReport(sensoryInputs: SensoryEntry[]): {
  seekingRatio: string;
  mostCommonType: string;
} {
  if (sensoryInputs.length === 0) {
    return {
      seekingRatio: '0',
      mostCommonType: 'No data',
    };
  }

  const seekingCount = sensoryInputs.filter((s) =>
    s.response.toLowerCase().includes('seeking'),
  ).length;
  const seekingRatio = Math.round((seekingCount / sensoryInputs.length) * 100);

  const typeCounts = sensoryInputs.reduce(
    (acc, s) => {
      acc[s.sensoryType] = (acc[s.sensoryType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const mostCommonType = Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0][0];

  return {
    seekingRatio: seekingRatio.toString(),
    mostCommonType,
  };
}

/**
 * Analyzes goal progress for report
 *
 * @param goals - Array of goals
 * @returns Progress summary for each goal
 */
export function analyzeGoalsForReport(goals: Goal[]): Array<{
  title: string;
  progress: number;
  status: string;
}> {
  return goals.map((goal) => ({
    title: goal.title,
    progress: Math.round(
      ((goal.dataPoints?.length ? goal.dataPoints[goal.dataPoints.length - 1].value : 0) /
        goal.targetValue) *
        100,
    ),
    status: goal.status,
  }));
}

/**
 * Generates recommendations based on data patterns
 *
 * @param data - Collection of tracking data
 * @returns Array of recommendation strings
 */
export function generateRecommendations(data: ReportDataCollection): string[] {
  const recommendations: string[] = [];

  // Analyze emotion patterns
  if (data.emotions.length > 0) {
    const avgIntensity =
      data.emotions.reduce((sum, e) => sum + e.intensity, 0) / data.emotions.length;
    if (avgIntensity > 7) {
      recommendations.push('Consider implementing stress reduction strategies');
    }
  }

  // Analyze sensory patterns
  if (data.sensoryInputs.length > 0) {
    const seekingRatio =
      data.sensoryInputs.filter((s) => s.response.toLowerCase().includes('seeking')).length /
      data.sensoryInputs.length;

    if (seekingRatio > 0.7) {
      recommendations.push('Provide more structured sensory breaks and tools');
    }
  }

  // Default recommendation if no patterns detected
  if (recommendations.length === 0) {
    recommendations.push('Continue current monitoring and support strategies');
  }

  return recommendations;
}
