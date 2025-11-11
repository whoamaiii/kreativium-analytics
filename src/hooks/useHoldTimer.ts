import { useCallback, useMemo, useRef, useState } from 'react';

export interface UseHoldTimerOptions {
  threshold: number; // required probability 0..1
  holdMs: number; // required continuous time in ms
}

export interface HoldState {
  progress: number; // 0..1
  isHolding: boolean;
  satisfied: boolean;
}

/**
 * Tracks continuous satisfaction of a predicate (prob≥threshold) over time.
 */
export function useHoldTimer(options: UseHoldTimerOptions) {
  const { threshold, holdMs } = options;
  const startRef = useRef<number | null>(null);
  const [state, setState] = useState<HoldState>({
    progress: 0,
    isHolding: false,
    satisfied: false,
  });

  const update = useCallback(
    (probability: number, now: number = performance.now()) => {
      const pass = probability >= threshold;
      let progress = 0;
      let isHolding = false;
      let satisfied = false;
      if (pass) {
        if (startRef.current === null) startRef.current = now;
        const elapsed = now - startRef.current;
        progress = Math.max(0, Math.min(1, elapsed / holdMs));
        isHolding = true;
        satisfied = progress >= 1;
      } else {
        startRef.current = null;
      }
      setState({ progress, isHolding, satisfied });
      return { progress, isHolding, satisfied };
    },
    [threshold, holdMs],
  );

  const reset = useCallback(() => {
    startRef.current = null;
    setState({ progress: 0, isHolding: false, satisfied: false });
  }, []);

  return useMemo(() => ({ state, update, reset }), [state, update, reset]);
}
