/**
 * @file src/workers/hyperparameterOptimization.worker.ts
 *
 * Hyperparameter optimization worker responsible for evaluating model/training
 * configurations off the main thread. Currently supports grid search using the
 * shared `CrossValidator` helper so each parameter combination is benchmarked
 * via k-fold validation.
 */
import * as tf from '@tensorflow/tfjs';
import {
  CrossValidator,
  type CrossValidationConfig,
  type ValidationMetrics,
  type ValidationResults,
} from '@/lib/validation/crossValidation';
import type { TrainingData } from '@/types/ml';
import { createEmotionModel, createSensoryModel } from '@/lib/mlModels/architectures';

type ParameterValue = number | string | boolean;

export type HyperparameterGrid = Record<string, ParameterValue[]>;

export type HyperparameterCombination = Record<string, ParameterValue>;

export interface SerializedTrainingData {
  /**
   * Flattened tensor values for features. The data should match `featureShape`.
   */
  features: tf.TensorLike;
  /**
   * Flattened tensor values for labels. The data should match `labelShape`.
   */
  labels: tf.TensorLike;
  /**
   * Feature tensor shape. Supports 2D or 3D tensors.
   */
  featureShape: number[];
  /**
   * Label tensor shape. Supports 1D or 2D tensors.
   */
  labelShape: number[];
}

export interface OptimizationRequest {
  id: string;
  strategy: 'gridSearch' | 'randomSearch' | 'bayesian';
  modelType: 'emotion' | 'sensory' | string;
  data: SerializedTrainingData;
  grid?: HyperparameterGrid;
  /**
   * Metric key from `ValidationMetrics` to optimize. Defaults to `accuracy`.
   */
  metric?: keyof ValidationMetrics;
  /**
   * Whether higher (`max`) or lower (`min`) values for the metric are better.
   * Defaults to `max`, but automatically flips to `min` for metrics containing
   * "loss" or "error" when not provided.
   */
  optimize?: 'max' | 'min';
  /**
   * Base cross-validation configuration. Optional overrides may be supplied.
   */
  crossValidation?: Partial<CrossValidationConfig>;
  /**
   * Optional base fit args applied before hyperparameter overrides.
   */
  baseFitArgs?: Partial<Pick<tf.ModelFitArgs, 'epochs' | 'batchSize' | 'shuffle' | 'verbose'>>;
  /**
   * Number of iterations for random search. Defaults to 10.
   */
  nIterations?: number;
}

export interface OptimizationEvaluation {
  params: HyperparameterCombination;
  averageMetrics?: ValidationMetrics;
  score?: number;
  error?: string;
}

export interface OptimizationResult {
  id: string;
  status: 'success' | 'error';
  bestParams?: HyperparameterCombination;
  bestScore?: number;
  evaluations?: OptimizationEvaluation[];
  error?: string;
}

interface OptimizationWorkerMessage {
  type: 'optimize';
  payload: OptimizationRequest;
}

type OptimizationWorkerResponse = OptimizationResult;

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;
const validator = new CrossValidator();
const DEFAULT_MODEL_TYPE = 'emotion';
const DEFAULT_METRIC: keyof ValidationMetrics = 'accuracy';

const MODEL_FACTORIES: Record<string, () => tf.Sequential> = {
  emotion: createEmotionModel,
  sensory: createSensoryModel,
};

const MODEL_COMPILE_DEFAULTS: Record<string, { loss: string; metrics: string[] }> = {
  emotion: { loss: 'meanSquaredError', metrics: ['mse', 'mae'] },
  sensory: { loss: 'categoricalCrossentropy', metrics: ['accuracy'] },
};

ctx.onmessage = async (event: MessageEvent<OptimizationWorkerMessage>) => {
  const message = event?.data;
  if (!message || message.type !== 'optimize') {
    return;
  }

  try {
    let response: OptimizationResult;
    switch (message.payload.strategy) {
      case 'gridSearch':
        response = await runGridSearch(message.payload);
        break;
      case 'randomSearch':
        response = await runRandomSearch(message.payload);
        break;
      case 'bayesian':
        response = buildErrorResult(
          message.payload.id,
          'Bayesian optimization is not implemented yet. Use gridSearch or randomSearch.',
        );
        break;
      default:
        response = buildErrorResult(
          message.payload.id,
          `Unknown strategy "${message.payload.strategy}".`,
        );
    }
    ctx.postMessage(response satisfies OptimizationWorkerResponse);
  } catch (error) {
    ctx.postMessage(
      buildErrorResult(
        message.payload.id,
        error instanceof Error ? error.message : 'Optimization failed',
      ),
    );
  }
};

