import { useEffect, useRef, useState } from 'react';

/**
 * Detects positive XP deltas and level-up edges between renders.
 * Returns a short-lived delta for micro-animations and a boolean level-up flag.
 */
export function useXPGainEffects(xp: number, level: number): { delta: number; leveledUp: boolean } {
  const prevXpRef = useRef<number>(xp);
  const prevLevelRef = useRef<number>(level);
  const [delta, setDelta] = useState<number>(0);
  const [leveled, setLeveled] = useState<boolean>(false);
  const lastEmitKeyRef = useRef<string>(`${level}:${xp}`);

  useEffect(() => {
    // Read previous values synchronously and update refs BEFORE setting state.
    const prevXp = prevXpRef.current;
    const prevLevel = prevLevelRef.current;
    const d = Math.max(0, xp - (prevXp ?? 0));
    const didLevelUp = level > (prevLevel ?? 0);
    prevXpRef.current = xp;
    prevLevelRef.current = level;

    const emitKey = `${level}:${xp}`;
    if ((d > 0 || didLevelUp) && lastEmitKeyRef.current !== emitKey) {
      lastEmitKeyRef.current = emitKey;
      setDelta(d);
      setLeveled(didLevelUp);
      const id = window.setTimeout(() => setDelta(0), 600);
      return () => window.clearTimeout(id);
    }
    // Only update when needed to avoid unnecessary renders
    if (leveled) setLeveled(false);
  }, [xp, level, leveled]);

  return { delta, leveledUp: leveled };
}
