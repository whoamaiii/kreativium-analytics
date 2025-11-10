/**
 * CSV Export Module - Usage Examples
 * Demonstrates common use cases for CSV export functionality
 */

import type { Student, EmotionEntry, SensoryEntry, Goal, TrackingEntry } from '@/types/student';
import {
  generateCSVExport,
  generateEmotionsCSV,
  generateSensoryCSV,
  generateGoalsCSV,
  generateTrackingCSV,
  type CSVExportOptions,
} from './index';

/**
 * Example 1: Basic CSV Export
 * Export all emotions for all students
 */
export function exampleBasicExport(students: Student[], emotions: EmotionEntry[]): string {
  const options: CSVExportOptions = {
    includeFields: ['emotions'],
  };

  const result = generateEmotionsCSV(emotions, students, options);
  // Generated CSV with ${result.rowCount} rows, ${result.byteSize} bytes

  return result.content;
}

/**
 * Example 2: Date Range Filtered Export
 * Export data for a specific time period
 */
export function exampleDateRangeExport(
  students: Student[],
  emotions: EmotionEntry[],
  startDate: Date,
  endDate: Date,
): string {
  const options: CSVExportOptions = {
    includeFields: ['emotions'],
    dateRange: {
      start: startDate,
      end: endDate,
    },
  };

  const result = generateEmotionsCSV(emotions, students, options);
  return result.content;
}

/**
 * Example 3: Anonymized Export
 * Export data with student names and IDs anonymized
 */
export function exampleAnonymizedExport(
  students: Student[],
  emotions: EmotionEntry[],
  sensoryInputs: SensoryEntry[],
  goals: Goal[],
  trackingEntries: TrackingEntry[],
): string {
  const options: CSVExportOptions = {
    includeFields: ['emotions', 'sensoryInputs', 'goals', 'trackingEntries'],
    anonymize: true,
  };

  const result = generateCSVExport(
    students,
    {
      emotions,
      sensoryInputs,
      goals,
      trackingEntries,
    },
    options,
  );

  return result.content;
}

/**
 * Example 4: Excel-Compatible Export with UTF-8 BOM
 * Add Byte Order Mark for Excel to properly recognize UTF-8 encoding
 */
export function exampleExcelExport(students: Student[], emotions: EmotionEntry[]): string {
  const options: CSVExportOptions = {
    includeFields: ['emotions'],
    formatting: {
      includeUtf8Bom: true,
      dateFormat: 'MM/dd/yyyy HH:mm', // US date format for Excel
    },
  };

  const result = generateEmotionsCSV(emotions, students, options);
  return result.content;
}

/**
 * Example 5: Custom Delimiter (Tab-Separated Values)
 * Use tabs instead of commas for TSV format
 */
export function exampleTabSeparatedExport(
  students: Student[],
  sensoryInputs: SensoryEntry[],
): string {
  const options: CSVExportOptions = {
    includeFields: ['sensoryInputs'],
    formatting: {
      delimiter: '\t',
      dateFormat: 'yyyy-MM-dd HH:mm:ss',
    },
  };

  const result = generateSensoryCSV(sensoryInputs, students, options);
  return result.content;
}

/**
 * Example 6: Grouped by Student Export
 * Export data grouped by individual students
 */
export function exampleGroupedByStudentExport(
  students: Student[],
  emotions: EmotionEntry[],
  sensoryInputs: SensoryEntry[],
  goals: Goal[],
  trackingEntries: TrackingEntry[],
): string {
  const options: CSVExportOptions = {
    includeFields: ['emotions', 'sensoryInputs', 'goals'],
    groupBy: 'student',
  };

  const result = generateCSVExport(
    students,
    {
      emotions,
      sensoryInputs,
      goals,
      trackingEntries,
    },
    options,
  );

  return result.content;
}

/**
 * Example 7: Filtered Field Export
 * Export only emotions data
 */
export function exampleEmotionsOnlyExport(students: Student[], emotions: EmotionEntry[]): string {
  const options: CSVExportOptions = {
    includeFields: ['emotions'],
    formatting: {
      includeUtf8Bom: true,
      dateFormat: 'yyyy-MM-dd HH:mm',
    },
  };

  const result = generateEmotionsCSV(emotions, students, options);
  return result.content;
}

