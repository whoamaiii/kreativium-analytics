/**
 * @fileoverview ChartErrorBoundary - Specialized error boundary for chart rendering
 *
 * Catches errors during chart rendering and visualization to prevent the entire
 * dashboard from crashing. Provides chart-specific error handling and recovery.
 *
 * Features:
 * - Chart-specific error messages
 * - Fallback visualization options
 * - Data format validation suggestions
 * - Performance optimization tips
 * - Graceful degradation
 *
 * @module components/error-boundaries/ChartErrorBoundary
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, AlertTriangle, RefreshCw, Lightbulb } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { logErrorForReporting } from '@/lib/errorRecovery';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallback?: ReactNode;
  chartName?: string;
  showSuggestions?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

export class ChartErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  public state: State = {
    hasError: false,
    retryCount: 0
  };

  public static getDerivedStateFromError(error: Error): Pick<State, 'hasError' | 'error'> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const chartName = this.props.chartName || 'Chart';

    logger.error(`[ChartErrorBoundary] ${chartName} rendering failed`, {
      chartName,
      error: {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
      },
      errorInfo: {
        componentStack: errorInfo?.componentStack,
      },
      timestamp: new Date().toISOString(),
    });

    logErrorForReporting(error, {
      boundaryType: 'ChartErrorBoundary',
      chartName,
      componentStack: errorInfo?.componentStack
    });

    this.setState(prevState => ({
      error,
      errorInfo,
      retryCount: prevState.retryCount + 1
    }));

    this.props.onError?.(error, errorInfo);

    // Auto-retry after 3 seconds
    if (this.state.retryCount < 2) {
      this.resetTimeoutId = setTimeout(() => {
        this.handleRetry();
      }, 3000);
    }
  }

  public componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined
    });
    toast.info('Attempting to reload chart...');
  };

  private handleShowData = () => {
    toast.info('Check the browser console for data details');
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const chartName = this.props.chartName || 'Chart';

      return (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive text-base">
              <BarChart3 className="h-5 w-5" />
              Failed to render {chartName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The chart encountered an error while rendering. This might be due to invalid data or large datasets.
            </p>

            {this.props.showSuggestions !== false && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex gap-2">
                  <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <p className="font-medium mb-2">Troubleshooting tips:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Ensure your data is properly formatted</li>
                      <li>Try filtering the data to a smaller date range</li>
                      <li>Check that numeric values are valid numbers</li>
                      <li>Ensure category labels are not too long</li>
                      <li>Try with fewer data points</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {import.meta.env.DEV && this.state.error && (
              <details className="text-xs">
                <summary className="cursor-pointer font-medium text-destructive hover:underline">
                  Error Details
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-32 text-xs whitespace-pre-wrap">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button onClick={this.handleRetry} size="sm" variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button onClick={this.handleShowData} size="sm" variant="outline">
                Show Data
              </Button>
            </div>

            {this.state.retryCount >= 2 && (
              <p className="text-xs text-muted-foreground">
                Multiple retry attempts failed. Please check your data and refresh the page.
              </p>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
