import { useCallback, useRef, useState } from 'react';
import { useStorageState, useStorageRemove } from '@/lib/storage/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage/keys';

export interface CalibrationResult {
  threshold: number;
  holdMs: number;
  smoothingWindow: number;
  completed: boolean;
}

/**
 * @deprecated Use useCalibration hook directly
 */
export function loadCalibration(): CalibrationResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EMOTION_CALIBRATION);
    if (!raw) return null;
    return JSON.parse(raw) as CalibrationResult;
  } catch {
    return null;
  }
}

/**
 * @deprecated Use useCalibration hook directly
 */
export function saveCalibration(c: CalibrationResult): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EMOTION_CALIBRATION, JSON.stringify(c));
  } catch {}
}

export function useCalibration() {
  // Use storage hook for automatic persistence
  const [result, setResult] = useStorageState<CalibrationResult | null>(
    STORAGE_KEYS.EMOTION_CALIBRATION,
    null
  );
  const removeCalibration = useStorageRemove(STORAGE_KEYS.EMOTION_CALIBRATION);

  const [running, setRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const samplesRef = useRef<number[]>([]);

  const start = useCallback(() => {
    setRunning(true);
    setProgress(0);
    samplesRef.current = [];
  }, []);

  const feed = useCallback((neutralProb: number) => {
    if (!running) return;
    samplesRef.current.push(Math.max(0, Math.min(1, neutralProb)));
    setProgress(p => Math.min(1, p + 1 / 180)); // ~10-15s assuming ~18fps
  }, [running]);

  const finish = useCallback(() => {
    const arr = samplesRef.current;
    const median = arr.length ? arr.slice().sort((a, b) => a - b)[Math.floor(arr.length / 2)] : 0.5;
    const recommendedThreshold = Math.min(0.8, Math.max(0.5, median + 0.1));
    const holdMs = 900;
    const smoothingWindow = 10;
    const payload: CalibrationResult = { threshold: recommendedThreshold, holdMs, smoothingWindow, completed: true };
    setResult(payload); // Storage hook handles persistence automatically
    setRunning(false);
    setProgress(1);
  }, [setResult]);

  const reset = useCallback(() => {
    setResult(null);
    removeCalibration(); // Use storage hook remove
  }, [setResult, removeCalibration]);

  return { running, progress, result, start, feed, finish, reset };
}




