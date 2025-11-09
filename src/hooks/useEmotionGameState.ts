/**
 * Emotion Game State Machine
 *
 * WHY: EmotionGame.tsx has 26 useState calls with interdependent state:
 *   - Round state (hints, combo, timer, difficulty)
 *   - UI modals (tutorial, calibration, level complete, etc.)
 *   - Camera/detector state
 *
 * SOLUTION: Consolidate into a single reducer with explicit state transitions
 *
 * BENEFIT:
 *   - Impossible states become impossible
 *   - State transitions are explicit and testable
 *   - Easier to debug and reason about
 *   - Single source of truth
 *
 * NOTE: Works alongside useGameLoop (which handles phase/round/xp).
 *   This hook focuses on round-level state and UI modals.
 */

import { useReducer, useCallback } from 'react';
import type { HintsState } from '@/lib/game/hints';
import { loadHints, useHint as consumeHintFromLibrary } from '@/lib/game/hints';
import { loadCalibration } from '@/hooks/useCalibration';
import { GAME_DIFFICULTY } from '@/config/gameConfig';

// ============================================================================
// STATE DEFINITION
// ============================================================================

/**
 * Difficulty adaptation state
 */
export interface DifficultyState {
  /** Detection threshold (0-1) */
  threshold: number;
  /** Required hold duration in milliseconds */
  holdMs: number;
  /** Current streak for difficulty adaptation */
  streak: number;
}

/**
 * Round-level game state
 */
export interface RoundState {
  /** Current combo multiplier */
  combo: number;
  /** Whether hint was used this round */
  usedHint: boolean;
  /** Round timer in milliseconds */
  roundTimerMs: number;
  /** Whether timer is actively counting down */
  timerActive: boolean;
  /** Hints remaining and state */
  hints: HintsState;
  /** Adaptive difficulty settings */
  difficulty: DifficultyState;
}

/**
 * UI Modal visibility state
 */
export interface ModalState {
  /** Show tutorial overlay */
  showTutorial: boolean;
  /** Show calibration overlay */
  showCalibration: boolean;
  /** Show level complete modal */
  showLevelComplete: boolean;
  /** Show sticker book modal */
  showStickerBook: boolean;
  /** Show world banner animation */
  showWorldBanner: boolean;
  /** Show confidence prompt */
  showConfidencePrompt: boolean;
  /** Show round summary card */
  showSummary: boolean;
}

/**
 * Camera and detector state
 */
export interface DetectorState {
  /** Whether camera is active */
  cameraActive: boolean;
  /** FPS performance buckets for telemetry */
  fpsBuckets: Record<string, number>;
}

/**
 * Complete game state
 */
export interface EmotionGameState {
  round: RoundState;
  modals: ModalState;
  detector: DetectorState;
}

// ============================================================================
// ACTIONS
// ============================================================================

export type GameStateAction =
  // Round management
  | { type: 'START_ROUND'; roundTimerMs: number }
  | { type: 'END_ROUND' }
  | { type: 'SUCCESS'; incrementCombo: boolean }
  | { type: 'FAIL' }

  // Timer management
  | { type: 'START_TIMER' }
  | { type: 'STOP_TIMER' }
  | { type: 'TICK_TIMER'; deltaMs: number }
  | { type: 'SET_TIMER'; ms: number }

  // Hints
  | { type: 'USE_HINT' }
  | { type: 'RESET_HINT_FLAG' }

  // Difficulty
  | { type: 'UPDATE_DIFFICULTY'; threshold?: number; holdMs?: number }
  | { type: 'INCREMENT_DIFFICULTY_STREAK' }
  | { type: 'RESET_DIFFICULTY_STREAK' }

  // Modals
  | { type: 'SHOW_MODAL'; modal: keyof ModalState }
  | { type: 'HIDE_MODAL'; modal: keyof ModalState }
  | { type: 'TOGGLE_MODAL'; modal: keyof ModalState }

  // Camera/Detector
  | { type: 'SET_CAMERA'; active: boolean }
  | { type: 'UPDATE_FPS_BUCKETS'; buckets: Record<string, number> }

  // Combo
  | { type: 'RESET_COMBO' }
  | { type: 'SET_COMBO'; value: number };

// ============================================================================
// INITIAL STATE
// ============================================================================

