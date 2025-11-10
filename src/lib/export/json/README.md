# JSON Export and Backup System

This module provides focused functionality for JSON export and backup/restore operations with data
integrity and version management.

## Architecture

```
src/lib/export/json/
├── jsonExporter.ts    - Selective JSON export with anonymization
├── backupSystem.ts    - Full backup creation and restoration
├── index.ts           - Module exports
└── README.md          - Documentation and usage examples
```

## Modules

### 1. JSON Exporter (`jsonExporter.ts`)

**Purpose**: Handle selective JSON export with filtering, anonymization, and pretty-printing.

**Key Features**:

- Selective field export (students, emotions, sensoryInputs, goals, trackingEntries)
- Date range filtering
- Data anonymization
- Pretty-print formatting
- Single student export
- JSON parsing with date conversion

**Main Functions**:

```typescript
// Generate JSON export with selective fields
generateJSONExport(
  students: Student[],
  allData: ExportDataCollection,
  options: JSONExportOptions
): string

// Generate JSON export for a single student
generateStudentJSONExport(
  student: Student,
  data: ExportDataCollection,
  options: Omit<JSONExportOptions, 'includeFields'>
): string

// Parse and validate JSON export data
parseJSONExport(jsonString: string): JSONExportData | null
```

### 2. Backup System (`backupSystem.ts`)

**Purpose**: Handle full data backups and restoration with validation and version management.

**Key Features**:

- Full backup creation
- Student-specific backups
- Incremental backup support (future)
- Version compatibility checking
- Comprehensive data validation
- Backup statistics and size estimation
- JSON serialization/deserialization with date handling

**Main Functions**:

```typescript
// Create full backup of all data
createFullBackup(
  students: Student[],
  allData: ExportDataCollection
): BackupData

// Create backup for a specific student
createStudentBackup(
  student: Student,
  allData: ExportDataCollection
): BackupData

// Create incremental backup (new data since last backup)
createIncrementalBackup(
  lastBackupTimestamp: Date,
  students: Student[],
  allData: ExportDataCollection
): BackupData

// Restore from backup with validation
restoreFromBackup(backupData: BackupData): Promise<RestoreResult>

// Check version compatibility
isVersionCompatible(version: string): boolean

// Get version information
getVersionInfo(backupData: BackupData): VersionInfo

// Serialize/deserialize backup
serializeBackup(backup: BackupData, prettyPrint?: boolean): string
deserializeBackup(jsonString: string): BackupData | null

// Get backup statistics
getBackupStats(backup: BackupData): BackupStats
```

## Data Structures

### BackupData

```typescript
interface BackupData {
  version: string; // Schema version (e.g., "1.0.0")
  timestamp: Date; // Backup creation time
  students: Student[]; // Student records
  trackingEntries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  goals: Goal[];
  metadata: BackupMetadata; // Backup metadata
}
```

### BackupMetadata

```typescript
interface BackupMetadata {
  exportedBy: string; // System identifier
  totalRecords: number; // Total count of all records
  dateRange: {
    earliest: Date; // Earliest data point
    latest: Date; // Latest data point
  };
  compressionUsed?: boolean; // Future: compression flag
  checksum?: string; // Future: data integrity check
}
```

### JSONExportData

```typescript
interface JSONExportData {
  version: string; // Export schema version
  exportDate: string; // ISO date string
  options: JSONExportOptions; // Export options used
  data: {
    students?: Student[];
    emotions?: EmotionEntry[];
    sensoryInputs?: SensoryEntry[];
    goals?: Goal[];
    trackingEntries?: TrackingEntry[];
  };
}
```

## Usage Examples

### Basic JSON Export

```typescript
import { jsonExporter } from '@/lib/export/json';

// Export all data with specific fields
const jsonString = jsonExporter.generateJSONExport(
  students,
  {
    trackingEntries,
    emotions,
    sensoryInputs,
    goals,
  },
  {
    includeFields: ['students', 'emotions', 'sensoryInputs'],
    prettyPrint: true,
  },
);

// Download the JSON file
const blob = new Blob([jsonString], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'export.json';
link.click();
```

