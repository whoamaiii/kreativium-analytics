import type { TrackingEntry, EmotionEntry, SensoryEntry, EnvironmentalEntry } from '@/types/student';
import type { SessionRecoveryData } from '@/lib/sessionManager';

export interface DataQualityMetrics {
  completeness: number;
  consistency: number;
  richness: number;
  emotionCount: number;
  sensoryCount: number;
  hasEnvironmental: boolean;
  sessionDuration: number;
}

export interface QualityAssessmentResult extends DataQualityMetrics {
  score: number;
  issues: string[];
  recommendations: string[];
}

export interface QualityAssessmentOptions {
  now?: Date;
}

type EmotionLike = Pick<EmotionEntry, 'emotion' | 'intensity'>;
type SensoryLike = Pick<SensoryEntry, 'response'> & {
  sensoryType?: string | null;
  type?: string | null;
};

type EnvironmentalLike = Partial<EnvironmentalEntry> | null | undefined;

type QualitySource = {
  emotions: EmotionLike[];
  sensoryInputs: SensoryLike[];
  environmentalData?: EnvironmentalLike;
  notes?: string | null;
  startTime?: Date | string;
  endTime?: Date | string | null;
};

const TWO_MINUTES = 2 * 60 * 1000;
const FIVE_MINUTES = 5 * 60 * 1000;

export function assessSessionQuality(
  session: SessionRecoveryData,
  options: QualityAssessmentOptions = {}
): QualityAssessmentResult {
  const source: QualitySource = {
    emotions: session.data.emotions ?? [],
    sensoryInputs: session.data.sensoryInputs ?? [],
    environmentalData: session.data.environmentalData ?? undefined,
    notes: session.data.notes,
    startTime: session.metadata.startTime,
    endTime: session.metadata.endTime ?? null,
  };

  return assessQualityFromSource(source, options);
}

export function assessEntryQuality(
  entry: TrackingEntry,
  options: QualityAssessmentOptions = {}
): QualityAssessmentResult {
  const source: QualitySource = {
    emotions: entry.emotions ?? [],
    sensoryInputs: entry.sensoryInputs ?? [],
    environmentalData: entry.environmentalData ?? undefined,
    notes: entry.notes ?? null,
  };

  return assessQualityFromSource(source, options);
}

export function calculateCompleteness(metrics: {
  emotionCount: number;
  sensoryCount: number;
  hasEnvironmental: boolean;
  notesLength: number;
  sessionDuration: number;
}): number {
  let completeness = 0;

  if (metrics.emotionCount > 0) completeness += 30;
  if (metrics.sensoryCount > 0) completeness += 30;
  if (metrics.hasEnvironmental) completeness += 20;

  if (metrics.notesLength > 50) completeness += 15;
  else if (metrics.notesLength > 0) completeness += 10;

  if (metrics.sessionDuration >= FIVE_MINUTES) completeness += 5;
  else if (metrics.sessionDuration >= TWO_MINUTES) completeness += 2.5;

  return Math.min(100, completeness);
}

export function calculateConsistency(source: QualitySource): number {
  const emotionIntensities = source.emotions
    .map(emotion => emotion?.intensity)
    .filter((value): value is number => typeof value === 'number');
  const uniqueIntensityCount = new Set(emotionIntensities).size;
  const emotionConsistency = emotionIntensities.length > 1
    ? (uniqueIntensityCount / emotionIntensities.length) * 100
    : 0;

  const sensoryResponses = source.sensoryInputs
    .map(sensory => sensory?.response)
    .filter((value): value is string => Boolean(value && value.trim().length > 0));
  const uniqueResponseCount = new Set(sensoryResponses).size;
  const sensoryConsistency = sensoryResponses.length > 1
    ? (uniqueResponseCount / sensoryResponses.length) * 100
    : 0;

  return clamp((emotionConsistency + sensoryConsistency) / 2, 0, 100);
}

