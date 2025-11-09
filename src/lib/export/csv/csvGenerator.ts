/**
 * CSV Generator Module
 * Main CSV generation logic for different data types
 * Supports emotions, sensory inputs, goals, and tracking entries
 */

import type {
  Student,
  EmotionEntry,
  SensoryEntry,
  Goal,
  TrackingEntry
} from "@/types/student";

import {
  escapeCSVValue,
  formatDate,
  formatArray,
  generateUtf8Bom,
  anonymizeStudentName,
  anonymizeEmotion,
  anonymizeSensory,
  anonymizeGoal,
  anonymizeTracking,
  filterByDateRange,
  groupBy,
  getGoalCurrentProgress,
  calculateGoalProgress,
  type CSVFormattingOptions,
  type AnonymizationOptions
} from "./csvFormatter";

/**
 * Export options for CSV generation
 */
export interface CSVExportOptions {
  includeFields: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  groupBy?: 'student' | 'date' | 'goal';
  anonymize?: boolean;
  formatting?: CSVFormattingOptions;
  columnMap?: Record<string, string>;
}

/**
 * Result of CSV generation
 */
export interface CSVGenerationResult {
  content: string;
  rowCount: number;
  byteSize: number;
}

/**
 * Generate CSV header row from column names
 */
export function generateCSVHeader(
  columns: string[],
  options?: CSVFormattingOptions
): string {
  const delimiter = options?.delimiter || ',';
  const quoteAll = options?.quoteAll || false;

  return columns
    .map(col => escapeCSVValue(col, delimiter, quoteAll))
    .join(delimiter);
}

/**
 * Generate CSV row from values
 */
export function generateCSVRow(
  values: unknown[],
  options?: CSVFormattingOptions
): string {
  const delimiter = options?.delimiter || ',';
  const quoteAll = options?.quoteAll || false;
  const nullValue = options?.nullValue || '';

  return values
    .map(val => {
      if (val === null || val === undefined) {
        return nullValue;
      }
      return escapeCSVValue(val, delimiter, quoteAll);
    })
    .join(delimiter);
}

/**
 * Generate CSV for emotion entries
 */
export function generateEmotionsCSV(
  emotions: EmotionEntry[],
  students: Student[],
  options: CSVExportOptions
): CSVGenerationResult {
  const { anonymize, formatting, dateRange } = options;
  const delimiter = formatting?.delimiter || ',';

  // Filter by date range
  const filteredEmotions = filterByDateRange(emotions, dateRange);

  // Anonymization options
  const anonOptions: AnonymizationOptions = {
    anonymizeNames: anonymize,
    anonymizeIds: anonymize,
    anonymizeDates: anonymize
  };

  // Define columns
  const columns = [
    'Date',
    'Student',
    'Emotion',
    'Sub-Emotion',
    'Intensity',
    'Duration (min)',
    'Triggers',
    'Escalation Pattern',
    'Context',
    'Notes'
  ];

  let csv = '';

  // Add BOM if requested
  if (formatting?.includeUtf8Bom) {
    csv += generateUtf8Bom();
  }

  // Add header
  csv += generateCSVHeader(columns, formatting) + '\n';

  // Generate rows
  let rowCount = 0;
  filteredEmotions.forEach(emotion => {
    const processedEmotion = anonymize ? anonymizeEmotion(emotion, anonOptions) : emotion;
    const student = students.find(s => s.id === emotion.studentId);
    const studentName = anonymize
      ? anonymizeStudentName(emotion.studentId || '')
      : (student?.name || 'Unknown');

    const values = [
      formatDate(processedEmotion.timestamp, formatting?.dateFormat),
      studentName,
      processedEmotion.emotion,
      processedEmotion.subEmotion || '',
      processedEmotion.intensity,
      processedEmotion.duration || '',
      formatArray(processedEmotion.triggers),
      processedEmotion.escalationPattern || '',
      processedEmotion.context || '',
      processedEmotion.notes || ''
    ];

    csv += generateCSVRow(values, formatting) + '\n';
    rowCount++;
  });

  return {
    content: csv,
    rowCount,
    byteSize: new Blob([csv]).size
  };
}

/**
 * Generate CSV for sensory entries
 */
