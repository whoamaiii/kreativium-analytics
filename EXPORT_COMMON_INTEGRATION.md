# Export Common Utilities - Integration Report

## Overview

Extracted shared data collection and preparation logic from `exportSystem.ts` into focused, reusable
modules under `src/lib/export/common/`.

## Created Files

### 1. exportOptions.ts (313 lines)

**Purpose**: Type definitions and validation for export configuration

**Key Exports**:

- `ExportOptions` - Core options interface for all export formats
- `ExportDataCollection` - Standardized data structure for exports
- `ExportMetadata` - Metadata calculated from export data
- `ExportProgress` - Progress tracking for long-running exports
- `ValidationResult` - Validation feedback structure

**Functions**:

```typescript
// Validate export options
validateExportOptions(options: Partial<ExportOptions>): ValidationResult

// Merge user options with defaults
mergeExportOptions(options: Partial<ExportOptions>): ExportOptions

// Validate date range constraints
validateDateRange(dateRange?: { start: Date; end: Date }): boolean

// Estimate export size in bytes
estimateExportSize(data: ExportDataCollection, options: ExportOptions): number

// Check if export exceeds size threshold (50MB)
isExportTooLarge(data: ExportDataCollection, options: ExportOptions): {
  tooLarge: boolean;
  estimatedSize: number;
  threshold: number;
}
```

**Constants**:

- `DEFAULT_EXPORT_OPTIONS` - Sensible defaults
- `AVAILABLE_FIELDS` - Valid field names
- `NESTED_FIELD_PATHS` - Dot notation support

---

### 2. dataCollector.ts (392 lines)

**Purpose**: Memory-efficient data collection, filtering, and grouping

**Key Functions**:

#### Primary Collection

```typescript
// Collect and filter all export data
collectExportData(
  students: Student[],
  allData: {
    trackingEntries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    goals: Goal[];
  },
  options: ExportOptions,
  onProgress?: ProgressCallback
): ExportDataCollection
```

#### Filtering

```typescript
// Apply date range filter to timestamped data
// Optimized for large datasets with early exit
applyDateRangeFilter<T extends { timestamp: Date }>(
  data: T[],
  dateRange?: { start: Date; end: Date }
): T[]

// Filter by student ID(s)
filterByStudentIds<T extends { studentId?: string }>(
  data: T[],
  studentIds: string[]
): T[]
```

#### Grouping

```typescript
// Group data by dimension (student, date, goal)
// Returns Map for efficient lookup
groupDataBy<T extends { studentId?: string; timestamp?: Date }>(
  data: T[],
  groupBy: 'student' | 'date' | 'goal'
): Map<string, T[]>
```

#### Metadata

```typescript
// Calculate comprehensive metadata
calculateExportMetadata(
  data: ExportDataCollection,
  version?: string
): ExportMetadata

// Get statistics for reporting
getDataStatistics(data: ExportDataCollection): {
  totalRecords: number;
  dateRange: { earliest: Date | null; latest: Date | null };
  recordsByType: Record<string, number>;
  studentCount: number;
}
```

#### Streaming Support

```typescript
// Memory-efficient chunked iteration
function* chunkData<T>(data: T[], chunkSize?: number): Generator<T[]>

// Async streaming for very large exports
async function* streamExportData(
  students: Student[],
  allData: { ... },
  options: ExportOptions,
  chunkSize?: number
): AsyncGenerator<{ type: keyof ExportDataCollection; chunk: unknown[] }>
```

**Algorithm Details**:

**Date Range Filtering**:

- Time complexity: O(n) where n = number of records
- Space complexity: O(n) for filtered results
- Early exit optimization using timestamp comparison
- Pre-converts dates to timestamps for faster comparison

**Grouping Algorithm**:

- Uses Map for O(1) lookup and insertion
- Single pass through data: O(n)
- Space complexity: O(n + g) where g = number of groups
- Date grouping uses ISO format YYYY-MM-DD for consistency

**Progress Tracking**:

- Incremental progress calculation
- Phase-based reporting (collecting, filtering, transforming, etc.)
- Callback-based to avoid blocking

