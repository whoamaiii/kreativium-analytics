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
import { trainModel, regressionMetrics, classificationMetrics } from './mlModels/training';

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

  // Train emotion model (delegated to training orchestrator)
  async trainEmotionModel(
    trackingEntries: TrackingEntry[],
    epochs: number = 50,
    callbacks?: tf.CustomCallbackArgs,
    options?: { devRunTimeSeriesCV?: boolean; tsConfig?: Partial<TimeSeriesValidationConfig> }
  ): Promise<void> {
    await trainModel({
      modelType: 'emotion-prediction',
      trackingEntries,
      createModel: createEmotionModel,
      prepareDataset: prepareEmotionDataset,
      architecture: {
        name: 'LSTM',
        inputShape: [7, 13],
        outputShape: [7],
      },
      taskType: 'regression',
      metricsExtractor: regressionMetrics,
      epochs,
      callbacks,
      storage: this.storage,
      modelMap: this.models,
      crossValidation: options?.devRunTimeSeriesCV ? {
        enabled: true,
        config: options.tsConfig,
      } : undefined,
    });
  }

  // Train sensory model (delegated to training orchestrator)
  async trainSensoryModel(
    trackingEntries: TrackingEntry[],
    epochs: number = 50,
    callbacks?: tf.CustomCallbackArgs,
    options?: { devRunTimeSeriesCV?: boolean; tsConfig?: Partial<TimeSeriesValidationConfig> }
  ): Promise<void> {
    await trainModel({
      modelType: 'sensory-response',
      trackingEntries,
      createModel: createSensoryModel,
      prepareDataset: prepareSensoryDataset,
      architecture: {
        name: 'Dense',
        inputShape: [12],
        outputShape: [15],
      },
      taskType: 'classification',
      metricsExtractor: classificationMetrics,
      epochs,
      callbacks,
      storage: this.storage,
      modelMap: this.models,
      crossValidation: options?.devRunTimeSeriesCV ? {
        enabled: true,
        config: options.tsConfig,
      } : undefined,
    });
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
