/**
 * @file usePrecomputation.ts
 *
 * Hook for managing analytics precomputation scheduling and execution.
 * Handles background precomputation during idle time.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AnalyticsPrecomputationManager } from '@/lib/analyticsPrecomputation';
import { deviceConstraints } from '@/lib/deviceConstraints';
import { logger } from '@/lib/logger';
import { legacyAnalyticsAdapter } from '@/lib/adapters/legacyAnalyticsAdapter';
import type { AnalyticsData } from '@/types/analytics';
import type { Student, EmotionEntry, SensoryEntry } from '@/types/student';
import type { PrecomputationConfig } from '@/lib/analyticsConfig';

export interface PrecomputeStatus {
  enabled: boolean;
  queueSize: number;
  isProcessing: boolean;
  processedCount: number;
}

export interface UsePrecomputationOptions {
  /**
   * Precomputation configuration from analytics config
   */
  precomputationConfig?: PrecomputationConfig | null;

  /**
   * Whether the worker is ready to accept tasks
   */
  workerReady: boolean;

  /**
   * Function to run analysis with prewarm flag
   */
  runAnalysis: (
    data: AnalyticsData,
    options?: { student?: Student; prewarm?: boolean },
  ) => Promise<void>;
}

export interface UsePrecomputationReturn {
  /**
   * Current precomputation status
   */
  precomputeStatus: PrecomputeStatus | null;

  /**
   * Whether precomputation is enabled
   */
  precomputeEnabled: boolean;

  /**
   * Start/resume precomputation
   */
  startPrecomputation: () => void;

  /**
   * Stop precomputation
   */
  stopPrecomputation: () => void;

  /**
   * Manually trigger precomputation for given data sets
   */
  precomputeCommonAnalytics: (
    dataProvider: () => AnalyticsData[],
    options?: { student?: Student },
  ) => void;

  /**
   * Update status (for external config changes)
   */
  updateStatus: () => void;
}

/**
 * Hook for managing analytics precomputation.
 *
 * Handles:
 * - Creating and managing AnalyticsPrecomputationManager
 * - Scheduling precomputation based on device constraints
 * - Idle-time precomputation scheduling
 * - Status tracking and control
 */
export function usePrecomputation(options: UsePrecomputationOptions): UsePrecomputationReturn {
  const { precomputationConfig, workerReady, runAnalysis } = options;

  const precompManagerRef = useRef<AnalyticsPrecomputationManager | null>(null);
  const idleCallbackRef = useRef<number | null>(null);

  const [precomputeStatus, setPrecomputeStatus] = useState<PrecomputeStatus | null>(null);

  const precomputeEnabled = !!precomputationConfig?.enabled;

  const updateStatus = useCallback(() => {
    if (precompManagerRef.current) {
      setPrecomputeStatus(precompManagerRef.current.getStatus());
    }
  }, []);

  const startPrecomputation = useCallback(() => {
    try {
      precompManagerRef.current?.resume();
      updateStatus();
    } catch (e) {
      logger.warn('[usePrecomputation] Failed to start precomputation', { error: e });
    }
  }, [updateStatus]);

  const stopPrecomputation = useCallback(() => {
    try {
      precompManagerRef.current?.stop();
      updateStatus();
    } catch (e) {
      logger.warn('[usePrecomputation] Failed to stop precomputation', { error: e });
    }
  }, [updateStatus]);

  /**
   * Pre-compute analytics for common queries during idle time.
   */
  const precomputeCommonAnalytics = useCallback(
    (dataProvider: () => AnalyticsData[], opts?: { student?: Student }) => {
      const pc = precomputationConfig;
      if (!pc || !pc.enabled) return;

      const schedule = async () => {
        try {
          const allowed = await deviceConstraints.canPrecompute(pc);
          if (!allowed) return;
        } catch (e) {
          logger.debug('[usePrecomputation] Device constraint check failed, proceeding anyway', {
            error: e,
          });
        }

        const dataSets = dataProvider();
        const student = opts?.student;
        dataSets.forEach((data, index) => {
          setTimeout(
            () => {
              runAnalysis(data, { student, prewarm: true }).catch((e) => {
                logger.debug('[usePrecomputation] Precomputation failed (non-fatal)', {
                  error: e,
                  studentId: student?.id,
                  dataSize: data.entries?.length,
                });
              });
            },
            index * (pc.taskStaggerDelay ?? 100),
          );
        });
      };

      if (pc.precomputeOnlyWhenIdle && 'requestIdleCallback' in window) {
        idleCallbackRef.current = requestIdleCallback(
          () => {
            schedule();
          },
          { timeout: pc.idleTimeout ?? 5000 },
        );
      } else {
        setTimeout(schedule, pc.idleTimeout ?? 1000);
      }
    },
    [precomputationConfig, runAnalysis],
  );

  // Create/teardown precomputation manager
  useEffect(() => {
    const pc = precomputationConfig;
    if (!pc || !pc.enabled) {
      if (precompManagerRef.current) {
        precompManagerRef.current.stop();
        setPrecomputeStatus(precompManagerRef.current.getStatus());
      }
      return;
    }

    if (!precompManagerRef.current) {
      precompManagerRef.current = new AnalyticsPrecomputationManager((data) => {
        runAnalysis(data, { prewarm: true }).catch((e) => {
          logger.debug('[usePrecomputation] Manager precomputation failed', { error: e });
        });
      });
    }

    // Kick off scheduling based on current data
    try {
      const entries = legacyAnalyticsAdapter.listTrackingEntries();
      const emotions: EmotionEntry[] = entries.flatMap((entry) =>
        (entry.emotions ?? []).map<EmotionEntry>((emotion) => ({
          ...emotion,
          studentId: emotion.studentId ?? entry.studentId,
        })),
      );
      const sensoryInputs: SensoryEntry[] = entries.flatMap((entry) =>
        (entry.sensoryInputs ?? []).map<SensoryEntry>((sensory) => ({
          ...sensory,
          studentId: sensory.studentId ?? entry.studentId,
        })),
      );
      precompManagerRef.current.schedulePrecomputation(entries, emotions, sensoryInputs);
      setPrecomputeStatus(precompManagerRef.current.getStatus());
    } catch (e) {
      logger.warn('[usePrecomputation] Failed to schedule initial precomputation', { error: e });
    }

    return () => {
      try {
        precompManagerRef.current?.stop();
      } catch (e) {
        logger.debug('[usePrecomputation] Failed to stop precompute manager on cleanup', {
          error: e,
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precomputationConfig?.enabled, workerReady]);

  // Cleanup idle callback on unmount
  useEffect(() => {
    return () => {
      if (idleCallbackRef.current) {
        cancelIdleCallback(idleCallbackRef.current);
        idleCallbackRef.current = null;
      }
    };
  }, []);

  return {
    precomputeStatus,
    precomputeEnabled,
    startPrecomputation,
    stopPrecomputation,
    precomputeCommonAnalytics,
    updateStatus,
  };
}
