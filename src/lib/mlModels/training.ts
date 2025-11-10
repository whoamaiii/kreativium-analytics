/**
 * Generic ML Model Training Orchestrator
 *
 * Provides a unified training pipeline that handles:
 * - Data preparation and normalization
 * - Model creation and compilation
 * - Training with callbacks
 * - Evaluation metrics recording
 * - Cross-validation (optional)
 * - Model persistence
 * - Tensor memory cleanup
 *
 * Supports both regression (emotion) and classification (sensory) tasks.
 */

import * as tf from '@tensorflow/tfjs';
import { logger } from '@/lib/logger';
import { TrackingEntry } from '@/types/student';
import { analyticsConfig } from '@/lib/analyticsConfig';
import { toMLSessions } from '@/lib/dataPreprocessing';
import { recordEvaluation, type EvaluationRun } from '@/lib/modelEvaluation';
import { createCacheKey } from '@/lib/analytics/cache-key';
import { CrossValidator, type TimeSeriesValidationConfig } from '@/lib/validation/crossValidation';
import type { ModelType, ModelMetadata, MLSession } from './types';
import type { ModelStorage } from './storage';

// ============================================================================
// Types
// ============================================================================

/**
 * Generic dataset preparation result.
 * Contains input/output tensors and preprocessing metadata.
 */
export interface DatasetResult<TInput extends tf.Tensor = tf.Tensor, TOutput extends tf.Tensor = tf.Tensor> {
  inputs: TInput;
  outputs: TOutput;
  meta: {
    schemaVersion?: string;
    [key: string]: unknown;
  };
}

/**
 * Model factory function that creates and compiles a model.
 */
export type ModelFactory = () => tf.Sequential | tf.LayersModel;

/**
 * Dataset preparation function that converts ML sessions to training tensors.
 */
export type DatasetPreparator<T extends DatasetResult = DatasetResult> = (
  sessions: MLSession[],
  ...args: unknown[]
) => T;

/**
 * Task type determines which metrics are tracked and how models are evaluated.
 */
export type TaskType = 'regression' | 'classification';

/**
 * Metrics extraction strategy for different task types.
 */
export interface MetricsExtractor {
  /**
   * Extract validation metrics from training history.
   */
  extract(history: tf.History): {
    primary?: number;  // Main metric (e.g., val_mse or val_accuracy)
    secondary?: number; // Secondary metric (e.g., mae)
    loss?: number;      // Training loss
  };

  /**
   * Build evaluation run metrics object for recording.
   */
  buildMetrics(extracted: ReturnType<MetricsExtractor['extract']>): EvaluationRun['metrics'];
}

/**
 * Model architecture metadata for persistence.
 */
export interface ArchitectureMetadata {
  name: string;           // e.g., 'LSTM', 'Dense'
  inputShape: number[];   // e.g., [7, 13] or [12]
  outputShape: number[];  // e.g., [7] or [15]
}

/**
 * Configuration for training a specific model type.
 */
export interface TrainingConfig<T extends DatasetResult = DatasetResult> {
  // Model identification
  modelType: ModelType;

  // Data
  trackingEntries: TrackingEntry[];

  // Model and data preparation
  createModel: ModelFactory;
  prepareDataset: DatasetPreparator<T>;
  datasetArgs?: unknown[]; // Optional additional args for prepareDataset

  // Architecture metadata
  architecture: ArchitectureMetadata;

  // Task configuration
  taskType: TaskType;
  metricsExtractor: MetricsExtractor;

  // Training parameters
  epochs?: number;
  batchSize?: number;
  validationSplit?: number;
  callbacks?: tf.CustomCallbackArgs;

  // Storage
  storage: ModelStorage;
  modelMap: Map<ModelType, { model: tf.Sequential | tf.LayersModel; metadata: ModelMetadata }>;

  // Optional advanced features
  crossValidation?: {
    enabled: boolean;
    config?: Partial<TimeSeriesValidationConfig>;
  };
}

