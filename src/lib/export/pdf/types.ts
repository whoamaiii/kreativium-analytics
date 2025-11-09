/**
 * PDF Report Generation Types
 *
 * Type definitions for PDF report generation functionality.
 */

import type { Student, TrackingEntry, EmotionEntry, SensoryEntry, Goal } from "@/types/student";

/**
 * Report content structure for PDF generation
 */
export interface ReportContent {
  header: {
    title: string;
    dateRange: string;
    generatedDate: string;
    studentInfo: {
      name: string;
      grade?: string;
      id: string;
    };
  };
  summary: {
    totalSessions: number;
    totalEmotions: number;
    totalSensoryInputs: number;
    activeGoals: number;
    completedGoals: number;
  };
  emotionAnalysis: {
    mostCommon: string;
    avgIntensity: string;
    positiveRate: string;
  };
  sensoryAnalysis: {
    seekingRatio: string;
    mostCommonType: string;
  };
  goalProgress: Array<{
    title: string;
    progress: number;
    status: string;
  }>;
  recommendations: string[];
}

/**
 * Data collections for report generation
 */
export interface ReportDataCollection {
  trackingEntries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  goals: Goal[];
}

/**
 * Options for PDF report generation
 */
export interface PDFReportOptions {
  includeCharts?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Context for report generation
 */
export interface ReportContext {
  student: Student;
  data: ReportDataCollection;
  options: PDFReportOptions;
}
