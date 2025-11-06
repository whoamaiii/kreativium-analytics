import { useEffect, useState } from 'react';

export interface CelebrationState {
  ringMorph: boolean;
  starsPop: boolean;
  bannerVisible: boolean;
  confetti: boolean;
}

export function useCelebrations(trigger: boolean) {
  const [state, setState] = useState<CelebrationState>({ ringMorph: false, starsPop: false, bannerVisible: false, confetti: false });

  useEffect(() => {
    if (!trigger) {
      // Avoid infinite update loops by only updating when a change is needed
      setState(prev => {
        if (prev.ringMorph || prev.starsPop || prev.bannerVisible || prev.confetti) {
          return { ringMorph: false, starsPop: false, bannerVisible: false, confetti: false };
        }
        return prev; // no-op if already reset
      });
      return;
    }
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t1 = window.setTimeout(() => setState(s => ({ ...s, ringMorph: true })), 0);
    const t2 = window.setTimeout(() => setState(s => ({ ...s, starsPop: true })), prefersReduced ? 0 : 120);
    const t3 = window.setTimeout(() => setState(s => ({ ...s, bannerVisible: true })), prefersReduced ? 0 : 180);
    const t4 = window.setTimeout(() => setState(s => ({ ...s, confetti: true })), prefersReduced ? 0 : 220);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.clearTimeout(t3); window.clearTimeout(t4); };
  }, [trigger]);

  return state;
}






