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
// import CornerCelebrate from '@/components/game/CornerCelebrate';
import { useDetector } from '@/hooks/useDetector';
import { useHoldTimer } from '@/hooks/useHoldTimer';
import { createMetricsAccumulator } from '@/lib/game/metrics';
import { mapEffects, type EffectParams } from '@/lib/effects/effect-engine';
import { useGameLoop } from '@/hooks/useGameLoop';
import { TutorialOverlay } from '@/components/game/TutorialOverlay';
import { CalibrationOverlay } from '@/components/game/CalibrationOverlay';
import { loadCalibration } from '@/hooks/useCalibration';
import { useCelebrations } from '@/hooks/useCelebrations';
// no need for useSearchParams here to avoid re-running effect on each render
import { recordGameEvent, streamSessionSummary } from '@/lib/game/telemetry';
import { adaptDifficulty, refineDifficultyForEmotion } from '@/lib/game/difficultyAdapter';
import { resolveParams } from '@/lib/adaptive/rules';
import type { HintsState } from '@/lib/game/hints';
import { loadHints, useHint as consumeHint } from '@/lib/game/hints';
import { ConfidencePrompt } from '@/components/game/ConfidencePrompt';
import { RoundSummaryCard } from '@/components/game/RoundSummaryCard';
import { CalibrationErrorSparkline } from '@/components/game/CalibrationErrorSparkline';
import { MatchMeter } from '@/components/game/MatchMeter';
import { HintHeatmapOverlay } from '@/components/game/HintHeatmapOverlay';
import { PracticeSelector } from '@/components/game/PracticeSelector';
import { useAnalyticsWorker } from '@/hooks/useAnalyticsWorker';
import { SessionSummary } from '@/components/game/SessionSummary';
import { PRACTICE_MODE_CONFIG, GAME_TIMING, GAME_DIFFICULTY, GAME_SCORING, EFFECT_CONFIG, SOUND_CONFIG, STICKER_CONFIG } from '@/config/gameConfig';

type PracticeMode = 'mixed' | 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised';
const PRACTICE_OPTIONS: PracticeMode[] = ['mixed', 'neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised'];

const PRACTICE_STORAGE_KEY = 'emotion.practice';

const loadStoredPractice = (): PracticeMode => {
  try {
    const stored = localStorage.getItem(PRACTICE_STORAGE_KEY);
    if (stored && PRACTICE_OPTIONS.includes(stored as PracticeMode)) {
      return stored as PracticeMode;
    }
  } catch {
    /* noop */
  }
  return 'mixed';
};

