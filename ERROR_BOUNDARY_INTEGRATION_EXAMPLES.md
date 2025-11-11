# Error Boundary Integration Examples

Complete, production-ready examples for implementing the enhanced error boundary architecture.

## Example 1: Full App Integration

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { logger } from '@/lib/logger';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <ErrorBoundary
      name="ApplicationRoot"
      maxRetries={5}
      showToast={true}
      onError={(error, errorInfo) => {
        logger.error('[App] Caught error in root boundary', {
          error: error.message,
          componentStack: errorInfo.componentStack,
        });
      }}
      onRecovered={() => {
        logger.info('[App] Application recovered from error');
      }}
    >
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
```

## Example 2: Page-Level Error Boundary

```tsx
// src/pages/Dashboard.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ChartErrorBoundary } from '@/components/error-boundaries';
import { DataErrorBoundary } from '@/components/error-boundaries';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { StudentStats } from '@/components/dashboard/StudentStats';
import { RecentActivity } from '@/components/dashboard/RecentActivity';

export function Dashboard() {
  return (
    <ErrorBoundary
      name="Dashboard"
      maxRetries={3}
      onRecovered={() => {
        // Optionally refetch dashboard data
        window.dispatchEvent(new CustomEvent('dashboardRecovered'));
      }}
    >
      <div className="space-y-6">
        <h1>Dashboard</h1>

        {/* Charts section with specialized boundary */}
        <ChartErrorBoundary chartName="AnalyticsOverview">
          <DashboardCharts />
        </ChartErrorBoundary>

        {/* Statistics with data boundary */}
        <DataErrorBoundary operationName="StudentStats" showNetworkStatus={true}>
          <StudentStats />
        </DataErrorBoundary>

        {/* Activity feed with error handling */}
        <ErrorBoundary name="ActivityFeed" maxRetries={2}>
          <RecentActivity />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
}
```

## Example 3: Data-Intensive Component

```tsx
// src/components/StudentAnalytics.tsx
import { useEffect, useState } from 'react';
import { DataErrorBoundary } from '@/components/error-boundaries';
import { logger } from '@/lib/logger';
import { logErrorForReporting } from '@/lib/errorRecovery';

function StudentAnalyticsContent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/analytics');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();
        setData(json);
      } catch (error) {
        logger.error('Failed to fetch analytics', error);
        // Re-throw so error boundary catches it
        throw error;
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data available</div>;

  return <div className="analytics-content">{/* Content */}</div>;
}

export function StudentAnalytics() {
  return (
    <DataErrorBoundary
      operationName="StudentAnalytics"
      onRetry={async () => {
        // Custom retry that clears cache first
        localStorage.removeItem('analytics_cache');
        window.location.reload();
      }}
      showNetworkStatus={true}
    >
      <StudentAnalyticsContent />
    </DataErrorBoundary>
  );
}
```

## Example 4: Chart Component with Multiple Visualizations

```tsx
// src/components/analytics/AnalyticsCharts.tsx
import { ChartErrorBoundary } from '@/components/error-boundaries';
import { RevenueChart } from './charts/RevenueChart';
import { TrendChart } from './charts/TrendChart';
import { ComparisonChart } from './charts/ComparisonChart';

export function AnalyticsCharts({ data }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Each chart has its own error boundary */}
      <ChartErrorBoundary chartName="RevenueChart" showSuggestions={true}>
        <RevenueChart data={data.revenue} />
      </ChartErrorBoundary>

      <ChartErrorBoundary chartName="TrendChart" showSuggestions={true}>
        <TrendChart data={data.trends} />
      </ChartErrorBoundary>

      <ChartErrorBoundary
        chartName="ComparisonChart"
        showSuggestions={true}
        fallback={
          <div className="p-4 bg-muted rounded">
            <p>Comparison chart failed to load</p>
            <p className="text-sm text-muted-foreground">This may be due to large dataset</p>
          </div>
        }
      >
        <ComparisonChart data={data.comparison} />
      </ChartErrorBoundary>
    </div>
  );
}
```

## Example 5: Game Component with Recovery

```tsx
// src/pages/GamePage.tsx
import { useState, useRef } from 'react';
import { GameErrorBoundary } from '@/components/error-boundaries';
import { GameEngine } from '@/components/game/GameEngine';
import { GameManager } from '@/lib/game/GameManager';

