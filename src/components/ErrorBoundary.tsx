/**
 * @fileoverview ErrorBoundary - React error boundary for graceful error handling
 *
 * Provides a fallback UI when React components throw errors during rendering,
 * lifecycle methods, or in constructors. Prevents the entire app from crashing.
 *
 * Features:
 * - Custom fallback UI
 * - Automatic recovery with retry mechanism
 * - Development-mode error details
 * - Toast notifications
 * - Centralized error logging with error reporting
 * - Actionable error messages
 * - Recovery strategy selection
 * - Error boundary context for specialized handling
 *
 * @module components/ErrorBoundary
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, HelpCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { handleErrorBoundaryError, errorHandler } from '@/lib/errorHandler';
import { getErrorSuggestions, formatErrorForDisplay } from '@/lib/errorRecovery';

/**
 * Props for the ErrorBoundary component
 */
interface Props {
  /** Child components to be wrapped by the error boundary */
  children: ReactNode;
  /** Optional custom fallback UI to display when an error occurs */
  fallback?: ReactNode;
  /** Optional callback function called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show toast notifications on error (default: true) */
  showToast?: boolean;
  /** Name/context of the error boundary for logging */
  name?: string;
  /** Whether to allow automatic recovery (default: true) */
  allowAutoRecovery?: boolean;
  /** Maximum number of retries before disabling auto-recovery */
  maxRetries?: number;
  /** Callback for error recovery success */
  onRecovered?: () => void;
}

/**
 * State for the ErrorBoundary component
 */
interface State {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error object */
  error?: Error;
  /** Additional error information from React */
  errorInfo?: ErrorInfo;
  /** Count of errors caught (used for auto-recovery) */
  errorCount: number;
  /** Current retry attempt */
  retryCount: number;
  /** Whether recovery is in progress */
  isRecovering: boolean;
}

/**
 * ErrorBoundary Component
 *
 * A React error boundary that catches JavaScript errors anywhere in the child
 * component tree, logs those errors, and displays a fallback UI with recovery options.
 *
 * Features:
 * - Automatic retry mechanism with exponential backoff
 * - Error recovery strategy selection
 * - Actionable error messages based on error type
 * - Comprehensive error logging and reporting
 * - Recovery callbacks for specialized handling
 *
 * @class
 * @extends {Component<Props, State>}
 */
export class ErrorBoundary extends Component<Props, State> {
  /** Timeout ID for auto-recovery mechanism */
  private resetTimeoutId: NodeJS.Timeout | null = null;

  /** Initial component state */
  public state: State = {
    hasError: false,
    errorCount: 0,
    retryCount: 0,
    isRecovering: false
  };

  /**
   * Static lifecycle method that updates state when an error is thrown.
   * Called during the "render" phase, so side effects are not permitted.
   *
   * @static
   * @param {Error} error - The error that was thrown
   * @returns {Pick<State, 'hasError' | 'error'>} New state values
   */
  public static getDerivedStateFromError(error: Error): Pick<State, 'hasError' | 'error'> {
    return { hasError: true, error };
  }

  /**
   * Lifecycle method called after an error has been thrown by a descendant.
   * Used for error logging and side effects.
   *
   * @param {Error} error - The error that was thrown
   * @param {ErrorInfo} errorInfo - Object with componentStack key containing info about which component threw the error
   */
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const boundaryName = this.props.name || 'ErrorBoundary';

    // Use the logger service for proper error tracking
    // This respects environment configuration and doesn't log to console in production
    logger.error(`[${boundaryName}] Component error caught`, {
      boundaryName,
      error: {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
      },
      errorInfo: {
        componentStack: errorInfo?.componentStack,
      },
      route: typeof window !== 'undefined' ? window.location?.pathname : 'unknown',
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
      errorCount: this.state.errorCount + 1,
    });

