/**
 * @fileoverview DataErrorBoundary - Specialized error boundary for data operations
 *
 * Catches errors during data fetching, processing, and storage operations.
 * Provides data-specific error handling with retry strategies and recovery options.
 *
 * Features:
 * - Network error handling with retry mechanism
 * - Storage quota error suggestions
 * - Data validation error messages
 * - Timeout handling
 * - Automatic recovery with exponential backoff
 * - Offline detection and handling
 *
 * @module components/error-boundaries/DataErrorBoundary
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Wifi, WifiOff, HardDrive, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { classifyError, getErrorSuggestions, logErrorForReporting } from '@/lib/errorRecovery';
import { clearStorageKeys } from '@/lib/storage/useStorageState';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => Promise<void>;
  fallback?: ReactNode;
  operationName?: string;
  showNetworkStatus?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  isRetrying: boolean;
  isOnline: boolean;
}

export class DataErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;
  private unsubscribeOnline: (() => void) | null = null;

  public state: State = {
    hasError: false,
    retryCount: 0,
    isRetrying: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
  };

  public static getDerivedStateFromError(error: Error): Pick<State, 'hasError' | 'error'> {
    return { hasError: true, error };
  }

  public componentDidMount() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const operationName = this.props.operationName || 'Data operation';
    const { type: errorType } = classifyError(error);

    logger.error(`[DataErrorBoundary] ${operationName} failed`, {
      operationName,
      errorType,
      error: {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
      },
      errorInfo: {
        componentStack: errorInfo?.componentStack,
      },
      isOnline: this.state.isOnline,
      timestamp: new Date().toISOString(),
    });

    logErrorForReporting(error, {
      boundaryType: 'DataErrorBoundary',
      operationName,
      errorType,
      isOnline: this.state.isOnline
    });

    this.setState(prevState => ({
      error,
      errorInfo,
      retryCount: prevState.retryCount + 1
    }));

    this.props.onError?.(error, errorInfo);

    // Auto-retry for transient errors
    if (this.shouldAutoRetry(error) && this.state.retryCount < 3) {
      const delay = this.getRetryDelay(this.state.retryCount);
      logger.info(`[DataErrorBoundary] Scheduling auto-retry in ${delay}ms`);

      this.resetTimeoutId = setTimeout(() => {
        this.handleRetry();
      }, delay);
    }
  }

  public componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  private shouldAutoRetry = (error: Error): boolean => {
    const { type } = classifyError(error);
    return ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'PROCESSING_ERROR'].includes(type);
  };

  private getRetryDelay = (retryCount: number): number => {
    // Exponential backoff: 1s, 2s, 4s, 8s
    return Math.min(1000 * Math.pow(2, retryCount), 8000);
  };

  private handleOnline = () => {
    logger.info('[DataErrorBoundary] Application is online');
    this.setState({ isOnline: true });
    // Auto-retry if we were offline
    if (this.state.hasError) {
      toast.info('Connection restored. Retrying...');
      setTimeout(() => this.handleRetry(), 500);
    }
  };

  private handleOffline = () => {
    logger.warn('[DataErrorBoundary] Application is offline');
    this.setState({ isOnline: false });
  };

  private handleRetry = async () => {
    const operationName = this.props.operationName || 'Data operation';

    logger.info(`[DataErrorBoundary] Attempting retry (attempt ${this.state.retryCount + 1})...`);

    this.setState({ isRetrying: true });

    try {
      if (this.props.onRetry) {
        await this.props.onRetry();
      }

      // Success - reset error state
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        isRetrying: false
      });

      logger.info(`[DataErrorBoundary] ${operationName} succeeded after retry`);
      toast.success('Operation succeeded');
    } catch (retryError) {
      logger.error(`[DataErrorBoundary] Retry failed`, retryError);

      this.setState({ isRetrying: false });

      if (this.state.retryCount >= 3) {
        toast.error('Maximum retry attempts reached. Please check your data and try again.');
      }
    }
  };

  private handleClearStorage = async () => {
    try {
      // Clear IndexedDB and localStorage
      if (typeof window !== 'undefined' && window.indexedDB) {
        const dbs = await window.indexedDB.databases();
        for (const db of dbs) {
          window.indexedDB.deleteDatabase(db.name);
        }
      }
      clearStorageKeys('');  // Clear all keys with empty prefix

      this.setState({ hasError: false, retryCount: 0 });
      toast.success('Storage cleared. Please refresh the page.');
      window.location.reload();
    } catch (err) {
      logger.error('[DataErrorBoundary] Failed to clear storage', err);
      toast.error('Failed to clear storage');
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const operationName = this.props.operationName || 'Data operation';
      const { type: errorType } = classifyError(this.state.error!);
      const suggestions = getErrorSuggestions(this.state.error!);

      const isNetworkError = errorType === 'NETWORK_ERROR';
      const isStorageError = errorType === 'STORAGE_ERROR';
      const isTimeoutError = errorType === 'TIMEOUT_ERROR';

      return (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive text-base">
              <AlertTriangle className="h-5 w-5" />
              {operationName} failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Network status indicator */}
            {this.props.showNetworkStatus !== false && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                {this.state.isOnline ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-muted-foreground">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm text-muted-foreground">Offline</span>
                  </>
                )}
              </div>
            )}

            {/* Error-specific messages */}
            <div>
              {isNetworkError && (
                <p className="text-sm text-muted-foreground">
                  Network connection error. Please check your internet connection.
                </p>
              )}
              {isStorageError && (
                <p className="text-sm text-muted-foreground">
                  Storage is full or unavailable. Consider clearing old data.
                </p>
              )}
              {isTimeoutError && (
                <p className="text-sm text-muted-foreground">
                  The operation took too long. Please try again with a smaller dataset.
                </p>
              )}
              {!isNetworkError && !isStorageError && !isTimeoutError && (
                <p className="text-sm text-muted-foreground">
                  An error occurred during data processing. Please try again.
                </p>
              )}
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">Suggestions:</p>
                <ul className="text-xs text-blue-900 dark:text-blue-100 space-y-1">
                  {suggestions.slice(0, 3).map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="flex-shrink-0">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Development details */}
            {import.meta.env.DEV && this.state.error && (
              <details className="text-xs">
                <summary className="cursor-pointer font-medium text-destructive hover:underline">
                  Error Details
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-40 text-xs whitespace-pre-wrap">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={this.handleRetry}
                size="sm"
                variant="default"
                disabled={this.state.isRetrying || !this.state.isOnline}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${this.state.isRetrying ? 'animate-spin' : ''}`} />
                {this.state.isRetrying ? 'Retrying...' : 'Retry'}
              </Button>

              {isStorageError && (
                <Button
                  onClick={this.handleClearStorage}
                  size="sm"
                  variant="outline"
                  disabled={this.state.isRetrying}
                >
                  <HardDrive className="h-4 w-4 mr-2" />
                  Clear Storage
                </Button>
              )}
            </div>

            {/* Retry status */}
            {this.state.retryCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Retry attempts: {this.state.retryCount}/3
              </p>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
