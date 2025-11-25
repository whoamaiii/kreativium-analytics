/**
 * Module: crossValidation
 *
 * Purpose
 * - K-Fold and Time-Series cross-validation utilities for TensorFlow.js models
 *
 * Time-Series Folds
 * - Strategies: 'rolling' (fixed-size sliding window) and 'expanding' (growing window)
 * - Preserve temporal order; do NOT shuffle time-series data
 * - Optional gap and horizon to separate train and validation windows for realistic forecasting
 *
 * Leakage Avoidance
 * - Always create a fresh, untrained model per fold
 * - Fit preprocessing only on training folds; apply to validation folds (caller responsibility)
 */

import * as tf from '@tensorflow/tfjs';
import { TrainingData } from '../../types/ml';

/**
 * Configuration for early stopping during model training.
 */
export interface EarlyStoppingConfig {
  /** Whether to enable early stopping. Default: false. */
  enabled?: boolean;
  /** Number of epochs to wait before stopping when no improvement occurs. Default: 3. */
  patience?: number;
  /** Minimum change required to qualify as improvement. Default: 0. */
  minDelta?: number;
  /** Metric to monitor. Prefer validation metrics when available. */
  monitor?:
    | 'loss'
    | 'val_loss'
    | 'accuracy'
    | 'val_accuracy'
    | 'mae'
    | 'val_mae'
    | 'mse'
    | 'val_mse';
}

/**
 * Metrics calculated for each validation fold.
 */
export interface ValidationMetrics {
  /** Overall accuracy for the predictions. */
  accuracy?: number;
  /** Precision of positive predictions. */
  precision?: number;
  /** Recall (sensitivity) for the positive class. */
  recall?: number;
  /** Harmonic mean of precision and recall. */
  f1Score?: number;
  /** Mean squared error, useful for regression tasks. */
  meanSquaredError?: number;
  /** Optional confusion matrix for binary classification. */
  confusionMatrix?: { tp: number; tn: number; fp: number; fn: number };
}

/**
 * Index sets for a single training/validation fold.
 */
export interface TrainingFold {
  /** Indices included in the training portion of the fold. */
  trainIndices: number[];
  /** Indices included in the validation portion of the fold. */
  validationIndices: number[];
}

/**
 * Aggregated results across an entire cross-validation run.
 */
export interface ValidationResults {
  /** Metrics captured for each fold. */
  foldMetrics: ValidationMetrics[];
  /** Average metric values across folds. */
  averageMetrics: ValidationMetrics;
  /** Standard deviation for each metric across folds. */
  stdDeviationMetrics: ValidationMetrics;
  /** Summed confusion matrix across folds (binary classification only). */
  overallConfusionMatrix?: { tp: number; tn: number; fp: number; fn: number };
  /** Derived precision/recall/F1/accuracy computed from the aggregated matrix. */
  overallPRF1?: { precision: number; recall: number; f1Score: number; accuracy: number };
}

/**
 * Configuration describing how cross-validation should execute.
 */
export interface CrossValidationConfig {
  /** Number of folds (k). Default expectation: 5. */
  folds: number;
  /** Whether to preserve class distribution per fold. */
  stratified: boolean;
  /** Random seed for deterministic shuffling. */
  randomState: number;
  /** Metric identifiers to compute/track while validating. */
  validationMetrics: string[];
  /** Optional overrides passed to `model.fit` for each fold. */
  fitArgs?: Partial<Pick<tf.ModelFitArgs, 'epochs' | 'batchSize' | 'shuffle' | 'verbose'>>;
  /** Optional early stopping configuration applied during training. */
  earlyStopping?: EarlyStoppingConfig;
}

/**
 * Strategy for time-series cross-validation.
 */
export type TimeSeriesStrategy = 'rolling' | 'expanding';

/**
 * Configuration for time-series fold generation.
 * - rolling: fixed-size training window that moves forward; validate on the next horizon
 * - expanding: training window grows from an initial windowSize; validate on the next horizon
 */
