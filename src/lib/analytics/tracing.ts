/**
 * Analytics Request Tracing Module
 *
 * @module analytics/tracing
 *
 * @description Provides structured request tracing for analytics operations.
 * Enables correlation of related operations across different components and
 * layers of the analytics system.
 *
 * **Features**:
 * - Unique request ID generation
 * - Parent-child relationship tracking
 * - Timing and latency measurement
 * - Context propagation across async boundaries
 * - Integration with logger for structured logs
 */

import { logger } from '@/lib/logger';

/**
 * Trace context for analytics operations
 */
export interface TraceContext {
  /** Unique request identifier */
  requestId: string;
  /** Parent request ID for nested operations */
  parentId?: string;
  /** Operation name (e.g., 'analyzeStudent', 'runAnalysis') */
  operation: string;
  /** Component or module name */
  component: string;
  /** Start timestamp */
  startTime: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Trace span representing a single operation
 */
export interface TraceSpan {
  context: TraceContext;
  /** End the span and record duration */
  end: (result?: { success: boolean; error?: string; metadata?: Record<string, unknown> }) => void;
  /** Create a child span */
  child: (operation: string, metadata?: Record<string, unknown>) => TraceSpan;
  /** Get elapsed time in milliseconds */
  elapsed: () => number;
}

/**
 * Completed trace record for metrics/logging
 */
export interface TraceRecord {
  requestId: string;
  parentId?: string;
  operation: string;
  component: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Simple ID generator (no external dependencies)
let idCounter = 0;
const generateId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const counter = (idCounter++).toString(36);
  return `${timestamp}-${random}-${counter}`;
};

// Trace storage for active traces
const activeTraces = new Map<string, TraceContext>();
const completedTraces: TraceRecord[] = [];
const MAX_COMPLETED_TRACES = 100;

/**
 * Create a new trace span for an analytics operation
 *
 * @param operation - Name of the operation being traced
 * @param component - Component or module initiating the trace
 * @param options - Optional configuration
 * @returns A trace span object
 *
 * @example
 * ```typescript
 * const span = createTraceSpan('analyzeStudent', 'LLMAnalysisEngine');
 * try {
 *   const result = await doAnalysis();
 *   span.end({ success: true, metadata: { resultCount: result.length } });
 * } catch (error) {
 *   span.end({ success: false, error: error.message });
 * }
 * ```
 */
export function createTraceSpan(
  operation: string,
  component: string,
  options?: {
    parentId?: string;
    metadata?: Record<string, unknown>;
  }
): TraceSpan {
  const requestId = generateId();
  const context: TraceContext = {
    requestId,
    parentId: options?.parentId,
    operation,
    component,
    startTime: performance.now(),
    metadata: options?.metadata,
  };

  activeTraces.set(requestId, context);

  // Log trace start
  logger.debug(`[Trace:${component}] ${operation} started`, {
    requestId,
    parentId: options?.parentId,
    ...options?.metadata,
  });

  let ended = false;

  const span: TraceSpan = {
    context,

    end(result?: { success: boolean; error?: string; metadata?: Record<string, unknown> }) {
      // Prevent double-ending a span
      if (ended) {
        logger.debug(`[Trace:${context.component}] Span already ended, ignoring duplicate end()`, {
          requestId: context.requestId,
        });
        return;
      }
      ended = true;

      const endTime = performance.now();
      const durationMs = endTime - context.startTime;

      // Create completed record
      const record: TraceRecord = {
        requestId: context.requestId,
        parentId: context.parentId,
        operation: context.operation,
        component: context.component,
        startTime: context.startTime,
        endTime,
        durationMs,
        success: result?.success ?? true,
        error: result?.error,
        metadata: { ...context.metadata, ...result?.metadata },
      };

      // Store completed trace
      completedTraces.push(record);
      if (completedTraces.length > MAX_COMPLETED_TRACES) {
        completedTraces.shift();
      }

      // Remove from active traces
      activeTraces.delete(requestId);

      // Log trace end with appropriate level
      const logFn = result?.success === false ? logger.warn : logger.debug;
      logFn.call(logger, `[Trace:${context.component}] ${context.operation} completed`, {
        requestId: context.requestId,
        durationMs: Math.round(durationMs),
        success: result?.success ?? true,
        ...(result?.error ? { error: result.error } : {}),
        ...result?.metadata,
      });

      // Emit slow operation warning
      if (durationMs > 5000) {
        logger.warn(`[Trace:${context.component}] Slow operation detected`, {
          requestId: context.requestId,
          operation: context.operation,
          durationMs: Math.round(durationMs),
        });
      }
    },

    child(childOperation: string, metadata?: Record<string, unknown>): TraceSpan {
      return createTraceSpan(childOperation, context.component, {
        parentId: context.requestId,
        metadata,
      });
    },

    elapsed(): number {
      return performance.now() - context.startTime;
    },
  };

  return span;
}

/**
 * Get recent completed traces for diagnostics
 *
 * @param limit - Maximum number of traces to return
 * @returns Array of recent trace records
 */
export function getRecentTraces(limit = 50): TraceRecord[] {
  return completedTraces.slice(-limit);
}

/**
 * Get active trace count
 *
 * @returns Number of currently active traces
 */
export function getActiveTraceCount(): number {
  return activeTraces.size;
}

/**
 * Get trace statistics
 *
 * @returns Summary statistics of recent traces
 */
export function getTraceStats(): {
  totalTraces: number;
  activeCount: number;
  averageDurationMs: number;
  slowOperations: number;
  errorRate: number;
  byComponent: Record<string, { count: number; avgMs: number; errors: number }>;
  byOperation: Record<string, { count: number; avgMs: number; errors: number }>;
} {
  const total = completedTraces.length;
  const active = activeTraces.size;

  if (total === 0) {
    return {
      totalTraces: 0,
      activeCount: active,
      averageDurationMs: 0,
      slowOperations: 0,
      errorRate: 0,
      byComponent: {},
      byOperation: {},
    };
  }

  let totalDuration = 0;
  let slowCount = 0;
  let errorCount = 0;
  const byComponent: Record<string, { total: number; count: number; errors: number }> = {};
  const byOperation: Record<string, { total: number; count: number; errors: number }> = {};

  for (const trace of completedTraces) {
    totalDuration += trace.durationMs;
    if (trace.durationMs > 5000) slowCount++;
    if (!trace.success) errorCount++;

    // By component
    if (!byComponent[trace.component]) {
      byComponent[trace.component] = { total: 0, count: 0, errors: 0 };
    }
    byComponent[trace.component].total += trace.durationMs;
    byComponent[trace.component].count++;
    if (!trace.success) byComponent[trace.component].errors++;

    // By operation
    if (!byOperation[trace.operation]) {
      byOperation[trace.operation] = { total: 0, count: 0, errors: 0 };
    }
    byOperation[trace.operation].total += trace.durationMs;
    byOperation[trace.operation].count++;
    if (!trace.success) byOperation[trace.operation].errors++;
  }

  // Convert totals to averages
  const formatStats = (stats: Record<string, { total: number; count: number; errors: number }>) => {
    const result: Record<string, { count: number; avgMs: number; errors: number }> = {};
    for (const [key, value] of Object.entries(stats)) {
      result[key] = {
        count: value.count,
        avgMs: Math.round(value.total / value.count),
        errors: value.errors,
      };
    }
    return result;
  };

  return {
    totalTraces: total,
    activeCount: active,
    averageDurationMs: Math.round(totalDuration / total),
    slowOperations: slowCount,
    errorRate: total > 0 ? errorCount / total : 0,
    byComponent: formatStats(byComponent),
    byOperation: formatStats(byOperation),
  };
}

/**
 * Clear completed traces (useful for testing)
 */
export function clearTraces(): void {
  completedTraces.length = 0;
}

/**
 * Wrap an async function with automatic tracing
 *
 * @param operation - Operation name
 * @param component - Component name
 * @param fn - Async function to wrap
 * @returns Wrapped function with tracing
 *
 * @example
 * ```typescript
 * const tracedAnalysis = withTracing('analyze', 'Engine', async (data) => {
 *   return await performAnalysis(data);
 * });
 * const result = await tracedAnalysis(inputData);
 * ```
 */
export function withTracing<TArgs extends unknown[], TResult>(
  operation: string,
  component: string,
  fn: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const span = createTraceSpan(operation, component);
    try {
      const result = await fn(...args);
      span.end({ success: true });
      return result;
    } catch (error) {
      span.end({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };
}
