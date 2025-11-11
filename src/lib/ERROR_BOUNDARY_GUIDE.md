# Enhanced Error Boundary Architecture Guide

## Overview

The Kreativium Analytics application now features an enhanced error boundary architecture designed
to provide robust error handling, user-friendly error messages, and automatic recovery mechanisms.
This guide explains the components and how to use them effectively.

## Components

### 1. Main ErrorBoundary

**Location:** `src/components/ErrorBoundary.tsx`

The enhanced main error boundary with automatic retry and recovery capabilities.

#### Features:

- Automatic recovery with exponential backoff
- Actionable error messages with suggestions
- Error reporting and logging integration
- Retry mechanism with configurable limits
- Development-mode error details
- Toast notifications for errors and recovery

#### Props:

```typescript
interface Props {
  children: ReactNode;
  fallback?: ReactNode; // Custom fallback UI
  onError?: (error: Error, errorInfo) => void;
  showToast?: boolean; // Default: true
  name?: string; // Boundary name for logging
  allowAutoRecovery?: boolean; // Default: true
  maxRetries?: number; // Default: 3
  onRecovered?: () => void; // Called on successful recovery
}
```

#### Usage Example:

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary
      name="ApplicationRoot"
      maxRetries={5}
      onRecovered={() => console.log('App recovered!')}
    >
      <Dashboard />
    </ErrorBoundary>
  );
}
```

### 2. ChartErrorBoundary

**Location:** `src/components/error-boundaries/ChartErrorBoundary.tsx`

Specialized boundary for chart and visualization rendering errors.

#### Features:

- Chart-specific error messages
- Data format validation suggestions
- Performance optimization tips
- Graceful degradation with fallback visualization
- Automatic retry mechanism

#### Props:

```typescript
interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo) => void;
  fallback?: ReactNode;
  chartName?: string; // For logging and UI
  showSuggestions?: boolean; // Default: true
}
```

#### Usage Example:

```tsx
import { ChartErrorBoundary } from '@/components/error-boundaries';
import { EChartContainer } from '@/components/charts/EChartContainer';

export function AnalyticsDashboard() {
  return (
    <ChartErrorBoundary chartName="Analytics Chart">
      <EChartContainer data={data} options={options} />
    </ChartErrorBoundary>
  );
}
```

### 3. DataErrorBoundary

**Location:** `src/components/error-boundaries/DataErrorBoundary.tsx`

Specialized boundary for data fetching, processing, and storage operations.

#### Features:

- Network error detection and handling
- Storage quota management
- Automatic retry with exponential backoff
- Online/offline status detection
- Storage clearing capability
- Timeout handling

#### Props:

```typescript
interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo) => void;
  onRetry?: () => Promise<void>; // Custom retry logic
  fallback?: ReactNode;
  operationName?: string; // For logging
  showNetworkStatus?: boolean; // Default: true
}
```

#### Usage Example:

```tsx
import { DataErrorBoundary } from '@/components/error-boundaries';

export function StudentsList() {
  const fetchStudents = async () => {
    const response = await fetch('/api/students');
    return response.json();
  };

  return (
    <DataErrorBoundary operationName="Fetch Students" onRetry={fetchStudents}>
      <StudentListContent />
    </DataErrorBoundary>
  );
}
```

### 4. GameErrorBoundary

**Location:** `src/components/error-boundaries/GameErrorBoundary.tsx`

Specialized boundary for game component errors.

#### Features:

- Game-specific error messages
- Performance issue detection
- Controller/input error handling
- Audio/animation issue suggestions
- Game state recovery
- Automatic game restart

#### Props:

```typescript
interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo) => void;
  onReset?: () => void | Promise<void>; // Game reset logic
  fallback?: ReactNode;
  gameName?: string; // For logging and UI
}
```

#### Usage Example:

```tsx
import { GameErrorBoundary } from '@/components/error-boundaries';

