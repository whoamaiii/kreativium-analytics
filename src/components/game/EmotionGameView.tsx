import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AnimatedProgressRing } from '@/components/game/AnimatedProgressRing';
import { PhaseGlow } from '@/components/game/PhaseGlow';
import { GameHUD } from '@/components/game/GameHUD';
import { ConfettiBurst } from '@/components/game/ConfettiBurst';
import { RewardBanner } from '@/components/game/RewardBanner';
import { LevelUpModal } from '@/components/game/LevelUpModal';
import { StickerBook } from '@/components/game/StickerBook';
import { ThemeSwitch } from '@/components/game/ThemeSwitch';
import { ModeSelector } from '@/components/game/ModeSelector';
import { WorldBanner } from '@/components/game/WorldBanner';
import { ScanSweep } from '@/components/game/ScanSweep';
import { AlmostThereHint } from '@/components/game/AlmostThereHint';
import { TutorialOverlay } from '@/components/game/TutorialOverlay';
import { CalibrationOverlay } from '@/components/game/CalibrationOverlay';
import { ConfidencePrompt } from '@/components/game/ConfidencePrompt';
import { RoundSummaryCard } from '@/components/game/RoundSummaryCard';
import { CalibrationErrorSparkline } from '@/components/game/CalibrationErrorSparkline';
import { MatchMeter } from '@/components/game/MatchMeter';
import { HintHeatmapOverlay } from '@/components/game/HintHeatmapOverlay';
import { PracticeSelector } from '@/components/game/PracticeSelector';
import { SessionSummary } from '@/components/game/SessionSummary';
import { TodayProgressStrip } from '@/components/game/TodayProgressStrip';
import type { GamePhase, GameMetrics } from '@/hooks/useGameLoop';
import type { ExpressionKey, World, GameRound } from '@/game/levels';
import type { DetectorSnapshot } from '@/detector/types';
import type { TodayEmotionProgress } from '@/hooks/useTodayEmotionProgress';
import type { EffectParams } from '@/lib/effects/effect-engine';
import { useTranslation } from '@/hooks/useTranslation';
import {
  GAME_SCORING,
  GAME_DIFFICULTY,
  EFFECT_CONFIG,
  STICKER_CONFIG,
} from '@/config/gameConfig';

export interface EmotionGameViewProps {
  phase: GamePhase;
  roundTarget: ExpressionKey;
  round: GameRound | null;
  roundIndex: number;
  metricsSnapshot: GameMetrics;
  effectiveWorld: World;
  detector: DetectorSnapshot;
  videoRef: React.RefObject<HTMLVideoElement>;
  cameraStarting: boolean;

  // Game state controller (for modals and round state)
  gameState: {
    state: any;
    showModal: (modal: any) => void;
    hideModal: (modal: any) => void;
    resetDifficultyStreak: () => void;
    useHint: () => void;
    canUseHint: boolean;
  };

  themeId: 'regnbueland' | 'rom';
  setThemeId: (id: 'regnbueland' | 'rom') => void;
  mode: any;
  setMode: (mode: any) => void;
  practice: any;
  setPractice: (practice: any) => void;

  onStartCamera: () => void;
  onStopCamera: () => void;
  onAdvanceRound: () => void;
  onSetGamePhase: (phase: GamePhase) => void;

  holdProgress: number;
  todayProgress: TodayEmotionProgress;
  sessionStartTs: number | null;

  levelUpVisible: boolean;
  setLevelUpVisible: (visible: boolean) => void;

  confidenceValue: number;
  setConfidenceValue: (value: number) => void;
  showSummary: {
    visible: boolean;
    timeMs: number;
    stabilityMs?: number;
    intensity?: number;
    actualProb?: number;
  } | null;
  setShowSummary: React.Dispatch<
    React.SetStateAction<{
      visible: boolean;
      timeMs: number;
      stabilityMs?: number;
      intensity?: number;
      actualProb?: number;
    } | null>
  >;

  celebrationConfetti: boolean;
  effectParams: EffectParams;
  particleMin: number;
  particleMax: number;
  themeColors: string[];
  lastPerfect: boolean;

  setTutorialSeen: (seen: boolean) => void;
  setWorldIndex: React.Dispatch<React.SetStateAction<number>>;
  startGame: () => void;
  setStickers: React.Dispatch<
    React.SetStateAction<
      Array<{
        id: string;
        x: number;
        y: number;
      }>
    >
  >;
}

