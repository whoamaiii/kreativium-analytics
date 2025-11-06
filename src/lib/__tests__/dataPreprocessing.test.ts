import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import {
  normalizeNumericArray,
  encodeTimeFeatures,
  toMLSessions,
  prepareEmotionDataset,
  prepareSensoryDataset,
  PREPROCESSING_SCHEMA_VERSION,
} from '@/lib/dataPreprocessing';
import { TrackingEntry } from '@/types/student';
import { analyticsConfig } from '@/lib/analyticsConfig';

// Snapshot config once to avoid recursive spies and ensure stability
const CONFIG_SNAPSHOT = analyticsConfig.getConfig();
vi.spyOn(analyticsConfig, 'getConfig').mockReturnValue(CONFIG_SNAPSHOT as any);

describe('normalizeNumericArray', () => {
  it('handles identical values (zero variance) without NaN and returns 0.5s', () => {
    const arr = [5, 5, 5, 5];
    const result = normalizeNumericArray(arr, { clampToUnit: true });
    expect(result.length).toBe(arr.length);
    expect(result.every((v) => v === 0.5)).toBe(true);
    expect(result.every((v) => Number.isFinite(v))).toBe(true);
  });

  it('respects provided min/max and minVariance; predictable outputs', () => {
    const arr = [0, 5, 10];
    const result = normalizeNumericArray(arr, { min: 0, max: 10, clampToUnit: true, minVariance: 1e-12 });
    expect(result).toEqual([0, 0.5, 1]);

    // If range less than minVariance, returns 0.5 array
    const resultZeroVar = normalizeNumericArray([3, 3, 3], { minVariance: 1 });
    expect(resultZeroVar).toEqual([0.5, 0.5, 0.5]);
  });
});

describe('encodeTimeFeatures', () => {
  it('produces deterministic 6-length vector within [-1,1] for known timestamp', () => {
    const date = new Date('2024-06-15T14:30:00Z');
    const features = encodeTimeFeatures(date);
    expect(features.length).toBe(6);
    features.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    });

    // Deterministic: same input -> same output
    const features2 = encodeTimeFeatures(date);
    expect(features2).toEqual(features);
  });
});