export function GameComponent() {
  const handleReset = async () => {
    // Reset game state
    await gameManager.reset();
  };

  return (
    <GameErrorBoundary gameName="Sensory Game" onReset={handleReset}>
      <GameEngine />
    </GameErrorBoundary>
  );
}
```

## Error Recovery Utilities

**Location:** `src/lib/errorRecovery.ts`

Comprehensive utilities for error classification, message formatting, and recovery suggestions.

### Key Functions:

#### classifyError(error)

Classifies an error to determine its type and severity.

```typescript
const classification = classifyError(new Error('Network failed'));
// Returns: { type: 'NETWORK_ERROR', severity: 'HIGH', isRecoverable: true }
```

#### formatErrorForDisplay(error, isDevelopment)

Formats an error for display with user-friendly messages.

```typescript
const displayInfo = formatErrorForDisplay(error, import.meta.env.DEV);
// Returns: { userMessage, technicalMessage, severity, suggestions, ... }
```

#### getErrorSuggestions(error)

Gets actionable suggestions for an error type.

```typescript
const suggestions = getErrorSuggestions(error);
// Returns: ['Check your internet connection', 'Try disabling VPN', ...]
```

#### logErrorForReporting(error, context)

Logs an error with context for error tracking and monitoring.

```typescript
logErrorForReporting(error, {
  component: 'Dashboard',
  action: 'fetchData',
  userId: user.id,
});
```

#### getRetryStrategy(error)

Returns recommended retry strategy for an error.

```typescript
const strategy = getRetryStrategy(error);
// Returns: { shouldRetry, maxAttempts, delayMs, backoffMultiplier }
```

## Architecture Layers

### 1. Error Detection

- `ErrorBoundary` and specialized boundaries catch React component errors
- Global error handlers catch unhandled promise rejections and global errors
- Error classification system categorizes errors by type and severity

### 2. Error Logging & Reporting

- Structured logging through `logger` service
- Error context preservation (user, route, timestamp)
- Remote logging integration support
- Development vs. production-aware logging

### 3. Error Messages

- User-friendly messages with actionable suggestions
- Error type-specific guidance
- Development mode with technical details
- Internationalization support ready

### 4. Recovery & Retry

- Automatic retry with exponential backoff
- Recovery strategy selection based on error type
- Online/offline detection
- Storage quota management
- Manual recovery options

### 5. User Communication

- Toast notifications for errors
- Detailed error UI with suggestions
- Recovery status indicators
- Retry attempt tracking

## Error Types Handled

The system classifies and handles these error categories:

- **NETWORK_ERROR** - Connection failures, CORS issues, fetch failures
- **STORAGE_ERROR** - Local storage, IndexedDB quota exceeded
- **RENDERING_ERROR** - DOM and component rendering issues
- **DATA_VALIDATION_ERROR** - Invalid input or malformed data
- **TIMEOUT_ERROR** - Operation timeout or slow responses
- **PROCESSING_ERROR** - Worker or processing failures
- **MEMORY_ERROR** - Memory exceeded or heap issues
- **TYPE_ERROR** - JavaScript type mismatches
- **REFERENCE_ERROR** - Undefined variable references
- **SYNTAX_ERROR** - Code syntax issues

## Best Practices

### 1. Strategic Boundary Placement

```tsx
// Global level - catches all unhandled errors
<ErrorBoundary name="App">
  <Router>
    {/* Page-level - catches page-specific errors */}
    <ErrorBoundary name="Dashboard">
      <Dashboard>
        {/* Feature-level - catches feature-specific errors */}
        <ChartErrorBoundary chartName="MainChart">
          <Chart />
        </ChartErrorBoundary>

        <DataErrorBoundary operationName="StudentData">
          <StudentList />
        </DataErrorBoundary>
      </Dashboard>
    </ErrorBoundary>
  </Router>
</ErrorBoundary>
```

### 2. Provide Meaningful Names

```tsx
// Good - descriptive names for logging
<ErrorBoundary name="AnalyticsDashboard">
  <Dashboard />
</ErrorBoundary>

// Avoid - generic names
<ErrorBoundary>
  <Dashboard />
</ErrorBoundary>
```

### 3. Use Specialized Boundaries

```tsx
// Use the right boundary for the right context
<ChartErrorBoundary chartName="Revenue">  {/* For charts */}
  <RevenueChart />
</ChartErrorBoundary>

<DataErrorBoundary operationName="UserFetch">  {/* For data ops */}
  <UserList />
</DataErrorBoundary>

<GameErrorBoundary gameName="SensoryGame">  {/* For games */}
  <Game />
</GameErrorBoundary>
```

### 4. Handle Recovery Appropriately

```tsx
// Provide recovery callbacks when you have context-specific recovery logic
<DataErrorBoundary
  operationName="Analytics"
  onRetry={async () => {
    // Custom retry logic specific to your component
    await analyticsWorker.recalculate();
  }}
