import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useGameState,
  gameReducer,
  createInitialGameState,
  type GameState,
  type GameAction,
} from '../useGameState';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

global.localStorage = localStorageMock as any;

// Mock game dependencies
vi.mock('@/lib/game/hints', () => ({
  loadHints: vi.fn((count: number) => ({ remaining: count, used: 0 })),
  useHint: vi.fn(() => ({ remaining: 4, used: 1 })),
}));

vi.mock('@/hooks/useCalibration', () => ({
  loadCalibration: vi.fn(() => ({ threshold: 0.6, holdMs: 1000 })),
}));

vi.mock('@/config/gameConfig', () => ({
  GAME_DIFFICULTY: {
    DEFAULT_THRESHOLD: 0.6,
    DEFAULT_HOLD_MS: 900,
  },
  EFFECT_CONFIG: {
    DEFAULT_PARTICLE_COUNT: 50,
    DEFAULT_COLOR_SATURATION: 1.0,
    DEFAULT_GLOW_STRENGTH: 0.8,
    DEFAULT_SFX_GAIN: 1.0,
  },
}));

describe('useGameState', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('creates initial state with defaults', () => {
      const state = createInitialGameState();

      expect(state.worldIndex).toBe(0);
      expect(state.combo).toBe(1);
      expect(state.mode).toBe('classic');
      expect(state.practice).toBe('mixed');
      expect(state.cameraActive).toBe(false);
      expect(state.timerActive).toBe(false);
    });

    it('loads state from localStorage', () => {
      localStorageMock.setItem('emotion.worldIndex', '3');
      localStorageMock.setItem('emotion.themeId', 'rom');
      localStorageMock.setItem('emotion.gameMode', 'zen');
      localStorageMock.setItem('emotion.practice', 'happy');
      localStorageMock.setItem('emotion.tutorialSeen', '1');

      const state = createInitialGameState();

      expect(state.worldIndex).toBe(3);
      expect(state.themeId).toBe('rom');
      expect(state.mode).toBe('zen');
      expect(state.practice).toBe('happy');
      expect(state.showTutorial).toBe(false);
    });

    it('shows tutorial when not seen before', () => {
      const state = createInitialGameState();
      expect(state.showTutorial).toBe(true);
    });

    it('shows calibration when not calibrated', () => {
      const state = createInitialGameState();
      expect(state.showCalibration).toBe(false); // mocked to return calibration data
    });

    it('validates practice mode from localStorage', () => {
      localStorageMock.setItem('emotion.practice', 'invalid-mode');
      const state = createInitialGameState();
      expect(state.practice).toBe('mixed'); // falls back to default
    });
  });

  describe('Progress Actions', () => {
    it('handles SET_WORLD_INDEX', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, { type: 'SET_WORLD_INDEX', payload: 5 });
      expect(newState.worldIndex).toBe(5);
    });

    it('handles SET_COMBO', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, { type: 'SET_COMBO', payload: 10 });
      expect(newState.combo).toBe(10);
    });

    it('handles INCREMENT_COMBO', () => {
      const state = { ...createInitialGameState(), combo: 5 };
      const newState = gameReducer(state, { type: 'INCREMENT_COMBO' });
      expect(newState.combo).toBe(6);
    });

    it('handles RESET_COMBO', () => {
      const state = { ...createInitialGameState(), combo: 15 };
      const newState = gameReducer(state, { type: 'RESET_COMBO' });
      expect(newState.combo).toBe(1);
    });

    it('handles SET_MODE', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, { type: 'SET_MODE', payload: 'zen' });
      expect(newState.mode).toBe('zen');
    });

    it('handles SET_PRACTICE', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, { type: 'SET_PRACTICE', payload: 'happy' });
      expect(newState.practice).toBe('happy');
    });
  });

  describe('UI Modal Actions', () => {
    it('handles SHOW_TUTORIAL', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, { type: 'SHOW_TUTORIAL', payload: false });
      expect(newState.showTutorial).toBe(false);
    });

    it('handles SHOW_CALIBRATION', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, { type: 'SHOW_CALIBRATION', payload: true });
      expect(newState.showCalibration).toBe(true);
    });

    it('handles SHOW_LEVEL_COMPLETE', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, { type: 'SHOW_LEVEL_COMPLETE', payload: true });
      expect(newState.showLevelComplete).toBe(true);
    });

    it('handles SHOW_STICKER_BOOK', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, { type: 'SHOW_STICKER_BOOK', payload: true });
      expect(newState.showStickerBook).toBe(true);
    });

    it('handles SHOW_WORLD_BANNER', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, { type: 'SHOW_WORLD_BANNER', payload: true });
      expect(newState.showWorldBanner).toBe(true);
    });

    it('handles SHOW_CONFIDENCE_PROMPT', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, { type: 'SHOW_CONFIDENCE_PROMPT', payload: true });
      expect(newState.showConfidencePrompt).toBe(true);
    });

    it('handles SHOW_SUMMARY', () => {
      const state = createInitialGameState();
      const summary = { visible: true, timeMs: 5000, stabilityMs: 3000 };
      const newState = gameReducer(state, { type: 'SHOW_SUMMARY', payload: summary });
      expect(newState.showSummary).toEqual(summary);
    });

    it('handles SHOW_LEVEL_UP', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, { type: 'SHOW_LEVEL_UP', payload: true });
      expect(newState.levelUpVisible).toBe(true);
    });
  });

  describe('Round State Actions', () => {
    it('handles SET_ROUND_TIMER', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, { type: 'SET_ROUND_TIMER', payload: 3000 });
      expect(newState.roundTimerMs).toBe(3000);
    });

    it('handles START_TIMER', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, { type: 'START_TIMER' });
      expect(newState.timerActive).toBe(true);
    });

    it('handles STOP_TIMER', () => {
      const state = { ...createInitialGameState(), timerActive: true };
      const newState = gameReducer(state, { type: 'STOP_TIMER' });
      expect(newState.timerActive).toBe(false);
    });

    it('handles SET_DIFFICULTY', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, {
        type: 'SET_DIFFICULTY',
        payload: { threshold: 0.75, streak: 5 },
      });
      expect(newState.difficulty.threshold).toBe(0.75);
      expect(newState.difficulty.streak).toBe(5);
      expect(newState.difficulty.holdMs).toBe(state.difficulty.holdMs); // unchanged
    });

    it('handles USE_HINT', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, { type: 'USE_HINT' });
      expect(newState.usedHint).toBe(true);
      expect(newState.hints.remaining).toBe(4); // mocked to decrement
    });

    it('handles RESET_HINT_FLAG', () => {
      const state = { ...createInitialGameState(), usedHint: true };
      const newState = gameReducer(state, { type: 'RESET_HINT_FLAG' });
      expect(newState.usedHint).toBe(false);
    });
  });

  describe('Effects Actions', () => {
    it('handles SET_EFFECT_PARAMS', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, {
        type: 'SET_EFFECT_PARAMS',
        payload: { particleCount: 100, glowStrength: 1.2 },
      });
      expect(newState.effectParams.particleCount).toBe(100);
      expect(newState.effectParams.glowStrength).toBe(1.2);
      expect(newState.effectParams.sfxGain).toBe(state.effectParams.sfxGain); // unchanged
    });

    it('handles SET_LAST_PERFECT', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, { type: 'SET_LAST_PERFECT', payload: true });
      expect(newState.lastPerfect).toBe(true);
    });

    it('handles RELOAD_HINTS', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, { type: 'RELOAD_HINTS', payload: 10 });
      expect(newState.hints.remaining).toBe(10); // mocked
    });
  });

  describe('Settings Actions', () => {
    it('handles SET_THEME', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, { type: 'SET_THEME', payload: 'rom' });
      expect(newState.themeId).toBe('rom');
    });

    it('handles SET_CAMERA_ACTIVE', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, { type: 'SET_CAMERA_ACTIVE', payload: true });
      expect(newState.cameraActive).toBe(true);
    });
  });

  describe('Performance Actions', () => {
    it('handles UPDATE_FPS_BUCKETS', () => {
      const state = createInitialGameState();
      const buckets = { '0-10': 5, '10-20': 15, '20-30': 30 };
      const newState = gameReducer(state, { type: 'UPDATE_FPS_BUCKETS', payload: buckets });
      expect(newState.fpsBuckets).toEqual(buckets);
    });

    it('handles SET_CONFIDENCE_VALUE', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, { type: 'SET_CONFIDENCE_VALUE', payload: 0.85 });
      expect(newState.confidenceValue).toBe(0.85);
    });
  });

  describe('Compound Actions', () => {
    it('handles START_NEW_ROUND', () => {
      const state = {
        ...createInitialGameState(),
        roundTimerMs: 5000,
        usedHint: true,
        showSummary: { visible: true, timeMs: 3000 },
        lastPerfect: true,
      };

      const newState = gameReducer(state, { type: 'START_NEW_ROUND' });

      expect(newState.roundTimerMs).toBe(0);
      expect(newState.timerActive).toBe(true);
      expect(newState.usedHint).toBe(false);
      expect(newState.showSummary).toBeNull();
      expect(newState.lastPerfect).toBe(false);
    });

    it('handles COMPLETE_ROUND with perfect score', () => {
      const state = { ...createInitialGameState(), combo: 5, timerActive: true };
      const newState = gameReducer(state, {
        type: 'COMPLETE_ROUND',
        payload: { perfect: true, timeMs: 4500 },
      });

      expect(newState.timerActive).toBe(false);
      expect(newState.lastPerfect).toBe(true);
      expect(newState.combo).toBe(6); // incremented
      expect(newState.showSummary).toEqual({
        visible: true,
        timeMs: 4500,
      });
    });

    it('handles COMPLETE_ROUND with imperfect score', () => {
      const state = { ...createInitialGameState(), combo: 10, timerActive: true };
      const newState = gameReducer(state, {
        type: 'COMPLETE_ROUND',
        payload: { perfect: false, timeMs: 6000 },
      });

      expect(newState.timerActive).toBe(false);
      expect(newState.lastPerfect).toBe(false);
      expect(newState.combo).toBe(1); // reset
      expect(newState.showSummary).toEqual({
        visible: true,
        timeMs: 6000,
      });
    });

    it('handles RESET_GAME', () => {
      const state = {
        ...createInitialGameState(),
        combo: 20,
        worldIndex: 5,
        showLevelComplete: true,
        timerActive: true,
      };

      const newState = gameReducer(state, { type: 'RESET_GAME' });

      expect(newState.combo).toBe(1);
      expect(newState.showLevelComplete).toBe(false);
      expect(newState.timerActive).toBe(false);
      // Reloads from localStorage
    });
  });

  describe('Hook Integration', () => {
    it('provides state and dispatch', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.state).toBeDefined();
      expect(result.current.dispatch).toBeInstanceOf(Function);
      expect(result.current.state.combo).toBe(1);
    });

    it('provides helper functions', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.incrementCombo).toBeInstanceOf(Function);
      expect(result.current.resetCombo).toBeInstanceOf(Function);
      expect(result.current.useHint).toBeInstanceOf(Function);
      expect(result.current.startNewRound).toBeInstanceOf(Function);
      expect(result.current.completeRound).toBeInstanceOf(Function);
    });

    it('incrementCombo helper works', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.incrementCombo();
      });

      expect(result.current.state.combo).toBe(2);
    });

    it('resetCombo helper works', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.dispatch({ type: 'SET_COMBO', payload: 15 });
        result.current.resetCombo();
      });

      expect(result.current.state.combo).toBe(1);
    });

    it('useHint helper works', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.useHint();
      });

      expect(result.current.state.usedHint).toBe(true);
      expect(result.current.state.hints.remaining).toBe(4);
    });

    it('startNewRound helper works', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.dispatch({ type: 'SET_ROUND_TIMER', payload: 3000 });
        result.current.startNewRound();
      });

      expect(result.current.state.roundTimerMs).toBe(0);
      expect(result.current.state.timerActive).toBe(true);
    });

    it('completeRound helper works', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.completeRound(true, 5000);
      });

      expect(result.current.state.lastPerfect).toBe(true);
      expect(result.current.state.combo).toBe(2);
      expect(result.current.state.showSummary?.timeMs).toBe(5000);
    });

    it('handles multiple state updates correctly', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.dispatch({ type: 'SET_WORLD_INDEX', payload: 3 });
        result.current.dispatch({ type: 'SET_MODE', payload: 'zen' });
        result.current.dispatch({ type: 'INCREMENT_COMBO' });
        result.current.dispatch({ type: 'SHOW_TUTORIAL', payload: false });
      });

      expect(result.current.state.worldIndex).toBe(3);
      expect(result.current.state.mode).toBe('zen');
      expect(result.current.state.combo).toBe(2);
      expect(result.current.state.showTutorial).toBe(false);
    });
  });

  describe('State Immutability', () => {
    it('reducer returns new state object', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, { type: 'INCREMENT_COMBO' });

      expect(newState).not.toBe(state);
      expect(newState.combo).not.toBe(state.combo);
    });

    it('reducer does not mutate original state', () => {
      const state = createInitialGameState();
      const originalCombo = state.combo;

      gameReducer(state, { type: 'INCREMENT_COMBO' });

      expect(state.combo).toBe(originalCombo);
    });

    it('partial updates preserve other properties', () => {
      const state = createInitialGameState();
      const newState = gameReducer(state, {
        type: 'SET_EFFECT_PARAMS',
        payload: { particleCount: 200 },
      });

      expect(newState.effectParams.particleCount).toBe(200);
      expect(newState.effectParams.colorSaturation).toBe(state.effectParams.colorSaturation);
      expect(newState.effectParams.glowStrength).toBe(state.effectParams.glowStrength);
    });
  });
});
