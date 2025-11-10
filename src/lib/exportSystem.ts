import { Student, TrackingEntry, EmotionEntry, SensoryEntry, Goal } from '@/types/student';
import { format } from 'date-fns';
import { generatePDFReport as generatePDF } from './export/pdf';
import {
  generateCSVExport as generateCSV,
  generateEmotionsCSV as generateEmotionsCSVImpl,
  generateSensoryCSV as generateSensoryCSVImpl,
  generateGoalsCSV as generateGoalsCSVImpl,
  generateTrackingCSV as generateTrackingCSVImpl,
  filterByDateRange,
  type CSVExportOptions,
} from './export/csv';
import {
  JSONExporter,
  BackupSystem,
  type JSONExportOptions,
  type BackupData as BackupDataType,
} from './export/json';
import {
  type ExportOptions as CommonExportOptions,
  type ExportDataCollection as CommonDataCollection,
} from './export/common';

// CSV parsing result
interface CSVParseResult {
  id: string;
  [key: string]: unknown;
}

// Data collections for export
interface ExportDataCollection {
  trackingEntries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  goals: Goal[];
}

export interface ExportOptions {
  format: 'pdf' | 'csv' | 'json';
  includeFields: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  groupBy?: 'student' | 'date' | 'goal';
  includeCharts?: boolean;
  anonymize?: boolean;
}

export interface BackupData {
  version: string;
  timestamp: Date;
  students: Student[];
  trackingEntries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  goals: Goal[];
  metadata: {
    exportedBy: string;
    totalRecords: number;
    dateRange: {
      earliest: Date;
      latest: Date;
    };
  };
}

class ExportSystem {
  private readonly CURRENT_VERSION = '1.0.0';
  private readonly jsonExporter: JSONExporter;
  private readonly backupSystem: BackupSystem;

  constructor() {
    this.jsonExporter = new JSONExporter(this.CURRENT_VERSION);
    this.backupSystem = new BackupSystem(this.CURRENT_VERSION);
  }

  // PDF Generation
  async generatePDFReport(
    student: Student,
    data: {
      trackingEntries: TrackingEntry[];
      emotions: EmotionEntry[];
      sensoryInputs: SensoryEntry[];
      goals: Goal[];
    },
    options: ExportOptions,
  ): Promise<Blob> {
    // Delegate to the focused PDF module
    return generatePDF(student, data, {
      includeCharts: options.includeCharts,
      dateRange: options.dateRange,
    });
  }

  // CSV Export - delegates to extracted CSV module
  generateCSVExport(
    students: Student[],
    allData: {
      trackingEntries: TrackingEntry[];
      emotions: EmotionEntry[];
      sensoryInputs: SensoryEntry[];
      goals: Goal[];
    },
    options: ExportOptions,
  ): string {
    // Convert legacy options to CSV module format
    const csvOptions: CSVExportOptions = {
      includeFields: options.includeFields,
      dateRange: options.dateRange,
      anonymize: options.anonymize,
      groupBy: options.groupBy,
      formatting: {
        includeUtf8Bom: false, // Match legacy behavior
        dateFormat: 'yyyy-MM-dd HH:mm',
      },
    };

    const result = generateCSV(students, allData, csvOptions);
    return result.content;
  }

  // JSON Export - delegates to extracted JSON module
  generateJSONExport(
    students: Student[],
    allData: {
      trackingEntries: TrackingEntry[];
      emotions: EmotionEntry[];
      sensoryInputs: SensoryEntry[];
      goals: Goal[];
    },
    options: ExportOptions,
  ): string {
    // Convert to JSON module format
    const jsonOptions: JSONExportOptions = {
      includeFields: options.includeFields,
      dateRange: options.dateRange,
      anonymize: options.anonymize,
    };

    return this.jsonExporter.generateExport(students, allData, jsonOptions);
  }

  // Backup System - delegates to extracted backup module
  createFullBackup(
    students: Student[],
    allData: {
      trackingEntries: TrackingEntry[];
      emotions: EmotionEntry[];
      sensoryInputs: SensoryEntry[];
      goals: Goal[];
    },
  ): BackupData {
    return this.backupSystem.createBackup(students, allData);
  }

  // Restore from Backup - delegates to extracted backup module
  async restoreFromBackup(backupData: BackupData): Promise<{
    success: boolean;
    errors: string[];
    imported: {
      students: number;
      trackingEntries: number;
      emotions: number;
      sensoryInputs: number;
      goals: number;
    };
  }> {
    return this.backupSystem.restoreBackup(backupData);
  }

  // Import from CSV
  async importFromCSV(
    csvContent: string,
    dataType: 'emotions' | 'sensoryInputs' | 'students',
  ): Promise<{
    success: boolean;
    errors: string[];
    imported: (EmotionEntry | SensoryEntry | Student)[];
  }> {
    const errors: string[] = [];
    const imported: (EmotionEntry | SensoryEntry | Student)[] = [];

    try {
      const lines = csvContent.split('\n').filter((line) => line.trim() !== '');
      if (lines.length < 2) {
        errors.push('CSV file must contain at least a header row and one data row');
        return { success: false, errors, imported };
      }

      const headers = this.parseCSVLine(lines[0]);
      const requiredHeaders = this.getRequiredHeaders(dataType);

      // Validate headers
      const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
      if (missingHeaders.length > 0) {
        errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
        return { success: false, errors, imported };
      }

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = this.parseCSVLine(lines[i]);
          if (values.length !== headers.length) {
            errors.push(`Row ${i + 1}: Column count mismatch`);
            continue;
          }

          const rowData = this.parseCSVRowData(headers, values, dataType);
          if (rowData) {
            imported.push(rowData);
          }
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
        }
      }

      return {
        success: imported.length > 0,
        errors,
        imported,
      };
    } catch (error) {
      errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, errors, imported };
    }
  }

  // Helper Methods for CSV Import (kept for backward compatibility)

  private getRequiredHeaders(dataType: string): string[] {
    const headerMap = {
      emotions: ['Date', 'Emotion', 'Intensity'],
      sensoryInputs: ['Date', 'Sensory Type', 'Response', 'Intensity'],
      students: ['Name', 'Grade'],
    };
    return headerMap[dataType as keyof typeof headerMap] || [];
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  private parseCSVRowData(
    headers: string[],
    values: string[],
    dataType: string,
  ): EmotionEntry | SensoryEntry | Student | null {
    const data: Record<string, string> = {};
    headers.forEach((header, index) => {
      data[header] = values[index];
    });

    // Basic data type conversion and validation
    switch (dataType) {
      case 'emotions':
        return {
          id: crypto.randomUUID(),
          emotion: data.Emotion,
          intensity: parseInt(data.Intensity) || 0,
          timestamp: new Date(data.Date),
          studentId: '', // Would need to be mapped
          triggers: data.Triggers ? data.Triggers.split(';') : [],
          notes: data.Notes || '',
        };
      case 'sensoryInputs':
        return {
          id: crypto.randomUUID(),
          sensoryType: data['Sensory Type'],
          response: data.Response,
          intensity: parseInt(data.Intensity) || 0,
          timestamp: new Date(data.Date),
          studentId: '', // Would need to be mapped
          context: data.Context || '',
          notes: data.Notes || '',
        };
      case 'students':
        return {
          id: crypto.randomUUID(),
          name: data.Name,
          grade: data.Grade,
          createdAt: new Date(),
          goals: [],
          baselineData: {
            emotionalRegulation: 5,
            sensoryProcessing: 5,
            environmentalPreferences: {},
          },
        };
      default:
        return null;
    }
  }
}

export const exportSystem = new ExportSystem();
