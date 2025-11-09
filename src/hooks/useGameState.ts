/**
 * Consolidated game state management using useReducer
 *
 * Replaces 20+ individual useState hooks in EmotionGame with a single,
 * predictable state machine. This improves:
 * - State predictability (all updates go through reducer)
 * - Debugging (centralized state transitions)
 * - Testing (pure reducer function)
 * - Performance (reduces re-renders from cascading setState calls)
 */

import { useReducer, useCallback } from 'react';
import type { GameMode } from '@/lib/game/modes';
import type { HintsState } from '@/lib/game/hints';
import type { EffectParams } from '@/lib/effects/effect-engine';
import { loadHints, useHint as consumeHint } from '@/lib/game/hints';
import { loadCalibration } from '@/hooks/useCalibration';
import { GAME_DIFFICULTY, EFFECT_CONFIG } from '@/config/gameConfig';

// ============================================================================
// Type Definitions
// ============================================================================

export type PracticeMode = 'mixed' | 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised';
export type ThemeId = 'regnbueland' | 'rom';

/**
 * Difficulty settings for the current round
 */
export interface DifficultyState {
  threshold: number;
  holdMs: number;
  streak: number;
}

/**
 * Summary shown after completing a round
 */
export interface RoundSummary {
  visible: boolean;
  timeMs: number;
  stabilityMs?: number;
  intensity?: number;
  actualProb?: number;
}

/**
 * Centralized game state
 */
export interface GameState {
  // Progress
  worldIndex: number;
  combo: number;
  mode: GameMode;
  practice: PracticeMode;

  // UI Modals
  showTutorial: boolean;
  showCalibration: boolean;
  showLevelComplete: boolean;
  showStickerBook: boolean;
  showWorldBanner: boolean;
  showConfidencePrompt: boolean;
  showSummary: RoundSummary | null;
  levelUpVisible: boolean;

  // Round State
  roundTimerMs: number;
  timerActive: boolean;
  difficulty: DifficultyState;
  usedHint: boolean;

  // Effects & Feedback
  effectParams: EffectParams;
  lastPerfect: boolean;
  hints: HintsState;

  // Settings
  themeId: ThemeId;
  cameraActive: boolean;

  // Performance
  fpsBuckets: Record<string, number>;
  confidenceValue: number;
}

// ============================================================================
// Actions
// ============================================================================

export type GameAction =
  // Progress actions
  | { type: 'SET_WORLD_INDEX'; payload: number }
  | { type: 'SET_COMBO'; payload: number }
  | { type: 'INCREMENT_COMBO' }
  | { type: 'RESET_COMBO' }
  | { type: 'SET_MODE'; payload: GameMode }
  | { type: 'SET_PRACTICE'; payload: PracticeMode }

  // UI Modal actions
  | { type: 'SHOW_TUTORIAL'; payload: boolean }
  | { type: 'SHOW_CALIBRATION'; payload: boolean }
  | { type: 'SHOW_LEVEL_COMPLETE'; payload: boolean }
  | { type: 'SHOW_STICKER_BOOK'; payload: boolean }
  | { type: 'SHOW_WORLD_BANNER'; payload: boolean }
  | { type: 'SHOW_CONFIDENCE_PROMPT'; payload: boolean }
  | { type: 'SHOW_SUMMARY'; payload: RoundSummary | null }
  | { type: 'SHOW_LEVEL_UP'; payload: boolean }

  // Round State actions
  | { type: 'SET_ROUND_TIMER'; payload: number }
  | { type: 'START_TIMER' }
  | { type: 'STOP_TIMER' }
  | { type: 'SET_DIFFICULTY'; payload: Partial<DifficultyState> }
  | { type: 'USE_HINT' }
  | { type: 'RESET_HINT_FLAG' }

  // Effects actions
  | { type: 'SET_EFFECT_PARAMS'; payload: Partial<EffectParams> }
  | { type: 'SET_LAST_PERFECT'; payload: boolean }
  | { type: 'RELOAD_HINTS'; payload: number }

  // Settings actions
  | { type: 'SET_THEME'; payload: ThemeId }
  | { type: 'SET_CAMERA_ACTIVE'; payload: boolean }

  // Performance actions
  | { type: 'UPDATE_FPS_BUCKETS'; payload: Record<string, number> }
  | { type: 'SET_CONFIDENCE_VALUE'; payload: number }

  // Compound actions (multiple state updates at once)
  | { type: 'START_NEW_ROUND' }
  | { type: 'COMPLETE_ROUND'; payload: { perfect: boolean; timeMs: number } }
  | { type: 'RESET_GAME' };

