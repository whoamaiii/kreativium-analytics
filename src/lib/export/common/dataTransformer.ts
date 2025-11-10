/**
 * Data Transformation and Anonymization
 *
 * Handles data anonymization, field selection, flattening, and enrichment.
 * Memory-efficient transformations for large datasets.
 */

import { Student, TrackingEntry, EmotionEntry, SensoryEntry, Goal } from "@/types/student";
import { ExportDataCollection } from "./exportOptions";

/**
 * Anonymization options
 */
export interface AnonymizationOptions {
  /** Replace student names with anonymous IDs */
  anonymizeNames?: boolean;

  /** Remove date of birth */
  removeDateOfBirth?: boolean;

  /** Truncate student IDs to last 4 characters */
  truncateIds?: boolean;

  /** Remove all notes/free text fields */
  removeNotes?: boolean;

  /** Preserve notes but redact potential PII */
  redactNotes?: boolean;
}

/**
 * Default anonymization: full anonymization
 */
const DEFAULT_ANONYMIZATION: AnonymizationOptions = {
  anonymizeNames: true,
  removeDateOfBirth: true,
  truncateIds: true,
  removeNotes: false,
  redactNotes: true
};

/**
 * Anonymize student data
 */
export function anonymizeStudent(
  student: Student,
  options: AnonymizationOptions = DEFAULT_ANONYMIZATION
): Student {
  const anonymized = { ...student };

  if (options.anonymizeNames) {
    anonymized.name = `Student_${student.id.slice(-4)}`;
  }

  if (options.removeDateOfBirth) {
    anonymized.dateOfBirth = undefined;
  }

  if (options.removeNotes) {
    anonymized.notes = undefined;
  } else if (options.redactNotes && anonymized.notes) {
    anonymized.notes = redactPII(anonymized.notes);
  }

  return anonymized;
}

/**
 * Anonymize emotion entry
 */
export function anonymizeEmotion(
  emotion: EmotionEntry,
  options: AnonymizationOptions = DEFAULT_ANONYMIZATION
): EmotionEntry {
  const anonymized = { ...emotion };

  if (options.truncateIds && anonymized.studentId) {
    anonymized.studentId = anonymized.studentId.slice(-4);
  }

  if (options.removeNotes) {
    anonymized.notes = undefined;
    anonymized.context = undefined;
  } else if (options.redactNotes) {
    if (anonymized.notes) {
      anonymized.notes = redactPII(anonymized.notes);
    }
    if (anonymized.context) {
      anonymized.context = redactPII(anonymized.context);
    }
  }

  return anonymized;
}

/**
 * Anonymize sensory entry
 */
export function anonymizeSensory(
  sensory: SensoryEntry,
  options: AnonymizationOptions = DEFAULT_ANONYMIZATION
): SensoryEntry {
  const anonymized = { ...sensory };

  if (options.truncateIds && anonymized.studentId) {
    anonymized.studentId = anonymized.studentId.slice(-4);
  }

  if (options.removeNotes) {
    anonymized.notes = undefined;
    anonymized.context = undefined;
    anonymized.environment = undefined;
  } else if (options.redactNotes) {
    if (anonymized.notes) {
      anonymized.notes = redactPII(anonymized.notes);
    }
    if (anonymized.context) {
      anonymized.context = redactPII(anonymized.context);
    }
    if (anonymized.environment) {
      anonymized.environment = redactPII(anonymized.environment);
    }
  }

  return anonymized;
}

/**
 * Anonymize goal
 */
export function anonymizeGoal(
  goal: Goal,
  options: AnonymizationOptions = DEFAULT_ANONYMIZATION
): Goal {
  const anonymized = { ...goal };

  if (options.truncateIds && anonymized.studentId) {
    anonymized.studentId = anonymized.studentId.slice(-4);
  }

  if (options.removeNotes) {
    anonymized.notes = undefined;
  } else if (options.redactNotes && anonymized.notes) {
    anonymized.notes = redactPII(anonymized.notes);
  }

  return anonymized;
}

/**
 * Anonymize tracking entry
 */
export function anonymizeTracking(
  tracking: TrackingEntry,
  options: AnonymizationOptions = DEFAULT_ANONYMIZATION
): TrackingEntry {
  const anonymized = { ...tracking };

  if (options.truncateIds) {
    anonymized.studentId = anonymized.studentId.slice(-4);
  }

  if (options.removeNotes) {
    anonymized.notes = undefined;
    anonymized.generalNotes = undefined;
  } else if (options.redactNotes) {
    if (anonymized.notes) {
      anonymized.notes = redactPII(anonymized.notes);
    }
    if (anonymized.generalNotes) {
      anonymized.generalNotes = redactPII(anonymized.generalNotes);
    }
  }

  // Anonymize nested entries
  anonymized.emotions = anonymized.emotions.map(e => anonymizeEmotion(e, options));
  anonymized.sensoryInputs = anonymized.sensoryInputs.map(s => anonymizeSensory(s, options));

  return anonymized;
}

