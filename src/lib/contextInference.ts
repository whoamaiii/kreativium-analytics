/**
 * Context Inference Engine
 *
 * Intelligently predicts tracking context based on:
 * - Time of day
 * - Student's historical patterns
 * - Recent tracking entries
 * - Environmental context
 *
 * This enables one-tap quick entry by auto-filling sensory data
 * and suggesting relevant templates.
 */

import { EmotionEntry, SensoryEntry, TrackingEntry, Pattern } from '@/types/student';
import { dataStorage } from '@/lib/dataStorage';
import { logger } from '@/lib/logger';
import { subDays } from 'date-fns';

export interface ContextPrediction {
  /** Suggested template category */
  suggestedCategory: 'morning' | 'transition' | 'learning' | 'break' | 'afternoon' | 'custom';

  /** Confidence score (0-1) for this prediction */
  confidence: number;

  /** Inferred sensory responses based on emotion + history */
  inferredSensoryInputs: Partial<SensoryEntry>[];

  /** Suggested triggers based on historical patterns */
  suggestedTriggers: string[];

  /** Suggested coping strategies that worked before */
  suggestedCoping: string[];

  /** Reasoning for this prediction (for transparency) */
  reasoning: string;

  /** Template ID to auto-suggest */
  templateId?: string;
}

export interface ContextInputs {
  studentId: string;
  currentEmotion?: string;
  currentTime?: Date;
  recentPatterns?: Pattern[];
}

/**
 * Determines time-of-day category from a timestamp
 */
