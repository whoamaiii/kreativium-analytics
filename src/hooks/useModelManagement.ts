/**
 * ML Model Management Hook
 *
 * Extracted from AnalyticsSettings.tsx to separate ML operations from UI concerns.
 * Handles model training, deletion, status loading, and evaluation.
 *
 * This hook consolidates all ML model operations into a single, testable interface
 * that can be reused across different components.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getMlModels, type ModelMetadata, type ModelType } from '@/lib/mlModels';
import { logger } from '@/lib/logger';
import { toast } from '@/hooks/use-toast';

// ============================================================================
// Types
// ============================================================================

export interface ModelStatus {
  metadata: ModelMetadata | null;
  isTraining: boolean;
  isDeleting: boolean;
}

export interface ModelManagementState {
  /**
   * Map of model type to its current status
   */
  models: Map<ModelType, ModelStatus>;

  /**
   * Whether models are being loaded from storage
   */
  isLoading: boolean;

  /**
   * Global ML enabled/disabled flag
   */
  mlEnabled: boolean;

  /**
   * Last error encountered during model operations
   */
  lastError: Error | null;
}

export interface ModelManagementActions {
  /**
   * Load status for all models
   */
  loadModelStatus: () => Promise<void>;

  /**
   * Train a specific model type
   */
  trainModel: (modelType: ModelType) => Promise<void>;

  /**
   * Delete a specific model
   */
  deleteModel: (modelType: ModelType) => Promise<void>;

  /**
   * Enable or disable ML globally
   */
  setMlEnabled: (enabled: boolean) => void;

  /**
   * Get status for a specific model
   */
  getModelStatus: (modelType: ModelType) => ModelStatus | undefined;

  /**
   * Check if any model is currently training
   */
  isAnyModelTraining: () => boolean;
}

