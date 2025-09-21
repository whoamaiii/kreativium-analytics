import { toast } from 'sonner';
import { logger } from './logger';
import {
  AppError,
  ErrorType,
  SensoryCompassError,
  isAppError,
  isSensoryCompassError,
  ErrorRecoveryStrategy,
  storageQuotaRecoveryStrategy,
} from '@/types/errors';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  throwError?: boolean;
  onError?: (error: AppError) => void;
  onRetry?: () => void | Promise<void>;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private recoveryStrategies: ErrorRecoveryStrategy[] = [
    storageQuotaRecoveryStrategy,
  ];
  private errorQueue: AppError[] = [];
  private isProcessing = false;

  private constructor() {
    // Set up global error handlers
    this.setupGlobalHandlers();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private setupGlobalHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      event.preventDefault();
      this.handle(event.reason);
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      event.preventDefault();
      this.handle(event.error);
    });
  }

  /**
   * Register a recovery strategy
   */
  registerRecoveryStrategy(strategy: ErrorRecoveryStrategy) {
    this.recoveryStrategies.push(strategy);
  }

  /**
   * Main error handling method
   */
  async handle(error: unknown, options: ErrorHandlerOptions = {}): Promise<void> {
    const {
      showToast = true,
      logError = true,
      throwError = false,
      onError,
    } = options;

    // Convert to AppError if needed
    const appError = this.normalizeError(error);

    // Add to error queue
    this.errorQueue.push(appError);

    // Log the error
    if (logError) {
      this.logError(appError);
    }

    // Show toast notification
    if (showToast) {
      this.showErrorToast(appError, options);
    }

    // Call custom error handler
    if (onError) {
      try {
        onError(appError);
      } catch (callbackError) {
        logger.error('Error in custom error handler', callbackError);
      }
    }

    // Process error queue (including recovery attempts)
    await this.processErrorQueue();

    // Re-throw if requested
    if (throwError) {
      throw appError;
    }
  }

  /**
   * Convert various error types to AppError
   */
  private normalizeError(error: unknown): AppError {
    // Already an AppError
    if (isAppError(error)) {
      return error;
    }

    // SensoryCompassError
    if (isSensoryCompassError(error)) {
      return error;
    }

    // Standard Error
    if (error instanceof Error) {
      return new SensoryCompassError(
        ErrorType.UNKNOWN_ERROR,
        error.message,
        {
          cause: error,
          details: { originalError: error },
        }
      );
    }

    // String error
    if (typeof error === 'string') {
      return new SensoryCompassError(ErrorType.UNKNOWN_ERROR, error);
    }

    // Unknown error type
    return new SensoryCompassError(
      ErrorType.UNKNOWN_ERROR,
      'An unknown error occurred',
      {
        details: { originalError: error },
      }
    );
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: AppError) {
    const logData = {
      type: error.type,
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: error.timestamp,
      recoverable: error.recoverable,
      stack: error.stack,
    };

    // Log based on error severity
    switch (error.type) {
      case ErrorType.DATA_CORRUPTED:
      case ErrorType.UNAUTHORIZED:
        logger.error('Critical error occurred', logData);
        break;
      case ErrorType.NETWORK_ERROR:
      case ErrorType.TIMEOUT_ERROR:
        logger.warn('Network error occurred', logData);
        break;
      default:
        logger.error('Application error', logData);
    }
  }

  /**
   * Show user-friendly error toast
   */
  private showErrorToast(error: AppError, options?: ErrorHandlerOptions) {
    const { userMessage, recoverable } = error;

    toast.error(userMessage || 'An error occurred', {
      description: recoverable
        ? 'The application will attempt to recover automatically.'
        : 'Please refresh the page or contact support if the issue persists.',
      duration: recoverable ? 5000 : 10000,
      action: recoverable
        ? {
            label: 'Retry',
            onClick: async () => {
              try {
                if (options?.onRetry) {
                  await options.onRetry();
                } else {
                  await this.attemptRecovery(error);
                }
              } catch (e) {
                logger.error('Retry handler failed', e as Error);
              }
            },
          }
        : {
            label: 'Refresh',
            onClick: () => window.location.reload(),
          },
    });
  }

  /**
   * Process queued errors and attempt recovery
   */
  private async processErrorQueue() {
    if (this.isProcessing || this.errorQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.errorQueue.length > 0) {
      const error = this.errorQueue.shift()!;
      await this.attemptRecovery(error);
    }

    this.isProcessing = false;
  }

  /**
   * Attempt to recover from an error
   */
  private async attemptRecovery(error: AppError): Promise<boolean> {
    if (!error.recoverable) {
      return false;
    }

    // Find applicable recovery strategies
    const applicableStrategies = this.recoveryStrategies.filter((strategy) =>
      strategy.canRecover(error)
    );

    // Attempt recovery with each strategy
    for (const strategy of applicableStrategies) {
      try {
        await strategy.recover(error);
        toast.success('Issue resolved', {
          description: 'The application has recovered from the error.',
        });
        return true;
      } catch (recoveryError) {
        logger.error('Recovery strategy failed', {
          strategy,
          originalError: error,
          recoveryError,
        });
      }
    }

    return false;
  }

  /**
   * Clear error queue
   */
  clearErrorQueue() {
    this.errorQueue = [];
  }

  /**
   * Get current error queue
   */
  getErrorQueue(): ReadonlyArray<AppError> {
    return [...this.errorQueue];
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Convenience functions
export const handleError = (
  error: unknown,
  options?: ErrorHandlerOptions
): Promise<void> => {
  return errorHandler.handle(error, options);
};

 

// React error boundary integration
export const handleErrorBoundaryError = (
  error: Error,
  errorInfo: React.ErrorInfo
): void => {
  const appError = new SensoryCompassError(
    ErrorType.UNKNOWN_ERROR,
    `React component error: ${error.message}`,
    {
      code: 'REACT_ERROR',
      details: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
      cause: error,
      recoverable: false,
    }
  );

  errorHandler.handle(appError, {
    showToast: true,
    logError: true,
    throwError: false,
  });
};
