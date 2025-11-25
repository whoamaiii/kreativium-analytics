/**
 * Analytics Configuration Management Hook
 *
 * Extracted from AnalyticsSettings.tsx to separate configuration operations from UI.
 * Handles config loading, saving, preset management, and import/export.
 *
 * This hook consolidates all analytics configuration operations into a single,
 * testable interface that can be reused across different components.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  analyticsConfig,
  type AnalyticsConfiguration,
  PRESET_CONFIGS,
} from '@/lib/analyticsConfig';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

export type PresetKey = keyof typeof PRESET_CONFIGS;

export interface ConfigManagerState {
  /**
   * Current configuration
   */
  config: AnalyticsConfiguration;

  /**
   * Currently selected preset (or 'custom' if modified)
   */
  selectedPreset: PresetKey | 'custom';

  /**
   * Whether there are unsaved changes
   */
  hasUnsavedChanges: boolean;

  /**
   * Last error encountered
   */
  lastError: Error | null;
}

export interface ConfigManagerActions {
  /**
   * Update a config value at a specific path
   */
  updateConfigValue: (path: string[], value: unknown) => void;

  /**
   * Update sensitivity level (affects multiple config values)
   */
  updateSensitivity: (level: 'low' | 'medium' | 'high') => void;

  /**
   * Apply a preset configuration
   */
  applyPreset: (preset: PresetKey) => void;

  /**
   * Save current config
   */
  saveConfig: () => void;

  /**
   * Reset to default config
   */
  resetConfig: () => void;

  /**
   * Export config as JSON file
   */
  exportConfig: () => void;

  /**
   * Import config from file
   */
  importConfig: (file: File) => Promise<void>;

  /**
   * Import config from JSON string
   */
  importConfigFromString: (jsonString: string) => boolean;

  /**
   * Mark changes as saved
   */
  markAsSaved: () => void;
}