function createInitialDifficulty(): DifficultyState {
  const calibration = loadCalibration();
  return {
    threshold: calibration?.threshold ?? GAME_DIFFICULTY.DEFAULT_THRESHOLD,
    holdMs: calibration?.holdMs ?? GAME_DIFFICULTY.DEFAULT_HOLD_MS,
    streak: 0,
  };
}

function createInitialModalState(): ModalState {
  // Check if tutorial has been seen
  let tutorialSeen = false;
  try {
    tutorialSeen = localStorage.getItem('emotion.tutorialSeen') === '1';
  } catch {
    /* noop */
  }

  // Check if calibration exists
  const hasCalibration = !!loadCalibration();

  return {
    showTutorial: !tutorialSeen,
    showCalibration: !hasCalibration,
    showLevelComplete: false,
    showStickerBook: false,
    showWorldBanner: false,
    showConfidencePrompt: false,
    showSummary: false,
  };
}

const initialState: EmotionGameState = {
  round: {
    combo: 1,
    usedHint: false,
    roundTimerMs: 0,
    timerActive: false,
    hints: loadHints(5),
    difficulty: createInitialDifficulty(),
  },
  modals: createInitialModalState(),
  detector: {
    cameraActive: false,
    fpsBuckets: {},
  },
};

// ============================================================================
// REDUCER
// ============================================================================

