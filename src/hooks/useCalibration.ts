import { useCallback, useMemo, useRef, useState } from 'react';

export interface CalibrationResult {
  threshold: number;
  holdMs: number;
  smoothingWindow: number;
  completed: boolean;
}

export function loadCalibration(): CalibrationResult | null {
  try {
    const raw = localStorage.getItem('emotion.calibration.v1');
    if (!raw) return null;
    return JSON.parse(raw) as CalibrationResult;
  } catch {
    return null;
  }
}

export function saveCalibration(c: CalibrationResult): void {
  try { localStorage.setItem('emotion.calibration.v1', JSON.stringify(c)); } catch {}
}

export function useCalibration() {
  const existing = useMemo(() => loadCalibration(), []);
  const [running, setRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<CalibrationResult | null>(existing);
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
    setResult(payload);
    saveCalibration(payload);
    setRunning(false);
    setProgress(1);
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    try { localStorage.removeItem('emotion.calibration.v1'); } catch {}
  }, []);

  return { running, progress, result, start, feed, finish, reset };
}




