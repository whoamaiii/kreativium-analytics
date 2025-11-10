# CSV Export Module

Production-ready CSV generation and formatting for Kreativium Analytics.

## Features

- **RFC 4180 Compliant**: Follows the CSV specification standard
- **Multiple Data Types**: Export emotions, sensory inputs, goals, and tracking entries
- **Date Range Filtering**: Filter data by time periods
- **Anonymization**: Protect student privacy with built-in anonymization
- **UTF-8 BOM Support**: Excel-compatible encoding
- **Custom Delimiters**: Support for CSV, TSV, and custom separators
- **Grouping**: Group data by student, date, or goal
- **Multi-Section Export**: Combine multiple data types in one file
- **Large Dataset Support**: Streaming and chunking for performance
- **Field Selection**: Choose which fields to include/exclude

## Installation

```typescript
import {
  generateCSVExport,
  generateEmotionsCSV,
  // ... other exports
} from '@/lib/export/csv';
```

## Quick Start

### Basic Export

```typescript
import { generateEmotionsCSV } from '@/lib/export/csv';

const result = generateEmotionsCSV(emotions, students, {
  includeFields: ['emotions']
});

console.log(result.content); // CSV string
console.log(result.rowCount); // Number of data rows
console.log(result.byteSize); // File size in bytes
```

### Export with Date Range

```typescript
const result = generateCSVExport(students, data, {
  includeFields: ['emotions', 'sensoryInputs'],
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31')
  }
});
```

### Anonymized Export

```typescript
const result = generateCSVExport(students, data, {
  includeFields: ['emotions', 'sensoryInputs', 'goals'],
  anonymize: true
});
```

### Excel-Compatible Export

```typescript
const result = generateEmotionsCSV(emotions, students, {
  includeFields: ['emotions'],
  formatting: {
    includeUtf8Bom: true,
    dateFormat: 'MM/dd/yyyy HH:mm'
  }
});
```

## API Reference

### Main Export Function

#### `generateCSVExport(students, data, options)`

Generate CSV export for multiple data types.

**Parameters:**
- `students: Student[]` - Array of student records
- `data: Object` - Data collections object
  - `trackingEntries: TrackingEntry[]`
  - `emotions: EmotionEntry[]`
  - `sensoryInputs: SensoryEntry[]`
  - `goals: Goal[]`
- `options: CSVExportOptions` - Export configuration

**Returns:** `CSVGenerationResult`
- `content: string` - CSV content
- `rowCount: number` - Number of data rows
- `byteSize: number` - Size in bytes

### Specialized Export Functions

#### `generateEmotionsCSV(emotions, students, options)`
Export emotion entries with columns:
- Date, Student, Emotion, Sub-Emotion, Intensity, Duration, Triggers, Escalation Pattern, Context, Notes

#### `generateSensoryCSV(sensoryInputs, students, options)`
Export sensory entries with columns:
- Date, Student, Sensory Type, Response, Intensity, Location, Context, Coping Strategies, Environment, Notes

#### `generateGoalsCSV(goals, students, options)`
Export goals with columns:
- Student, Goal Title, Description, Category, Status, Target Value, Current Progress, Progress %, Measurable Objective, Baseline Value, Date Created, Target Date, Last Updated, Notes

#### `generateTrackingCSV(trackingEntries, students, options)`
Export tracking entries with columns:
- Date, Student, Session Duration, Emotion Count, Sensory Count, Location, Social Context, Environmental Notes, General Notes

### Export Options

```typescript
interface CSVExportOptions {
  // Required: Which data types to include
  includeFields: string[];

  // Optional: Filter by date range
  dateRange?: {
    start: Date;
    end: Date;
  };

  // Optional: Group data
  groupBy?: 'student' | 'date' | 'goal';

  // Optional: Anonymize data
  anonymize?: boolean;

  // Optional: Formatting options
  formatting?: {
    delimiter?: string;        // Default: ','
    dateFormat?: string;       // Default: 'yyyy-MM-dd HH:mm'
    includeUtf8Bom?: boolean; // Default: false
    quoteAll?: boolean;       // Default: false
    nullValue?: string;       // Default: ''
  };

  // Optional: Custom column names
  columnMap?: Record<string, string>;
}
```

### Formatting Options