export interface TimeSeriesFoldConfig {
  strategy: TimeSeriesStrategy;
  /** Required for both strategies. For expanding, this is the initial training window size. */
  windowSize: number;
  /** Number of time steps to forecast/validate ahead for each fold. Default: 1 */
  horizon?: number;
  /** Optional gap between the end of training window and start of validation window. Default: 0 */
  gap?: number;
  /** Optional max number of folds to generate. If omitted, generate as many as fit within data length. */
  folds?: number;
}

/**
 * Configuration for time-series model validation.
 */
export interface TimeSeriesValidationConfig extends TimeSeriesFoldConfig {
  /** Task type determines which metrics to compute. */
  taskType: 'classification' | 'regression';
  /** Optional training arguments for each fold. */
  fitArgs?: Partial<Pick<tf.ModelFitArgs, 'epochs' | 'batchSize' | 'shuffle' | 'verbose'>>;
  /** Optional early stopping configuration. */
  earlyStopping?: EarlyStoppingConfig;
}

/** Regression metrics for time-series evaluation. */
export interface RegressionMetrics {
  mse: number;
  rmse: number;
  mae: number;
  mape: number; // expressed in [0,1]; multiply by 100 for percentage
}

/** Per-fold metrics for time-series validation. */
export interface TimeSeriesFoldMetrics {
  classification?: ValidationMetrics;
  regression?: RegressionMetrics;
}

/** Aggregated results for time-series validation. */
export interface TimeSeriesValidationResults {
  foldMetrics: TimeSeriesFoldMetrics[];
  average?: TimeSeriesFoldMetrics;
  stdDeviation?: TimeSeriesFoldMetrics;
}

/**
 * Handles the K-Fold and Time-Series Cross-Validation processes for a TensorFlow.js model.
 */
export class CrossValidator {
  /**
   * Orchestrates the entire k-fold cross-validation process.
   * @param createModel - Factory returning a fresh, untrained model instance.
   * @param data - The full training dataset.
   * @param config - The configuration for the cross-validation process.
   * @returns The aggregated results of the cross-validation.
   */
  public async validateModel(
    createModel: () => tf.Sequential,
    data: TrainingData,
    config: CrossValidationConfig,
  ): Promise<ValidationResults> {
    const folds = await this.generateFolds(data, config.folds, config.stratified);
    const foldMetrics: ValidationMetrics[] = [];

    for (const fold of folds) {
      const { trainIndices, validationIndices } = fold;

      const trainFeatures = tf.gather(data.features, trainIndices);
      const trainLabels = tf.gather(data.labels, trainIndices);
      const valFeatures = tf.gather(data.features, validationIndices);
      const valLabels = tf.gather(data.labels, validationIndices);

      const model = createModel(); // Create a fresh model for each fold

      const fitArgs: tf.ModelFitArgs = {
        epochs: config.fitArgs?.epochs ?? 5,
        batchSize: config.fitArgs?.batchSize ?? 32,
        shuffle: config.fitArgs?.shuffle ?? true,
        verbose: config.fitArgs?.verbose ?? 0,
        validationData: [valFeatures, valLabels],
        callbacks: this.buildEarlyStoppingCallbacks(
          config.earlyStopping,
          /*task*/ 'classification',
        ),
      };

      await model.fit(trainFeatures, trainLabels, fitArgs);

      const predictionsTensor = model.predict(valFeatures) as tf.Tensor;
      const predictions = Array.from(
        (await predictionsTensor.argMax(1).data()) as unknown as Iterable<number>,
      );
      const actuals = Array.from((await valLabels.argMax(1).data()) as unknown as Iterable<number>);

      const metrics = this.calculateValidationMetrics(predictions, actuals);
      foldMetrics.push(metrics);

      tf.dispose([trainFeatures, trainLabels, valFeatures, valLabels, predictionsTensor]);
      model.dispose(); // Correct way to dispose a model
    }

    // Aggregate results
    const averageMetrics = this.aggregateMetrics(foldMetrics, (arr) => tf.mean(arr).dataSync()[0]);
    const stdDeviationMetrics = this.aggregateMetrics(
      foldMetrics,
      (arr) => tf.moments(arr).variance.sqrt().dataSync()[0],
    );

    // Aggregate confusion matrices across folds (binary only) and recompute PR/F1/accuracy
    let overallConfusionMatrix: { tp: number; tn: number; fp: number; fn: number } | undefined;
    let overallPRF1:
      | { precision: number; recall: number; f1Score: number; accuracy: number }
      | undefined;

    const matrices = foldMetrics
      .map((m) => m.confusionMatrix)
      .filter((cm): cm is { tp: number; tn: number; fp: number; fn: number } => !!cm);

    if (matrices.length > 0) {
      const sum = matrices.reduce(
        (acc, cm) => ({
          tp: acc.tp + cm.tp,
          tn: acc.tn + cm.tn,
          fp: acc.fp + cm.fp,
          fn: acc.fn + cm.fn,
        }),
        { tp: 0, tn: 0, fp: 0, fn: 0 },
      );

      overallConfusionMatrix = sum;
      const precDen = sum.tp + sum.fp;
      const recDen = sum.tp + sum.fn;
      const precision = precDen === 0 ? 0 : sum.tp / precDen;
      const recall = recDen === 0 ? 0 : sum.tp / recDen;
      const f1Den = precision + recall;
      const f1Score = f1Den === 0 ? 0 : (2 * precision * recall) / f1Den;
      const total = sum.tp + sum.tn + sum.fp + sum.fn;
      const accuracy = total === 0 ? 0 : (sum.tp + sum.tn) / total;
      overallPRF1 = { precision, recall, f1Score, accuracy };
    }

    return {
      foldMetrics,
      averageMetrics,
      stdDeviationMetrics,
      overallConfusionMatrix,
      overallPRF1,
    };
  }

