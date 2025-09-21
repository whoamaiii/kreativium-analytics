import type { TrackingEntry } from '@/types/student';
import type { SessionRecoveryData } from '@/lib/sessionManager';

export interface TrackingValidationRules {
  minEmotions?: number;
  minSensoryInputs?: number;
  requireEnvironmental?: boolean;
  requireNotes?: boolean;
  minDuration?: number;
  maxDuration?: number;
  minDataPoints?: number;
  enableQualityChecks?: boolean;
  customValidators?: CustomValidator[];
}

export interface ValidationQualitySummary {
  completeness?: number;
  score?: number;
  [key: string]: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  quality?: ValidationQualitySummary;
}

export interface ValidationContext {
  entry?: TrackingEntry;
  session?: SessionRecoveryData;
  rules: TrackingValidationRules;
  counts: ValidationCounts;
  now: Date;
  quality?: ValidationQualitySummary;
}

export interface ValidationCounts {
  emotionCount: number;
  sensoryCount: number;
  totalDataPoints: number;
  hasEnvironmental: boolean;
  notesLength: number;
}

export interface SessionValidationOptions {
  now?: Date;
  qualityEvaluator?: (session: SessionRecoveryData) => ValidationQualitySummary | undefined;
  qualityThreshold?: number;
}

export interface EntryValidationOptions {
  now?: Date;
}

export interface CustomValidatorResult {
  isValid: boolean;
  errors?: string | string[];
  warnings?: string | string[];
}

export type CustomValidator = (context: ValidationContext) => CustomValidatorResult | void;

const DEFAULT_MIN_DATA_POINTS = 1;
const DEFAULT_QUALITY_THRESHOLD = 20;

type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

export function validateTrackingEntry(
  entry: TrackingEntry,
  rules: TrackingValidationRules = {},
  options: EntryValidationOptions = {}
): ValidationResult {
  const now = options.now ?? new Date();
  const counts: ValidationCounts = {
    emotionCount: Array.isArray(entry?.emotions) ? entry.emotions.length : 0,
    sensoryCount: Array.isArray(entry?.sensoryInputs) ? entry.sensoryInputs.length : 0,
    totalDataPoints: getTotalDataPoints(entry),
    hasEnvironmental: Boolean(entry?.environmentalData),
    notesLength: entry?.notes ? entry.notes.trim().length : 0,
  };

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!entry || typeof entry !== 'object') {
    errors.push('Invalid tracking entry');
    return { isValid: false, errors, warnings };
  }

  if (!entry.studentId || typeof entry.studentId !== 'string') {
    errors.push('Missing studentId');
  }

  applyRuleChecks({
    context: {
      entry,
      rules,
      counts,
      now,
    },
    errors,
    warnings,
  });

  runCustomValidators(rules, {
    entry,
    rules,
    counts,
    now,
  }, errors, warnings);

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateSession(
  session: SessionRecoveryData,
  rules: TrackingValidationRules = {},
  options: SessionValidationOptions = {}
): ValidationResult {
  const now = options.now ?? new Date();

  if (!session) {
    return { isValid: false, errors: ['No session data provided'], warnings: [] };
  }

  const counts: ValidationCounts = {
    emotionCount: Array.isArray(session.data?.emotions) ? session.data.emotions.length : 0,
    sensoryCount: Array.isArray(session.data?.sensoryInputs) ? session.data.sensoryInputs.length : 0,
    totalDataPoints: getTotalDataPoints(session.data),
    hasEnvironmental: Boolean(session.data?.environmentalData),
    notesLength: session.data?.notes ? session.data.notes.trim().length : 0,
  };

  const errors: string[] = [];
  const warnings: string[] = [];
  let quality: ValidationQualitySummary | undefined;

  applyRuleChecks({
    context: {
      session,
      rules,
      counts,
      now,
    },
    errors,
    warnings,
  });

  if (rules.minDuration || rules.maxDuration) {
    const duration = getSessionDuration(session, now);
    if (rules.minDuration && duration < rules.minDuration) {
      errors.push(`Session too short (minimum ${Math.floor(rules.minDuration / 1000)} seconds)`);
    }
    if (rules.maxDuration && duration > rules.maxDuration) {
      errors.push(`Session too long (maximum ${Math.floor(rules.maxDuration / 1000)} seconds)`);
    }
  }

  if (rules.enableQualityChecks) {
    if (options.qualityEvaluator) {
      quality = options.qualityEvaluator(session) ?? undefined;
      const threshold = options.qualityThreshold ?? DEFAULT_QUALITY_THRESHOLD;
      if (typeof quality?.completeness === 'number' && quality.completeness < threshold) {
        errors.push(`Session data is too incomplete (< ${threshold}% completeness)`);
      }
    } else {
      warnings.push('Quality checks enabled without quality evaluator');
    }
  }

  runCustomValidators(rules, {
    session,
    rules,
    counts,
    now,
    quality,
  }, errors, warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    quality,
  };
}

