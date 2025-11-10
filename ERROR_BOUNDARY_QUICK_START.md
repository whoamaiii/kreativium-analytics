# Error Boundary Quick Start Guide

## 5-Minute Setup

### Step 1: Import at App Root

```tsx
// src/main.tsx or your app entry point
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary name="App">
      <Router />
    </ErrorBoundary>
  );
}
```

### Step 2: Add to Critical Pages

```tsx
// src/pages/Dashboard.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function Dashboard() {
  return (
    <ErrorBoundary name="Dashboard" maxRetries={3}>
      <DashboardContent />
    </ErrorBoundary>
  );
}
```

### Step 3: Use Specialized Boundaries

```tsx
// Charts
import { ChartErrorBoundary } from '@/components/error-boundaries';

<ChartErrorBoundary chartName="RevenueChart">
  <RevenueChart data={data} />
</ChartErrorBoundary>

// Data operations
import { DataErrorBoundary } from '@/components/error-boundaries';

<DataErrorBoundary operationName="UserFetch">
  <UserList />
</DataErrorBoundary>

// Games
import { GameErrorBoundary } from '@/components/error-boundaries';

<GameErrorBoundary gameName="SensoryGame">
  <GameEngine />
</GameErrorBoundary>
```

## Common Patterns

### Basic Error Boundary

```tsx
<ErrorBoundary name="MyComponent">
  <MyComponent />
</ErrorBoundary>
```

### With Recovery Callback

```tsx
<ErrorBoundary
  name="Analytics"
  onRecovered={() => {
    console.log('Analytics recovered!');
    // Refetch data, reset state, etc.
  }}
>
  <Analytics />
</ErrorBoundary>
```

### With Custom Max Retries

```tsx
<ErrorBoundary
  name="CriticalSection"
  maxRetries={5}  // Allow more retries
  allowAutoRecovery={true}
>
  <CriticalComponent />
</ErrorBoundary>
```

### With Custom Fallback

```tsx
<ErrorBoundary
  name="Dashboard"
  fallback={
    <div className="p-4 text-center">
      <p>Dashboard failed to load</p>
      <button onClick={() => window.location.reload()}>
        Reload Page
      </button>
    </div>
  }
>
  <Dashboard />
</ErrorBoundary>
```

### Data Boundary with Custom Retry

```tsx
<DataErrorBoundary
  operationName="StudentData"
  onRetry={async () => {
    // Your custom retry logic
    const data = await fetchStudents();
    return data;
  }}
>
  <StudentList />
</DataErrorBoundary>
```

### Chart Error Boundary

```tsx
<ChartErrorBoundary chartName="Analytics">
  <EChartContainer
    data={analyticsData}
    options={chartOptions}
  />
</ChartErrorBoundary>
```

### Game Error Boundary

```tsx
<GameErrorBoundary
  gameName="MemoryGame"
  onReset={async () => {
    await gameManager.reset();
  }}
>
  <MemoryGame />
</GameErrorBoundary>
```

## Nesting Strategy

Place boundaries strategically for optimal error isolation:

```tsx
<ErrorBoundary name="App">
  {/* Catches all app-level errors */}

  <Router>
    <ErrorBoundary name="Dashboard">
      {/* Catches dashboard-specific errors */}

      <ChartErrorBoundary chartName="MainChart">
        {/* Catches chart errors - doesn't crash dashboard */}
        <MainChart />
      </ChartErrorBoundary>

      <DataErrorBoundary operationName="Stats">
        {/* Catches stats data errors - doesn't crash dashboard */}
        <StatsSection />
      </DataErrorBoundary>
    </ErrorBoundary>
  </Router>
</ErrorBoundary>
```

## Error Types Auto-Handled

The system automatically handles these error scenarios:

| Error Type | Auto-Retry | Suggestion | Boundary |
|-----------|-----------|-----------|----------|
| Network | Yes | Check internet | DataErrorBoundary |
| Storage Full | Yes | Clear cache | DataErrorBoundary |
| Rendering | Yes | Refresh | ChartErrorBoundary |
| Data Invalid | Yes | Check format | DataErrorBoundary |
| Timeout | Yes | Try again | All |
| Memory | Yes | Close apps | DataErrorBoundary |
| Type Error | No | Contact support | All |

## Getting Error Suggestions Programmatically

```tsx
import { getErrorSuggestions } from '@/lib/errorRecovery';

// Manually get suggestions for an error
try {
  // your code
} catch (error) {
  const suggestions = getErrorSuggestions(error);
  console.log(suggestions); // Array of actionable strings
}
```

## Logging Error Reports

```tsx
import { logErrorForReporting } from '@/lib/errorRecovery';

try {
  // your code
} catch (error) {
  logErrorForReporting(error, {
    component: 'Dashboard',
    action: 'fetchData',
    userId: user.id
  });
}
```

