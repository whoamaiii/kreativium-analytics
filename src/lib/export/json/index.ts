/**
 * JSON Export and Backup System
 *
 * This module provides focused functionality for:
 * - JSON export with selective fields and anonymization
 * - Full backup creation and restoration
 * - Version management and data validation
 */

// JSON Exporter
export {
  JSONExporter,
  jsonExporter,
  type JSONExportOptions,
  type JSONExportData,
  type ExportDataCollection,
} from './jsonExporter';

// Backup System
export {
  BackupSystem,
  backupSystem,
  type BackupData,
  type BackupMetadata,
  type RestoreResult,
  type VersionInfo,
} from './backupSystem';
