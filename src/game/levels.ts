import { GAME_HOLD_DURATIONS } from '@/constants/game';

export type ExpressionKey =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'fearful'
  | 'disgusted'
  | 'surprised';

export interface GameRound {
  target: ExpressionKey;
  holdMs: number;
  threshold: number; // 0..1 required top probability
}

export interface World {
  id: string;
  nameKey: string; // i18n key e.g., common.game.worlds.calmForest
  rounds: GameRound[];
}

// Simple MVP world: 6 rounds with gentle thresholds
// Uses standard difficulty progression: EASY → MEDIUM → HARD
export const MVP_WORLD: World = {
  id: 'calm-forest',
  nameKey: 'game.worlds.calmForest',
  rounds: [
    { target: 'neutral', holdMs: GAME_HOLD_DURATIONS.EASY, threshold: 0.55 },
    { target: 'happy', holdMs: GAME_HOLD_DURATIONS.EASY, threshold: 0.6 },
    { target: 'surprised', holdMs: GAME_HOLD_DURATIONS.MEDIUM, threshold: 0.6 },
    { target: 'sad', holdMs: GAME_HOLD_DURATIONS.MEDIUM, threshold: 0.6 },
    { target: 'angry', holdMs: GAME_HOLD_DURATIONS.HARD, threshold: 0.6 },
    { target: 'happy', holdMs: GAME_HOLD_DURATIONS.HARD, threshold: 0.65 },
  ],
};

// Colorful, celebratory world focused on holding the expression steadily
export const STAR_HOLD_WORLD: World = {
  id: 'rainbow-star-hold',
  nameKey: 'game.worlds.rainbowStarHold',
  rounds: [
    { target: 'neutral', holdMs: 900, threshold: 0.55 },
    { target: 'happy', holdMs: 1000, threshold: 0.6 },
    { target: 'surprised', holdMs: 1100, threshold: 0.6 },
    { target: 'happy', holdMs: 1200, threshold: 0.62 },
    { target: 'neutral', holdMs: 1000, threshold: 0.58 },
    { target: 'happy', holdMs: 1300, threshold: 0.65 },
  ],
};

export const DEFAULT_WORLDS: World[] = [MVP_WORLD, STAR_HOLD_WORLD];
