import { Student, TrackingEntry, EmotionEntry, SensoryEntry, Goal } from "@/types/student";

/**
 * Options for JSON export
 */
export interface JSONExportOptions {
  includeFields: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  anonymize?: boolean;
  prettyPrint?: boolean;
}

/**
 * JSON export data structure
 */
export interface JSONExportData {
  version: string;
  exportDate: string;
  options: JSONExportOptions;
  data: {
    students?: Student[];
    emotions?: EmotionEntry[];
    sensoryInputs?: SensoryEntry[];
    goals?: Goal[];
    trackingEntries?: TrackingEntry[];
  };
}

/**
 * All data collections for export
 */
export interface ExportDataCollection {
  trackingEntries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  goals: Goal[];
}

/**
 * JSON Exporter - handles selective JSON export with filtering and anonymization
 */
export class JSONExporter {
  private readonly CURRENT_VERSION = '1.0.0';

  /**
   * Generate JSON export with selective fields and optional anonymization
   */
  generateJSONExport(
    students: Student[],
    allData: ExportDataCollection,
    options: JSONExportOptions
  ): string {
    const { includeFields, dateRange, anonymize, prettyPrint = true } = options;

    const exportData: JSONExportData = {
      version: this.CURRENT_VERSION,
      exportDate: new Date().toISOString(),
      options,
      data: {}
    };

    // Include students if requested
    if (includeFields.includes('students')) {
      exportData.data.students = anonymize
        ? students.map(s => this.anonymizeStudent(s))
        : students;
    }

    // Include emotions if requested
    if (includeFields.includes('emotions')) {
      const emotionData = this.filterByDateRange(allData.emotions, dateRange);
      exportData.data.emotions = anonymize
        ? emotionData.map(e => this.anonymizeEmotion(e))
        : emotionData;
    }

    // Include sensory inputs if requested
    if (includeFields.includes('sensoryInputs')) {
      const sensoryData = this.filterByDateRange(allData.sensoryInputs, dateRange);
      exportData.data.sensoryInputs = anonymize
        ? sensoryData.map(s => this.anonymizeSensory(s))
        : sensoryData;
    }

    // Include goals if requested
    if (includeFields.includes('goals')) {
      exportData.data.goals = anonymize
        ? allData.goals.map(g => this.anonymizeGoal(g))
        : allData.goals;
    }

    // Include tracking entries if requested
    if (includeFields.includes('trackingEntries')) {
      const trackingData = this.filterByDateRange(allData.trackingEntries, dateRange);
      exportData.data.trackingEntries = anonymize
        ? trackingData.map(t => this.anonymizeTracking(t))
        : trackingData;
    }

    // Return formatted JSON
    return prettyPrint
      ? JSON.stringify(exportData, null, 2)
      : JSON.stringify(exportData);
  }

  /**
   * Generate JSON export for a single student
   */
  generateStudentJSONExport(
    student: Student,
    data: ExportDataCollection,
    options: Omit<JSONExportOptions, 'includeFields'>
  ): string {
    const studentData: ExportDataCollection = {
      trackingEntries: data.trackingEntries.filter(t => t.studentId === student.id),
      emotions: data.emotions.filter(e => e.studentId === student.id),
      sensoryInputs: data.sensoryInputs.filter(s => s.studentId === student.id),
      goals: data.goals.filter(g => g.studentId === student.id)
    };

    return this.generateJSONExport(
      [student],
      studentData,
      {
        ...options,
        includeFields: ['students', 'emotions', 'sensoryInputs', 'goals', 'trackingEntries']
      }
    );
  }

  /**
   * Parse and validate JSON export data
   */
  parseJSONExport(jsonString: string): JSONExportData | null {
    try {
      const data = JSON.parse(jsonString);

      // Validate structure
      if (!data.version || !data.exportDate || !data.data) {
        throw new Error('Invalid JSON export format');
      }

      // Convert date strings back to Date objects
      if (data.data.emotions) {
        data.data.emotions = data.data.emotions.map((e: EmotionEntry) => ({
          ...e,
          timestamp: new Date(e.timestamp)
        }));
      }

      if (data.data.sensoryInputs) {
        data.data.sensoryInputs = data.data.sensoryInputs.map((s: SensoryEntry) => ({
          ...s,
          timestamp: new Date(s.timestamp)
        }));
      }

      if (data.data.trackingEntries) {
        data.data.trackingEntries = data.data.trackingEntries.map((t: TrackingEntry) => ({
          ...t,
          timestamp: new Date(t.timestamp)
        }));
      }

      if (data.data.goals) {
        data.data.goals = data.data.goals.map((g: Goal) => ({
          ...g,
          createdDate: new Date(g.createdDate),
          targetDate: g.targetDate ? new Date(g.targetDate) : undefined,
          dataPoints: g.dataPoints?.map(dp => ({
            ...dp,
            date: new Date(dp.date)
          }))
        }));
      }

      if (data.data.students) {
        data.data.students = data.data.students.map((s: Student) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth) : undefined
        }));
      }

      return data as JSONExportData;
    } catch (error) {
      // logger.error('Failed to parse JSON export:', error);
      return null;
    }
  }

  // Private Helper Methods

  /**
   * Filter data by date range
   */
  private filterByDateRange<T extends { timestamp: Date }>(
    data: T[],
    dateRange?: { start: Date; end: Date }
  ): T[] {
    if (!dateRange) return data;
    return data.filter(item =>
      item.timestamp >= dateRange.start && item.timestamp <= dateRange.end
    );
  }

  /**
   * Anonymize student data
   */
  private anonymizeStudent(student: Student): Student {
    return {
      ...student,
      name: `Student_${student.id.slice(-4)}`,
      dateOfBirth: undefined
    };
  }

  /**
   * Anonymize emotion entry
   */
  private anonymizeEmotion(emotion: EmotionEntry): EmotionEntry {
    return {
      ...emotion,
      studentId: emotion.studentId.slice(-4),
      notes: emotion.notes ? '[REDACTED]' : ''
    };
  }

  /**
   * Anonymize sensory entry
   */
  private anonymizeSensory(sensory: SensoryEntry): SensoryEntry {
    return {
      ...sensory,
      studentId: sensory.studentId.slice(-4),
      notes: sensory.notes ? '[REDACTED]' : '',
      context: sensory.context ? '[REDACTED]' : ''
    };
  }

  /**
   * Anonymize goal
   */
  private anonymizeGoal(goal: Goal): Goal {
    return {
      ...goal,
      studentId: goal.studentId.slice(-4),
      description: '[REDACTED]'
    };
  }

  /**
   * Anonymize tracking entry
   */
  private anonymizeTracking(tracking: TrackingEntry): TrackingEntry {
    return {
      ...tracking,
      studentId: tracking.studentId.slice(-4),
      environmentalData: tracking.environmentalData ? {
        ...tracking.environmentalData,
        notes: '[REDACTED]'
      } : undefined
    };
  }
}

// Export singleton instance
export const jsonExporter = new JSONExporter();