describe('toMLSessions', () => {
  it('maps emotions, sensory categorization, and environment correctly; handles missing fields', () => {
    const studentId = 's1';
    const entries: TrackingEntry[] = [
      {
        id: 'e1',
        studentId,
        timestamp: new Date('2024-01-01T09:00:00Z'),
        emotions: [
          { id: 'em1', emotion: 'Happy', intensity: 6, timestamp: new Date('2024-01-01T09:00:00Z') },
          { id: 'em2', emotion: 'Anxious', intensity: 4, timestamp: new Date('2024-01-01T09:15:00Z') },
        ],
        sensoryInputs: [
          { id: 's1', response: 'seeking', sensoryType: 'visual', timestamp: new Date('2024-01-01T09:05:00Z') },
          { id: 's2', response: 'avoiding', sensoryType: 'auditory', timestamp: new Date('2024-01-01T09:10:00Z') },
          { id: 's3', response: 'neutral', sensoryType: 'tactile', timestamp: new Date('2024-01-01T09:20:00Z') },
        ],
        environmentalData: {
          roomConditions: {
            lighting: 'bright',
            noiseLevel: 75,
            temperature: 72,
          },
          classroom: { activity: 'instruction' },
        },
        generalNotes: 'General note',
        notes: 'Note 1',
      },
      // Same day additional entry, missing some fields to ensure graceful handling
      {
        id: 'e2',
        studentId,
        timestamp: new Date('2024-01-01T13:00:00Z'),
        emotions: [
          { id: 'em3', emotion: 'Joy', intensity: 7, timestamp: new Date('2024-01-01T13:00:00Z') },
          { id: 'em4', emotion: 'Calm', intensity: 5, timestamp: new Date('2024-01-01T13:30:00Z') },
        ],
        sensoryInputs: [
          { id: 's4', response: 'seeking', sensoryType: 'visual', timestamp: new Date('2024-01-01T13:05:00Z') },
          { id: 's5', response: 'dislike', sensoryType: 'auditory', timestamp: new Date('2024-01-01T13:10:00Z') },
        ],
        // no environmentalData, no notes
      },
      // Next day minimal entry to ensure grouping and no throws
      {
        id: 'e3',
        studentId,
        timestamp: new Date('2024-01-02T10:00:00Z'),
        emotions: [],
        sensoryInputs: [],
      },
    ];

    const sessions = toMLSessions(entries);
    expect(sessions.length).toBe(2); // grouped by date

    const day1 = sessions[0];
    expect(day1.studentId).toBe(studentId);
    expect(day1.date).toBe('2024-01-01T00:00:00.000Z');

    // Emotion mapping: happy/joy -> happy max avg, anxious -> anxious, calm -> calm
    expect(typeof day1.emotion.happy).toBe('number');
    expect(typeof day1.emotion.anxious).toBe('number');
    expect(typeof day1.emotion.calm).toBe('number');

    // Sensory predominant: visual seeking (2 seeking), auditory avoiding (2 avoiding), tactile neutral
    expect(day1.sensory.visual).toBe('seeking');
    expect(day1.sensory.auditory).toBe('avoiding');
    expect(day1.sensory.tactile).toBe('neutral');

    // Environment mapping from latest entry of the day
    expect(day1.environment.lighting).toBe('bright');
    expect(day1.environment.noise).toBe('loud');
    expect(day1.environment.temperature).toBe('comfortable');

    const day2 = sessions[1];
    expect(day2.date).toBe('2024-01-02T00:00:00.000Z');
    // Should handle missing everything gracefully
    expect(day2.environment).toBeDefined();
    // Should not throw even with empty arrays
    expect(() => toMLSessions([entries[2]])).not.toThrow();
  });
});

describe('prepareEmotionDataset', () => {
  beforeEach(() => {
    // Open a TF scope for allocations in each test
     
    (tf.engine() as any).startScope?.();
  });
  afterEach(() => {
    // Make sure no stray tensors left allocated
    try {
       
      (tf.engine() as any).endScope?.();
    } catch {
      // ignore if scope was not started
    }
  });

  it('produces tensors with correct shapes, normalized within [0,1], and includes schemaVersion; disposes safely', () => {
    const sessions = [
      {
        id: 's-2024-01-01',
        studentId: 's1',
        date: '2024-01-01T00:00:00.000Z',
        emotion: { happy: 6, anxious: 4, calm: 5, sad: 1, angry: 2, energetic: 3, frustrated: 2 },
        sensory: {},
        environment: {},
        activities: [],
        notes: '',
      },
      {
        id: 's-2024-01-02',
        studentId: 's1',
        date: '2024-01-02T00:00:00.000Z',
        emotion: { happy: 7, anxious: 3, calm: 6, sad: 2, angry: 1, energetic: 4, frustrated: 3 },
        sensory: {},
        environment: {},
        activities: [],
        notes: '',
      },
      {
        id: 's-2024-01-03',
        studentId: 's1',
        date: '2024-01-03T00:00:00.000Z',
        emotion: { happy: 5, anxious: 5, calm: 5, sad: 2, angry: 2, energetic: 2, frustrated: 2 },
        sensory: {},
        environment: {},
        activities: [],
        notes: '',
      },
      {
        id: 's-2024-01-04',
        studentId: 's1',
        date: '2024-01-04T00:00:00.000Z',
        emotion: { happy: 8, anxious: 2, calm: 7, sad: 1, angry: 2, energetic: 5, frustrated: 1 },
        sensory: {},
        environment: {},
        activities: [],
        notes: '',
      },
      {
        id: 's-2024-01-05',
        studentId: 's1',
        date: '2024-01-05T00:00:00.000Z',
        emotion: { happy: 6, anxious: 4, calm: 5, sad: 3, angry: 2, energetic: 4, frustrated: 3 },
        sensory: {},
        environment: {},
        activities: [],
        notes: '',
      },
      {
        id: 's-2024-01-06',
        studentId: 's1',
        date: '2024-01-06T00:00:00.000Z',
        emotion: { happy: 7, anxious: 3, calm: 6, sad: 2, angry: 3, energetic: 4, frustrated: 2 },
        sensory: {},
        environment: {},
        activities: [],
        notes: '',
      },
      {
        id: 's-2024-01-07',
        studentId: 's1',
        date: '2024-01-07T00:00:00.000Z',
        emotion: { happy: 6, anxious: 4, calm: 5, sad: 2, angry: 2, energetic: 3, frustrated: 2 },
        sensory: {},
        environment: {},
        activities: [],
        notes: '',
      },
    ];

    const { inputs, outputs, meta } = prepareEmotionDataset(sessions, 3);

    expect(inputs.shape).toEqual([5, 3, 13]); // (N-seq+1), seqLen, 7 emotions + 6 time features
    expect(outputs.shape).toEqual([5, 7]);

    // Check normalization stability: values should be within [0,1] due to clamp
    const inputVals = inputs.dataSync();
    const outputVals = outputs.dataSync();
    for (const v of inputVals) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    for (const v of outputVals) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }

    // Metadata schema version present
    expect(meta.schemaVersion).toBe(PREPROCESSING_SCHEMA_VERSION);
    expect(typeof meta.normalizers.min).toBe('number');
    expect(typeof meta.normalizers.max).toBe('number');

    // Dispose after assertions
    inputs.dispose();
    outputs.dispose();
  });
});

