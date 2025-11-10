import * as tf from '@tensorflow/tfjs';
import { TrackingEntry } from '../types/student';
import { MLSession } from './mlModels';
import { analyticsConfig } from '@/lib/analyticsConfig';

/**
 * Module: dataPreprocessing
 *
 * Purpose
 * - Convert raw TrackingEntry records into ML-ready tensors and structured sessions
 * - Provide safe, configurable normalization and temporal feature encoding
 *
 * Schema Versioning
 * - PREPROCESSING_SCHEMA_VERSION reflects the shape and semantics of preprocessing outputs
 * - Increment when tensor shapes, feature sets, or metadata contracts change
 * - Downstream modules (mlModels, modelEvaluation) may persist the schemaVersion in metadata
 *
 * Configuration Usage
 * - Reads runtime configuration from analyticsConfig (do not hardcode thresholds)
 *   - featureEngineering.normalization.{clampToUnit,minVariance}
 *   - featureEngineering.timeEncoding.variant
 *   - taxonomy.positiveEmotions (for mapping flexible labels)
 * - Always provide safe fallbacks when config is absent
 *
 * Notes
 * - Keep functions pure: no global mutations, return new structures
 * - Avoid data leakage: only compute statistics on the subset you intend to transform
 */

/**
 * Schema version for preprocessing output metadata.
 * Increment when data preprocessing output structure changes.
 */
export const PREPROCESSING_SCHEMA_VERSION = '1.0.0';

/**
 * Options for numeric array normalization.
 */
export interface NormalizeOptions {
  /** Minimum value for normalization range. If not provided, uses data minimum */
  min?: number;
  /** Maximum value for normalization range. If not provided, uses data maximum */
  max?: number;
  /** Whether to clamp normalized values to 0-1 range */
  clampToUnit?: boolean;
  /** Minimum variance threshold to prevent division by zero */
  minVariance?: number;
}

/**
 * Metadata for emotion dataset preparation.
 */
export interface EmotionDatasetMeta {
  /** Normalization parameters used for the dataset */
  normalizers: { min: number; max: number };
  /** Schema version of the preprocessing output */
  schemaVersion: string;
}

/**
 * Result of emotion dataset preparation.
 */
export interface EmotionDatasetResult {
  /** 3D tensor [batch, sequence, features] for LSTM input */
  inputs: tf.Tensor3D;
  /** 2D tensor [batch, emotions] for prediction targets */
  outputs: tf.Tensor2D;
  /** Metadata about the preprocessing */
  meta: EmotionDatasetMeta;
}

/**
 * Metadata for sensory dataset preparation.
 */
export interface SensoryDatasetMeta {
  /** Schema version of the preprocessing output */
  schemaVersion: string;
}

/**
 * Result of sensory dataset preparation.
 */
export interface SensoryDatasetResult {
  /** 2D tensor [batch, features] for neural network input */
  inputs: tf.Tensor2D;
  /** 2D tensor [batch, sensory_responses] for classification targets */
  outputs: tf.Tensor2D;
  /** Metadata about the preprocessing */
  meta: SensoryDatasetMeta;
}

/**
 * Normalizes a numeric array to a specified range with optional clamping and variance guards.
 *
 * This function provides robust normalization with configurable bounds and safety checks
 * to prevent division by zero or extreme values that could destabilize training.
 *
 * @param values - Array of numbers to normalize
 * @param opts - Normalization options
 * @returns Normalized array with values scaled to the specified range
 *
 * @example
 * ```typescript
 * const data = [1, 2, 3, 4, 5];
 * const normalized = normalizeNumericArray(data, {
 *   clampToUnit: true,
 *   minVariance: 1e-6
 * });
 * // Returns [0, 0.25, 0.5, 0.75, 1]
 * ```
 */
export const normalizeNumericArray = (values: number[], opts: NormalizeOptions = {}): number[] => {
  if (!values || values.length === 0) {
    return [];
  }

  // Get configuration defaults
  const config = analyticsConfig.getConfig();
  const {
    min: rangeMin,
    max: rangeMax,
    clampToUnit = config.featureEngineering.normalization.clampToUnit,
    minVariance = config.featureEngineering.normalization.minVariance,
  } = opts;

  // Calculate data bounds
  const dataMin = rangeMin ?? Math.min(...values);
  const dataMax = rangeMax ?? Math.max(...values);
  const range = dataMax - dataMin;

  // Guard against zero variance (all values identical)
  if (range < minVariance) {
    // Return array of 0.5 (middle of 0-1 range) for constant data
    return new Array(values.length).fill(0.5);
  }

  // Normalize to 0-1 range
  const normalized = values.map((value) => (value - dataMin) / range);

  // Apply clamping if requested
  if (clampToUnit) {
    return normalized.map((value) => Math.max(0, Math.min(1, value)));
  }

  return normalized;
};

