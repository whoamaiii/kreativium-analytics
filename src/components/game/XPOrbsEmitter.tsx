import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface XPOrbsEmitterProps {
  emit: boolean;
  count: number; // recommended 3..10
  intensity: number; // 0..1 scales size/brightness
  className?: string;
}

export function XPOrbsEmitter({ emit, count, intensity, className }: XPOrbsEmitterProps) {
  const reduced = useReducedMotion();
  const n = Math.max(0, Math.min(16, Math.floor(count)));
  const items = useMemo(() => Array.from({ length: n }, (_, i) => i), [n]);
  if (reduced || !emit || n === 0) return null;

  return (
    <div className={cn('relative pointer-events-none select-none', className)} aria-hidden="true">
      {items.map((i) => {
        const delay = 0.06 * i;
        const dur = 0.4 + 0.08 * (i % 3);
        const dx = 20 + i * 6;
        const dy = -8 - (i % 4) * 4;
        const s = 6 + Math.min(10, intensity * 10) - (i % 3);
        const alpha = 0.35 + Math.min(0.5, intensity * 0.6);
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
            animate={{ opacity: [0, alpha, 0], x: dx, y: dy, scale: 1 }}
            transition={{ duration: dur, delay, ease: 'easeOut' }}
            className="absolute rounded-full"
            style={{
              width: s,
              height: s,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle, rgba(255,255,255,0.9), rgba(59,130,246,0.0))',
              boxShadow: '0 0 10px rgba(59,130,246,0.6)',
            }}
          />
        );
      })}
    </div>
  );
}

export default XPOrbsEmitter;
