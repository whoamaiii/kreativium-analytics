import { useEffect, useMemo, useRef, useState } from 'react';
import { WorkerDetector } from '@/detector/worker.detector';
import { FaceApiDetector } from '@/detector/faceapi.detector';
import { MediaPipeDetector } from '@/detector/mediapipe.detector';
import type { DetectorOptions, DetectorSnapshot } from '@/detector/types';
import { useStorageState } from '@/lib/storage/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage/keys';

export function useDetector(
  videoRef: React.RefObject<HTMLVideoElement>,
  options: DetectorOptions = {},
): DetectorSnapshot {
  // Use storage hook for detector type selection
  const [detectorType] = useStorageState<string>(
    STORAGE_KEYS.EMOTION_DETECTOR_TYPE,
    'faceapi-main',
  );

  const [useWorker, setUseWorker] = useState<boolean>(true);
  const workerRef = useRef<WorkerDetector | null>(null);
  const faceRef = useRef<FaceApiDetector | null>(null);
  const mpRef = useRef<MediaPipeDetector | null>(null);
  const [snapshot, setSnapshot] = useState<DetectorSnapshot>({
    topLabel: 'neutral',
    topProbability: 0,
    probabilities: {},
    box: null,
    fps: 0,
    ready: false,
  });
  const fallbackAppliedRef = useRef<boolean>(false);
  // Throttle React state updates to avoid nested update cascades during heavy RAF loops
  const updateIntervalMsRef = useRef<number>(
    Math.max(16, Math.floor(1000 / Math.min(30, Math.max(1, options.targetFps ?? 20)))),
  );

  useEffect(() => {
    // Feature detection: workers are broadly supported; we still guard
    const supportsWorkers = typeof Worker !== 'undefined';
    const supportsImageBitmap = typeof (window as any).createImageBitmap === 'function';
    if (detectorType === 'mediapipe') {
      setUseWorker(false);
      return;
    }
    if (detectorType === 'faceapi-main' || !supportsWorkers || !supportsImageBitmap) {
      setUseWorker(false);
      return;
    }
    setUseWorker(true);
  }, [detectorType]);

  useEffect(() => {
    if (!useWorker) return;
    const det = new WorkerDetector(options);
    workerRef.current = det;
    const video = videoRef.current;
    if (video) det.attach(video);
    let raf = 0;
    let lastSet = 0;
    const loop = () => {
      det.tick();
      const now = performance.now();
      if (now - lastSet >= updateIntervalMsRef.current) {
        setSnapshot(det.getSnapshot());
        lastSet = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      det.dispose();
      workerRef.current = null;
    };
  }, [
    useWorker,
    videoRef,
    options.modelBaseUrl,
    options.scoreThreshold,
    options.smoothingWindow,
    options.targetFps,
  ]);

  // Runtime auto‑fallback: if worker stays at fps=0 for a short while, switch to main thread
  useEffect(() => {
    if (!useWorker || fallbackAppliedRef.current) return;
    const start = performance.now();
    let id = 0;
    const check = () => {
      const elapsed = performance.now() - start;
      // More aggressive: if no fps and no box after ~1s, flip to main-thread to guarantee progress
      if (snapshot.ready && (snapshot.fps ?? 0) === 0 && elapsed > 1000) {
        fallbackAppliedRef.current = true;
        setUseWorker(false);
        return;
      }
      if (!fallbackAppliedRef.current && elapsed <= 4000)
        id = window.setTimeout(check, 250) as unknown as number;
    };
    id = window.setTimeout(check, 600) as unknown as number;
    return () => {
      if (id) window.clearTimeout(id);
    };
  }, [useWorker, snapshot.ready, snapshot.fps]);

  // Main-thread FaceAPI path
  useEffect(() => {
    if (useWorker || detectorType !== 'faceapi-main') return;
    const det = new FaceApiDetector(options);
    faceRef.current = det;
    const video = videoRef.current;
    if (video) det.attach(video);
    let raf = 0;
    let lastSet = 0;
    const loop = () => {
      det.tick().catch(() => {});
      const now = performance.now();
      if (now - lastSet >= updateIntervalMsRef.current) {
        setSnapshot(det.getSnapshot());
        lastSet = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      faceRef.current = null;
    };
  }, [
    useWorker,
    detectorType,
    videoRef,
    options.modelBaseUrl,
    options.scoreThreshold,
    options.targetFps,
  ]);

  // MediaPipe path
  useEffect(() => {
    if (useWorker || detectorType !== 'mediapipe') return;
    const det = new MediaPipeDetector(options);
    mpRef.current = det;
    const video = videoRef.current;
    if (video) det.attach(video);
    let raf = 0;
    let lastSet = 0;
    const loop = () => {
      det.tick().catch(() => {});
      const now = performance.now();
      if (now - lastSet >= updateIntervalMsRef.current) {
        setSnapshot(det.getSnapshot());
        lastSet = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      mpRef.current = null;
    };
  }, [useWorker, detectorType, videoRef, options.modelBaseUrl, options.targetFps]);

  const value = useMemo<DetectorSnapshot>(() => snapshot, [snapshot]);
  return value;
}