/**
 * Example 8: Goals Progress Report Export
 * Export all goals with progress metrics
 */
export function exampleGoalsProgressExport(students: Student[], goals: Goal[]): string {
  const options: CSVExportOptions = {
    includeFields: ['goals'],
    formatting: {
      includeUtf8Bom: true,
    },
  };

  const result = generateGoalsCSV(goals, students, options);
  return result.content;
}

/**
 * Example 9: Multi-Section Export
 * Export all data types in a single file with section headers
 */
export function exampleMultiSectionExport(
  students: Student[],
  emotions: EmotionEntry[],
  sensoryInputs: SensoryEntry[],
  goals: Goal[],
  trackingEntries: TrackingEntry[],
): string {
  const options: CSVExportOptions = {
    includeFields: ['emotions', 'sensoryInputs', 'goals', 'trackingEntries'],
    formatting: {
      includeUtf8Bom: true,
    },
  };

  const result = generateCSVExport(
    students,
    {
      emotions,
      sensoryInputs,
      goals,
      trackingEntries,
    },
    options,
  );

  return result.content;
}

/**
 * Example 10: Download CSV File
 * Create a downloadable CSV file in the browser
 */
export function exampleDownloadCSV(
  students: Student[],
  emotions: EmotionEntry[],
  filename = 'emotions-export.csv',
): void {
  const options: CSVExportOptions = {
    includeFields: ['emotions'],
    formatting: {
      includeUtf8Bom: true,
    },
  };

  const result = generateEmotionsCSV(emotions, students, options);

  // Create blob and download
  const blob = new Blob([result.content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Downloaded ${filename} (${result.rowCount} rows, ${result.byteSize} bytes)
}

/**
 * Example 11: Streaming Large Dataset
 * For very large datasets, process in chunks
 */
export function exampleStreamingExport(
  students: Student[],
  emotions: EmotionEntry[],
  chunkSize = 1000,
): string[] {
  const chunks: string[] = [];
  const options: CSVExportOptions = {
    includeFields: ['emotions'],
    formatting: {
      includeUtf8Bom: true,
    },
  };

  // Process in chunks
  for (let i = 0; i < emotions.length; i += chunkSize) {
    const chunk = emotions.slice(i, i + chunkSize);
    const result = generateEmotionsCSV(chunk, students, options);
    chunks.push(result.content);
  }

  // Generated ${chunks.length} chunks
  return chunks;
}

/**
 * Example 12: Custom Date Format Export
 * Export with ISO 8601 date format
 */
export function exampleCustomDateFormatExport(
  students: Student[],
  trackingEntries: TrackingEntry[],
): string {
  const options: CSVExportOptions = {
    includeFields: ['trackingEntries'],
    formatting: {
      dateFormat: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", // ISO 8601
    },
  };

  const result = generateTrackingCSV(trackingEntries, students, options);
  return result.content;
}

/**
 * Example 13: Quote All Values Export
 * Force all values to be quoted (some systems require this)
 */
export function exampleQuoteAllExport(students: Student[], emotions: EmotionEntry[]): string {
  const options: CSVExportOptions = {
    includeFields: ['emotions'],
    formatting: {
      quoteAll: true,
    },
  };

  const result = generateEmotionsCSV(emotions, students, options);
  return result.content;
}

/**
 * Example 14: Integration with existing exportSystem
 * Show how to integrate with the existing export system
 */
export function exampleIntegrationWithExportSystem(
  students: Student[],
  data: {
    trackingEntries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    goals: Goal[];
  },
  legacyOptions: {
    includeFields: string[];
    dateRange?: { start: Date; end: Date };
    anonymize?: boolean;
  },
): string {
  // Convert legacy options to new format
  const options: CSVExportOptions = {
    includeFields: legacyOptions.includeFields,
    dateRange: legacyOptions.dateRange,
    anonymize: legacyOptions.anonymize,
    formatting: {
      includeUtf8Bom: true,
      dateFormat: 'yyyy-MM-dd HH:mm',
    },
  };

  const result = generateCSVExport(students, data, options);
  return result.content;
}
