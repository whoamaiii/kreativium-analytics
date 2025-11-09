/**
 * Tests for useEmotionGameState hook
 *
 * Ensures all state transitions work correctly and state remains consistent
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEmotionGameState } from '../useEmotionGameState';

// Mock the external dependencies
vi.mock('@/lib/game/hints', () => ({
  loadHints: vi.fn(() => ({
    remaining: 5,
    used: 0,
    history: [],
  })),
  useHint: vi.fn(() => ({
    remaining: 4,
    used: 1,
    history: [{ timestamp: Date.now(), roundIndex: 0 }],
  })),
}));

vi.mock('@/hooks/useCalibration', () => ({
  loadCalibration: vi.fn(() => ({
    threshold: 0.65,
    holdMs: 1200,
  })),
}));

vi.mock('@/config/gameConfig', () => ({
  GAME_DIFFICULTY: {
    DEFAULT_THRESHOLD: 0.6,
    DEFAULT_HOLD_MS: 1000,
  },
}));

describe('useEmotionGameState', () => {
  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useEmotionGameState());

      expect(result.current.state.round.combo).toBe(1);
      expect(result.current.state.round.usedHint).toBe(false);
      expect(result.current.state.round.timerActive).toBe(false);
      expect(result.current.state.round.roundTimerMs).toBe(0);
      expect(result.current.state.round.hints.remaining).toBe(5);
      expect(result.current.state.detector.cameraActive).toBe(false);
    });

    it('should load calibration values for difficulty', () => {
      const { result } = renderHook(() => useEmotionGameState());

      expect(result.current.state.round.difficulty.threshold).toBe(0.65);
      expect(result.current.state.round.difficulty.holdMs).toBe(1200);
      expect(result.current.state.round.difficulty.streak).toBe(0);
    });
  });

  describe('Round Management', () => {
    it('should start round with timer', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.startRound(5000);
      });

      expect(result.current.state.round.timerActive).toBe(true);
      expect(result.current.state.round.roundTimerMs).toBe(5000);
      expect(result.current.state.round.usedHint).toBe(false);
    });

    it('should end round and stop timer', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.startRound(5000);
      });

      act(() => {
        result.current.endRound();
      });

      expect(result.current.state.round.timerActive).toBe(false);
      expect(result.current.state.round.roundTimerMs).toBe(0);
    });

    it('should handle success and increment combo', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.registerSuccess(true);
      });

      expect(result.current.state.round.combo).toBe(2);
      expect(result.current.state.round.timerActive).toBe(false);
    });

    it('should handle success without incrementing combo', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.registerSuccess(false);
      });

      expect(result.current.state.round.combo).toBe(1);
    });

    it('should cap combo at 10', () => {
      const { result } = renderHook(() => useEmotionGameState());

      // Increment combo to max
      for (let i = 0; i < 12; i++) {
        act(() => {
          result.current.registerSuccess(true);
        });
      }

      expect(result.current.state.round.combo).toBe(10);
    });

    it('should handle failure and reset combo', () => {
      const { result } = renderHook(() => useEmotionGameState());

      // Build up combo
      act(() => {
        result.current.registerSuccess(true);
        result.current.registerSuccess(true);
      });

      expect(result.current.state.round.combo).toBe(3);

      // Fail
      act(() => {
        result.current.registerFail();
      });

      expect(result.current.state.round.combo).toBe(1);
      expect(result.current.state.round.timerActive).toBe(false);
    });
  });

  describe('Timer Management', () => {
    it('should start and stop timer', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.startTimer();
      });

      expect(result.current.state.round.timerActive).toBe(true);

      act(() => {
        result.current.stopTimer();
      });

      expect(result.current.state.round.timerActive).toBe(false);
    });

    it('should tick timer down', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.setTimer(5000);
      });

      act(() => {
        result.current.tickTimer(1000);
      });

      expect(result.current.state.round.roundTimerMs).toBe(4000);

      act(() => {
        result.current.tickTimer(500);
      });

      expect(result.current.state.round.roundTimerMs).toBe(3500);
    });

    it('should not go below zero when ticking', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.setTimer(500);
      });

      act(() => {
        result.current.tickTimer(1000);
      });

      expect(result.current.state.round.roundTimerMs).toBe(0);
    });

    it('should set timer directly', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.setTimer(3000);
      });

      expect(result.current.state.round.roundTimerMs).toBe(3000);
    });
  });

  describe('Hint Management', () => {
    it('should indicate hints are available initially', () => {
      const { result } = renderHook(() => useEmotionGameState());

      expect(result.current.canUseHint).toBe(true);
    });

    it('should use hint and update state', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.useHint();
      });

      expect(result.current.state.round.usedHint).toBe(true);
      expect(result.current.state.round.hints.remaining).toBe(4);
      expect(result.current.canUseHint).toBe(false);
    });

    it('should reset hint flag', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.useHint();
      });

      expect(result.current.state.round.usedHint).toBe(true);

      act(() => {
        result.current.resetHintFlag();
      });

      expect(result.current.state.round.usedHint).toBe(false);
    });
  });

  describe('Difficulty Management', () => {
    it('should update difficulty threshold', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.updateDifficulty(0.75, undefined);
      });

      expect(result.current.state.round.difficulty.threshold).toBe(0.75);
      expect(result.current.state.round.difficulty.holdMs).toBe(1200); // unchanged
    });

    it('should update difficulty hold time', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.updateDifficulty(undefined, 1500);
      });

      expect(result.current.state.round.difficulty.threshold).toBe(0.65); // unchanged
      expect(result.current.state.round.difficulty.holdMs).toBe(1500);
    });

    it('should update both difficulty parameters', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.updateDifficulty(0.8, 2000);
      });

      expect(result.current.state.round.difficulty.threshold).toBe(0.8);
      expect(result.current.state.round.difficulty.holdMs).toBe(2000);
    });

    it('should increment difficulty streak', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.incrementDifficultyStreak();
      });

      expect(result.current.state.round.difficulty.streak).toBe(1);

      act(() => {
        result.current.incrementDifficultyStreak();
      });

      expect(result.current.state.round.difficulty.streak).toBe(2);
    });

    it('should reset difficulty streak', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.incrementDifficultyStreak();
        result.current.incrementDifficultyStreak();
      });

      expect(result.current.state.round.difficulty.streak).toBe(2);

      act(() => {
        result.current.resetDifficultyStreak();
      });

      expect(result.current.state.round.difficulty.streak).toBe(0);
    });
  });

  describe('Modal Management', () => {
    it('should show modal', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.showModal('showTutorial');
      });

      expect(result.current.state.modals.showTutorial).toBe(true);
    });

    it('should hide modal', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.showModal('showTutorial');
      });

      act(() => {
        result.current.hideModal('showTutorial');
      });

      expect(result.current.state.modals.showTutorial).toBe(false);
    });

    it('should toggle modal', () => {
      const { result } = renderHook(() => useEmotionGameState());

      const initialState = result.current.state.modals.showStickerBook;

      act(() => {
        result.current.toggleModal('showStickerBook');
      });

      expect(result.current.state.modals.showStickerBook).toBe(!initialState);

      act(() => {
        result.current.toggleModal('showStickerBook');
      });

      expect(result.current.state.modals.showStickerBook).toBe(initialState);
    });

    it('should manage multiple modals independently', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.showModal('showTutorial');
        result.current.showModal('showCalibration');
      });

      expect(result.current.state.modals.showTutorial).toBe(true);
      expect(result.current.state.modals.showCalibration).toBe(true);

      act(() => {
        result.current.hideModal('showTutorial');
      });

      expect(result.current.state.modals.showTutorial).toBe(false);
      expect(result.current.state.modals.showCalibration).toBe(true);
    });
  });

  describe('Camera/Detector Management', () => {
    it('should set camera active', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.setCamera(true);
      });

      expect(result.current.state.detector.cameraActive).toBe(true);
    });

    it('should set camera inactive', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.setCamera(true);
      });

      act(() => {
        result.current.setCamera(false);
      });

      expect(result.current.state.detector.cameraActive).toBe(false);
    });

    it('should update FPS buckets', () => {
      const { result } = renderHook(() => useEmotionGameState());

      const buckets = {
        '0-10': 5,
        '10-20': 10,
        '20-30': 20,
      };

      act(() => {
        result.current.updateFpsBuckets(buckets);
      });

      expect(result.current.state.detector.fpsBuckets).toEqual(buckets);
    });
  });

  describe('Combo Management', () => {
    it('should reset combo to 1', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.setCombo(5);
      });

      expect(result.current.state.round.combo).toBe(5);

      act(() => {
        result.current.resetCombo();
      });

      expect(result.current.state.round.combo).toBe(1);
    });

    it('should set combo value', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.setCombo(7);
      });

      expect(result.current.state.round.combo).toBe(7);
    });

    it('should clamp combo between 1 and 10', () => {
      const { result } = renderHook(() => useEmotionGameState());

      act(() => {
        result.current.setCombo(15);
      });

      expect(result.current.state.round.combo).toBe(10);

      act(() => {
        result.current.setCombo(0);
      });

      expect(result.current.state.round.combo).toBe(1);

      act(() => {
        result.current.setCombo(-5);
      });

      expect(result.current.state.round.combo).toBe(1);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complete round lifecycle', () => {
      const { result } = renderHook(() => useEmotionGameState());

      // Start round
      act(() => {
        result.current.startRound(5000);
        result.current.setCamera(true);
      });

      expect(result.current.state.round.timerActive).toBe(true);
      expect(result.current.state.round.roundTimerMs).toBe(5000);
      expect(result.current.state.detector.cameraActive).toBe(true);

      // Use hint
      act(() => {
        result.current.useHint();
      });

      expect(result.current.state.round.usedHint).toBe(true);
      expect(result.current.canUseHint).toBe(false);

      // Timer tick
      act(() => {
        result.current.tickTimer(1000);
      });

      expect(result.current.state.round.roundTimerMs).toBe(4000);

      // Success
      act(() => {
        result.current.registerSuccess(true);
      });

      expect(result.current.state.round.combo).toBe(2);
      expect(result.current.state.round.timerActive).toBe(false);

      // End round
      act(() => {
        result.current.endRound();
      });

      expect(result.current.state.round.roundTimerMs).toBe(0);
    });

    it('should maintain state consistency across multiple actions', () => {
      const { result } = renderHook(() => useEmotionGameState());

      // Complex sequence
      act(() => {
        result.current.setCamera(true);
        result.current.showModal('showTutorial');
        result.current.startRound(3000);
        result.current.updateDifficulty(0.7, 1800);
      });

      expect(result.current.state.detector.cameraActive).toBe(true);
      expect(result.current.state.modals.showTutorial).toBe(true);
      expect(result.current.state.round.timerActive).toBe(true);
      expect(result.current.state.round.roundTimerMs).toBe(3000);
      expect(result.current.state.round.difficulty.threshold).toBe(0.7);
      expect(result.current.state.round.difficulty.holdMs).toBe(1800);
    });
  });
});