/**
 * Training result containing model and metadata.
 */
export interface TrainingResult {
  model: tf.Sequential | tf.LayersModel;
  metadata: ModelMetadata;
  history: tf.History;
}

// ============================================================================
// Metrics Extractors
// ============================================================================

/**
 * Regression metrics extractor (MSE, MAE).
 */
export const regressionMetrics: MetricsExtractor = {
  extract(history: tf.History) {
    const finalLoss = history.history.loss?.[history.history.loss.length - 1] as number | undefined;
    const finalValMSE = (history.history.val_mse?.[history.history.val_mse.length - 1] as number | undefined)
      ?? (history.history.mse?.[history.history.mse.length - 1] as number | undefined);
    const finalValMAE = (history.history.val_mae?.[history.history.val_mae.length - 1] as number | undefined)
      ?? (history.history.mae?.[history.history.mae.length - 1] as number | undefined);

    return {
      primary: finalValMSE,
      secondary: finalValMAE,
      loss: finalLoss,
    };
  },

  buildMetrics(extracted) {
    return {
      regression: {
        mse: extracted.primary,
        mae: extracted.secondary,
      }
    };
  }
};

/**
 * Classification metrics extractor (accuracy).
 */
export const classificationMetrics: MetricsExtractor = {
  extract(history: tf.History) {
    const finalLoss = history.history.loss?.[history.history.loss.length - 1] as number | undefined;
    const finalValAcc = (history.history.val_accuracy?.[history.history.val_accuracy.length - 1] as number | undefined)
      ?? (history.history.accuracy?.[history.history.accuracy.length - 1] as number | undefined)
      ?? (history.history.acc?.[history.history.acc.length - 1] as number | undefined);

    return {
      primary: finalValAcc,
      loss: finalLoss,
    };
  },

  buildMetrics(extracted) {
    return {
      classification: {
        accuracy: extracted.primary,
      }
    };
  }
};

// ============================================================================
// Main Training Orchestrator
// ============================================================================

/**
 * Generic model training orchestrator using Template Method pattern.
 *
 * Handles the complete training lifecycle:
 * 1. Data conversion and preparation
 * 2. Model creation
 * 3. Model fitting with callbacks
 * 4. Evaluation metrics recording
 * 5. Optional cross-validation
 * 6. Model persistence
 * 7. Tensor cleanup
 *
 * @param config - Training configuration specifying model type, data, and parameters
 * @returns Promise resolving to training result with model and metadata
 *
 * @example
 * ```typescript
 * const result = await trainModel({
 *   modelType: 'emotion-prediction',
 *   trackingEntries: entries,
 *   createModel: createEmotionModel,
 *   prepareDataset: prepareEmotionDataset,
 *   architecture: { name: 'LSTM', inputShape: [7, 13], outputShape: [7] },
 *   taskType: 'regression',
 *   metricsExtractor: regressionMetrics,
 *   epochs: 50,
 *   storage: modelStorage,
 *   modelMap: models,
 * });
 * ```
 */
