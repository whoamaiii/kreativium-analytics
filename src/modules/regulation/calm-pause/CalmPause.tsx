import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BreathCircle } from '@/components/breathing/BreathCircle';
import { useNeutral } from '@/hooks/useNeutral';
import { useTranslation } from '@/hooks/useTranslation';
import { incNeutralHold } from '@/lib/progress/progress-store';

export default function CalmPause() {
  const { tCommon } = useTranslation();
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const neutral = useNeutral(videoRef);
  const [holdMs, setHoldMs] = useState(0);

  const goalMs = 10000; // 10 seconds neutral

  React.useEffect(() => {
    let raf: number;
    const step = () => {
      if (neutral.isNeutral) {
        setHoldMs((prev) => {
          const next = Math.min(goalMs, prev + 100);
          if (next === goalMs) {
            try {
              incNeutralHold();
            } catch {
              // @silent-ok: progress tracking failure is non-critical
            }
          }
          return next;
        });
      } else {
        setHoldMs(0);
      }
      raf = window.setTimeout(step, 100) as unknown as number;
    };
    raf = window.setTimeout(step, 100) as unknown as number;
    return () => clearTimeout(raf);
  }, [neutral.isNeutral]);

  const progress = Math.round((holdMs / goalMs) * 100);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        if (!cameraEnabled || !videoRef.current) return;
        if (!navigator.mediaDevices?.getUserMedia) return;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      } catch {
        // @silent-ok: camera/video access failure is handled gracefully
      }
    }
    if (cameraEnabled) start();
    return () => {
      cancelled = true;
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch {
          // @silent-ok: video pause failure during cleanup is non-critical
        }
        videoRef.current.srcObject = null;
      }
    };
  }, [cameraEnabled]);

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">
          {String(tCommon('navigation.emotionLab', { defaultValue: 'Ro‑pause' }))}
        </h1>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-6 flex flex-col items-center justify-center gap-4">
            <BreathCircle phaseMs={3000} />
            <div className="text-sm text-muted-foreground">
              {String(tCommon('calmPause.breathe', { defaultValue: 'Pust rolig inn og ut' }))}
            </div>
            <div className="text-lg font-medium">{progress}%</div>
          </div>
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover"
                autoPlay
                playsInline
                muted
                aria-label="Calm Pause camera"
              />
            </div>
            <button
              className="px-3 py-2 rounded-lg border"
              onClick={() => setCameraEnabled((v) => !v)}
            >
              {cameraEnabled
                ? String(tCommon('tegn.cameraDisable', { defaultValue: 'Skru av kamera' }))
                : String(tCommon('tegn.cameraEnable', { defaultValue: 'Skru på kamera' }))}
            </button>
            <div className="text-sm text-muted-foreground">
              {String(
                tCommon('calmPause.neutralGoal', { defaultValue: 'Mål: nøytral i 10–20 sekunder' }),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
