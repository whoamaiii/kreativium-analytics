/**
 * Export Options and Validation
 *
 * Defines shared types and validators for export functionality.
 * All export formats (PDF, CSV, JSON) use these common options.
 */

import { Student, TrackingEntry, EmotionEntry, SensoryEntry, Goal } from "@/types/student";

/**
 * Core export options interface
 */
export interface ExportOptions {
  /** Export format selection */
  format: 'pdf' | 'csv' | 'json';

  /** Fields to include in export - supports dot notation for nested fields */
  includeFields: string[];

  /** Optional date range filter */
  dateRange?: {
    start: Date;
    end: Date;
  };

  /** Group/organize data by specific dimension */
  groupBy?: 'student' | 'date' | 'goal';

  /** Include charts/visualizations in export (PDF only) */
  includeCharts?: boolean;

  /** Remove personally identifiable information */
  anonymize?: boolean;

  /** Additional metadata to include */
  includeMetadata?: boolean;

  /** Custom field mappings for CSV headers */
  fieldMappings?: Record<string, string>;
}

/**
 * Data collection interface - all data needed for export
 */
export interface ExportDataCollection {
  trackingEntries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  goals: Goal[];
  students?: Student[];
}

/**
 * Export metadata calculated from data
 */
export interface ExportMetadata {
  version: string;
  exportDate: Date;
  totalRecords: number;
  dateRange: {
    earliest: Date;
    latest: Date;
  };
  recordCounts: {
    students: number;
    trackingEntries: number;
    emotions: number;
    sensoryInputs: number;
    goals: number;
  };
  exportedBy?: string;
}

/**
 * Progress tracking for long-running exports
 */
export interface ExportProgress {
  phase: 'collecting' | 'filtering' | 'transforming' | 'formatting' | 'complete';
  percentage: number;
  processedRecords: number;
  totalRecords: number;
  currentItem?: string;
}

/**
 * Validation result for export options
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Default export options
 */
export const DEFAULT_EXPORT_OPTIONS: Partial<ExportOptions> = {
  includeFields: ['emotions', 'sensoryInputs', 'goals', 'trackingEntries'],
  includeCharts: false,
  anonymize: false,
  includeMetadata: true,
  groupBy: 'student'
};

/**
 * Available field names for export
 */
export const AVAILABLE_FIELDS = [
  'students',
  'emotions',
  'sensoryInputs',
  'goals',
  'trackingEntries',
  'interventions',
  'alerts'
] as const;

/**
 * Nested field support - dot notation paths
 */
export const NESTED_FIELD_PATHS = {
  // Student fields
  'student.name': true,
  'student.grade': true,
  'student.id': true,

  // Emotion fields
  'emotion.emotion': true,
  'emotion.intensity': true,
  'emotion.triggers': true,
  'emotion.duration': true,
  'emotion.subEmotion': true,

  // Sensory fields
  'sensory.type': true,
  'sensory.response': true,
  'sensory.intensity': true,
  'sensory.location': true,
  'sensory.copingStrategies': true,

  // Goal fields
  'goal.title': true,
  'goal.progress': true,
  'goal.status': true,
  'goal.category': true,
  'goal.milestones': true,

  // Environmental fields
  'environmental.location': true,
  'environmental.socialContext': true,
  'environmental.weather': true,
  'environmental.classroom': true
} as const;

/**
 * Validate export options
 */
