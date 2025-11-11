/**
 * Usage Examples for Export Common Utilities
 *
 * Demonstrates how to use the shared export utilities in different contexts.
 * These examples show integration with existing CSV, JSON, and PDF exporters.
 */

import {
  // Options and validation
  type ExportOptions,
  type ExportDataCollection,
  validateExportOptions,
  mergeExportOptions,
  isExportTooLarge,

  // Data collection
  collectExportData,
  applyDateRangeFilter,
  groupDataBy,
  calculateExportMetadata,
  streamExportData,

  // Transformation
  anonymizeData,
  type AnonymizationOptions,
  flattenNestedData,
  enrichWithComputedFields,
  GOAL_COMPUTED_FIELDS,
  STUDENT_COMPUTED_FIELDS,
} from './index';

import type { Student, EmotionEntry, SensoryEntry, Goal, TrackingEntry } from '@/types/student';

// ============================================================================
// Example 1: Basic Validated Export
// ============================================================================

export async function basicValidatedExport(
  students: Student[],
  allData: {
    trackingEntries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    goals: Goal[];
  },
) {
  // 1. Define export options
  const userOptions: Partial<ExportOptions> = {
    format: 'csv',
    includeFields: ['emotions', 'sensoryInputs', 'goals'],
    dateRange: {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31'),
    },
    anonymize: false,
  };

  // 2. Validate options
  const validation = validateExportOptions(userOptions);
  if (!validation.valid) {
    throw new Error(`Invalid export options: ${validation.errors.join(', ')}`);
  }

  if (validation.warnings.length > 0) {
    // logger.warn('Export warnings:', validation.warnings);
  }

  // 3. Merge with defaults
  const options = mergeExportOptions(userOptions);

  // 4. Check size before processing
  // Note: for initial check, we can use raw data
  const sizeCheck = isExportTooLarge(allData, options);
  if (sizeCheck.tooLarge) {
    const sizeMB = (sizeCheck.estimatedSize / (1024 * 1024)).toFixed(2);
    // logger.warn(`Export will be large: ${sizeMB} MB`);
  }

  // 5. Collect data with progress tracking
  const data = collectExportData(students, allData, options, (progress) => {
    // Collecting [${progress.phase}] ${progress.percentage}% - ${progress.currentItem || ''}
  });

  // 6. Calculate metadata
  const metadata = calculateExportMetadata(data);
  // Export metadata: totalRecords, dateRange, recordCounts

  return { data, metadata, options };
}

// ============================================================================
// Example 2: Anonymized Export for Research/Sharing
// ============================================================================

export async function anonymizedExportForResearch(
  students: Student[],
  allData: {
    trackingEntries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    goals: Goal[];
  },
) {
  const options = mergeExportOptions({
    format: 'json',
    includeFields: ['emotions', 'sensoryInputs'],
    anonymize: true,
  });

  // Collect data
  const data = collectExportData(students, allData, options);

  // Custom anonymization - keep notes but redact PII
  const anonOptions: AnonymizationOptions = {
    anonymizeNames: true,
    removeDateOfBirth: true,
    truncateIds: true,
    removeNotes: false, // Keep notes
    redactNotes: true, // But redact PII (emails, phones, etc.)
  };

  // Apply anonymization
  const anonymizedData = anonymizeData(data, anonOptions);

  // Anonymized export ready with emotions, sensoryInputs
  // Verify anonymization: sampleName should be "Student_XXXX", sampleDOB should be undefined

  return anonymizedData;
}

// ============================================================================
// Example 3: Streaming Large Export
// ============================================================================

export async function streamingLargeExport(
  students: Student[],
  allData: {
    trackingEntries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    goals: Goal[];
  },
  outputHandler: (chunk: { type: string; data: unknown[] }) => Promise<void>,
) {
  const options = mergeExportOptions({
    format: 'csv',
    includeFields: ['trackingEntries', 'emotions', 'sensoryInputs', 'goals'],
    anonymize: false,
  });

  // Stream data in chunks of 500 records
  for await (const chunk of streamExportData(students, allData, options, 500)) {
    // Streaming ${chunk.type}: ${chunk.chunk.length} records

    // Process chunk (e.g., write to file, send to API)
    await outputHandler({
      type: chunk.type,
      data: chunk.chunk,
    });
  }
}

// ============================================================================
// Example 4: Grouped Export by Student
// ============================================================================

export function groupedExportByStudent(
  students: Student[],
  allData: {
    trackingEntries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    goals: Goal[];
  },
): Map<string, { student: Student; data: ExportDataCollection }> {
  const options = mergeExportOptions({
    format: 'pdf',
    includeFields: ['emotions', 'sensoryInputs', 'goals'],
  });

  // Collect all data
  const data = collectExportData(students, allData, options);

  // Group by student
  const emotionsByStudent = groupDataBy(data.emotions, 'student');
  const sensoryByStudent = groupDataBy(data.sensoryInputs, 'student');
  const goalsByStudent = groupDataBy(data.goals, 'student');

  // Combine into student-specific collections
  const studentExports = new Map<string, { student: Student; data: ExportDataCollection }>();

  for (const student of students) {
    studentExports.set(student.id, {
      student,
      data: {
        trackingEntries: data.trackingEntries.filter((t) => t.studentId === student.id),
        emotions: emotionsByStudent.get(student.id) || [],
        sensoryInputs: sensoryByStudent.get(student.id) || [],
        goals: goalsByStudent.get(student.id) || [],
        students: [student],
      },
    });
  }

  return studentExports;
}

// ============================================================================
// Example 5: CSV Export with Flattening
// ============================================================================