async function runGridSearch(request: OptimizationRequest): Promise<OptimizationResult> {
  const combinations = expandGrid(request.grid);
  if (combinations.length === 0) {
    return buildErrorResult(request.id, 'Hyperparameter grid is empty.');
  }

  const metric = request.metric ?? DEFAULT_METRIC;
  const optimize: 'max' | 'min' = request.optimize ?? inferOptimizeDirection(metric);

  const trainingData = deserializeTrainingData(request.data);
  const evaluations: OptimizationEvaluation[] = [];

  let bestScore =
    optimize === 'max' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  let bestParams: HyperparameterCombination | undefined;

  try {
    for (const params of combinations) {
      try {
        const modelFactory = getModelFactory(request.modelType, params);
        const cvConfig = buildCrossValidationConfig(request, params);
        const results = await validator.validateModel(modelFactory, trainingData, cvConfig);
        const score = extractScore(results, metric);

        evaluations.push({
          params: { ...params },
          averageMetrics: results.averageMetrics,
          score,
        });

        if (
          typeof score === 'number' &&
          isBetterScore(score, bestScore, optimize)
        ) {
          bestScore = score;
          bestParams = { ...params };
        }
      } catch (error) {
        evaluations.push({
          params: { ...params },
          error: error instanceof Error ? error.message : 'Evaluation failed',
        });
      } finally {
        // Ensure tensors created within tfjs internals do not accumulate.
        tf.disposeVariables();
      }
    }
  } finally {
    trainingData.features.dispose();
    trainingData.labels.dispose();
  }

  if (!bestParams) {
    return {
      id: request.id,
      status: 'error',
      evaluations,
      error: 'Unable to compute score for any parameter combination.',
    };
  }

  return {
    id: request.id,
    status: 'success',
    bestParams,
    bestScore: bestScore === Number.NEGATIVE_INFINITY || bestScore === Number.POSITIVE_INFINITY
      ? undefined
      : bestScore,
    evaluations,
  };
}

/**
 * Randomly samples `nIterations` combinations from the parameter grid and
 * evaluates each using k-fold cross validation. More efficient than grid
 * search when the search space is large.
 */
async function runRandomSearch(request: OptimizationRequest): Promise<OptimizationResult> {
  const allCombinations = expandGrid(request.grid);
  if (allCombinations.length === 0) {
    return buildErrorResult(request.id, 'Hyperparameter grid is empty.');
  }

  const nIterations = Math.min(request.nIterations ?? 10, allCombinations.length);
  const combinations = sampleWithoutReplacement(allCombinations, nIterations);

  const metric = request.metric ?? DEFAULT_METRIC;
  const optimize: 'max' | 'min' = request.optimize ?? inferOptimizeDirection(metric);

  const trainingData = deserializeTrainingData(request.data);
  const evaluations: OptimizationEvaluation[] = [];

  let bestScore =
    optimize === 'max' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  let bestParams: HyperparameterCombination | undefined;

  try {
    for (const params of combinations) {
      try {
        const modelFactory = getModelFactory(request.modelType, params);
        const cvConfig = buildCrossValidationConfig(request, params);
        const results = await validator.validateModel(modelFactory, trainingData, cvConfig);
        const score = extractScore(results, metric);

        evaluations.push({
          params: { ...params },
          averageMetrics: results.averageMetrics,
          score,
        });

        if (
          typeof score === 'number' &&
          isBetterScore(score, bestScore, optimize)
        ) {
          bestScore = score;
          bestParams = { ...params };
        }
      } catch (error) {
        evaluations.push({
          params: { ...params },
          error: error instanceof Error ? error.message : 'Evaluation failed',
        });
      } finally {
        tf.disposeVariables();
      }
    }
  } finally {
    trainingData.features.dispose();
    trainingData.labels.dispose();
  }

  if (!bestParams) {
    return {
      id: request.id,
      status: 'error',
      evaluations,
      error: 'Unable to compute score for any parameter combination.',
    };
  }

  return {
    id: request.id,
    status: 'success',
    bestParams,
    bestScore: bestScore === Number.NEGATIVE_INFINITY || bestScore === Number.POSITIVE_INFINITY
      ? undefined
      : bestScore,
    evaluations,
  };
}

/**
 * Fisher-Yates shuffle to sample k items without replacement from an array.
 */
