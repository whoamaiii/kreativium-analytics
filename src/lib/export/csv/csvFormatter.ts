/**
 * CSV Formatter Module
 * Handles data transformation, formatting, and escaping for CSV export
 * RFC 4180 compliant
 */

import { format } from 'date-fns';
import type { Student, EmotionEntry, SensoryEntry, Goal, TrackingEntry } from '@/types/student';

/**
 * CSV formatting options
 */
export interface CSVFormattingOptions {
  delimiter?: string;
  dateFormat?: string;
  includeUtf8Bom?: boolean;
  quoteAll?: boolean;
  nullValue?: string;
}

/**
 * Field selection options
 */
export interface FieldSelectionOptions {
  includeFields?: string[];
  excludeFields?: string[];
}

/**
 * Anonymization options
 */
export interface AnonymizationOptions {
  anonymizeNames?: boolean;
  anonymizeIds?: boolean;
  anonymizeDates?: boolean;
}

/**
 * CSV value escaping and quoting per RFC 4180
 * Quotes values that contain:
 * - Delimiter (comma)
 * - Quote character (")
 * - Line breaks (\n, \r)
 */
export function escapeCSVValue(value: unknown, delimiter = ',', quoteAll = false): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // Check if value needs quoting
  const needsQuoting =
    quoteAll ||
    stringValue.includes(delimiter) ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r') ||
    stringValue.includes('(') ||
    stringValue.includes(')');

  if (!needsQuoting) {
    return stringValue;
  }

  // Escape quotes by doubling them
  const escapedValue = stringValue.replace(/"/g, '""');
  return `"${escapedValue}"`;
}

/**
 * Format a Date object to string using specified format
 */
export function formatDate(
  date: Date | string | undefined,
  dateFormat = 'yyyy-MM-dd HH:mm',
): string {
  if (!date) return '';

  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return format(dateObj, dateFormat);
  } catch {
    return String(date);
  }
}

/**
 * Format an array to a delimited string
 */
export function formatArray(arr: unknown[] | undefined, separator = '; '): string {
  if (!arr || arr.length === 0) return '';
  return arr.join(separator);
}

/**
 * Flatten nested objects into dot-notation keys
 * Example: { user: { name: 'John' } } -> { 'user.name': 'John' }
 */
export function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
  maxDepth = 2,
  currentDepth = 0,
): Record<string, unknown> {
  if (currentDepth >= maxDepth) {
    return { [prefix]: JSON.stringify(obj) };
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      result[newKey] = '';
    } else if (Array.isArray(value)) {
      result[newKey] = formatArray(value);
    } else if (value instanceof Date) {
      result[newKey] = formatDate(value);
    } else if (typeof value === 'object') {
      Object.assign(
        result,
        flattenObject(value as Record<string, unknown>, newKey, maxDepth, currentDepth + 1),
      );
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Filter object fields based on selection options
 */
export function selectFields<T extends Record<string, unknown>>(
  obj: T,
  options: FieldSelectionOptions,
): Partial<T> {
  const { includeFields, excludeFields } = options;

  if (includeFields && includeFields.length > 0) {
    const result: Partial<T> = {};
    for (const field of includeFields) {
      if (field in obj) {
        result[field as keyof T] = obj[field as keyof T];
      }
    }
    return result;
  }

  if (excludeFields && excludeFields.length > 0) {
    const result = { ...obj };
    for (const field of excludeFields) {
      delete result[field as keyof T];
    }
    return result;
  }

  return obj;
}

/**
 * Anonymize student name
 */
export function anonymizeStudentName(studentId: string): string {
  return `Student_${studentId.slice(-4)}`;
}

/**
 * Anonymize student data
 */
export function anonymizeStudent(
  student: Student,
  options: AnonymizationOptions,
): Partial<Student> {
  const anonymized: Partial<Student> = { ...student };

  if (options.anonymizeNames) {
    anonymized.name = anonymizeStudentName(student.id);
  }

  if (options.anonymizeDates) {
    delete anonymized.dateOfBirth;
  }

  if (options.anonymizeIds) {
    anonymized.id = student.id.slice(-4);
  }

  return anonymized;
}

/**
 * Anonymize emotion entry
 */
export function anonymizeEmotion(
  emotion: EmotionEntry,
  options: AnonymizationOptions,
): EmotionEntry {
  if (!options.anonymizeIds) return emotion;

  return {
    ...emotion,
    studentId: emotion.studentId?.slice(-4),
  };
}

/**
 * Anonymize sensory entry
 */
export function anonymizeSensory(
  sensory: SensoryEntry,
  options: AnonymizationOptions,
): SensoryEntry {
  if (!options.anonymizeIds) return sensory;

  return {
    ...sensory,
    studentId: sensory.studentId?.slice(-4),
  };
}

/**
 * Anonymize goal
 */
export function anonymizeGoal(goal: Goal, options: AnonymizationOptions): Goal {
  if (!options.anonymizeIds) return goal;

  return {
    ...goal,
    studentId: goal.studentId.slice(-4),
  };
}

/**
 * Anonymize tracking entry
 */
export function anonymizeTracking(
  tracking: TrackingEntry,
  options: AnonymizationOptions,
): TrackingEntry {
  if (!options.anonymizeIds) return tracking;

  return {
    ...tracking,
    studentId: tracking.studentId.slice(-4),
  };
}

/**
 * Map custom column names
 */
export function mapColumnNames(headers: string[], columnMap?: Record<string, string>): string[] {
  if (!columnMap) return headers;

  return headers.map((header) => columnMap[header] || header);
}

/**
 * Generate UTF-8 BOM (Byte Order Mark) for Excel compatibility
 */
export function generateUtf8Bom(): string {
  return '\uFEFF';
}

/**
 * Filter data by date range
 */
export function filterByDateRange<T extends { timestamp: Date }>(
  data: T[],
  dateRange?: { start: Date; end: Date },
): T[] {
  if (!dateRange) return data;

  return data.filter(
    (item) => item.timestamp >= dateRange.start && item.timestamp <= dateRange.end,
  );
}

/**
 * Group data by a field value
 */
export function groupBy<T extends Record<string, unknown>>(
  data: T[],
  field: keyof T,
): Record<string, T[]> {
  return data.reduce(
    (acc, item) => {
      const key = String(item[field] || 'undefined');
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, T[]>,
  );
}

/**
 * Get current progress value from goal data points
 */
export function getGoalCurrentProgress(goal: Goal): number {
  if (!goal.dataPoints || goal.dataPoints.length === 0) {
    return 0;
  }
  return goal.dataPoints[goal.dataPoints.length - 1].value;
}

/**
 * Calculate goal progress percentage
 */
export function calculateGoalProgress(goal: Goal): number {
  const currentValue = getGoalCurrentProgress(goal);
  if (!goal.targetValue || goal.targetValue === 0) {
    return 0;
  }
  return Math.round((currentValue / goal.targetValue) * 100);
}
