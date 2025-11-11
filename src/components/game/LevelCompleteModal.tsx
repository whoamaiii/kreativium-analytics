import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ConfettiBurst } from '@/components/game/ConfettiBurst';
import { StickerMachine } from '@/components/game/StickerMachine';
import { playLevelUpFanfare } from '@/lib/sound';
import { useTranslation } from '@/hooks/useTranslation';

interface LevelCompleteModalProps {
  visible: boolean;
  onClose?: () => void;
  onNext?: () => void;
  onReplay?: () => void;
  onFreePlay?: () => void;
  onPayout?: (stickerId: string) => void;
}

export function LevelCompleteModal({
  visible,
  onClose,
  onNext,
  onReplay,
  onFreePlay,
  onPayout,
}: LevelCompleteModalProps) {
  const { tCommon } = useTranslation();
  useEffect(() => {
    if (!visible) return;
    try {
      playLevelUpFanfare(0.18);
    } catch {}
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <ConfettiBurst
            active={true}
            durationMs={1500}
            particles={220}
            className="absolute inset-0"
          />
          <motion.div
            className="relative z-10 w-[min(94vw,560px)] rounded-3xl bg-gradient-to-b from-[#150b2e] to-[#0d0a16] border border-white/10 p-6 text-center text-white shadow-2xl"
            initial={{ scale: 0.9, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            role="dialog"
            aria-modal="true"
            aria-label={String(tCommon('game.complete.title', { defaultValue: 'Nivå fullført!' }))}
          >
            <div className="text-4xl font-extrabold tracking-tight">
              {String(tCommon('game.complete.title', { defaultValue: 'Nivå fullført!' }))}
            </div>
            <div className="mt-2 text-foreground/80">
              {String(
                tCommon('game.complete.desc', {
                  defaultValue: 'Bra jobbet! Hent premien din og velg hva du vil gjøre videre.',
                }),
              )}
            </div>

            <div className="mt-4">
              <StickerMachine visible={true} onPayout={onPayout} />
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                className="rounded-xl bg-white/10 hover:bg-white/15 px-4 py-3 transition"
                onClick={onNext}
              >
                {String(tCommon('game.complete.next', { defaultValue: 'Neste nivå' }))}
              </button>
              <button
                className="rounded-xl bg-white/10 hover:bg-white/15 px-4 py-3 transition"
                onClick={onReplay}
              >
                {String(tCommon('game.complete.replay', { defaultValue: 'Øv igjen' }))}
              </button>
              <button
                className="rounded-xl bg-white/10 hover:bg-white/15 px-4 py-3 transition"
                onClick={onFreePlay}
              >
                {String(tCommon('game.complete.free', { defaultValue: 'Frilek' }))}
              </button>
            </div>
            <button className="mt-5 text-sm text-white/70 hover:text-white" onClick={onClose}>
              {String(tCommon('buttons.close'))}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LevelCompleteModal;
