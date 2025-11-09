/**
 * Export Common Utilities
 *
 * Shared data collection, transformation, and validation utilities
 * for all export formats (PDF, CSV, JSON).
 *
 * @module export/common
 */

// Export Options and Validation
export {
  type ExportOptions,
  type ExportDataCollection,
  type ExportMetadata,
  type ExportProgress,
  type ValidationResult,
  DEFAULT_EXPORT_OPTIONS,
  AVAILABLE_FIELDS,
  NESTED_FIELD_PATHS,
  validateExportOptions,
  mergeExportOptions,
  validateDateRange,
  estimateExportSize,
  isExportTooLarge
} from './exportOptions';

// Data Collection and Filtering
export {
  type ProgressCallback,
  collectExportData,
  applyDateRangeFilter,
  groupDataBy,
  calculateExportMetadata,
  filterByStudentIds,
  filterStudents,
  getUniqueStudentIds,
  chunkData,
  streamExportData,
  validateCollectedData,
  getDataStatistics
} from './dataCollector';

// Data Transformation and Anonymization
export {
  type AnonymizationOptions,
  anonymizeStudent,
  anonymizeEmotion,
  anonymizeSensory,
  anonymizeGoal,
  anonymizeTracking,
  anonymizeData,
  redactPII,
  selectFields,
  getNestedField,
  setNestedField,
  flattenNestedData,
  enrichWithComputedFields,
  STUDENT_COMPUTED_FIELDS,
  GOAL_COMPUTED_FIELDS,
  EMOTION_COMPUTED_FIELDS,
  transformData,
  transformDataBatched
} from './dataTransformer';