  /** Create EarlyStopping callbacks if configured. */
  private buildEarlyStoppingCallbacks(
    cfg: EarlyStoppingConfig | undefined,
    task: 'classification' | 'regression',
  ): tf.CustomCallbackArgs['callbacks'] {
    if (!cfg || cfg.enabled === false) return undefined;
    const monitor = cfg.monitor ?? (task === 'classification' ? 'val_accuracy' : 'val_loss');
    const mode: 'min' | 'max' =
      monitor.includes('loss') || monitor.includes('mse') || monitor.includes('mae')
        ? 'min'
        : 'max';
    return [
      tf.callbacks.earlyStopping({
        monitor,
        patience: cfg.patience ?? 3,
        minDelta: cfg.minDelta ?? 0,
        mode,
        restoreBestWeights: true,
      }),
    ];
  }

  /**
   * Splits the dataset into k-folds for training and validation.
   * Can perform stratified sampling if configured.
   * @param data - The training dataset.
   * @param k - The number of folds.
   * @param stratified - Whether to keep class distribution per fold.
   * @returns An array of TrainingFold objects.
   */
  public async generateFolds(
    data: TrainingData,
    k: number,
    stratified: boolean = false,
  ): Promise<TrainingFold[]> {
    const numSamples = data.features.shape[0];
    const indices = tf.util.createShuffledIndices(numSamples);

    if (!stratified) {
      const foldSize = Math.floor(numSamples / k);
      const folds: TrainingFold[] = [];

      for (let i = 0; i < k; i++) {
        const validationIndices = Array.from(
          indices.slice(i * foldSize, (i + 1) * foldSize),
        ) as number[];
        const trainIndices = (Array.from(indices) as number[]).filter(
          (index) => !validationIndices.includes(index),
        );
        folds.push({ trainIndices, validationIndices });
      }
      return folds;
    }

    // Stratified K-Fold
    const labels = await data.labels.data();
    const classIndices: { [key: number]: number[] } = {};

    for (let i = 0; i < numSamples; i++) {
      const label = labels[i];
      if (!classIndices[label]) {
        classIndices[label] = [];
      }
      classIndices[label].push(i);
    }

    const folds: TrainingFold[] = Array.from({ length: k }, () => ({
      trainIndices: [],
      validationIndices: [],
    }));

    for (const label in classIndices) {
      const indicesForClass = tf.util.createShuffledIndices(classIndices[label].length);
      const shuffledClassIndices = classIndices[label].map(
        (_, i) => classIndices[label][indicesForClass[i]],
      );

      for (let i = 0; i < shuffledClassIndices.length; i++) {
        const foldIndex = i % k;
        folds[foldIndex].validationIndices.push(shuffledClassIndices[i]);
      }
    }

    for (let i = 0; i < k; i++) {
      const validationIndices = folds[i].validationIndices;
      const allIndices = Array.from({ length: numSamples }, (_, idx) => idx);
      folds[i].trainIndices = allIndices.filter((index) => !validationIndices.includes(index));
    }

    return folds;
  }

