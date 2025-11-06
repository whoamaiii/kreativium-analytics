import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';

interface AlmostThereHintProps {
  visible: boolean;
}

export function AlmostThereHint({ visible }: AlmostThereHintProps) {
  const { tCommon } = useTranslation();
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute right-4 bottom-24 text-xs px-2 py-1 rounded bg-amber-500/90 text-black"
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 8, opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {String(tCommon('game.mirror.almostThere'))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}




