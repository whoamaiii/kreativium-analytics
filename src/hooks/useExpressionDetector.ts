import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';

export interface DetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExpressionSnapshot {
  topLabel: string; // face-api key
  topProbability: number; // 0..1
  probabilities: Record<string, number>;
  box: DetectionBox | null;
  fps: number;
  ready: boolean; // models loaded
}

export interface UseExpressionDetectorOptions {
  modelBaseUrl?: string; // defaults to '/models'
  scoreThreshold?: number; // tiny face detector threshold
  smoothingWindow?: number; // frames to smooth top label
}

/**
 * useExpressionDetector
 * - Loads tiny face detector + expression model from /models
 * - Detects expressions on rAF and returns smoothed top label + box
 */
export function useExpressionDetector(
  videoRef: React.RefObject<HTMLVideoElement>,
  options: UseExpressionDetectorOptions = {},
): ExpressionSnapshot {
  const modelBaseUrl = options.modelBaseUrl ?? '/models';
  const scoreThreshold = options.scoreThreshold ?? 0.5;
  const smoothingWindow = Math.max(1, Math.min(20, options.smoothingWindow ?? 8));

  const [snapshot, setSnapshot] = useState<ExpressionSnapshot>({
    topLabel: 'neutral',
    topProbability: 0,
    probabilities: {},
    box: null,
    fps: 0,
    ready: false,
  });

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const bufferRef = useRef<string[]>([]);
  const initializedRef = useRef<boolean>(false);

  const ensureModels = useCallback(async () => {
    if (initializedRef.current) return true;
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri(modelBaseUrl);
      await faceapi.nets.faceExpressionNet.loadFromUri(modelBaseUrl);
      initializedRef.current = true;
      setSnapshot((s) => ({ ...s, ready: true }));
      return true;
    } catch (error) {
      setSnapshot((s) => ({ ...s, ready: false }));
      return false;
    }
  }, [modelBaseUrl]);

  const detect = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    if (!initializedRef.current) return;

    // Ensure the video element has current frame data before running detection
    // HAVE_CURRENT_DATA (2) is sufficient and avoids running on a 0x0 stream
    const hasFrameData =
      (video.readyState ?? 0) >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
    if (!hasFrameData) return;

    const results = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold }))
      .withFaceExpressions();

    let largest: { area: number; box: faceapi.Box; expressions: faceapi.FaceExpressions } | null =
      null;
    for (const r of results ?? []) {
      const a = r.detection.box.width * r.detection.box.height;
      if (!largest || a > largest.area) {
        largest = { area: a, box: r.detection.box, expressions: r.expressions };
      }
    }

    let box: DetectionBox | null = null;
    let probabilities: Record<string, number> = {};
    let topLabel = 'neutral';
    let topProbability = 0;

    if (largest) {
      const b = largest.box;
      box = { x: b.x, y: b.y, width: b.width, height: b.height };
      probabilities = largest.expressions as unknown as Record<string, number>;
      for (const [k, v] of Object.entries(probabilities)) {
        if (v > topProbability) {
          topProbability = v;
          topLabel = k;
        }
      }
    }

    // smoothing by majority over last N frames
    const buffer = bufferRef.current;
    buffer.push(topLabel);
    if (buffer.length > smoothingWindow) buffer.shift();
    const counts = new Map<string, number>();
    for (const k of buffer) counts.set(k, (counts.get(k) ?? 0) + 1);
    let smoothLabel = topLabel;
    let maxC = -1;
    counts.forEach((c, k) => {
      if (c > maxC) {
        maxC = c;
        smoothLabel = k;
      }
    });

    // fps
    const now = performance.now();
    const dt = now - lastTimeRef.current;
    lastTimeRef.current = now;
    const fps = dt > 0 ? 1000 / dt : 0;

    setSnapshot({
      topLabel: smoothLabel,
      topProbability,
      probabilities,
      box,
      fps,
      ready: true,
    });
  }, [scoreThreshold, smoothingWindow, videoRef]);

  useEffect(() => {
    let mounted = true;
    let anim = 0;
    (async () => {
      const ok = await ensureModels();
      if (!mounted || !ok) return;
      const loop = async () => {
        try {
          await detect();
        } catch {
          /* ignore frame errors */
        }
        anim = requestAnimationFrame(loop);
      };
      anim = requestAnimationFrame(loop);
    })();
    return () => {
      mounted = false;
      cancelAnimationFrame(anim);
    };
  }, [ensureModels, detect]);

  const api = useMemo(() => snapshot, [snapshot]);
  return api;
}