export async function trainModel<T extends DatasetResult>(
  config: TrainingConfig<T>
): Promise<TrainingResult> {
  const {
    modelType,
    trackingEntries,
    createModel,
    prepareDataset,
    datasetArgs = [],
    architecture,
    taskType,
    metricsExtractor,
    epochs = 50,
    batchSize = 32,
    validationSplit = 0.2,
    callbacks,
    storage,
    modelMap,
    crossValidation,
  } = config;

  logger.debug(`[trainModel] Starting training for ${modelType}`, {
    dataPoints: trackingEntries.length,
    epochs,
    taskType,
  });

  // Step 1: Convert tracking entries to ML sessions
  const sessions = toMLSessions(trackingEntries);

  // Step 2: Create model architecture
  const model = createModel();

  // Step 3: Prepare dataset (inputs/outputs tensors)
  const { inputs, outputs, meta } = prepareDataset(sessions, ...datasetArgs);

  try {
    // Step 4: Get runtime configuration
    const cfgRuntime = analyticsConfig.getConfig();

    // Step 5: Train model
    logger.debug(`[trainModel] Fitting model for ${modelType}`, {
      inputShape: inputs.shape,
      outputShape: outputs.shape,
    });

    const history = await model.fit(inputs, outputs, {
      epochs,
      batchSize,
      validationSplit,
      callbacks,
      shuffle: true,
    });

    // Step 6: Extract and record evaluation metrics
    await recordTrainingEvaluation({
      modelType,
      taskType,
      trackingEntries,
      epochs,
      history,
      metricsExtractor,
      architecture,
      meta,
      cfgRuntime,
    });

    // Step 7: Optional time-series cross-validation (dev mode only)
    if (import.meta.env?.DEV && crossValidation?.enabled) {
      await performCrossValidation({
        modelType,
        taskType,
        createModel,
        inputs,
        outputs,
        trackingEntries,
        meta,
        cvConfig: crossValidation.config,
        architecture,
        cfgRuntime,
      });
    }

    // Step 8: Create metadata
    const extractedMetrics = metricsExtractor.extract(history);
    const metadata: ModelMetadata = {
      name: modelType,
      version: '1.0.0',
      createdAt: new Date(),
      lastTrainedAt: new Date(),
      accuracy: extractedMetrics.primary,
      loss: extractedMetrics.loss,
      inputShape: architecture.inputShape,
      outputShape: architecture.outputShape,
      architecture: architecture.name,
      epochs,
      dataPoints: trackingEntries.length,
      preprocessingSchemaVersion: meta?.schemaVersion,
    };

    // Step 9: Persist model
    logger.debug(`[trainModel] Persisting model for ${modelType}`);
    await storage.saveModel(modelType, model, metadata);
    modelMap.set(modelType, { model, metadata });

    logger.info(`[trainModel] Training completed for ${modelType}`, {
      loss: metadata.loss,
      accuracy: metadata.accuracy,
    });

    return { model, metadata, history };

  } finally {
    // Step 10: Clean up tensors (always execute)
    logger.debug(`[trainModel] Cleaning up tensors for ${modelType}`);
    inputs.dispose();
    outputs.dispose();
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Record training evaluation run with task-specific metrics.
 */
async function recordTrainingEvaluation(params: {
  modelType: ModelType;
  taskType: TaskType;
  trackingEntries: TrackingEntry[];
  epochs: number;
  history: tf.History;
  metricsExtractor: MetricsExtractor;
  architecture: ArchitectureMetadata;
  meta: { schemaVersion?: string; [key: string]: unknown };
  cfgRuntime: ReturnType<typeof analyticsConfig.getConfig>;
}): Promise<void> {
  const {
    modelType,
    taskType,
    trackingEntries,
    epochs,
    history,
    metricsExtractor,
    architecture,
    meta,
    cfgRuntime,
  } = params;

  try {
    const extractedMetrics = metricsExtractor.extract(history);

    // Create stable signatures for deduplication
    const dataSignature = createCacheKey({
      namespace: 'ml-training:data',
      input: {
        modelType,
        dataPoints: trackingEntries.length,
        epochs,
        preprocessingSchemaVersion: meta?.schemaVersion,
      },
      version: cfgRuntime.schemaVersion,
    });

    const configSignature = createCacheKey({
      namespace: 'ml-training:config',
      input: {
        inputShape: architecture.inputShape,
        outputShape: architecture.outputShape,
        architecture: architecture.name,
      },
      version: cfgRuntime.schemaVersion,
    });

    // Build evaluation run
    const run: EvaluationRun = {
      id: `${Date.now()}-${modelType}`,
      modelType,
      timestamp: Date.now(),
      dataSignature,
      configSignature,
      taskType,
      metrics: metricsExtractor.buildMetrics(extractedMetrics),
      schemaVersion: cfgRuntime.schemaVersion,
      notes: meta?.schemaVersion ? `preprocessingSchemaVersion=${meta.schemaVersion}` : undefined,
    };

    recordEvaluation(run);
  } catch (error) {
    // Fail-soft: never block training if evaluation capture fails
    logger.warn(`[trainModel] Failed to record evaluation for ${modelType}`, error);
  }
}

/**
 * Perform time-series cross-validation (dev mode only).
 */
async function performCrossValidation(params: {
  modelType: ModelType;
  taskType: TaskType;
  createModel: ModelFactory;
  inputs: tf.Tensor;
  outputs: tf.Tensor;
  trackingEntries: TrackingEntry[];
  meta: { schemaVersion?: string; [key: string]: unknown };
  cvConfig?: Partial<TimeSeriesValidationConfig>;
  architecture: ArchitectureMetadata;
  cfgRuntime: ReturnType<typeof analyticsConfig.getConfig>;
}): Promise<void> {
  const {
    modelType,
    taskType,
    createModel,
    inputs,
    outputs,
    trackingEntries,
    meta,
    cvConfig,
    architecture,
    cfgRuntime,
  } = params;

  try {
    logger.debug(`[trainModel] Running time-series CV for ${modelType}`);

    const validator = new CrossValidator();

    // Determine default window size based on data
    const defaultWindowSize = Math.min(
      taskType === 'regression' ? 7 : 8,
      Math.max(3, Math.floor(inputs.shape[0] / 3) || 3)
    );

    const tsCfg: TimeSeriesValidationConfig = {
      strategy: cvConfig?.strategy ?? 'rolling',
      windowSize: cvConfig?.windowSize ?? defaultWindowSize,
      horizon: cvConfig?.horizon ?? 1,
      gap: cvConfig?.gap ?? 0,
      folds: cvConfig?.folds,
      taskType,
    };

    const tsResults = await validator.validateTimeSeriesModel(
      createModel,
      { features: inputs, labels: outputs },
      tsCfg
    );

    // Create signatures for CV run
    const dataSignature = createCacheKey({
      namespace: 'ml-training:data',
      input: {
        modelType,
        dataPoints: trackingEntries.length,
        preprocessingSchemaVersion: meta?.schemaVersion,
      },
      version: cfgRuntime.schemaVersion,
    });

    const cvSig = createCacheKey({
      namespace: 'ml-training:cv',
      input: { tsCfg, preprocessingSchemaVersion: meta?.schemaVersion },
      version: cfgRuntime.schemaVersion,
    });

    // Build metrics based on task type
    const cvMetrics: EvaluationRun['metrics'] = {};
    if (taskType === 'regression' && tsResults.average?.regression) {
      cvMetrics.regression = {
        mse: tsResults.average.regression.mse,
        rmse: tsResults.average.regression.rmse,
        mae: tsResults.average.regression.mae,
        mape: tsResults.average.regression.mape,
      };
    } else if (taskType === 'classification' && tsResults.average?.classification) {
      cvMetrics.classification = {
        accuracy: tsResults.average.classification.accuracy,
        precision: tsResults.average.classification.precision,
        recall: tsResults.average.classification.recall,
        f1: tsResults.average.classification.f1Score,
      };
    }

    const cvRun: EvaluationRun = {
      id: `${Date.now()}-${modelType}-tscv`,
      modelType,
      timestamp: Date.now(),
      dataSignature,
      configSignature: cvSig,
      taskType,
      metrics: cvMetrics,
      cv: {
        strategy: 'time-series',
        horizon: tsCfg.horizon,
        windowSize: tsCfg.windowSize,
        folds: tsCfg.folds,
      },
      schemaVersion: cfgRuntime.schemaVersion,
      notes: 'Time-series cross-validation (dev-only)',
    };

    recordEvaluation(cvRun);

    logger.debug(`[trainModel] CV completed for ${modelType}`, {
      strategy: tsCfg.strategy,
      folds: tsCfg.folds,
    });
  } catch (error) {
    // Fail-soft: CV failure should not block training
    logger.warn(`[trainModel] Cross-validation failed for ${modelType}`, error);
  }
}
