/**
 * PDF Report Generator
 *
 * Main entry point for PDF report generation.
 * Orchestrates content building and HTML formatting.
 */

import type { Student } from "@/types/student";
import type { ReportDataCollection, PDFReportOptions } from "./types";
import { buildReportContent } from "./reportBuilder";
import { generateHTMLReport } from "./htmlFormatter";

/**
 * Progress callback for streaming support
 */
export type ProgressCallback = (stage: string, percent: number) => void;

/**
 * Options for PDF generation with progress tracking
 */
export interface PDFGenerationOptions extends PDFReportOptions {
  onProgress?: ProgressCallback;
}

/**
 * Result of PDF generation
 */
export interface PDFGenerationResult {
  blob: Blob;
  metadata: {
    student: string;
    dateRange: string;
    generatedAt: Date;
    pageCount: number;
  };
}

/**
 * Generates a PDF report for a student
 *
 * Pure function approach - all dependencies are injected.
 * Returns an HTML blob that can be printed to PDF by the browser.
 *
 * @param student - Student information
 * @param data - Collection of tracking data
 * @param options - Report generation options
 * @returns Promise resolving to Blob containing HTML report
 *
 * @example
 * ```typescript
 * const result = await generatePDFReport(student, data, {
 *   includeCharts: true,
 *   dateRange: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
 *   onProgress: (stage, percent) => console.log(`${stage}: ${percent}%`)
 * });
 *
 * // Download the report
 * const url = URL.createObjectURL(result.blob);
 * const link = document.createElement('a');
 * link.href = url;
 * link.download = `report-${student.name}.html`;
 * link.click();
 * ```
 */
export async function generatePDFReport(
  student: Student,
  data: ReportDataCollection,
  options: PDFGenerationOptions = {}
): Promise<Blob> {
  const { onProgress } = options;

  try {
    // Step 1: Build report content structure
    onProgress?.('Building report content', 30);
    const reportContent = buildReportContent(student, data, options);

    // Step 2: Generate HTML from content
    onProgress?.('Formatting report', 60);
    const htmlContent = generateHTMLReport(reportContent, options);

    // Step 3: Create blob
    onProgress?.('Finalizing report', 90);
    const blob = new Blob([htmlContent], { type: 'text/html' });

    onProgress?.('Complete', 100);
    return blob;

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`PDF generation failed: ${message}`);
  }
}

/**
 * Generates a PDF report with metadata
 *
 * Enhanced version that returns additional metadata about the generated report.
 *
 * @param student - Student information
 * @param data - Collection of tracking data
 * @param options - Report generation options
 * @returns Promise resolving to generation result with metadata
 */
export async function generatePDFReportWithMetadata(
  student: Student,
  data: ReportDataCollection,
  options: PDFGenerationOptions = {}
): Promise<PDFGenerationResult> {
  const blob = await generatePDFReport(student, data, options);

  const dateRange = options.dateRange
    ? `${options.dateRange.start.toLocaleDateString()} - ${options.dateRange.end.toLocaleDateString()}`
    : 'All time';

  return {
    blob,
    metadata: {
      student: student.name,
      dateRange,
      generatedAt: new Date(),
      pageCount: 1 // Estimated, actual page count depends on print settings
    }
  };
}

/**
 * Validates report data before generation
 *
 * @param student - Student information
 * @param data - Collection of tracking data
 * @returns Validation result with any errors
 */
export function validateReportData(
  student: Student,
  data: ReportDataCollection
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!student?.id) {
    errors.push('Student ID is required');
  }

  if (!student?.name) {
    errors.push('Student name is required');
  }

  if (!data) {
    errors.push('Report data is required');
  } else {
    if (!Array.isArray(data.trackingEntries)) {
      errors.push('Invalid tracking entries data');
    }
    if (!Array.isArray(data.emotions)) {
      errors.push('Invalid emotions data');
    }
    if (!Array.isArray(data.sensoryInputs)) {
      errors.push('Invalid sensory inputs data');
    }
    if (!Array.isArray(data.goals)) {
      errors.push('Invalid goals data');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