---

### 3. dataTransformer.ts (524 lines)

**Purpose**: Data anonymization, field selection, flattening, and enrichment

**Key Functions**:

#### Anonymization

```typescript
// Anonymize specific data types
anonymizeStudent(student: Student, options?: AnonymizationOptions): Student
anonymizeEmotion(emotion: EmotionEntry, options?: AnonymizationOptions): EmotionEntry
anonymizeSensory(sensory: SensoryEntry, options?: AnonymizationOptions): SensoryEntry
anonymizeGoal(goal: Goal, options?: AnonymizationOptions): Goal
anonymizeTracking(tracking: TrackingEntry, options?: AnonymizationOptions): TrackingEntry

// Anonymize entire collection
anonymizeData(
  data: ExportDataCollection,
  options?: AnonymizationOptions
): ExportDataCollection

// Redact PII from free text
redactPII(text: string): string
```

**Anonymization Options**:

```typescript
interface AnonymizationOptions {
  anonymizeNames?: boolean; // Student_XXXX format
  removeDateOfBirth?: boolean; // Remove DOB field
  truncateIds?: boolean; // Last 4 chars only
  removeNotes?: boolean; // Remove all notes
  redactNotes?: boolean; // Redact PII from notes
}
```

**PII Redaction Patterns**:

- Email addresses: `[EMAIL]`
- Phone numbers (various formats): `[PHONE]`
- Name patterns (Dear X, From: X): `[NAME]`
- Street addresses: `[ADDRESS]`

#### Field Selection

```typescript
// Select specific fields (supports dot notation)
selectFields<T>(obj: T, fields: string[]): Partial<T>

// Get nested field value
getNestedField(obj: Record<string, unknown>, path: string): unknown

// Set nested field value
setNestedField(obj: Record<string, unknown>, path: string, value: unknown): void
```

#### Flattening

```typescript
// Flatten nested objects for CSV
flattenNestedData<T>(obj: T, prefix?: string): Record<string, unknown>
```

**Flattening Rules**:

- Objects: Recursively flattened with dot notation
- Arrays: Joined with "; " separator
- Dates: Converted to ISO strings
- Null/undefined: Empty strings
- Primitives: Preserved as-is

#### Enrichment

```typescript
// Add computed fields
enrichWithComputedFields<T>(
  obj: T,
  computations: Record<string, (obj: T) => unknown>
): T & Record<string, unknown>
```

**Pre-defined Computed Fields**:

_Students_:

- `age` - Calculated from dateOfBirth
- `activeGoalCount` - Number of active goals
- `accountAge` - Days since account creation

_Goals_:

- `progressPercentage` - Current progress %
- `daysActive` - Days since creation
- `daysUntilTarget` - Days until target date
- `isOverdue` - Boolean flag

_Emotions_:

- `isPositive` - Positive emotion flag
- `isNegative` - Negative emotion flag
- `hasHighIntensity` - Intensity >= 7

#### Batch Processing

```typescript
// Transform in batches with progress
function* transformDataBatched(
  data: ExportDataCollection,
  options: { anonymize?: boolean; anonymizationOptions?: AnonymizationOptions },
  batchSize?: number
): Generator<{ type: string; transformed: unknown[] }>
```

---

### 4. index.ts (63 lines)

**Purpose**: Central export point for all common utilities

Re-exports all functions, types, and constants from the three modules.

---

## Integration Examples

### Example 1: Basic Export with Validation

```typescript
import {
  ExportOptions,
  validateExportOptions,
  mergeExportOptions,
  collectExportData,
  calculateExportMetadata,
} from '@/lib/export/common';

// User-provided options
const userOptions: Partial<ExportOptions> = {
  format: 'csv',
  includeFields: ['emotions', 'sensoryInputs'],
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31'),
  },
  anonymize: true,
};

// Validate options
const validation = validateExportOptions(userOptions);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  return;
}

// Merge with defaults
const options = mergeExportOptions(userOptions);

// Collect data
const data = collectExportData(students, allData, options, (progress) => {
  console.log(`${progress.phase}: ${progress.percentage}%`);
});

// Calculate metadata
const metadata = calculateExportMetadata(data);
console.log('Exporting:', metadata.totalRecords, 'records');
```

