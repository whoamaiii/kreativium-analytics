/**
 * Shared filter option constants
 * Used across FiltersDrawer and other filter components
 */

export const EMOTION_TYPES = [
  'Happy',
  'Calm',
  'Excited',
  'Anxious',
  'Frustrated',
  'Focused',
  'Tired',
  'Overwhelmed',
  'Content',
  'Curious',
] as const;

export const SENSORY_TYPES = [
  'Visual',
  'Auditory',
  'Tactile',
  'Vestibular',
  'Proprioceptive',
  'Olfactory',
  'Gustatory',
] as const;

export const SENSORY_RESPONSES = ['seeking', 'avoiding'] as const;

export const LOCATIONS = [
  'classroom',
  'playground',
  'lunchroom',
  'hallway',
  'home',
  'therapy',
  'library',
] as const;

export const ACTIVITIES = [
  'instruction',
  'transition',
  'free-time',
  'testing',
  'group-work',
] as const;

export const LIGHTING = [
  'natural',
  'fluorescent',
  'sunlight',
  'mixed',
  'bright',
  'moderate',
  'dim',
] as const;

export const WEATHER = ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy'] as const;

export const TIME_OF_DAY = ['morning', 'afternoon', 'evening'] as const;

export const PATTERN_TYPES = ['trend', 'anomaly', 'correlation'] as const;

// Type exports for TypeScript
export type EmotionType = typeof EMOTION_TYPES[number];
export type SensoryType = typeof SENSORY_TYPES[number];
export type SensoryResponse = typeof SENSORY_RESPONSES[number];
export type Location = typeof LOCATIONS[number];
export type Activity = typeof ACTIVITIES[number];
export type Lighting = typeof LIGHTING[number];
export type Weather = typeof WEATHER[number];
export type TimeOfDay = typeof TIME_OF_DAY[number];
export type PatternType = typeof PATTERN_TYPES[number];