function sampleWithoutReplacement<T>(arr: T[], k: number): T[] {
  const result = [...arr];
  const n = result.length;
  for (let i = 0; i < Math.min(k, n - 1); i++) {
    const j = i + Math.floor(Math.random() * (n - i));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.slice(0, k);
}

function getModelFactory(
  modelType: string,
  params: HyperparameterCombination,
): () => tf.Sequential {
  const factory = MODEL_FACTORIES[modelType] ?? MODEL_FACTORIES[DEFAULT_MODEL_TYPE];
  const compileDefaults =
    MODEL_COMPILE_DEFAULTS[modelType] ?? MODEL_COMPILE_DEFAULTS[DEFAULT_MODEL_TYPE];

  return () => {
    const model = factory();
    const learningRate = getNumericParam(params.learningRate);
    if (typeof learningRate === 'number') {
      model.compile({
        optimizer: tf.train.adam(learningRate),
        loss: compileDefaults.loss,
        metrics: compileDefaults.metrics,
      });
    }
    return model;
  };
}

function buildCrossValidationConfig(
  request: OptimizationRequest,
  params: HyperparameterCombination,
): CrossValidationConfig {
  const base = request.crossValidation ?? {};
  const baseFitArgs = base.fitArgs ?? {};
  const paramEpochs = getNumericParam(params.epochs);
  const paramBatch = getNumericParam(params.batchSize);
  const paramVerbose = getNumericParam(params.verbose);
  const paramShuffle =
    typeof params.shuffle === 'boolean' ? params.shuffle : undefined;

  const fitArgs: CrossValidationConfig['fitArgs'] = {
    epochs:
      paramEpochs ??
      request.baseFitArgs?.epochs ??
      baseFitArgs.epochs ??
      5,
    batchSize:
      paramBatch ??
      request.baseFitArgs?.batchSize ??
      baseFitArgs.batchSize ??
      32,
    shuffle:
      paramShuffle ??
      request.baseFitArgs?.shuffle ??
      baseFitArgs.shuffle ??
      true,
    verbose:
      paramVerbose ??
      request.baseFitArgs?.verbose ??
      baseFitArgs.verbose ??
      0,
  };

  return {
    folds: base.folds ?? 5,
    stratified: base.stratified ?? true,
    randomState: base.randomState ?? Date.now(),
    validationMetrics: base.validationMetrics ?? ['accuracy'],
    fitArgs,
    earlyStopping: base.earlyStopping,
  };
}

function deserializeTrainingData(data: SerializedTrainingData): TrainingData {
  if (!Array.isArray(data.featureShape) || data.featureShape.length < 2) {
    throw new Error('featureShape must describe a 2D or 3D tensor.');
  }
  if (!Array.isArray(data.labelShape) || data.labelShape.length === 0) {
    throw new Error('labelShape must describe at least a 1D tensor.');
  }

  const featuresTensor = tf.tensor(data.features, data.featureShape, 'float32');
  const labelsTensor = tf.tensor(data.labels, data.labelShape, 'float32');

  const features =
    data.featureShape.length === 3
      ? (featuresTensor as tf.Tensor3D)
      : (featuresTensor as tf.Tensor2D);

  return {
    features,
    labels: labelsTensor,
  };
}

function expandGrid(grid: HyperparameterGrid | undefined): HyperparameterCombination[] {
  if (!grid || Object.keys(grid).length === 0) {
    return [{}];
  }

  const entries = Object.entries(grid);
  return entries.reduce<HyperparameterCombination[]>(
    (acc, [key, values]) => {
      if (!Array.isArray(values) || values.length === 0) {
        return acc;
      }
      const next: HyperparameterCombination[] = [];
      for (const combo of acc) {
        for (const value of values) {
          next.push({ ...combo, [key]: value });
        }
      }
      return next;
    },
    [{}],
  );
}

function extractScore(
  results: ValidationResults,
  metric: keyof ValidationMetrics,
): number | undefined {
  if (metric === 'confusionMatrix') {
    return undefined;
  }
  const value = results.averageMetrics?.[metric];
  return typeof value === 'number' ? value : undefined;
}

function isBetterScore(score: number, current: number, optimize: 'max' | 'min'): boolean {
  return optimize === 'max' ? score > current : score < current;
}

function inferOptimizeDirection(metric: keyof ValidationMetrics): 'max' | 'min' {
  const lowered = metric.toString().toLowerCase();
  if (lowered.includes('loss') || lowered.includes('error')) {
    return 'min';
  }
  return 'max';
}

function getNumericParam(value: ParameterValue | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function buildErrorResult(id: string, message: string): OptimizationResult {
  return {
    id,
    status: 'error',
    error: message,
  };
}

export {};