export interface UseModelManagementReturn {
  state: ModelManagementState;
  actions: ModelManagementActions;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Simulated training duration for UI feedback
 * In production, this would be replaced with actual training progress
 */
const TRAINING_SIMULATION_MS = 3000;

/**
 * Default status for a model that doesn't exist yet
 */
const DEFAULT_MODEL_STATUS: ModelStatus = {
  metadata: null,
  isTraining: false,
  isDeleting: false,
};

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing ML model operations
 *
 * @param options.autoLoad - Automatically load model status on mount (default: true)
 * @param options.onError - Custom error handler
 * @param options.onTrainingComplete - Called when training completes
 *
 * @example
 * ```typescript
 * const { state, actions } = useModelManagement();
 *
 * // Load model status
 * await actions.loadModelStatus();
 *
 * // Train a model
 * await actions.trainModel('emotion');
 *
 * // Delete a model
 * await actions.deleteModel('sensory');
 *
 * // Check status
 * const emotionModel = actions.getModelStatus('emotion');
 * if (emotionModel?.isTraining) {
 *   console.log('Model is training...');
 * }
 * ```
 */
export function useModelManagement(options: {
  autoLoad?: boolean;
  onError?: (error: Error) => void;
  onTrainingComplete?: (modelType: ModelType) => void;
} = {}): UseModelManagementReturn {
  const { autoLoad = true, onError, onTrainingComplete } = options;

  // State
  const [models, setModels] = useState<Map<ModelType, ModelStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [mlEnabled, setMlEnabled] = useState(true);
  const [lastError, setLastError] = useState<Error | null>(null);

  // Track training timeouts for cleanup
  const trainingTimeoutsRef = useRef<Map<ModelType, NodeJS.Timeout>>(new Map());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all training timeouts
      trainingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      trainingTimeoutsRef.current.clear();
    };
  }, []);

  /**
   * Load status for all models
   */
  const loadModelStatus = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);

    try {
      const ml = await getMlModels();
      await ml.init();
      const statusMap = await ml.getModelStatus();

      // Convert to our ModelStatus format
      const newModels = new Map<ModelType, ModelStatus>();
      statusMap.forEach((metadata, modelType) => {
        newModels.set(modelType, {
          metadata,
          isTraining: false,
          isDeleting: false,
        });
      });

      setModels(newModels);
    } catch (error) {
      const err = error as Error;
      logger.error('[useModelManagement] Failed to load model status', { error: err });
      setLastError(err);

      if (onError) {
        onError(err);
      } else {
        toast({
          title: 'Failed to load ML models',
          description: 'Could not retrieve model status. Some features may be unavailable.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  /**
   * Train a specific model
   */
  const trainModel = useCallback(async (modelType: ModelType) => {
    setLastError(null);

    // Update state to show training
    setModels((prev) => {
      const newModels = new Map(prev);
      const currentStatus = newModels.get(modelType) || DEFAULT_MODEL_STATUS;
      newModels.set(modelType, { ...currentStatus, isTraining: true });
      return newModels;
    });

    toast({
      title: `Training ${modelType} model`,
      description: 'Model training started in background...',
    });

    try {
      // Clear any existing timeout for this model
      const existingTimeout = trainingTimeoutsRef.current.get(modelType);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Simulate training with timeout (replace with actual training in production)
      const timeout = setTimeout(async () => {
        try {
          // Reload model status to get updated metadata
          await loadModelStatus();

          toast({
            title: `${modelType} model updated`,
            description: 'Model training completed successfully',
          });

          // Call completion callback
          if (onTrainingComplete) {
            onTrainingComplete(modelType);
          }

          // Clear training flag
          setModels((prev) => {
            const newModels = new Map(prev);
            const currentStatus = newModels.get(modelType);
            if (currentStatus) {
              newModels.set(modelType, { ...currentStatus, isTraining: false });
            }
            return newModels;
          });
        } catch (error) {
          logger.error(`[useModelManagement] Failed to complete training for ${modelType}`, { error });
        } finally {
          trainingTimeoutsRef.current.delete(modelType);
        }
      }, TRAINING_SIMULATION_MS);

      trainingTimeoutsRef.current.set(modelType, timeout);
    } catch (error) {
      const err = error as Error;
      logger.error(`[useModelManagement] Failed to train ${modelType} model`, { error: err });
      setLastError(err);

      toast({
        title: 'Training failed',
        description: `Failed to train ${modelType} model`,
        variant: 'destructive',
      });

      // Clear training flag on error
      setModels((prev) => {
        const newModels = new Map(prev);
        const currentStatus = newModels.get(modelType);
        if (currentStatus) {
          newModels.set(modelType, { ...currentStatus, isTraining: false });
        }
        return newModels;
      });
    }
  }, [loadModelStatus, onTrainingComplete]);

  /**
   * Delete a specific model
   */
  const deleteModel = useCallback(async (modelType: ModelType) => {
    setLastError(null);

    // Update state to show deleting
    setModels((prev) => {
      const newModels = new Map(prev);
      const currentStatus = newModels.get(modelType) || DEFAULT_MODEL_STATUS;
      newModels.set(modelType, { ...currentStatus, isDeleting: true });
      return newModels;
    });

    try {
      const ml = await getMlModels();
      await ml.deleteModel(modelType);

      // Reload status to reflect deletion
      await loadModelStatus();

      toast({
        title: `${modelType} model deleted`,
        description: 'Model has been removed successfully',
      });
    } catch (error) {
      const err = error as Error;
      logger.error(`[useModelManagement] Failed to delete ${modelType} model`, { error: err });
      setLastError(err);

      toast({
        title: 'Deletion failed',
        description: `Failed to delete ${modelType} model`,
        variant: 'destructive',
      });

      // Clear deleting flag on error
      setModels((prev) => {
        const newModels = new Map(prev);
        const currentStatus = newModels.get(modelType);
        if (currentStatus) {
          newModels.set(modelType, { ...currentStatus, isDeleting: false });
        }
        return newModels;
      });
    }
  }, [loadModelStatus]);

  /**
   * Get status for a specific model
   */
  const getModelStatus = useCallback((modelType: ModelType): ModelStatus | undefined => {
    return models.get(modelType);
  }, [models]);

  /**
   * Check if any model is currently training
   */
  const isAnyModelTraining = useCallback((): boolean => {
    for (const status of models.values()) {
      if (status.isTraining) {
        return true;
      }
    }
    return false;
  }, [models]);

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad) {
      loadModelStatus();
    }
  }, [autoLoad, loadModelStatus]);

  return {
    state: {
      models,
      isLoading,
      mlEnabled,
      lastError,
    },
    actions: {
      loadModelStatus,
      trainModel,
      deleteModel,
      setMlEnabled,
      getModelStatus,
      isAnyModelTraining,
    },
  };
}