### Example 2: Anonymized Export

```typescript
import { collectExportData, anonymizeData, AnonymizationOptions } from '@/lib/export/common';

// Collect data
const data = collectExportData(students, allData, options);

// Custom anonymization
const anonOptions: AnonymizationOptions = {
  anonymizeNames: true,
  removeDateOfBirth: true,
  truncateIds: true,
  redactNotes: true, // Redact but keep notes
};

// Apply anonymization
const anonymizedData = anonymizeData(data, anonOptions);
```

### Example 3: Streaming Large Exports

```typescript
import { streamExportData } from '@/lib/export/common';

// Stream data in chunks
for await (const chunk of streamExportData(students, allData, options, 500)) {
  console.log(`Processing ${chunk.type}: ${chunk.chunk.length} records`);

  // Process chunk (e.g., write to file, send to API)
  await processChunk(chunk);
}
```

### Example 4: Field Selection and Flattening

```typescript
import {
  selectFields,
  flattenNestedData,
  enrichWithComputedFields,
  GOAL_COMPUTED_FIELDS,
} from '@/lib/export/common';

// Select specific fields
const student = {
  /* ... */
};
const minimal = selectFields(student, ['name', 'grade', 'id']);

// Flatten for CSV
const goal = {
  /* nested structure */
};
const flattened = flattenNestedData(goal);
// Result: { 'title': 'Goal', 'milestones.0.title': 'Milestone 1', ... }

// Enrich with computed fields
const enriched = enrichWithComputedFields(goal, GOAL_COMPUTED_FIELDS);
// Adds: progressPercentage, daysActive, daysUntilTarget, isOverdue
```

### Example 5: Grouped Export

```typescript
import { collectExportData, groupDataBy } from '@/lib/export/common';

const data = collectExportData(students, allData, options);

// Group by student
const byStudent = groupDataBy(data.emotions, 'student');

// Process each student's data
for (const [studentId, emotions] of byStudent) {
  console.log(`Student ${studentId}: ${emotions.length} emotions`);
  // Generate per-student export
}
```

### Example 6: Size Estimation

```typescript
import { isExportTooLarge, estimateExportSize } from '@/lib/export/common';

const data = collectExportData(students, allData, options);

const sizeCheck = isExportTooLarge(data, options);
if (sizeCheck.tooLarge) {
  const sizeMB = (sizeCheck.estimatedSize / (1024 * 1024)).toFixed(2);
  console.warn(`Export is large (${sizeMB} MB). Consider filtering.`);
}
```

---

## Performance Considerations

### Memory Efficiency

1. **Streaming Support**: Use `streamExportData()` for large datasets
2. **Chunked Processing**: `chunkData()` generator prevents memory spikes
3. **Filter Early**: Apply date range filters before other operations
4. **Single Pass**: Most operations use single-pass algorithms

### Algorithmic Complexity

| Operation       | Time    | Space   | Notes                   |
| --------------- | ------- | ------- | ----------------------- |
| Date filtering  | O(n)    | O(n)    | Early exit optimization |
| Grouping        | O(n)    | O(n+g)  | Map-based, O(1) lookup  |
| Anonymization   | O(n)    | O(n)    | In-place where possible |
| Field selection | O(f)    | O(f)    | f = number of fields    |
| Flattening      | O(n\*d) | O(n\*d) | d = depth of nesting    |
| PII redaction   | O(m)    | O(m)    | m = text length         |

### Optimization Tips

1. **Batch Size**: Default 1000, adjust based on record size
2. **Field Selection**: Minimize included fields to reduce processing
3. **Date Ranges**: Narrow ranges reduce filtering overhead
4. **Anonymization**: Use `truncateIds` instead of full anonymization when possible
5. **Progress Callbacks**: Keep lightweight to avoid blocking

---

## Shared Interfaces

### ExportOptions

