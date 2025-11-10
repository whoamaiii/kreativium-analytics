import { Student, TrackingEntry, EmotionEntry, SensoryEntry, Goal } from '@/types/student';

/**
 * Backup metadata
 */
export interface BackupMetadata {
  exportedBy: string;
  totalRecords: number;
  dateRange: {
    earliest: Date;
    latest: Date;
  };
  compressionUsed?: boolean;
  checksum?: string;
}

/**
 * Full backup data structure
 */
export interface BackupData {
  version: string;
  timestamp: Date;
  students: Student[];
  trackingEntries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  goals: Goal[];
  metadata: BackupMetadata;
}

/**
 * Backup validation result
 */
interface BackupValidationResult {
  validStudents: Student[];
  validTrackingEntries: TrackingEntry[];
  validEmotions: EmotionEntry[];
  validSensoryInputs: SensoryEntry[];
  validGoals: Goal[];
  errors: string[];
}

/**
 * Restore result
 */
export interface RestoreResult {
  success: boolean;
  errors: string[];
  imported: {
    students: number;
    trackingEntries: number;
    emotions: number;
    sensoryInputs: number;
    goals: number;
  };
}

/**
 * Version information
 */
export interface VersionInfo {
  current: string;
  backup: string;
  compatible: boolean;
  requiresMigration: boolean;
}

/**
 * Backup System - handles full data backups and restoration
 */
export class BackupSystem {
  private readonly CURRENT_VERSION = '1.0.0';
  private readonly COMPATIBLE_VERSIONS = ['1.0.0'];

  /**
   * Create a full backup of all data
   */
  createFullBackup(
    students: Student[],
    allData: {
      trackingEntries: TrackingEntry[];
      emotions: EmotionEntry[];
      sensoryInputs: SensoryEntry[];
      goals: Goal[];
    },
  ): BackupData {
    // Collect all timestamps to determine date range
    const dates = [
      ...allData.trackingEntries.map((t) => t.timestamp),
      ...allData.emotions.map((e) => e.timestamp),
      ...allData.sensoryInputs.map((s) => s.timestamp),
    ].sort((a, b) => a.getTime() - b.getTime());

    // Calculate total records
    const totalRecords =
      allData.trackingEntries.length +
      allData.emotions.length +
      allData.sensoryInputs.length +
      allData.goals.length;

    return {
      version: this.CURRENT_VERSION,
      timestamp: new Date(),
      students,
      trackingEntries: allData.trackingEntries,
      emotions: allData.emotions,
      sensoryInputs: allData.sensoryInputs,
      goals: allData.goals,
      metadata: {
        exportedBy: 'Kreativium',
        totalRecords,
        dateRange: {
          earliest: dates[0] || new Date(),
          latest: dates[dates.length - 1] || new Date(),
        },
      },
    };
  }

  /**
   * Create a backup for a specific student
   */
  createStudentBackup(
    student: Student,
    allData: {
      trackingEntries: TrackingEntry[];
      emotions: EmotionEntry[];
      sensoryInputs: SensoryEntry[];
      goals: Goal[];
    },
  ): BackupData {
    // Filter data for this student only
    const studentData = {
      trackingEntries: allData.trackingEntries.filter((t) => t.studentId === student.id),
      emotions: allData.emotions.filter((e) => e.studentId === student.id),
      sensoryInputs: allData.sensoryInputs.filter((s) => s.studentId === student.id),
      goals: allData.goals.filter((g) => g.studentId === student.id),
    };

    return this.createFullBackup([student], studentData);
  }

  /**
   * Create an incremental backup (only new/modified data since last backup)
   * Note: This is a placeholder for future implementation
   */
  createIncrementalBackup(
    lastBackupTimestamp: Date,
    students: Student[],
    allData: {
      trackingEntries: TrackingEntry[];
      emotions: EmotionEntry[];
      sensoryInputs: SensoryEntry[];
      goals: Goal[];
    },
  ): BackupData {
    // Filter for data created/modified after last backup
    const incrementalData = {
      trackingEntries: allData.trackingEntries.filter((t) => t.timestamp > lastBackupTimestamp),
      emotions: allData.emotions.filter((e) => e.timestamp > lastBackupTimestamp),
      sensoryInputs: allData.sensoryInputs.filter((s) => s.timestamp > lastBackupTimestamp),
      goals: allData.goals.filter((g) => g.createdDate > lastBackupTimestamp),
    };

    // Filter students that have new data
    const affectedStudentIds = new Set([
      ...incrementalData.trackingEntries.map((t) => t.studentId),
      ...incrementalData.emotions.map((e) => e.studentId),
      ...incrementalData.sensoryInputs.map((s) => s.studentId),
      ...incrementalData.goals.map((g) => g.studentId),
    ]);

    const affectedStudents = students.filter((s) => affectedStudentIds.has(s.id));

    return this.createFullBackup(affectedStudents, incrementalData);
  }

