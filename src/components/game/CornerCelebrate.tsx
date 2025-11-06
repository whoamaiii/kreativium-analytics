import React from 'react';
import { ConfettiBurst } from '@/components/game/ConfettiBurst';
import XPOrbsEmitter from '@/components/game/XPOrbsEmitter';

interface CornerCelebrateProps {
  active: boolean;
  themeColors?: string[];
}

/**
 * Renders lightweight celebration effects anchored to corners of the screen.
 * Combines ConfettiBurst and XP orbs for a richer celebration without heavy cost.
 */
export function CornerCelebrate({ active, themeColors }: CornerCelebrateProps) {
  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-40" aria-hidden>
      <div className="absolute left-0 top-0 w-1/3 h-1/3">
        <ConfettiBurst active origin={{ x: 0.1, y: 0.1 }} spreadDeg={160} speed={1.2} colors={themeColors} />
      </div>
      <div className="absolute right-0 top-0 w-1/3 h-1/3">
        <ConfettiBurst active origin={{ x: 0.9, y: 0.1 }} spreadDeg={160} speed={1.2} colors={themeColors} />
      </div>
      <div className="absolute left-0 bottom-0 w-1/3 h-1/3">
        <ConfettiBurst active origin={{ x: 0.1, y: 0.9 }} spreadDeg={200} speed={1.0} colors={themeColors} />
        <div className="absolute left-2 bottom-2">
          <XPOrbsEmitter emit count={6} intensity={0.8} />
        </div>
      </div>
      <div className="absolute right-0 bottom-0 w-1/3 h-1/3">
        <ConfettiBurst active origin={{ x: 0.9, y: 0.9 }} spreadDeg={200} speed={1.0} colors={themeColors} />
        <div className="absolute right-2 bottom-2">
          <XPOrbsEmitter emit count={6} intensity={0.8} />
        </div>
      </div>
    </div>
  );
}

export default CornerCelebrate;


