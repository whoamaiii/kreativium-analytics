import React from 'react';

interface IntensityRingProps {
  size?: number;
  stroke?: number;
  progress: number; // 0..1
  star?: boolean;
}

export function IntensityRing({ size = 112, stroke = 10, progress, star = true }: IntensityRingProps) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = Math.max(0, Math.min(circ, circ * progress));
  return (
    <div style={{ width: size, height: size }} className="relative">
      <svg width={size} height={size} className="block">
        <defs>
          <linearGradient id="igrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="50%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={radius} stroke="#ffffff22" strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={radius} stroke="url(#igrad)" strokeLinecap="round" strokeWidth={stroke}
          fill="none" strokeDasharray={`${dash} ${circ - dash}`} transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      {star && progress >= 1 && (
        <div className="absolute inset-0 grid place-items-center text-2xl">✨</div>
      )}
    </div>
  );
}

export default IntensityRing;