  /**
   * Serialize backup to JSON string
   */
  serializeBackup(backup: BackupData, prettyPrint: boolean = true): string {
    return prettyPrint ? JSON.stringify(backup, null, 2) : JSON.stringify(backup);
  }

  /**
   * Deserialize backup from JSON string
   */
  deserializeBackup(jsonString: string): BackupData | null {
    try {
      const data = JSON.parse(jsonString);

      // Convert date strings back to Date objects
      return {
        ...data,
        timestamp: new Date(data.timestamp),
        students: data.students.map((s: Student) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth) : undefined,
        })),
        trackingEntries: data.trackingEntries.map((t: TrackingEntry) => ({
          ...t,
          timestamp: new Date(t.timestamp),
        })),
        emotions: data.emotions.map((e: EmotionEntry) => ({
          ...e,
          timestamp: new Date(e.timestamp),
        })),
        sensoryInputs: data.sensoryInputs.map((s: SensoryEntry) => ({
          ...s,
          timestamp: new Date(s.timestamp),
        })),
        goals: data.goals.map((g: Goal) => ({
          ...g,
          createdDate: new Date(g.createdDate),
          targetDate: g.targetDate ? new Date(g.targetDate) : undefined,
          dataPoints: g.dataPoints?.map((dp) => ({
            ...dp,
            date: new Date(dp.date),
          })),
        })),
        metadata: {
          ...data.metadata,
          dateRange: {
            earliest: new Date(data.metadata.dateRange.earliest),
            latest: new Date(data.metadata.dateRange.latest),
          },
        },
      };
    } catch (error) {
      // logger.error('Failed to deserialize backup:', error);
      return null;
    }
  }

  /**
   * Restore from backup with validation
   */
  async restoreFromBackup(backupData: BackupData): Promise<RestoreResult> {
    const errors: string[] = [];
    const imported = {
      students: 0,
      trackingEntries: 0,
      emotions: 0,
      sensoryInputs: 0,
      goals: 0,
    };

    try {
      // Validate backup version compatibility
      if (!this.isVersionCompatible(backupData.version)) {
        errors.push(
          `Backup version ${backupData.version} is not compatible with current version ${this.CURRENT_VERSION}`,
        );
        return { success: false, errors, imported };
      }

      // Validate backup data
      const validationResults = await this.validateBackupData(backupData);
      if (validationResults.errors.length > 0) {
        errors.push(...validationResults.errors);
      }

      // Count valid imported data
      imported.students = validationResults.validStudents.length;
      imported.trackingEntries = validationResults.validTrackingEntries.length;
      imported.emotions = validationResults.validEmotions.length;
      imported.sensoryInputs = validationResults.validSensoryInputs.length;
      imported.goals = validationResults.validGoals.length;

      // Note: Actual data restoration would be handled by the caller
      // This function only validates and returns what can be imported

      return {
        success: errors.length === 0 && imported.students > 0,
        errors,
        imported,
      };
    } catch (error) {
      errors.push(`Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, errors, imported };
    }
  }

  /**
   * Check version compatibility
   */
  isVersionCompatible(version: string): boolean {
    return this.COMPATIBLE_VERSIONS.includes(version);
  }

  /**
   * Get version information for a backup
   */
  getVersionInfo(backupData: BackupData): VersionInfo {
    const compatible = this.isVersionCompatible(backupData.version);
    const requiresMigration = !compatible && this.canMigrate(backupData.version);

    return {
      current: this.CURRENT_VERSION,
      backup: backupData.version,
      compatible,
      requiresMigration,
    };
  }

  /**
   * Check if a version can be migrated to current
   */
  private canMigrate(version: string): boolean {
    // For now, we only support migration from 1.0.0 to 1.0.0
    // In the future, this would check migration paths
    const [major] = version.split('.').map(Number);
    const [currentMajor] = this.CURRENT_VERSION.split('.').map(Number);
    return major <= currentMajor;
  }

  /**
   * Validate backup data integrity
   */
  private async validateBackupData(backupData: BackupData): Promise<BackupValidationResult> {
    const errors: string[] = [];

    // Validate students
    const validStudents = this.validateStudents(backupData.students, errors);

    // Validate tracking entries
    const validTrackingEntries = this.validateTrackingEntries(
      backupData.trackingEntries,
      validStudents,
      errors,
    );

    // Validate emotions
    const validEmotions = this.validateEmotions(backupData.emotions, validStudents, errors);

    // Validate sensory inputs
    const validSensoryInputs = this.validateSensoryInputs(
      backupData.sensoryInputs,
      validStudents,
      errors,
    );

    // Validate goals
    const validGoals = this.validateGoals(backupData.goals, validStudents, errors);

    return {
      validStudents,
      validTrackingEntries,
      validEmotions,
      validSensoryInputs,
      validGoals,
      errors,
    };
  }

  /**
   * Validate student records
   */
  private validateStudents(students: Student[], errors: string[]): Student[] {
    const valid: Student[] = [];

    students.forEach((student, index) => {
      if (!student.id) {
        errors.push(`Student ${index}: Missing ID`);
        return;
      }
      if (!student.name) {
        errors.push(`Student ${student.id}: Missing name`);
        return;
      }
      if (!student.createdAt) {
        errors.push(`Student ${student.id}: Missing creation date`);
        return;
      }
      valid.push(student);
    });

    return valid;
  }

  /**
   * Validate tracking entries
   */
  private validateTrackingEntries(
    entries: TrackingEntry[],
    validStudents: Student[],
    errors: string[],
  ): TrackingEntry[] {
    const valid: TrackingEntry[] = [];
    const studentIds = new Set(validStudents.map((s) => s.id));

    entries.forEach((entry, index) => {
      if (!entry.id) {
        errors.push(`Tracking entry ${index}: Missing ID`);
        return;
      }
      if (!entry.studentId || !studentIds.has(entry.studentId)) {
        errors.push(`Tracking entry ${entry.id}: Invalid or missing student ID`);
        return;
      }
      if (!entry.timestamp) {
        errors.push(`Tracking entry ${entry.id}: Missing timestamp`);
        return;
      }
      valid.push(entry);
    });

    return valid;
  }

  /**
   * Validate emotion entries
   */
  private validateEmotions(
    emotions: EmotionEntry[],
    validStudents: Student[],
    errors: string[],
  ): EmotionEntry[] {
    const valid: EmotionEntry[] = [];
    const studentIds = new Set(validStudents.map((s) => s.id));

    emotions.forEach((emotion, index) => {
      if (!emotion.id) {
        errors.push(`Emotion ${index}: Missing ID`);
        return;
      }
      if (!emotion.studentId || !studentIds.has(emotion.studentId)) {
        errors.push(`Emotion ${emotion.id}: Invalid or missing student ID`);
        return;
      }
      if (!emotion.emotion) {
        errors.push(`Emotion ${emotion.id}: Missing emotion type`);
        return;
      }
      if (emotion.intensity < 0 || emotion.intensity > 10) {
        errors.push(`Emotion ${emotion.id}: Invalid intensity value`);
        return;
      }
      valid.push(emotion);
    });

    return valid;
  }

  /**
   * Validate sensory entries
   */
  private validateSensoryInputs(
    sensoryInputs: SensoryEntry[],
    validStudents: Student[],
    errors: string[],
  ): SensoryEntry[] {
    const valid: SensoryEntry[] = [];
    const studentIds = new Set(validStudents.map((s) => s.id));

    sensoryInputs.forEach((sensory, index) => {
      if (!sensory.id) {
        errors.push(`Sensory input ${index}: Missing ID`);
        return;
      }
      if (!sensory.studentId || !studentIds.has(sensory.studentId)) {
        errors.push(`Sensory input ${sensory.id}: Invalid or missing student ID`);
        return;
      }
      if (!sensory.sensoryType) {
        errors.push(`Sensory input ${sensory.id}: Missing sensory type`);
        return;
      }
      if (!sensory.response) {
        errors.push(`Sensory input ${sensory.id}: Missing response`);
        return;
      }
      valid.push(sensory);
    });

    return valid;
  }

  /**
   * Validate goal entries
   */
  private validateGoals(goals: Goal[], validStudents: Student[], errors: string[]): Goal[] {
    const valid: Goal[] = [];
    const studentIds = new Set(validStudents.map((s) => s.id));

    goals.forEach((goal, index) => {
      if (!goal.id) {
        errors.push(`Goal ${index}: Missing ID`);
        return;
      }
      if (!goal.studentId || !studentIds.has(goal.studentId)) {
        errors.push(`Goal ${goal.id}: Invalid or missing student ID`);
        return;
      }
      if (!goal.title) {
        errors.push(`Goal ${goal.id}: Missing title`);
        return;
      }
      if (!goal.targetValue || goal.targetValue <= 0) {
        errors.push(`Goal ${goal.id}: Invalid target value`);
        return;
      }
      valid.push(goal);
    });

    return valid;
  }

  /**
   * Calculate backup size estimate in bytes
   */
  estimateBackupSize(backup: BackupData): number {
    return new Blob([this.serializeBackup(backup, false)]).size;
  }

  /**
   * Get backup statistics
   */
  getBackupStats(backup: BackupData) {
    return {
      version: backup.version,
      timestamp: backup.timestamp,
      students: backup.students.length,
      trackingEntries: backup.trackingEntries.length,
      emotions: backup.emotions.length,
      sensoryInputs: backup.sensoryInputs.length,
      goals: backup.goals.length,
      totalRecords: backup.metadata.totalRecords,
      dateRange: backup.metadata.dateRange,
      estimatedSize: this.estimateBackupSize(backup),
    };
  }
}

// Export singleton instance
export const backupSystem = new BackupSystem();