export function calculateRichness(source: QualitySource): number {
  let richness = 0;

  const emotionTypes = new Set(
    source.emotions
      .map(emotion => emotion?.emotion?.trim())
      .filter((value): value is string => Boolean(value))
  ).size;
  richness += Math.min(emotionTypes * 10, 30);

  const sensoryTypes = new Set(
    source.sensoryInputs
      .map(sensory => sensory.sensoryType || sensory.type || null)
      .filter((value): value is string => Boolean(value))
  ).size;
  richness += Math.min(sensoryTypes * 10, 30);

  const notesLength = source.notes?.trim().length ?? 0;
  if (notesLength > 120) richness += 25;
  else if (notesLength > 50) richness += 20;
  else if (notesLength > 20) richness += 10;

  if (hasMeaningfulEnvironmentalData(source.environmentalData)) {
    richness += 20;
  }

  return Math.min(richness, 100);
}

function assessQualityFromSource(
  source: QualitySource,
  options: QualityAssessmentOptions
): QualityAssessmentResult {
  const now = options.now ?? new Date();
  const sessionDuration = computeDuration(source, now);
  const emotionCount = source.emotions.length;
  const sensoryCount = source.sensoryInputs.length;
  const hasEnvironmental = hasMeaningfulEnvironmentalData(source.environmentalData);
  const notesLength = source.notes?.trim().length ?? 0;

  const completeness = calculateCompleteness({
    emotionCount,
    sensoryCount,
    hasEnvironmental,
    notesLength,
    sessionDuration,
  });
  const consistency = calculateConsistency(source);
  const richness = calculateRichness(source);
  const score = clamp(completeness * 0.4 + consistency * 0.3 + richness * 0.3, 0, 100);

  const { issues, recommendations } = generateQualityInsights({
    emotionCount,
    sensoryCount,
    hasEnvironmental,
    notesLength,
    sessionDuration,
    completeness,
    consistency,
    richness,
  });

  return {
    score,
    completeness,
    consistency,
    richness,
    issues,
    recommendations,
    emotionCount,
    sensoryCount,
    hasEnvironmental,
    sessionDuration,
  };
}

function generateQualityInsights(metrics: {
  emotionCount: number;
  sensoryCount: number;
  hasEnvironmental: boolean;
  notesLength: number;
  sessionDuration: number;
  completeness: number;
  consistency: number;
  richness: number;
}) {
  const issues: string[] = [];
  const recommendations: string[] = [];

  if (metrics.emotionCount === 0) {
    issues.push('No emotions recorded');
    recommendations.push('Record at least one emotion');
  }

  if (metrics.sensoryCount === 0) {
    issues.push('No sensory inputs recorded');
    recommendations.push('Add sensory observations');
  }

  if (!metrics.hasEnvironmental) {
    issues.push('No environmental data collected');
    recommendations.push('Record environmental conditions when possible');
  }

  if (metrics.notesLength < 10) {
    issues.push('Minimal notes provided');
    recommendations.push('Add reflective notes to capture context');
  }

  if (metrics.sessionDuration < TWO_MINUTES) {
    issues.push('Very short session');
    recommendations.push('Spend more time observing before saving');
  }

  if (metrics.completeness < 40) {
    issues.push('Data set is incomplete');
    recommendations.push('Capture both emotion and sensory data for balance');
  }

  if (metrics.consistency < 30) {
    issues.push('Limited variety in responses');
    recommendations.push('Explore a wider range of intensities or responses');
  }

  if (metrics.richness < 40) {
    issues.push('Session lacks depth');
    recommendations.push('Include environmental details and detailed notes');
  }

  return { issues, recommendations };
}

function hasMeaningfulEnvironmentalData(environmental?: EnvironmentalLike): boolean {
  if (!environmental) return false;
  const values = Object.values(environmental).filter(Boolean);
  return values.length > 0;
}

function computeDuration(source: QualitySource, now: Date): number {
  if (!source.startTime) return 0;

  const start = source.startTime instanceof Date
    ? source.startTime.getTime()
    : new Date(source.startTime).getTime();

  const endTime = source.endTime ?? null;
  const end = endTime instanceof Date
    ? endTime.getTime()
    : endTime
      ? new Date(endTime).getTime()
      : now.getTime();

  return Math.max(0, end - start);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

