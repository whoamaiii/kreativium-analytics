// Shared filter token constants for consistency across the app
// Keep tokens lowercase to match persisted data and filtering logic.

import type { EnvironmentalEntry } from '@/types/student';

export const CHALLENGING_EMOTION_TOKENS = [
  'anxious',
  'frustrated',
  'overwhelmed',
  'tired',
] as const;

export const POSITIVE_EMOTION_TOKENS_CORE = [
  'happy',
  'calm',
  'proud',
  'focused',
] as const;

export const SENSORY_TYPE_TOKENS = [
  'visual',
  'auditory',
  'tactile',
  'vestibular',
  'proprioceptive',
  'olfactory',
  'gustatory',
] as const;

export type ClassroomActivityToken = NonNullable<NonNullable<EnvironmentalEntry['classroom']>['activity']>;

export const CLASSROOM_ACTIVITY_TOKENS: ClassroomActivityToken[] = [
  'instruction',
  'transition',
  'free-time',
  'testing',
  'group-work',
];

export const LIGHTING_CONDITION_TOKENS = [
  'natural',
  'fluorescent',
  'sunlight',
  'mixed',
  'bright',
  'moderate',
  'dim',
] as const;

export const NATURAL_LIGHTING_TOKENS = [
  'natural',
  'sunlight',
] as const;



