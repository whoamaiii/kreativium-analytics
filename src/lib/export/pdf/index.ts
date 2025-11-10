/**
 * PDF Report Generation Module
 *
 * Focused module for generating PDF reports from student tracking data.
 *
 * @module export/pdf
 *
 * Features:
 * - Pure functions with dependency injection
 * - No singleton dependencies
 * - Support for custom templates (via HTML generation)
 * - Error handling for PDF generation failures
 * - Progress tracking support
 * - Streaming for large reports (via progress callbacks)
 *
 * @example
 * ```typescript
 * import { generatePDFReport } from '@/lib/export/pdf';
 *
 * const blob = await generatePDFReport(student, data, {
 *   includeCharts: true,
 *   dateRange: { start, end },
 *   onProgress: (stage, percent) => updateUI(stage, percent)
 * });
 * ```
 */

// Main generator functions
export {
  generatePDFReport,
  generatePDFReportWithMetadata,
  validateReportData,
  type ProgressCallback,
  type PDFGenerationOptions,
  type PDFGenerationResult,
} from './pdfGenerator';

// Report building functions
export {
  buildReportContent,
  analyzeEmotionsForReport,
  analyzeSensoryForReport,
  analyzeGoalsForReport,
  generateRecommendations,
} from './reportBuilder';

// HTML formatting functions
export { generateHTMLReport } from './htmlFormatter';

// Type definitions
export type { ReportContent, ReportDataCollection, PDFReportOptions, ReportContext } from './types';