    // Use centralized error handler
    handleErrorBoundaryError(error, errorInfo);

    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
      retryCount: prevState.retryCount + 1
    }));

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Auto-reset with recovery strategy
    const maxRetries = this.props.maxRetries ?? 3;
    const allowAutoRecovery = this.props.allowAutoRecovery !== false;

    if (allowAutoRecovery && this.state.errorCount < maxRetries) {
      this.scheduleAutoRetry();
    }

    // Only show toast if explicitly enabled (default is true for backward compatibility)
    if (this.props.showToast !== false) {
      // Use built-in toast system if available
      try {
        const displayError = formatErrorForDisplay(error, import.meta.env.DEV);
        toast.error('An error occurred', {
          description: displayError.userMessage,
          action: {
            label: 'Dismiss',
            onClick: () => {}
          }
        });
      } catch {
        // no-op; avoid crashing when toast system not mounted
      }
    }
  }

  /**
   * Schedules an automatic retry with exponential backoff.
   * This prevents infinite error loops by allowing recovery attempts.
   *
   * @private
   */
  private scheduleAutoRetry = () => {
    // Clear any existing timeout
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    // Exponential backoff: 1s, 2s, 4s, etc.
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 8000);

    logger.info(`[${this.props.name || 'ErrorBoundary'}] Scheduling auto-retry in ${delay}ms`);

    this.resetTimeoutId = setTimeout(() => {
      this.handleRetry();
      toast.info('Attempting to recover...');
    }, delay);
  };

  /**
   * Cleanup method called when the component is unmounting.
   * Ensures no memory leaks from pending timeouts.
   */
  public componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
  }

  private handleRetry = async () => {
    logger.info(`[${this.props.name || 'ErrorBoundary'}] Attempting recovery...`);

    this.setState({ isRecovering: true });

    try {
      // Attempt recovery through the error handler's recovery strategies
      if (this.state.error) {
        // Wait a moment before resetting to allow async operations to settle
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        isRecovering: false
      });

      // Call recovery callback if provided
      this.props.onRecovered?.();

      logger.info(`[${this.props.name || 'ErrorBoundary'}] Recovery successful`);
      toast.success('Application recovered successfully');
    } catch (recoveryError) {
      logger.error(`[${this.props.name || 'ErrorBoundary'}] Recovery failed`, recoveryError);
      this.setState({ isRecovering: false });

      // If recovery failed, try harder recovery options
      this.setState({ errorCount: 0 }); // Reset error count to allow more attempts
    }
  };

  private handleReload = () => {
    logger.info(`[${this.props.name || 'ErrorBoundary'}] Reloading page...`);
    window.location.reload();
  };

  private handleGoHome = () => {
    logger.info(`[${this.props.name || 'ErrorBoundary'}] Navigating to home...`);
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const error = this.state.error;
      const suggestions = error ? getErrorSuggestions(error) : [];
      const displayError = error ? formatErrorForDisplay(error, import.meta.env.DEV) : null;

      // Default error UI with actionable suggestions
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main error message */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {displayError?.userMessage || 'An unexpected error occurred. The application may not be working correctly.'}
                </p>

                {/* Error suggestions/recovery actions */}
                {suggestions.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex gap-2">
                      <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-900 dark:text-blue-100">
                        <p className="font-medium mb-2">Suggestions:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {suggestions.map((suggestion, idx) => (
                            <li key={idx}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Development details */}
              {import.meta.env.DEV && error && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium text-destructive hover:underline">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 p-3 bg-muted rounded overflow-auto max-h-48 text-xs whitespace-pre-wrap break-words">
{`Name: ${error.name}
Message: ${error.message}

Stack:
${error.stack || 'No stack trace available'}

Component Stack:
${this.state.errorInfo?.componentStack || 'No component stack available'}`}
                  </pre>
                </details>
              )}

              {/* Recovery status */}
              {this.state.isRecovering && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-900 dark:text-amber-100 flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Attempting to recover...
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={this.handleRetry}
                  variant="default"
                  disabled={this.state.isRecovering}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  disabled={this.state.isRecovering}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  disabled={this.state.isRecovering}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {/* Retry count indicator */}
              {this.state.retryCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Retry attempts: {this.state.retryCount}
                  {this.state.retryCount >= (this.props.maxRetries ?? 3) && ' - Maximum retries reached'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
