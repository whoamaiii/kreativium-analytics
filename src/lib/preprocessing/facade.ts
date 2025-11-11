import * as tf from '@tensorflow/tfjs';
import { PreprocessingPipeline } from '@/lib/PreprocessingPipeline';
import { AnyStepConfig } from '@/types/preprocessing';
import { TrackingEntry } from '@/types/student';
import { MLSession } from '@/lib/mlModels';

/** Options for preparing emotion training data. */
export interface EmotionPreparationOptions {
  /**
   * Number of historical sessions per sequence window used to predict the next session.
   * Defaults to 7 to mirror legacy behavior.
   */
  sequenceLength?: number;
  /** Optional preprocessing pipeline configuration to apply to features. */
  pipelineConfig?: AnyStepConfig[];
}

/** Options for preparing sensory classification data. */
export interface SensoryPreparationOptions {
  /** Optional preprocessing pipeline configuration to apply to features. */
  pipelineConfig?: AnyStepConfig[];
}

/**
 * Converts granular TrackingEntry records to MLSession format used by ML models.
 *
 * This maintains backward compatibility with legacy transformation logic by:
 * - Aggregating emotion intensities per type as averages
 * - Collapsing sensory inputs into seeking/avoiding/neutral per modality
 * - Deriving environment signals (lighting, noise, temperature, crowded) from raw readings
 *
 * @param entries Raw tracking entries from the application
 * @returns Array of MLSession objects suitable for downstream ML processing
 */
export function convertTrackingEntriesToSessions(entries: TrackingEntry[]): MLSession[] {
  // Reuse the legacy transformation logic to ensure backward-compatible outputs
  return entries.map((entry) => {
    const emotionData: MLSession['emotion'] = {};
    const emotionTypes = ['happy', 'sad', 'angry', 'anxious', 'calm', 'energetic', 'frustrated'];

    emotionTypes.forEach((emotionType) => {
      const emotions = entry.emotions.filter((e) => e.emotion.toLowerCase() === emotionType);
      if (emotions.length > 0) {
        emotionData[emotionType as keyof MLSession['emotion']] =
          emotions.reduce((sum, e) => sum + e.intensity, 0) / emotions.length;
      }
    });

    const sensoryData: MLSession['sensory'] = {};
    const sensoryTypes = ['visual', 'auditory', 'tactile', 'vestibular', 'proprioceptive'];

    sensoryTypes.forEach((sensoryType) => {
      const sensoryInputs = entry.sensoryInputs.filter(
        (s) =>
          s.sensoryType?.toLowerCase() === sensoryType || s.type?.toLowerCase() === sensoryType,
      );
      if (sensoryInputs.length > 0) {
        const seekingCount = sensoryInputs.filter((s) =>
          s.response.toLowerCase().includes('seeking'),
        ).length;
        const avoidingCount = sensoryInputs.filter((s) =>
          s.response.toLowerCase().includes('avoiding'),
        ).length;
        const neutralCount = sensoryInputs.length - seekingCount - avoidingCount;

        if (seekingCount > avoidingCount && seekingCount > neutralCount) {
          sensoryData[sensoryType as keyof MLSession['sensory']] = 'seeking';
        } else if (avoidingCount > seekingCount && avoidingCount > neutralCount) {
          sensoryData[sensoryType as keyof MLSession['sensory']] = 'avoiding';
        } else {
          sensoryData[sensoryType as keyof MLSession['sensory']] = 'neutral';
        }
      }
    });

    const environmentData: MLSession['environment'] = {
      lighting:
        (entry.environmentalData?.roomConditions?.lighting as 'bright' | 'dim' | 'moderate') ||
        'moderate',
      noise:
        entry.environmentalData?.roomConditions?.noiseLevel &&
        entry.environmentalData.roomConditions.noiseLevel > 70
          ? 'loud'
          : entry.environmentalData?.roomConditions?.noiseLevel &&
              entry.environmentalData.roomConditions.noiseLevel < 40
            ? 'quiet'
            : 'moderate',
      temperature:
        entry.environmentalData?.roomConditions?.temperature &&
        entry.environmentalData.roomConditions.temperature > 26
          ? 'hot'
          : entry.environmentalData?.roomConditions?.temperature &&
              entry.environmentalData.roomConditions.temperature < 18
            ? 'cold'
            : 'comfortable',
      crowded:
        entry.environmentalData?.classroom?.studentCount &&
        entry.environmentalData.classroom.studentCount > 25
          ? 'very'
          : entry.environmentalData?.classroom?.studentCount &&
              entry.environmentalData.classroom.studentCount < 10
            ? 'not'
            : 'moderate',
      smells: false,
      textures: false,
    };

    return {
      id: entry.id,
      studentId: entry.studentId,
      date: entry.timestamp.toISOString(),
      emotion: emotionData,
      sensory: sensoryData,
      environment: environmentData,
      activities: [],
      notes: entry.notes || '',
    };
  });
}

/**
 * Prepares time-series emotion data for sequence-to-one multi-output regression.
 *
 * Constructs sliding windows over sorted sessions, appending cyclical time features
 * and normalizing features using legacy min-max normalization for compatibility.
 *
 * @param sessions Chronologically sortable sessions for a single entity
 * @param options Configuration (sequence length and optional preprocessing pipeline)
 * @returns Tensors: inputs [N, L, F], outputs [N, 7] and min/max normalizers for inverse-scaling
 */
