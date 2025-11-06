import { useRef, useEffect } from 'react';
import { useDetector } from '@/hooks/useDetector';
import { DETECTOR_CONFIG } from '@/config/gameConfig';

interface UseEmotionDetectorProps {
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const useEmotionDetector = ({ videoRef }: UseEmotionDetectorProps) => {
  const detector = useDetector(videoRef, {
    smoothingWindow: DETECTOR_CONFIG.SMOOTHING_WINDOW,
    scoreThreshold: DETECTOR_CONFIG.SCORE_THRESHOLD,
    targetFps: DETECTOR_CONFIG.TARGET_FPS,
  });

  return {
    probabilities: detector.probabilities,
    fps: detector.fps,
    topLabel: detector.topLabel,
    topProbability: detector.topProbability,
    ready: detector.ready,
    box: detector.box,
  };
};