export function generateSensoryCSV(
  sensoryInputs: SensoryEntry[],
  students: Student[],
  options: CSVExportOptions
): CSVGenerationResult {
  const { anonymize, formatting, dateRange } = options;

  // Filter by date range
  const filteredSensory = filterByDateRange(sensoryInputs, dateRange);

  // Anonymization options
  const anonOptions: AnonymizationOptions = {
    anonymizeNames: anonymize,
    anonymizeIds: anonymize,
    anonymizeDates: anonymize
  };

  // Define columns
  const columns = [
    'Date',
    'Student',
    'Sensory Type',
    'Response',
    'Intensity',
    'Location',
    'Context',
    'Coping Strategies',
    'Environment',
    'Notes'
  ];

  let csv = '';

  // Add BOM if requested
  if (formatting?.includeUtf8Bom) {
    csv += generateUtf8Bom();
  }

  // Add header
  csv += generateCSVHeader(columns, formatting) + '\n';

  // Generate rows
  let rowCount = 0;
  filteredSensory.forEach(sensory => {
    const processedSensory = anonymize ? anonymizeSensory(sensory, anonOptions) : sensory;
    const student = students.find(s => s.id === sensory.studentId);
    const studentName = anonymize
      ? anonymizeStudentName(sensory.studentId || '')
      : (student?.name || 'Unknown');

    const values = [
      formatDate(processedSensory.timestamp, formatting?.dateFormat),
      studentName,
      processedSensory.sensoryType || processedSensory.type || '',
      processedSensory.response,
      processedSensory.intensity || '',
      processedSensory.location || '',
      processedSensory.context || '',
      formatArray(processedSensory.copingStrategies),
      processedSensory.environment || '',
      processedSensory.notes || ''
    ];

    csv += generateCSVRow(values, formatting) + '\n';
    rowCount++;
  });

  return {
    content: csv,
    rowCount,
    byteSize: new Blob([csv]).size
  };
}

/**
 * Generate CSV for goals
 */
export function generateGoalsCSV(
  goals: Goal[],
  students: Student[],
  options: CSVExportOptions
): CSVGenerationResult {
  const { anonymize, formatting } = options;

  // Anonymization options
  const anonOptions: AnonymizationOptions = {
    anonymizeNames: anonymize,
    anonymizeIds: anonymize,
    anonymizeDates: anonymize
  };

  // Define columns
  const columns = [
    'Student',
    'Goal Title',
    'Description',
    'Category',
    'Status',
    'Target Value',
    'Current Progress',
    'Progress %',
    'Measurable Objective',
    'Baseline Value',
    'Date Created',
    'Target Date',
    'Last Updated',
    'Notes'
  ];

  let csv = '';

  // Add BOM if requested
  if (formatting?.includeUtf8Bom) {
    csv += generateUtf8Bom();
  }

  // Add header
  csv += generateCSVHeader(columns, formatting) + '\n';

  // Generate rows
  let rowCount = 0;
  goals.forEach(goal => {
    const processedGoal = anonymize ? anonymizeGoal(goal, anonOptions) : goal;
    const student = students.find(s => s.id === goal.studentId);
    const studentName = anonymize
      ? anonymizeStudentName(goal.studentId)
      : (student?.name || 'Unknown');

    const currentProgress = getGoalCurrentProgress(processedGoal);
    const progressPercentage = calculateGoalProgress(processedGoal);

    const values = [
      studentName,
      processedGoal.title,
      processedGoal.description,
      processedGoal.category,
      processedGoal.status,
      processedGoal.targetValue || '',
      currentProgress,
      progressPercentage,
      processedGoal.measurableObjective,
      processedGoal.baselineValue || '',
      formatDate(processedGoal.createdDate, formatting?.dateFormat),
      formatDate(processedGoal.targetDate, formatting?.dateFormat),
      formatDate(processedGoal.updatedAt, formatting?.dateFormat),
      processedGoal.notes || ''
    ];

    csv += generateCSVRow(values, formatting) + '\n';
    rowCount++;
  });

  return {
    content: csv,
    rowCount,
    byteSize: new Blob([csv]).size
  };
}

/**
 * Generate CSV for tracking entries
 */
export function generateTrackingCSV(
  trackingEntries: TrackingEntry[],
  students: Student[],
  options: CSVExportOptions
): CSVGenerationResult {
  const { anonymize, formatting, dateRange } = options;

  // Filter by date range
  const filteredTracking = filterByDateRange(trackingEntries, dateRange);

  // Anonymization options
  const anonOptions: AnonymizationOptions = {
    anonymizeNames: anonymize,
    anonymizeIds: anonymize,
    anonymizeDates: anonymize
  };

  // Define columns
  const columns = [
    'Date',
    'Student',
    'Session Duration (min)',
    'Emotion Count',
    'Sensory Count',
    'Location',
    'Social Context',
    'Environmental Notes',
    'General Notes'
  ];

  let csv = '';

  // Add BOM if requested
  if (formatting?.includeUtf8Bom) {
    csv += generateUtf8Bom();
  }

  // Add header
  csv += generateCSVHeader(columns, formatting) + '\n';

  // Generate rows
  let rowCount = 0;
  filteredTracking.forEach(entry => {
    const processedEntry = anonymize ? anonymizeTracking(entry, anonOptions) : entry;
    const student = students.find(s => s.id === entry.studentId);
    const studentName = anonymize
      ? anonymizeStudentName(entry.studentId)
      : (student?.name || 'Unknown');

    const values = [
      formatDate(processedEntry.timestamp, formatting?.dateFormat),
      studentName,
      60, // Default session duration
      processedEntry.emotions.length,
      processedEntry.sensoryInputs.length,
      processedEntry.environmentalData?.location || '',
      processedEntry.environmentalData?.socialContext || '',
      processedEntry.environmentalData?.notes || '',
      processedEntry.generalNotes || processedEntry.notes || ''
    ];

    csv += generateCSVRow(values, formatting) + '\n';
    rowCount++;
  });

  return {
    content: csv,
    rowCount,
    byteSize: new Blob([csv]).size
  };
}

