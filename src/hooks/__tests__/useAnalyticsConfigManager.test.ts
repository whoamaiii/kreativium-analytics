import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAnalyticsConfigManager } from '../useAnalyticsConfigManager';
import type { AnalyticsConfiguration } from '@/lib/analyticsConfig';

// Mock dependencies
const mockSubscribe = vi.fn();
const mockSetConfig = vi.fn();
const mockGetConfig = vi.fn();
const mockExportConfig = vi.fn();
const mockImportConfig = vi.fn();

vi.mock('@/lib/analyticsConfig', () => ({
  analyticsConfig: {
    subscribe: mockSubscribe,
    setConfig: mockSetConfig,
    getConfig: mockGetConfig,
    exportConfig: mockExportConfig,
    importConfig: mockImportConfig,
  },
  PRESET_CONFIGS: {
    balanced: {
      analytics: { MIN_TRACKING_FOR_CORRELATION: 5 },
      alertSensitivity: { level: 'medium' },
    },
    performance: {
      analytics: { MIN_TRACKING_FOR_CORRELATION: 10 },
      alertSensitivity: { level: 'low' },
    },
    quality: {
      analytics: { MIN_TRACKING_FOR_CORRELATION: 3 },
      alertSensitivity: { level: 'high' },
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

describe('useAnalyticsConfigManager', () => {
  const mockConfig: AnalyticsConfiguration = {
    analytics: { MIN_TRACKING_FOR_CORRELATION: 5 },
    alertSensitivity: { level: 'medium' },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockReturnValue(mockConfig);
    mockSubscribe.mockReturnValue(vi.fn()); // Return unsubscribe function
    mockExportConfig.mockReturnValue(JSON.stringify(mockConfig));
    mockImportConfig.mockReturnValue(true);

    // Mock DOM APIs
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  describe('Initial State', () => {
    it('initializes with current config', () => {
      const { result } = renderHook(() => useAnalyticsConfigManager());

      expect(result.current.state.config).toEqual(mockConfig);
      expect(result.current.state.selectedPreset).toBe('balanced');
      expect(result.current.state.hasUnsavedChanges).toBe(false);
      expect(result.current.state.lastError).toBeNull();
    });

    it('subscribes to config changes', () => {
      renderHook(() => useAnalyticsConfigManager());

      expect(mockSubscribe).toHaveBeenCalled();
    });

    it('unsubscribes on unmount', () => {
      const unsubscribe = vi.fn();
      mockSubscribe.mockReturnValue(unsubscribe);

      const { unmount } = renderHook(() => useAnalyticsConfigManager());

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Config Updates', () => {
    it('updates config value at path', () => {
      const { result } = renderHook(() => useAnalyticsConfigManager());

      act(() => {
        result.current.actions.updateConfigValue(
          ['analytics', 'MIN_TRACKING_FOR_CORRELATION'],
          10
        );
      });

      expect(result.current.state.config.analytics.MIN_TRACKING_FOR_CORRELATION).toBe(10);
      expect(result.current.state.hasUnsavedChanges).toBe(true);
      expect(result.current.state.selectedPreset).toBe('custom');
    });

    it('updates nested config values', () => {
      const { result } = renderHook(() => useAnalyticsConfigManager());

      act(() => {
        result.current.actions.updateConfigValue(['alertSensitivity', 'level'], 'high');
      });

      expect(result.current.state.config.alertSensitivity.level).toBe('high');
      expect(result.current.state.hasUnsavedChanges).toBe(true);
    });

    it('updates sensitivity level', () => {
      const { result } = renderHook(() => useAnalyticsConfigManager());

      act(() => {
        result.current.actions.updateSensitivity('high');
      });

      expect(result.current.state.config.alertSensitivity.level).toBe('high');
      expect(result.current.state.hasUnsavedChanges).toBe(true);
      expect(result.current.state.selectedPreset).toBe('custom');
    });
  });

  describe('Presets', () => {
    it('applies preset configuration', () => {
      const { result } = renderHook(() => useAnalyticsConfigManager());

      act(() => {
        result.current.actions.applyPreset('performance');
      });

      expect(result.current.state.config.analytics.MIN_TRACKING_FOR_CORRELATION).toBe(10);
      expect(result.current.state.selectedPreset).toBe('performance');
      expect(result.current.state.hasUnsavedChanges).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        '[useAnalyticsConfigManager] Applied preset: performance'
      );
    });

    it('handles invalid preset gracefully', () => {
      const { result } = renderHook(() => useAnalyticsConfigManager());

      act(() => {
        result.current.actions.applyPreset('invalid' as any);
      });

      expect(logger.error).toHaveBeenCalled();
      // Config should remain unchanged
      expect(result.current.state.config).toEqual(mockConfig);
    });
  });

  describe('Save and Reset', () => {
    it('saves configuration successfully', () => {
      const onSave = vi.fn();
      const { result } = renderHook(() =>
        useAnalyticsConfigManager({ onSave })
      );

      // Make a change
      act(() => {
        result.current.actions.updateConfigValue(['analytics', 'MIN_TRACKING_FOR_CORRELATION'], 10);
      });

      expect(result.current.state.hasUnsavedChanges).toBe(true);

      // Save
      act(() => {
        result.current.actions.saveConfig();
      });

      expect(mockSetConfig).toHaveBeenCalledWith(result.current.state.config);
      expect(result.current.state.hasUnsavedChanges).toBe(false);
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Configuration saved',
        })
      );
      expect(onSave).toHaveBeenCalled();
    });

    it('handles save errors', () => {
      const error = new Error('Save failed');
      mockSetConfig.mockImplementation(() => {
        throw error;
      });

      const { result } = renderHook(() => useAnalyticsConfigManager());

      act(() => {
        result.current.actions.saveConfig();
      });

      expect(result.current.state.lastError).toEqual(error);
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Save failed',
          variant: 'destructive',
        })
      );
    });

    it('calls custom error handler on save error', () => {
      const error = new Error('Save failed');
      const onError = vi.fn();
      mockSetConfig.mockImplementation(() => {
        throw error;
      });

      const { result } = renderHook(() =>
        useAnalyticsConfigManager({ onError })
      );

      act(() => {
        result.current.actions.saveConfig();
      });

      expect(onError).toHaveBeenCalledWith(error);
      expect(toast).not.toHaveBeenCalled(); // Custom handler prevents default toast
    });

    it('resets to default configuration', () => {
      const { result } = renderHook(() => useAnalyticsConfigManager());

      // Make changes
      act(() => {
        result.current.actions.updateConfigValue(['analytics', 'MIN_TRACKING_FOR_CORRELATION'], 100);
      });

      // Reset
      act(() => {
        result.current.actions.resetConfig();
      });

      expect(result.current.state.config.analytics.MIN_TRACKING_FOR_CORRELATION).toBe(5);
      expect(result.current.state.selectedPreset).toBe('balanced');
      expect(result.current.state.hasUnsavedChanges).toBe(true);
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Configuration reset',
        })
      );
    });
  });

  describe('Export', () => {
    it('exports configuration as JSON file', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

      const { result } = renderHook(() => useAnalyticsConfigManager());

      act(() => {
        result.current.actions.exportConfig();
      });

      expect(mockExportConfig).toHaveBeenCalled();
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockLink.download).toBe('analytics-config.json');
      expect(mockLink.click).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Configuration exported',
        })
      );

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('handles export errors', () => {
      const error = new Error('Export failed');
      mockExportConfig.mockImplementation(() => {
        throw error;
      });

      const { result } = renderHook(() => useAnalyticsConfigManager());

      act(() => {
        result.current.actions.exportConfig();
      });

      expect(result.current.state.lastError).toEqual(error);
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Export failed',
          variant: 'destructive',
        })
      );
    });
  });

  describe('Import', () => {
    it('imports configuration from string', () => {
      const { result } = renderHook(() => useAnalyticsConfigManager());
      const jsonString = JSON.stringify(mockConfig);

      act(() => {
        const success = result.current.actions.importConfigFromString(jsonString);
        expect(success).toBe(true);
      });

      expect(mockImportConfig).toHaveBeenCalledWith(jsonString);
      expect(result.current.state.hasUnsavedChanges).toBe(false);
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Configuration imported',
        })
      );
    });

    it('handles invalid import string', () => {
      mockImportConfig.mockReturnValue(false);

      const { result } = renderHook(() => useAnalyticsConfigManager());

      act(() => {
        const success = result.current.actions.importConfigFromString('invalid');
        expect(success).toBe(false);
      });

      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Invalid configuration',
          variant: 'destructive',
        })
      );
    });

    it('imports configuration from file', async () => {
      const fileContent = JSON.stringify(mockConfig);
      const file = new File([fileContent], 'config.json', { type: 'application/json' });

      const { result } = renderHook(() => useAnalyticsConfigManager());

      await act(async () => {
        await result.current.actions.importConfig(file);
      });

      expect(mockImportConfig).toHaveBeenCalledWith(fileContent);
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Configuration imported',
        })
      );
    });

    it('rejects files exceeding size limit', async () => {
      const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6 MB
      const file = new File([largeContent], 'config.json', { type: 'application/json' });

      const { result } = renderHook(() => useAnalyticsConfigManager());

      await act(async () => {
        await result.current.actions.importConfig(file);
      });

      expect(mockImportConfig).not.toHaveBeenCalled();
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'File too large',
          variant: 'destructive',
        })
      );
    });

    it('rejects invalid file types', async () => {
      const file = new File(['content'], 'config.txt', { type: 'text/plain' });

      const { result } = renderHook(() => useAnalyticsConfigManager());

      await act(async () => {
        await result.current.actions.importConfig(file);
      });

      expect(mockImportConfig).not.toHaveBeenCalled();
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Invalid file type',
          variant: 'destructive',
        })
      );
    });

    it('handles file read errors', async () => {
      const file = new File(['content'], 'config.json', { type: 'application/json' });

      // Mock FileReader to fail
      const originalFileReader = global.FileReader;
      global.FileReader = class {
        readAsText() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new ProgressEvent('error'));
            }
          }, 0);
        }
        onload: any;
        onerror: any;
      } as any;

      const { result } = renderHook(() => useAnalyticsConfigManager());

      await expect(
        act(async () => {
          await result.current.actions.importConfig(file);
        })
      ).rejects.toThrow();

      global.FileReader = originalFileReader;
    });
  });

  describe('External Config Changes', () => {
    it('updates state when external config changes', () => {
      let subscriber: (config: AnalyticsConfiguration) => void;
      mockSubscribe.mockImplementation((callback) => {
        subscriber = callback;
        return vi.fn();
      });

      const onConfigChange = vi.fn();
      const { result } = renderHook(() =>
        useAnalyticsConfigManager({ onConfigChange })
      );

      const newConfig = {
        ...mockConfig,
        analytics: { MIN_TRACKING_FOR_CORRELATION: 15 },
      } as any;

      act(() => {
        subscriber!(newConfig);
      });

      expect(result.current.state.config).toEqual(newConfig);
      expect(onConfigChange).toHaveBeenCalledWith(newConfig);
    });
  });

  describe('Utility Functions', () => {
    it('marks changes as saved', () => {
      const { result } = renderHook(() => useAnalyticsConfigManager());

      act(() => {
        result.current.actions.updateConfigValue(['analytics', 'MIN_TRACKING_FOR_CORRELATION'], 10);
      });

      expect(result.current.state.hasUnsavedChanges).toBe(true);

      act(() => {
        result.current.actions.markAsSaved();
      });

      expect(result.current.state.hasUnsavedChanges).toBe(false);
    });
  });
});
