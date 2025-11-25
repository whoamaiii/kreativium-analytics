import React, { memo, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn, clamp01 } from '@/lib/utils';
import { XPOrbsEmitter } from '@/components/game/XPOrbsEmitter';

interface XPProgressBarProps {
  progress: number; // 0..1 of current level
  xp: number;
  xpToNext: number;
  level: number;
  streak: number;
  pendingDelta?: number; // recent xp gain for micro-animations
  leveledUp?: boolean;
  disableParticles?: boolean;
  onLevelUp?: () => void;
  className?: string;
}

function XPProgressBarComponent({
  progress,
  xp,
  xpToNext,
  level,
  streak,
  pendingDelta = 0,
  leveledUp = false,
  disableParticles = false,
  onLevelUp,
  className,
}: XPProgressBarProps) {
  const reduced = useReducedMotion();
  const p = clamp01(Number.isFinite(progress) ? progress : 0);

  // Map progress to hue (blue→emerald)
  const hue = Math.round(210 + (150 - 210) * p);
  const glow = Math.min(
    0.9,
    0.15 + Math.max(0, streak) * 0.05 + Math.min(0.5, pendingDelta * 0.01),
  );
  const barColor = `hsl(${hue} 90% 55%)`;
  const trackColor = 'rgba(255,255,255,0.07)';

  const widthTarget = useMemo(() => `${Math.max(0, Math.min(100, p * 100))}%`, [p]);

  const orbsCount = useMemo(
    () => Math.max(0, Math.min(10, 2 + Math.floor((pendingDelta || 0) / 5))),
    [pendingDelta],
  );
  const showOrbs = !reduced && !disableParticles && (pendingDelta ?? 0) > 0;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-xs text-foreground/70">Level {level}</div>
        <div className="text-xs text-foreground/70">
          {xp} / {xpToNext} XP
        </div>
      </div>
      <div
        className="relative h-3 rounded-full"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={xpToNext}
        aria-valuenow={Math.max(0, Math.min(xpToNext, xp))}
        style={{
          background: trackColor,
          boxShadow: `0 0 0 1px rgba(255,255,255,0.05) inset, 0 0 16px rgba(16,185,129,${glow * 0.25})`,
        }}
      >
        <motion.div
          className="absolute left-0 top-0 bottom-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${barColor}, ${barColor})`,
            boxShadow: `0 0 14px ${barColor}`,
          }}
          initial={{ width: 0 }}
          animate={{ width: widthTarget }}
          transition={
            reduced ? { duration: 0.1 } : { type: 'spring', stiffness: 220, damping: 26, mass: 0.6 }
          }
        />
        {/* Level-up flash overlay (quick white wipe) */}
        <motion.div
          className="absolute left-0 top-0 bottom-0 rounded-full bg-white/60"
          initial={{ width: '0%' }}
          animate={{ width: leveledUp ? '100%' : '0%' }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{ mixBlendMode: 'overlay', pointerEvents: 'none' }}
        />
        {/* Orbs inject near the head of the bar */}
        <div className="absolute right-1 bottom-0 translate-y-1/2">
          <XPOrbsEmitter emit={showOrbs} count={orbsCount} intensity={clamp01(streak / 8)} />
        </div>
      </div>
    </div>
  );
}

export const XPProgressBar = memo(XPProgressBarComponent);