// ============================================================================
// Initial State Factory
// ============================================================================

/**
 * Creates initial game state from localStorage and defaults
 */
export function createInitialGameState(): GameState {
  const calibration = loadCalibration();
  const tutorialSeen = (() => {
    try {
      return localStorage.getItem('emotion.tutorialSeen') === '1';
    } catch {
      return false;
    }
  })();

  const storedWorldIndex = (() => {
    try {
      const stored = localStorage.getItem('emotion.worldIndex');
      return stored ? Number(stored) : 0;
    } catch {
      return 0;
    }
  })();

  const storedTheme = (() => {
    try {
      const stored = localStorage.getItem('emotion.themeId');
      return (stored as ThemeId) || 'regnbueland';
    } catch {
      return 'regnbueland';
    }
  })();

  const storedMode = (() => {
    try {
      const stored = localStorage.getItem('emotion.gameMode');
      return (stored as GameMode) || 'classic';
    } catch {
      return 'classic';
    }
  })();

  const storedPractice = (() => {
    try {
      const stored = localStorage.getItem('emotion.practice');
      const validModes: PracticeMode[] = ['mixed', 'neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised'];
      return validModes.includes(stored as PracticeMode) ? (stored as PracticeMode) : 'mixed';
    } catch {
      return 'mixed';
    }
  })();

  return {
    // Progress
    worldIndex: Math.max(0, storedWorldIndex),
    combo: 1,
    mode: storedMode,
    practice: storedPractice,

    // UI Modals
    showTutorial: !tutorialSeen,
    showCalibration: !calibration,
    showLevelComplete: false,
    showStickerBook: false,
    showWorldBanner: false,
    showConfidencePrompt: false,
    showSummary: null,
    levelUpVisible: false,

    // Round State
    roundTimerMs: 0,
    timerActive: false,
    difficulty: {
      threshold: calibration?.threshold ?? GAME_DIFFICULTY.DEFAULT_THRESHOLD,
      holdMs: calibration?.holdMs ?? GAME_DIFFICULTY.DEFAULT_HOLD_MS,
      streak: 0,
    },
    usedHint: false,

    // Effects & Feedback
    effectParams: {
      particleCount: EFFECT_CONFIG.DEFAULT_PARTICLE_COUNT,
      colorSaturation: EFFECT_CONFIG.DEFAULT_COLOR_SATURATION,
      glowStrength: EFFECT_CONFIG.DEFAULT_GLOW_STRENGTH,
      sfxGain: EFFECT_CONFIG.DEFAULT_SFX_GAIN,
    },
    lastPerfect: false,
    hints: loadHints(5),

    // Settings
    themeId: storedTheme,
    cameraActive: false,

    // Performance
    fpsBuckets: {},
    confidenceValue: 0.7,
  };
}

// ============================================================================
// Reducer
// ============================================================================