/**
 * Anonymize entire data collection
 */
export function anonymizeData(
  data: ExportDataCollection,
  options: AnonymizationOptions = DEFAULT_ANONYMIZATION
): ExportDataCollection {
  return {
    trackingEntries: data.trackingEntries.map(t => anonymizeTracking(t, options)),
    emotions: data.emotions.map(e => anonymizeEmotion(e, options)),
    sensoryInputs: data.sensoryInputs.map(s => anonymizeSensory(s, options)),
    goals: data.goals.map(g => anonymizeGoal(g, options)),
    students: data.students?.map(s => anonymizeStudent(s, options))
  };
}

/**
 * Redact PII from text using regex patterns
 * Redacts: names, emails, phone numbers, addresses
 */
export function redactPII(text: string): string {
  let redacted = text;

  // Email addresses
  redacted = redacted.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');

  // Phone numbers (various formats)
  redacted = redacted.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE]');

  // Common name patterns (capitalize words that might be names)
  // This is conservative - only redacts obvious patterns like "Dear John" or "From: Mary"
  redacted = redacted.replace(/\b(Dear|From|To|Mr\.|Mrs\.|Ms\.|Dr\.)\s+[A-Z][a-z]+/g, '$1 [NAME]');

  // Addresses (street numbers and street names)
  redacted = redacted.replace(/\d+\s+[A-Z][a-z]+(\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr))/gi, '[ADDRESS]');

  return redacted;
}

/**
 * Select specific fields from an object using dot notation
 * Example: selectFields(student, ['name', 'grade']) returns { name, grade }
 */
export function selectFields<T extends Record<string, unknown>>(
  obj: T,
  fields: string[]
): Partial<T> {
  const result: Partial<T> = {};

  for (const field of fields) {
    if (field.includes('.')) {
      // Handle nested fields with dot notation
      const value = getNestedField(obj, field);
      if (value !== undefined) {
        // Create nested structure in result
        setNestedField(result, field, value);
      }
    } else {
      // Simple field
      if (field in obj) {
        result[field as keyof T] = obj[field as keyof T];
      }
    }
  }

  return result;
}

/**
 * Get nested field value using dot notation
 * Example: getNestedField({ a: { b: { c: 5 } } }, 'a.b.c') returns 5
 */
export function getNestedField(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Set nested field value using dot notation
 */
export function setNestedField(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let current: Record<string, unknown> = obj;

  for (const key of keys) {
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[lastKey] = value;
}

/**
 * Flatten nested data for tabular formats (CSV)
 * Converts nested objects into flat structure with dot notation keys
 */
export function flattenNestedData<T extends Record<string, unknown>>(
  obj: T,
  prefix: string = ''
): Record<string, unknown> {
  const flattened: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      flattened[fullKey] = '';
    } else if (Array.isArray(value)) {
      // Convert arrays to comma-separated strings
      flattened[fullKey] = value.map(v =>
        typeof v === 'object' ? JSON.stringify(v) : String(v)
      ).join('; ');
    } else if (value instanceof Date) {
      flattened[fullKey] = value.toISOString();
    } else if (typeof value === 'object') {
      // Recursively flatten nested objects
      Object.assign(flattened, flattenNestedData(value as Record<string, unknown>, fullKey));
    } else {
      flattened[fullKey] = value;
    }
  }

  return flattened;
}

/**
 * Enrich data with computed fields
 * Adds derived fields like age from dateOfBirth, progress percentages, etc.
 */
export function enrichWithComputedFields<T extends Record<string, unknown>>(
  obj: T,
  computations: Record<string, (obj: T) => unknown>
): T & Record<string, unknown> {
  const enriched = { ...obj };

  for (const [fieldName, computeFn] of Object.entries(computations)) {
    try {
      enriched[fieldName] = computeFn(obj);
    } catch (error) {
      // Skip field if computation fails
      // logger.warn(`Failed to compute field ${fieldName}:`, error);
    }
  }

  return enriched;
}

/**
 * Common computed fields for students
 */
export const STUDENT_COMPUTED_FIELDS = {
  age: (student: Student) => {
    if (!student.dateOfBirth) return null;
    const dob = new Date(student.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      return age - 1;
    }
    return age;
  },

  activeGoalCount: (student: Student) => {
    return student.iepGoals?.filter(g => g.status === 'active').length || 0;
  },

  accountAge: (student: Student) => {
    if (!student.createdAt) return null;
    const created = new Date(student.createdAt);
    const today = new Date();
    const days = Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  }
};

/**
 * Common computed fields for goals
 */