export function GamePage() {
  const gameManagerRef = useRef(new GameManager());
  const [gameKey, setGameKey] = useState(0);

  const handleGameReset = async () => {
    try {
      // Reset game state
      await gameManagerRef.current.reset();

      // Reinitialize with fresh state
      setGameKey((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to reset game:', error);
      throw error;
    }
  };

  return (
    <div className="game-page">
      <h1>Sensory Game</h1>

      <GameErrorBoundary
        key={gameKey}
        gameName="SensoryGame"
        onReset={handleGameReset}
        onError={(error, errorInfo) => {
          console.error('Game error:', error);
          console.error('Component stack:', errorInfo.componentStack);
        }}
      >
        <GameEngine
          gameManager={gameManagerRef.current}
          onGameEnd={() => {
            console.log('Game completed successfully');
          }}
        />
      </GameErrorBoundary>
    </div>
  );
}
```

## Example 6: Nested Boundaries for Complex Pages

```tsx
// src/pages/StudentProfile.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DataErrorBoundary } from '@/components/error-boundaries';
import { ChartErrorBoundary } from '@/components/error-boundaries';

export function StudentProfile({ studentId }) {
  return (
    <ErrorBoundary name="StudentProfile" maxRetries={4}>
      <div className="space-y-6">
        {/* Student Info Section */}
        <DataErrorBoundary operationName="StudentInfo">
          <StudentInfoSection studentId={studentId} />
        </DataErrorBoundary>

        {/* Progress Section with Charts */}
        <ErrorBoundary name="ProgressSection">
          <h2>Progress</h2>

          <ChartErrorBoundary chartName="ProgressChart">
            <ProgressChart studentId={studentId} />
          </ChartErrorBoundary>

          <DataErrorBoundary operationName="ProgressMetrics">
            <ProgressMetrics studentId={studentId} />
          </DataErrorBoundary>
        </ErrorBoundary>

        {/* Recommendations Section */}
        <DataErrorBoundary operationName="Recommendations">
          <RecommendationsSection studentId={studentId} />
        </DataErrorBoundary>
      </div>
    </ErrorBoundary>
  );
}
```

## Example 7: With Error Tracking Integration

```tsx
// src/pages/Reports.tsx
import { useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DataErrorBoundary } from '@/components/error-boundaries';
import { logger } from '@/lib/logger';
import { logErrorForReporting } from '@/lib/errorRecovery';

export function Reports() {
  useEffect(() => {
    // Log page view for error tracking
    logger.info('[Reports] Page loaded');

    return () => {
      logger.info('[Reports] Page unmounted');
    };
  }, []);

  return (
    <ErrorBoundary
      name="ReportsPage"
      maxRetries={3}
      onError={(error, errorInfo) => {
        // Log detailed error for monitoring
        logErrorForReporting(error, {
          page: 'Reports',
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        });
      }}
      onRecovered={() => {
        logger.info('[Reports] Page recovered after error');
      }}
    >
      <div className="reports-page">
        <h1>Reports</h1>

        <DataErrorBoundary
          operationName="GenerateReport"
          onRetry={async () => {
            // Fetch fresh data
            const response = await fetch('/api/reports/generate');
            return response.json();
          }}
        >
          <ReportGenerator />
        </DataErrorBoundary>
      </div>
    </ErrorBoundary>
  );
}
```

## Example 8: Custom Error Handling with Recovery Strategy

```tsx
// src/hooks/useErrorRecovery.ts
import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import { errorHandler, ErrorHandlerOptions } from '@/lib/errorHandler';
import { getRetryStrategy } from '@/lib/errorRecovery';

export function useErrorRecovery() {
  const handleError = useCallback(async (error: Error, options?: ErrorHandlerOptions) => {
    const strategy = getRetryStrategy(error);

    if (strategy.shouldRetry) {
      logger.info('Error is retryable, scheduling retry', {
        errorMessage: error.message,
        maxAttempts: strategy.maxAttempts,
        delayMs: strategy.delayMs,
      });

      let attempt = 0;
      while (attempt < strategy.maxAttempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, strategy.delayMs * Math.pow(strategy.backoffMultiplier, attempt)),
        );

        try {
          await errorHandler.handle(error, options);
          return true;
        } catch (err) {
          attempt++;
          if (attempt >= strategy.maxAttempts) {
            logger.error('Max retry attempts reached', { error });
            throw err;
          }
        }
      }
    }

    return false;
  }, []);

  return { handleError };
}