/**
 * Generate multi-section CSV export
 * Exports multiple data types in a single CSV file with section headers
 */
export function generateMultiSectionCSV(
  students: Student[],
  data: {
    trackingEntries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    goals: Goal[];
  },
  options: CSVExportOptions
): CSVGenerationResult {
  let fullContent = '';
  let totalRows = 0;

  // Add BOM once at the start if requested
  if (options.formatting?.includeUtf8Bom) {
    fullContent += generateUtf8Bom();
  }

  // Generate each section
  if (options.includeFields.includes('emotions')) {
    fullContent += '=== EMOTIONS ===\n';
    const result = generateEmotionsCSV(data.emotions, students, {
      ...options,
      formatting: {
        ...options.formatting,
        includeUtf8Bom: false // BOM already added
      }
    });
    fullContent += result.content + '\n\n';
    totalRows += result.rowCount;
  }

  if (options.includeFields.includes('sensoryInputs')) {
    fullContent += '=== SENSORY INPUTS ===\n';
    const result = generateSensoryCSV(data.sensoryInputs, students, {
      ...options,
      formatting: {
        ...options.formatting,
        includeUtf8Bom: false
      }
    });
    fullContent += result.content + '\n\n';
    totalRows += result.rowCount;
  }

  if (options.includeFields.includes('goals')) {
    fullContent += '=== GOALS ===\n';
    const result = generateGoalsCSV(data.goals, students, {
      ...options,
      formatting: {
        ...options.formatting,
        includeUtf8Bom: false
      }
    });
    fullContent += result.content + '\n\n';
    totalRows += result.rowCount;
  }

  if (options.includeFields.includes('trackingEntries')) {
    fullContent += '=== TRACKING ENTRIES ===\n';
    const result = generateTrackingCSV(data.trackingEntries, students, {
      ...options,
      formatting: {
        ...options.formatting,
        includeUtf8Bom: false
      }
    });
    fullContent += result.content + '\n\n';
    totalRows += result.rowCount;
  }

  return {
    content: fullContent,
    rowCount: totalRows,
    byteSize: new Blob([fullContent]).size
  };
}

/**
 * Generate grouped CSV export
 * Groups data by student, date, or goal before exporting
 */
export function generateGroupedCSV(
  students: Student[],
  data: {
    trackingEntries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    goals: Goal[];
  },
  options: CSVExportOptions
): CSVGenerationResult {
  const groupByField = options.groupBy || 'student';

  let fullContent = '';
  let totalRows = 0;

  // Add BOM if requested
  if (options.formatting?.includeUtf8Bom) {
    fullContent += generateUtf8Bom();
  }

  switch (groupByField) {
    case 'student': {
      students.forEach(student => {
        fullContent += `\n=== ${student.name} ===\n`;

        // Filter data for this student
        const studentData = {
          emotions: data.emotions.filter(e => e.studentId === student.id),
          sensoryInputs: data.sensoryInputs.filter(s => s.studentId === student.id),
          goals: data.goals.filter(g => g.studentId === student.id),
          trackingEntries: data.trackingEntries.filter(t => t.studentId === student.id)
        };

        const result = generateMultiSectionCSV([student], studentData, {
          ...options,
          formatting: {
            ...options.formatting,
            includeUtf8Bom: false
          }
        });

        fullContent += result.content;
        totalRows += result.rowCount;
      });
      break;
    }

    case 'date': {
      // Group emotions by date
      const emotionsByDate = groupBy(data.emotions, 'timestamp');
      Object.entries(emotionsByDate).forEach(([date, emotions]) => {
        fullContent += `\n=== ${formatDate(new Date(date), 'yyyy-MM-dd')} ===\n`;
        const result = generateEmotionsCSV(emotions, students, {
          ...options,
          formatting: {
            ...options.formatting,
            includeUtf8Bom: false
          }
        });
        fullContent += result.content;
        totalRows += result.rowCount;
      });
      break;
    }

    case 'goal': {
      // Group by goal
      data.goals.forEach(goal => {
        fullContent += `\n=== Goal: ${goal.title} ===\n`;
        const result = generateGoalsCSV([goal], students, {
          ...options,
          formatting: {
            ...options.formatting,
            includeUtf8Bom: false
          }
        });
        fullContent += result.content;
        totalRows += result.rowCount;
      });
      break;
    }
  }

  return {
    content: fullContent,
    rowCount: totalRows,
    byteSize: new Blob([fullContent]).size
  };
}

/**
 * Main CSV export function
 * Routes to appropriate generator based on options
 */
export function generateCSVExport(
  students: Student[],
  data: {
    trackingEntries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    goals: Goal[];
  },
  options: CSVExportOptions
): CSVGenerationResult {
  // If groupBy is specified, use grouped export
  if (options.groupBy) {
    return generateGroupedCSV(students, data, options);
  }

  // Otherwise use multi-section export
  return generateMultiSectionCSV(students, data, options);
}
