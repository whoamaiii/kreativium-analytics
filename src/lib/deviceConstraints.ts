import { logger } from '@/lib/logger';

/**
 * Checks if the device has sufficient resources for precomputation tasks
 * @param cfg - Optional configuration (reserved for future use)
 * @returns Promise<boolean> - true if device can handle precomputation
 *
 * Checks performed:
 * - Memory: Ensures JS heap usage is below 90%
 * - Network: Avoids precomputation on slow/data-saver connections
 * - CPU: Requires at least 4 hardware threads for parallel processing
 * - Battery: Checks if device is charging or has sufficient battery
 */
export async function canPrecompute(cfg?: unknown): Promise<boolean> {
  try {
    // Check 1: Memory constraints
    if ('memory' in performance && (performance as any).memory) {
      const mem = (performance as any).memory;
      const heapUsageRatio = mem.usedJSHeapSize / mem.jsHeapSizeLimit;

      if (heapUsageRatio > 0.9) {
        logger.debug('[deviceConstraints] Memory usage too high', { heapUsageRatio });
        return false;
      }
    }

    // Check 2: Network constraints (avoid precomputation on slow connections)
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;

      // Respect data saver mode
      if (conn.saveData === true) {
        logger.debug('[deviceConstraints] Data saver mode enabled');
        return false;
      }

      // Avoid precomputation on slow connections
      const slowConnections = ['slow-2g', '2g'];
      if (slowConnections.includes(conn.effectiveType)) {
        logger.debug('[deviceConstraints] Slow connection detected', { effectiveType: conn.effectiveType });
        return false;
      }
    }

    // Check 3: CPU constraints (require at least 4 cores for precomputation)
    if ('hardwareConcurrency' in navigator) {
      const cores = navigator.hardwareConcurrency;
      if (cores < 4) {
        logger.debug('[deviceConstraints] Insufficient CPU cores', { cores });
        return false;
      }
    }

    // Check 4: Battery constraints (avoid heavy computation on low battery)
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();

        // If not charging and battery is low, skip precomputation
        if (!battery.charging && battery.level < 0.2) {
          logger.debug('[deviceConstraints] Low battery and not charging', {
            level: battery.level,
            charging: battery.charging
          });
          return false;
        }
      } catch (batteryError) {
        // Battery API might fail or be unavailable, continue without it
        logger.debug('[deviceConstraints] Battery API unavailable', batteryError);
      }
    }

    // All checks passed
    logger.debug('[deviceConstraints] Device can precompute');
    return true;

  } catch (error) {
    // If any check throws, log and allow precomputation (fail-open for compatibility)
    logger.warn('[deviceConstraints] Error checking device capabilities, allowing precomputation', error);
    return true;
  }
}

export const deviceConstraints = { canPrecompute } as const;