export function csvExportWithFlattening(
  students: Student[],
  allData: {
    trackingEntries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    goals: Goal[];
  },
): string {
  const options = mergeExportOptions({
    format: 'csv',
    includeFields: ['goals'],
  });

  const data = collectExportData(students, allData, options);

  // Enrich goals with computed fields
  const enrichedGoals = data.goals.map((goal) =>
    enrichWithComputedFields(goal, GOAL_COMPUTED_FIELDS as Record<string, (obj: Goal) => unknown>),
  );

  // Flatten for CSV
  const flattenedGoals = enrichedGoals.map((goal) => flattenNestedData(goal));

  // Generate CSV
  const headers = Object.keys(flattenedGoals[0] || {});
  let csv = headers.join(',') + '\n';

  for (const row of flattenedGoals) {
    csv +=
      headers
        .map((h) => {
          const value = row[h];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : String(value);
        })
        .join(',') + '\n';
  }

  return csv;
}

// ============================================================================
// Example 6: Date Range Filtering
// ============================================================================

export function dateRangeFilteredExport(
  students: Student[],
  allData: {
    trackingEntries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    goals: Goal[];
  },
  startDate: Date,
  endDate: Date,
) {
  // Direct filtering (more control)
  const filteredEmotions = applyDateRangeFilter(allData.emotions, {
    start: startDate,
    end: endDate,
  });

  const filteredSensory = applyDateRangeFilter(allData.sensoryInputs, {
    start: startDate,
    end: endDate,
  });

  const filteredTracking = applyDateRangeFilter(allData.trackingEntries, {
    start: startDate,
    end: endDate,
  });

  return {
    emotions: filteredEmotions,
    sensoryInputs: filteredSensory,
    trackingEntries: filteredTracking,
    goals: allData.goals, // Goals don't have timestamps
    stats: {
      emotionCount: filteredEmotions.length,
      sensoryCount: filteredSensory.length,
      trackingCount: filteredTracking.length,
      dateRange: { start: startDate, end: endDate },
    },
  };
}

// ============================================================================
// Example 7: Integration with Existing CSV Module
// ============================================================================

/**
 * Example showing how the existing CSV module can use common utilities
 * instead of implementing its own filtering and anonymization
 */
export function integratedCSVExport(
  students: Student[],
  allData: {
    trackingEntries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    goals: Goal[];
  },
  csvOptions: Partial<ExportOptions>,
): string {
  // 1. Use common validation
  const validation = validateExportOptions(csvOptions);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  // 2. Use common data collection
  const options = mergeExportOptions(csvOptions);
  const data = collectExportData(students, allData, options);

  // 3. Use common anonymization
  const processedData = options.anonymize ? anonymizeData(data) : data;

  // 4. Format as CSV (format-specific logic)
  return formatDataAsCSV(processedData, students);
}

/**
 * CSV-specific formatting (this stays in CSV module)
 */
function formatDataAsCSV(data: ExportDataCollection, students: Student[]): string {
  let csv = '';

  // Emotions
  if (data.emotions.length > 0) {
    csv += 'Date,Student,Emotion,Intensity,Triggers,Notes\n';
    data.emotions.forEach((e) => {
      const student = students.find((s) => s.id === e.studentId);
      csv += `${e.timestamp.toISOString()},`;
      csv += `${student?.name || 'Unknown'},`;
      csv += `${e.emotion},`;
      csv += `${e.intensity},`;
      csv += `"${e.triggers?.join('; ') || ''}",`;
      csv += `"${e.notes || ''}"\n`;
    });
    csv += '\n';
  }

  // Similar for sensory, goals, etc...

  return csv;
}

// ============================================================================
// Example 8: Progress Tracking for UI
// ============================================================================

export async function exportWithProgressUI(
  students: Student[],
  allData: {
    trackingEntries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    goals: Goal[];
  },
  onProgress: (phase: string, percentage: number, message?: string) => void,
) {
  const options = mergeExportOptions({
    format: 'json',
    includeFields: ['emotions', 'sensoryInputs', 'goals', 'trackingEntries'],
  });

  // Collect with progress tracking
  const data = collectExportData(students, allData, options, (progress) => {
    onProgress(
      progress.phase,
      progress.percentage,
      progress.currentItem
        ? `Processing ${progress.currentItem} (${progress.processedRecords}/${progress.totalRecords})`
        : undefined,
    );
  });

  onProgress('transforming', 75, 'Applying transformations...');

  // Apply transformations
  const transformed = options.anonymize ? anonymizeData(data) : data;

  onProgress('formatting', 90, 'Formatting output...');

  // Format as JSON
  const output = JSON.stringify(transformed, null, 2);

  onProgress('complete', 100, 'Export complete!');

  return output;
}

// ============================================================================
// Example 9: Validation Before Export
// ============================================================================

export function validateAndPrepareExport(
  students: Student[],
  allData: {
    trackingEntries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    goals: Goal[];
  },
  userOptions: Partial<ExportOptions>,
):
  | { success: true; data: ExportDataCollection; metadata: any }
  | { success: false; errors: string[] } {
  // Validate options
  const optionValidation = validateExportOptions(userOptions);
  if (!optionValidation.valid) {
    return { success: false, errors: optionValidation.errors };
  }

  const options = mergeExportOptions(userOptions);

  // Check size
  const sizeCheck = isExportTooLarge(allData, options);
  if (sizeCheck.tooLarge) {
    const sizeMB = (sizeCheck.estimatedSize / (1024 * 1024)).toFixed(2);
    return {
      success: false,
      errors: [
        `Export too large: ${sizeMB} MB (limit: 50 MB). Please narrow date range or reduce fields.`,
      ],
    };
  }

  // Collect data
  const data = collectExportData(students, allData, options);

  // Calculate metadata
  const metadata = calculateExportMetadata(data);

  return { success: true, data, metadata };
}