/**
 * Encodes time features from a date using cyclical encoding for temporal patterns.
 *
 * Creates 6 stable features using sine/cosine transformations to represent
 * cyclical time patterns that neural networks can effectively learn from.
 * The variant can be configured through analyticsConfig.
 *
 * @param date - Date to extract features from
 * @param variant - Encoding variant, defaults to config or 'sixFeatureV1'
 * @returns Array of 6 encoded time features
 *
 * @example
 * ```typescript
 * const date = new Date('2024-06-15T14:30:00');
 * const features = encodeTimeFeatures(date);
 * // Returns [hour_sin, hour_cos, day_sin, day_cos, month_sin, month_cos]
 * ```
 */
export const encodeTimeFeatures = (
  date: Date,
  variant: 'sixFeatureV1' | 'none' = 'sixFeatureV1',
): number[] => {
  // Get variant from config if not specified
  const config = analyticsConfig.getConfig();
  const timeVariant =
    variant === 'sixFeatureV1' ? variant : config.featureEngineering.timeEncoding.variant;

  if (timeVariant === 'none') {
    return [];
  }

  // sixFeatureV1: Hour, Day of Month, Month cyclical encoding
  const hour = date.getHours();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1; // 1-12

  // Cyclical encoding using sine/cosine for each temporal dimension
  const hourSin = Math.sin((2 * Math.PI * hour) / 24);
  const hourCos = Math.cos((2 * Math.PI * hour) / 24);

  const dayOfMonthSin = Math.sin((2 * Math.PI * (dayOfMonth - 1)) / 31); // 0-30
  const dayOfMonthCos = Math.cos((2 * Math.PI * (dayOfMonth - 1)) / 31);

  const monthSin = Math.sin((2 * Math.PI * (month - 1)) / 12); // 0-11
  const monthCos = Math.cos((2 * Math.PI * (month - 1)) / 12);

  return [hourSin, hourCos, dayOfMonthSin, dayOfMonthCos, monthSin, monthCos];
};

/**
 * Converts tracking entries into ML-compatible session format.
 *
 * Groups tracking data by date and aggregates emotional and sensory information
 * into structured sessions suitable for machine learning training. Handles missing
 * data gracefully and preserves important mappings for traceability.
 *
 * @param entries - Array of tracking entries from the database
 * @returns Array of MLSession objects with normalized and aggregated data
 *
 * @example
 * ```typescript
 * const sessions = toMLSessions(trackingEntries);
 * // Returns sessions grouped by date with averaged emotions and categorized sensory responses
 * ```
 */