// Usage in component
function MyComponent() {
  const { handleError } = useErrorRecovery();

  const riskyOperation = async () => {
    try {
      await someAsyncOperation();
    } catch (error) {
      await handleError(error as Error, {
        showToast: true,
        logError: true,
      });
    }
  };

  return <button onClick={riskyOperation}>Perform Operation</button>;
}
```

## Example 9: API Request Wrapper with Error Handling

```tsx
// src/lib/api/client.ts
import { logger } from '@/lib/logger';
import { classifyError, logErrorForReporting } from '@/lib/errorRecovery';

export async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const startTime = Date.now();

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `HTTP ${response.status}`);

      logErrorForReporting(error, {
        url,
        status: response.status,
        method: options?.method || 'GET',
      });

      throw error;
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    logger.debug(`[API] ${options?.method || 'GET'} ${url}`, {
      status: response.status,
      duration,
    });

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    const classification = classifyError(error);

    logger.error(`[API] Request failed: ${url}`, {
      method: options?.method || 'GET',
      duration,
      errorType: classification.type,
      isRecoverable: classification.isRecoverable,
    });

    // Let error propagate to error boundary
    throw error;
  }
}

// Usage in DataErrorBoundary
function StudentsList() {
  return (
    <DataErrorBoundary
      operationName="FetchStudents"
      onRetry={async () => {
        return apiRequest('/api/students');
      }}
    >
      <StudentListContent />
    </DataErrorBoundary>
  );
}
```

## Example 10: Development Testing Component

```tsx
// src/components/dev/ErrorBoundaryTester.tsx
import { useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';

// Component that throws errors for testing
function TestErrorComponent({ errorType }: { errorType: string }) {
  const [throwError, setThrowError] = useState(false);

  if (throwError) {
    switch (errorType) {
      case 'network':
        throw new Error('Failed to fetch from API endpoint');
      case 'storage':
        throw new Error('QuotaExceededError: DOM Exception 22');
      case 'rendering':
        throw new Error('Error rendering component canvas');
      case 'validation':
        throw new Error('Validation failed for field "email"');
      case 'timeout':
        throw new Error('Operation timeout after 30000ms');
      case 'generic':
      default:
        throw new Error('Generic test error');
    }
  }

  return <Button onClick={() => setThrowError(true)}>Throw {errorType} Error</Button>;
}

export function ErrorBoundaryTester() {
  const errorTypes = ['network', 'storage', 'rendering', 'validation', 'timeout', 'generic'];

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-bold">Error Boundary Tester</h2>
      <p className="text-sm text-muted-foreground">
        Click buttons below to test different error types
      </p>

      <div className="grid grid-cols-2 gap-2">
        {errorTypes.map((type) => (
          <ErrorBoundary key={type} name={`Test-${type}`} maxRetries={2}>
            <TestErrorComponent errorType={type} />
          </ErrorBoundary>
        ))}
      </div>
    </div>
  );
}
```

## File Organization Summary

```
src/
├── components/
│   ├── ErrorBoundary.tsx (main boundary)
│   └── error-boundaries/
│       ├── index.ts
│       ├── ChartErrorBoundary.tsx
│       ├── DataErrorBoundary.tsx
│       └── GameErrorBoundary.tsx
├── lib/
│   ├── errorRecovery.ts (utilities)
│   ├── errorHandler.ts (existing)
│   ├── logger.ts (existing)
│   └── ERROR_BOUNDARY_GUIDE.md (docs)
└── pages/
    └── [Your pages using boundaries]

Root/
├── ERROR_BOUNDARY_ENHANCEMENT_SUMMARY.md
├── ERROR_BOUNDARY_QUICK_START.md
└── ERROR_BOUNDARY_INTEGRATION_EXAMPLES.md (this file)
```

## Testing Checklist

- [ ] App starts without errors
- [ ] ErrorBoundary catches render errors
- [ ] Retry mechanism works
- [ ] Custom messages display correctly
- [ ] Suggestions appear for known error types
- [ ] Callbacks (`onError`, `onRecovered`) fire
- [ ] No memory leaks on unmount
- [ ] Nested boundaries isolate errors correctly
- [ ] Online/offline detection works (DataErrorBoundary)
- [ ] Development error details show (if DEV)

## Production Checklist

- [ ] Remove test error components
- [ ] Verify error reporting is configured
- [ ] Disable development error details in production
- [ ] Test with real error scenarios
- [ ] Monitor error logs
- [ ] Verify user messages are friendly
- [ ] Check performance impact
- [ ] Test on target browsers
- [ ] Verify accessibility
- [ ] Document any custom recovery strategies

These examples provide a complete foundation for implementing robust error handling throughout your
application.
