import { logger } from '@/lib/logger';

declare global {
  interface Navigator {
    getBattery?: () => Promise<{ level: number; charging: boolean }>;
    connection?: { effectiveType: string; downlink?: number; rtt?: number; saveData?: boolean };
    deviceMemory?: number;
  }
}

export async function canPrecompute(cfg?: unknown): Promise<boolean> {
  // Check if configuration exists and has expected properties
  if (!cfg || typeof cfg !== 'object') {
    return true; // Allow if no config provided
  }

  const config = cfg as {
    enabled?: boolean;
    enableOnBattery?: boolean;
    enableOnSlowNetwork?: boolean;
    respectBatteryLevel?: boolean;
    respectCPUUsage?: boolean;
    respectNetworkConditions?: boolean;
    pauseOnUserActivity?: boolean;
    precomputeOnlyWhenIdle?: boolean;
  };

  // Check if precomputation is enabled at all
  if (config.enabled === false) {
    return false;
  }

  try {
    // Check battery constraints
    if (config.respectBatteryLevel !== false && 'getBattery' in navigator) {
      const battery = await navigator.getBattery?.();

      if (battery) {
        // Don't precompute if battery is low (< 20%)
        if (battery.level < 0.2) {
          return false;
        }

        // If not charging and battery mode is restricted
        if (!battery.charging && config.enableOnBattery === false) {
          return false;
        }
      }
    }

    // Check network conditions
    if (config.respectNetworkConditions !== false && 'connection' in navigator) {
      const connection = navigator.connection;

      if (connection) {
        // Check if we're on a slow connection
        const effectiveType = connection.effectiveType;
        const isSlowConnection = effectiveType === 'slow-2g' || effectiveType === '2g';

        if (isSlowConnection && config.enableOnSlowNetwork === false) {
          return false;
        }

        // Don't precompute on metered connections
        if (connection.saveData === true) {
          return false;
        }
      }
    }

    // Check memory pressure
    if ('deviceMemory' in navigator) {
      const deviceMemory = navigator.deviceMemory;
      // Don't precompute on low-memory devices (< 2GB)
      if (deviceMemory && deviceMemory < 2) {
        return false;
      }
    }

    // Check CPU cores
    if ('hardwareConcurrency' in navigator) {
      const cores = navigator.hardwareConcurrency;
      // Be more conservative on single-core devices
      if (cores && cores <= 1) {
        return false;
      }
    }

    // Check if the page is visible (don't precompute in background tabs)
    if (config.pauseOnUserActivity !== false && typeof document !== 'undefined') {
      if (document.hidden) {
        return false;
      }
    }

    // Check if we should only precompute when idle
    if (config.precomputeOnlyWhenIdle === true) {
      // This check is handled by the caller using requestIdleCallback
      // We just allow it here if the constraint is set
      return true;
    }

    // All checks passed
    return true;
  } catch (error) {
    // If any check fails, be conservative and allow processing
    // This ensures the app works even in environments where these APIs aren't available
    // logger.warn('Device constraint check failed:', error);
    return true;
  }
}

export const deviceConstraints = { canPrecompute } as const;
