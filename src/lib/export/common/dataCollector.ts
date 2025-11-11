/**
 * Data Collection and Filtering
 *
 * Memory-efficient data collection with streaming support.
 * Handles date range filtering, grouping, and metadata calculation.
 */

import { Student, TrackingEntry, EmotionEntry, SensoryEntry, Goal } from '@/types/student';
import {
  ExportDataCollection,
  ExportMetadata,
  ExportOptions,
  ExportProgress,
} from './exportOptions';

/**
 * Progress callback for long-running operations
 */
export type ProgressCallback = (progress: ExportProgress) => void;

/**
 * Collect all data for export with optional filtering
 */
export function collectExportData(
  students: Student[],
  allData: {
    trackingEntries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    goals: Goal[];
  },
  options: ExportOptions,
  onProgress?: ProgressCallback,
): ExportDataCollection {
  const totalRecords =
    allData.trackingEntries.length +
    allData.emotions.length +
    allData.sensoryInputs.length +
    allData.goals.length +
    students.length;

  let processedRecords = 0;

  const reportProgress = (phase: ExportProgress['phase'], currentItem?: string) => {
    if (onProgress) {
      onProgress({
        phase,
        percentage: Math.round((processedRecords / totalRecords) * 100),
        processedRecords,
        totalRecords,
        currentItem,
      });
    }
  };

  reportProgress('collecting');

  // Apply date range filter if specified
  const { dateRange } = options;

  const collection: ExportDataCollection = {
    trackingEntries: [],
    emotions: [],
    sensoryInputs: [],
    goals: [],
    students: [],
  };

  // Filter tracking entries
  if (options.includeFields.includes('trackingEntries')) {
    reportProgress('filtering', 'tracking entries');
    collection.trackingEntries = applyDateRangeFilter(allData.trackingEntries, dateRange);
    processedRecords += allData.trackingEntries.length;
  }

  // Filter emotions
  if (options.includeFields.includes('emotions')) {
    reportProgress('filtering', 'emotions');
    collection.emotions = applyDateRangeFilter(allData.emotions, dateRange);
    processedRecords += allData.emotions.length;
  }

  // Filter sensory inputs
  if (options.includeFields.includes('sensoryInputs')) {
    reportProgress('filtering', 'sensory inputs');
    collection.sensoryInputs = applyDateRangeFilter(allData.sensoryInputs, dateRange);
    processedRecords += allData.sensoryInputs.length;
  }

  // Goals don't have timestamps, so no date filtering
  if (options.includeFields.includes('goals')) {
    reportProgress('filtering', 'goals');
    collection.goals = allData.goals;
    processedRecords += allData.goals.length;
  }

  // Include students if requested
  if (options.includeFields.includes('students')) {
    reportProgress('filtering', 'students');
    collection.students = students;
    processedRecords += students.length;
  }

  reportProgress('complete');

  return collection;
}

/**
 * Apply date range filter to timestamped data
 * Optimized for large datasets with early exit
 */
export function applyDateRangeFilter<T extends { timestamp: Date }>(
  data: T[],
  dateRange?: { start: Date; end: Date },
): T[] {
  if (!dateRange) return data;

  const { start, end } = dateRange;
  const startTime = start.getTime();
  const endTime = end.getTime();

  // Memory-efficient filter - doesn't create intermediate arrays
  return data.filter((item) => {
    const itemTime = item.timestamp.getTime();
    return itemTime >= startTime && itemTime <= endTime;
  });
}

/**
 * Group data by specified dimension
 * Returns a map for efficient lookup
 */
export function groupDataBy<T extends { studentId?: string; timestamp?: Date }>(
  data: T[],
  groupBy: 'student' | 'date' | 'goal',
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const item of data) {
    let key: string;

    switch (groupBy) {
      case 'student':
        key = item.studentId || 'unknown';
        break;

      case 'date':
        if (item.timestamp) {
          // Group by date (YYYY-MM-DD)
          key = item.timestamp.toISOString().split('T')[0];
        } else {
          key = 'no-date';
        }
        break;

      case 'goal':
        // For goal-based grouping, would need goalId on items
        // Fallback to student grouping for now
        key = item.studentId || 'unknown';
        break;

      default:
        key = 'default';
    }

    const existing = grouped.get(key);
    if (existing) {
      existing.push(item);
    } else {
      grouped.set(key, [item]);
    }
  }

  return grouped;
}

/**
 * Calculate comprehensive metadata from collected data
 */
export function calculateExportMetadata(
  data: ExportDataCollection,
  version: string = '1.0.0',
): ExportMetadata {
  // Collect all timestamps to find date range
  const timestamps: Date[] = [
    ...data.trackingEntries.map((t) => t.timestamp),
    ...data.emotions.map((e) => e.timestamp),
    ...data.sensoryInputs.map((s) => s.timestamp),
  ];

  // Sort timestamps to find earliest and latest
  timestamps.sort((a, b) => a.getTime() - b.getTime());

  const totalRecords =
    data.trackingEntries.length +
    data.emotions.length +
    data.sensoryInputs.length +
    data.goals.length +
    (data.students?.length || 0);

  return {
    version,
    exportDate: new Date(),
    totalRecords,
    dateRange: {
      earliest: timestamps[0] || new Date(),
      latest: timestamps[timestamps.length - 1] || new Date(),
    },
    recordCounts: {
      students: data.students?.length || 0,
      trackingEntries: data.trackingEntries.length,
      emotions: data.emotions.length,
      sensoryInputs: data.sensoryInputs.length,
      goals: data.goals.length,
    },
  };
}

