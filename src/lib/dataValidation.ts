import { TrackingEntry, EmotionEntry, SensoryEntry, Student } from '@/types/student';
import { z } from 'zod';

// Goal schema (subset of Goal interface for validation)
const goalSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(['behavioral', 'academic', 'social', 'sensory', 'communication']),
  targetDate: z.date(),
  createdDate: z.date(),
  updatedAt: z.date(),
  status: z.enum(['active', 'achieved', 'modified', 'discontinued', 'not_started', 'in_progress', 'on_hold']),
  measurableObjective: z.string(),
  currentProgress: z.number(),
  progress: z.number(),
});

// Student schema
const studentSchema = z.object({
  id: z.string(),
  name: z.string(),
  grade: z.string().optional(),
  dateOfBirth: z.string().optional(),
  notes: z.string().optional(),
  iepGoals: z.array(goalSchema).optional(),
  createdAt: z.date(),
  lastUpdated: z.date().optional(),
  version: z.number().optional(),
});

// Emotion entry schema
const emotionEntrySchema = z.object({
  id: z.string(),
  studentId: z.string().optional(),
  timestamp: z
    .union([z.date(), z.string()])
    .transform((val) => (typeof val === 'string' ? new Date(val) : val)),
  emotion: z.string(),
  intensity: z.number(),
  triggers: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

// Sensory entry schema
const sensoryEntrySchema = z.object({
  id: z.string(),
  studentId: z.string().optional(),
  timestamp: z
    .union([z.date(), z.string()])
    .transform((val) => (typeof val === 'string' ? new Date(val) : val)),
  type: z.string().optional(),
  sensoryType: z.string().optional(),
  response: z.string(),
  intensity: z.number().optional(),
  notes: z.string().optional(),
});

// Environmental data schema
const environmentalDataSchema = z.object({
  id: z.string().optional(),
  timestamp: z.date().optional(),
  location: z.string().optional(),
  socialContext: z.string().optional(),
  roomConditions: z.object({
    temperature: z.number().optional(),
    humidity: z.number().optional(),
    lighting: z.string().optional(),
    noiseLevel: z.number().optional(),
  }).optional(),
  weather: z.object({
    condition: z.enum(['sunny', 'cloudy', 'rainy', 'stormy', 'snowy']),
    temperature: z.number().optional(),
    pressure: z.number().optional(),
  }).optional(),
  classroom: z.object({
    activity: z.enum(['instruction', 'transition', 'free-time', 'testing', 'group-work']).optional(),
    studentCount: z.number().optional(),
    timeOfDay: z.enum(['morning', 'afternoon', 'evening']).optional(),
  }).optional(),
  notes: z.string().optional(),
}).optional();

// Updated tracking entry schema to match the actual TrackingEntry type
const trackingEntrySchema = z.object({
  id: z.string(),
  studentId: z.string(),
  timestamp: z
    .union([z.date(), z.string()])
    .transform((val) => (typeof val === 'string' ? new Date(val) : val)),
  emotions: z.array(emotionEntrySchema),
  sensoryInputs: z.array(sensoryEntrySchema),
  environmentalData: environmentalDataSchema,
  notes: z.string().optional(),
});

const trackingDataSchema = z.object({
  entries: z.array(trackingEntrySchema),
  emotions: z.array(emotionEntrySchema),
  sensoryInputs: z.array(sensoryEntrySchema),
});

type ValidationResult = {
  valid: boolean;
  errors: z.ZodError | null;
  cleanedData: {
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
  };
};

export function validateTrackingData(data: unknown): ValidationResult {
  const result = trackingDataSchema.safeParse(data);
  if (result.success) {
    return {
      valid: true,
      errors: null,
      cleanedData: result.data,
    };
  } else {
    return {
      valid: false,
      errors: result.error,
      cleanedData: {
        entries: [],
        emotions: [],
        sensoryInputs: [],
      },
    };
  }
}

// Individual validation functions
type SimpleValidationResult = {
  isValid: boolean;
  errors?: string[];
};

export function validateStudent(student: unknown): SimpleValidationResult {
  const result = studentSchema.safeParse(student);
  return {
    isValid: result.success,
    errors: result.success ? undefined : result.error.errors.map((e) => e.message),
  };
}

export function validateEmotionEntry(entry: unknown): SimpleValidationResult {
  const result = emotionEntrySchema.safeParse(entry);
  return {
    isValid: result.success,
    errors: result.success ? undefined : result.error.errors.map((e) => e.message),
  };
}

export function validateSensoryEntry(entry: unknown): SimpleValidationResult {
  const result = sensoryEntrySchema.safeParse(entry);
  return {
    isValid: result.success,
    errors: result.success ? undefined : result.error.errors.map((e) => e.message),
  };
}

export function validateTrackingEntry(entry: unknown): SimpleValidationResult {
  const result = trackingEntrySchema.safeParse(entry);
  return {
    isValid: result.success,
    errors: result.success ? undefined : result.error.errors.map((e) => e.message),
  };
}
