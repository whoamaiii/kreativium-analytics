/**
 * @fileoverview Tests for DataErrorBoundary component
 *
 * Tests error catching, retry functionality, and recovery behavior.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataErrorBoundary } from '../DataErrorBoundary';

// Mock the toast hook
vi.mock('@/hooks/useToast', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock error recovery utilities
vi.mock('@/lib/errorRecovery', () => ({
  classifyError: vi.fn((error: Error) => {
    if (error.message.includes('network')) return { type: 'NETWORK_ERROR', severity: 'HIGH' };
    if (error.message.includes('storage')) return { type: 'STORAGE_ERROR', severity: 'MEDIUM' };
    if (error.message.includes('timeout')) return { type: 'TIMEOUT_ERROR', severity: 'MEDIUM' };
    return { type: 'UNKNOWN_ERROR', severity: 'LOW' };
  }),
  getErrorSuggestions: vi.fn(() => ['Try refreshing the page', 'Check your connection']),
  logErrorForReporting: vi.fn(),
}));

// Mock storage utilities
vi.mock('@/lib/storage/useStorageState', () => ({
  clearStorageKeys: vi.fn(),
}));

// Component that throws an error
function ThrowError({ error }: { error: Error }) {
  throw error;
}

// Component that renders normally
function NormalComponent() {
  return <div data-testid="normal-content">Normal content</div>;
}

describe('DataErrorBoundary', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress React error boundary console errors during tests
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('Normal rendering', () => {
    it('renders children when no error occurs', () => {
      render(
        <DataErrorBoundary>
          <NormalComponent />
        </DataErrorBoundary>
      );

      expect(screen.getByTestId('normal-content')).toBeInTheDocument();
    });

    it('does not show error UI when children render successfully', () => {
      render(
        <DataErrorBoundary operationName="Test operation">
          <NormalComponent />
        </DataErrorBoundary>
      );

      expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
    });
  });

  describe('Error catching', () => {
    it('catches errors and displays fallback UI', () => {
      const testError = new Error('Test error');

      render(
        <DataErrorBoundary operationName="Data loading">
          <ThrowError error={testError} />
        </DataErrorBoundary>
      );

      expect(screen.getByText('Data loading failed')).toBeInTheDocument();
    });

    it('displays default operation name when not provided', () => {
      const testError = new Error('Test error');

      render(
        <DataErrorBoundary>
          <ThrowError error={testError} />
        </DataErrorBoundary>
      );

      expect(screen.getByText('Data operation failed')).toBeInTheDocument();
    });

    it('renders custom fallback when provided', () => {
      const testError = new Error('Test error');
      const customFallback = <div data-testid="custom-fallback">Custom error UI</div>;

      render(
        <DataErrorBoundary fallback={customFallback}>
          <ThrowError error={testError} />
        </DataErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    });

    it('calls onError callback when error occurs', () => {
      const onError = vi.fn();
      const testError = new Error('Test error');

      render(
        <DataErrorBoundary onError={onError}>
          <ThrowError error={testError} />
        </DataErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(testError, expect.any(Object));
    });
  });

  describe('Error type handling', () => {
    it('displays network error message for network errors', () => {
      const networkError = new Error('network connection failed');

      render(
        <DataErrorBoundary>
          <ThrowError error={networkError} />
        </DataErrorBoundary>
      );

      expect(
        screen.getByText(/network connection error/i)
      ).toBeInTheDocument();
    });

    it('displays storage error message for storage errors', () => {
      const storageError = new Error('storage quota exceeded');

      render(
        <DataErrorBoundary>
          <ThrowError error={storageError} />
        </DataErrorBoundary>
      );

      expect(
        screen.getByText(/storage is full or unavailable/i)
      ).toBeInTheDocument();
    });

    it('displays timeout message for timeout errors', () => {
      const timeoutError = new Error('timeout exceeded');

      render(
        <DataErrorBoundary>
          <ThrowError error={timeoutError} />
        </DataErrorBoundary>
      );

      expect(screen.getByText(/operation took too long/i)).toBeInTheDocument();
    });
  });

  describe('Retry functionality', () => {
    it('displays retry button', () => {
      const testError = new Error('Test error');

      render(
        <DataErrorBoundary>
          <ThrowError error={testError} />
        </DataErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', async () => {
      const onRetry = vi.fn().mockResolvedValue(undefined);
      const testError = new Error('Test error');

      render(
        <DataErrorBoundary onRetry={onRetry}>
          <ThrowError error={testError} />
        </DataErrorBoundary>
      );

      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(onRetry).toHaveBeenCalled();
      });
    });

    it('shows retry count after retries', () => {
      const testError = new Error('Test error');

      render(
        <DataErrorBoundary>
          <ThrowError error={testError} />
        </DataErrorBoundary>
      );

      // After the initial error, retry count should be visible
      expect(screen.getByText(/retry attempts: 1\/3/i)).toBeInTheDocument();
    });
  });

  describe('Network status', () => {
    it('shows online status indicator by default', () => {
      const testError = new Error('Test error');

      render(
        <DataErrorBoundary>
          <ThrowError error={testError} />
        </DataErrorBoundary>
      );

      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('hides network status when showNetworkStatus is false', () => {
      const testError = new Error('Test error');

      render(
        <DataErrorBoundary showNetworkStatus={false}>
          <ThrowError error={testError} />
        </DataErrorBoundary>
      );

      expect(screen.queryByText('Online')).not.toBeInTheDocument();
      expect(screen.queryByText('Offline')).not.toBeInTheDocument();
    });
  });

  describe('Suggestions', () => {
    it('displays error suggestions', () => {
      const testError = new Error('Test error');

      render(
        <DataErrorBoundary>
          <ThrowError error={testError} />
        </DataErrorBoundary>
      );

      expect(screen.getByText('Suggestions:')).toBeInTheDocument();
      expect(screen.getByText('Try refreshing the page')).toBeInTheDocument();
    });
  });

  describe('Storage clearing', () => {
    it('shows clear storage button for storage errors', () => {
      const storageError = new Error('storage quota exceeded');

      render(
        <DataErrorBoundary>
          <ThrowError error={storageError} />
        </DataErrorBoundary>
      );

      expect(
        screen.getByRole('button', { name: /clear storage/i })
      ).toBeInTheDocument();
    });

    it('does not show clear storage button for non-storage errors', () => {
      const networkError = new Error('network failed');

      render(
        <DataErrorBoundary>
          <ThrowError error={networkError} />
        </DataErrorBoundary>
      );

      expect(
        screen.queryByRole('button', { name: /clear storage/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('Development mode details', () => {
    it('shows error details in development mode', () => {
      const testError = new Error('Test error with details');

      render(
        <DataErrorBoundary>
          <ThrowError error={testError} />
        </DataErrorBoundary>
      );

      // In dev mode, error details should be available
      expect(screen.getByText('Error Details')).toBeInTheDocument();
    });
  });
});