/**
 * Filter data by student ID(s)
 * Useful for single-student exports
 */
export function filterByStudentIds<T extends { studentId?: string }>(
  data: T[],
  studentIds: string[],
): T[] {
  const studentIdSet = new Set(studentIds);
  return data.filter((item) => item.studentId && studentIdSet.has(item.studentId));
}

/**
 * Filter students by ID list
 */
export function filterStudents(students: Student[], studentIds: string[]): Student[] {
  const studentIdSet = new Set(studentIds);
  return students.filter((student) => studentIdSet.has(student.id));
}

/**
 * Get unique student IDs from collected data
 */
export function getUniqueStudentIds(data: ExportDataCollection): string[] {
  const studentIds = new Set<string>();

  data.trackingEntries.forEach((entry) => {
    if (entry.studentId) studentIds.add(entry.studentId);
  });

  data.emotions.forEach((emotion) => {
    if (emotion.studentId) studentIds.add(emotion.studentId);
  });

  data.sensoryInputs.forEach((sensory) => {
    if (sensory.studentId) studentIds.add(sensory.studentId);
  });

  data.goals.forEach((goal) => {
    if (goal.studentId) studentIds.add(goal.studentId);
  });

  return Array.from(studentIds);
}

/**
 * Memory-efficient chunked iteration for large datasets
 * Processes data in chunks to avoid memory spikes
 */
export function* chunkData<T>(data: T[], chunkSize: number = 1000): Generator<T[]> {
  for (let i = 0; i < data.length; i += chunkSize) {
    yield data.slice(i, i + chunkSize);
  }
}

/**
 * Streaming data collector for very large exports
 * Returns an async generator that yields chunks of data
 */
export async function* streamExportData(
  students: Student[],
  allData: {
    trackingEntries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    goals: Goal[];
  },
  options: ExportOptions,
  chunkSize: number = 1000,
): AsyncGenerator<{ type: keyof ExportDataCollection; chunk: unknown[] }> {
  const { dateRange } = options;

  // Stream tracking entries
  if (options.includeFields.includes('trackingEntries')) {
    const filtered = applyDateRangeFilter(allData.trackingEntries, dateRange);
    for (const chunk of chunkData(filtered, chunkSize)) {
      yield { type: 'trackingEntries', chunk };
    }
  }

  // Stream emotions
  if (options.includeFields.includes('emotions')) {
    const filtered = applyDateRangeFilter(allData.emotions, dateRange);
    for (const chunk of chunkData(filtered, chunkSize)) {
      yield { type: 'emotions', chunk };
    }
  }

  // Stream sensory inputs
  if (options.includeFields.includes('sensoryInputs')) {
    const filtered = applyDateRangeFilter(allData.sensoryInputs, dateRange);
    for (const chunk of chunkData(filtered, chunkSize)) {
      yield { type: 'sensoryInputs', chunk };
    }
  }

  // Stream goals
  if (options.includeFields.includes('goals')) {
    for (const chunk of chunkData(allData.goals, chunkSize)) {
      yield { type: 'goals', chunk };
    }
  }

  // Stream students
  if (options.includeFields.includes('students')) {
    for (const chunk of chunkData(students, chunkSize)) {
      yield { type: 'students', chunk };
    }
  }
}

/**
 * Validate that collected data is not empty
 */
export function validateCollectedData(data: ExportDataCollection): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const totalRecords =
    data.trackingEntries.length +
    data.emotions.length +
    data.sensoryInputs.length +
    data.goals.length +
    (data.students?.length || 0);

  if (totalRecords === 0) {
    errors.push('No data available for export');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get data statistics for reporting
 */
export function getDataStatistics(data: ExportDataCollection): {
  totalRecords: number;
  dateRange: { earliest: Date | null; latest: Date | null };
  recordsByType: Record<string, number>;
  studentCount: number;
} {
  const timestamps: Date[] = [
    ...data.trackingEntries.map((t) => t.timestamp),
    ...data.emotions.map((e) => e.timestamp),
    ...data.sensoryInputs.map((s) => s.timestamp),
  ];

  timestamps.sort((a, b) => a.getTime() - b.getTime());

  return {
    totalRecords:
      data.trackingEntries.length +
      data.emotions.length +
      data.sensoryInputs.length +
      data.goals.length +
      (data.students?.length || 0),
    dateRange: {
      earliest: timestamps[0] || null,
      latest: timestamps[timestamps.length - 1] || null,
    },
    recordsByType: {
      trackingEntries: data.trackingEntries.length,
      emotions: data.emotions.length,
      sensoryInputs: data.sensoryInputs.length,
      goals: data.goals.length,
      students: data.students?.length || 0,
    },
    studentCount: getUniqueStudentIds(data).length,
  };
}
