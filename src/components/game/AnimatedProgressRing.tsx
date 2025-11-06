import React, { useMemo } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedProgressRingProps {
  size?: number;
  stroke?: number;
  progress: number; // 0..1
  trackColor?: string;
  progressColorFrom?: string;
  progressColorTo?: string;
  showCheckWhenComplete?: boolean;
  className?: string;
}

/**
 * AnimatedProgressRing
 * - Drop-in replacement for ProgressRing with springy fill animation
 * - Optional checkmark draws when progress reaches 1
 */
export function AnimatedProgressRing({
  size = 120,
  stroke = 10,
  progress,
  trackColor = 'rgba(255,255,255,0.22)',
  progressColorFrom = 'rgb(59,130,246)', // blue-500
  progressColorTo = 'rgb(34,197,94)', // green-500
  showCheckWhenComplete = true,
  className,
}: AnimatedProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const dashSpring = useSpring(clamped * circumference, {
    stiffness: 240,
    damping: 28,
    mass: 0.6,
  });
  const dashArray = useTransform(dashSpring, (d) => `${d} ${Math.max(0, circumference - d)}`);

  // Animate color across the progress range using an inline transition; we keep it simple
  const strokeColor = useMemo(() => (clamped >= 0.85 ? progressColorTo : progressColorFrom), [clamped, progressColorFrom, progressColorTo]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`progress ${(clamped * 100).toFixed(0)}%`} className={className}>
      <circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={stroke} fill="none" />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={strokeColor}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ strokeDasharray: dashArray }}
      />
      {showCheckWhenComplete && clamped >= 1 && (
        <motion.path
          d={buildCheckPath(size)}
          stroke={progressColorTo}
          strokeWidth={Math.max(2, stroke * 0.6)}
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      )}
    </svg>
  );
}

function buildCheckPath(size: number): string {
  const r = size / 2;
  const startX = r - size * 0.18;
  const startY = r + size * 0.02;
  const midX = r - size * 0.02;
  const midY = r + size * 0.18;
  const endX = r + size * 0.22;
  const endY = r - size * 0.18;
  return `M ${startX} ${startY} L ${midX} ${midY} L ${endX} ${endY}`;
}

export default AnimatedProgressRing;




