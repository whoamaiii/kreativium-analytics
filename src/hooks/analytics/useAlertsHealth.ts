/**
 * @file useAlertsHealth.ts
 *
 * Hook for managing alerts health monitoring.
 * Publishes periodic health events for alerts integration monitoring.
 */

import { useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';
import { alertPerf } from '@/lib/alerts/performance';
import { ALERTS_HEALTH_EVENT } from '@/lib/analytics/workerManager';

export interface UseAlertsHealthOptions {
  /**
   * Reference to track when alerts were last received
   */
  lastAlertsReceivedAtRef: React.MutableRefObject<number>;

  /**
   * Interval in milliseconds between health checks
   * @default 30000
   */
  intervalMs?: number;

  /**
   * Threshold in milliseconds to consider alerts stale
   * @default 120000
   */
  staleThresholdMs?: number;
}

export interface UseAlertsHealthReturn {
  /**
   * Reference to the health timer (for external cleanup if needed)
   */
  healthTimerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
}

/**
 * Hook for publishing periodic alerts health events.
 *
 * Publishes `alerts:health` custom events at regular intervals containing:
 * - healthy: boolean indicating if alerts are being received
 * - msSinceLastAlert: time since last alert (or null if never received)
 * - snapshot: performance metrics snapshot
 */
export function useAlertsHealth(options: UseAlertsHealthOptions): UseAlertsHealthReturn {
  const { lastAlertsReceivedAtRef, intervalMs = 30_000, staleThresholdMs = 120_000 } = options;

  const healthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (healthTimerRef.current) {
        clearInterval(healthTimerRef.current);
        healthTimerRef.current = null;
      }

      healthTimerRef.current = setInterval(() => {
        const now = Date.now();
        const last = lastAlertsReceivedAtRef.current;
        const msSince = last ? now - last : Number.POSITIVE_INFINITY;
        const healthy = Number.isFinite(msSince) ? msSince < staleThresholdMs : false;

        try {
          window.dispatchEvent(
            new CustomEvent(ALERTS_HEALTH_EVENT, {
              detail: {
                healthy,
                msSinceLastAlert: Number.isFinite(msSince) ? msSince : null,
                snapshot: (() => {
                  try {
                    return alertPerf.snapshot();
                  } catch (e) {
                    logger.debug('[useAlertsHealth] Failed to get alertPerf snapshot', { error: e });
                    return null;
                  }
                })(),
              },
            }),
          );
        } catch (e) {
          logger.debug('[useAlertsHealth] Failed to dispatch health event', { error: e });
        }
      }, intervalMs);
    } catch (e) {
      logger.warn('[useAlertsHealth] Failed to set up health timer', { error: e });
    }

    return () => {
      if (healthTimerRef.current) {
        clearInterval(healthTimerRef.current);
        healthTimerRef.current = null;
      }
    };
  }, [lastAlertsReceivedAtRef, intervalMs, staleThresholdMs]);

  return { healthTimerRef };
}
