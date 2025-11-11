import type { EmotionDefinition, EmotionId } from './types';

// Minimal catalog referencing existing locale keys under tracking.emotions.types
// Icon paths can later be swapped for vector pictograms
export const EMOTION_CATALOG: Record<EmotionId, EmotionDefinition> = {
  neutral: {
    id: 'neutral',
    labelKey: 'common:emotionLab.expressions.neutral',
    iconPath: '/placeholder.svg',
    colorToken: 'emotion-neutral',
  },
  happy: {
    id: 'happy',
    labelKey: 'tracking:emotions.types.happy',
    iconPath: '/placeholder.svg',
    colorToken: 'emotion-happy',
  },
  sad: {
    id: 'sad',
    labelKey: 'tracking:emotions.types.sad',
    iconPath: '/placeholder.svg',
    colorToken: 'emotion-sad',
  },
  angry: {
    id: 'angry',
    labelKey: 'tracking:emotions.types.angry',
    iconPath: '/placeholder.svg',
    colorToken: 'emotion-angry',
  },
  anxious: {
    id: 'anxious',
    labelKey: 'tracking:emotions.types.anxious',
    iconPath: '/placeholder.svg',
    colorToken: 'emotion-anxious',
  },
  excited: {
    id: 'excited',
    labelKey: 'tracking:emotions.types.excited',
    iconPath: '/placeholder.svg',
    colorToken: 'emotion-excited',
  },
  calm: {
    id: 'calm',
    labelKey: 'tracking:emotions.types.calm',
    iconPath: '/placeholder.svg',
    colorToken: 'emotion-calm',
  },
  frustrated: {
    id: 'frustrated',
    labelKey: 'tracking:emotions.types.frustrated',
    iconPath: '/placeholder.svg',
    colorToken: 'emotion-frustrated',
  },
  surprised: {
    id: 'surprised',
    labelKey: 'common:emotionLab.expressions.surprised',
    iconPath: '/placeholder.svg',
    colorToken: 'emotion-surprised',
  },
  fearful: {
    id: 'fearful',
    labelKey: 'common:emotionLab.expressions.fearful',
    iconPath: '/placeholder.svg',
    colorToken: 'emotion-fearful',
  },
  disgusted: {
    id: 'disgusted',
    labelKey: 'common:emotionLab.expressions.disgusted',
    iconPath: '/placeholder.svg',
    colorToken: 'emotion-disgusted',
  },
};

export function listPlayableEmotions(): EmotionDefinition[] {
  // Exclude neutral for recognition/labeling tasks by default
  return Object.values(EMOTION_CATALOG).filter((e) => e.id !== 'neutral');
}
