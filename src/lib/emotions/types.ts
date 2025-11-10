// Core emotion types used across learning modules

export type EmotionId =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'anxious'
  | 'excited'
  | 'calm'
  | 'frustrated'
  | 'surprised'
  | 'fearful'
  | 'disgusted';

export interface EmotionDefinition {
  id: EmotionId;
  // i18n key (namespace:key) or raw key resolved by UI using useTranslation
  labelKey: string;
  // Public asset path for a pictogram (served from /public)
  iconPath?: string;
  // Tailwind token or CSS var name for accent ring/background
  colorToken?: string;
}

export interface TaskDifficulty {
  timeWindowMs: number;
  holdDurationMs: number;
  hint: 'none' | 'gentle' | 'strong';
}
