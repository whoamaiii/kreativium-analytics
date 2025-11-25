/**
 * @file Defines types related to Machine Learning, including training data structures.
 */

import * as tf from '@tensorflow/tfjs';

/**
 * Represents the structure for training data used by ML models.
 */
export interface TrainingData {
  /**
   * A 2D or 3D tensor of features for training.
   * Shape: [num_samples, num_features] or [num_samples, sequence_length, num_features]
   */
  features: tf.Tensor2D | tf.Tensor3D;

  /**
   * A 1D or 2D tensor of labels corresponding to the features.
   * Shape: [num_samples] or [num_samples, num_labels]
   */
  labels: tf.Tensor;

  /**
   * Optional array of student IDs corresponding to each sample.
   */
  studentIds?: string[];

  /**
   * Optional array of timestamps for each sample.
   */
  timestamps?: Date[];
}

export type {
  CrossValidationConfig,
  ValidationMetrics,
  TrainingFold,
  ValidationResults,
  EarlyStoppingConfig,
} from '@/lib/validation/crossValidation';