export const toMLSessions = (entries: TrackingEntry[]): MLSession[] => {
  if (!entries || entries.length === 0) {
    return [];
  }

  // Get configuration for fallback values
  const config = analyticsConfig.getConfig();
  const positiveEmotions = new Set(config.taxonomy.positiveEmotions.map((e) => e.toLowerCase()));

  // Group entries by date (ISO date string without time)
  const entriesByDate = new Map<string, TrackingEntry[]>();

  entries.forEach((entry) => {
    const dateKey = entry.timestamp.toISOString().split('T')[0];
    if (!entriesByDate.has(dateKey)) {
      entriesByDate.set(dateKey, []);
    }
    entriesByDate.get(dateKey)!.push(entry);
  });

  // Convert each date group to an MLSession
  const sessions: MLSession[] = [];

  entriesByDate.forEach((dayEntries, dateKey) => {
    // Aggregate emotions across all entries for this date
    const emotionTotals = new Map<string, { totalIntensity: number; count: number }>();

    dayEntries.forEach((entry) => {
      entry.emotions.forEach((emotion) => {
        const key = emotion.emotion.toLowerCase();
        if (!emotionTotals.has(key)) {
          emotionTotals.set(key, { totalIntensity: 0, count: 0 });
        }
        const current = emotionTotals.get(key)!;
        current.totalIntensity += emotion.intensity;
        current.count += 1;
      });
    });

    // Calculate average intensities for standard emotion categories
    const emotion = {
      happy: 0,
      sad: 0,
      angry: 0,
      anxious: 0,
      calm: 0,
      energetic: 0,
      frustrated: 0,
    };

    // Map emotions to standard categories with averaging
    emotionTotals.forEach(({ totalIntensity, count }, emotionName) => {
      const avgIntensity = totalIntensity / count;

      // Map to standard emotion categories (flexible mapping)
      if (
        emotionName.includes('happy') ||
        emotionName.includes('joy') ||
        positiveEmotions.has(emotionName)
      ) {
        emotion.happy = Math.max(emotion.happy, avgIntensity);
      } else if (emotionName.includes('sad') || emotionName.includes('down')) {
        emotion.sad = Math.max(emotion.sad, avgIntensity);
      } else if (emotionName.includes('angry') || emotionName.includes('mad')) {
        emotion.angry = Math.max(emotion.angry, avgIntensity);
      } else if (
        emotionName.includes('anxious') ||
        emotionName.includes('worry') ||
        emotionName.includes('nervous')
      ) {
        emotion.anxious = Math.max(emotion.anxious, avgIntensity);
      } else if (
        emotionName.includes('calm') ||
        emotionName.includes('peaceful') ||
        emotionName.includes('relax')
      ) {
        emotion.calm = Math.max(emotion.calm, avgIntensity);
      } else if (
        emotionName.includes('energetic') ||
        emotionName.includes('excited') ||
        emotionName.includes('active')
      ) {
        emotion.energetic = Math.max(emotion.energetic, avgIntensity);
      } else if (emotionName.includes('frustrated') || emotionName.includes('annoyed')) {
        emotion.frustrated = Math.max(emotion.frustrated, avgIntensity);
      }
    });

    // Aggregate sensory responses
    const sensoryCounts = new Map<
      string,
      { seeking: number; avoiding: number; neutral: number; total: number }
    >();
    const sensoryTypes = ['visual', 'auditory', 'tactile', 'vestibular', 'proprioceptive'];

    sensoryTypes.forEach((type) => {
      sensoryCounts.set(type, { seeking: 0, avoiding: 0, neutral: 0, total: 0 });
    });

    dayEntries.forEach((entry) => {
      entry.sensoryInputs.forEach((sensory) => {
        const type = (sensory.sensoryType || sensory.type || 'visual').toLowerCase();
        const response = sensory.response.toLowerCase();

        if (sensoryCounts.has(type)) {
          const counts = sensoryCounts.get(type)!;
          counts.total += 1;

          if (
            response.includes('seeking') ||
            response.includes('craving') ||
            response.includes('want')
          ) {
            counts.seeking += 1;
          } else if (
            response.includes('avoiding') ||
            response.includes('overwhelm') ||
            response.includes('dislike')
          ) {
            counts.avoiding += 1;
          } else {
            counts.neutral += 1;
          }
        }
      });
    });

    // Convert counts to predominant responses
    const sensory: MLSession['sensory'] = {};
    sensoryTypes.forEach((type) => {
      const counts = sensoryCounts.get(type)!;
      if (counts.total > 0) {
        if (counts.seeking >= counts.avoiding && counts.seeking >= counts.neutral) {
          sensory[type as keyof MLSession['sensory']] = 'seeking';
        } else if (counts.avoiding >= counts.neutral) {
          sensory[type as keyof MLSession['sensory']] = 'avoiding';
        } else {
          sensory[type as keyof MLSession['sensory']] = 'neutral';
        }
      }
    });

    // Extract environmental data (use most recent entry with environmentalData if available)
    // Walk from the end to find the latest entry that contains roomConditions
    const environment: MLSession['environment'] = {};
    const latestWithEnv = [...dayEntries]
      .reverse()
      .find((e) => e.environmentalData?.roomConditions);

    if (latestWithEnv?.environmentalData?.roomConditions) {
      const conditions = latestWithEnv.environmentalData.roomConditions;

      // Map lighting
      if (conditions.lighting) {
        if (conditions.lighting.toLowerCase().includes('bright')) {
          environment.lighting = 'bright';
        } else if (
          conditions.lighting.toLowerCase().includes('dim') ||
          conditions.lighting.toLowerCase().includes('low')
        ) {
          environment.lighting = 'dim';
        } else {
          environment.lighting = 'moderate';
        }
      }

      // Map noise level
      if (typeof conditions.noiseLevel === 'number') {
        if (conditions.noiseLevel > 70) {
          environment.noise = 'loud';
        } else if (conditions.noiseLevel < 40) {
          environment.noise = 'quiet';
        } else {
          environment.noise = 'moderate';
        }
      }

      // Map temperature
      if (typeof conditions.temperature === 'number') {
        if (conditions.temperature > 75) {
          environment.temperature = 'hot';
        } else if (conditions.temperature < 65) {
          environment.temperature = 'cold';
        } else {
          environment.temperature = 'comfortable';
        }
      }
    }

    // Extract activities and notes
    const activities = dayEntries
      .filter((entry) => entry.environmentalData?.classroom?.activity)
      .map((entry) => entry.environmentalData!.classroom!.activity!)
      .filter((activity, index, arr) => arr.indexOf(activity) === index); // Remove duplicates

    const notes = dayEntries
      .map((entry) => [entry.generalNotes, entry.notes].filter(Boolean))
      .flat()
      .join(' | ');

    // Create the session
    const session: MLSession = {
      id: `session_${dateKey}_${dayEntries[0].studentId}`,
      studentId: dayEntries[0].studentId,
      date: `${dateKey}T00:00:00.000Z`, // Standardize to start of day
      emotion,
      sensory,
      environment,
      activities,
      notes,
    };

    sessions.push(session);
  });

  // Sort sessions by date
  sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return sessions;
};

