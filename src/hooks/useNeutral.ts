import { useMemo } from 'react';
import { useExpressionDetector } from '@/hooks/useExpressionDetector';

export interface NeutralSnapshot {
  isNeutral: boolean;
  stability: number; // 0..1
  intensity: number; // 0..1 (how far from neutral)
}

export function useNeutral(videoRef: React.RefObject<HTMLVideoElement>): NeutralSnapshot {
  const snap = useExpressionDetector(videoRef, { scoreThreshold: 0.5, smoothingWindow: 8 });
  return useMemo(() => {
    const neutralProb = snap.probabilities?.neutral ?? 0;
    const stability = Math.max(0, Math.min(1, neutralProb));
    const intensity = Math.max(0, Math.min(1, 1 - neutralProb));
    const isNeutral = snap.topLabel === 'neutral' && neutralProb >= 0.6;
    return { isNeutral, stability, intensity };
  }, [snap.probabilities, snap.topLabel]);
}