export function prepareEmotionData(
  sessions: MLSession[],
  options: EmotionPreparationOptions = {},
): { inputs: tf.Tensor3D; outputs: tf.Tensor2D; normalizers: { min: number; max: number } } {
  const sequenceLength = options.sequenceLength ?? 7;

  // Construct a pipeline if provided, but default behavior mirrors legacy logic
  const pipeline = options.pipelineConfig
    ? new PreprocessingPipeline(options.pipelineConfig)
    : null;

  const sequences: number[][][] = [];
  const targets: number[][] = [];

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  for (let i = 0; i < sortedSessions.length - sequenceLength; i++) {
    const sequence: number[][] = [];
    const target: number[] = [];

    for (let j = 0; j < sequenceLength; j++) {
      const session = sortedSessions[i + j];
      const timeFeatures = extractTimeFeatures(new Date(session.date));
      const emotionValues = [
        session.emotion.happy ?? 0,
        session.emotion.sad ?? 0,
        session.emotion.angry ?? 0,
        session.emotion.anxious ?? 0,
        session.emotion.calm ?? 0,
        session.emotion.energetic ?? 0,
        session.emotion.frustrated ?? 0,
      ];
      sequence.push([...emotionValues, ...timeFeatures]);
    }

    const targetSession = sortedSessions[i + sequenceLength];
    target.push(
      targetSession.emotion.happy ?? 0,
      targetSession.emotion.sad ?? 0,
      targetSession.emotion.angry ?? 0,
      targetSession.emotion.anxious ?? 0,
      targetSession.emotion.calm ?? 0,
      targetSession.emotion.energetic ?? 0,
      targetSession.emotion.frustrated ?? 0,
    );

    sequences.push(sequence);
    targets.push(target);
  }

  // Optional: run a preprocessing pipeline on flattened data (no-op by default)
  // We keep the legacy min-max normalization to ensure backward-compatible ranges.
  const allValues = sequences.flat(2);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);

  const normalizedSequences = sequences.map((seq) =>
    seq.map((step) => normalizeData(step, min, max)),
  );
  const normalizedTargets = targets.map((target) => normalizeData(target, 0, 10));

  // If a pipeline was provided, we could apply additional transforms here in the future
  void pipeline;

  return {
    inputs: tf.tensor3d(normalizedSequences),
    outputs: tf.tensor2d(normalizedTargets),
    normalizers: { min, max },
  };
}

/**
 * Prepares sensory response classification data.
 *
 * Converts environment and temporal context into numeric features, and encodes
 * sensory responses as one-hot (seeking, avoiding, neutral) for each modality.
 *
 * @param sessions Sessions containing environment and sensory fields
 * @returns Tensors suitable for multi-label/multi-class learning per modality
 */
export function prepareSensoryData(
  sessions: MLSession[],
  _options: SensoryPreparationOptions = {},
): { inputs: tf.Tensor2D; outputs: tf.Tensor2D } {
  const inputs: number[][] = [];
  const outputs: number[][] = [];

  sessions.forEach((session) => {
    if (!session.sensory || !session.environment) return;

    const environmentFeatures = [
      session.environment.lighting === 'bright'
        ? 1
        : session.environment.lighting === 'dim'
          ? 0.5
          : 0,
      session.environment.noise === 'loud' ? 1 : session.environment.noise === 'moderate' ? 0.5 : 0,
      session.environment.temperature === 'hot'
        ? 1
        : session.environment.temperature === 'cold'
          ? 0
          : 0.5,
      session.environment.crowded === 'very'
        ? 1
        : session.environment.crowded === 'moderate'
          ? 0.5
          : 0,
      session.environment.smells ? 1 : 0,
      session.environment.textures ? 1 : 0,
    ];

    const timeFeatures = extractTimeFeatures(new Date(session.date));
    inputs.push([...environmentFeatures, ...timeFeatures]);

    const sensoryOutputs: number[] = [];
    ['visual', 'auditory', 'tactile', 'vestibular', 'proprioceptive'].forEach((sense) => {
      const response = session.sensory[sense as keyof typeof session.sensory];
      sensoryOutputs.push(
        response === 'seeking' ? 1 : 0,
        response === 'avoiding' ? 1 : 0,
        response === 'neutral' ? 1 : 0,
      );
    });

    outputs.push(sensoryOutputs);
  });

  return {
    inputs: tf.tensor2d(inputs),
    outputs: tf.tensor2d(outputs),
  };
}

/**
 * Extracts cyclical and ordinal time features from a Date.
 *
 * Features include:
 * - sin/cos of day-of-week and hour-of-day to preserve cyclicality
 * - normalized day-of-month and month-of-year
 *
 * @param date JavaScript Date object
 * @returns Array of normalized time features
 */
export function extractTimeFeatures(date: Date): number[] {
  const dayOfWeek = date.getDay() / 6;
  const hourOfDay = date.getHours() / 23;
  const dayOfMonth = (date.getDate() - 1) / 30;
  const monthOfYear = date.getMonth() / 11;

  const dayOfWeekSin = Math.sin(2 * Math.PI * dayOfWeek);
  const dayOfWeekCos = Math.cos(2 * Math.PI * dayOfWeek);
  const hourOfDaySin = Math.sin(2 * Math.PI * hourOfDay);
  const hourOfDayCos = Math.cos(2 * Math.PI * hourOfDay);

  return [dayOfWeekSin, dayOfWeekCos, hourOfDaySin, hourOfDayCos, dayOfMonth, monthOfYear];
}

/**
 * Min-max normalizes an array of numbers to [0,1].
 *
 * If explicit min/max are provided, they are used; otherwise computed from the data.
 * Falls back to a unit range when max == min to avoid division by zero.
 *
 * @param data Array of numeric values
 * @param min Optional global minimum
 * @param max Optional global maximum
 * @returns Normalized array
 */
export function normalizeData(data: number[], min?: number, max?: number): number[] {
  const dataMin = min ?? Math.min(...data);
  const dataMax = max ?? Math.max(...data);
  const range = dataMax - dataMin || 1;
  return data.map((value) => (value - dataMin) / range);
}