/**
 * Prepares emotion data for LSTM model training.
 *
 * Creates sequences of emotion data suitable for time-series prediction using LSTM networks.
 * Includes normalization parameters in metadata and handles variable sequence lengths.
 *
 * @param sessions - Array of ML sessions containing emotion data
 * @param sequenceLength - Length of input sequences for LSTM training
 * @returns Object containing input/output tensors and preprocessing metadata
 *
 * @example
 * ```typescript
 * const dataset = prepareEmotionDataset(sessions, 7);
 * // Returns LSTM-ready tensors with 7-day input sequences
 * ```
 */
export const prepareEmotionDataset = (
  sessions: MLSession[],
  sequenceLength: number = 7,
): EmotionDatasetResult => {
  if (!sessions || sessions.length < sequenceLength) {
    // Return empty tensors with proper metadata
    const emptyInputs = tf.zeros([0, sequenceLength, 13]) as tf.Tensor3D;
    const emptyOutputs = tf.zeros([0, 7]) as tf.Tensor2D;

    return {
      inputs: emptyInputs,
      outputs: emptyOutputs,
      meta: {
        normalizers: { min: 0, max: 1 },
        schemaVersion: PREPROCESSING_SCHEMA_VERSION,
      },
    };
  }

  const emotionKeys = [
    'happy',
    'sad',
    'angry',
    'anxious',
    'calm',
    'energetic',
    'frustrated',
  ] as const;

  // Extract emotion values and time features for each session
  const sequences: number[][] = [];
  const targets: number[][] = [];

  // Get configuration for normalization
  const config = analyticsConfig.getConfig();

  for (let i = 0; i < sessions.length - sequenceLength + 1; i++) {
    const inputSequence: number[][] = [];

    // Create input sequence
    for (let j = i; j < i + sequenceLength; j++) {
      const session = sessions[j];

      // Extract emotion values
      const emotionValues = emotionKeys.map((key) => session.emotion[key] || 0);

      // Extract time features
      const timeFeatures = encodeTimeFeatures(new Date(session.date));

      // Combine emotion values and time features
      inputSequence.push([...emotionValues, ...timeFeatures]);
    }

    // Target is the emotion values of the next session
    const targetSession = sessions[i + sequenceLength - 1];
    const targetValues = emotionKeys.map((key) => targetSession.emotion[key] || 0);

    sequences.push(inputSequence.flat());
    targets.push(targetValues);
  }

  if (sequences.length === 0) {
    const emptyInputs = tf.zeros([0, sequenceLength, 13]) as tf.Tensor3D;
    const emptyOutputs = tf.zeros([0, 7]) as tf.Tensor2D;

    return {
      inputs: emptyInputs,
      outputs: emptyOutputs,
      meta: {
        normalizers: { min: 0, max: 1 },
        schemaVersion: PREPROCESSING_SCHEMA_VERSION,
      },
    };
  }

  // Normalize sequences
  const flatSequences = sequences.flat();
  const normalizedSequences = normalizeNumericArray(flatSequences, {
    clampToUnit: config.featureEngineering.normalization.clampToUnit,
    minVariance: config.featureEngineering.normalization.minVariance,
  });

  // Normalize targets
  const flatTargets = targets.flat();
  const normalizedTargets = normalizeNumericArray(flatTargets, {
    clampToUnit: config.featureEngineering.normalization.clampToUnit,
    minVariance: config.featureEngineering.normalization.minVariance,
  });

  // Calculate normalization parameters for metadata
  const allValues = [...flatSequences, ...flatTargets];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);

  // Reshape data back to proper dimensions
  const reshapedSequences: number[][][] = [];
  let flatIndex = 0;

  for (let i = 0; i < sequences.length; i++) {
    const sequence: number[][] = [];
    for (let j = 0; j < sequenceLength; j++) {
      const timeStep: number[] = [];
      for (let k = 0; k < 13; k++) {
        // 7 emotions + 6 time features
        timeStep.push(normalizedSequences[flatIndex++]);
      }
      sequence.push(timeStep);
    }
    reshapedSequences.push(sequence);
  }

  const reshapedTargets: number[][] = [];
  flatIndex = 0;
  for (let i = 0; i < targets.length; i++) {
    const target: number[] = [];
    for (let j = 0; j < 7; j++) {
      // 7 emotions
      target.push(normalizedTargets[flatIndex++]);
    }
    reshapedTargets.push(target);
  }

  // Convert to tensors
  const inputs = tf.tensor3d(reshapedSequences) as tf.Tensor3D;
  const outputs = tf.tensor2d(reshapedTargets) as tf.Tensor2D;

  return {
    inputs,
    outputs,
    meta: {
      normalizers: { min, max },
      schemaVersion: PREPROCESSING_SCHEMA_VERSION,
    },
  };
};

