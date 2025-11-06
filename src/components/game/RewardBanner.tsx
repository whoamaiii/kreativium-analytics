import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface RewardBannerProps {
  visible: boolean;
  stars: number; // 1..3
  xpGained?: number;
}

export function RewardBanner({ visible, stars, xpGained }: RewardBannerProps) {
  const s = Math.max(1, Math.min(3, stars | 0));
  const items = Array.from({ length: s }, (_, i) => i);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 top-4 z-10"
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        >
          <div className="px-4 py-2 rounded-full bg-black/60 text-white shadow-lg backdrop-blur" role="status" aria-live="polite">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {items.map((i) => (
                  <motion.span
                    key={i}
                    initial={{ scale: 0.6, rotate: -10, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ delay: 0.05 * i, type: 'spring', stiffness: 400, damping: 14 }}
                    aria-label="star"
                    className="text-yellow-300"
                  >
                    ★
                  </motion.span>
                ))}
              </div>
              {typeof xpGained === 'number' && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm">
                  +{xpGained} XP
                </motion.span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}