>
  <Analytics />
</DataErrorBoundary>
```

### 5. Customize Fallback UI When Needed

```tsx
// Custom fallback for critical sections
<ErrorBoundary
  fallback={
    <div className="p-6 text-center">
      <p>Critical component failed. Please refresh the page.</p>
      <button onClick={() => window.location.reload()}>Refresh</button>
    </div>
  }
>
  <CriticalComponent />
</ErrorBoundary>
```

## Error Reporting Integration

The system integrates with your existing logger for comprehensive error tracking:

```typescript
// Errors are automatically logged with context
logger.error('[ErrorBoundary] Component error caught', {
  boundaryName: 'Dashboard',
  error: { message, name, stack },
  route: '/dashboard',
  timestamp: '2024-01-01T00:00:00Z',
  retryCount: 1,
  errorCount: 2,
});

// Custom error reporting
logErrorForReporting(error, {
  context: 'userAction',
  userId: '123',
  feature: 'analytics',
});
```

## Testing Error Boundaries

### Manual Testing

```tsx
// Create error-throwing component for testing
function ThrowError() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) throw new Error('Test error');

  return <button onClick={() => setShouldThrow(true)}>Throw Error</button>;
}

// Wrap in error boundary and test
<ErrorBoundary name="TestBoundary">
  <ThrowError />
</ErrorBoundary>;
```

### Vitest Testing

```typescript
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

describe('ErrorBoundary', () => {
  it('catches errors and displays fallback', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <ErrorBoundary name="Test">
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });
});
```

## Performance Considerations

1. **Memo Boundaries** - Error boundaries prevent optimization by default
   - Use React.memo on child components if needed
   - Consider splitting boundaries to avoid re-rendering sibling components

2. **Retry Logic** - Exponential backoff prevents server overload
   - Configurable delays and max retries
   - Automatic falloff after max attempts

3. **Storage Operations** - Clear old data to prevent quota issues
   - DataErrorBoundary can auto-clear storage
   - Implement cleanup policies in your data layer

## Troubleshooting

### Errors Not Caught

- Error boundaries only catch render-time errors
- Async errors need try/catch or custom event handlers
- Event handler errors: use try/catch in handlers
- Promise rejections: use `.catch()` or async/await with try/catch

### Too Many Retries

- Reduce `maxRetries` if retries are excessive
- Check error classification is correct
- Implement backoff delay properly
- Log retry counts to monitor

### Storage Full Errors

- DataErrorBoundary can clear storage
- Implement data retention policies
- Monitor IndexedDB usage
- Use compression for large datasets

## Migration Guide

If migrating from the old ErrorWrapper:

```tsx
// Old way
import ErrorWrapper from '@/components/ErrorWrapper';
<ErrorWrapper>
  <Component />
</ErrorWrapper>;

// New way
import { ErrorBoundary } from '@/components/ErrorBoundary';
<ErrorBoundary name="Component">
  <Component />
</ErrorBoundary>;
```

## Future Enhancements

Potential improvements to the error boundary system:

1. **Error Analytics** - Track error patterns and frequencies
2. **User Feedback** - Allow users to report detailed error info
3. **Error Clustering** - Group similar errors together
4. **Predictive Recovery** - ML-based recovery strategy selection
5. **Error Webhooks** - Send critical errors to monitoring services
6. **A/B Testing** - Test different error messages and recovery strategies
7. **Offline Mode** - Enhanced offline error handling
8. **Session Recording** - Record user sessions leading to errors

## Support

For issues or questions about error boundaries:

1. Check the error classification in `classifyError()`
2. Review logging output in browser console (development mode)
3. Check error suggestions in `getErrorSuggestions()`
4. Verify boundary placement is strategic
5. Test recovery logic independently

## Summary

The enhanced error boundary architecture provides:

- ✓ Comprehensive error classification and handling
- ✓ User-friendly error messages with actionable suggestions
- ✓ Automatic recovery with exponential backoff
- ✓ Specialized boundaries for different contexts
- ✓ Integrated error logging and reporting
- ✓ Development-friendly error details
- ✓ Performance-optimized retry mechanisms
- ✓ Storage quota management

Use these components strategically throughout your application for robust error handling and
improved user experience.
