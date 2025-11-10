import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCalibration } from '@/hooks/useCalibration';
import { useTranslation } from '@/hooks/useTranslation';

interface CalibrationOverlayProps {
  visible: boolean;
  neutralProb: number; // 0..1 from detector for neutral baseline
  onClose: () => void;
}

export function CalibrationOverlay({ visible, neutralProb, onClose }: CalibrationOverlayProps) {
  const { running, progress, result, start, feed, finish } = useCalibration();
  const { tCommon } = useTranslation();

  // Stabilize function identities to avoid effect loops when hooks return new functions each render
  const startRef = useRef(start);
  const feedRef = useRef(feed);
  const finishRef = useRef(finish);
  useEffect(() => {
    startRef.current = start;
  }, [start]);
  useEffect(() => {
    feedRef.current = feed;
  }, [feed]);
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  useEffect(() => {
    if (!visible) return;
    if (!running && !result) startRef.current();
  }, [visible, running, result]);

  useEffect(() => {
    if (!visible || !running) return;
    feedRef.current(neutralProb);
  }, [visible, running, neutralProb]);

  // Finish calibration when progress reaches completion, without retriggering feed
  useEffect(() => {
    if (!visible || !running) return;
    if (progress >= 1) finishRef.current();
  }, [visible, running, progress]);

  useEffect(() => {
    if (!visible) return;
    if (result && result.completed) onClose();
  }, [visible, result, onClose]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div
            className="relative z-10 max-w-xl mx-auto mt-16 rounded-2xl bg-background/95 border border-white/10 p-6 text-foreground shadow-2xl"
            initial={{ scale: 0.96, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 6, opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={String(tCommon('game.calibration.title', { defaultValue: 'Calibration' }))}
          >
            <h2 className="text-2xl font-bold mb-3">
              {String(tCommon('game.calibration.title', { defaultValue: 'Calibration' }))}
            </h2>
            <p className="text-sm text-muted-foreground">
              {String(
                tCommon('game.calibration.description', {
                  defaultValue:
                    'Stay neutral for about 10–15 seconds while we calibrate your camera and lighting.',
                }),
              )}
            </p>
            <div
              className="mt-4 h-2 w-full rounded bg-white/10 overflow-hidden"
              aria-label="Calibration progress"
              role="progressbar"
              aria-valuenow={Math.round(progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-emerald-400"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-md bg-white/10 px-4 py-2 hover:bg-white/15 transition"
                onClick={finish}
              >
                {String(tCommon('game.calibration.finish', { defaultValue: 'Finish' }))}
              </button>
              <button
                className="rounded-md bg-white/10 px-4 py-2 hover:bg-white/15 transition"
                onClick={onClose}
              >
                {String(tCommon('game.calibration.skip', { defaultValue: 'Skip' }))}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CalibrationOverlay;