/**
 * Pure reducer function for game state transitions
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    // Progress actions
    case 'SET_WORLD_INDEX':
      return { ...state, worldIndex: action.payload };

    case 'SET_COMBO':
      return { ...state, combo: action.payload };

    case 'INCREMENT_COMBO':
      return { ...state, combo: state.combo + 1 };

    case 'RESET_COMBO':
      return { ...state, combo: 1 };

    case 'SET_MODE':
      return { ...state, mode: action.payload };

    case 'SET_PRACTICE':
      return { ...state, practice: action.payload };

    // UI Modal actions
    case 'SHOW_TUTORIAL':
      return { ...state, showTutorial: action.payload };

    case 'SHOW_CALIBRATION':
      return { ...state, showCalibration: action.payload };

    case 'SHOW_LEVEL_COMPLETE':
      return { ...state, showLevelComplete: action.payload };

    case 'SHOW_STICKER_BOOK':
      return { ...state, showStickerBook: action.payload };

    case 'SHOW_WORLD_BANNER':
      return { ...state, showWorldBanner: action.payload };

    case 'SHOW_CONFIDENCE_PROMPT':
      return { ...state, showConfidencePrompt: action.payload };

    case 'SHOW_SUMMARY':
      return { ...state, showSummary: action.payload };

    case 'SHOW_LEVEL_UP':
      return { ...state, levelUpVisible: action.payload };

    // Round State actions
    case 'SET_ROUND_TIMER':
      return { ...state, roundTimerMs: action.payload };

    case 'START_TIMER':
      return { ...state, timerActive: true };

    case 'STOP_TIMER':
      return { ...state, timerActive: false };

    case 'SET_DIFFICULTY':
      return {
        ...state,
        difficulty: { ...state.difficulty, ...action.payload },
      };

    case 'USE_HINT': {
      const updatedHints = consumeHint();
      return { ...state, usedHint: true, hints: updatedHints };
    }

    case 'RESET_HINT_FLAG':
      return { ...state, usedHint: false };

    // Effects actions
    case 'SET_EFFECT_PARAMS':
      return {
        ...state,
        effectParams: { ...state.effectParams, ...action.payload },
      };

    case 'SET_LAST_PERFECT':
      return { ...state, lastPerfect: action.payload };

    case 'RELOAD_HINTS':
      return { ...state, hints: loadHints(action.payload) };

    // Settings actions
    case 'SET_THEME':
      return { ...state, themeId: action.payload };

    case 'SET_CAMERA_ACTIVE':
      return { ...state, cameraActive: action.payload };

    // Performance actions
    case 'UPDATE_FPS_BUCKETS':
      return { ...state, fpsBuckets: action.payload };

    case 'SET_CONFIDENCE_VALUE':
      return { ...state, confidenceValue: action.payload };

    // Compound actions
    case 'START_NEW_ROUND':
      return {
        ...state,
        roundTimerMs: 0,
        timerActive: true,
        usedHint: false,
        showSummary: null,
        lastPerfect: false,
      };

    case 'COMPLETE_ROUND':
      return {
        ...state,
        timerActive: false,
        lastPerfect: action.payload.perfect,
        combo: action.payload.perfect ? state.combo + 1 : 1,
        showSummary: {
          visible: true,
          timeMs: action.payload.timeMs,
        },
      };

    case 'RESET_GAME':
      return createInitialGameState();

    default:
      return state;
  }
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Main hook that provides game state and dispatch function
 *
 * @example
 * ```typescript
 * const { state, dispatch } = useGameState();
 *
 * // Update combo
 * dispatch({ type: 'INCREMENT_COMBO' });
 *
 * // Show modal
 * dispatch({ type: 'SHOW_LEVEL_COMPLETE', payload: true });
 *
 * // Complete round
 * dispatch({ type: 'COMPLETE_ROUND', payload: { perfect: true, timeMs: 5000 } });
 * ```
 */
export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialGameState);

  // Helper functions for common operations
  const incrementCombo = useCallback(() => {
    dispatch({ type: 'INCREMENT_COMBO' });
  }, []);

  const resetCombo = useCallback(() => {
    dispatch({ type: 'RESET_COMBO' });
  }, []);

  const useHint = useCallback(() => {
    dispatch({ type: 'USE_HINT' });
  }, []);

  const startNewRound = useCallback(() => {
    dispatch({ type: 'START_NEW_ROUND' });
  }, []);

  const completeRound = useCallback((perfect: boolean, timeMs: number) => {
    dispatch({ type: 'COMPLETE_ROUND', payload: { perfect, timeMs } });
  }, []);

  return {
    state,
    dispatch,
    // Helper functions for common operations
    incrementCombo,
    resetCombo,
    useHint,
    startNewRound,
    completeRound,
  };
}