describe('prepareSensoryDataset', () => {
  beforeEach(() => {
     
    (tf.engine() as any).startScope?.();
  });
  afterEach(() => {
    try {
       
      (tf.engine() as any).endScope?.();
    } catch {
      // ignore if scope was not started
    }
  });

  it('produces correct tensor shapes, includes schemaVersion, and is GC safe', () => {
    const sessions = [
      {
        id: 's-2024-01-01',
        studentId: 's1',
        date: '2024-01-01T00:00:00.000Z',
        emotion: {},
        sensory: { visual: 'seeking', auditory: 'avoiding', tactile: 'neutral' },
        environment: { lighting: 'bright', noise: 'loud', temperature: 'comfortable', crowded: 'very', smells: true, textures: false },
        activities: [],
        notes: '',
      },
      {
        id: 's-2024-01-02',
        studentId: 's1',
        date: '2024-01-02T00:00:00.000Z',
        emotion: {},
        sensory: { visual: 'neutral', auditory: 'seeking', tactile: 'avoiding', vestibular: 'neutral', proprioceptive: 'seeking' },
        environment: { lighting: 'dim', noise: 'moderate', temperature: 'hot', crowded: 'moderate', smells: false, textures: true },
        activities: [],
        notes: '',
      },
    ];

    const { inputs, outputs, meta } = prepareSensoryDataset(sessions);

    expect(inputs.shape).toEqual([2, 12]); // 6 env + 6 time
    expect(outputs.shape).toEqual([2, 15]); // 5 senses * 3 responses

    // Validate one-hot structure per sense (sum of each triplet should be 1)
    const outValues = outputs.arraySync();
    outValues.forEach((row) => {
      for (let i = 0; i < 5; i++) {
        const base = i * 3;
        const sum = row[base] + row[base + 1] + row[base + 2];
        expect(sum).toBe(1);
      }
    });

    expect(meta.schemaVersion).toBe(PREPROCESSING_SCHEMA_VERSION);

    // Dispose after assertions
    inputs.dispose();
    outputs.dispose();
  });
});