export function EmotionGameView({
  phase,
  roundTarget,
  round,
  roundIndex,
  metricsSnapshot,
  effectiveWorld,
  detector,
  videoRef,
  cameraStarting,
  gameState,
  themeId,
  setThemeId,
  mode,
  setMode,
  practice,
  setPractice,
  onStartCamera,
  onStopCamera,
  onAdvanceRound,
  onSetGamePhase,
  holdProgress,
  todayProgress,
  sessionStartTs,
  levelUpVisible,
  setLevelUpVisible,
  confidenceValue,
  setConfidenceValue,
  showSummary,
  setShowSummary,
  celebrationConfetti,
  effectParams,
  particleMin,
  particleMax,
  themeColors,
  lastPerfect,
  setTutorialSeen,
  setWorldIndex,
  startGame,
  setStickers,
}: EmotionGameViewProps) {
  const { tCommon } = useTranslation();
  const targetLabel = roundTarget;
  const targetText = tCommon(`emotionLab.expressions.${targetLabel}`);

  return (
    <div className="main-container min-h-screen p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            {String(tCommon('game.title', { defaultValue: 'Følelsesspill' }))}
          </h1>
          <div className="flex items-center gap-2">
            {gameState.state.detector.cameraActive ? (
              <Button variant="destructive" onClick={onStopCamera}>
                {String(tCommon('tegn.cameraDisable'))}
              </Button>
            ) : (
              <Button
                variant="default"
                onClick={onStartCamera}
                disabled={cameraStarting}
              >
                {String(tCommon('tegn.cameraEnable'))}
              </Button>
            )}
            <ThemeSwitch
              themeId={themeId}
              onChange={(id) => {
                setThemeId(id);
              }}
            />
            <Button
              variant="outline"
              onClick={() => {
                gameState.showModal('showTutorial');
              }}
            >
              {String(tCommon('buttons.help', { defaultValue: 'Help' }))}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                gameState.resetDifficultyStreak();
              }}
            >
              {String(tCommon('game.streakReset', { defaultValue: 'Reset streak' }))}
            </Button>
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
            <PracticeSelector value={practice} onChange={setPractice} />
          </div>
        </div>

        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <div className="text-foreground/80 text-sm">{String(tCommon('game.target'))}</div>
              <div className="text-5xl" aria-live="polite">
                {targetText}
              </div>
              {mode === 'mirror' && (
                <MatchMeter
                  value={(detector.probabilities as Record<string, number>)[roundTarget] ?? 0}
                />
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={!gameState.canUseHint}
                  onClick={() => {
                    if (!gameState.canUseHint) return;
                    gameState.useHint();
                    try {
                      // Hint usage is already recorded elsewhere; this keeps UI responsive.
                    } catch {
                      /* noop */
                    }
                  }}
                >
                  {String(
                    tCommon('game.hintCount', { count: gameState.state.round.hints.remaining }),
                  )}
                </Button>
                <Button variant="outline" onClick={() => onSetGamePhase('paused')}>
                  {String(tCommon('game.pause'))}
                </Button>
                <Button variant="outline" onClick={onAdvanceRound}>
                  {String(tCommon('game.skip'))}
                </Button>
              </div>
              {/* Timer and combo display */}
              <div className="text-sm text-foreground/70">
                {gameState.state.round.timerActive && (
                  <span>
                    {String(tCommon('roundSummary.time'))}:{' '}
                    {Math.ceil(gameState.state.round.roundTimerMs / 1000)}
                    {String(tCommon('game.secondsShort'))}
                  </span>
                )}{' '}
                {gameState.state.round.combo > 1 && (
                  <span className="ml-3">
                    {String(tCommon('game.comboLabel', { count: gameState.state.round.combo }))}
                  </span>
                )}
              </div>
              <div id="round-live" className="sr-only" aria-live="polite" />
            </div>
            <PhaseGlow phase={phase} className="relative">
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-auto rounded-lg"
                  playsInline
                  muted
                  autoPlay
                  aria-label={String(tCommon('tegn.cameraAssistActive'))}
                />
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
                {cameraStarting && !detector.ready && (
                  <div className="absolute left-4 bottom-4 rounded bg-black/70 text-xs text-white px-2 py-1">
                    {String(
                      tCommon('game.cameraStarting', {
                        defaultValue: 'Starter kamera…',
                      }),
                    )}
                  </div>
                )}
                {/* Fixed progress ring in the corner for stable visuals */}
                <div className="absolute right-4 bottom-4 pointer-events-none">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{
                      opacity: detector.ready && phase === 'detecting' ? 1 : 0,
                      scale: detector.ready && phase === 'detecting' ? 1 : 0.98,
                    }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    <AnimatedProgressRing size={96} stroke={8} progress={holdProgress} />
                  </motion.div>
                </div>
                {/* Reward banner near camera */}
                <RewardBanner
                  visible={phase === 'reward'}
                  stars={metricsSnapshot.stars || 1}
                  xpGained={
                    metricsSnapshot.stars
                      ? GAME_SCORING.XP_BASE +
                        Math.max(0, (metricsSnapshot.stars - 1) * GAME_SCORING.XP_STAR_MULTIPLIER) +
                        Math.min(
                          metricsSnapshot.streak * GAME_SCORING.XP_STREAK_MULTIPLIER,
                          GAME_SCORING.XP_STREAK_MAX_BONUS,
                        )
                      : undefined
                  }
                />
                <AlmostThereHint
                  visible={
                    phase === 'detecting' &&
                    !!round &&
                    ((detector.probabilities as Record<string, number>)[roundTarget] ?? 0) >=
                      (round.threshold ?? GAME_DIFFICULTY.DEFAULT_THRESHOLD) * 0.8
                  }
                />
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
        <TodayProgressStrip
          neutralHolds={todayProgress.neutralHolds}
          correctChoices={todayProgress.correctChoices}
          nameItCorrect={todayProgress.nameItCorrect}
          streak={todayProgress.streak}
        />
        <SessionSummary startTs={sessionStartTs ?? undefined} />
        <LevelUpModal
          visible={levelUpVisible}
          level={metricsSnapshot.level}
          onClose={() => setLevelUpVisible(false)}
        />
      </div>
      <StickerBook visible={gameState.state.modals.showStickerBook} />
      <ConfidencePrompt
        visible={gameState.state.modals.showConfidencePrompt && mode === 'confidence'}
        value={confidenceValue}
        onChange={setConfidenceValue}
        onSubmit={() => {
          gameState.hideModal('showConfidencePrompt');
          const actualProb = showSummary?.actualProb ?? 0;
          const calibrationError = Math.abs(confidenceValue - actualProb);
          try {
            // Confidence events are already recorded elsewhere; avoid duplicating.
          } catch {
            /* noop */
          }
          setShowSummary((s) => (s ? { ...s, visible: true } : { visible: true, timeMs: 0 }));
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
          onSetGamePhase('reward');
        }}
      />
      <TutorialOverlay
        visible={gameState.state.modals.showTutorial}
        onClose={() => {
          setTutorialSeen(true);
          gameState.hideModal('showTutorial');
        }}
      />
      <CalibrationOverlay
        visible={gameState.state.modals.showCalibration}
        neutralProb={(detector.probabilities as Record<string, number>)['neutral'] ?? 0}
        onClose={() => gameState.hideModal('showCalibration')}
      />
      {/* Full-screen success confetti overlay */}
      {celebrationConfetti && (
        <ConfettiBurst
          active
          className="fixed inset-0 pointer-events-none z-40"
          origin={{ x: 0.5, y: 0.5 }}
          spreadDeg={360}
          speed={1.0 + effectParams.glowStrength * EFFECT_CONFIG.CONFETTI_SPEED_MULTIPLIER}
          particles={Math.max(particleMin, Math.min(particleMax, effectParams.particleCount))}
          colors={themeColors}
        />
      )}
      {lastPerfect && (
        <ConfettiBurst
          active={celebrationConfetti}
          className="fixed inset-0 pointer-events-none z-40"
          origin={{ x: 0.5, y: 0.5 }}
          spreadDeg={360}
          speed={EFFECT_CONFIG.PERFECT_CONFETTI_SPEED}
          particles={Math.max(
            particleMin + EFFECT_CONFIG.PERFECT_CONFETTI_PARTICLE_ADDITION,
            Math.min(
              particleMax,
              Math.floor(effectParams.particleCount * EFFECT_CONFIG.PERFECT_CONFETTI_PARTICLE_MULTIPLIER),
            ),
          )}
          colors={['#ff004c', '#ff7a00', '#ffd400', '#7dff00', '#00e0ff', '#5b5bff', '#d05bff']}
        />
      )}
      <LevelCompleteModal
        visible={gameState.state.modals.showLevelComplete}
        onClose={() => gameState.hideModal('showLevelComplete')}
        onNext={() => {
          gameState.hideModal('showLevelComplete');
          setWorldIndex((i) => Math.min(effectiveWorld.rounds.length - 1, i + 1));
          gameState.showModal('showWorldBanner');
          startGame();
        }}
        onReplay={() => {
          gameState.hideModal('showLevelComplete');
          startGame();
        }}
        onFreePlay={() => {
          gameState.hideModal('showLevelComplete');
          gameState.showModal('showStickerBook');
        }}
        onPayout={(stickerId) => {
          setStickers((prev) => [
            ...prev,
            {
              id: stickerId,
              x: Math.random() * STICKER_CONFIG.RANDOM_X_RANGE + STICKER_CONFIG.RANDOM_X_OFFSET,
              y: Math.random() * STICKER_CONFIG.RANDOM_Y_RANGE + STICKER_CONFIG.RANDOM_Y_OFFSET,
            },
          ]);
        }}
      />
      <WorldBanner
        visible={gameState.state.modals.showWorldBanner}
        worldName={String(tCommon(effectiveWorld.nameKey))}
        colors={themeColors}
        onClose={() => gameState.hideModal('showWorldBanner')}
      />
    </div>
  );
}