  /**
   * Generate time-series folds using rolling or expanding window strategies.
   * The order of data is preserved and shuffle is not allowed.
   * @param data - Sequential dataset (time-ordered). Only the number of samples is used here.
   * @param config - Time-series fold generation config.
   */
  public generateTimeSeriesFolds(data: TrainingData, config: TimeSeriesFoldConfig): TrainingFold[] {
    const n = data.features.shape[0];
    const windowSize = config.windowSize;
    const horizon = config.horizon ?? 1;
    const gap = config.gap ?? 0;

    if (windowSize <= 0) throw new Error('windowSize must be > 0');
    if (horizon <= 0) throw new Error('horizon must be > 0');
    if (gap < 0) throw new Error('gap must be >= 0');

    const folds: TrainingFold[] = [];

    // Compute the maximum starting index for training window such that train and validation are within bounds
    // Train: [start, start + windowLen)
    // Gap:   [start + windowLen, start + windowLen + gap)
    // Val:   [start + windowLen + gap, start + windowLen + gap + horizon)
    const windowLen = config.strategy === 'rolling' ? windowSize : undefined;

    const maxStartExclusive = (start: number, trainLen: number) =>
      start + trainLen + gap + horizon <= n;

    let generated = 0;
    if (config.strategy === 'rolling') {
      for (let start = 0; maxStartExclusive(start, windowSize); start++) {
        const trainStart = start;
        const trainEnd = start + windowSize; // exclusive
        const valStart = trainEnd + gap;
        const valEnd = valStart + horizon; // exclusive

        const trainIndices = Array.from({ length: windowSize }, (_, i) => trainStart + i);
        const validationIndices = Array.from({ length: horizon }, (_, i) => valStart + i);
        folds.push({ trainIndices, validationIndices });

        generated++;
        if (config.folds && generated >= config.folds) break;
      }
    } else {
      // expanding
      for (let start = 0; start < n; start++) {
        // For expanding, we grow the training window from [0, currentEnd)
        const trainLen = windowSize + start;
        if (!maxStartExclusive(0, trainLen)) break;
        const trainStart = 0;
        const trainEnd = trainLen; // exclusive
        const valStart = trainEnd + gap;
        const valEnd = valStart + horizon;

        const trainIndices = Array.from({ length: trainLen }, (_, i) => trainStart + i);
        const validationIndices = Array.from({ length: horizon }, (_, i) => valStart + i);
        folds.push({ trainIndices, validationIndices });

        generated++;
        if (config.folds && generated >= config.folds) break;
      }
    }

    return folds;
  }

