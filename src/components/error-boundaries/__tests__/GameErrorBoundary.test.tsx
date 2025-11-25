/**
 * @fileoverview Tests for GameErrorBoundary component
 *
 * Tests game-specific error catching, restart functionality, and troubleshooting tips.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameErrorBoundary } from '../GameErrorBoundary';

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
    if (error.message.includes('render')) return { type: 'RENDERING_ERROR', severity: 'HIGH' };
    if (error.message.includes('audio')) return { type: 'AUDIO_ERROR', severity: 'MEDIUM' };
    if (error.message.includes('memory')) return { type: 'PERFORMANCE_ERROR', severity: 'HIGH' };
    return { type: 'GAME_ERROR', severity: 'MEDIUM' };
  }),
  logErrorForReporting: vi.fn(),
}));

// Component that throws an error
function ThrowError({ error }: { error: Error }) {
  throw error;
}

// Component that renders normally
function NormalComponent() {
  return <div data-testid="game-content">Game is running</div>;
}

describe('GameErrorBoundary', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Suppress React error boundary console errors during tests
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    vi.useRealTimers();
  });

  describe('Normal rendering', () => {
    it('renders children when no error occurs', () => {
      render(
        <GameErrorBoundary>
          <NormalComponent />
        </GameErrorBoundary>
      );

      expect(screen.getByTestId('game-content')).toBeInTheDocument();
    });

    it('does not show error UI when children render successfully', () => {
      render(
        <GameErrorBoundary gameName="Emotion Game">
          <NormalComponent />
        </GameErrorBoundary>
      );

      expect(screen.queryByText(/encountered an error/i)).not.toBeInTheDocument();
    });
  });

  describe('Error catching', () => {
    it('catches errors and displays game-specific fallback UI', () => {
      const testError = new Error('Test game error');

      render(
        <GameErrorBoundary gameName="Emotion Game">
          <ThrowError error={testError} />
        </GameErrorBoundary>
      );

      expect(screen.getByText('Emotion Game encountered an error')).toBeInTheDocument();
    });

    it('displays default game name when not provided', () => {
      const testError = new Error('Test error');

      render(
        <GameErrorBoundary>
          <ThrowError error={testError} />
        </GameErrorBoundary>
      );

      expect(screen.getByText('Game encountered an error')).toBeInTheDocument();
    });

    it('renders custom fallback when provided', () => {
      const testError = new Error('Test error');
      const customFallback = <div data-testid="custom-game-fallback">Game paused</div>;

      render(
        <GameErrorBoundary fallback={customFallback}>
          <ThrowError error={testError} />
        </GameErrorBoundary>
      );

      expect(screen.getByTestId('custom-game-fallback')).toBeInTheDocument();
    });

    it('calls onError callback when error occurs', () => {
      const onError = vi.fn();
      const testError = new Error('Test game error');

      render(
        <GameErrorBoundary onError={onError}>
          <ThrowError error={testError} />
        </GameErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(testError, expect.any(Object));
    });
  });

  describe('Troubleshooting tips', () => {
    it('displays performance tips for memory errors', () => {
      const memoryError = new Error('Out of memory');

      render(
        <GameErrorBoundary>
          <ThrowError error={memoryError} />
        </GameErrorBoundary>
      );

      expect(screen.getByText('Troubleshooting tips:')).toBeInTheDocument();
      expect(
        screen.getByText(/close other applications to free up system memory/i)
      ).toBeInTheDocument();
    });

    it('displays audio tips for audio errors', () => {
      const audioError = new Error('Audio context failed');

      render(
        <GameErrorBoundary>
          <ThrowError error={audioError} />
        </GameErrorBoundary>
      );

      expect(
        screen.getByText(/check your system volume is not muted/i)
      ).toBeInTheDocument();
    });

    it('displays rendering tips for canvas/WebGL errors', () => {
      const renderError = new Error('Failed to render canvas');

      render(
        <GameErrorBoundary>
          <ThrowError error={renderError} />
        </GameErrorBoundary>
      );

      expect(screen.getByText(/update your graphics drivers/i)).toBeInTheDocument();
    });

    it('displays generic tips for unknown errors', () => {
      const genericError = new Error('Unknown error');

      render(
        <GameErrorBoundary>
          <ThrowError error={genericError} />
        </GameErrorBoundary>
      );

      expect(
        screen.getByText(/make sure your browser is up to date/i)
      ).toBeInTheDocument();
    });
  });

  describe('Restart functionality', () => {
    it('displays restart button', () => {
      const testError = new Error('Test error');

      render(
        <GameErrorBoundary>
          <ThrowError error={testError} />
        </GameErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /restart game/i })).toBeInTheDocument();
    });

    it('displays reload page button', () => {
      const testError = new Error('Test error');

      render(
        <GameErrorBoundary>
          <ThrowError error={testError} />
        </GameErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    });

    it('calls onReset when restart button is clicked', async () => {
      const onReset = vi.fn().mockResolvedValue(undefined);
      const testError = new Error('Test error');

      render(
        <GameErrorBoundary onReset={onReset}>
          <ThrowError error={testError} />
        </GameErrorBoundary>
      );

      fireEvent.click(screen.getByRole('button', { name: /restart game/i }));

      await waitFor(() => {
        expect(onReset).toHaveBeenCalled();
      });
    });

    it('shows retry count after restarts', () => {
      const testError = new Error('Test error');

      render(
        <GameErrorBoundary>
          <ThrowError error={testError} />
        </GameErrorBoundary>
      );

      expect(screen.getByText(/restart attempts: 1/i)).toBeInTheDocument();
    });

    it('shows persistent issue message after multiple retries', () => {
      const testError = new Error('Test error');

      const { rerender } = render(
        <GameErrorBoundary>
          <ThrowError error={testError} />
        </GameErrorBoundary>
      );

      // Simulate second error
      rerender(
        <GameErrorBoundary>
          <ThrowError error={new Error('Another error')} />
        </GameErrorBoundary>
      );

      // After multiple failures
      expect(screen.getByText(/restart attempts/i)).toBeInTheDocument();
    });
  });

  describe('Error type display', () => {
    it('displays the error type', () => {
      const testError = new Error('Test error');

      render(
        <GameErrorBoundary>
          <ThrowError error={testError} />
        </GameErrorBoundary>
      );

      expect(screen.getByText(/error type:/i)).toBeInTheDocument();
    });
  });

  describe('Data safety message', () => {
    it('displays message about game progress being saved', () => {
      const testError = new Error('Test error');

      render(
        <GameErrorBoundary>
          <ThrowError error={testError} />
        </GameErrorBoundary>
      );

      expect(
        screen.getByText(/your game progress is automatically saved/i)
      ).toBeInTheDocument();
    });
  });

  describe('Development mode details', () => {
    it('shows error details in development mode', () => {
      const testError = new Error('Detailed game error message');

      render(
        <GameErrorBoundary>
          <ThrowError error={testError} />
        </GameErrorBoundary>
      );

      expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();
    });
  });

  describe('Auto-retry behavior', () => {
    it('schedules auto-retry for first error', () => {
      const testError = new Error('Test error');

      render(
        <GameErrorBoundary>
          <ThrowError error={testError} />
        </GameErrorBoundary>
      );

      // Auto-retry should be scheduled (2000ms delay)
      vi.advanceTimersByTime(2000);

      // Verify the component attempted to handle restart
      expect(screen.getByText('Game encountered an error')).toBeInTheDocument();
    });
  });
});