### JSON Export with Date Range and Anonymization

```typescript
import { jsonExporter } from '@/lib/export/json';

const jsonString = jsonExporter.generateJSONExport(students, allData, {
  includeFields: ['emotions', 'sensoryInputs', 'goals'],
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31'),
  },
  anonymize: true, // Anonymize student data
  prettyPrint: true,
});
```

### Single Student Export

```typescript
import { jsonExporter } from '@/lib/export/json';

const student = students.find((s) => s.id === studentId);
if (student) {
  const jsonString = jsonExporter.generateStudentJSONExport(student, allData, {
    anonymize: false,
    prettyPrint: true,
  });
}
```

### Create Full Backup

```typescript
import { backupSystem } from '@/lib/export/json';

// Create full backup
const backup = backupSystem.createFullBackup(students, {
  trackingEntries,
  emotions,
  sensoryInputs,
  goals,
});

// Serialize to JSON
const backupJson = backupSystem.serializeBackup(backup, true);

// Download backup file
const blob = new Blob([backupJson], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = `backup-${new Date().toISOString()}.json`;
link.click();
```

### Create Student-Specific Backup

```typescript
import { backupSystem } from '@/lib/export/json';

const student = students.find((s) => s.id === studentId);
if (student) {
  const backup = backupSystem.createStudentBackup(student, allData);
  const backupJson = backupSystem.serializeBackup(backup);
}
```

### Restore from Backup

```typescript
import { backupSystem } from '@/lib/export/json';

// Read backup file (from file input)
const file = event.target.files[0];
const jsonString = await file.text();

// Deserialize backup
const backup = backupSystem.deserializeBackup(jsonString);
if (!backup) {
  console.error('Invalid backup file');
  return;
}

// Check version compatibility
const versionInfo = backupSystem.getVersionInfo(backup);
if (!versionInfo.compatible) {
  console.error(`Incompatible version: ${versionInfo.backup}`);
  if (versionInfo.requiresMigration) {
    console.log('Migration required but not yet implemented');
  }
  return;
}

// Restore the backup
const result = await backupSystem.restoreFromBackup(backup);

if (result.success) {
  console.log('Backup restored successfully:', result.imported);
  // Update application state with backup data
  // backup.students, backup.trackingEntries, etc.
} else {
  console.error('Restore failed:', result.errors);
}
```

### Get Backup Statistics

```typescript
import { backupSystem } from '@/lib/export/json';

const backup = backupSystem.createFullBackup(students, allData);
const stats = backupSystem.getBackupStats(backup);

console.log('Backup Statistics:', {
  version: stats.version,
  timestamp: stats.timestamp,
  students: stats.students,
  totalRecords: stats.totalRecords,
  dateRange: stats.dateRange,
  estimatedSize: `${(stats.estimatedSize / 1024).toFixed(2)} KB`,
});
```

### Incremental Backup (Future Feature)

```typescript
import { backupSystem } from '@/lib/export/json';

// Get timestamp of last backup
const lastBackupTime = new Date('2024-11-01T00:00:00Z');

// Create incremental backup
const incrementalBackup = backupSystem.createIncrementalBackup(lastBackupTime, students, allData);

console.log(`Incremental backup contains ${incrementalBackup.metadata.totalRecords} new records`);
```

## Validation Rules

The backup system validates all data before restoration:

### Student Validation

- Must have valid `id`
- Must have `name`
- Must have `createdAt` date

### Tracking Entry Validation

- Must have valid `id`
- Must reference existing student ID
- Must have valid `timestamp`

### Emotion Entry Validation

- Must have valid `id`
- Must reference existing student ID
- Must have `emotion` type
- Intensity must be between 0-10

### Sensory Entry Validation