export default function EmotionGame() {
  const { tCommon } = useTranslation();
  const { results: _analyticsResults } = useAnalyticsWorker({ precomputeOnIdle: false });
  const [worldIndex, setWorldIndex] = useState<number>(() => {
    try { return Math.max(0, Math.min(DEFAULT_WORLDS.length - 1, Number(localStorage.getItem('emotion.worldIndex') || '0'))); } catch {
      /* noop */
      return 0;
    }
  });
  const baseWorld = DEFAULT_WORLDS[worldIndex] ?? DEFAULT_WORLDS[0];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [usedHint, setUsedHint] = useState<boolean>(false);
  const [combo, setCombo] = useState<number>(1);
  const [roundTimerMs, setRoundTimerMs] = useState<number>(0);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [hints, setHints] = useState<HintsState>(() => loadHints(5));
  const [fpsBuckets, setFpsBuckets] = useState<Record<string, number>>({});
  const fpsBucketsRef = useRef<Record<string, number>>({});
  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    try { return localStorage.getItem('emotion.tutorialSeen') !== '1'; } catch {
      /* noop */
      return true;
    }
  });
  const [showCalibration, setShowCalibration] = useState<boolean>(() => !loadCalibration());
  const [showLevelComplete, setShowLevelComplete] = useState<boolean>(false);
  const [showStickerBook, setShowStickerBook] = useState<boolean>(false);
  const [themeId, setThemeId] = useState<'regnbueland' | 'rom'>(() => {
    try { return (localStorage.getItem('emotion.themeId') as 'regnbueland' | 'rom') || 'regnbueland'; } catch {
      /* noop */
      return 'regnbueland';
    }
  });
  const theme = getTheme(themeId);
  const [showWorldBanner, setShowWorldBanner] = useState<boolean>(false);
  const [mode, setMode] = useState<GameMode>(() => {
    try { return (localStorage.getItem('emotion.gameMode') as GameMode) || 'classic'; } catch {
      /* noop */
      return 'classic';
    }
  });
  const modeStartRef = useRef<number | null>(null);
  const [practice, setPractice] = useState<PracticeMode>(loadStoredPractice);
  // Capture studentId from URL if provided and persist for scoping progress (run once)
  useEffect(() => {
    try {
      const sid = new URLSearchParams(window.location.search).get('studentId');
      if (sid) localStorage.setItem('current.studentId', sid);
    } catch {
    /* noop */
  }
  }, []);



 

  // Lower the internal detector threshold a bit and smooth over more frames for stability
  const detector = useDetector(videoRef, { targetFps: 24, scoreThreshold: 0.5, smoothingWindow: 6 });
  const effectiveWorld: World = useMemo(() => {
    if (practice === 'mixed') return baseWorld;


    const t: ExpressionKey = practice as Exclude<typeof practice, 'mixed'> as ExpressionKey;
    const rounds = Array.from({ length: 6 }, (_, i) => ({
      target: t,
      holdMs: PRACTICE_MODE_CONFIG.BASE_HOLD_MS + i * PRACTICE_MODE_CONFIG.HOLD_MS_INCREMENT,
      threshold: Math.min(PRACTICE_MODE_CONFIG.MAX_THRESHOLD, PRACTICE_MODE_CONFIG.BASE_THRESHOLD + i * PRACTICE_MODE_CONFIG.THRESHOLD_INCREMENT),
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
  const metrics = useRef(createMetricsAccumulator((loadCalibration()?.threshold ?? 0.6)));

  const [effectParams, setEffectParams] = useState<EffectParams>({ particleCount: EFFECT_CONFIG.DEFAULT_PARTICLE_COUNT, colorSaturation: EFFECT_CONFIG.DEFAULT_COLOR_SATURATION, glowStrength: EFFECT_CONFIG.DEFAULT_GLOW_STRENGTH, sfxGain: EFFECT_CONFIG.DEFAULT_SFX_GAIN });
  const [lastPerfect, setLastPerfect] = useState<boolean>(false);
  const [showConfidencePrompt, setShowConfidencePrompt] = useState<boolean>(false);
  const [confidenceValue, setConfidenceValue] = useState<number>(0.7);
  const [showSummary, setShowSummary] = useState<{ visible: boolean; timeMs: number; stabilityMs?: number; intensity?: number; actualProb?: number } | null>(null);
  const [particleMin] = useState<number>(() => { try { return Number(localStorage.getItem('emotion.effects.particles.min') || String(EFFECT_CONFIG.PARTICLE_MIN)); } catch { return EFFECT_CONFIG.PARTICLE_MIN; } });
  const [particleMax] = useState<number>(() => { try { return Number(localStorage.getItem('emotion.effects.particles.max') || String(EFFECT_CONFIG.PARTICLE_MAX)); } catch { return EFFECT_CONFIG.PARTICLE_MAX; } });

  const [difficulty, setDifficulty] = useState({ threshold: (loadCalibration()?.threshold ?? GAME_DIFFICULTY.DEFAULT_THRESHOLD), holdMs: (loadCalibration()?.holdMs ?? GAME_DIFFICULTY.DEFAULT_HOLD_MS), streak: 0 });
  // Destructure stable pieces to avoid object identity changing in deps
  const { state: holdState, update: updateHold, reset: resetHold } = useHoldTimer({
    threshold: difficulty.threshold ?? (loadCalibration()?.threshold ?? round?.threshold) ?? GAME_DIFFICULTY.DEFAULT_THRESHOLD,
    holdMs: difficulty.holdMs ?? (loadCalibration()?.holdMs ?? round?.holdMs) ?? GAME_DIFFICULTY.DEFAULT_HOLD_MS,
  });

  useEffect(() => {
    if (phase === 'idle') startGame();
  }, [phase, startGame]);

  const handleGlobalKey = React.useCallback((e: KeyboardEvent) => {
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (phase === 'paused') {
        setGamePhase('detecting');
        try {
          const live = document.getElementById('round-live');
          if (live) live.textContent = String(tCommon('game.announcements.resumed'));
        } catch {
          /* noop */
        }
      } else if (phase === 'detecting') {
        setGamePhase('paused');
        try {
          const live = document.getElementById('round-live');
          if (live) live.textContent = String(tCommon('game.announcements.paused'));
        } catch {
          /* noop */
        }
      }
    } else if (e.key.toLowerCase() === 'h' && hints.remaining > 0) {
      setUsedHint(true);
      const updatedHints = consumeHint();
      setHints(updatedHints);
      try {
        recordGameEvent({
          ts: Date.now(),
          kind: 'hint_used',
          roundIndex,
          target: round?.target ?? 'neutral'
        });
      } catch {
        /* noop */
      }
    }
  }, [phase, setGamePhase, hints.remaining, roundIndex, round, tCommon]);

  useEffect(() => {
    // eslint-disable-next-line no-restricted-syntax
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [handleGlobalKey]);

  // Track mode start/end in telemetry
  useEffect(() => {
    try {
      localStorage.setItem('emotion.gameMode', mode);
    } catch {
      /* noop */
    }
    if (modeStartRef.current != null) {
      try {
        const duration = Date.now() - modeStartRef.current;
        recordGameEvent({
          ts: Date.now(),
          kind: 'mode_end',
          roundIndex,
          target: round?.target ?? 'neutral',
          mode,
          durationMs: duration
        });
      } catch {
        /* noop */
      }
    }
    modeStartRef.current = Date.now();
    try {
      recordGameEvent({
        ts: Date.now(),
        kind: 'mode_start',
        roundIndex,
        target: round?.target ?? 'neutral',
        mode
      });
    } catch {
      /* noop */
    }
  }, [mode, round?.target, roundIndex]);

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
            durationMs: duration
          });
        } catch {
          /* noop */
        }
        try {
          streamSessionSummary(modeStartRef.current, { mode });
        } catch {
          /* noop */
        }
      }
    };
  }, [mode, round?.target, roundIndex]);

  // Transition from prompt -> detecting when vi er klare
  useEffect(() => {
    if (phase === 'prompt' && cameraActive && detector.ready && round) {
      resetHold();
      try {
        metrics.current.reset();
      } catch {
        /* noop */
      }
      setUsedHint(false);
      setGamePhase('detecting');
      recordGameEvent({
        ts: Date.now(),
        kind: 'round_start',
        roundIndex,
        target: round.target
      });

      // Start round countdown timer based on mode
      const baseMs = round.holdMs ?? GAME_DIFFICULTY.DEFAULT_HOLD_MS;
      const classicDuration = Math.max(GAME_TIMING.CLASSIC_ROUND_MIN_DURATION_MS, Math.floor(baseMs * GAME_TIMING.CLASSIC_ROUND_DURATION_MULTIPLIER));
      const timeAttackDuration = Math.max(GAME_TIMING.TIME_ATTACK_ROUND_MIN_DURATION_MS, Math.floor(baseMs * GAME_TIMING.TIME_ATTACK_ROUND_DURATION_MULTIPLIER)); // slightly tighter
      const mirrorDuration = Math.max(GAME_TIMING.MIRROR_ROUND_MIN_DURATION_MS, Math.floor(baseMs * GAME_TIMING.MIRROR_ROUND_DURATION_MULTIPLIER)); // give more time to mimic
      const duration = mode === 'time_attack' ? timeAttackDuration : mode === 'mirror' ? mirrorDuration : classicDuration;
      setRoundTimerMs(duration);
      setTimerActive(true);
      setCombo((c) => Math.max(1, c));
      try {
        const live = document.getElementById('round-live');
        if (live) live.textContent = String(tCommon('game.announcements.roundStart'));
      } catch {
        /* noop */
      }
    }
  }, [phase, cameraActive, detector.ready, round, resetHold, setGamePhase, mode, roundIndex, tCommon]);

  // Countdown effect for timed rounds
  useEffect(() => {
    if (!timerActive || phase !== 'detecting') return;
    let timeoutId: number | undefined;

    const tick = () => {
      setRoundTimerMs((current) => {
        const step = mode === 'time_attack'
          ? GAME_TIMING.TIME_ATTACK_STEP_MS
          : mode === 'mirror'
            ? GAME_TIMING.MIRROR_STEP_MS
            : GAME_TIMING.CLASSIC_STEP_MS;
        const nextValue = Math.max(0, current - step);
        if (nextValue === 0) {
          try {
            recordGameEvent({
              ts: Date.now(),
              kind: 'round_fail',
              roundIndex,
              target: round?.target ?? 'neutral',
              reason: 'timeout',
              fpsBuckets
            });
          } catch {
            /* noop */
          }
          setTimerActive(false);
          setCombo(1);
          try {
            registerFail();
          } catch {
            /* noop */
          }
          setGamePhase('paused');
          const resumeId = window.setTimeout(() => {
            try {
              advanceRound();
            } catch {
              /* noop */
            }
          }, 600);
          timeoutId = resumeId as unknown as number;
        }
        return nextValue;
      });
      timeoutId = window.setTimeout(tick, GAME_TIMING.ROUND_COUNTDOWN_TICK_MS) as unknown as number;
    };

    timeoutId = window.setTimeout(tick, GAME_TIMING.ROUND_COUNTDOWN_TICK_MS) as unknown as number;
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [timerActive, phase, roundIndex, round, fpsBuckets, registerFail, advanceRound, mode, setGamePhase]);

  // Oppdater hold basert på sannsynlighet for måluttrykket
  useEffect(() => {
    if (phase !== 'detecting' || !round) return;
    const probabilities = detector.probabilities as Record<string, number>;
    const targetExpression: ExpressionKey = round.target;
    const targetProb = probabilities[targetExpression] ?? 0;
    try {
      metrics.current.push(targetProb);
    } catch {
      /* noop */
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
      detector: (() => {
        try {
          return localStorage.getItem('emotion.detectorType') || 'faceapi-worker';
        } catch {
          return 'faceapi-worker';
        }
      })()
    });
    const bucket = fps < 12 ? '<12' : fps < 16 ? '12-16' : fps < 20 ? '16-20' : fps < 24 ? '20-24' : '24+';
    fpsBucketsRef.current[bucket] = (fpsBucketsRef.current[bucket] ?? 0) + 1;
    if (result.satisfied) {
      setGamePhase('success');
      const snapshot = metrics.current.compute();
      const timeToSuccess = Math.max(500, Math.min(8000, snapshot.reactionTimeMs > 0 ? snapshot.reactionTimeMs : round.holdMs));

      const perfect = targetProb >= Math.max(
        GAME_SCORING.PERFECT_THRESHOLD_PROB,
        (round.threshold ?? GAME_DIFFICULTY.DEFAULT_THRESHOLD) + GAME_SCORING.PERFECT_THRESHOLD_ADDITION
      );
      setLastPerfect(perfect);
      registerScore(timeToSuccess, usedHint, { combo, perfect });
      try {
        setEffectParams(
          mapEffects({
            intensity: snapshot.intensityScore,
            stabilityMs: snapshot.longestStabilityMs,
            reactionTimeMs: snapshot.reactionTimeMs > 0 ? snapshot.reactionTimeMs : timeToSuccess
          })
        );
      } catch {
        /* noop */
      }
      setCombo((c) => Math.min(GAME_SCORING.COMBO_MAX, c + 1));
      setTimerActive(false);
      try {
        const params = resolveParams(
          timeToSuccess,
          snapshot.longestStabilityMs / Math.max(1, timeToSuccess),
          snapshot.intensityScore
        );
        setDifficulty((d) =>
          refineDifficultyForEmotion(
            {
              ...d,
              holdMs: params.holdDurationMs,
              threshold: Math.max(
                GAME_DIFFICULTY.MIN_ADAPTIVE_THRESHOLD,
                Math.min(GAME_DIFFICULTY.MAX_ADAPTIVE_THRESHOLD, d.threshold ?? GAME_DIFFICULTY.DEFAULT_THRESHOLD)
              )
            },
            targetExpression
          )
        );
      } catch {
        /* noop */
      }
      setDifficulty((d) => refineDifficultyForEmotion(adaptDifficulty(d, { kind: 'success' }), targetExpression));
      recordGameEvent({
        ts: Date.now(),
        kind: 'round_success',
        roundIndex,
        target: targetExpression,
        timeMs: timeToSuccess,
        stars: metricsSnapshot.stars || 1,
        streak: metricsSnapshot.streak,
        fpsBuckets,
        stabilityMs: snapshot.longestStabilityMs,
        intensity: snapshot.intensityScore
      });
      if (mode === 'confidence') {
        setShowSummary({
          visible: false,
          timeMs: timeToSuccess,
          stabilityMs: snapshot.longestStabilityMs,
          intensity: snapshot.intensityScore,
          actualProb: targetProb
        });
        setShowConfidencePrompt(true);
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
    usedHint,
    combo,
    mode,
    roundIndex,
    fpsBuckets,
    metricsSnapshot.stars,
    metricsSnapshot.streak
  ]);
  // Throttle flush of FPS buckets to state (reduce render churn and prevent effect loops)
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = fpsBucketsRef.current;
      if (!next) return;
      setFpsBuckets((prev) => {
        const hasChange = Object.keys(next).some((key) => prev[key] !== next[key]);
        return hasChange ? { ...next } : prev;
      });
    }, 800);
    return () => window.clearInterval(id);
  }, []);

  // Fast‑pass: if the top label matches target with high confidence for a few frames, accept immediately
  // Run ONLY while detecting to prevent setState loops across phases
  useEffect(() => {
    if (phase !== 'detecting' || !round || !cameraActive || !detector.ready) return;
    const probabilities = detector.probabilities as Record<string, number>;
    const targetExpression: ExpressionKey = round.target;
    const prob = probabilities[targetExpression] ?? 0;
    const topMatches = detector.topLabel === targetExpression;
    const highEnough = prob >= Math.max(
      0.55,
      (round.threshold ?? GAME_DIFFICULTY.DEFAULT_THRESHOLD) * GAME_DIFFICULTY.FAST_PASS_THRESHOLD_MULTIPLIER
    );
    if (topMatches && highEnough) {
      fastPassFramesRef.current += 1;
    } else {
      fastPassFramesRef.current = 0;
    }
    if (fastPassFramesRef.current >= GAME_DIFFICULTY.FAST_PASS_FRAMES) {
      setGamePhase('success');
      const timeToSuccess = round.holdMs;
      registerScore(timeToSuccess, usedHint, { combo, perfect: false });
      setCombo((c) => Math.min(10, c + 1));
      setDifficulty((d) => refineDifficultyForEmotion(adaptDifficulty(d, { kind: 'success' }), targetExpression));
      recordGameEvent({
        ts: Date.now(),
        kind: 'round_success',
        roundIndex,
        target: targetExpression,
        timeMs: timeToSuccess,
        stars: metricsSnapshot.stars || 1,
        streak: metricsSnapshot.streak,
        fpsBuckets
      });
      if (mode === 'confidence') {
        setTimerActive(false);
        const actualProb = probabilities[targetExpression] ?? 0;
        setShowSummary({ visible: false, timeMs: timeToSuccess, actualProb });
        setShowConfidencePrompt(true);
      }
    }
  }, [
    phase,
    round,
    cameraActive,
    detector.ready,
    detector.topLabel,
    detector.probabilities,
    registerScore,
    usedHint,
    combo,
    mode,
    roundIndex,
    metricsSnapshot.stars,
    metricsSnapshot.streak,
    fpsBuckets,
    setGamePhase
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
    try { playSuccessChime(SOUND_CONFIG.SUCCESS_CHIME_GAIN); } catch {
    /* noop */
  }
    // eslint-disable-next-line no-restricted-syntax
    const toReward = setTimeout(() => setGamePhase('reward'), GAME_TIMING.SUCCESS_TO_REWARD_DELAY_MS);
    return () => clearTimeout(toReward);
  }, [phase, setGamePhase]);

  // When in reward, schedule transition to the next round
  useEffect(() => {
    if (phase !== 'reward') return;
    // eslint-disable-next-line no-restricted-syntax
    const toNext = setTimeout(() => advanceRound(), GAME_TIMING.REWARD_TO_NEXT_ROUND_DELAY_MS);
    try { const live = document.getElementById('round-live'); if (live) live.textContent = String(tCommon('game.announcements.nextRound')); } catch {
    /* noop */
  }
    return () => clearTimeout(toNext);
  }, [phase, advanceRound, tCommon]);

  // Show level complete modal when world rounds are done
  useEffect(() => {
    if (phase === 'completed') {
      setShowLevelComplete(true);
    }
  }, [phase]);

  // Persist world index when it changes (affects mixed mode)
  useEffect(() => { try { localStorage.setItem('emotion.worldIndex', String(worldIndex)); } catch {
    /* noop */
  } }, [worldIndex]);

  // Restart when practice mode changes for predictable rounds
  useEffect(() => {
    try {
      localStorage.setItem(PRACTICE_STORAGE_KEY, practice);
    } catch {
      /* noop */
    }
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        setGamePhase('prompt');
      }
    } catch {
      setCameraActive(false);
    }
  }

  function stopCamera() {
    const video = videoRef.current;
    const stream = (video?.srcObject as MediaStream | null) ?? null;
    for (const track of stream?.getTracks() ?? []) track.stop();
    if (video) { video.srcObject = null; video.pause(); }
    setCameraActive(false);
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

  const targetLabel = roundTarget;
  const targetText = tCommon(`emotionLab.expressions.${targetLabel}`);

  return (
    <div className="main-container min-h-screen p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{String(tCommon('game.title', { defaultValue: 'Følelsesspill' }))}</h1>
          <div className="flex items-center gap-2">
            {cameraActive ? (
              <Button variant="destructive" onClick={stopCamera}>{String(tCommon('tegn.cameraDisable'))}</Button>
            ) : (
              <Button variant="default" onClick={startCamera}>{String(tCommon('tegn.cameraEnable'))}</Button>
            )}
            <ThemeSwitch
              themeId={themeId}
              onChange={(id) => {
                setThemeId(id);
                try {
                  localStorage.setItem('emotion.themeId', id);
                } catch {
                  /* noop */
                }
              }}
            />
            <Button variant="outline" onClick={() => { setShowTutorial(true); }}>{String(tCommon('buttons.help', { defaultValue: 'Help' }))}</Button>
            <Button variant="outline" onClick={() => { setDifficulty(d => ({ ...d, streak: 0 })); }}>{String(tCommon('game.streakReset', { defaultValue: 'Reset streak' }))}</Button>
            {mode === 'confidence' && (
              <>
                <CalibrationErrorSparkline />
                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      window.location.assign('/calibration/confidence');
                    } catch {
                      /* noop */
                    }
                  }}
                >
                  {String(tCommon('game.calibration.link'))}
                </Button>
              </>
            )}
              <ModeSelector value={mode} onChange={setMode} />
            <PracticeSelector
              value={practice}
              onChange={(value) => {
                setPractice(value);
                try {
                  localStorage.setItem(PRACTICE_STORAGE_KEY, value);
                } catch {
                  /* noop */
                }
              }}
            />
          </div>
        </div>

        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <div className="text-foreground/80 text-sm">{String(tCommon('game.target'))}</div>
          <div className="text-5xl" aria-live="polite">{targetText}</div>
              {mode === 'mirror' && (
                <MatchMeter value={(detector.probabilities as Record<string, number>)[roundTarget] ?? 0} />
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={hints.remaining <= 0}
                  onClick={() => {
                    if (hints.remaining <= 0) return;
                    setUsedHint(true);
                    const updatedHints = consumeHint();
                    setHints(updatedHints);
                    try {
                      recordGameEvent({
                        ts: Date.now(),
                        kind: 'hint_used',
                        roundIndex: roundIndex,
                        target: round?.target ?? 'neutral'
                      });
                    } catch {
                      /* noop */
                    }
                  }}
                >
                  {String(tCommon('game.hintCount', { count: hints.remaining }))}
                </Button>
                <Button variant="outline" onClick={() => setGamePhase('paused')}>{String(tCommon('game.pause'))}</Button>
                <Button variant="outline" onClick={() => advanceRound()}>{String(tCommon('game.skip'))}</Button>
              </div>
              {/* Timer and combo display */}
              <div className="text-sm text-foreground/70">
                {timerActive && <span>{String(tCommon('roundSummary.time'))}: {Math.ceil(roundTimerMs / 1000)}{String(tCommon('game.secondsShort'))}</span>} {combo > 1 && <span className="ml-3">{String(tCommon('game.comboLabel', { count: combo }))}</span>}
              </div>
              <div id="round-live" className="sr-only" aria-live="polite" />
            </div>
            <PhaseGlow phase={phase} className="relative">
              <div className="relative">
                <video ref={videoRef} className="w-full h-auto rounded-lg" playsInline muted aria-label={String(tCommon('tegn.cameraAssistActive'))} />
                <ScanSweep active={!detector.ready || phase === 'prompt'} />
                {mode === 'mirror' && (
                  <HintHeatmapOverlay
                    visible
                    box={detector.box}
                    target={roundTarget}
                    sourceWidth={videoRef.current?.videoWidth ?? 0}
                    sourceHeight={videoRef.current?.videoHeight ?? 0}
                  />
                )}
                {/* Fixed progress ring in the corner for stable visuals */}
                <div className="absolute right-4 bottom-4 pointer-events-none">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: (detector.ready && phase === 'detecting') ? 1 : 0, scale: (detector.ready && phase === 'detecting') ? 1 : 0.98 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    <AnimatedProgressRing size={96} stroke={8} progress={holdState.progress} />
                  </motion.div>
                </div>
                {/* Reward banner near camera */}
                <RewardBanner
                  visible={phase === 'reward'}
                  stars={metricsSnapshot.stars || 1}
                  xpGained={metricsSnapshot.stars
                    ? GAME_SCORING.XP_BASE
                      + Math.max(0, (metricsSnapshot.stars - 1) * GAME_SCORING.XP_STAR_MULTIPLIER)
                      + Math.min(metricsSnapshot.streak * GAME_SCORING.XP_STREAK_MULTIPLIER, GAME_SCORING.XP_STREAK_MAX_BONUS)
                    : undefined}
                />
                <AlmostThereHint
                  visible={phase === 'detecting' && !!round && ((detector.probabilities as Record<string, number>)[roundTarget] ?? 0) >= ((round.threshold ?? GAME_DIFFICULTY.DEFAULT_THRESHOLD) * 0.8)}
                />
                {/* Debug HUD removed in production to satisfy lint rules */}
              </div>
            </PhaseGlow>
          </div>
        </Card>

        <GameHUD
          roundIndex={roundIndex}
          totalRounds={effectiveWorld.rounds.length}
          streak={metricsSnapshot.streak}
          xp={metricsSnapshot.xp}
          level={metricsSnapshot.level}
          xpToNext={metricsSnapshot.xpToNext}
        />
        <SessionSummary startTs={modeStartRef.current} />
        <LevelUpModal visible={levelUpVisible} level={metricsSnapshot.level} onClose={() => setLevelUpVisible(false)} />
      </div>
      <StickerBook visible={showStickerBook} />
      <ConfidencePrompt
        visible={showConfidencePrompt && mode === 'confidence'}
        value={confidenceValue}
        onChange={setConfidenceValue}
        onSubmit={() => {
          setShowConfidencePrompt(false);
          // Compute calibration error vs last actual probability
          const actualProb = showSummary?.actualProb ?? 0;
          const calibrationError = Math.abs(confidenceValue - actualProb);
          try {
            recordGameEvent({
              ts: Date.now(),
              kind: 'confidence_reported',
              roundIndex,
              target: roundTarget,
              confidence: confidenceValue,
              actualProb,
              calibrationError
            });
          } catch {
            /* noop */
          }
          setShowSummary(s => s ? { ...s, visible: true } : { visible: true, timeMs: 0 });
        }}
      />
      <RoundSummaryCard
        visible={(showSummary?.visible ?? false) && mode === 'confidence'}
        target={roundTarget}
        timeMs={showSummary?.timeMs ?? 0}
        stabilityMs={showSummary?.stabilityMs}
        intensity={showSummary?.intensity}
        confidence={confidenceValue}
        actualProb={showSummary?.actualProb}
        onContinue={() => {
          setShowSummary(null);
          setGamePhase('reward');
        }}
      />
      <TutorialOverlay visible={showTutorial} onClose={() => { try { localStorage.setItem('emotion.tutorialSeen', '1'); } catch {
    /* noop */
  }; setShowTutorial(false); }} />
      <CalibrationOverlay visible={showCalibration} neutralProb={(detector.probabilities as Record<string, number>)['neutral'] ?? 0} onClose={() => setShowCalibration(false)} />
      {/* Full-screen success confetti overlay */}
      {/* Guard with reduced motion and only render once mounted to avoid strict-mode dev issues */}
      {celebration.confetti && (
        <ConfettiBurst
          active
          className="fixed inset-0 pointer-events-none z-40"
          origin={{ x: 0.5, y: 0.5 }}
          spreadDeg={360}
          speed={1.0 + effectParams.glowStrength * EFFECT_CONFIG.CONFETTI_SPEED_MULTIPLIER}
          particles={Math.max(particleMin, Math.min(particleMax, effectParams.particleCount))}
          colors={theme.colors}
        />
      )}
      {/* Temporarily disable corner celebrate to further reduce effect churn */}
      {/* <CornerCelebrate active={celebration.confetti} themeColors={theme.colors} /> */}
      {lastPerfect && (
        <ConfettiBurst
          active={celebration.confetti}
          className="fixed inset-0 pointer-events-none z-40"
          origin={{ x: 0.5, y: 0.5 }}
          spreadDeg={360}
          speed={EFFECT_CONFIG.PERFECT_CONFETTI_SPEED}
          particles={Math.max(particleMin + EFFECT_CONFIG.PERFECT_CONFETTI_PARTICLE_ADDITION, Math.min(particleMax, Math.floor(effectParams.particleCount * EFFECT_CONFIG.PERFECT_CONFETTI_PARTICLE_MULTIPLIER)))}
          colors={[ '#ff004c', '#ff7a00', '#ffd400', '#7dff00', '#00e0ff', '#5b5bff', '#d05bff' ]}
        />
      )}
      <LevelCompleteModal
        visible={showLevelComplete}
        onClose={() => setShowLevelComplete(false)}
        onNext={() => {
          setShowLevelComplete(false);
          setWorldIndex((i) => Math.min(DEFAULT_WORLDS.length - 1, i + 1));
          setShowWorldBanner(true);
          startGame();
        }}
        onReplay={() => { setShowLevelComplete(false); startGame(); }}
        onFreePlay={() => { setShowLevelComplete(false); setShowStickerBook(true); }}
        onPayout={(stickerId) => {
          try {
            const raw = localStorage.getItem('emotion.stickers.v1');
            const list = raw ? JSON.parse(raw) : [];
            list.push({ id: stickerId, x: Math.random() * STICKER_CONFIG.RANDOM_X_RANGE + STICKER_CONFIG.RANDOM_X_OFFSET, y: Math.random() * STICKER_CONFIG.RANDOM_Y_RANGE + STICKER_CONFIG.RANDOM_Y_OFFSET });
            localStorage.setItem('emotion.stickers.v1', JSON.stringify(list));
          } catch {
    /* noop */
  }
        }}
      />
      <WorldBanner
        visible={showWorldBanner}
        worldName={String(tCommon(effectiveWorld.nameKey))}
        colors={theme.colors}
        onClose={() => setShowWorldBanner(false)}
      />
    </div>
  );
}

