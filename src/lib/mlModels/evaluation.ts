/**
 * Module: mlModels/evaluation
 *
 * Purpose
 * - Extract and record model evaluation metrics from training runs
 * - Support both regression (emotion prediction) and classification (sensory response) tasks
 * - Optionally perform time-series cross-validation in development mode
 *
 * Usage
 * - Called by trainEmotionModel() and trainSensoryModel() after model.fit()
 * - Creates stable cache signatures for data and configuration
 * - Records evaluation runs with recordEvaluation()
 * - Handles time-series CV setup if requested
 */

import * as tf from '@tensorflow/tfjs';
import { TrackingEntry } from '@/types/student';
import { analyticsConfig } from '@/lib/analyticsConfig';
import { recordEvaluation, type EvaluationRun } from '@/lib/modelEvaluation';
import { createCacheKey } from '@/lib/analytics/cache-key';
import { CrossValidator, type TimeSeriesValidationConfig } from '@/lib/validation/crossValidation';
import type { ModelType } from './types';

/**
 * Model architecture configuration for evaluation
 */
export interface ModelArchitecture {
  inputShape: number[];
  outputShape: number[];
  architecture: string;
}

/**
 * Parameters for recording model evaluation
 */
export interface RecordEvaluationParams {
  /** Type of model being evaluated */
  modelType: ModelType;
  /** Training data used for the model */
  trackingEntries: TrackingEntry[];
  /** Training history returned from model.fit() */
  history: tf.History;
  /** Number of training epochs */
  epochs: number;
  /** Model architecture details */
  modelArchitecture: ModelArchitecture;
  /** Optional preprocessing schema version from dataset preparation */
  preprocessingSchemaVersion?: string;
  /** Input tensors for time-series CV (if enabled) */
  inputs?: tf.Tensor;
  /** Output tensors for time-series CV (if enabled) */
  outputs?: tf.Tensor;
  /** Factory function to create fresh model instances for CV */
  createModelFn?: () => tf.Sequential | tf.LayersModel;
  /** Optional time-series cross-validation configuration */
  options?: {
    devRunTimeSeriesCV?: boolean;
    tsConfig?: Partial<TimeSeriesValidationConfig>;
  };
}

/**
 * Configuration for task-specific metric extraction
 */
interface TaskConfig {
  taskType: 'classification' | 'regression';
  defaultWindowSize: number;
}

/**
 * Get task configuration based on model type
 */
function getTaskConfig(modelType: ModelType): TaskConfig {
  switch (modelType) {
    case 'emotion-prediction':
      return {
        taskType: 'regression',
        defaultWindowSize: 7,
      };
    case 'sensory-response':
      return {
        taskType: 'classification',
        defaultWindowSize: 8,
      };
    default:
      // Fallback for baseline-clustering or unknown types
      return {
        taskType: 'regression',
        defaultWindowSize: 5,
      };
  }
}

/**
 * Extract regression metrics from training history
 */
function extractRegressionMetrics(history: tf.History): { mse?: number; mae?: number } {
  const finalValMSE =
    (history.history.val_mse?.[history.history.val_mse.length - 1] as number | undefined) ??
    (history.history.mse?.[history.history.mse.length - 1] as number | undefined);
  const finalValMAE =
    (history.history.val_mae?.[history.history.val_mae.length - 1] as number | undefined) ??
    (history.history.mae?.[history.history.mae.length - 1] as number | undefined);

  return {
    mse: finalValMSE,
    mae: finalValMAE,
  };
}

/**
 * Extract classification metrics from training history
 */
function extractClassificationMetrics(history: tf.History): { accuracy?: number } {
  // TFJS sometimes exposes val_accuracy or acc
  const finalValAcc =
    (history.history.val_accuracy?.[history.history.val_accuracy.length - 1] as number | undefined) ??
    (history.history.accuracy?.[history.history.accuracy.length - 1] as number | undefined) ??
    (history.history.acc?.[history.history.acc.length - 1] as number | undefined);

  return {
    accuracy: finalValAcc,
  };
}

/**
 * Record model evaluation metrics and optionally perform time-series cross-validation.
 *
 * This function:
 * 1. Extracts metrics from training history based on task type
 * 2. Creates stable cache signatures for data and configuration
 * 3. Records the evaluation run
 * 4. Optionally runs time-series CV in development mode
 *
 * @param params - Evaluation recording parameters
 * @returns Promise that resolves when evaluation is recorded (fire-and-forget for errors)
 */