- Must have valid `id`
- Must reference existing student ID
- Must have `sensoryType`
- Must have `response`

### Goal Validation

- Must have valid `id`
- Must reference existing student ID
- Must have `title`
- Must have valid `targetValue` > 0

## Version Management

### Current Version

- **1.0.0** - Initial schema version

### Version Compatibility

- Same major version = fully compatible
- Different major version = requires migration
- Migration logic will be added in future versions

### Version Migration Strategy

```typescript
// Future implementation
interface MigrationStrategy {
  from: string;
  to: string;
  migrate: (data: BackupData) => BackupData;
}

const migrations: MigrationStrategy[] = [
  // Example: Migrate from 1.0.0 to 2.0.0
  {
    from: '1.0.0',
    to: '2.0.0',
    migrate: (data) => {
      // Transform data structure
      return transformedData;
    },
  },
];
```

## Data Integrity

### Anonymization

When `anonymize: true` is set:

- Student names become `Student_XXXX` (last 4 chars of ID)
- Date of birth removed
- Student IDs truncated to last 4 characters
- Notes and descriptions redacted to `[REDACTED]`

### Date Handling

All dates are:

- Stored as ISO 8601 strings in JSON
- Automatically converted to Date objects on parse
- Validated during deserialization

### Validation

- All records validated against schema
- Invalid records logged and skipped
- Student references validated (referential integrity)
- Numeric values validated for range

## Future Enhancements

1. **Compression Support**
   - gzip compression for large backups
   - Compression flag in metadata

2. **Checksum Validation**
   - SHA-256 checksums for data integrity
   - Automatic verification on restore

3. **Incremental Backup Improvements**
   - Track modified records (not just new)
   - Merge strategy for incremental restores
   - Conflict resolution

4. **Encryption**
   - Optional AES-256 encryption
   - Password-protected backups

5. **Cloud Storage Integration**
   - Direct upload to cloud storage
   - Automated backup scheduling

6. **Backup History**
   - Track backup versions
   - Rollback to previous backups
   - Differential backups

## Integration with exportSystem.ts

The original `exportSystem.ts` can now import and use these modules:

```typescript
import { jsonExporter } from '@/lib/export/json';
import { backupSystem } from '@/lib/export/json';

class ExportSystem {
  // Delegate to jsonExporter
  generateJSONExport(students, allData, options) {
    return jsonExporter.generateJSONExport(students, allData, options);
  }

  // Delegate to backupSystem
  createFullBackup(students, allData) {
    return backupSystem.createFullBackup(students, allData);
  }

  async restoreFromBackup(backupData) {
    return backupSystem.restoreFromBackup(backupData);
  }
}
```

## Error Handling

All functions handle errors gracefully:

```typescript
try {
  const backup = backupSystem.deserializeBackup(jsonString);
  if (!backup) {
    // Handle invalid JSON
  }

  const result = await backupSystem.restoreFromBackup(backup);
  if (!result.success) {
    // Handle validation errors
    console.error('Errors:', result.errors);
  }
} catch (error) {
  // Handle unexpected errors
  console.error('Unexpected error:', error);
}
```

## Testing

Recommended test cases:

1. **JSON Export**
   - Export with all fields
   - Export with selective fields
   - Export with date range filtering
   - Export with anonymization
   - Parse exported JSON

2. **Backup Creation**
   - Create full backup
   - Create student backup
   - Create incremental backup
   - Validate metadata

3. **Backup Restoration**
   - Restore valid backup
   - Handle incompatible version
   - Handle corrupted data
   - Validate all record types

4. **Data Validation**
   - Valid student records
   - Invalid student records (missing fields)
   - Valid tracking entries
   - Invalid tracking entries
   - Referential integrity

## Performance Considerations

- Large datasets (>10,000 records) may take time to serialize
- Consider streaming for very large backups
- Use compression for backups >1MB
- Incremental backups for frequent saves