  /**
   * Validate a time-series model using rolling or expanding CV.
   * For classification, computes accuracy, precision, recall, f1 (existing path).
   * For regression, computes MSE, RMSE, MAE, MAPE.
   * @param createModel - Factory returning a fresh, untrained model instance per fold.
   * @param data - Sequential dataset.
   * @param config - Time-series validation configuration including taskType.
   */
  public async validateTimeSeriesModel(
    createModel: () => tf.Sequential,
    data: TrainingData,
    config: TimeSeriesValidationConfig,
  ): Promise<TimeSeriesValidationResults> {
    const folds = this.generateTimeSeriesFolds(data, config);
    const foldMetrics: TimeSeriesFoldMetrics[] = [];

    for (const fold of folds) {
      const { trainIndices, validationIndices } = fold;

      const trainFeatures = tf.gather(data.features, trainIndices);
      const trainLabels = tf.gather(data.labels, trainIndices);
      const valFeatures = tf.gather(data.features, validationIndices);
      const valLabels = tf.gather(data.labels, validationIndices);

      const model = createModel();
      const fitArgs: tf.ModelFitArgs = {
        epochs: config.fitArgs?.epochs ?? 5,
        batchSize: config.fitArgs?.batchSize ?? 32,
        shuffle: config.fitArgs?.shuffle ?? false, // do not shuffle time-series by default
        verbose: config.fitArgs?.verbose ?? 0,
        validationData: [valFeatures, valLabels],
        callbacks: this.buildEarlyStoppingCallbacks(config.earlyStopping, config.taskType),
      };
      await model.fit(trainFeatures, trainLabels, fitArgs);

      const yPredTensor = model.predict(valFeatures) as tf.Tensor;

      if (config.taskType === 'classification') {
        const preds = Array.from(
          (await yPredTensor.argMax(1).data()) as unknown as Iterable<number>,
        );
        const actuals = Array.from(
          (await valLabels.argMax(1).data()) as unknown as Iterable<number>,
        );
        const classification = this.calculateValidationMetrics(preds, actuals);
        foldMetrics.push({ classification });
      } else {
        // regression
        // Ensure tensors are 1D vectors
        const yPred = Array.from((await yPredTensor.flatten().data()) as Iterable<number>);
        const yTrue = Array.from((await valLabels.flatten().data()) as Iterable<number>);
        const regression = this.calculateRegressionMetrics(yPred, yTrue);
        foldMetrics.push({ regression });
      }

      tf.dispose([trainFeatures, trainLabels, valFeatures, valLabels, yPredTensor]);
      model.dispose();
    }

    // Aggregate metrics
    const average = this.averageTimeSeriesMetrics(foldMetrics);
    const stdDeviation = this.stdTimeSeriesMetrics(foldMetrics);

    return { foldMetrics, average, stdDeviation };
  }

  /**
   * Calculates a set of performance metrics from predictions and actual values.
   * @param predictions - The model's predictions.
   * @param actuals - The true labels.
   * @returns A ValidationMetrics object.
   */
  public calculateValidationMetrics(predictions: number[], actuals: number[]): ValidationMetrics {
    if (predictions.length !== actuals.length) {
      throw new Error('Predictions and actuals must have the same length.');
    }

    const n = actuals.length;
    const correct = predictions.filter((p, i) => p === actuals[i]).length;
    const accuracy = correct / n;

    // Binary metrics when labels are {0,1}
    const uniqueLabels = Array.from(new Set([...predictions, ...actuals]));
    if (uniqueLabels.every((l) => l === 0 || l === 1)) {
      let tp = 0,
        tn = 0,
        fp = 0,
        fn = 0;
      for (let i = 0; i < n; i++) {
        const p = predictions[i];
        const a = actuals[i];
        if (p === 1 && a === 1) tp++;
        else if (p === 0 && a === 0) tn++;
        else if (p === 1 && a === 0) fp++;
        else if (p === 0 && a === 1) fn++;
      }
      const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
      const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
      const f1Score =
        precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
      return { accuracy, precision, recall, f1Score, confusionMatrix: { tp, tn, fp, fn } };
    }

    // Multi-class fallback: accuracy only for now
    return { accuracy };
  }