function gameStateReducer(state: EmotionGameState, action: GameStateAction): EmotionGameState {
  switch (action.type) {
    // Round management
    case 'START_ROUND':
      return {
        ...state,
        round: {
          ...state.round,
          usedHint: false,
          roundTimerMs: action.roundTimerMs,
          timerActive: true,
        },
      };

    case 'END_ROUND':
      return {
        ...state,
        round: {
          ...state.round,
          timerActive: false,
          roundTimerMs: 0,
        },
      };

    case 'SUCCESS':
      return {
        ...state,
        round: {
          ...state.round,
          combo: action.incrementCombo ? Math.min(10, state.round.combo + 1) : state.round.combo,
          timerActive: false,
        },
      };

    case 'FAIL':
      return {
        ...state,
        round: {
          ...state.round,
          combo: 1, // Reset combo on failure
          timerActive: false,
        },
      };

    // Timer management
    case 'START_TIMER':
      return {
        ...state,
        round: {
          ...state.round,
          timerActive: true,
        },
      };

    case 'STOP_TIMER':
      return {
        ...state,
        round: {
          ...state.round,
          timerActive: false,
        },
      };

    case 'TICK_TIMER':
      return {
        ...state,
        round: {
          ...state.round,
          roundTimerMs: Math.max(0, state.round.roundTimerMs - action.deltaMs),
        },
      };

    case 'SET_TIMER':
      return {
        ...state,
        round: {
          ...state.round,
          roundTimerMs: action.ms,
        },
      };

    // Hints
    case 'USE_HINT': {
      const updatedHints = consumeHintFromLibrary();
      return {
        ...state,
        round: {
          ...state.round,
          usedHint: true,
          hints: updatedHints,
        },
      };
    }

    case 'RESET_HINT_FLAG':
      return {
        ...state,
        round: {
          ...state.round,
          usedHint: false,
        },
      };

    // Difficulty
    case 'UPDATE_DIFFICULTY':
      return {
        ...state,
        round: {
          ...state.round,
          difficulty: {
            ...state.round.difficulty,
            ...(action.threshold !== undefined && { threshold: action.threshold }),
            ...(action.holdMs !== undefined && { holdMs: action.holdMs }),
          },
        },
      };

    case 'INCREMENT_DIFFICULTY_STREAK':
      return {
        ...state,
        round: {
          ...state.round,
          difficulty: {
            ...state.round.difficulty,
            streak: state.round.difficulty.streak + 1,
          },
        },
      };

    case 'RESET_DIFFICULTY_STREAK':
      return {
        ...state,
        round: {
          ...state.round,
          difficulty: {
            ...state.round.difficulty,
            streak: 0,
          },
        },
      };

    // Modals
    case 'SHOW_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.modal]: true,
        },
      };

    case 'HIDE_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.modal]: false,
        },
      };

    case 'TOGGLE_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.modal]: !state.modals[action.modal],
        },
      };

    // Camera/Detector
    case 'SET_CAMERA':
      return {
        ...state,
        detector: {
          ...state.detector,
          cameraActive: action.active,
        },
      };

    case 'UPDATE_FPS_BUCKETS':
      return {
        ...state,
        detector: {
          ...state.detector,
          fpsBuckets: action.buckets,
        },
      };

    // Combo
    case 'RESET_COMBO':
      return {
        ...state,
        round: {
          ...state.round,
          combo: 1,
        },
      };

    case 'SET_COMBO':
      return {
        ...state,
        round: {
          ...state.round,
          combo: Math.max(1, Math.min(10, action.value)),
        },
      };

    default:
      return state;
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useEmotionGameState() {
  const [state, dispatch] = useReducer(gameStateReducer, initialState);

  // ======================================
  // Derived state (computed, not stored)
  // ======================================

  const canUseHint = !state.round.usedHint && state.round.hints.remaining > 0;

  // ======================================
  // Action creators (for convenience)
  // ======================================

  const startRound = useCallback((roundTimerMs: number) => {
    dispatch({ type: 'START_ROUND', roundTimerMs });
  }, []);

  const endRound = useCallback(() => {
    dispatch({ type: 'END_ROUND' });
  }, []);

  const registerSuccess = useCallback((incrementCombo = true) => {
    dispatch({ type: 'SUCCESS', incrementCombo });
  }, []);

  const registerFail = useCallback(() => {
    dispatch({ type: 'FAIL' });
  }, []);

  const startTimer = useCallback(() => {
    dispatch({ type: 'START_TIMER' });
  }, []);

  const stopTimer = useCallback(() => {
    dispatch({ type: 'STOP_TIMER' });
  }, []);

  const tickTimer = useCallback((deltaMs: number) => {
    dispatch({ type: 'TICK_TIMER', deltaMs });
  }, []);

  const setTimer = useCallback((ms: number) => {
    dispatch({ type: 'SET_TIMER', ms });
  }, []);

  const useHint = useCallback(() => {
    dispatch({ type: 'USE_HINT' });
  }, []);

  const resetHintFlag = useCallback(() => {
    dispatch({ type: 'RESET_HINT_FLAG' });
  }, []);

  const updateDifficulty = useCallback((threshold?: number, holdMs?: number) => {
    dispatch({ type: 'UPDATE_DIFFICULTY', threshold, holdMs });
  }, []);

  const incrementDifficultyStreak = useCallback(() => {
    dispatch({ type: 'INCREMENT_DIFFICULTY_STREAK' });
  }, []);

  const resetDifficultyStreak = useCallback(() => {
    dispatch({ type: 'RESET_DIFFICULTY_STREAK' });
  }, []);

  const showModal = useCallback((modal: keyof ModalState) => {
    dispatch({ type: 'SHOW_MODAL', modal });
  }, []);

  const hideModal = useCallback((modal: keyof ModalState) => {
    dispatch({ type: 'HIDE_MODAL', modal });
  }, []);

  const toggleModal = useCallback((modal: keyof ModalState) => {
    dispatch({ type: 'TOGGLE_MODAL', modal });
  }, []);

  const setCamera = useCallback((active: boolean) => {
    dispatch({ type: 'SET_CAMERA', active });
  }, []);

  const updateFpsBuckets = useCallback((buckets: Record<string, number>) => {
    dispatch({ type: 'UPDATE_FPS_BUCKETS', buckets });
  }, []);

  const resetCombo = useCallback(() => {
    dispatch({ type: 'RESET_COMBO' });
  }, []);

  const setCombo = useCallback((value: number) => {
    dispatch({ type: 'SET_COMBO', value });
  }, []);

  return {
    // State
    state,
    dispatch,

    // Derived state
    canUseHint,

    // Action creators
    startRound,
    endRound,
    registerSuccess,
    registerFail,
    startTimer,
    stopTimer,
    tickTimer,
    setTimer,
    useHint,
    resetHintFlag,
    updateDifficulty,
    incrementDifficultyStreak,
    resetDifficultyStreak,
    showModal,
    hideModal,
    toggleModal,
    setCamera,
    updateFpsBuckets,
    resetCombo,
    setCombo,
  };
}
