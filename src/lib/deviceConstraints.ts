import { logger } from '@/lib/logger';

/**
 * Device configuration interface for constraint checking
 */
export interface DeviceConfig {
  minMemoryGB?: number;
  maxConcurrency?: number;
  requireBattery?: boolean;
}

/**
 * Device capabilities detected from the environment
 */
interface DeviceCapabilities {
  memory: number | null; // GB
  hardwareConcurrency: number;
  batteryLevel: number | null; // 0-1
  isCharging: boolean | null;
  thermalState: string | null; // 'nominal' | 'fair' | 'serious' | 'critical'
}

/**
 * Detect device capabilities using available Web APIs
 */
async function getDeviceCapabilities(): Promise<DeviceCapabilities> {
  const capabilities: DeviceCapabilities = {
    memory: null,
    hardwareConcurrency: navigator.hardwareConcurrency || 2,
    batteryLevel: null,
    isCharging: null,
    thermalState: null,
  };

  // Check device memory (Chrome/Edge only)
  try {
    const nav = navigator as Navigator & { deviceMemory?: number };
    if (nav.deviceMemory !== undefined) {
      capabilities.memory = nav.deviceMemory;
    }
  } catch (error) {
    logger.debug('[deviceConstraints] Failed to read deviceMemory', error as Error);
  }

  // Check battery status
  try {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean }> };
    if (nav.getBattery) {
      const battery = await nav.getBattery();
      capabilities.batteryLevel = battery.level;
      capabilities.isCharging = battery.charging;
    }
  } catch (error) {
    logger.debug('[deviceConstraints] Failed to read battery status', error as Error);
  }

  return capabilities;
}

/**
 * Check if device can handle precomputation based on hardware constraints
 *
 * @param cfg Optional configuration override
 * @returns true if device meets requirements for precomputation
 *
 * Default constraints:
 * - Minimum 2GB RAM (if detectable)
 * - Battery level > 20% OR charging (on mobile)
 * - At least 2 CPU cores
 */
export async function canPrecompute(cfg?: DeviceConfig): Promise<boolean> {
  const defaultConfig: Required<DeviceConfig> = {
    minMemoryGB: 2,
    maxConcurrency: 2,
    requireBattery: false,
  };

  const config = { ...defaultConfig, ...cfg };

  try {
    const capabilities = await getDeviceCapabilities();

    // Check minimum memory requirement
    if (capabilities.memory !== null && capabilities.memory < config.minMemoryGB) {
      logger.info(`[deviceConstraints] Insufficient memory: ${capabilities.memory}GB < ${config.minMemoryGB}GB`);
      return false;
    }

    // Check CPU concurrency
    if (capabilities.hardwareConcurrency < config.maxConcurrency) {
      logger.info(`[deviceConstraints] Insufficient CPU cores: ${capabilities.hardwareConcurrency} < ${config.maxConcurrency}`);
      return false;
    }

    // Check battery constraints (only if required and battery API is available)
    if (config.requireBattery && capabilities.batteryLevel !== null) {
      const MIN_BATTERY_LEVEL = 0.2; // 20%

      if (!capabilities.isCharging && capabilities.batteryLevel < MIN_BATTERY_LEVEL) {
        logger.info(`[deviceConstraints] Low battery: ${Math.round(capabilities.batteryLevel * 100)}% (not charging)`);
        return false;
      }
    }

    logger.debug('[deviceConstraints] Device meets precomputation requirements', capabilities);
    return true;

  } catch (error) {
    // Conservative fallback: allow processing if capability detection fails
    logger.warn('[deviceConstraints] Error checking device capabilities, allowing precomputation', error as Error);
    return true;
  }
}

export const deviceConstraints = { canPrecompute } as const;



