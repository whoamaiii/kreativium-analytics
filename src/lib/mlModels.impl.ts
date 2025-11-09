import { logger } from '@/lib/logger';
import * as tf from '@tensorflow/tfjs';
import { TrackingEntry } from '../types/student';
import { analyticsConfig } from '@/lib/analyticsConfig';
import {
  toMLSessions,
  prepareEmotionDataset,
  prepareSensoryDataset,
  encodeTimeFeatures
} from '@/lib/dataPreprocessing';
import { recordEvaluation, type EvaluationRun } from '@/lib/modelEvaluation';
import { createCacheKey } from '@/lib/analytics/cache-key';
import { CrossValidator, type TimeSeriesValidationConfig } from '@/lib/validation/crossValidation';

// Import from extracted modules
import {
  ModelType,
  ModelMetadata,
  StoredModel,
  MLSession,
  EmotionPrediction,
  SensoryPrediction,
  BaselineCluster
} from './mlModels/types';
import { ModelStorage } from './mlModels/storage';
import { createEmotionModel, createSensoryModel } from './mlModels/architectures';
import { performBaselineClustering } from './mlModels/clustering';
import { predictEmotions as predictEmotionsImpl, predictSensoryResponse as predictSensoryResponseImpl } from './mlModels/predictions';

// Re-export types for backwards compatibility
export type {
  ModelType,
  ModelMetadata,
  StoredModel,
  MLSession,
  EmotionPrediction,
  SensoryPrediction,
  BaselineCluster
};


// Main ML Models class
export class MLModels {
  private storage: ModelStorage;
  private models: Map<ModelType, StoredModel>;
  private isInitialized: boolean = false;

  constructor() {
    this.storage = new ModelStorage();
    this.models = new Map();
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    await this.storage.init();

    // Load existing models
    const modelTypes: ModelType[] = ['emotion-prediction', 'sensory-response', 'baseline-clustering'];
    for (const type of modelTypes) {
      const model = await this.storage.loadModel(type);
      if (model) {
        this.models.set(type, model);
      }
    }

    this.isInitialized = true;
  }