export async function recordModelEvaluation(params: RecordEvaluationParams): Promise<void> {
  const {
    modelType,
    trackingEntries,
    history,
    epochs,
    modelArchitecture,
    preprocessingSchemaVersion,
    inputs,
    outputs,
    createModelFn,
    options,
  } = params;

  try {
    const cfg = analyticsConfig.getConfig();
    const taskConfig = getTaskConfig(modelType);

    // Create data signature
    const dataSignature = createCacheKey({
      namespace: 'ml-training:data',
      input: {
        modelType,
        dataPoints: trackingEntries.length,
        epochs,
        preprocessingSchemaVersion,
      },
      version: cfg.schemaVersion,
    });

    // Create config signature
    const configSignature = createCacheKey({
      namespace: 'ml-training:config',
      input: {
        inputShape: modelArchitecture.inputShape,
        outputShape: modelArchitecture.outputShape,
        architecture: modelArchitecture.architecture,
      },
      version: cfg.schemaVersion,
    });

    // Extract metrics based on task type
    const metrics =
      taskConfig.taskType === 'regression'
        ? { regression: extractRegressionMetrics(history) }
        : { classification: extractClassificationMetrics(history) };

    // Create and record evaluation run
    const run: EvaluationRun = {
      id: `${Date.now()}-${modelType}`,
      modelType,
      timestamp: Date.now(),
      dataSignature,
      configSignature,
      taskType: taskConfig.taskType,
      metrics,
      schemaVersion: cfg.schemaVersion,
      notes: preprocessingSchemaVersion ? `preprocessingSchemaVersion=${preprocessingSchemaVersion}` : undefined,
    };

    recordEvaluation(run);

    // Optionally run time-series CV in development only
    if (import.meta.env?.DEV && options?.devRunTimeSeriesCV && inputs && outputs && createModelFn) {
      await recordTimeSeriesCrossValidation({
        modelType,
        dataSignature,
        preprocessingSchemaVersion,
        inputs,
        outputs,
        createModelFn,
        taskConfig,
        tsConfigOverrides: options.tsConfig,
      });
    }
  } catch (error) {
    // Fail-soft: never block training if evaluation capture fails
    // Error is silently swallowed to match original behavior
  }
}

/**
 * Parameters for time-series cross-validation recording
 */
interface TimeSeriesCVParams {
  modelType: ModelType;
  dataSignature: string;
  preprocessingSchemaVersion?: string;
  inputs: tf.Tensor;
  outputs: tf.Tensor;
  createModelFn: () => tf.Sequential | tf.LayersModel;
  taskConfig: TaskConfig;
  tsConfigOverrides?: Partial<TimeSeriesValidationConfig>;
}

/**
 * Perform and record time-series cross-validation results.
 *
 * @param params - Time-series CV parameters
 */
async function recordTimeSeriesCrossValidation(params: TimeSeriesCVParams): Promise<void> {
  const {
    modelType,
    dataSignature,
    preprocessingSchemaVersion,
    inputs,
    outputs,
    createModelFn,
    taskConfig,
    tsConfigOverrides,
  } = params;

  const cfg = analyticsConfig.getConfig();
  const validator = new CrossValidator();

  // Calculate default window size based on input length
  const inputLength = inputs.shape[0];
  const calculatedWindowSize = Math.min(
    taskConfig.defaultWindowSize,
    Math.max(3, Math.floor(inputLength / 3) || 3)
  );

  // Build time-series CV configuration
  const tsCfg: TimeSeriesValidationConfig = {
    strategy: tsConfigOverrides?.strategy ?? 'rolling',
    windowSize: tsConfigOverrides?.windowSize ?? calculatedWindowSize,
    horizon: tsConfigOverrides?.horizon ?? 1,
    gap: tsConfigOverrides?.gap ?? 0,
    folds: tsConfigOverrides?.folds,
    taskType: taskConfig.taskType,
  };

  // Run time-series validation
  const tsResults = await validator.validateTimeSeriesModel(
    createModelFn,
    { features: inputs, labels: outputs },
    tsCfg
  );

  // Create CV signature
  const cvSig = createCacheKey({
    namespace: 'ml-training:cv',
    input: { tsCfg, preprocessingSchemaVersion },
    version: cfg.schemaVersion,
  });

  // Build CV evaluation run with task-specific metrics
  const cvRun: EvaluationRun = {
    id: `${Date.now()}-${modelType}-tscv`,
    modelType,
    timestamp: Date.now(),
    dataSignature,
    configSignature: cvSig,
    taskType: taskConfig.taskType,
    metrics:
      taskConfig.taskType === 'regression'
        ? {
            regression: tsResults.average?.regression
              ? {
                  mse: tsResults.average.regression.mse,
                  rmse: tsResults.average.regression.rmse,
                  mae: tsResults.average.regression.mae,
                  mape: tsResults.average.regression.mape,
                }
              : undefined,
          }
        : {
            classification: tsResults.average?.classification
              ? {
                  accuracy: tsResults.average.classification.accuracy,
                  precision: tsResults.average.classification.precision,
                  recall: tsResults.average.classification.recall,
                  f1: tsResults.average.classification.f1Score,
                }
              : undefined,
          },
    cv: {
      strategy: 'time-series',
      horizon: tsCfg.horizon,
      windowSize: tsCfg.windowSize,
      folds: tsCfg.folds,
    },
    schemaVersion: cfg.schemaVersion,
    notes: 'Time-series cross-validation (dev-only)',
  };

  recordEvaluation(cvRun);
}
