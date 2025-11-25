/**
 * EmotionGame page ("Følelsesspill")
 *
 * High-level controller for the emotion game experience:
 * - Orchestrates detector, camera, and hold-timer hooks
 * - Delegates round/UX state to `useEmotionGameState` and `useGameLoop`
 * - Wires XP/level metrics into HUD components and celebratory effects
 *
 * NOTE: Lower-level state machines and pure logic live in:
 * - `hooks/useEmotionGameState.ts` (round + UI state)
 * - `hooks/useGameLoop.ts` (phases, XP, streak, levels)
 * - `lib/game/*` (difficulty, metrics, telemetry)
 *
 * This file should remain a thin composition layer over those primitives.
 */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AnimatedProgressRing } from '@/components/game/AnimatedProgressRing';
import { motion } from 'framer-motion';
import { PhaseGlow } from '@/components/game/PhaseGlow';
import { GameHUD } from '@/components/game/GameHUD';
import { DEFAULT_WORLDS } from '@/game/levels';
import type { ExpressionKey, World } from '@/game/levels';
import { ConfettiBurst } from '@/components/game/ConfettiBurst';
import { RewardBanner } from '@/components/game/RewardBanner';
import { LevelUpModal } from '@/components/game/LevelUpModal';
import { LevelCompleteModal } from '@/components/game/LevelCompleteModal';
import { StickerBook } from '@/components/game/StickerBook';
import { ThemeSwitch } from '@/components/game/ThemeSwitch';
import { ModeSelector } from '@/components/game/ModeSelector';
import type { GameMode } from '@/lib/game/modes';
import { getTheme } from '@/lib/theme/themes';
import { WorldBanner } from '@/components/game/WorldBanner';
import { ScanSweep } from '@/components/game/ScanSweep';
import { AlmostThereHint } from '@/components/game/AlmostThereHint';
import { playSuccessChime } from '@/lib/sound';
import { useDetector } from '@/hooks/useDetector';
import { useHoldTimer } from '@/hooks/useHoldTimer';
import { createMetricsAccumulator } from '@/lib/game/metrics';
import { mapEffects, type EffectParams } from '@/lib/effects/effect-engine';
import { useGameLoop } from '@/hooks/useGameLoop';
import { TutorialOverlay } from '@/components/game/TutorialOverlay';
import { CalibrationOverlay } from '@/components/game/CalibrationOverlay';
import { loadCalibration } from '@/hooks/useCalibration';
import { useCelebrations } from '@/hooks/useCelebrations';
import { recordGameEvent, streamSessionSummary } from '@/lib/game/telemetry';
import { adaptDifficulty, refineDifficultyForEmotion } from '@/lib/game/difficultyAdapter';
import { resolveParams } from '@/lib/adaptive/rules';
import { ConfidencePrompt } from '@/components/game/ConfidencePrompt';
import { useEmotionGameState } from '@/hooks/useEmotionGameState';
import { RoundSummaryCard } from '@/components/game/RoundSummaryCard';
import { CalibrationErrorSparkline } from '@/components/game/CalibrationErrorSparkline';
import { MatchMeter } from '@/components/game/MatchMeter';
import { HintHeatmapOverlay } from '@/components/game/HintHeatmapOverlay';
import { PracticeSelector } from '@/components/game/PracticeSelector';
import { useAnalyticsWorker } from '@/hooks/useAnalyticsWorker';
import { SessionSummary } from '@/components/game/SessionSummary';
import {
  PRACTICE_MODE_CONFIG,
  GAME_TIMING,
  GAME_DIFFICULTY,
  GAME_SCORING,
  EFFECT_CONFIG,
  SOUND_CONFIG,
  STICKER_CONFIG,
} from '@/config/gameConfig';
import { useStorageState } from '@/lib/storage/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { useTegnXP } from '@/contexts/TegnXPContext';
import { incNeutralHold } from '@/lib/progress/progress-store';
import {
  endEmotionGameSession,
  recordEmotionRoundSuccess,
  startEmotionGameSession,
} from '@/lib/game/sessionAdapter';
import { useTodayEmotionProgress } from '@/hooks/useTodayEmotionProgress';
import { TodayProgressStrip } from '@/components/game/TodayProgressStrip';
import { EmotionGameView } from '@/components/game/EmotionGameView';

