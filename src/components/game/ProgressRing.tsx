import React from 'react';

interface ProgressRingProps {
  size?: number;
  stroke?: number;
  progress: number; // 0..1
  trackColor?: string;
  progressColor?: string;
}

export function ProgressRing({
  size = 120,
  stroke = 10,
  progress,
  trackColor = 'rgba(255,255,255,0.2)',
  progressColor = 'rgb(34,197,94)',
}: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = Math.max(0, Math.min(1, progress)) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`progresjon ${(progress * 100).toFixed(0)}%`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={trackColor}
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={progressColor}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