export function validateExportOptions(options: Partial<ExportOptions>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate format
  if (!options.format) {
    errors.push('Export format is required');
  } else if (!['pdf', 'csv', 'json'].includes(options.format)) {
    errors.push(`Invalid format: ${options.format}. Must be 'pdf', 'csv', or 'json'`);
  }

  // Validate includeFields
  if (!options.includeFields || options.includeFields.length === 0) {
    warnings.push('No fields specified for export. Using default fields.');
  } else {
    const invalidFields = options.includeFields.filter(
      field => !AVAILABLE_FIELDS.includes(field as typeof AVAILABLE_FIELDS[number])
    );
    if (invalidFields.length > 0) {
      warnings.push(`Unknown fields will be ignored: ${invalidFields.join(', ')}`);
    }
  }

  // Validate date range
  if (options.dateRange) {
    const { start, end } = options.dateRange;

    if (!(start instanceof Date) || isNaN(start.getTime())) {
      errors.push('Invalid start date in date range');
    }

    if (!(end instanceof Date) || isNaN(end.getTime())) {
      errors.push('Invalid end date in date range');
    }

    if (start && end && start > end) {
      errors.push('Start date must be before end date');
    }

    // Warn about very large date ranges
    if (start && end) {
      const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 365) {
        warnings.push(`Large date range (${daysDiff} days) may result in slow exports`);
      }
    }
  }

  // Validate groupBy
  if (options.groupBy && !['student', 'date', 'goal'].includes(options.groupBy)) {
    errors.push(`Invalid groupBy option: ${options.groupBy}. Must be 'student', 'date', or 'goal'`);
  }

  // Format-specific validations
  if (options.format === 'pdf' && options.includeCharts === undefined) {
    warnings.push('Charts not specified for PDF export. Defaulting to false.');
  }

  if (options.format === 'csv' && options.includeCharts) {
    warnings.push('Charts are not supported in CSV format and will be ignored');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Merge user options with defaults
 */
export function mergeExportOptions(options: Partial<ExportOptions>): ExportOptions {
  return {
    ...DEFAULT_EXPORT_OPTIONS,
    ...options,
    includeFields: options.includeFields || DEFAULT_EXPORT_OPTIONS.includeFields || [],
  } as ExportOptions;
}

/**
 * Validate date range is not in the future
 */
export function validateDateRange(dateRange?: { start: Date; end: Date }): boolean {
  if (!dateRange) return true;

  const now = new Date();
  if (dateRange.start > now) {
    return false;
  }
  if (dateRange.end > now) {
    return false;
  }

  return dateRange.start <= dateRange.end;
}

/**
 * Calculate estimated export size in bytes
 */
export function estimateExportSize(
  data: ExportDataCollection,
  options: ExportOptions
): number {
  let estimatedBytes = 0;

  // Base overhead
  estimatedBytes += 1000; // Headers, metadata

  // Per-record estimates
  if (options.includeFields.includes('emotions')) {
    estimatedBytes += data.emotions.length * 200; // ~200 bytes per emotion
  }

  if (options.includeFields.includes('sensoryInputs')) {
    estimatedBytes += data.sensoryInputs.length * 250; // ~250 bytes per sensory input
  }

  if (options.includeFields.includes('goals')) {
    estimatedBytes += data.goals.length * 300; // ~300 bytes per goal
  }

  if (options.includeFields.includes('trackingEntries')) {
    estimatedBytes += data.trackingEntries.length * 500; // ~500 bytes per tracking entry
  }

  if (options.includeFields.includes('students') && data.students) {
    estimatedBytes += data.students.length * 400; // ~400 bytes per student
  }

  // Format-specific multipliers
  if (options.format === 'json') {
    estimatedBytes *= 1.5; // JSON overhead for formatting
  } else if (options.format === 'pdf') {
    estimatedBytes *= 3; // PDF has significant overhead
  }

  return Math.ceil(estimatedBytes);
}

/**
 * Check if export would be too large (>50MB warning threshold)
 */
export function isExportTooLarge(
  data: ExportDataCollection,
  options: ExportOptions
): { tooLarge: boolean; estimatedSize: number; threshold: number } {
  const estimatedSize = estimateExportSize(data, options);
  const threshold = 50 * 1024 * 1024; // 50MB

  return {
    tooLarge: estimatedSize > threshold,
    estimatedSize,
    threshold
  };
}
