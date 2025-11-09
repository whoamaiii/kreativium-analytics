# Export Common Utilities

Shared data collection, transformation, and validation utilities for all export formats (PDF, CSV, JSON).

## Purpose

This module extracts common export logic that was previously duplicated across format-specific exporters. It provides:

- **Type-safe export options** with validation
- **Memory-efficient data collection** with streaming support
- **Flexible data transformation** with anonymization
- **Progress tracking** for long-running exports
- **Consistent behavior** across all export formats

## Module Structure

```
src/lib/export/common/
├── index.ts              # Main exports
├── exportOptions.ts      # Types, validation, defaults
├── dataCollector.ts      # Data collection & filtering
├── dataTransformer.ts    # Transformation & anonymization
├── USAGE_EXAMPLES.ts     # Practical examples
└── README.md            # This file
```

## Quick Start

```typescript
import {
  mergeExportOptions,
  collectExportData,
  anonymizeData
} from '@/lib/export/common';

// 1. Configure export
const options = mergeExportOptions({
  format: 'csv',
  includeFields: ['emotions', 'sensoryInputs'],
  dateRange: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
  anonymize: true
});

// 2. Collect data
const data = collectExportData(students, allData, options);

// 3. Transform (optional)
const anonymized = anonymizeData(data);

// 4. Format (in format-specific module)
const csv = formatAsCSV(anonymized);
```

## Key Features

### 1. Validation
```typescript
const validation = validateExportOptions(options);
if (!validation.valid) {
  console.error(validation.errors);
}
```

### 2. Date Range Filtering
```typescript
const filtered = applyDateRangeFilter(emotions, {
  start: new Date('2024-01-01'),
  end: new Date('2024-12-31')
});
```

### 3. Anonymization
```typescript
const anonymized = anonymizeData(data, {
  anonymizeNames: true,
  removeDateOfBirth: true,
  truncateIds: true,
  redactNotes: true  // Redact PII but keep notes
});
```

### 4. Streaming (Large Exports)
```typescript
for await (const chunk of streamExportData(students, allData, options, 1000)) {
  await processChunk(chunk);
}
```

### 5. Grouping
```typescript
const byStudent = groupDataBy(emotions, 'student');
const byDate = groupDataBy(emotions, 'date');
```

### 6. Progress Tracking
```typescript
collectExportData(students, allData, options, (progress) => {
  console.log(`${progress.phase}: ${progress.percentage}%`);
});
```

## API Reference

### exportOptions.ts

#### Types
- `ExportOptions` - Configuration for exports
- `ExportDataCollection` - Collected data structure
- `ExportMetadata` - Export metadata
- `ExportProgress` - Progress tracking
- `ValidationResult` - Validation feedback

#### Functions
- `validateExportOptions()` - Validate user options
- `mergeExportOptions()` - Merge with defaults
- `validateDateRange()` - Check date range validity
- `estimateExportSize()` - Calculate estimated size
- `isExportTooLarge()` - Check size threshold

### dataCollector.ts

#### Functions
- `collectExportData()` - Primary data collection
- `applyDateRangeFilter()` - Filter by date range
- `groupDataBy()` - Group by dimension
- `calculateExportMetadata()` - Calculate metadata
- `filterByStudentIds()` - Filter by student
- `getUniqueStudentIds()` - Get unique students
- `streamExportData()` - Async streaming
- `chunkData()` - Chunked iteration
- `validateCollectedData()` - Validate results
- `getDataStatistics()` - Get statistics

### dataTransformer.ts

#### Functions
- `anonymizeData()` - Anonymize collection
- `anonymizeStudent()` - Anonymize student
- `anonymizeEmotion()` - Anonymize emotion
- `anonymizeSensory()` - Anonymize sensory
- `anonymizeGoal()` - Anonymize goal
- `anonymizeTracking()` - Anonymize tracking
- `redactPII()` - Redact PII from text
- `selectFields()` - Select specific fields
- `flattenNestedData()` - Flatten for CSV
- `enrichWithComputedFields()` - Add computed fields
- `transformData()` - Apply all transformations
- `transformDataBatched()` - Batch transformations

#### Computed Fields
- `STUDENT_COMPUTED_FIELDS` - Age, goal count, account age
- `GOAL_COMPUTED_FIELDS` - Progress %, days active, overdue flag
- `EMOTION_COMPUTED_FIELDS` - Positive/negative flags, intensity

## Performance

### Complexity
- Date filtering: O(n)
- Grouping: O(n) with O(1) lookup
- Anonymization: O(n)
- Flattening: O(n*d) where d = depth

### Memory
- Streaming: O(chunk_size)
- Standard: O(n) where n = filtered records
- Grouping: O(n + g) where g = group count

### Optimization Tips
1. Use `streamExportData()` for large datasets (10k+ records)
2. Apply date range filters early
3. Minimize `includeFields` to reduce processing
4. Adjust chunk size based on record complexity
5. Use progress callbacks sparingly

## Integration with Format Modules

### CSV Module
```typescript
import { collectExportData, anonymizeData } from '@/lib/export/common';

export function generateCSV(students, allData, options) {
  const data = collectExportData(students, allData, options);
  const processed = options.anonymize ? anonymizeData(data) : data;
  return formatAsCSV(processed); // CSV-specific formatting
}
```

### JSON Module
```typescript
import { collectExportData, calculateExportMetadata } from '@/lib/export/common';

export function generateJSON(students, allData, options) {
  const data = collectExportData(students, allData, options);
  const metadata = calculateExportMetadata(data);
  return JSON.stringify({ metadata, data }, null, 2);
}
```

### PDF Module
```typescript
import { collectExportData, groupDataBy } from '@/lib/export/common';

export function generatePDF(student, allData, options) {
  const data = collectExportData([student], allData, options);
  const grouped = groupDataBy(data.emotions, 'date');
  return renderPDF(student, data, grouped);
}
```

## Examples

See `USAGE_EXAMPLES.ts` for comprehensive examples including:
1. Basic validated export
2. Anonymized export for research
3. Streaming large export
4. Grouped export by student
5. CSV with flattening
6. Date range filtering
7. Integration with CSV module
8. Progress tracking for UI
9. Validation before export

## Testing

```bash
# Unit tests
npm test -- src/lib/export/common

# Type checking
npm run typecheck

# Integration tests
npm test -- src/lib/export
```

## Migration from exportSystem.ts

Before:
```typescript
const emotionData = this.filterByDateRange(allData.emotions, dateRange);
const anonymized = emotionData.map(e => this.anonymizeEmotion(e));
```

After:
```typescript
const data = collectExportData(students, allData, options);
const anonymized = anonymizeData(data);
```

Benefits:
- **300+ lines** of duplicate code removed
- **Consistent behavior** across all formats
- **Better testability** with focused modules
- **Easier maintenance** with single source of truth

## License

Part of Kreativium Analytics Platform
