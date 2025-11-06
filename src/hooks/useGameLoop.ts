import { useCallback, useMemo, useState } from 'react';
import type { ExpressionSnapshot } from './useExpressionDetector';
import type { GameRound, World } from '@/game/levels';

export type GamePhase = 'idle' | 'prompt' | 'detecting' | 'success' | 'reward' | 'next' | 'completed' | 'paused';

export interface GameMetrics {
  roundIndex: number;
  streak: number;
  stars: number; // last round result 1-3
  xp: number; // total
  level: number; // derived from xp
  xpIntoLevel: number; // progress within current level
  xpToNext: number; // remaining xp to next level
}

export interface UseGameLoopOptions {
  world: World;
}

export function useGameLoop(options: UseGameLoopOptions) {
  const { world } = options;
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [roundIndex, setRoundIndex] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [xp, setXp] = useState<number>(0);
  const [lastStars, setLastStars] = useState<number>(0);

  const round: GameRound | null = useMemo(() => world.rounds[roundIndex] ?? null, [world, roundIndex]);

  // Simple, predictable leveling curve suitable for MVP:
  // Level 1 starts at 0 XP. XP required to advance from level N to N+1 is
  // base + (N-1)*increment. With base=50, increment=25, the thresholds are:
  // L2: 50, L3: 125, L4: 225, L5: 350, ...
  function computeLevelFromXp(totalXp: number): { level: number; xpIntoLevel: number; xpToNext: number } {
    const base = 50;
    const increment = 25;
    let currentLevel = 1;
    let thresholdToNext = base; // XP needed to go from level 1 -> 2
    let xpRemaining = totalXp;

    // Progress through levels while we have enough XP to clear the current threshold
    // Cap loop to a reasonable number of iterations for safety in case of very high XP
    for (let i = 0; i < 999 && xpRemaining >= thresholdToNext; i += 1) {
      xpRemaining -= thresholdToNext;
      currentLevel += 1;
      thresholdToNext = base + (currentLevel - 1 - 1) * increment; // for next transition
    }

    const xpIntoLevel = xpRemaining;
    const xpToNext = Math.max(0, thresholdToNext - xpRemaining);
    return { level: currentLevel, xpIntoLevel, xpToNext };
  }

  const start = useCallback(() => {
    setPhase('prompt');
    setRoundIndex(0);
    setStreak(0);
    setXp(0);
    setLastStars(0);
  }, []);

  const next = useCallback(() => {
    const nextIndex = roundIndex + 1;
    if (nextIndex >= world.rounds.length) {
      setPhase('completed');
    } else {
      setRoundIndex(nextIndex);
      setPhase('prompt');
    }
  }, [roundIndex, world.rounds.length]);

  const score = useCallback((timeMs: number, usedHint: boolean, extra?: { combo?: number; perfect?: boolean }) => {
    // Simple heuristic: faster → more stars
    let stars = 1;
    if (timeMs < 1500) stars = 3;
    else if (timeMs < 3000) stars = 2;
    if (usedHint) stars = Math.max(1, stars - 1);
    setLastStars(stars);
    const combo = Math.max(1, Math.floor(extra?.combo ?? 1));
    const perfect = !!extra?.perfect;
    const comboBonus = Math.min(10, Math.max(0, (combo - 1) * 2));
    const perfectBonus = perfect ? 5 : 0;
    const gained = 10 + Math.max(0, (stars - 1) * 3) + Math.min(streak * 2, 10) + comboBonus + perfectBonus;
    setXp(x => x + gained);
    setStreak(s => s + 1);
  }, [streak]);

  const fail = useCallback(() => {
    setStreak(0);
  }, []);

  const api = useMemo(() => {
    const { level, xpIntoLevel, xpToNext } = computeLevelFromXp(xp);
    return {
      phase,
      round,
      roundIndex,
      start,
      next,
      score,
      fail,
      metrics: { roundIndex, streak, stars: lastStars, xp, level, xpIntoLevel, xpToNext } as GameMetrics,
      setPhase,
    };
  }, [phase, round, roundIndex, start, next, score, fail, streak, lastStars, xp]);

  return api;
}







