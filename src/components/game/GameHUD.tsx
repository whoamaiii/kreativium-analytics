import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XPProgressBar } from '@/components/game/XPProgressBar';
import { useXPGainEffects } from '@/hooks/useXPGainEffects';

interface GameHUDProps {
  roundIndex: number;
  totalRounds: number;
  streak: number;
  xp: number;
  level: number;
  xpToNext: number;
}

export function GameHUD({ roundIndex, totalRounds, streak, xp, level, xpToNext }: GameHUDProps) {
  const { delta, leveledUp } = useXPGainEffects(xp, level);
  const progress = xpToNext > 0 ? Math.max(0, Math.min(1, xp / xpToNext)) : 0;
  // On extremely low FPS, disable particle orbs for stability.
  const disableParticles = false; // Placeholder; page could pass detector fps here later.
  return (
    <div className="w-full space-y-2 text-sm text-foreground/90">
      <div className="flex items-center gap-6">
        <HUDItem label="Runde" value={`${roundIndex + 1}/${totalRounds}`} />
        <HUDItem label="Streak" value={<AnimatedCount value={streak} />} />
        <HUDItem label="XP" value={<AnimatedCount value={xp} />} />
        <HUDItem label="Level" value={`${level} (↗ ${xpToNext} XP)`} />
      </div>
      <XPProgressBar
        progress={progress}
        xp={xp}
        xpToNext={xpToNext}
        level={level}
        streak={streak}
        pendingDelta={delta}
        leveledUp={leveledUp}
        disableParticles={disableParticles}
      />
    </div>
  );
}

function HUDItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-foreground/70">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function AnimatedCount({ value }: { value: number }) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={value}
        initial={{ y: 6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -6, opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}



