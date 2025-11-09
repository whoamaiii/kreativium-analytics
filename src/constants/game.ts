/**
 * Game-related constants and configuration
 *
 * This file centralizes all game-specific magic numbers and configuration
 * values to improve maintainability and make game balance adjustments easier.
 */

// ============================================================================
// Difficulty Settings
// ============================================================================

/**
 * Hold duration targets for each difficulty level (in milliseconds).
 * Players must hold the correct emotion for this duration to succeed.
 *
 * Used in: src/game/levels.ts
 */
export const GAME_HOLD_DURATIONS = {
  /** Easy mode: 800ms hold duration */
  EASY: 800,
  /** Medium mode: 900ms hold duration */
  MEDIUM: 900,
  /** Hard mode: 1000ms hold duration */
  HARD: 1000,
} as const;

/**
 * Combo thresholds for streak bonuses.
 * Determines when players receive combo multipliers and special effects.
 *
 * Used in: src/pages/EmotionGame.tsx
 */
export const COMBO_THRESHOLDS = {
  /** Bronze combo: 3 correct answers in a row */
  BRONZE: 3,
  /** Silver combo: 5 correct answers in a row */
  SILVER: 5,
  /** Gold combo: 10 correct answers in a row */
  GOLD: 10,
} as const;

/**
 * Score multipliers for different achievement types
 *
 * Used in: src/pages/EmotionGame.tsx
 */
export const SCORE_MULTIPLIERS = {
  /** Perfect accuracy bonus (no mistakes) */
  PERFECT: 1.5,
  /** Speed bonus (completed quickly) */
  FAST: 1.25,
  /** Combo streak bonus (active combo) */
  COMBO: 1.1,
} as const;

// ============================================================================
// Timing
// ============================================================================

/**
 * UI timing constants (in milliseconds)
 *
 * Used in: src/pages/EmotionGame.tsx
 */
export const GAME_TIMING = {
  /** Delay before starting a new round */
  ROUND_START_DELAY: 1000,
  /** Duration of celebration animation */
  CELEBRATION_DURATION: 2000,
  /** Hint display duration before auto-hide */
  HINT_DURATION: 3000,
  /** Feedback message display duration */
  FEEDBACK_DURATION: 1500,
} as const;

// ============================================================================
// Visual Effects
// ============================================================================

/**
 * Particle effect configuration
 */
export const PARTICLE_EFFECTS = {
  /** Minimum particles per celebration */
  MIN_PARTICLES: 20,
  /** Maximum particles per celebration */
  MAX_PARTICLES: 50,
  /** Particle animation duration (ms) */
  ANIMATION_DURATION: 3000,
} as const;

/**
 * Confetti configuration
 */
export const CONFETTI_CONFIG = {
  /** Full circle spread in degrees */
  FULL_CIRCLE_DEGREES: 360,
  /** Default confetti pieces */
  DEFAULT_PIECES: 30,
  /** Maximum confetti pieces for special events */
  MAX_PIECES: 100,
} as const;

// ============================================================================
// Calibration
// ============================================================================

/**
 * Detector calibration settings
 */
export const CALIBRATION = {
  /** Minimum calibration samples required */
  MIN_SAMPLES: 5,
  /** Maximum calibration time (seconds) */
  MAX_TIME_SECONDS: 30,
  /** Confidence threshold for calibration completion */
  CONFIDENCE_THRESHOLD: 0.8,
} as const;

// ============================================================================
// Storage Keys
// ============================================================================

/**
 * LocalStorage keys for game state persistence
 */
export const STORAGE_KEYS = {
  /** Current world/level index */
  WORLD_INDEX: 'emotion.worldIndex',
  /** Selected theme ID */
  THEME_ID: 'emotion.theme',
  /** Practice mode setting */
  PRACTICE_MODE: 'emotion.practice',
  /** Difficulty setting */
  DIFFICULTY: 'emotion.difficulty',
  /** High scores */
  HIGH_SCORES: 'emotion.highScores',
} as const;
