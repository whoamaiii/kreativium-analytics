export interface DifficultyState {
  threshold: number;
  holdMs: number;
  streak: number;
}

export interface DifficultyEvent {
  kind: 'success' | 'fail' | 'streak_reset';
}

export function adaptDifficulty(state: DifficultyState, ev: DifficultyEvent): DifficultyState {
  let { threshold, holdMs, streak } = state;
  if (ev.kind === 'success') {
    streak += 1;
    // Slightly increase difficulty after streaks (cap moderately)
    if (streak % 3 === 0) {
      threshold = Math.min(0.85, threshold + 0.02);
      holdMs = Math.min(1200, Math.round(holdMs + 40));
    }
  } else if (ev.kind === 'fail') {
    streak = 0;
    // Ease difficulty a bit after a fail
    threshold = Math.max(0.5, threshold - 0.03);
    holdMs = Math.max(700, Math.round(holdMs - 60));
  } else if (ev.kind === 'streak_reset') {
    streak = 0;
  }
  return { threshold, holdMs, streak };
}

export type EmotionKey = 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised';

/**
 * Applies small, opinionated per‑emotion adjustments on top of current difficulty
 * to reflect relative ease/hardness of expressions for typical players.
 * Adjustments are intentionally subtle to avoid oscillations.
 */
export function refineDifficultyForEmotion(state: DifficultyState, emotion: EmotionKey): DifficultyState {
  const { streak } = state;
  let { threshold, holdMs } = state;
  switch (emotion) {
    case 'happy':
      threshold = Math.max(0.5, threshold - 0.01);
      holdMs = Math.max(700, Math.round(holdMs - 20));
      break;
    case 'sad':
      threshold = Math.max(0.5, threshold - 0.02);
      holdMs = Math.max(680, Math.round(holdMs - 30));
      break;
    case 'angry':
      threshold = Math.min(0.9, threshold + 0.015);
      holdMs = Math.min(1300, Math.round(holdMs + 20));
      break;
    case 'fearful':
      threshold = Math.min(0.88, threshold + 0.01);
      holdMs = Math.min(1250, Math.round(holdMs + 15));
      break;
    case 'disgusted':
      threshold = Math.min(0.88, threshold + 0.008);
      break;
    case 'surprised':
      threshold = Math.min(0.9, threshold + 0.02);
      holdMs = Math.max(700, Math.round(holdMs - 10)); // bursty expression
      break;
    case 'neutral':
    default:
      // small nudge to avoid being too strict at rest
      threshold = Math.max(0.5, threshold - 0.005);
  }
  return { threshold, holdMs, streak };
}


