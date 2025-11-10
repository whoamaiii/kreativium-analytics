import React from 'react';

interface BreathCircleProps {
  phaseMs?: number; // length of inhale/exhale
  size?: number;
}

export function BreathCircle({ phaseMs = 3000, size = 160 }: BreathCircleProps) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    animation: `breath ${phaseMs}ms ease-in-out infinite alternate`,
  };
  return (
    <div className="flex items-center justify-center">
      <div className="rounded-full bg-gradient-primary/40" style={style} />
      <style>{`@keyframes breath { from { transform: scale(0.85) } to { transform: scale(1.05) } }`}</style>
    </div>
  );
}
