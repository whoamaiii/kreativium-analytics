/**
 * CSV Export Module
 * Production-ready CSV generation and formatting
 * RFC 4180 compliant
 */

// Export generator functions
export {
  generateCSVExport,
  generateEmotionsCSV,
  generateSensoryCSV,
  generateGoalsCSV,
  generateTrackingCSV,
  generateMultiSectionCSV,
  generateGroupedCSV,
  generateCSVHeader,
  generateCSVRow,
  type CSVExportOptions,
  type CSVGenerationResult,
} from './csvGenerator';

// Export formatter utilities
export {
  escapeCSVValue,
  formatDate,
  formatArray,
  flattenObject,
  selectFields,
  generateUtf8Bom,
  anonymizeStudentName,
  anonymizeStudent,
  anonymizeEmotion,
  anonymizeSensory,
  anonymizeGoal,
  anonymizeTracking,
  filterByDateRange,
  groupBy,
  mapColumnNames,
  getGoalCurrentProgress,
  calculateGoalProgress,
  type CSVFormattingOptions,
  type FieldSelectionOptions,
  type AnonymizationOptions,
} from './csvFormatter';