export function getTimeOfDayCategory(timestamp: Date = new Date()): 'morning' | 'afternoon' | 'evening' {
  const hour = timestamp.getHours();

  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * Detects if current time is likely a transition period in school schedule
 *
 * Typical school transitions:
 * - 7:30-8:30 AM: Arrival
 * - 10:00-10:15 AM: Mid-morning break
 * - 11:30-12:30 PM: Lunch
 * - 2:00-2:15 PM: Afternoon break
 * - 2:45-3:30 PM: Dismissal
 */
export function isLikelyTransition(timestamp: Date = new Date()): boolean {
  const hour = timestamp.getHours();
  const minute = timestamp.getMinutes();

  // Arrival window (7:30-8:30)
  if (hour === 7 && minute >= 30) return true;
  if (hour === 8 && minute <= 30) return true;

  // Mid-morning break (10:00-10:15)
  if (hour === 10 && minute <= 15) return true;

  // Lunch transition (11:30-12:30)
  if (hour === 11 && minute >= 30) return true;
  if (hour === 12 && minute <= 30) return true;

  // Afternoon break (2:00-2:15)
  if (hour === 14 && minute <= 15) return true;

  // Dismissal (2:45-3:30)
  if (hour === 14 && minute >= 45) return true;
  if (hour === 15 && minute <= 30) return true;

  return false;
}

/**
 * Analyzes student's recent tracking data to find patterns
 * that can inform context inference
 */
export function analyzeRecentPatterns(
  studentId: string,
  lookbackDays: number = 14
): {
  commonEmotionPairs: Map<string, string[]>; // emotion → [common sensory responses]
  commonTriggers: string[];
  commonCoping: string[];
  emotionFrequency: Map<string, number>;
} {
  const cutoffDate = subDays(new Date(), lookbackDays);
  const entries = dataStorage.getEntriesForStudent(studentId)
    .filter(e => e.timestamp >= cutoffDate);

  if (entries.length === 0) {
    return {
      commonEmotionPairs: new Map(),
      commonTriggers: [],
      commonCoping: [],
      emotionFrequency: new Map()
    };
  }

  // Build emotion → sensory response mapping
  const emotionSensoryPairs = new Map<string, string[]>();
  const triggerCounts = new Map<string, number>();
  const copingCounts = new Map<string, number>();
  const emotionCounts = new Map<string, number>();

  for (const entry of entries) {
    // Track emotion-sensory co-occurrences
    for (const emotion of entry.emotions || []) {
      const emotionKey = emotion.emotion.toLowerCase();

      // Count emotion frequency
      emotionCounts.set(emotionKey, (emotionCounts.get(emotionKey) || 0) + 1);

      if (!emotionSensoryPairs.has(emotionKey)) {
        emotionSensoryPairs.set(emotionKey, []);
      }

      // Associate sensory inputs from same session
      for (const sensory of entry.sensoryInputs || []) {
        const sensoryKey = `${sensory.sensoryType || sensory.type}:${sensory.response}`;
        emotionSensoryPairs.get(emotionKey)!.push(sensoryKey);
      }

      // Track triggers
      for (const trigger of emotion.triggers || []) {
        triggerCounts.set(trigger, (triggerCounts.get(trigger) || 0) + 1);
      }
    }

    // Track coping strategies
    for (const sensory of entry.sensoryInputs || []) {
      for (const coping of sensory.copingStrategies || []) {
        copingCounts.set(coping, (copingCounts.get(coping) || 0) + 1);
      }
    }
  }

  // Find most common triggers (top 5)
  const commonTriggers = Array.from(triggerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([trigger]) => trigger);

  // Find most common coping strategies (top 5)
  const commonCoping = Array.from(copingCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([coping]) => coping);

  // Deduplicate sensory responses per emotion
  const deduplicatedPairs = new Map<string, string[]>();
  for (const [emotion, sensoryList] of emotionSensoryPairs.entries()) {
    deduplicatedPairs.set(emotion, Array.from(new Set(sensoryList)));
  }

  return {
    commonEmotionPairs: deduplicatedPairs,
    commonTriggers,
    commonCoping,
    emotionFrequency: emotionCounts
  };
}

/**
 * Main context inference function
 *
 * Given current inputs (emotion, time, student), predicts:
 * - Most likely template to use
 * - Sensory responses to auto-fill
 * - Triggers and coping strategies to suggest
 */
export function inferContext(inputs: ContextInputs): ContextPrediction {
  const { studentId, currentEmotion, currentTime = new Date() } = inputs;

  try {
    // Analyze student's historical patterns
    const patterns = analyzeRecentPatterns(studentId);

    // Determine time-based context
    const timeCategory = getTimeOfDayCategory(currentTime);
    const isTransition = isLikelyTransition(currentTime);

    // Default prediction
    let suggestedCategory: 'morning' | 'transition' | 'learning' | 'break' | 'afternoon' = 'learning';
    let templateId: string | undefined;
    let confidence = 0.5; // Base confidence
    let reasoning = '';

    // Priority 1: If it's a known transition time
    if (isTransition) {
      suggestedCategory = 'transition';
      templateId = 'transition-stress';
      confidence += 0.3;
      reasoning = 'Detected transition period in school schedule';
    }
    // Priority 2: Time of day
    else if (timeCategory === 'morning') {
      suggestedCategory = 'morning';
      templateId = 'morning-routine';
      confidence += 0.2;
      reasoning = 'Morning arrival time detected';
    }
    else if (timeCategory === 'afternoon') {
      suggestedCategory = 'afternoon';
      templateId = 'afternoon-fatigue';
      confidence += 0.2;
      reasoning = 'Afternoon time period';
    }

    // Priority 3: If emotion is provided, use historical patterns
    let inferredSensoryInputs: Partial<SensoryEntry>[] = [];
    if (currentEmotion && patterns.commonEmotionPairs.has(currentEmotion.toLowerCase())) {
      const sensoryPatterns = patterns.commonEmotionPairs.get(currentEmotion.toLowerCase()) || [];

      // Parse sensory patterns (format: "auditory:avoiding")
      inferredSensoryInputs = sensoryPatterns
        .slice(0, 2) // Top 2 most common
        .map(pattern => {
          const [sensoryType, response] = pattern.split(':');
          return {
            sensoryType,
            response,
            intensity: 3, // Default moderate intensity
            timestamp: new Date()
          };
        });

      if (inferredSensoryInputs.length > 0) {
        confidence += 0.2;
        reasoning += ` | Student typically shows ${inferredSensoryInputs[0].sensoryType} ${inferredSensoryInputs[0].response} when ${currentEmotion}`;
      }
    }

    // If anxious/angry during transition, boost confidence for transition template
    if (
      isTransition &&
      currentEmotion &&
      ['anxious', 'angry', 'frustrated', 'overwhelmed'].includes(currentEmotion.toLowerCase())
    ) {
      confidence = Math.min(0.9, confidence + 0.2);
      reasoning += ' | High-stress emotion during transition';
    }

    // Suggest triggers and coping from history
    const suggestedTriggers = patterns.commonTriggers.slice(0, 3);
    const suggestedCoping = patterns.commonCoping.slice(0, 3);

    return {
      suggestedCategory,
      confidence: Math.min(confidence, 1.0),
      inferredSensoryInputs,
      suggestedTriggers,
      suggestedCoping,
      reasoning,
      templateId
    };
  } catch (error) {
    logger.error('Context inference failed', { error, studentId });

    // Fallback: simple time-based inference
    const timeCategory = getTimeOfDayCategory(currentTime);
    return {
      suggestedCategory: timeCategory === 'morning' ? 'morning' :
                        timeCategory === 'afternoon' ? 'afternoon' : 'learning',
      confidence: 0.3,
      inferredSensoryInputs: [],
      suggestedTriggers: [],
      suggestedCoping: [],
      reasoning: 'Basic time-of-day inference (pattern analysis unavailable)',
      templateId: undefined
    };
  }
}

/**
 * Get most likely emotion for this student based on historical frequency
 */
export function predictLikelyEmotion(studentId: string): string | null {
  const patterns = analyzeRecentPatterns(studentId, 7); // Last week

  if (patterns.emotionFrequency.size === 0) return null;

  // Find most frequent emotion
  let maxCount = 0;
  let likelyEmotion: string | null = null;

  for (const [emotion, count] of patterns.emotionFrequency.entries()) {
    if (count > maxCount) {
      maxCount = count;
      likelyEmotion = emotion;
    }
  }

  return likelyEmotion;
}
