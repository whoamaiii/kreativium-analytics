import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';

interface TutorialOverlayProps {
  visible: boolean;
  onClose: () => void;
  steps?: Array<{ title: string; body: string }>;
}

export function TutorialOverlay({ visible, onClose, steps }: TutorialOverlayProps) {
  const { tCommon } = useTranslation();

  React.useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  const derived = steps ?? [
    {
      title: String(
        tCommon('game.tutorial.steps.enableCameraTitle', { defaultValue: '1. Enable camera' }),
      ),
      body: String(
        tCommon('game.tutorial.steps.enableCameraBody', {
          defaultValue: 'Allow camera access and center your face in the guide.',
        }),
      ),
    },
    {
      title: String(
        tCommon('game.tutorial.steps.matchTitle', { defaultValue: '2. Match the emotion' }),
      ),
      body: String(
        tCommon('game.tutorial.steps.matchBody', {
          defaultValue: 'Copy the target expression until the ring fills.',
        }),
      ),
    },
    {
      title: String(
        tCommon('game.tutorial.steps.celebrateTitle', { defaultValue: '3. Celebrate' }),
      ),
      body: String(
        tCommon('game.tutorial.steps.celebrateBody', {
          defaultValue: 'Earn stars and XP; streaks give bonus rewards.',
        }),
      ),
    },
  ];
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative z-10 max-w-xl mx-auto mt-16 rounded-2xl bg-background/95 border border-white/10 p-6 text-foreground shadow-2xl"
            initial={{ scale: 0.96, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 6, opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={String(tCommon('game.tutorial.title', { defaultValue: 'Tutorial' }))}
          >
            <h2 className="text-2xl font-bold mb-3">
              {String(tCommon('game.tutorial.title', { defaultValue: 'Quick tutorial' }))}
            </h2>
            <ol className="space-y-3 list-decimal pl-5">
              {derived.map((s, i) => (
                <li key={i}>
                  <div className="font-semibold">{s.title}</div>
                  <div className="text-sm text-muted-foreground">{s.body}</div>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex justify-end">
              <button
                className="rounded-md bg-white/10 px-4 py-2 hover:bg-white/15 transition"
                onClick={onClose}
              >
                {String(tCommon('game.tutorial.gotIt', { defaultValue: 'Got it' }))}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TutorialOverlay;