## Classifying Errors

```tsx
import { classifyError } from '@/lib/errorRecovery';

const classification = classifyError(error);
console.log(classification);
// {
//   type: 'NETWORK_ERROR',
//   severity: 'HIGH',
//   isRecoverable: true
// }
```

## Checking Transient Errors

```tsx
import { isTransientError } from '@/lib/errorRecovery';

if (isTransientError(error)) {
  // Safe to retry
  await retry();
}
```

## Custom Recovery Strategies

```tsx
// Extend error handler with custom recovery
import { errorHandler } from '@/lib/errorHandler';

errorHandler.registerRecoveryStrategy({
  canRecover(error) {
    return error.type === 'CUSTOM_ERROR';
  },
  async recover(error) {
    // Custom recovery logic
    await myCustomRecovery();
  }
});
```

## Boundary Naming Convention

Use descriptive names for better debugging:

```tsx
// Good - specific and descriptive
<ErrorBoundary name="UserProfilePage" />
<ChartErrorBoundary chartName="MonthlyRevenueChart" />
<DataErrorBoundary operationName="FetchUserAnalytics" />

// Avoid - too generic
<ErrorBoundary name="Page" />
<ChartErrorBoundary chartName="Chart" />
<DataErrorBoundary operationName="Data" />
```

## Testing Error Boundaries

Create a test component that throws on demand:

```tsx
function TestErrorComponent() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('Test error');
  }

  return (
    <button onClick={() => setShouldThrow(true)}>
      Throw Error
    </button>
  );
}

// Usage in development
<ErrorBoundary name="Test">
  <TestErrorComponent />
</ErrorBoundary>
```

## Development Tips

### Enable Detailed Logging

```tsx
import { logger, LogLevel } from '@/lib/logger';

// In development
logger.setLogLevel(LogLevel.DEBUG);
```

### View Error in Console

Check browser console for detailed error logs prefixed with:
- `[ErrorBoundary]` - Main boundary
- `[ChartErrorBoundary]` - Chart boundary
- `[DataErrorBoundary]` - Data boundary
- `[GameErrorBoundary]` - Game boundary

### Check Retry Behavior

The UI shows:
- `Retry attempts: 1` - Current retry count
- `Maximum retries reached` - When limit exceeded
- `Attempting to recover...` - During recovery

## Troubleshooting

### Errors Not Being Caught

Error boundaries only catch:
- Render-time errors
- Constructor errors
- Lifecycle method errors

They DON'T catch:
- Event handler errors → use try/catch
- Async errors → use try/catch or .catch()
- Promise rejections → use window.unhandledrejection event

### Solution for Event Handlers

```tsx
const handleClick = async () => {
  try {
    await riskyOperation();
  } catch (error) {
    // Will be caught by error boundary
    throw error;
  }
};
```

### Disabling Auto-Recovery

```tsx
<ErrorBoundary name="Component" allowAutoRecovery={false}>
  <Component />
</ErrorBoundary>
```

### Increasing Max Retries

```tsx
<ErrorBoundary name="Component" maxRetries={10}>
  <Component />
</ErrorBoundary>
```

### Hiding Development Details

```tsx
// In production, dev details are automatically hidden
// In development, use this to test production behavior
const isDev = false; // Override for testing
```

## Performance Tips

1. **Avoid Deep Nesting** - Only use 2-3 levels of boundaries
2. **Use Specialized Boundaries** - More granular error handling
3. **Memoize Children** - Use React.memo on expensive children
4. **Lazy Load Heavy Components** - With Suspense
5. **Monitor Retry Patterns** - Disable auto-recovery if retrying too much

## Integration Checklist

- [ ] Add ErrorBoundary to app root
- [ ] Add ErrorBoundary to main routes/pages
- [ ] Add ChartErrorBoundary to chart components
- [ ] Add DataErrorBoundary to data operations
- [ ] Add GameErrorBoundary to game components
- [ ] Test error UI in development
- [ ] Verify error logging in console
- [ ] Check recovery behavior
- [ ] Test in production (if applicable)

## Resources

- **Full Guide:** `/home/user/kreativium-analytics/src/lib/ERROR_BOUNDARY_GUIDE.md`
- **Summary:** `/home/user/kreativium-analytics/ERROR_BOUNDARY_ENHANCEMENT_SUMMARY.md`
- **Error Recovery:** `/home/user/kreativium-analytics/src/lib/errorRecovery.ts`

## Questions?

Check the full guide or error logs for:
- Detailed error type information
- Recovery strategy details
- Logging context
- Development error stacks

---

**Remember:** Error boundaries are your safety net. Use them strategically for a robust, user-friendly application.
