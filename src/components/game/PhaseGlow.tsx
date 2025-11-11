import React from 'react';
import type { GamePhase } from '@/hooks/useGameLoop';
import { cn } from '@/lib/utils';

interface PhaseGlowProps extends React.HTMLAttributes<HTMLDivElement> {
  phase: GamePhase;
  children: React.ReactNode;
}

export function PhaseGlow({ phase, className, children, ...rest }: PhaseGlowProps) {
  const glow = phaseToGlow(phase);
  return (
    <div
      className={cn('relative rounded-lg transition-shadow duration-500 ease-out', className)}
      {...rest}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-lg blur-md opacity-70 transition-all duration-500 motion-reduce:duration-0"
        style={{ boxShadow: `0 0 0.75rem 0.15rem ${glow}` }}
      />
      <div className="relative rounded-lg">{children}</div>
    </div>
  );
}

function phaseToGlow(phase: GamePhase): string {
  switch (phase) {
    case 'detecting':
      return 'rgba(59,130,246,0.35)'; // blue
    case 'success':
    case 'reward':
      return 'rgba(34,197,94,0.45)'; // green
    case 'paused':
      return 'rgba(148,163,184,0.35)'; // slate-400
    default:
      return 'rgba(120,113,108,0.25)'; // neutral
  }
}
