/**
 * Type-safe worker message definitions with discriminated unions
 *
 * This module provides:
 * - Discriminated union types for all worker messages (incoming and outgoing)
 * - Runtime type guards for message validation
 * - Type safety to replace unsafe 'any' casts in worker communication
 *
 * Message Flow:
 * - Main Thread → Worker: WorkerRequestMessage (Insights/Compute, Cache commands, Game events)
 * - Worker → Main Thread: WorkerResponseMessage (progress, partial, complete, error, alerts, cache status)
 */

import { logger } from '@/lib/logger';

import type {
  AnalyticsData,
  AnalyticsResults,
  AnalyticsResultsPartial,
  AnalyticsChartKey,
} from './analytics';
import type { AlertEvent } from '@/lib/alerts/types';
import type { AnalyticsInputs, AnalyticsRuntimeConfig } from './insights';

// ============================================================================
// Request Messages (Main Thread → Worker)
// ============================================================================

/**
 * Insights computation request - primary analytics task
 */
export interface InsightsComputeRequest {
  type: 'Insights/Compute';
  payload: {
    inputs: AnalyticsInputs;
    config?: AnalyticsRuntimeConfig;
    prewarm?: boolean;
  };
  cacheKey: string;
  ttlSeconds?: number;
}

/**
 * Cache control: Clear all cache entries
 */
export interface CacheClearAllRequest {
  type: 'CACHE/CLEAR_ALL';
}

/**
 * Cache control: Clear entries for specific student
 */
export interface CacheClearStudentRequest {
  type: 'CACHE/CLEAR_STUDENT';
  studentId: string;
}

/**
 * Cache control: Clear pattern analysis cache
 */
export interface CacheClearPatternsRequest {
  type: 'CACHE/CLEAR_PATTERNS';
}

/**
 * Game event tracking (lightweight telemetry)
 */
export interface GameEventRequest {
  type: 'game:event';
  payload: {
    kind: string;
    ts: number;
    [key: string]: unknown;
  };
}

/**
 * Game session summary
 */
export interface GameSessionSummaryRequest {
  type: 'game:session_summary';
  payload: unknown;
}

/**
 * Legacy direct analytics data request (deprecated, prefer InsightsComputeRequest)
 */
export interface LegacyAnalyticsDataRequest extends AnalyticsData {
  // No explicit type field - identified by presence of required AnalyticsData fields
}

/**
 * Union of all possible request messages sent to the worker
 */
export type WorkerRequestMessage =
  | InsightsComputeRequest
  | CacheClearAllRequest
  | CacheClearStudentRequest
  | CacheClearPatternsRequest
  | GameEventRequest
  | GameSessionSummaryRequest
  | LegacyAnalyticsDataRequest;

// ============================================================================
// Response Messages (Worker → Main Thread)
// ============================================================================

/**
 * Progress update during computation
 */
export interface ProgressResponse {
  type: 'progress';
  cacheKey?: string;
  progress?: {
    stage: string;
    percent: number;
  };
  chartsUpdated?: AnalyticsChartKey[];
}

/**
 * Partial results during incremental computation
 */
export interface PartialResponse {
  type: 'partial';
  cacheKey?: string;
  payload?: AnalyticsResultsPartial;
  chartsUpdated?: AnalyticsChartKey[];
  progress?: {
    stage: string;
    percent: number;
  };
}

/**
 * Final computation results
 */
export interface CompleteResponse {
  type: 'complete';
  cacheKey?: string;
  payload: AnalyticsResults & { prewarm?: boolean };
  chartsUpdated?: AnalyticsChartKey[];
  progress?: {
    stage: string;
    percent: number;
  };
}

/**
 * Error during computation
 */
export interface ErrorResponse {
  type: 'error';
  cacheKey?: string;
  error: string;
  payload?: AnalyticsResultsPartial;
  chartsUpdated?: AnalyticsChartKey[];
  progress?: {
    stage: string;
    percent: number;
  };
}

/**
 * Alert detection results
 */
export interface AlertsResponse {
  type: 'alerts';
  cacheKey?: string;
  payload: {
    alerts: AlertEvent[];
    studentId?: string;
    prewarm?: boolean;
  };
}

/**
 * Cache operation completion status
 */
export interface CacheClearDoneResponse {
  type: 'CACHE/CLEAR_DONE';
  payload: {
    scope: 'all' | 'student' | 'patterns';
    studentId?: string;
    patternsCleared?: number;
    cacheCleared?: number;
    stats?: {
      size: number;
    };
  };
}

/**
 * Union of all possible response messages from the worker
 */
export type WorkerResponseMessage =
  | ProgressResponse
  | PartialResponse
  | CompleteResponse
  | ErrorResponse
  | AlertsResponse
  | CacheClearDoneResponse;

// ============================================================================
// Runtime Type Guards
// ============================================================================

/**
 * Type guard: Check if unknown value is a valid WorkerRequestMessage
 */
export function isWorkerRequestMessage(msg: unknown): msg is WorkerRequestMessage {
  if (!msg || typeof msg !== 'object') return false;
  const obj = msg as Record<string, unknown>;

  // Check for known message types with explicit type field
  if ('type' in obj && typeof obj.type === 'string') {
    return (
      obj.type === 'Insights/Compute' ||
      obj.type.startsWith('CACHE/') ||
      obj.type.startsWith('game:')
    );
  }

  // Check for legacy AnalyticsData structure (no type field)
  return (
    'entries' in obj &&
    'emotions' in obj &&
    'sensoryInputs' in obj &&
    Array.isArray(obj.entries) &&
    Array.isArray(obj.emotions) &&
    Array.isArray(obj.sensoryInputs)
  );
}