type PracticeMode =
  | 'mixed'
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'fearful'
  | 'disgusted'
  | 'surprised';
const PRACTICE_OPTIONS: PracticeMode[] = [
  'mixed',
  'neutral',
  'happy',
  'sad',
  'angry',
  'fearful',
  'disgusted',
  'surprised',
];

export default function EmotionGame() {
  const { tCommon } = useTranslation();
  const { results: _analyticsResults } = useAnalyticsWorker({ precomputeOnIdle: false });

  // Game state machine
  const gameState = useEmotionGameState();

  // Global XP integration (TegnXP)
  const { addXP } = useTegnXP();

  // Configuration state (not part of state machine) - now using storage hooks
  const [worldIndex, setWorldIndex] = useStorageState(STORAGE_KEYS.EMOTION_WORLD_INDEX, 0, {
    deserialize: (value) => {
      const parsed = Number(JSON.parse(value));
      return Math.max(0, Math.min(DEFAULT_WORLDS.length - 1, parsed));
    },
  });
  const baseWorld = DEFAULT_WORLDS[worldIndex] ?? DEFAULT_WORLDS[0];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fpsBucketsRef = useRef<Record<string, number>>({});
  const [cameraStarting, setCameraStarting] = useState<boolean>(false);

  const [themeId, setThemeId] = useStorageState<'regnbueland' | 'rom'>(
    STORAGE_KEYS.EMOTION_THEME_ID,
    'regnbueland',
    {
      deserialize: (value) => {
        const parsed = JSON.parse(value);
        return ['regnbueland', 'rom'].includes(parsed) ? parsed : 'regnbueland';
      },
    },
  );
  const theme = getTheme(themeId);

  const [mode, setMode] = useStorageState<GameMode>(STORAGE_KEYS.EMOTION_GAME_MODE, 'classic');
  const modeStartRef = useRef<number | null>(null);

  const [practice, setPractice] = useStorageState<PracticeMode>(
    STORAGE_KEYS.EMOTION_PRACTICE_MODE,
    'mixed',
    {
      deserialize: (value) => {
        const parsed = JSON.parse(value);
        return PRACTICE_OPTIONS.includes(parsed) ? parsed : 'mixed';
      },
    },
  );

  // Capture studentId from URL if provided and persist for scoping progress (run once)
  const [currentStudentId, setCurrentStudentId] = useStorageState(
    STORAGE_KEYS.CURRENT_STUDENT_ID,
    '',
  );
  useEffect(() => {
    const sid = new URLSearchParams(window.location.search).get('studentId');
    if (sid) {
      setCurrentStudentId(sid);
    }
  }, [setCurrentStudentId]);

  // Detector type preference
  const [detectorType] = useStorageState(STORAGE_KEYS.EMOTION_DETECTOR_TYPE, 'faceapi-worker', {
    deserialize: (value) => {
      const parsed = JSON.parse(value);
      return typeof parsed === 'string' ? parsed : 'faceapi-worker';
    },
  });

  // Tutorial seen flag
  const [, setTutorialSeen] = useStorageState(STORAGE_KEYS.EMOTION_TUTORIAL_SEEN, false, {
    serialize: (value) => JSON.stringify(value ? '1' : '0'),
    deserialize: (value) => {
      try {
        const parsed = JSON.parse(value);
        return parsed === '1' || parsed === true;
      } catch {
        // @silent-ok: deserialization errors return safe default
        return false;
      }
    },
  });

  // Stickers collection
  const [stickers, setStickers] = useStorageState<Array<{ id: string; x: number; y: number }>>(
    STORAGE_KEYS.EMOTION_STICKERS,
    [],
    {
      deserialize: (value) => {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          // @silent-ok: stickers deserialization errors return safe default
          return [];
        }
      },
    },
  );

  // Lower the internal detector threshold a bit and smooth over more frames for stability
  const detector = useDetector(videoRef, {
    targetFps: 24,
    scoreThreshold: 0.5,
    smoothingWindow: 6,
  });
  const effectiveWorld: World = useMemo(() => {
    if (practice === 'mixed') return baseWorld;

    const t: ExpressionKey = practice as Exclude<typeof practice, 'mixed'> as ExpressionKey;
    const rounds = Array.from({ length: 6 }, (_, i) => ({
      target: t,
      holdMs: PRACTICE_MODE_CONFIG.BASE_HOLD_MS + i * PRACTICE_MODE_CONFIG.HOLD_MS_INCREMENT,
      threshold: Math.min(
        PRACTICE_MODE_CONFIG.MAX_THRESHOLD,
        PRACTICE_MODE_CONFIG.BASE_THRESHOLD + i * PRACTICE_MODE_CONFIG.THRESHOLD_INCREMENT,
      ),
    }));
    return { id: `practice-${t}`, nameKey: 'game.worlds.practice', rounds };
  }, [baseWorld, practice]);
  const game = useGameLoop({ world: effectiveWorld });
  const phase = game.phase;
  const round = game.round;
  const roundIndex = game.roundIndex;
  const metricsSnapshot = game.metrics;
  const startGame = game.start;
  const setGamePhase = game.setPhase;
  const advanceRound = game.next;
  const registerScore = game.score;
  const registerFail = game.fail;
  const roundTarget: ExpressionKey = round?.target ?? 'neutral';
  const fastPassFramesRef = useRef<number>(0);
  const lastLevelRef = useRef<number>(0);
  const metrics = useRef(createMetricsAccumulator(loadCalibration()?.threshold ?? 0.6));
  const gameSessionIdRef = useRef<string | null>(null);

  // UI/Effect state (not part of state machine)
  const [effectParams, setEffectParams] = useState<EffectParams>({
    particleCount: EFFECT_CONFIG.DEFAULT_PARTICLE_COUNT,
    colorSaturation: EFFECT_CONFIG.DEFAULT_COLOR_SATURATION,
    glowStrength: EFFECT_CONFIG.DEFAULT_GLOW_STRENGTH,
    sfxGain: EFFECT_CONFIG.DEFAULT_SFX_GAIN,
  });
  const [lastPerfect, setLastPerfect] = useState<boolean>(false);
  const [confidenceValue, setConfidenceValue] = useState<number>(0.7);
  const [showSummary, setShowSummary] = useState<{
    visible: boolean;
    timeMs: number;
    stabilityMs?: number;
    intensity?: number;
    actualProb?: number;
  } | null>(null);
  const [particleMin] = useStorageState(
    STORAGE_KEYS.EMOTION_PARTICLES_MIN,
    EFFECT_CONFIG.PARTICLE_MIN,
    {
      deserialize: (value) => {
        const parsed = Number(JSON.parse(value));
        return isNaN(parsed) ? EFFECT_CONFIG.PARTICLE_MIN : parsed;
      },
    },
  );
  const [particleMax] = useStorageState(
    STORAGE_KEYS.EMOTION_PARTICLES_MAX,
    EFFECT_CONFIG.PARTICLE_MAX,
    {
      deserialize: (value) => {
        const parsed = Number(JSON.parse(value));
        return isNaN(parsed) ? EFFECT_CONFIG.PARTICLE_MAX : parsed;
      },
    },
  );

  // Destructure stable pieces to avoid object identity changing in deps
  const {
    state: holdState,
    update: updateHold,
    reset: resetHold,
  } = useHoldTimer({
    threshold:
      gameState.state.round.difficulty.threshold ??
      loadCalibration()?.threshold ??
      round?.threshold ??
      GAME_DIFFICULTY.DEFAULT_THRESHOLD,
    holdMs:
      gameState.state.round.difficulty.holdMs ??
      loadCalibration()?.holdMs ??
      round?.holdMs ??
      GAME_DIFFICULTY.DEFAULT_HOLD_MS,
  });

  useEffect(() => {
    if (phase === 'idle') startGame();
  }, [phase, startGame]);

  const handleGlobalKey = React.useCallback(
    (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (phase === 'paused') {
          setGamePhase('detecting');
          try {
            const live = document.getElementById('round-live');
            if (live) live.textContent = String(tCommon('game.announcements.resumed'));
          } catch {
            // @silent-ok: accessibility announcement is non-critical
          }
        } else if (phase === 'detecting') {
          setGamePhase('paused');
          try {
            const live = document.getElementById('round-live');
            if (live) live.textContent = String(tCommon('game.announcements.paused'));
          } catch {
            // @silent-ok: accessibility announcement is non-critical
          }
        }
      } else if (e.key.toLowerCase() === 'h' && gameState.canUseHint) {
        gameState.useHint();
        try {
          recordGameEvent({
            ts: Date.now(),
            kind: 'hint_used',
            roundIndex,
            target: round?.target ?? 'neutral',
          });
        } catch {
          // @silent-ok: telemetry recording is non-critical
        }
      }
    },
    [phase, setGamePhase, gameState, roundIndex, round, tCommon],
  );

  useEffect(() => {
    // eslint-disable-next-line no-restricted-syntax
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [handleGlobalKey]);

  // Today-level progress view model (shared with Achievements)
  const todayProgress = useTodayEmotionProgress(currentStudentId || undefined);

  // Track mode start/end in telemetry and mirror into the tracking SessionManager
  useEffect(() => {
    // Note: mode is automatically persisted via useStorageState
    if (modeStartRef.current != null) {
      try {
        const duration = Date.now() - modeStartRef.current;
        recordGameEvent({
          ts: Date.now(),
          kind: 'mode_end',
          roundIndex,
          target: round?.target ?? 'neutral',
          mode,
          durationMs: duration,
        });
      } catch {
        // @silent-ok: telemetry recording is non-critical
      }
      // End any active tracking session for the previous mode
      try {
        endEmotionGameSession(gameSessionIdRef.current, { save: true });
      } catch {
        // @silent-ok: session end is non-critical
      }
    }
    modeStartRef.current = Date.now();
    try {
      recordGameEvent({
        ts: Date.now(),
        kind: 'mode_start',
        roundIndex,
        target: round?.target ?? 'neutral',
        mode,
      });
    } catch {
      // @silent-ok: telemetry recording is non-critical
    }
    // Start a new tracking session for this mode
    try {
      gameSessionIdRef.current = startEmotionGameSession(currentStudentId, mode);
    } catch {
      // @silent-ok: session start is non-critical
    }
  }, [mode, round?.target, roundIndex, currentStudentId]);

  // On unmount, close any open mode session for better analytics hygiene
  useEffect(() => {
    return () => {
      if (modeStartRef.current != null) {
        try {
          const duration = Date.now() - modeStartRef.current;
          recordGameEvent({
            ts: Date.now(),
            kind: 'mode_end',
            roundIndex,
            target: round?.target ?? 'neutral',
            mode,
            durationMs: duration,
          });
        } catch {
          // @silent-ok: telemetry recording is non-critical
        }
        try {
          endEmotionGameSession(gameSessionIdRef.current, { save: true });
        } catch {
          // @silent-ok: session end is non-critical
        }
        try {
          streamSessionSummary(modeStartRef.current, { mode });
        } catch {
          // @silent-ok: session summary is non-critical
        }
      }
    };
  }, [mode, round?.target, roundIndex]);

  // Transition from prompt -> detecting when vi er klare
  useEffect(() => {
    if (phase === 'prompt' && gameState.state.detector.cameraActive && detector.ready && round) {
      resetHold();
      try {
        metrics.current.reset();
      } catch {
        // @silent-ok: metrics reset is non-critical
      }
      gameState.resetHintFlag();
      setGamePhase('detecting');
      recordGameEvent({
        ts: Date.now(),
        kind: 'round_start',
        roundIndex,
        target: round.target,
      });

      // Start round countdown timer based on mode
      const baseMs = round.holdMs ?? GAME_DIFFICULTY.DEFAULT_HOLD_MS;
      const classicDuration = Math.max(
        GAME_TIMING.CLASSIC_ROUND_MIN_DURATION_MS,
        Math.floor(baseMs * GAME_TIMING.CLASSIC_ROUND_DURATION_MULTIPLIER),
      );
      const timeAttackDuration = Math.max(
        GAME_TIMING.TIME_ATTACK_ROUND_MIN_DURATION_MS,
        Math.floor(baseMs * GAME_TIMING.TIME_ATTACK_ROUND_DURATION_MULTIPLIER),
      ); // slightly tighter
      const mirrorDuration = Math.max(
        GAME_TIMING.MIRROR_ROUND_MIN_DURATION_MS,
        Math.floor(baseMs * GAME_TIMING.MIRROR_ROUND_DURATION_MULTIPLIER),
      ); // give more time to mimic
      const duration =
        mode === 'time_attack'
          ? timeAttackDuration
          : mode === 'mirror'
            ? mirrorDuration
            : classicDuration;
      gameState.startRound(duration);
      try {
        const live = document.getElementById('round-live');
        if (live) live.textContent = String(tCommon('game.announcements.roundStart'));
      } catch {
        // @silent-ok: accessibility announcement is non-critical
      }
    }
  }, [phase, gameState, detector.ready, round, resetHold, setGamePhase, mode, roundIndex, tCommon]);

  // Countdown effect for timed rounds
  useEffect(() => {
    if (!gameState.state.round.timerActive || phase !== 'detecting') return;
    let timeoutId: number | undefined;

    const tick = () => {
      const step =
        mode === 'time_attack'
          ? GAME_TIMING.TIME_ATTACK_STEP_MS
          : mode === 'mirror'
            ? GAME_TIMING.MIRROR_STEP_MS
            : GAME_TIMING.CLASSIC_STEP_MS;

      gameState.tickTimer(step);

      if (gameState.state.round.roundTimerMs - step <= 0) {
        try {
          recordGameEvent({
            ts: Date.now(),
            kind: 'round_fail',
            roundIndex,
            target: round?.target ?? 'neutral',
            reason: 'timeout',
            fpsBuckets: gameState.state.detector.fpsBuckets,
          });
        } catch {
          // @silent-ok: telemetry recording is non-critical
        }
        gameState.registerFail();
        try {
          registerFail();
        } catch {
          // @silent-ok: score registration is non-critical
        }
        setGamePhase('paused');
        const resumeId = window.setTimeout(() => {
          try {
            advanceRound();
          } catch {
            // @silent-ok: round advance is non-critical
          }
        }, 600);
        timeoutId = resumeId as unknown as number;
      } else {
        timeoutId = window.setTimeout(
          tick,
          GAME_TIMING.ROUND_COUNTDOWN_TICK_MS,
        ) as unknown as number;
      }
    };

    timeoutId = window.setTimeout(tick, GAME_TIMING.ROUND_COUNTDOWN_TICK_MS) as unknown as number;
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [gameState, phase, roundIndex, round, registerFail, advanceRound, mode, setGamePhase]);

  // Oppdater hold basert på sannsynlighet for måluttrykket
  useEffect(() => {
    if (phase !== 'detecting' || !round) return;
    const probabilities = detector.probabilities as Record<string, number>;
    const targetExpression: ExpressionKey = round.target;
    const targetProb = probabilities[targetExpression] ?? 0;
    try {
      metrics.current.push(targetProb);
    } catch {
      // @silent-ok: metrics push is non-critical
    }
    const result = updateHold(targetProb);
    const fps = typeof detector.fps === 'number' ? detector.fps : 0;
    recordGameEvent({
      ts: Date.now(),
      kind: 'prob_sample',
      roundIndex,
      target: targetExpression,
      prob: targetProb,
      fps,
      detector: detectorType,
    });
    const bucket =
      fps < 12 ? '<12' : fps < 16 ? '12-16' : fps < 20 ? '16-20' : fps < 24 ? '20-24' : '24+';
    fpsBucketsRef.current[bucket] = (fpsBucketsRef.current[bucket] ?? 0) + 1;
    if (result.satisfied) {
      setGamePhase('success');
      const snapshot = metrics.current.compute();
      const timeToSuccess = Math.max(
        500,
        Math.min(8000, snapshot.reactionTimeMs > 0 ? snapshot.reactionTimeMs : round.holdMs),
      );

      const perfect =
        targetProb >=
        Math.max(
          GAME_SCORING.PERFECT_THRESHOLD_PROB,
          (round.threshold ?? GAME_DIFFICULTY.DEFAULT_THRESHOLD) +
            GAME_SCORING.PERFECT_THRESHOLD_ADDITION,
        );
      setLastPerfect(perfect);
      const gainedXp = registerScore(timeToSuccess, gameState.state.round.usedHint, {
        combo: gameState.state.round.combo,
        perfect,
      });
      try {
        addXP(gainedXp);
      } catch {
        // @silent-ok: XP tracking is non-critical
      }
      try {
        setEffectParams(
          mapEffects({
            intensity: snapshot.intensityScore,
            stabilityMs: snapshot.longestStabilityMs,
            reactionTimeMs: snapshot.reactionTimeMs > 0 ? snapshot.reactionTimeMs : timeToSuccess,
          }),
        );
      } catch {
        // @silent-ok: effect params mapping is non-critical
      }
      gameState.registerSuccess(true);
      try {
        const params = resolveParams(
          timeToSuccess,
          snapshot.longestStabilityMs / Math.max(1, timeToSuccess),
          snapshot.intensityScore,
        );
        const adaptedDifficulty = refineDifficultyForEmotion(
          adaptDifficulty(
            {
              threshold: gameState.state.round.difficulty.threshold,
              holdMs: params.holdDurationMs,
              streak: gameState.state.round.difficulty.streak,
            },
            { kind: 'success' },
          ),
          targetExpression,
        );
        gameState.updateDifficulty(
          Math.max(
            GAME_DIFFICULTY.MIN_ADAPTIVE_THRESHOLD,
            Math.min(
              GAME_DIFFICULTY.MAX_ADAPTIVE_THRESHOLD,
              adaptedDifficulty.threshold ?? GAME_DIFFICULTY.DEFAULT_THRESHOLD,
            ),
          ),
          adaptedDifficulty.holdMs,
        );
      } catch {
        // @silent-ok: difficulty adaptation is non-critical
      }
      recordGameEvent({
        ts: Date.now(),
        kind: 'round_success',
        roundIndex,
        target: targetExpression,
        timeMs: timeToSuccess,
        stars: metricsSnapshot.stars || 1,
        streak: metricsSnapshot.streak,
        fpsBuckets: gameState.state.detector.fpsBuckets,
        stabilityMs: snapshot.longestStabilityMs,
        intensity: snapshot.intensityScore,
      });
      try {
        recordEmotionRoundSuccess(gameSessionIdRef.current as any, {
          target: targetExpression,
          timeMs: timeToSuccess,
          usedHint: gameState.state.round.usedHint,
        });
      } catch {
        // @silent-ok: session recording is non-critical
      }
      if (targetExpression === 'neutral') {
        try {
          incNeutralHold();
        } catch {
          // @silent-ok: progress tracking is non-critical
        }
      }
      if (mode === 'confidence') {
        setShowSummary({
          visible: false,
          timeMs: timeToSuccess,
          stabilityMs: snapshot.longestStabilityMs,
          intensity: snapshot.intensityScore,
          actualProb: targetProb,
        });
        gameState.showModal('showConfidencePrompt');
      }
    }
  }, [
    phase,
    round,
    detector.probabilities,
    detector.fps,
    updateHold,
    setGamePhase,
    registerScore,
    gameState,
    mode,
    roundIndex,
    metricsSnapshot.stars,
    metricsSnapshot.streak,
  ]);
  // Throttle flush of FPS buckets to state (reduce render churn and prevent effect loops)
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = fpsBucketsRef.current;
      if (!next) return;
      const prev = gameState.state.detector.fpsBuckets;
      const hasChange = Object.keys(next).some((key) => prev[key] !== next[key]);
      if (hasChange) {
        gameState.updateFpsBuckets({ ...next });
      }
    }, 800);
    return () => window.clearInterval(id);
  }, [gameState]);

  // Fast‑pass: if the top label matches target with high confidence for a few frames, accept immediately
  // Run ONLY while detecting to prevent setState loops across phases
  useEffect(() => {
    if (
      phase !== 'detecting' ||
      !round ||
      !gameState.state.detector.cameraActive ||
      !detector.ready
    )
      return;
    const probabilities = detector.probabilities as Record<string, number>;
    const targetExpression: ExpressionKey = round.target;
    const prob = probabilities[targetExpression] ?? 0;
    const topMatches = detector.topLabel === targetExpression;
    const highEnough =
      prob >=
      Math.max(
        0.55,
        (round.threshold ?? GAME_DIFFICULTY.DEFAULT_THRESHOLD) *
          GAME_DIFFICULTY.FAST_PASS_THRESHOLD_MULTIPLIER,
      );
    if (topMatches && highEnough) {
      fastPassFramesRef.current += 1;
    } else {
      fastPassFramesRef.current = 0;
    }
    if (fastPassFramesRef.current >= GAME_DIFFICULTY.FAST_PASS_FRAMES) {
      setGamePhase('success');
      const timeToSuccess = round.holdMs;
      const gainedXp = registerScore(timeToSuccess, gameState.state.round.usedHint, {
        combo: gameState.state.round.combo,
        perfect: false,
      });
      try {
        addXP(gainedXp);
      } catch {
        // @silent-ok: XP tracking is non-critical
      }
      gameState.registerSuccess(true);
      const adaptedDifficulty = refineDifficultyForEmotion(
        adaptDifficulty(
          {
            threshold: gameState.state.round.difficulty.threshold,
            holdMs: gameState.state.round.difficulty.holdMs,
            streak: gameState.state.round.difficulty.streak,
          },
          { kind: 'success' },
        ),
        targetExpression,
      );
      gameState.updateDifficulty(adaptedDifficulty.threshold, adaptedDifficulty.holdMs);
      recordGameEvent({
        ts: Date.now(),
        kind: 'round_success',
        roundIndex,
        target: targetExpression,
        timeMs: timeToSuccess,
        stars: metricsSnapshot.stars || 1,
        streak: metricsSnapshot.streak,
        fpsBuckets: gameState.state.detector.fpsBuckets,
      });
      try {
        recordEmotionRoundSuccess(gameSessionIdRef.current as any, {
          target: targetExpression,
          timeMs: timeToSuccess,
          usedHint: gameState.state.round.usedHint,
        });
      } catch {
        // @silent-ok: session recording is non-critical
      }
      if (targetExpression === 'neutral') {
        try {
          incNeutralHold();
        } catch {
          // @silent-ok: progress tracking is non-critical
        }
      }
      if (mode === 'confidence') {
        const actualProb = probabilities[targetExpression] ?? 0;
        setShowSummary({ visible: false, timeMs: timeToSuccess, actualProb });
        gameState.showModal('showConfidencePrompt');
      }
    }
  }, [
    phase,
    round,
    gameState,
    detector.ready,
    detector.topLabel,
    detector.probabilities,
    registerScore,
    mode,
    roundIndex,
    metricsSnapshot.stars,
    metricsSnapshot.streak,
    setGamePhase,
  ]);

  // Reset fast‑pass counter whenever we enter/leave detecting
  useEffect(() => {
    if (phase === 'detecting') {
      fastPassFramesRef.current = 0;
    } else if (phase === 'success' || phase === 'reward' || phase === 'paused') {
      fastPassFramesRef.current = 0;
    }
  }, [phase]);

  // When we enter success, schedule reward (short delay for visual feedback)
  useEffect(() => {
    if (phase !== 'success') return;
    // sound effect
    try {
      playSuccessChime(SOUND_CONFIG.SUCCESS_CHIME_GAIN);
    } catch {
      // @silent-ok: sound effect is non-critical
    }
    // eslint-disable-next-line no-restricted-syntax
    const toReward = setTimeout(
      () => setGamePhase('reward'),
      GAME_TIMING.SUCCESS_TO_REWARD_DELAY_MS,
    );
    return () => clearTimeout(toReward);
  }, [phase, setGamePhase]);

  // When in reward, schedule transition to the next round
  useEffect(() => {
    if (phase !== 'reward') return;
    // eslint-disable-next-line no-restricted-syntax
    const toNext = setTimeout(() => advanceRound(), GAME_TIMING.REWARD_TO_NEXT_ROUND_DELAY_MS);
    try {
      const live = document.getElementById('round-live');
      if (live) live.textContent = String(tCommon('game.announcements.nextRound'));
    } catch {
      // @silent-ok: accessibility announcement is non-critical
    }
    return () => clearTimeout(toNext);
  }, [phase, advanceRound, tCommon]);

  // Show level complete modal when world rounds are done
  useEffect(() => {
    if (phase === 'completed') {
      gameState.showModal('showLevelComplete');
    }
  }, [phase, gameState]);

  // Persist world index when it changes (affects mixed mode)
  // Note: worldIndex is automatically persisted via useStorageState

  // Restart when practice mode changes for predictable rounds
  useEffect(() => {
    // Note: practice is automatically persisted via useStorageState
    startGame();
  }, [practice, startGame]);

  // Track level-up and show modal when level increases
  const [levelUpVisible, setLevelUpVisible] = useState<boolean>(false);
  const celebration = useCelebrations(phase === 'success' || phase === 'reward');
  useEffect(() => {
    if (metricsSnapshot.level > (lastLevelRef.current || 0)) {
      if (lastLevelRef.current !== 0) {
        setLevelUpVisible(true);
      }
      lastLevelRef.current = metricsSnapshot.level;
    }
  }, [metricsSnapshot.level]);

  async function startCamera() {
    if (cameraStarting || gameState.state.detector.cameraActive) return;
    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        try {
          // Some browsers require an explicit play() even with muted + playsInline
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          video.play();
        } catch {
          // @silent-ok: autoplay may fail; canplay event still fires when frames arrive
        }
        const handleCanPlay = () => {
          gameState.setCamera(true);
          setGamePhase('prompt');
          setCameraStarting(false);
          video.removeEventListener('canplay', handleCanPlay);
        };
        video.addEventListener('canplay', handleCanPlay);
        if (video.readyState >= 2) {
          // If metadata is already loaded, mark ready immediately
          handleCanPlay();
        }
      } else {
        setCameraStarting(false);
      }
    } catch {
      // @silent-ok: camera access may fail; UI reflects the failure state
      setCameraStarting(false);
      gameState.setCamera(false);
    }
  }

  function stopCamera() {
    const video = videoRef.current;
    const stream = (video?.srcObject as MediaStream | null) ?? null;
    for (const track of stream?.getTracks() ?? []) track.stop();
    if (video) {
      video.srcObject = null;
      video.pause();
    }
    gameState.setCamera(false);
    resetHold();
  }

  // Stop camera on unmount to avoid leaking tracks
  useEffect(() => {
    const videoElement = videoRef.current;
    const stream = (videoElement?.srcObject as MediaStream | null) ?? null;
    return () => {
      for (const track of stream?.getTracks() ?? []) track.stop();
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, []);

  return (
    <EmotionGameView
      phase={phase}
      roundTarget={roundTarget}
      round={round}
      roundIndex={roundIndex}
      metricsSnapshot={metricsSnapshot}
      effectiveWorld={effectiveWorld}
      detector={detector}
      videoRef={videoRef}
      cameraStarting={cameraStarting}
      gameState={gameState as any}
              themeId={themeId}
      setThemeId={setThemeId}
      mode={mode}
      setMode={setMode}
      practice={practice}
      setPractice={setPractice}
      onStartCamera={startCamera}
      onStopCamera={stopCamera}
      onAdvanceRound={advanceRound}
      onSetGamePhase={setGamePhase}
      holdProgress={holdState.progress}
      todayProgress={todayProgress}
      sessionStartTs={modeStartRef.current}
      levelUpVisible={levelUpVisible}
      setLevelUpVisible={setLevelUpVisible}
      confidenceValue={confidenceValue}
      setConfidenceValue={setConfidenceValue}
      showSummary={showSummary}
      setShowSummary={setShowSummary}
      celebrationConfetti={celebration.confetti}
      effectParams={effectParams}
      particleMin={particleMin}
      particleMax={particleMax}
      themeColors={theme.colors}
      lastPerfect={lastPerfect}
      setTutorialSeen={setTutorialSeen}
      setWorldIndex={setWorldIndex}
      startGame={startGame}
      setStickers={setStickers}
    />
  );
}
