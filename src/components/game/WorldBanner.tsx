import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ConfettiBurst } from '@/components/game/ConfettiBurst';
import { useTranslation } from '@/hooks/useTranslation';

interface WorldBannerProps {
  visible: boolean;
  worldName: string;
  colors?: string[];
  onClose?: () => void;
}

export function WorldBanner({ visible, worldName, colors, onClose }: WorldBannerProps) {
  const { tCommon } = useTranslation();
  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => onClose?.(), 2200);
    return () => window.clearTimeout(id);
  }, [visible, onClose]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-40"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
        >
          <ConfettiBurst
            active={true}
            durationMs={1200}
            particles={120}
            className="absolute -inset-6 pointer-events-none"
            colors={colors}
          />
          <div className="relative rounded-2xl px-5 py-3 bg-white/10 border border-white/15 backdrop-blur text-white shadow-lg">
            <div className="text-sm uppercase tracking-wide text-white/80">
              {String(tCommon('game.newWorld', { defaultValue: 'Ny verden' }))}
            </div>
            <div className="text-lg font-bold">{worldName}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default WorldBanner;
