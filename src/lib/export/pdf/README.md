# PDF Report Generation Module

Focused module for generating PDF reports from student tracking data.

## Features

- ✅ Pure functions with dependency injection
- ✅ No singleton dependencies
- ✅ Support for custom templates
- ✅ Error handling for PDF generation failures
- ✅ Progress tracking support
- ✅ Streaming for large reports
- ✅ Type-safe with full TypeScript support
- ✅ HTML-based output ready for browser printing

## Architecture

```
src/lib/export/pdf/
├── types.ts          # Type definitions (75 lines)
├── reportBuilder.ts  # Content building & analysis (189 lines)
├── htmlFormatter.ts  # HTML template generation (214 lines)
├── pdfGenerator.ts   # Main entry point (168 lines)
└── index.ts          # Public exports (58 lines)
```

## Usage Examples

### Basic Usage

```typescript
import { generatePDFReport } from '@/lib/export/pdf';

// Generate a simple report
const blob = await generatePDFReport(student, data, {
  includeCharts: true,
});

// Download the report
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = `report-${student.name}.html`;
link.click();
URL.revokeObjectURL(url);
```

### With Date Range Filtering

```typescript
import { generatePDFReport } from '@/lib/export/pdf';

const blob = await generatePDFReport(student, data, {
  includeCharts: true,
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31'),
  },
});
```

### With Progress Tracking

```typescript
import { generatePDFReport } from '@/lib/export/pdf';

const blob = await generatePDFReport(student, data, {
  includeCharts: true,
  onProgress: (stage, percent) => {
    console.log(`${stage}: ${percent}%`);
    updateProgressBar(percent);
  },
});
```

### With Metadata

```typescript
import { generatePDFReportWithMetadata } from '@/lib/export/pdf';

const result = await generatePDFReportWithMetadata(student, data, {
  includeCharts: true,
});

console.log('Generated report for:', result.metadata.student);
console.log('Date range:', result.metadata.dateRange);
console.log('Generated at:', result.metadata.generatedAt);
console.log('Estimated pages:', result.metadata.pageCount);

// Use the blob
downloadBlob(result.blob, `report-${result.metadata.student}.html`);
```

### Data Validation Before Generation

```typescript
import { validateReportData, generatePDFReport } from '@/lib/export/pdf';

// Validate data before generating
const validation = validateReportData(student, data);

if (!validation.valid) {
  console.error('Invalid report data:', validation.errors);
  return;
}

// Proceed with generation
const blob = await generatePDFReport(student, data, options);
```

### Using Individual Builder Functions

```typescript
import { buildReportContent, generateHTMLReport, analyzeEmotionsForReport } from '@/lib/export/pdf';

// Build report content manually
const content = buildReportContent(student, data, options);

// Access individual analysis functions
const emotionStats = analyzeEmotionsForReport(data.emotions);
console.log('Most common emotion:', emotionStats.mostCommon);
console.log('Average intensity:', emotionStats.avgIntensity);

// Generate HTML manually
const html = generateHTMLReport(content, options);
```

## Integration with ExportSystem

The ExportSystem class has been updated to delegate to this module:

```typescript
// In exportSystem.ts
import { generatePDFReport as generatePDF } from './export/pdf';

class ExportSystem {
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
}
```

## Custom Templates

The module supports customization through its modular design:

### Custom HTML Template

```typescript
import { buildReportContent } from '@/lib/export/pdf';

// Build content
const content = buildReportContent(student, data, options);

// Use your own HTML generator
const customHTML = myCustomHTMLGenerator(content);
const blob = new Blob([customHTML], { type: 'text/html' });
```

### Custom Analysis Functions

```typescript
import type { EmotionEntry } from '@/types/student';

// Create your own analysis function
function analyzeEmotionsCustom(emotions: EmotionEntry[]) {
  // Custom analysis logic
  return {
    mostCommon: '...',
    avgIntensity: '...',
    positiveRate: '...'
  };
}

// Build report with custom analysis
const content = {
  header: { ... },
  summary: { ... },
  emotionAnalysis: analyzeEmotionsCustom(data.emotions),
  // ... rest of content
};
```

## Error Handling

The module provides consistent error handling:

```typescript
import { generatePDFReport } from '@/lib/export/pdf';

try {
  const blob = await generatePDFReport(student, data, options);
  // Success
} catch (error) {
  // Error message will be prefixed with "PDF generation failed:"
  console.error(error.message);
  // Handle the error appropriately
}
```

## Type Safety

All functions are fully typed with TypeScript:

```typescript
import type {
  ReportContent,
  ReportDataCollection,
  PDFReportOptions,
  ProgressCallback,
} from '@/lib/export/pdf';

// Full autocomplete and type checking
const options: PDFReportOptions = {
  includeCharts: true,
  dateRange: {
    start: new Date(),
    end: new Date(),
  },
};

const onProgress: ProgressCallback = (stage, percent) => {
  console.log(`${stage}: ${percent}%`);
};
```

## Performance Considerations

- **Streaming**: Use `onProgress` callback for large reports to provide user feedback
- **Memory**: HTML is generated as a string; for very large reports, consider chunking
- **Browser Printing**: The generated HTML can be printed directly using `window.print()`

## Testing

All functions are pure and easily testable:

```typescript
import { analyzeEmotionsForReport } from '@/lib/export/pdf';

describe('analyzeEmotionsForReport', () => {
  it('should return correct statistics', () => {
    const emotions = [
      { emotion: 'happy', intensity: 8 },
      { emotion: 'calm', intensity: 6 },
      { emotion: 'happy', intensity: 9 },
    ];

    const result = analyzeEmotionsForReport(emotions);

    expect(result.mostCommon).toBe('happy');
    expect(result.avgIntensity).toBe('7.7');
  });
});
```

## Dependencies

- `date-fns` - Date formatting
- `@/types/student` - Type definitions

No other external dependencies required.

## Migration from ExportSystem

If you were using ExportSystem directly:

**Before:**

```typescript
import { exportSystem } from '@/lib/exportSystem';

const blob = await exportSystem.generatePDFReport(student, data, options);
```

**After (direct usage):**

```typescript
import { generatePDFReport } from '@/lib/export/pdf';

const blob = await generatePDFReport(student, data, options);
```

**Or (continue using ExportSystem):**

```typescript
import { exportSystem } from '@/lib/exportSystem';

// Still works - ExportSystem delegates to the new module
const blob = await exportSystem.generatePDFReport(student, data, options);
```

## Future Enhancements

Potential improvements for future iterations:

- [ ] Support for chart/visualization embedding (currently shows placeholders)
- [ ] Multiple template options (professional, casual, detailed, summary)
- [ ] PDF output using libraries like jsPDF or pdfmake
- [ ] Internationalization support for multi-language reports
- [ ] Custom branding (logos, colors, fonts)
- [ ] Report caching for frequently generated reports