  // Train emotion model
  async trainEmotionModel(
    trackingEntries: TrackingEntry[],
    epochs: number = 50,
    callbacks?: tf.CustomCallbackArgs,
    options?: { devRunTimeSeriesCV?: boolean; tsConfig?: Partial<TimeSeriesValidationConfig> }
  ): Promise<void> {
    const sessions = toMLSessions(trackingEntries);
    const model = createEmotionModel();
    const { inputs, outputs, meta } = prepareEmotionDataset(sessions);

    // Pull defaults from analytics runtime config; fall back to sane defaults
    const cfgRuntime = analyticsConfig.getConfig();
    const defaultBatch = 32; // keep as fallback; UI/runtime overrides can replace
    const defaultValSplit = 0.2;

    const history = await model.fit(inputs, outputs, {
      epochs,
      batchSize: defaultBatch,
      validationSplit: defaultValSplit,
      callbacks,
      shuffle: true
    });

    // Record evaluation (regression-style metrics using validation history)
    try {
      const cfg = analyticsConfig.getConfig();
      const finalLoss = history.history.loss?.[history.history.loss.length - 1] as number | undefined;
      const finalValMSE = (history.history.val_mse?.[history.history.val_mse.length - 1] as number | undefined)
        ?? (history.history.mse?.[history.history.mse.length - 1] as number | undefined);
      const finalValMAE = (history.history.val_mae?.[history.history.val_mae.length - 1] as number | undefined)
        ?? (history.history.mae?.[history.history.mae.length - 1] as number | undefined);

      const dataSignature = createCacheKey({
        namespace: 'ml-training:data',
        input: {
          modelType: 'emotion-prediction',
          dataPoints: trackingEntries.length,
          epochs,
          preprocessingSchemaVersion: meta?.schemaVersion,
        },
        version: cfg.schemaVersion,
      });
      const configSignature = createCacheKey({
        namespace: 'ml-training:config',
        input: {
          inputShape: [7, 13],
          outputShape: [7],
          architecture: 'LSTM',
        },
        version: cfg.schemaVersion,
      });

      const run: EvaluationRun = {
        id: `${Date.now()}-emotion`,
        modelType: 'emotion-prediction',
        timestamp: Date.now(),
        dataSignature,
        configSignature,
        taskType: 'regression',
        metrics: {
          regression: {
            mse: finalValMSE,
            mae: finalValMAE,
          }
        },
        schemaVersion: cfg.schemaVersion,
        notes: meta?.schemaVersion ? `preprocessingSchemaVersion=${meta.schemaVersion}` : undefined,
      };
      recordEvaluation(run);

      // Optionally run time-series CV in development only
      if (import.meta.env?.DEV && options?.devRunTimeSeriesCV) {
        const validator = new CrossValidator();
        const tsCfg: TimeSeriesValidationConfig = {
          strategy: options.tsConfig?.strategy ?? 'rolling',
          windowSize: options.tsConfig?.windowSize ?? Math.min(7, Math.max(3, Math.floor(inputs.shape[0] / 3) || 3)),
          horizon: options.tsConfig?.horizon ?? 1,
          gap: options.tsConfig?.gap ?? 0,
          folds: options.tsConfig?.folds,
          taskType: 'regression',
        };
        const tsResults = await validator.validateTimeSeriesModel(() => createEmotionModel(), { features: inputs, labels: outputs }, tsCfg);
        const cvSig = createCacheKey({
          namespace: 'ml-training:cv',
          input: { tsCfg, preprocessingSchemaVersion: meta?.schemaVersion },
          version: cfg.schemaVersion,
        });
        const cvRun: EvaluationRun = {
          id: `${Date.now()}-emotion-tscv`,
          modelType: 'emotion-prediction',
          timestamp: Date.now(),
          dataSignature,
          configSignature: cvSig,
          taskType: 'regression',
          metrics: {
            regression: tsResults.average?.regression ? {
              mse: tsResults.average.regression.mse,
              rmse: tsResults.average.regression.rmse,
              mae: tsResults.average.regression.mae,
              mape: tsResults.average.regression.mape,
            } : undefined,
          },
          cv: { strategy: 'time-series', horizon: tsCfg.horizon, windowSize: tsCfg.windowSize, folds: tsCfg.folds },
          schemaVersion: cfg.schemaVersion,
          notes: 'Time-series cross-validation (dev-only)'
        };
        recordEvaluation(cvRun);
      }
    } catch {
      // Fail-soft: never block training if evaluation capture fails
    }

    // Save model with metadata
    const metadata: ModelMetadata = {
      name: 'emotion-prediction',
      version: '1.0.0',
      createdAt: new Date(),
      lastTrainedAt: new Date(),
      accuracy: history.history.val_mse ?
        history.history.val_mse[history.history.val_mse.length - 1] as number :
        undefined,
      loss: history.history.loss[history.history.loss.length - 1] as number,
      inputShape: [7, 13],
      outputShape: [7],
      architecture: 'LSTM',
      epochs,
      dataPoints: trackingEntries.length,
      preprocessingSchemaVersion: meta?.schemaVersion
    };

    await this.storage.saveModel('emotion-prediction', model, metadata);
    this.models.set('emotion-prediction', { model, metadata });

    // Clean up tensors
    inputs.dispose();
    outputs.dispose();
  }