function applyRuleChecks({
  context,
  errors,
  warnings,
}: {
  context: ValidationContext;
  errors: Mutable<string[]>;
  warnings: Mutable<string[]>;
}) {
  const { rules, counts, entry, session } = context;

  const minEmotions = rules.minEmotions ?? 0;
  const minSensory = rules.minSensoryInputs ?? 0;
  const minDataPoints = rules.minDataPoints ?? DEFAULT_MIN_DATA_POINTS;

  if (minEmotions > 0 && counts.emotionCount < minEmotions) {
    errors.push(`At least ${minEmotions} emotion(s) required`);
  }

  if (minSensory > 0 && counts.sensoryCount < minSensory) {
    errors.push(`At least ${minSensory} sensory input(s) required`);
  }

  if (rules.requireEnvironmental && !counts.hasEnvironmental) {
    errors.push('Environmental data is required');
  }

  if (rules.requireNotes && counts.notesLength === 0) {
    errors.push('Notes are required');
  }

  if (minDataPoints > 0 && counts.totalDataPoints < minDataPoints) {
    errors.push(`At least ${minDataPoints} data point(s) required`);
  }

  if (!entry && !session && counts.totalDataPoints === 0) {
    errors.push('No tracking data provided');
  }
}

function runCustomValidators(
  rules: TrackingValidationRules,
  context: ValidationContext,
  errors: Mutable<string[]>,
  warnings: Mutable<string[]>
) {
  if (!rules.customValidators || rules.customValidators.length === 0) {
    return;
  }

  for (const validator of rules.customValidators) {
    try {
      const result = validator(context);
      if (!result) {
        continue;
      }
      if (!result.isValid) {
        const validatorErrors = normalizeMessages(result.errors);
        if (validatorErrors.length === 0) {
          errors.push('Custom validator failed');
        } else {
          errors.push(...validatorErrors);
        }
      }
      const validatorWarnings = normalizeMessages(result.warnings);
      if (validatorWarnings.length > 0) {
        warnings.push(...validatorWarnings);
      }
    } catch (error) {
      errors.push('Custom validator threw an error');
    }
  }
}

function normalizeMessages(input?: string | string[]): string[] {
  if (!input) return [];
  return Array.isArray(input) ? input : [input];
}

function getTotalDataPoints(source: {
  emotions?: unknown;
  sensoryInputs?: unknown;
} | undefined): number {
  const emotions = Array.isArray(source?.emotions) ? source?.emotions.length : 0;
  const sensory = Array.isArray(source?.sensoryInputs) ? source?.sensoryInputs.length : 0;
  return emotions + sensory;
}

function getSessionDuration(session: SessionRecoveryData, now: Date): number {
  const start = session.metadata?.startTime instanceof Date
    ? session.metadata.startTime.getTime()
    : new Date(session.metadata?.startTime ?? now).getTime();
  const end = session.metadata?.endTime instanceof Date
    ? session.metadata.endTime.getTime()
    : now.getTime();
  return Math.max(0, end - start);
}