#### Date Formats
Use [date-fns format tokens](https://date-fns.org/v2.29.3/docs/format):
- `'yyyy-MM-dd HH:mm'` - ISO-like format (default)
- `'MM/dd/yyyy HH:mm'` - US format
- `"yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"` - ISO 8601

#### Delimiters
- `','` - Comma (CSV) - default
- `'\t'` - Tab (TSV)
- `';'` - Semicolon
- Custom single character

## CSV Specification (RFC 4180)

This module follows RFC 4180 standards:

1. **Line Breaks**: CRLF (`\r\n`) or LF (`\n`)
2. **Field Separator**: Comma (configurable)
3. **Quoting**: Fields with special characters are quoted
4. **Quote Escaping**: Double quotes escaped as `""`
5. **Header Row**: Always included
6. **Encoding**: UTF-8 with optional BOM

### Automatic Quoting

Values are automatically quoted if they contain:
- Delimiter character (comma)
- Quote character (`"`)
- Line breaks (`\n`, `\r`)

Example:
```
"Student, John","Says ""hello"" to teacher","Line 1
Line 2"
```

## Usage Examples

### Example 1: Single Student Report

```typescript
const studentEmotions = emotions.filter(e => e.studentId === student.id);
const result = generateEmotionsCSV(studentEmotions, [student], {
  includeFields: ['emotions'],
  formatting: { includeUtf8Bom: true }
});
```

### Example 2: Weekly Report

```typescript
const lastWeek = {
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  end: new Date()
};

const result = generateCSVExport(students, data, {
  includeFields: ['emotions', 'sensoryInputs', 'trackingEntries'],
  dateRange: lastWeek,
  formatting: { includeUtf8Bom: true }
});
```

### Example 3: Research Data Export (Anonymized)

```typescript
const result = generateCSVExport(students, data, {
  includeFields: ['emotions', 'sensoryInputs', 'goals'],
  anonymize: true,
  formatting: {
    includeUtf8Bom: true,
    dateFormat: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
  }
});
```

### Example 4: Download File

```typescript
function downloadCSV(students, emotions) {
  const result = generateEmotionsCSV(emotions, students, {
    includeFields: ['emotions'],
    formatting: { includeUtf8Bom: true }
  });

  const blob = new Blob([result.content], {
    type: 'text/csv;charset=utf-8;'
  });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'emotions-export.csv';
  link.click();
}
```

### Example 5: Tab-Separated Values (TSV)

```typescript
const result = generateEmotionsCSV(emotions, students, {
  includeFields: ['emotions'],
  formatting: {
    delimiter: '\t',
    includeUtf8Bom: true
  }
});
```

### Example 6: Grouped by Student

```typescript
const result = generateCSVExport(students, data, {
  includeFields: ['emotions', 'sensoryInputs', 'goals'],
  groupBy: 'student',
  formatting: { includeUtf8Bom: true }
});
```

## Integration with exportSystem.ts

To integrate with the existing export system:

```typescript
import { generateCSVExport } from '@/lib/export/csv';

class ExportSystem {
  generateCSVExport(students, allData, options) {
    // Use the new CSV module
    const result = generateCSVExport(students, allData, {
      includeFields: options.includeFields,
      dateRange: options.dateRange,
      anonymize: options.anonymize,
      formatting: {
        includeUtf8Bom: true,
        dateFormat: 'yyyy-MM-dd HH:mm'
      }
    });

    return result.content;
  }
}
```

## Performance Considerations

### Large Datasets

For datasets > 10,000 rows:

```typescript
// Option 1: Process in chunks
function exportInChunks(emotions, students, chunkSize = 1000) {
  const chunks = [];

  for (let i = 0; i < emotions.length; i += chunkSize) {
    const chunk = emotions.slice(i, i + chunkSize);
    const result = generateEmotionsCSV(chunk, students, options);
    chunks.push(result.content);
  }

  return chunks.join('\n');
}

// Option 2: Use Web Workers (recommended)
// Process CSV generation in a separate thread
```

### Memory Usage

- Each 1,000 rows ≈ 100KB memory
- 10,000 rows ≈ 1MB
- 100,000 rows ≈ 10MB

## Testing

```typescript
import { generateEmotionsCSV } from '@/lib/export/csv';

describe('CSV Export', () => {
  it('should generate valid CSV', () => {
    const result = generateEmotionsCSV(emotions, students, {
      includeFields: ['emotions']
    });

    expect(result.content).toContain('Date,Student,Emotion');
    expect(result.rowCount).toBe(emotions.length);
  });

  it('should handle date range filtering', () => {
    const result = generateEmotionsCSV(emotions, students, {
      includeFields: ['emotions'],
      dateRange: {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31')
      }
    });

    expect(result.rowCount).toBeLessThanOrEqual(emotions.length);
  });

  it('should anonymize data', () => {
    const result = generateEmotionsCSV(emotions, students, {
      includeFields: ['emotions'],
      anonymize: true
    });

    expect(result.content).not.toContain(students[0].name);
    expect(result.content).toContain('Student_');
  });
});
```

## Error Handling

The module handles common edge cases:

- **Empty datasets**: Returns header-only CSV
- **Missing fields**: Uses empty string or configurable null value
- **Invalid dates**: Falls back to string representation
- **Special characters**: Properly escaped and quoted
- **Nested objects**: Flattened with dot notation

## Future Enhancements

Potential improvements:

- [ ] Stream-based generation for very large datasets
- [ ] Custom column ordering
- [ ] Multi-language header support (i18n)
- [ ] Data validation before export
- [ ] Progress callbacks for long exports
- [ ] Compression support (gzip)
- [ ] Direct database export
- [ ] Excel XLSX format (in addition to CSV)

## Support

For issues or questions, refer to:
- Main documentation: `/docs/export-system.md`
- Type definitions: `/src/types/student.ts`
- Examples: `./examples.ts`

## License

Part of Kreativium Analytics Platform