  // Train sensory model
  async trainSensoryModel(
    trackingEntries: TrackingEntry[],
    epochs: number = 50,
    callbacks?: tf.CustomCallbackArgs,
    options?: { devRunTimeSeriesCV?: boolean; tsConfig?: Partial<TimeSeriesValidationConfig> }
  ): Promise<void> {
    const sessions = toMLSessions(trackingEntries);
    const model = createSensoryModel();
    const { inputs, outputs, meta } = prepareSensoryDataset(sessions);

    const cfgRuntime = analyticsConfig.getConfig();
    const defaultBatch = 32;
    const defaultValSplit = 0.2;
    const history = await model.fit(inputs, outputs, {
      epochs,
      batchSize: defaultBatch,
      validationSplit: defaultValSplit,
      callbacks,
      shuffle: true
    });

    // Record evaluation (classification metrics using validation history)
    try {
      const cfg = analyticsConfig.getConfig();
      const finalLoss = history.history.loss?.[history.history.loss.length - 1] as number | undefined;
      // TFJS sometimes exposes val_accuracy or acc
      const finalValAcc = (history.history.val_accuracy?.[history.history.val_accuracy.length - 1] as number | undefined)
        ?? (history.history.accuracy?.[history.history.accuracy.length - 1] as number | undefined)
        ?? (history.history.acc?.[history.history.acc.length - 1] as number | undefined);

      const dataSignature = createCacheKey({
        namespace: 'ml-training:data',
        input: {
          modelType: 'sensory-response',
          dataPoints: trackingEntries.length,
          epochs,
          preprocessingSchemaVersion: meta?.schemaVersion,
        },
        version: cfg.schemaVersion,
      });
      const configSignature = createCacheKey({
        namespace: 'ml-training:config',
        input: {
          inputShape: [12],
          outputShape: [15],
          architecture: 'Dense',
        },
        version: cfg.schemaVersion,
      });

      const run: EvaluationRun = {
        id: `${Date.now()}-sensory`,
        modelType: 'sensory-response',
        timestamp: Date.now(),
        dataSignature,
        configSignature,
        taskType: 'classification',
        metrics: {
          classification: {
            accuracy: finalValAcc,
          }
        },
        schemaVersion: cfg.schemaVersion,
        notes: meta?.schemaVersion ? `preprocessingSchemaVersion=${meta.schemaVersion}` : undefined,
      };
      recordEvaluation(run);

      // Optionally run time-series CV in development only (classification)
      if (import.meta.env?.DEV && options?.devRunTimeSeriesCV) {
        const validator = new CrossValidator();
        const tsCfg: TimeSeriesValidationConfig = {
          strategy: options.tsConfig?.strategy ?? 'rolling',
          windowSize: options.tsConfig?.windowSize ?? Math.min(8, Math.max(3, Math.floor(inputs.shape[0] / 3) || 3)),
          horizon: options.tsConfig?.horizon ?? 1,
          gap: options.tsConfig?.gap ?? 0,
          folds: options.tsConfig?.folds,
          taskType: 'classification',
        };
        const tsResults = await validator.validateTimeSeriesModel(() => createSensoryModel(), { features: inputs, labels: outputs }, tsCfg);
        const cvSig = createCacheKey({
          namespace: 'ml-training:cv',
          input: { tsCfg, preprocessingSchemaVersion: meta?.schemaVersion },
          version: cfg.schemaVersion,
        });
        const cvRun: EvaluationRun = {
          id: `${Date.now()}-sensory-tscv`,
          modelType: 'sensory-response',
          timestamp: Date.now(),
          dataSignature,
          configSignature: cvSig,
          taskType: 'classification',
          metrics: {
            classification: tsResults.average?.classification ? {
              accuracy: tsResults.average.classification.accuracy,
              precision: tsResults.average.classification.precision,
              recall: tsResults.average.classification.recall,
              f1: tsResults.average.classification.f1Score,
            } : undefined,
          },
          cv: { strategy: 'time-series', horizon: tsCfg.horizon, windowSize: tsCfg.windowSize, folds: tsCfg.folds },
          schemaVersion: cfg.schemaVersion,
          notes: 'Time-series cross-validation (dev-only)'
        };
        recordEvaluation(cvRun);
      }
    } catch {
      // Fail-soft
    }

    // Save model with metadata
    const metadata: ModelMetadata = {
      name: 'sensory-response',
      version: '1.0.0',
      createdAt: new Date(),
      lastTrainedAt: new Date(),
      accuracy: history.history.acc ?
        history.history.acc[history.history.acc.length - 1] as number :
        undefined,
      loss: history.history.loss[history.history.loss.length - 1] as number,
      inputShape: [12],
      outputShape: [15],
      architecture: 'Dense',
      epochs,
      dataPoints: trackingEntries.length,
      preprocessingSchemaVersion: meta?.schemaVersion
    };

    await this.storage.saveModel('sensory-response', model, metadata);
    this.models.set('sensory-response', { model, metadata });

    // Clean up tensors
    inputs.dispose();
    outputs.dispose();
  }

  // Predict emotions for next 7 days (delegated to predictions module)
  async predictEmotions(
    recentEntries: TrackingEntry[],
    daysToPredict: number = 7
  ): Promise<EmotionPrediction[]> {
    return predictEmotionsImpl(recentEntries, daysToPredict, this.models);
  }

  // Predict sensory responses (delegated to predictions module)
  async predictSensoryResponse(
    environment: MLSession['environment'],
    date: Date
  ): Promise<SensoryPrediction> {
    return predictSensoryResponseImpl(environment, date, this.models);
  }

  // Get model status
  async getModelStatus(): Promise<Map<ModelType, ModelMetadata | null>> {
    const status = new Map<ModelType, ModelMetadata | null>();
    const types: ModelType[] = ['emotion-prediction', 'sensory-response', 'baseline-clustering'];
    
    for (const type of types) {
      const model = this.models.get(type);
      status.set(type, model?.metadata || null);
    }
    
    return status;
  }

  // Delete a model
  async deleteModel(type: ModelType): Promise<void> {
    await this.storage.deleteModel(type);
    this.models.delete(type);
  }

  // Export model for external use
  async exportModel(type: ModelType, path: string): Promise<void> {
    const model = this.models.get(type);
    if (!model) {
      throw new Error(`Model ${type} not found`);
    }
    
    await model.model.save(`file://${path}`);
  }

  // Baseline clustering using K-means (delegated to clustering module)
  async performBaselineClustering(
    trackingEntries: TrackingEntry[],
    numClusters: number = 3
  ): Promise<BaselineCluster[]> {
    return performBaselineClustering(trackingEntries, numClusters);
  }
}

// Singleton export removed in favor of lazy accessor in src/lib/mlModels.ts