/**
 * Type guard: Check if message is InsightsComputeRequest
 */
export function isInsightsComputeRequest(msg: WorkerRequestMessage): msg is InsightsComputeRequest {
  return 'type' in msg && msg.type === 'Insights/Compute';
}

/**
 * Type guard: Check if message is any cache control request
 */
export function isCacheControlRequest(
  msg: WorkerRequestMessage,
): msg is CacheClearAllRequest | CacheClearStudentRequest | CacheClearPatternsRequest {
  return 'type' in msg && typeof msg.type === 'string' && msg.type.startsWith('CACHE/');
}

/**
 * Type guard: Check if message is CacheClearAllRequest
 */
export function isCacheClearAllRequest(msg: WorkerRequestMessage): msg is CacheClearAllRequest {
  return 'type' in msg && msg.type === 'CACHE/CLEAR_ALL';
}

/**
 * Type guard: Check if message is CacheClearStudentRequest
 */
export function isCacheClearStudentRequest(
  msg: WorkerRequestMessage,
): msg is CacheClearStudentRequest {
  return (
    'type' in msg &&
    msg.type === 'CACHE/CLEAR_STUDENT' &&
    'studentId' in msg &&
    typeof msg.studentId === 'string'
  );
}

/**
 * Type guard: Check if message is CacheClearPatternsRequest
 */
export function isCacheClearPatternsRequest(
  msg: WorkerRequestMessage,
): msg is CacheClearPatternsRequest {
  return 'type' in msg && msg.type === 'CACHE/CLEAR_PATTERNS';
}

/**
 * Type guard: Check if message is GameEventRequest
 */
export function isGameEventRequest(msg: WorkerRequestMessage): msg is GameEventRequest {
  return 'type' in msg && msg.type === 'game:event' && 'payload' in msg;
}

/**
 * Type guard: Check if message is GameSessionSummaryRequest
 */
export function isGameSessionSummaryRequest(
  msg: WorkerRequestMessage,
): msg is GameSessionSummaryRequest {
  return 'type' in msg && msg.type === 'game:session_summary' && 'payload' in msg;
}

/**
 * Type guard: Check if message is LegacyAnalyticsDataRequest
 */
export function isLegacyAnalyticsDataRequest(
  msg: WorkerRequestMessage,
): msg is LegacyAnalyticsDataRequest {
  return (
    !('type' in msg) &&
    'entries' in msg &&
    'emotions' in msg &&
    'sensoryInputs' in msg &&
    Array.isArray(msg.entries) &&
    Array.isArray(msg.emotions) &&
    Array.isArray(msg.sensoryInputs)
  );
}

/**
 * Type guard: Check if unknown value is a valid WorkerResponseMessage
 */
export function isWorkerResponseMessage(msg: unknown): msg is WorkerResponseMessage {
  if (!msg || typeof msg !== 'object') return false;
  const obj = msg as Record<string, unknown>;

  if (!('type' in obj) || typeof obj.type !== 'string') return false;

  return (
    obj.type === 'progress' ||
    obj.type === 'partial' ||
    obj.type === 'complete' ||
    obj.type === 'error' ||
    obj.type === 'alerts' ||
    obj.type === 'CACHE/CLEAR_DONE'
  );
}

/**
 * Type guard: Check if response is ProgressResponse
 */
export function isProgressResponse(msg: WorkerResponseMessage): msg is ProgressResponse {
  return msg.type === 'progress';
}

/**
 * Type guard: Check if response is PartialResponse
 */
export function isPartialResponse(msg: WorkerResponseMessage): msg is PartialResponse {
  return msg.type === 'partial';
}

/**
 * Type guard: Check if response is CompleteResponse
 */
export function isCompleteResponse(msg: WorkerResponseMessage): msg is CompleteResponse {
  return msg.type === 'complete';
}

/**
 * Type guard: Check if response is ErrorResponse
 */
export function isErrorResponse(msg: WorkerResponseMessage): msg is ErrorResponse {
  return msg.type === 'error';
}

/**
 * Type guard: Check if response is AlertsResponse
 */
export function isAlertsResponse(msg: WorkerResponseMessage): msg is AlertsResponse {
  return msg.type === 'alerts';
}

/**
 * Type guard: Check if response is CacheClearDoneResponse
 */
export function isCacheClearDoneResponse(
  msg: WorkerResponseMessage,
): msg is CacheClearDoneResponse {
  return msg.type === 'CACHE/CLEAR_DONE';
}

// ============================================================================
// Helper: Safe Message Parsing
// ============================================================================

/**
 * Safely parse and validate a worker request message
 *
 * @param data - Unknown data from MessageEvent
 * @returns Validated WorkerRequestMessage or null if invalid
 *
 * @example
 * ```typescript
 * self.onmessage = (e: MessageEvent) => {
 *   const msg = parseWorkerRequest(e.data);
 *   if (!msg) {
 *     logger.error('Invalid worker message received');
 *     return;
 *   }
 *
 *   if (isInsightsComputeRequest(msg)) {
 *     // msg.payload is fully typed with autocomplete
 *   }
 * };
 * ```
 */
export function parseWorkerRequest(data: unknown): WorkerRequestMessage | null {
  if (!isWorkerRequestMessage(data)) {
    return null;
  }
  return data;
}

/**
 * Safely parse and validate a worker response message
 *
 * @param data - Unknown data from MessageEvent
 * @returns Validated WorkerResponseMessage or null if invalid
 */
export function parseWorkerResponse(data: unknown): WorkerResponseMessage | null {
  if (!isWorkerResponseMessage(data)) {
    return null;
  }
  return data;
}
