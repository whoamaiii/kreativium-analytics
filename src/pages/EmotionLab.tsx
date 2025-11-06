import { useEffect, useMemo, useRef, useState } from 'react';
import { loadFaceApi, loadModels } from '@/lib/faceapi';
// Optional: workerized detector toggle
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { useDetector } from '@/hooks/useDetector';
import { FaceOverlay } from '@/components/game/FaceOverlay';

// Lightweight in-app facial expression tool for local-only use
// Models are expected under /models; we lazy-load on demand

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export default function EmotionLab() {
  const { tCommon } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [consented, setConsented] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [modelStatus, setModelStatus] = useState<LoadStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [fps, setFps] = useState<number>(0);
  const [useWorkerDetector, setUseWorkerDetector] = useState<boolean>(false);

  const [modelsOrigin, setModelsOrigin] = useState<'local' | 'unknown'>('unknown');
  const modelBaseUrl = useMemo(() => '/models', []);

  // Workerized detector hook (idle unless toggled and camera active)
  const workerDet = useDetector(videoRef, { smoothingWindow: 8, scoreThreshold: 0.5, targetFps: 20, modelBaseUrl });

  useEffect(() => {
    let raf = 0;
    let lastTs = performance.now();

    async function loadModelsLocal() {
      try {
        setModelStatus('loading');
        // Load local models only to respect CSP connect-src 'self'
        await loadModels(modelBaseUrl, {
          tinyFaceDetector: true,
          faceExpressionNet: true,
        });
        setModelsOrigin('local');
        setModelStatus('ready');
      } catch (ee) {
        setModelStatus('error');
        setLastError((ee as Error)?.message ?? 'model_load_failed');
      }
    }

    if (consented && modelStatus === 'idle') {
      void loadModelsLocal();
    }

    async function analyze() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        raf = requestAnimationFrame(analyze);
        return;
      }

      // When using worker detector, skip manual canvas overlay
      if (useWorkerDetector) {
        setFps(typeof workerDet.fps === 'number' ? workerDet.fps : 0);
        raf = requestAnimationFrame(analyze);
        return;
      }

      if (!cameraActive || modelStatus !== 'ready') {
        raf = requestAnimationFrame(analyze);
        return;
      }

      try {
        // Get face-api instance
        const faceapi = await loadFaceApi();

        const result = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
          .withFaceExpressions();

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          raf = requestAnimationFrame(analyze);
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (showOverlay && result) {
          for (const det of result) {
            const { x, y } = det.detection.box;

            // Get dominant expression
            const expressions = det.expressions as Record<string, number>;
            let top = 'neutral';
            let topV = 0;
            for (const [k, v] of Object.entries(expressions)) {
              if (v > topV) { top = k; topV = v; }
            }
            const label = `${translateExpression(top)} ${(topV * 100).toFixed(0)}%`;
            ctx.fillStyle = 'rgba(239,68,68,0.95)';
            ctx.font = '16px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto';
            ctx.fillText(label, x, Math.max(0, y - 6));
          }
        }
      } catch (e) {
        setLastError((e as Error)?.message ?? 'analyze_error');
      } finally {
        const now = performance.now();
        const dt = now - lastTs;
        lastTs = now;
        if (dt > 0) setFps(1000 / dt);
        raf = requestAnimationFrame(analyze);
      }
    }

    raf = requestAnimationFrame(analyze);
    return () => cancelAnimationFrame(raf);
  }, [consented, cameraActive, modelStatus, modelBaseUrl, showOverlay, useWorkerDetector, workerDet.fps, translateExpression]);

  const translateExpression = React.useCallback((key: string): string => {
    const tKey = `emotionLab.expressions.${key}`;
    const value = tCommon(tKey);
    return value === tKey ? key : value;
  }, [tCommon]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (e) {
      setLastError((e as Error)?.message ?? 'camera_error');
      setCameraActive(false);
    }
  }

  function stopCamera() {
    const video = videoRef.current;
    const stream = (video?.srcObject as MediaStream | null) ?? null;
    for (const track of stream?.getTracks() ?? []) track.stop();
    if (video) {
      video.srcObject = null;
      video.pause();
    }
    setCameraActive(false);
  }

  const consentUI = !consented && (
    <div className="flex flex-col items-center gap-4 p-6 text-foreground">
      <p className="text-sm opacity-80 max-w-prose text-center">
        {String(tCommon('emotionLab.consentText'))}
      </p>
      <div className="flex gap-3">
        <Button variant="default" onClick={() => setConsented(true)}>{String(tCommon('buttons.confirm'))}</Button>
        <Button variant="outline" onClick={() => history.back()}>{String(tCommon('buttons.back'))}</Button>
      </div>
    </div>
  );

  return (
    <div className="main-container min-h-screen p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{String(tCommon('navigation.emotionLab'))}</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setUseWorkerDetector(v => !v)}>
              {useWorkerDetector ? 'Main-thread' : 'Worker'}
            </Button>
            <Button variant="outline" onClick={() => setShowOverlay(v => !v)}>
              {showOverlay ? String(tCommon('emotionLab.hideOverlay')) : String(tCommon('emotionLab.showOverlay'))}
            </Button>
            {cameraActive ? (
              <Button variant="destructive" onClick={stopCamera}>{String(tCommon('tegn.cameraDisable'))}</Button>
            ) : (
              <Button variant="default" onClick={startCamera} disabled={!consented || modelStatus !== 'ready'}>
                {String(tCommon('tegn.cameraEnable'))}
              </Button>
            )}
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <span className="mr-3">{String(tCommon('emotionLab.model'))}: {modelStatus}</span>
          <span className="ml-3">{String(tCommon('emotionLab.origin'))}: {modelsOrigin}</span>
          <span>{String(tCommon('emotionLab.fps'))}: {fps.toFixed(1)}</span>
          {lastError && <span className="ml-3 text-red-500">{lastError}</span>}
        </div>

        <Card className="relative overflow-hidden">
          {!consented ? (
            consentUI
          ) : (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-auto rounded"
                playsInline
                muted
                aria-label={String(tCommon('emotionLab.videoFeedLabel'))}
              />
              {!useWorkerDetector && (
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  aria-hidden="true"
                />
              )}
              {useWorkerDetector && (
                <FaceOverlay
                  box={workerDet.box}
                  progress={0}
                  almostThere={false}
                  hideRing
                  mirror={true}
                  sourceWidth={videoRef.current?.videoWidth || undefined}
                  sourceHeight={videoRef.current?.videoHeight || undefined}
                />
              )}
              {(!cameraActive || modelStatus !== 'ready') && (
                <div className="absolute inset-0 grid place-items-center bg-background/40 backdrop-blur-sm">
                  <div className="text-center text-sm text-foreground/80">
                    {modelStatus !== 'ready' ? String(tCommon('emotionLab.loadingModels')) : String(tCommon('emotionLab.cameraOff'))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