export interface UseAnalyticsConfigManagerReturn {
  state: ConfigManagerState;
  actions: ConfigManagerActions;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMPORT_TYPES = new Set(['application/json', 'text/json']);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Safely update a nested config value
 */
function updateNestedValue(
  config: AnalyticsConfiguration,
  path: string[],
  value: unknown,
): AnalyticsConfiguration {
  const newConfig = { ...config };
  let current: any = newConfig;

  // Navigate to parent object
  for (let i = 0; i < path.length - 1; i++) {
    current[path[i]] = { ...current[path[i]] };
    current = current[path[i]];
  }

  // Set the value
  current[path[path.length - 1]] = value;

  return newConfig;
}

/**
 * Detect which preset matches the current config (if any)
 */
function detectPreset(config: AnalyticsConfiguration): PresetKey | 'custom' {
  for (const [key, presetConfig] of Object.entries(PRESET_CONFIGS)) {
    if (JSON.stringify(presetConfig) === JSON.stringify(config)) {
      return key as PresetKey;
    }
  }
  return 'custom';
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing analytics configuration
 *
 * @param options.onConfigChange - Callback when config changes
 * @param options.onSave - Callback when config is saved
 * @param options.onError - Custom error handler
 *
 * @example
 * ```typescript
 * const { state, actions } = useAnalyticsConfigManager({
 *   onConfigChange: (config) => logger.info('Config changed:', config),
 *   onSave: () => logger.info('Config saved'),
 * });
 *
 * // Update a value
 * actions.updateConfigValue(['analytics', 'MIN_TRACKING_FOR_CORRELATION'], 10);
 *
 * // Apply a preset
 * actions.applyPreset('performance');
 *
 * // Save changes
 * actions.saveConfig();
 *
 * // Export/Import
 * actions.exportConfig();
 * await actions.importConfig(file);
 * ```
 */
export function useAnalyticsConfigManager(
  options: {
    onConfigChange?: (config: AnalyticsConfiguration) => void;
    onSave?: () => void;
    onError?: (error: Error) => void;
  } = {},
): UseAnalyticsConfigManagerReturn {
  const { onConfigChange, onSave, onError } = options;

  // State
  const [config, setConfig] = useState<AnalyticsConfiguration>(analyticsConfig.getConfig());
  const [selectedPreset, setSelectedPreset] = useState<PresetKey | 'custom'>('balanced');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  // Subscribe to external config changes
  useEffect(() => {
    const unsubscribe = analyticsConfig.subscribe((newConfig) => {
      setConfig(newConfig);
      setSelectedPreset(detectPreset(newConfig));

      if (onConfigChange) {
        onConfigChange(newConfig);
      }
    });

    return unsubscribe;
  }, [onConfigChange]);

  /**
   * Update a config value at a specific path
   */
  const updateConfigValue = useCallback((path: string[], value: unknown) => {
    setConfig((prevConfig) => {
      const newConfig = updateNestedValue(prevConfig, path, value);
      setSelectedPreset('custom');
      setHasUnsavedChanges(true);
      return newConfig;
    });
  }, []);

  /**
   * Update sensitivity level
   */
  const updateSensitivity = useCallback((level: 'low' | 'medium' | 'high') => {
    setConfig((prevConfig) => {
      const newConfig = { ...prevConfig };
      newConfig.alertSensitivity = {
        ...newConfig.alertSensitivity,
        level,
      };
      setSelectedPreset('custom');
      setHasUnsavedChanges(true);
      return newConfig;
    });
  }, []);

  /**
   * Apply a preset configuration
   */
  const applyPreset = useCallback((preset: PresetKey) => {
    const presetConfig = PRESET_CONFIGS[preset];
    if (!presetConfig) {
      logger.error(`[useAnalyticsConfigManager] Unknown preset: ${preset}`);
      return;
    }

    setConfig(presetConfig);
    setSelectedPreset(preset);
    setHasUnsavedChanges(true);

    logger.info(`[useAnalyticsConfigManager] Applied preset: ${preset}`);
  }, []);

  /**
   * Save current config
   */
  const saveConfig = useCallback(() => {
    try {
      analyticsConfig.setConfig(config);
      setHasUnsavedChanges(false);

      toast({
        title: 'Configuration saved',
        description: 'Analytics settings have been updated',
      });

      if (onSave) {
        onSave();
      }

      logger.info('[useAnalyticsConfigManager] Configuration saved');
    } catch (error) {
      const err = error as Error;
      logger.error('[useAnalyticsConfigManager] Failed to save config', { error: err });
      setLastError(err);

      if (onError) {
        onError(err);
      } else {
        toast({
          title: 'Save failed',
          description: 'Failed to save configuration',
          variant: 'destructive',
        });
      }
    }
  }, [config, onSave, onError]);

  /**
   * Reset to default config
   */
  const resetConfig = useCallback(() => {
    const defaultConfig = PRESET_CONFIGS.balanced;
    setConfig(defaultConfig);
    setSelectedPreset('balanced');
    setHasUnsavedChanges(true);

    toast({
      title: 'Configuration reset',
      description: 'Settings restored to defaults',
    });

    logger.info('[useAnalyticsConfigManager] Configuration reset to defaults');
  }, []);

  /**
   * Export config as JSON file
   */
  const exportConfig = useCallback(() => {
    try {
      const exported = analyticsConfig.exportConfig();
      const blob = new Blob([exported], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'analytics-config.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Configuration exported',
        description: 'Configuration saved to analytics-config.json',
      });

      logger.info('[useAnalyticsConfigManager] Configuration exported');
    } catch (error) {
      const err = error as Error;
      logger.error('[useAnalyticsConfigManager] Failed to export config', { error: err });
      setLastError(err);

      if (onError) {
        onError(err);
      } else {
        toast({
          title: 'Export failed',
          description: 'Failed to export configuration',
          variant: 'destructive',
        });
      }
    }
  }, [onError]);

  /**
   * Import config from JSON string
   */
  const importConfigFromString = useCallback(
    (jsonString: string): boolean => {
      try {
        if (analyticsConfig.importConfig(jsonString)) {
          setHasUnsavedChanges(false);

          toast({
            title: 'Configuration imported',
            description: 'Successfully imported configuration',
          });

          logger.info('[useAnalyticsConfigManager] Configuration imported');
          return true;
        } else {
          toast({
            title: 'Invalid configuration',
            description: 'Configuration file is invalid',
            variant: 'destructive',
          });
          return false;
        }
      } catch (error) {
        const err = error as Error;
        logger.error('[useAnalyticsConfigManager] Failed to import config', { error: err });
        setLastError(err);

        if (onError) {
          onError(err);
        } else {
          toast({
            title: 'Import failed',
            description: 'Failed to read configuration file',
            variant: 'destructive',
          });
        }
        return false;
      }
    },
    [onError],
  );

  /**
   * Import config from file
   */
  const importConfig = useCallback(
    async (file: File): Promise<void> => {
      // Validate file size
      if (file.size > MAX_IMPORT_BYTES) {
        const error = new Error('Configuration file exceeds the 5 MB limit');
        setLastError(error);

        toast({
          title: 'File too large',
          description: 'Configuration file exceeds the 5 MB limit',
          variant: 'destructive',
        });

        logger.warn('[useAnalyticsConfigManager] Import file too large', {
          size: file.size,
          maxSize: MAX_IMPORT_BYTES,
        });
        return;
      }

      // Validate file type
      if (file.type && !ALLOWED_IMPORT_TYPES.has(file.type)) {
        const error = new Error('Only JSON configuration files are supported');
        setLastError(error);

        toast({
          title: 'Invalid file type',
          description: 'Only JSON configuration files are supported',
          variant: 'destructive',
        });

        logger.warn('[useAnalyticsConfigManager] Invalid file type', { type: file.type });
        return;
      }

      // Read and import file
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            if (importConfigFromString(content)) {
              resolve();
            } else {
              reject(new Error('Invalid configuration'));
            }
          } catch (error) {
            reject(error);
          }
        };

        reader.onerror = () => {
          const error = new Error('Failed to read file');
          setLastError(error);
          reject(error);
        };

        reader.readAsText(file);
      });
    },
    [importConfigFromString],
  );

  /**
   * Mark changes as saved (useful after external save)
   */
  const markAsSaved = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

  return {
    state: {
      config,
      selectedPreset,
      hasUnsavedChanges,
      lastError,
    },
    actions: {
      updateConfigValue,
      updateSensitivity,
      applyPreset,
      saveConfig,
      resetConfig,
      exportConfig,
      importConfig,
      importConfigFromString,
      markAsSaved,
    },
  };
}
