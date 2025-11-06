import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ConfettiBurst } from '@/components/game/ConfettiBurst';
import { playLevelUpFanfare } from '@/lib/sound';

interface LevelUpModalProps {
  visible: boolean;
  level: number;
  onClose?: () => void;
}

export function LevelUpModal({ visible, level, onClose }: LevelUpModalProps) {
  useEffect(() => {
    if (!visible) return;
    // One-shot side-effect; no state updates here beyond sound
    try { playLevelUpFanfare(0.16); } catch {}
  }, [visible]);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="fixed inset-0 z-40 grid place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          {/* Avoid strict-mode hook reorder: render only when visible via parent gating */}
          <ConfettiBurst active durationMs={1200} particles={140} className="absolute inset-0" />
          <motion.div
            className="relative z-10 w-[min(92vw,480px)] rounded-2xl bg-gradient-to-b from-[#0b1220] to-[#0a0d14] border border-white/10 p-6 text-center text-white shadow-2xl"
            initial={{ scale: 0.9, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            role="dialog"
            aria-modal="true"
            aria-label="Level up"
          >
            <div className="text-3xl font-bold">Level {level}</div>
            <div className="mt-2 text-foreground/80">Ny bonus låst opp!</div>
            <button className="mt-5 rounded-md bg-white/10 px-4 py-2 hover:bg-white/15 transition" onClick={onClose}>Fortsett</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LevelUpModal;