  /** Compute regression error metrics. */
  private calculateRegressionMetrics(predictions: number[], actuals: number[]): RegressionMetrics {
    if (predictions.length !== actuals.length) {
      throw new Error('Predictions and actuals must have the same length.');
    }
    const n = predictions.length;
    if (n === 0) {
      return { mse: 0, rmse: 0, mae: 0, mape: 0 };
    }

    let se = 0; // squared error sum
    let ae = 0; // absolute error sum
    let apeSum = 0; // absolute percentage error sum
    let mapeCount = 0; // count of valid denominators

    for (let i = 0; i < n; i++) {
      const err = predictions[i] - actuals[i];
      se += err * err;
      ae += Math.abs(err);
      const denom = Math.abs(actuals[i]);
      if (denom > 0) {
        apeSum += Math.abs(err) / denom;
        mapeCount += 1;
      }
    }

    const mse = se / n;
    const rmse = Math.sqrt(mse);
    const mae = ae / n;
    const mape = mapeCount === 0 ? 0 : apeSum / mapeCount;

    return { mse, rmse, mae, mape };
  }

  private aggregateMetrics(
    foldMetrics: ValidationMetrics[],
    aggFn: (arr: number[]) => number,
  ): ValidationMetrics {
    const aggregated: ValidationMetrics = {};
    const metricKeys = Object.keys(foldMetrics[0]) as (keyof ValidationMetrics)[];

    for (const key of metricKeys) {
      if (key === 'confusionMatrix') {
        // Do not average confusion matrices; keep them at fold level if needed.
        continue;
      }
      const values = foldMetrics
        .map((m) => m[key])
        .filter((v): v is number => typeof v === 'number');
      if (values.length > 0) {
        aggregated[key] = aggFn(values);
      }
    }
    return aggregated;
  }

  /** Average time-series metrics across folds. */
  private averageTimeSeriesMetrics(
    foldMetrics: TimeSeriesFoldMetrics[],
  ): TimeSeriesFoldMetrics | undefined {
    if (foldMetrics.length === 0) return undefined;

    const avg: TimeSeriesFoldMetrics = {};

    // Classification
    const cls = foldMetrics.map((f) => f.classification).filter((m): m is ValidationMetrics => !!m);
    if (cls.length > 0) {
      avg.classification = this.aggregateMetrics(cls, (arr) => tf.mean(arr).dataSync()[0]);
    }

    // Regression
    const regs = foldMetrics.map((f) => f.regression).filter((m): m is RegressionMetrics => !!m);
    if (regs.length > 0) {
      avg.regression = this.aggregateRegression(regs, (arr) => tf.mean(arr).dataSync()[0]);
    }

    return avg;
  }

  /** Std deviation of time-series metrics across folds. */
  private stdTimeSeriesMetrics(
    foldMetrics: TimeSeriesFoldMetrics[],
  ): TimeSeriesFoldMetrics | undefined {
    if (foldMetrics.length === 0) return undefined;

    const std: TimeSeriesFoldMetrics = {};

    const cls = foldMetrics.map((f) => f.classification).filter((m): m is ValidationMetrics => !!m);
    if (cls.length > 0) {
      std.classification = this.aggregateMetrics(
        cls,
        (arr) => tf.moments(arr).variance.sqrt().dataSync()[0],
      );
    }

    const regs = foldMetrics.map((f) => f.regression).filter((m): m is RegressionMetrics => !!m);
    if (regs.length > 0) {
      std.regression = this.aggregateRegression(
        regs,
        (arr) => tf.moments(arr).variance.sqrt().dataSync()[0],
      );
    }

    return std;
  }

  private aggregateRegression(
    foldMetrics: RegressionMetrics[],
    aggFn: (arr: number[]) => number,
  ): RegressionMetrics {
    const keys: (keyof RegressionMetrics)[] = ['mse', 'rmse', 'mae', 'mape'];
    const out: RegressionMetrics = { mse: 0, rmse: 0, mae: 0, mape: 0 };
    for (const key of keys) {
      const values = foldMetrics.map((m) => m[key]);
      out[key] = aggFn(values);
    }
    return out;
  }
}
