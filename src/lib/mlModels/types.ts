import * as tf from '@tensorflow/tfjs';
import type { ValidationResults } from '@/lib/validation/crossValidation';

/**
 * Model versioning and metadata
 */
export interface ModelMetadata {
  name: string;
  version: string;
  createdAt: Date;
  lastTrainedAt: Date;
  accuracy?: number;
  loss?: number;
  inputShape: number[];
  outputShape: number[];
  architecture: string;
  epochs: number;
  dataPoints: number;
  validationResults?: ValidationResults;
  /** Optional preprocessing schema version used to prepare the training data */
  preprocessingSchemaVersion?: string;
}

/**
 * ML Model types
 */
export type ModelType = 'emotion-prediction' | 'sensory-response' | 'baseline-clustering';

/**
 * Model storage interface
 */
export interface StoredModel {
  model: tf.LayersModel | tf.Sequential;
  metadata: ModelMetadata;
}

/**
 * Session-like interface for ML training, capturing the state
 * of a student in various sensory and emotional dimensions.
 */
export interface MLSession {
  /**
   * Unique session identifier.
   */
  id: string;
  /**
   * Identifier of the student associated with the session.
   */
  studentId: string;
  /**
   * Date of the session in ISO string format.
   */
  date: string;
  emotion: {
    /**
     * Average intensity values for each emotional state.
     * Ranges from 0 (none) to 10 (very intense).
     */
    happy?: number;
    sad?: number;
    angry?: number;
    anxious?: number;
    calm?: number;
    energetic?: number;
    frustrated?: number;
  };
  sensory: {
    /**
     * Sensory response types, categorized as seeking, avoiding, or neutral.
     */
    visual?: 'seeking' | 'avoiding' | 'neutral';
    auditory?: 'seeking' | 'avoiding' | 'neutral';
    tactile?: 'seeking' | 'avoiding' | 'neutral';
    vestibular?: 'seeking' | 'avoiding' | 'neutral';
    proprioceptive?: 'seeking' | 'avoiding' | 'neutral';
  };
  environment: {
    /**
     * Environmental conditions affecting the session.
     */
    lighting?: 'bright' | 'dim' | 'moderate';
    noise?: 'loud' | 'moderate' | 'quiet';
    temperature?: 'hot' | 'cold' | 'comfortable';
    crowded?: 'very' | 'moderate' | 'not';
    smells?: boolean; // Presence of specific smells
    textures?: boolean; // Presence of notable textures
  };
  /**
   * Activities performed during the session.
   */
  activities: string[];
  /**
   * Additional notes and observations.
   */
  notes: string;
}

/**
 * ML prediction results for emotions
 */
export interface EmotionPrediction {
  date: Date;
  emotions: {
    happy: number;
    sad: number;
    angry: number;
    anxious: number;
    calm: number;
    energetic: number;
    frustrated: number;
  };
  confidence: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

/**
 * ML prediction results for sensory responses
 */
export interface SensoryPrediction {
  sensoryResponse: {
    visual: { seeking: number; avoiding: number; neutral: number };
    auditory: { seeking: number; avoiding: number; neutral: number };
    tactile: { seeking: number; avoiding: number; neutral: number };
    vestibular: { seeking: number; avoiding: number; neutral: number };
    proprioceptive: { seeking: number; avoiding: number; neutral: number };
  };
  environmentalTriggers: {
    trigger: string;
    probability: number;
  }[];
  confidence: number;
}

/**
 * Baseline clustering result
 */
export interface BaselineCluster {
  clusterId: number;
  centroid: number[];
  description: string;
  anomalyScore: number;
  isNormal: boolean;
}
