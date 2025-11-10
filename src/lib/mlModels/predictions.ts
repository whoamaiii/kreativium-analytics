import * as tf from '@tensorflow/tfjs';
import { TrackingEntry } from '../../types/student';
import { analyticsConfig } from '@/lib/analyticsConfig';
import { toMLSessions, prepareEmotionDataset, encodeTimeFeatures } from '@/lib/dataPreprocessing';
import { EmotionPrediction, SensoryPrediction, MLSession, StoredModel, ModelType } from './types';

/**
 * Predict emotions for the next N days based on recent tracking entries.
 * Uses LSTM model to forecast emotional states using time-series data.
 *
 * @param recentEntries - Recent tracking entries to use as context
 * @param daysToPredict - Number of days to predict ahead (default: 7)
 * @param models - Map of trained models
 * @returns Array of emotion predictions with confidence intervals
 * @throws Error if emotion prediction model not found
 */
export async function predictEmotions(
  recentEntries: TrackingEntry[],
  daysToPredict: number,
  models: Map<ModelType, StoredModel>
): Promise<EmotionPrediction[]> {
  const recentSessions = toMLSessions(recentEntries);
  const model = models.get('emotion-prediction');
  if (!model) {
    throw new Error('Emotion prediction model not found');
  }

  const predictions: EmotionPrediction[] = [];
  const currentSessions = [...recentSessions];

  for (let day = 0; day < daysToPredict; day++) {
    const { inputs, meta } = prepareEmotionDataset(
      currentSessions.slice(-7),
      7
    );

    if (inputs.shape[0] === 0) {
      inputs.dispose();
      break;
    }

    const prediction = model.model.predict(inputs.slice([0, 0, 0], [1, -1, -1])) as tf.Tensor;
    const values = await prediction.array() as number[][];

    const predictedDate = new Date(currentSessions[currentSessions.length - 1].date);
    predictedDate.setDate(predictedDate.getDate() + 1);

    // Denormalize predictions
    const emotionValues = values[0].map(v => v * 10); // Convert back to 0-10 scale

    // Simple dispersion-based confidence: inverse of variance across outputs
    const variance = (() => {
      const mean = emotionValues.reduce((s, v) => s + v, 0) / emotionValues.length;
      const varSum = emotionValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / emotionValues.length;
      return varSum;
    })();
    const confidence = Math.max(0.0, Math.min(1.0, 1 / (1 + variance)));

    predictions.push({
      date: predictedDate,
      emotions: {
        happy: emotionValues[0],
        sad: emotionValues[1],
        angry: emotionValues[2],
        anxious: emotionValues[3],
        calm: emotionValues[4],
        energetic: emotionValues[5],
        frustrated: emotionValues[6]
      },
      confidence,
      confidenceInterval: {
        lower: Math.max(0, confidence - 0.1),
        upper: Math.min(1, confidence + 0.1)
      }
    });

    // Add prediction as a new session for next iteration
    currentSessions.push({
      id: `predicted-${day}`,
      studentId: currentSessions[0].studentId,
      date: predictedDate.toISOString(),
      emotion: {
        happy: emotionValues[0],
        sad: emotionValues[1],
        angry: emotionValues[2],
        anxious: emotionValues[3],
        calm: emotionValues[4],
        energetic: emotionValues[5],
        frustrated: emotionValues[6]
      },
      sensory: currentSessions[currentSessions.length - 1].sensory,
      environment: currentSessions[currentSessions.length - 1].environment,
      activities: [],
      notes: ''
    });

    // Clean up
    inputs.dispose();
    prediction.dispose();
  }

  return predictions;
}

/**
 * Predict sensory responses based on environmental conditions.
 * Uses feed-forward neural network to predict how a student will respond
 * to different sensory inputs in a given environment.
 *
 * @param environment - Environmental conditions to predict for
 * @param date - Date for time-based features
 * @param models - Map of trained models
 * @returns Sensory response predictions with environmental triggers
 * @throws Error if sensory response model not found
 */
export async function predictSensoryResponse(
  environment: MLSession['environment'],
  date: Date,
  models: Map<ModelType, StoredModel>
): Promise<SensoryPrediction> {
  const model = models.get('sensory-response');
  if (!model) {
    throw new Error('Sensory response model not found');
  }

  // Prepare input
  const environmentFeatures = [
    environment.lighting === 'bright' ? 1 : environment.lighting === 'dim' ? 0.5 : 0,
    environment.noise === 'loud' ? 1 : environment.noise === 'moderate' ? 0.5 : 0,
    environment.temperature === 'hot' ? 1 : environment.temperature === 'cold' ? 0 : 0.5,
    environment.crowded === 'very' ? 1 : environment.crowded === 'moderate' ? 0.5 : 0,
    environment.smells ? 1 : 0,
    environment.textures ? 1 : 0
  ];

  const timeFeatures = encodeTimeFeatures(date);
  const input = tf.tensor2d([[...environmentFeatures, ...timeFeatures]]);

  const prediction = model.model.predict(input) as tf.Tensor;
  const values = await prediction.array() as number[][];

  // Parse predictions
  const senses = ['visual', 'auditory', 'tactile', 'vestibular', 'proprioceptive'];
  const sensoryResponse: SensoryPrediction['sensoryResponse'] = {
    visual: { seeking: 0, avoiding: 0, neutral: 0 },
    auditory: { seeking: 0, avoiding: 0, neutral: 0 },
    tactile: { seeking: 0, avoiding: 0, neutral: 0 },
    vestibular: { seeking: 0, avoiding: 0, neutral: 0 },
    proprioceptive: { seeking: 0, avoiding: 0, neutral: 0 }
  };

  senses.forEach((sense, i) => {
    const baseIdx = i * 3;
    sensoryResponse[sense as keyof typeof sensoryResponse] = {
      seeking: values[0][baseIdx],
      avoiding: values[0][baseIdx + 1],
      neutral: values[0][baseIdx + 2]
    };
  });

  // Identify environmental triggers
  const triggers = [];
  const cfg = analyticsConfig.getConfig();
  const triggerCutoff = cfg.patternAnalysis.concernFrequencyThreshold; // reuse configured frequency threshold as cutoff
  if (environment.noise === 'loud' && sensoryResponse.auditory.avoiding > triggerCutoff) {
    triggers.push({ trigger: 'Loud noise', probability: sensoryResponse.auditory.avoiding });
  }
  if (environment.lighting === 'bright' && sensoryResponse.visual.avoiding > triggerCutoff) {
    triggers.push({ trigger: 'Bright lights', probability: sensoryResponse.visual.avoiding });
  }
  if (environment.crowded === 'very' && sensoryResponse.tactile.avoiding > triggerCutoff) {
    triggers.push({ trigger: 'Crowded spaces', probability: sensoryResponse.tactile.avoiding });
  }

  // Clean up
  input.dispose();
  prediction.dispose();

  // Confidence heuristic: sharper softmax => higher confidence
  const flat = values[0];
  const maxP = Math.max(...flat);
  const entropy = -flat.reduce((s, p) => s + (p > 0 ? p * Math.log(p) : 0), 0);
  const normEntropy = entropy / Math.log(flat.length || 1);
  const confidence = Math.max(0, Math.min(1, (maxP * 0.6) + (1 - normEntropy) * 0.4));

  return {
    sensoryResponse,
    environmentalTriggers: triggers.sort((a, b) => b.probability - a.probability),
    confidence
  };
}