/**
 * Prepares sensory data for classification model training.
 *
 * Creates feature vectors from environmental and temporal data to predict sensory responses.
 * Handles categorical encoding and missing data appropriately.
 *
 * @param sessions - Array of ML sessions containing sensory data
 * @returns Object containing input/output tensors and preprocessing metadata
 *
 * @example
 * ```typescript
 * const dataset = prepareSensoryDataset(sessions);
 * // Returns classification-ready tensors for sensory response prediction
 * ```
 */
export const prepareSensoryDataset = (sessions: MLSession[]): SensoryDatasetResult => {
  if (!sessions || sessions.length === 0) {
    const emptyInputs = tf.zeros([0, 12]) as tf.Tensor2D;
    const emptyOutputs = tf.zeros([0, 15]) as tf.Tensor2D;

    return {
      inputs: emptyInputs,
      outputs: emptyOutputs,
      meta: {
        schemaVersion: PREPROCESSING_SCHEMA_VERSION,
      },
    };
  }

  const inputs: number[][] = [];
  const outputs: number[][] = [];

  sessions.forEach((session) => {
    // Encode environmental features
    const envFeatures = [
      // Lighting: bright=1, dim=0.5, moderate=0
      session.environment.lighting === 'bright'
        ? 1
        : session.environment.lighting === 'dim'
          ? 0.5
          : 0,

      // Noise: loud=1, moderate=0.5, quiet=0
      session.environment.noise === 'loud' ? 1 : session.environment.noise === 'moderate' ? 0.5 : 0,

      // Temperature: hot=1, cold=0, comfortable=0.5
      session.environment.temperature === 'hot'
        ? 1
        : session.environment.temperature === 'cold'
          ? 0
          : 0.5,

      // Crowded: very=1, moderate=0.5, not=0
      session.environment.crowded === 'very'
        ? 1
        : session.environment.crowded === 'moderate'
          ? 0.5
          : 0,

      // Boolean features
      session.environment.smells ? 1 : 0,
      session.environment.textures ? 1 : 0,
    ];

    // Add time features
    const timeFeatures = encodeTimeFeatures(new Date(session.date));
    const inputVector = [...envFeatures, ...timeFeatures];

    // Encode sensory responses (5 senses × 3 responses = 15 outputs)
    const sensoryResponse = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const senses = ['visual', 'auditory', 'tactile', 'vestibular', 'proprioceptive'] as const;

    senses.forEach((sense, senseIndex) => {
      const response = session.sensory[sense];
      const baseIndex = senseIndex * 3;

      if (response === 'seeking') {
        sensoryResponse[baseIndex] = 1;
      } else if (response === 'avoiding') {
        sensoryResponse[baseIndex + 1] = 1;
      } else {
        sensoryResponse[baseIndex + 2] = 1; // neutral
      }
    });

    inputs.push(inputVector);
    outputs.push(sensoryResponse);
  });

  if (inputs.length === 0) {
    const emptyInputs = tf.zeros([0, 12]) as tf.Tensor2D;
    const emptyOutputs = tf.zeros([0, 15]) as tf.Tensor2D;

    return {
      inputs: emptyInputs,
      outputs: emptyOutputs,
      meta: {
        schemaVersion: PREPROCESSING_SCHEMA_VERSION,
      },
    };
  }

  // Convert to tensors
  const inputTensor = tf.tensor2d(inputs) as tf.Tensor2D;
  const outputTensor = tf.tensor2d(outputs) as tf.Tensor2D;

  return {
    inputs: inputTensor,
    outputs: outputTensor,
    meta: {
      schemaVersion: PREPROCESSING_SCHEMA_VERSION,
    },
  };
};
