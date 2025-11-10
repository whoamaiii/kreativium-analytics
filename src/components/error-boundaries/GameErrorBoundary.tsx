/**
 * @fileoverview GameErrorBoundary - Specialized error boundary for game components
 *
 * Catches errors during game initialization, rendering, or gameplay.
 * Provides game-specific error handling with recovery and fallback options.
 *
 * Features:
 * - Game-specific error messages
 * - Performance issue detection
 * - Controller/input handling errors
 * - Audio/animation issues
 * - Game state recovery
 * - Graceful game restart
 *
 * @module components/error-boundaries/GameErrorBoundary
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Gamepad2, Volume2, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { classifyError, logErrorForReporting } from '@/lib/errorRecovery';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void | Promise<void>;
  fallback?: ReactNode;
  gameName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  isResetting: boolean;
}

export class GameErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  public state: State = {
    hasError: false,
    retryCount: 0,
    isResetting: false
  };

  public static getDerivedStateFromError(error: Error): Pick<State, 'hasError' | 'error'> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const gameName = this.props.gameName || 'Game';

    logger.error(`[GameErrorBoundary] ${gameName} error`, {
      gameName,
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
      boundaryType: 'GameErrorBoundary',
      gameName,
      componentStack: errorInfo?.componentStack
    });

    this.setState(prevState => ({
      error,
      errorInfo,
      retryCount: prevState.retryCount + 1
    }));

    this.props.onError?.(error, errorInfo);

    // Auto-retry for transient game errors
    if (this.state.retryCount < 2) {
      this.resetTimeoutId = setTimeout(() => {
        this.handleRestart();
      }, 2000);
    }
  }

  public componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private handleRestart = async () => {
    const gameName = this.props.gameName || 'Game';

    logger.info(`[GameErrorBoundary] Restarting ${gameName}...`);

    this.setState({ isResetting: true });

    try {
      if (this.props.onReset) {
        await this.props.onReset();
      }

      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        isResetting: false
      });

      logger.info(`[GameErrorBoundary] ${gameName} restarted successfully`);
      toast.success(`${gameName} restarted`);
    } catch (resetError) {
      logger.error(`[GameErrorBoundary] Failed to restart ${gameName}`, resetError);

      this.setState({ isResetting: false });

      if (this.state.retryCount >= 2) {
        toast.error('Failed to restart game. Please refresh the page.');
      }
    }
  };

  private getGameTroubleshootingTips = (): string[] => {
    const { error } = this.state;
    if (!error) return [];

    const errorMessage = error.message.toLowerCase();
    const tips: string[] = [];

    // Performance-related tips
    if (errorMessage.includes('performance') || errorMessage.includes('memory')) {
      tips.push('Close other applications to free up system memory');
      tips.push('Disable browser extensions that might interfere');
      tips.push('Try playing the game in fullscreen mode');
    }

    // Audio-related tips
    if (errorMessage.includes('audio') || errorMessage.includes('sound')) {
      tips.push('Check your system volume is not muted');
      tips.push('Verify speakers or headphones are properly connected');
      tips.push('Try disabling audio in game settings');
    }

    // Controller/input tips
    if (errorMessage.includes('controller') || errorMessage.includes('input') || errorMessage.includes('gamepad')) {
      tips.push('Reconnect your game controller or gamepad');
      tips.push('Check for controller driver updates');
      tips.push('Try using keyboard controls instead');
    }

    // Rendering/graphics tips
    if (errorMessage.includes('render') || errorMessage.includes('canvas') || errorMessage.includes('webgl')) {
      tips.push('Update your graphics drivers');
      tips.push('Disable hardware acceleration in browser settings');
      tips.push('Try a different browser');
    }

    // Generic tips if no specific match
    if (tips.length === 0) {
      tips.push('Make sure your browser is up to date');
      tips.push('Try playing in a different browser');
      tips.push('Clear your browser cache');
    }

    return tips;
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const gameName = this.props.gameName || 'Game';
      const troubleshootingTips = this.getGameTroubleshootingTips();
      const { type: errorType } = classifyError(this.state.error!);

      return (
        <Card className="border-destructive/20 bg-destructive/5 max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive text-lg">
              <AlertTriangle className="h-5 w-5" />
              {gameName} encountered an error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Error message */}
            <p className="text-sm text-muted-foreground">
              The game encountered an unexpected error and had to stop. Don't worry, you can restart it below.
            </p>

            {/* Error type indicator */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                Error Type: {errorType}
              </p>
            </div>

            {/* Troubleshooting tips */}
            {troubleshootingTips.length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex gap-2">
                  <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <p className="font-medium mb-2">Troubleshooting tips:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {troubleshootingTips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Development details */}
            {import.meta.env.DEV && this.state.error && (
              <details className="text-xs">
                <summary className="cursor-pointer font-medium text-destructive hover:underline">
                  Error Details (Development)
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
                onClick={this.handleRestart}
                size="sm"
                variant="default"
                disabled={this.state.isResetting}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${this.state.isResetting ? 'animate-spin' : ''}`} />
                {this.state.isResetting ? 'Restarting...' : 'Restart Game'}
              </Button>
              <Button
                onClick={() => window.location.reload()}
                size="sm"
                variant="outline"
                disabled={this.state.isResetting}
              >
                <Gamepad2 className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
            </div>

            {/* Retry status */}
            {this.state.retryCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Restart attempts: {this.state.retryCount}
                {this.state.retryCount >= 2 && ' - Please reload if issue persists'}
              </p>
            )}

            {/* Info message */}
            <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-lg">
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Your game progress is automatically saved. Restarting will not cause data loss.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