```typescript
interface ExportOptions {
  format: 'pdf' | 'csv' | 'json';
  includeFields: string[];
  dateRange?: { start: Date; end: Date };
  groupBy?: 'student' | 'date' | 'goal';
  includeCharts?: boolean;
  anonymize?: boolean;
  includeMetadata?: boolean;
  fieldMappings?: Record<string, string>;
}
```

### ExportDataCollection

```typescript
interface ExportDataCollection {
  trackingEntries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  goals: Goal[];
  students?: Student[];
}
```

### ExportMetadata

```typescript
interface ExportMetadata {
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
```

---

## Migration Path for exportSystem.ts

The existing `exportSystem.ts` can now use these utilities:

```typescript
import {
  collectExportData,
  anonymizeData,
  calculateExportMetadata,
  validateExportOptions
} from '@/lib/export/common';

class ExportSystem {
  generateCSVExport(students: Student[], allData: {...}, options: ExportOptions): string {
    // Old: Manual filtering and anonymization
    // const emotionData = this.filterByDateRange(allData.emotions, dateRange);

    // New: Use common utilities
    const data = collectExportData(students, allData, options);
    const processedData = options.anonymize ? anonymizeData(data) : data;

    // Generate CSV from processedData
    return this.formatAsCSV(processedData);
  }
}
```

**Benefits**:

- Removes ~300 lines of duplicate code
- Consistent behavior across all export formats
- Easier to test and maintain
- Reusable in other export contexts

---

## Testing Recommendations

### Unit Tests

```typescript
describe('dataCollector', () => {
  test('applyDateRangeFilter filters correctly', () => {
    const data = [
      /* test data */
    ];
    const filtered = applyDateRangeFilter(data, {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31'),
    });
    expect(filtered).toHaveLength(expectedCount);
  });

  test('groupDataBy groups by student', () => {
    const grouped = groupDataBy(emotions, 'student');
    expect(grouped.size).toBe(uniqueStudentCount);
  });
});

describe('dataTransformer', () => {
  test('anonymizeStudent removes PII', () => {
    const anonymized = anonymizeStudent(student);
    expect(anonymized.name).toMatch(/^Student_\w{4}$/);
    expect(anonymized.dateOfBirth).toBeUndefined();
  });

  test('redactPII removes email addresses', () => {
    const text = 'Contact me at john@example.com';
    expect(redactPII(text)).toBe('Contact me at [EMAIL]');
  });
});
```

### Integration Tests

- Test full export pipeline with real data
- Verify large dataset handling (10k+ records)
- Test streaming with memory monitoring
- Validate all export formats use common utilities

---

## File Structure Summary

```
src/lib/export/common/
├── index.ts                  # 63 lines  - Module exports
├── exportOptions.ts          # 313 lines - Types & validation
├── dataCollector.ts          # 392 lines - Collection & filtering
└── dataTransformer.ts        # 524 lines - Transformation & anonymization

Total: 1,292 lines of production code
```

---

## Next Steps

1. **Update exportSystem.ts**: Refactor to use common utilities
2. **Create Format Modules**:
   - `export/formatters/csvFormatter.ts`
   - `export/formatters/jsonFormatter.ts`
   - `export/formatters/pdfFormatter.ts`
3. **Add Tests**: Comprehensive test coverage for all utilities
4. **Documentation**: JSDoc comments for all public APIs
5. **Performance Testing**: Benchmark with large datasets (100k+ records)

---

## Summary

Successfully extracted 1,292 lines of reusable export infrastructure:

✅ **Type-safe** - Full TypeScript support with comprehensive interfaces ✅ **Memory-efficient** -
Streaming and chunking for large datasets ✅ **Validated** - Input validation with helpful error
messages ✅ **Flexible** - Field selection with dot notation support ✅ **Privacy-aware** -
Configurable anonymization with PII redaction ✅ **Performance-optimized** - Single-pass algorithms,
early exits ✅ **Progress-tracked** - Callbacks for long-running operations ✅ **Well-documented** -
Clear examples and integration guides

This foundation enables all export formats (PDF, CSV, JSON) to share common logic while maintaining
format-specific rendering in separate modules.