export const GOAL_COMPUTED_FIELDS = {
  progressPercentage: (goal: Goal) => {
    if (!goal.targetValue || !goal.dataPoints || goal.dataPoints.length === 0) {
      return 0;
    }
    const currentValue = goal.dataPoints[goal.dataPoints.length - 1].value;
    return Math.round((currentValue / goal.targetValue) * 100);
  },

  daysActive: (goal: Goal) => {
    const created = new Date(goal.createdDate);
    const today = new Date();
    return Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  },

  daysUntilTarget: (goal: Goal) => {
    const target = new Date(goal.targetDate);
    const today = new Date();
    return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  },

  isOverdue: (goal: Goal) => {
    const target = new Date(goal.targetDate);
    const today = new Date();
    return today > target && goal.status !== 'achieved';
  }
};

/**
 * Common computed fields for emotions
 */
export const EMOTION_COMPUTED_FIELDS = {
  isPositive: (emotion: EmotionEntry) => {
    const positiveEmotions = ['happy', 'calm', 'focused', 'excited', 'proud', 'content', 'joyful'];
    return positiveEmotions.includes(emotion.emotion.toLowerCase());
  },

  isNegative: (emotion: EmotionEntry) => {
    const negativeEmotions = ['angry', 'sad', 'frustrated', 'anxious', 'overwhelmed', 'scared'];
    return negativeEmotions.includes(emotion.emotion.toLowerCase());
  },

  hasHighIntensity: (emotion: EmotionEntry) => {
    return emotion.intensity >= 7;
  }
};

/**
 * Transform data collection with all transformations applied
 */
export function transformData(
  data: ExportDataCollection,
  options: {
    anonymize?: boolean;
    anonymizationOptions?: AnonymizationOptions;
    selectFields?: string[];
    flatten?: boolean;
    enrichWithComputed?: boolean;
  }
): ExportDataCollection {
  let transformed = { ...data };

  // Apply anonymization
  if (options.anonymize) {
    transformed = anonymizeData(transformed, options.anonymizationOptions);
  }

  // Field selection would be applied during formatting
  // since it's type-specific

  // Enrichment with computed fields
  if (options.enrichWithComputed) {
    transformed = {
      ...transformed,
      students: transformed.students?.map(s =>
        enrichWithComputedFields(s, STUDENT_COMPUTED_FIELDS as Record<string, (obj: Student) => unknown>)
      ) as Student[],
      goals: transformed.goals.map(g =>
        enrichWithComputedFields(g, GOAL_COMPUTED_FIELDS as Record<string, (obj: Goal) => unknown>)
      ) as Goal[],
      emotions: transformed.emotions.map(e =>
        enrichWithComputedFields(e, EMOTION_COMPUTED_FIELDS as Record<string, (obj: EmotionEntry) => unknown>)
      ) as EmotionEntry[]
    };
  }

  return transformed;
}

/**
 * Batch transform with progress tracking
 */
export function* transformDataBatched(
  data: ExportDataCollection,
  options: {
    anonymize?: boolean;
    anonymizationOptions?: AnonymizationOptions;
  },
  batchSize: number = 1000
): Generator<{ type: string; transformed: unknown[] }> {
  // Transform students in batches
  if (data.students) {
    for (let i = 0; i < data.students.length; i += batchSize) {
      const batch = data.students.slice(i, i + batchSize);
      const transformed = options.anonymize
        ? batch.map(s => anonymizeStudent(s, options.anonymizationOptions))
        : batch;
      yield { type: 'students', transformed };
    }
  }

  // Transform emotions in batches
  for (let i = 0; i < data.emotions.length; i += batchSize) {
    const batch = data.emotions.slice(i, i + batchSize);
    const transformed = options.anonymize
      ? batch.map(e => anonymizeEmotion(e, options.anonymizationOptions))
      : batch;
    yield { type: 'emotions', transformed };
  }

  // Transform sensory inputs in batches
  for (let i = 0; i < data.sensoryInputs.length; i += batchSize) {
    const batch = data.sensoryInputs.slice(i, i + batchSize);
    const transformed = options.anonymize
      ? batch.map(s => anonymizeSensory(s, options.anonymizationOptions))
      : batch;
    yield { type: 'sensoryInputs', transformed };
  }

  // Transform goals in batches
  for (let i = 0; i < data.goals.length; i += batchSize) {
    const batch = data.goals.slice(i, i + batchSize);
    const transformed = options.anonymize
      ? batch.map(g => anonymizeGoal(g, options.anonymizationOptions))
      : batch;
    yield { type: 'goals', transformed };
  }

  // Transform tracking entries in batches
  for (let i = 0; i < data.trackingEntries.length; i += batchSize) {
    const batch = data.trackingEntries.slice(i, i + batchSize);
    const transformed = options.anonymize
      ? batch.map(t => anonymizeTracking(t, options.anonymizationOptions))
      : batch;
    yield { type: 'trackingEntries', transformed };
  }
}
