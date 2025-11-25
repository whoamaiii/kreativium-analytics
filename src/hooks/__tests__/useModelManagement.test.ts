import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useModelManagement } from '../useModelManagement';
import type { ModelMetadata, ModelType } from '@/lib/mlModels';

// Mock dependencies
vi.mock('@/lib/mlModels', () => ({
  getMlModels: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

import { getMlModels } from '@/lib/mlModels';
import { toast } from '@/hooks/useToast';

describe('useModelManagement', () => {
  // Mock ML models interface
  const mockMlModels = {
    init: vi.fn().mockResolvedValue(undefined),
    getModelStatus: vi.fn(),
    deleteModel: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    (getMlModels as any).mockResolvedValue(mockMlModels);

    // Default: return empty model status
    mockMlModels.getModelStatus.mockResolvedValue(new Map());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('initializes with empty models and loading state', () => {
      const { result } = renderHook(() => useModelManagement({ autoLoad: false }));

      expect(result.current.state.models.size).toBe(0);
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.mlEnabled).toBe(true);
      expect(result.current.state.lastError).toBeNull();
    });

    it('auto-loads model status by default', async () => {
      mockMlModels.getModelStatus.mockResolvedValue(
        new Map([['emotion', { accuracy: 0.85, lastTrained: new Date().toISOString() }]]),
      );

      const { result } = renderHook(() => useModelManagement());

      // Initially loading
      expect(result.current.state.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      expect(mockMlModels.init).toHaveBeenCalled();
      expect(mockMlModels.getModelStatus).toHaveBeenCalled();
      expect(result.current.state.models.size).toBe(1);
    });

    it('skips auto-load when autoLoad is false', () => {
      renderHook(() => useModelManagement({ autoLoad: false }));

      expect(mockMlModels.init).not.toHaveBeenCalled();
      expect(mockMlModels.getModelStatus).not.toHaveBeenCalled();
    });
  });

  describe('loadModelStatus', () => {
    it('loads model status successfully', async () => {
      const mockMetadata: ModelMetadata = {
        accuracy: 0.9,
        lastTrained: new Date().toISOString(),
      };

      mockMlModels.getModelStatus.mockResolvedValue(
        new Map([
          ['emotion', mockMetadata],
          ['sensory', mockMetadata],
        ]),
      );

      const { result } = renderHook(() => useModelManagement({ autoLoad: false }));

      await act(async () => {
        await result.current.actions.loadModelStatus();
      });

      expect(result.current.state.models.size).toBe(2);
      expect(result.current.state.models.get('emotion' as ModelType)?.metadata).toEqual(
        mockMetadata,
      );
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.lastError).toBeNull();
    });

    it('handles loading errors', async () => {
      const error = new Error('Failed to load models');
      mockMlModels.init.mockRejectedValue(error);

      const { result } = renderHook(() => useModelManagement({ autoLoad: false }));

      await act(async () => {
        await result.current.actions.loadModelStatus();
      });

      expect(result.current.state.lastError).toEqual(error);
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to load ML models',
          variant: 'destructive',
        }),
      );
    });

    it('calls custom error handler when provided', async () => {
      const error = new Error('Test error');
      const onError = vi.fn();
      mockMlModels.init.mockRejectedValue(error);

      const { result } = renderHook(() => useModelManagement({ autoLoad: false, onError }));

      await act(async () => {
        await result.current.actions.loadModelStatus();
      });

      expect(onError).toHaveBeenCalledWith(error);
      expect(toast).not.toHaveBeenCalled(); // Custom handler prevents default toast
    });
  });

  describe('trainModel', () => {
    it('trains model and updates status', async () => {
      const { result } = renderHook(() => useModelManagement({ autoLoad: false }));

      // Start training
      await act(async () => {
        await result.current.actions.trainModel('emotion' as ModelType);
      });

      // Should show training state
      const emotionStatus = result.current.state.models.get('emotion' as ModelType);
      expect(emotionStatus?.isTraining).toBe(true);

      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Training emotion model',
        }),
      );

      // Fast-forward past training duration
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        const updatedStatus = result.current.state.models.get('emotion' as ModelType);
        expect(updatedStatus?.isTraining).toBe(false);
      });

      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'emotion model updated',
        }),
      );
    });

    it('calls onTrainingComplete callback', async () => {
      const onTrainingComplete = vi.fn();

      const { result } = renderHook(() =>
        useModelManagement({ autoLoad: false, onTrainingComplete }),
      );

      await act(async () => {
        await result.current.actions.trainModel('emotion' as ModelType);
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(onTrainingComplete).toHaveBeenCalledWith('emotion');
      });
    });

    it('clears previous training timeout when retraining', async () => {
      const { result } = renderHook(() => useModelManagement({ autoLoad: false }));

      // Start first training
      await act(async () => {
        await result.current.actions.trainModel('emotion' as ModelType);
      });

      // Start second training before first completes
      await act(async () => {
        await result.current.actions.trainModel('emotion' as ModelType);
      });

      // Only one completion should happen
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        const updatedStatus = result.current.state.models.get('emotion' as ModelType);
        expect(updatedStatus?.isTraining).toBe(false);
      });

      // Should only show completion toast once
      const completionToasts = (toast as any).mock.calls.filter((call: any[]) =>
        call[0]?.title?.includes('model updated'),
      );
      expect(completionToasts.length).toBe(1);
    });
  });

  describe('deleteModel', () => {
    it('deletes model successfully', async () => {
      const { result } = renderHook(() => useModelManagement({ autoLoad: false }));

      await act(async () => {
        await result.current.actions.deleteModel('emotion' as ModelType);
      });

      expect(mockMlModels.deleteModel).toHaveBeenCalledWith('emotion');
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'emotion model deleted',
        }),
      );
    });

    it('handles deletion errors', async () => {
      const error = new Error('Delete failed');
      mockMlModels.deleteModel.mockRejectedValue(error);

      const { result } = renderHook(() => useModelManagement({ autoLoad: false }));

      await act(async () => {
        await result.current.actions.deleteModel('emotion' as ModelType);
      });

      expect(result.current.state.lastError).toEqual(error);
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Deletion failed',
          variant: 'destructive',
        }),
      );
    });

    it('sets and clears deleting state', async () => {
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockMlModels.deleteModel.mockReturnValue(deletePromise);

      const { result } = renderHook(() => useModelManagement({ autoLoad: false }));

      // Start deletion
      act(() => {
        result.current.actions.deleteModel('emotion' as ModelType);
      });

      await waitFor(() => {
        const status = result.current.state.models.get('emotion' as ModelType);
        expect(status?.isDeleting).toBe(true);
      });

      // Complete deletion
      await act(async () => {
        resolveDelete!();
        await deletePromise;
      });

      await waitFor(() => {
        expect(mockMlModels.getModelStatus).toHaveBeenCalled();
      });
    });
  });

  describe('Utility Functions', () => {
    it('getModelStatus returns correct status', async () => {
      mockMlModels.getModelStatus.mockResolvedValue(
        new Map([['emotion', { accuracy: 0.85, lastTrained: new Date().toISOString() }]]),
      );

      const { result } = renderHook(() => useModelManagement());

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      const status = result.current.actions.getModelStatus('emotion' as ModelType);
      expect(status?.metadata?.accuracy).toBe(0.85);
    });

    it('getModelStatus returns undefined for non-existent model', () => {
      const { result } = renderHook(() => useModelManagement({ autoLoad: false }));

      const status = result.current.actions.getModelStatus('emotion' as ModelType);
      expect(status).toBeUndefined();
    });

    it('isAnyModelTraining returns true when training', async () => {
      const { result } = renderHook(() => useModelManagement({ autoLoad: false }));

      expect(result.current.actions.isAnyModelTraining()).toBe(false);

      await act(async () => {
        await result.current.actions.trainModel('emotion' as ModelType);
      });

      expect(result.current.actions.isAnyModelTraining()).toBe(true);

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(result.current.actions.isAnyModelTraining()).toBe(false);
      });
    });

    it('setMlEnabled updates mlEnabled state', () => {
      const { result } = renderHook(() => useModelManagement({ autoLoad: false }));

      expect(result.current.state.mlEnabled).toBe(true);

      act(() => {
        result.current.actions.setMlEnabled(false);
      });

      expect(result.current.state.mlEnabled).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('clears training timeouts on unmount', async () => {
      const { result, unmount } = renderHook(() => useModelManagement({ autoLoad: false }));

      await act(async () => {
        await result.current.actions.trainModel('emotion' as ModelType);
      });

      // Unmount before training completes
      unmount();

      // Fast-forward timers
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // No completion toast should appear
      const completionToasts = (toast as any).mock.calls.filter((call: any[]) =>
        call[0]?.title?.includes('model updated'),
      );
      expect(completionToasts.length).toBe(0);
    });
  });

  describe('Multiple Models', () => {
    it('handles multiple models independently', async () => {
      const { result } = renderHook(() => useModelManagement({ autoLoad: false }));

      // Train both models
      await act(async () => {
        await result.current.actions.trainModel('emotion' as ModelType);
        await result.current.actions.trainModel('sensory' as ModelType);
      });

      expect(result.current.state.models.get('emotion' as ModelType)?.isTraining).toBe(true);
      expect(result.current.state.models.get('sensory' as ModelType)?.isTraining).toBe(true);

      // Complete both trainings
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(result.current.state.models.get('emotion' as ModelType)?.isTraining).toBe(false);
        expect(result.current.state.models.get('sensory' as ModelType)?.isTraining).toBe(false);
      });
    });
  });
});
